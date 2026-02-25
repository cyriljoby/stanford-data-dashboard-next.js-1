import fs from "fs";
import path from "path";
import { prisma } from "@/utils/db";
import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

// Strip XML 1.0 illegal control characters. Returns undefined for empty/null
// so ExcelJS skips the cell entirely instead of writing an empty string element.
function sanitizeString(val: any): string | undefined {
  if (val === null || val === undefined) return undefined;
  // eslint-disable-next-line no-control-regex
  const s = String(val).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  return s.length > 0 ? s : undefined;
}

// Join unique non-empty values from an array with "; "
function joinUnique(values: (string | null | undefined)[]): string | undefined {
  const unique = [...new Set(values.filter((v) => v != null && v !== "").map(String))];
  return unique.length > 0 ? unique.join("; ") : undefined;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const role = url.searchParams.get("role");

    if (role !== "stanford") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch all users with their locations
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isTeacher: true,
        code: true,
        userLocations: {
          select: {
            country: true,
            state: true,
            county: true,
            district: true,
            city: true,
            school: true,
            approved: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const filePath = path.join("/tmp", `users_${Date.now()}.xlsx`);

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      filename: filePath,
      useStyles: false,
      useSharedStrings: false,
    });

    const sheet = workbook.addWorksheet("Users");

    sheet.columns = [
      { header: "name", key: "name", width: 25 },
      { header: "email", key: "email", width: 30 },
      { header: "role", key: "role", width: 12 },
      { header: "is_teacher", key: "isTeacher", width: 12 },
      { header: "code", key: "code", width: 15 },
      { header: "country", key: "country", width: 20 },
      { header: "state", key: "state", width: 15 },
      { header: "county", key: "county", width: 20 },
      { header: "district", key: "district", width: 25 },
      { header: "city", key: "city", width: 15 },
      { header: "school", key: "school", width: 30 },
      { header: "approved_locations", key: "approvedCount", width: 10 },
    ];

    for (const user of users) {
      const locs = user.userLocations;

      const row = {
        name: sanitizeString(user.name),
        email: sanitizeString(user.email),
        role: sanitizeString(user.role),
        isTeacher: user.isTeacher ? "Yes" : "No",
        code: sanitizeString(user.code),
        country: joinUnique(locs.map((l) => l.country)),
        state: joinUnique(locs.map((l) => l.state)),
        county: joinUnique(locs.map((l) => l.county)),
        district: joinUnique(locs.map((l) => l.district)),
        city: joinUnique(locs.map((l) => l.city)),
        school: joinUnique(locs.map((l) => l.school)),
        approvedCount: locs.filter((l) => l.approved).length || undefined,
      };

      sheet.addRow(row).commit();
    }

    sheet.commit();
    await workbook.commit();

    const fileBuffer = fs.readFileSync(filePath);
    fs.unlinkSync(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="REACH_Lab_Users_${Date.now()}.xlsx"`,
      },
    });
  } catch (err) {
    console.error("Export users error:", err);
    return NextResponse.json(
      { error: "Failed to export users" },
      { status: 500 },
    );
  }
}
