import { prisma } from "@/utils/db";
import { NextRequest, NextResponse } from "next/server";

function getBaseFormName(formTitle: string): string {
  return formTitle.replace(/\s+\d{4}$/, "");
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const get = (k: string) => url.searchParams.get(k);

    const role = get("role");
    const userId = get("userId");
    const form = get("form");
    const startDate = get("startDate");
    const endDate = get("endDate");

    if (!form || form === "All") {
      return NextResponse.json(
        { error: "A specific form must be selected" },
        { status: 400 }
      );
    }

    // ------------------------------
    // 1) Build location filters (copied from exportData/route.ts)
    // ------------------------------
    const whereLocation: any = { approved: true };

    if (role === "teacher" && userId) {
      whereLocation.userId = userId;
    }

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
        whereLocation.country = { equals: adminLocation.country, mode: "insensitive" };
        if (role !== "country" && adminLocation.state) {
          whereLocation.state = { equals: adminLocation.state, mode: "insensitive" };
        }
        if (role === "county" || role === "district" || role === "site") {
          if (adminLocation.county)
            whereLocation.county = { equals: adminLocation.county, mode: "insensitive" };
        }
        if (role === "district" || role === "site") {
          if (adminLocation.district)
            whereLocation.district = { equals: adminLocation.district, mode: "insensitive" };
        }
        if (role === "site") {
          if (adminLocation.city)
            whereLocation.city = { equals: adminLocation.city, mode: "insensitive" };
          if (adminLocation.school)
            whereLocation.school = { equals: adminLocation.school, mode: "insensitive" };
        }
      }
    }

    const filterKeys = ["country", "state", "county", "district", "city", "school"];
    for (const key of filterKeys) {
      const val = get(key);
      if (val && val !== "All" && !whereLocation[key]) {
        whereLocation[key] = { equals: val, mode: "insensitive" };
      }
    }

    const userLocations = await prisma.userLocation.findMany({
      where: whereLocation,
      select: { id: true },
    });
    const userLocationIds = userLocations.map((l) => l.id);

    if (userLocationIds.length === 0) {
      return NextResponse.json({
        questions: [],
        preAverages: {},
        postAverages: {},
        preCount: 0,
        postCount: 0,
      });
    }

    // ------------------------------
    // 2) Find all matching forms by base name
    // ------------------------------
    const baseNameForFilter = getBaseFormName(form);
    const allForms = await prisma.form.findMany({
      select: { id: true, title: true, type: true, questions: true },
    });

    const matchingForms = allForms.filter(
      (f: any) => getBaseFormName(f.title) === baseNameForFilter
    );

    if (matchingForms.length === 0) {
      return NextResponse.json(
        { error: `No forms found for: ${form}` },
        { status: 400 }
      );
    }

    const preFormIds = matchingForms
      .filter((f: any) => f.type === "pre")
      .map((f: any) => f.id);
    const postFormIds = matchingForms
      .filter((f: any) => f.type === "post")
      .map((f: any) => f.id);

    // ------------------------------
    // 3) Build ordered question list (showInTeacherExport, deduplicated by name)
    // ------------------------------
    const seenNames = new Set<string>();
    const orderedQuestionNames: string[] = [];
    const questionIdToName: Record<string, string> = {};

    for (const f of matchingForms) {
      for (const q of (f as any).questions) {
        if (!(q as any).showInTeacherExport) continue;
        const name: string = (q as any).name ?? (q as any).question;
        questionIdToName[(q as any).id] = name;
        if (!seenNames.has(name)) {
          seenNames.add(name);
          orderedQuestionNames.push(name);
        }
      }
    }

    // ------------------------------
    // 4) Build response filter + fetch
    // ------------------------------
    const whereResponses: any = {
      teacherLocationId: { in: userLocationIds },
      formId: { in: matchingForms.map((f: any) => f.id) },
    };

    if (role === "teacher" && userId) whereResponses.teacherId = userId;

    if (startDate || endDate) {
      whereResponses.createdAt = {};
      if (startDate) {
        const d = new Date(startDate);
        d.setHours(0, 0, 0, 0);
        whereResponses.createdAt.gte = d;
      }
      if (endDate) {
        const d = new Date(endDate);
        d.setHours(23, 59, 59, 999);
        whereResponses.createdAt.lte = d;
      }
    }

    const responses = await prisma.responseWithTeacher.findMany({
      where: whereResponses,
      select: { formId: true, answers: true },
    });

    // ------------------------------
    // 5) Aggregate averages per question, split by pre/post
    // ------------------------------
    const preSet = new Set(preFormIds);
    const postSet = new Set(postFormIds);

    const preScores: Record<string, number[]> = {};
    const postScores: Record<string, number[]> = {};
    let preCount = 0;
    let postCount = 0;

    for (const r of responses) {
      const isPre = preSet.has(r.formId);
      const isPost = postSet.has(r.formId);
      if (!isPre && !isPost) continue;

      if (isPre) preCount++;
      else postCount++;

      const bucket = isPre ? preScores : postScores;

      for (const answer of (r as any).answers) {
        const qName = questionIdToName[answer.questionId];
        if (!qName) continue;
        const code = Number(answer.optionCode);
        if (isNaN(code) || code === 99) continue;
        if (!bucket[qName]) bucket[qName] = [];
        bucket[qName].push(code);
      }
    }

    const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

    const preAverages: Record<string, number> = {};
    const postAverages: Record<string, number> = {};

    for (const name of orderedQuestionNames) {
      if (preScores[name]?.length) preAverages[name] = mean(preScores[name]);
      if (postScores[name]?.length) postAverages[name] = mean(postScores[name]);
    }

    return NextResponse.json({
      questions: orderedQuestionNames,
      preAverages,
      postAverages,
      preCount,
      postCount,
    });
  } catch (err) {
    console.error("chartData error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
