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
      { header: "approved", key: "approved", width: 10 },
    ];

    for (const user of users) {
      const locs = user.userLocations;
      const userBase = {
        name: sanitizeString(user.name),
        email: sanitizeString(user.email),
        role: sanitizeString(user.role),
        isTeacher: user.isTeacher ? "Yes" : "No",
        code: sanitizeString(user.code),
      };

      if (locs.length === 0) {
        sheet.addRow(userBase).commit();
      } else {
        for (const loc of locs) {
          sheet.addRow({
            ...userBase,
            country: sanitizeString(loc.country),
            state: sanitizeString(loc.state),
            county: sanitizeString(loc.county),
            district: sanitizeString(loc.district),
            city: sanitizeString(loc.city),
            school: sanitizeString(loc.school),
            approved: loc.approved ? "Yes" : "No",
          }).commit();
        }
      }
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
