import fs from "fs";
import path from "path";
import { prisma } from "@/utils/db";
import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

export async function GET(request: NextRequest) {
  try {
    console.time("EXPORT_TOTAL");
    console.log("Export started...");

    const url = new URL(request.url);
    const get = (k: string) => url.searchParams.get(k);

    // ------------------------------
    // 1) Build location filters
    // ------------------------------
    const role = get("role");
    const userId = get("userId");

    console.log(" Computing location filters...");
    const whereLocation: any = { approved: true };

    // For teachers: only get THEIR locations
    if (role === "teacher" && userId) {
      whereLocation.userId = userId;
    }

    // For admins (non-Stanford): enforce their assigned location
    if (role && role !== "stanford" && role !== "teacher" && userId) {
      const adminLocation = await prisma.userLocation.findFirst({
        where: { userId },
        select: {
          country: true,
          state: true,
          county: true,
          district: true,
          city: true,
          school: true,
        },
      });

      if (adminLocation) {
        // Enforce location constraints based on admin level (case-insensitive)
        whereLocation.country = {
          equals: adminLocation.country,
          mode: "insensitive",
        };

        if (role !== "country" && adminLocation.state) {
          whereLocation.state = {
            equals: adminLocation.state,
            mode: "insensitive",
          };
        }
        if (role === "county" || role === "district" || role === "site") {
          if (adminLocation.county)
            whereLocation.county = {
              equals: adminLocation.county,
              mode: "insensitive",
            };
        }
        if (role === "district" || role === "site") {
          if (adminLocation.district)
            whereLocation.district = {
              equals: adminLocation.district,
              mode: "insensitive",
            };
        }
        if (role === "site") {
          if (adminLocation.city)
            whereLocation.city = {
              equals: adminLocation.city,
              mode: "insensitive",
            };
          if (adminLocation.school)
            whereLocation.school = {
              equals: adminLocation.school,
              mode: "insensitive",
            };
        }
      }
    }

    const filterKeys = [
      "country",
      "state",
      "county",
      "district",
      "city",
      "school",
    ];

    // Apply user-selected filters (but can't override admin restrictions above)
    // Use case-insensitive matching for location filters
    for (const key of filterKeys) {
      const val = get(key);
      if (val && val !== "All" && !whereLocation[key]) {
        whereLocation[key] = { equals: val, mode: "insensitive" };
      }
    }
    console.log("Location filter:", whereLocation);

    console.time("DB_LOCATIONS");
    const userLocations = await prisma.userLocation.findMany({
      where: whereLocation,
      select: { id: true },
    });
    console.timeEnd("DB_LOCATIONS");

    const userLocationIds = userLocations.map((l) => l.id);
    console.log(`Matched UserLocations: ${userLocationIds.length}`);

    if (userLocationIds.length === 0) {
      return NextResponse.json(
        { message: "No locations found" },
        { status: 200 },
      );
    }

    // ------------------------------
    // 2) Build response filters
    // ------------------------------
    const whereResponses: any = {
      teacherLocationId: { in: userLocationIds },
    };

    const form = get("form");
    const startDate = get("startDate");
    const endDate = get("endDate");

    if (form && form !== "All") {
      console.time("DB_FORM_LOOKUP");
      const matchingForms = await prisma.form.findMany({
        where: { title: form },
        select: { id: true },
      });
      console.timeEnd("DB_FORM_LOOKUP");

      if (matchingForms.length === 0) {
        return NextResponse.json(
          { error: `No forms found with title: ${form}` },
          { status: 400 },
        );
      }

      const formIds = matchingForms.map((f: any) => f.id);
      whereResponses.formId = { in: formIds };

      console.log(`Resolved "${form}" to formIds:`, formIds);
    }

    if (role === "teacher" && userId) whereResponses.teacherId = userId;

    // Add date range filtering
    if (startDate || endDate) {
      whereResponses.createdAt = {};

      if (startDate) {
        const startDateTime = new Date(startDate);
        startDateTime.setHours(0, 0, 0, 0);
        whereResponses.createdAt.gte = startDateTime;
        console.log("Start date filter:", startDateTime);
      }

      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        whereResponses.createdAt.lte = endDateTime;
        console.log("End date filter:", endDateTime);
      }
    }

    console.log("Response Filter:", whereResponses);

    // ------------------------------
    // 3) Pre-cache all form data
    // ------------------------------
    console.time("DB_FORMS_PRECACHE");
    const allForms = await prisma.form.findMany({
      select: { id: true, title: true, type: true, questions: true },
    });
    console.timeEnd("DB_FORMS_PRECACHE");

    const formCache = new Map(allForms.map((f: any) => [f.id, f]));
    console.log(`Cached ${formCache.size} forms`);

    const filePath = path.join("/tmp", `responses_${Date.now()}.xlsx`);
    console.log("Creating workbook:", filePath);

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      filename: filePath,
      useStyles: false,
      useSharedStrings: false,
    });

    const sheets = new Map<string, ExcelJS.Worksheet>();

    // Helper to get base form name (remove year suffix like " 2023", " 2024")
    function getBaseFormName(formTitle: string): string {
      return formTitle.replace(/\s+\d{4}$/, "");
    }

    // Map long form names to shorter, readable sheet names
    const formNameMap: Record<string, string> = {
      "Healthy Futures: Cannabis": "HF Cannabis",
      "Healthy Futures: Tobacco/Nicotine/Vaping": "HF Tobacco",
      "Safety First": "Safety First",
      "Smart Talk: Cannabis Prevention & Education Awareness":
        "Smart Talk Cannabis",
      "Smart Talk: Cannabis Prevention & Education Awareness(elem)":
        "Smart Talk Cannabis Elem",
      "You and Me Vape Free (middle school and above)":
        "You & Me Vape Free MS+",
      "You and Me, Together Vape-Free(elem)": "You & Me Vape Free Elem",
    };

    // Sanitize sheet name to remove Excel-disallowed characters
    function sanitizeSheetName(name: string): string {
      // Excel disallows: \ / ? * [ ] :
      // Replace them with underscores
      return name.replace(/[\\\/\?\*\[\]:]/g, "_");
    }

    // Shorten form name using mapping, fallback to truncation
    function shortenFormName(name: string): string {
      return formNameMap[name] || name;
    }

    // Fast date formatter (much faster than toLocaleString)
    function formatDate(date: Date): string {
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const year = date.getFullYear();
      let hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      const hoursStr = String(hours).padStart(2, "0");
      return `${month}/${day}/${year}, ${hoursStr}:${minutes}:${seconds} ${ampm}`;
    }

    // ------------------------------
    // Pre-build all sheets with complete columns
    // ------------------------------
    console.log("Pre-building sheets with all question columns...");

    // Track column mappings: formGroupKey -> columnKey -> question IDs
    // This allows multiple question IDs to map to the same column (for pre/post with same question names)
    const columnMappings = new Map<string, Map<string, string[]>>();

    // Group forms by base name only (NOT type) - combine pre/post together
    const formGroups = new Map<string, any[]>();

    for (const form of allForms) {
      const baseFormName = getBaseFormName(form.title);
      const formGroupKey = baseFormName; // No type suffix - combine pre/post

      if (!formGroups.has(formGroupKey)) {
        formGroups.set(formGroupKey, []);
      }

      formGroups.get(formGroupKey)!.push(form);
    }

    // Create sheets with deduplicated columns
    for (const [baseFormName, forms] of formGroups.entries()) {
      const columns: any[] = [
        { header: "response_id", key: "responseId", width: 30 },
        { header: "form_title", key: "formTitle", width: 25 },
        { header: "form_type", key: "formType", width: 10 },
        { header: "teacher_name", key: "teacherName", width: 25 },
        { header: "teacher_email", key: "teacherEmail", width: 30 },
        { header: "grade", key: "grade", width: 10 },
        { header: "period", key: "period", width: 10 },
        { header: "state", key: "state", width: 15 },
        { header: "county", key: "county", width: 20 },
        { header: "district", key: "district", width: 25 },
        { header: "city", key: "city", width: 15 },
        { header: "school", key: "school", width: 30 },
        { header: "created_at", key: "createdAt", width: 22 },
      ];

      // Collect ALL questions from all forms in this group (pre, post, all years)
      const allQuestions: Array<{
        id: string;
        name: string;
        formTitle: string;
        formType: string;
      }> = [];

      for (const form of forms) {
        for (const q of form.questions) {
          if ((q as any).showInTeacherExport) {
            allQuestions.push({
              id: (q as any).id,
              name: (q as any).name ?? (q as any).question,
              formTitle: form.title,
              formType: form.type,
            });
          }
        }
      }

      // Deduplicate by question name - group question IDs by their display name
      const questionsByName = new Map<
        string,
        Array<{ id: string; formTitle: string; formType: string }>
      >();

      for (const q of allQuestions) {
        if (!questionsByName.has(q.name)) {
          questionsByName.set(q.name, []);
        }

        // Only add if this question ID isn't already in the list
        const existing = questionsByName.get(q.name)!;
        if (!existing.find((e) => e.id === q.id)) {
          existing.push({
            id: q.id,
            formTitle: q.formTitle,
            formType: q.formType,
          });
        }
      }

      // Create column mapping for this sheet
      const columnMapping = new Map<string, string[]>();

      // Create columns for unique question names
      for (const [questionName, questionInfos] of questionsByName.entries()) {
        const label =
          questionName.length > 70
            ? questionName.slice(0, 67) + "..."
            : questionName;

        // Use first question's ID as the column key
        const columnKey = `q_${questionInfos[0].id}`;

        // Track all question IDs that map to this column
        const questionIds = questionInfos.map((qi) => qi.id);
        columnMapping.set(columnKey, questionIds);

        columns.push({
          header: label,
          key: columnKey,
          width: 40,
        });
      }

      // Store column mapping for later use when filling rows
      columnMappings.set(baseFormName, columnMapping);

      const shortName = shortenFormName(baseFormName);
      const sanitizedName = sanitizeSheetName(shortName).slice(0, 31);
      const sheet = workbook.addWorksheet(sanitizedName);
      sheet.columns = columns;
      sheets.set(baseFormName, sheet);

      console.log(
        `Created sheet "${sanitizedName}" (from "${baseFormName}") with ${columns.length - 13} question columns (${allQuestions.length} total questions, ${questionsByName.size} unique)`,
      );
    }

    // ------------------------------
    // 4) Batch Stream Response Data
    // ------------------------------
    const batchSize = 10000;
    let lastId: string | undefined = undefined;
    let totalCount = 0;
    let batchIndex = 0;

    // Collect all rows per sheet for sorting
    const sheetRows = new Map<string, any[]>();
    for (const baseFormName of sheets.keys()) {
      sheetRows.set(baseFormName, []);
    }

    console.log("Starting batch streaming...");
    while (true) {
      console.time(`DB_BATCH_${batchIndex}`);

      const batch: any[] = await prisma.responseWithTeacher.findMany({
        where: whereResponses,
        select: {
          id: true,
          formId: true,
          grade: true,
          period: true,
          answers: true,
          createdAt: true,
          teacher: { select: { name: true, email: true } },
          teacherLocation: {
            select: {
              state: true,
              county: true,
              district: true,
              city: true,
              school: true,
            },
          },
        },
        take: batchSize,
        ...(lastId ? { cursor: { id: lastId }, skip: 1 } : {}),
        orderBy: { id: "asc" },
      });

      console.timeEnd(`DB_BATCH_${batchIndex}`);

      if (batch.length === 0) break;

      totalCount += batch.length;
      console.log(
        `Batch #${batchIndex}: ${batch.length} responses (Total: ${totalCount})`,
      );

      if (batch.length > 0) {
        lastId = batch[batch.length - 1].id;
      }

      for (const r of batch) {
        const form: any = formCache.get(r.formId);
        if (!form) continue;

        const baseFormName = getBaseFormName(form.title);
        const formGroupKey = baseFormName;

        const answerMap = new Map(
          r.answers.map((a: any) => [a.questionId, a.optionCode]),
        );

        const row: any = {
          responseId: r.id,
          formTitle: form.title,
          formType: form.type,
          teacherName: r.teacher.name,
          teacherEmail: r.teacher.email,
          grade:
            r.grade !== null && r.grade !== undefined && r.grade !== ""
              ? Number(r.grade)
              : null,
          period: r.period ?? "",
          state: r.teacherLocation.state,
          county: r.teacherLocation.county,
          district: r.teacherLocation.district,
          city: r.teacherLocation.city,
          school: r.teacherLocation.school,
          createdAt: formatDate(r.createdAt),
        };

        // Fill answer data using the column mapping
        const columnMapping = columnMappings.get(formGroupKey);

        if (columnMapping) {
          for (const [columnKey, questionIds] of columnMapping.entries()) {
            let answer: number | null = null;

            for (const qId of questionIds) {
              const foundAnswer = answerMap.get(qId);

              if (
                foundAnswer !== undefined &&
                foundAnswer !== null &&
                foundAnswer !== ""
              ) {
                const numeric = Number(foundAnswer);
                answer = Number.isNaN(numeric) ? null : numeric;
                break;
              }
            }

            row[columnKey] = answer;
          }
        }

        sheetRows.get(formGroupKey)?.push(row);
      }

      batchIndex++;
    }

    console.log("Total rows collected:", totalCount);
    console.log("Sorting and writing rows...");

    // Sort and write rows for each sheet
    for (const [baseFormName, rows] of sheetRows.entries()) {
      // Sort by year first, then pre before post, then form title
      rows.sort((a, b) => {
        // Compare years first (2023, 2024, then unknown/"9999")
        const yearA = a.formTitle.match(/\s(\d{4})$/)?.[1] || "9999";
        const yearB = b.formTitle.match(/\s(\d{4})$/)?.[1] || "9999";

        if (yearA !== yearB) {
          return yearA.localeCompare(yearB);
        }

        // If same year, compare type (pre before post)
        if (a.formType !== b.formType) {
          return a.formType === "pre" ? -1 : 1;
        }

        // If same year and type, compare by form title
        return a.formTitle.localeCompare(b.formTitle);
      });

      const sheet = sheets.get(baseFormName)!;
      for (const row of rows) {
        sheet.addRow(row).commit();
      }
      console.log(`Written ${rows.length} rows to sheet "${baseFormName}"`);
    }

    console.log("Finalizing workbook...");
    for (const sheet of sheets.values()) sheet.commit();

    console.time("WORKBOOK_COMMIT");
    await workbook.commit();
    console.timeEnd("WORKBOOK_COMMIT");

    console.timeEnd("EXPORT_TOTAL");
    console.log("Export complete. Preparing download...");

    // Read the file into a buffer (more reliable on serverless)
    const fileBuffer = fs.readFileSync(filePath);

    // Clean up temp file
    fs.unlinkSync(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="REACH_Lab_Export_${Date.now()}.xlsx"`,
      },
    });
  } catch (err) {
    console.error("Export error:", err);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 },
    );
  }
}
