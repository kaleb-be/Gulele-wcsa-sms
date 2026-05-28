import { NextResponse } from "next/server";
import { getSheetData, updateRow } from "@/lib/sheets";
import { auth } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = params;
    const body = await request.json();

    const rows = await getSheetData("enrollments");
    const headers = rows[0] || [];

    let rowIndex = -1;
    let currentRow: string[] = [];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        rowIndex = i + 1; // 1-based sheet row
        currentRow = [...rows[i]];
        break;
      }
    }
    if (rowIndex === -1) {
      return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
    }

    // Pad to header length
    while (currentRow.length < headers.length) currentRow.push("");

    // Update only fields present in body, protect enrollment_id
    headers.forEach((header, index) => {
      if (body.hasOwnProperty(header) && header !== "enrollment_id") {
        currentRow[index] = String(body[header] ?? "");
      }
    });

    await updateRow("enrollments", rowIndex, currentRow);
    return NextResponse.json({ message: "Enrollment updated successfully" });
  } catch (error) {
    console.error(`PATCH /api/enrollments/${params.id} error:`, error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}