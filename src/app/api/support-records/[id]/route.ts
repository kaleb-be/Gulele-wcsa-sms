import { NextRequest, NextResponse } from "next/server";
import { getSheetData, updateRow } from "@/lib/sheets";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { status, end_date, notes } = body;

    const rows = await getSheetData("support_records");
    let rowIndex = -1;
    let existingRow: string[] = [];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === params.id) {
        rowIndex = i + 1;
        existingRow = [...rows[i]];
        break;
      }
    }
    if (rowIndex === -1) {
      return NextResponse.json({ error: "Support record not found" }, { status: 404 });
    }

    if (status !== undefined) existingRow[6] = String(status);
    if (end_date !== undefined) existingRow[5] = String(end_date);
    if (notes !== undefined) existingRow[8] = String(notes);

    await updateRow("support_records", rowIndex, existingRow);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update support record" }, { status: 500 });
  }
}
