import { NextRequest, NextResponse } from "next/server";
import { getSheetData, updateRow, findRowIndex } from "@/lib/sheets";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const rows = await getSheetData("ngos");
    const headers = rows[0] ?? [];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === params.id) {
        const ngo = Object.fromEntries(headers.map((h, idx) => [h, rows[i][idx] ?? ""]));
        return NextResponse.json(ngo);
      }
    }
    return NextResponse.json({ error: "NGO not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch NGO" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const rows = await getSheetData("ngos");
    const headers = rows[0] ?? [];
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
      return NextResponse.json({ error: "NGO not found" }, { status: 404 });
    }

    const body = await request.json();
    const fields = ["ngo_id","name","focus_areas","contact_person","phone","email","registration_number","start_date","status","notes"];
    fields.forEach((field, idx) => {
      if (body[field] !== undefined) existingRow[idx] = String(body[field]);
    });

    await updateRow("ngos", rowIndex, existingRow);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update NGO" }, { status: 500 });
  }
}
