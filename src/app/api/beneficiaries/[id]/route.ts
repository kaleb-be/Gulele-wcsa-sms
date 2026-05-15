import { NextRequest, NextResponse } from "next/server";
import { getSheetData, updateRow, deleteRow } from "@/lib/sheets";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const rows = await getSheetData("beneficiaries");
    const headers = rows[0] ?? [];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === params.id) {
        const ben = Object.fromEntries(headers.map((h, idx) => [h, rows[i][idx] ?? ""]));
        return NextResponse.json(ben);
      }
    }
    return NextResponse.json({ error: "Beneficiary not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch beneficiary" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const rows = await getSheetData("beneficiaries");
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
      return NextResponse.json({ error: "Beneficiary not found" }, { status: 404 });
    }

    const body = await request.json();
    const fields = ["ben_id","full_name","sex","age","kebele","phone","id_type","id_number","category","sub_details","registered_date","registered_by","status","notes", "photo_url"];
    fields.forEach((field, idx) => {
      if (body[field] !== undefined) existingRow[idx] = String(body[field]);
    });

    await updateRow("beneficiaries", rowIndex, existingRow);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update beneficiary" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const rows = await getSheetData("beneficiaries");
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === params.id) {
        rowIndex = i + 1;
        break;
      }
    }
    if (rowIndex === -1) {
      return NextResponse.json({ error: "Beneficiary not found" }, { status: 404 });
    }

    await deleteRow("beneficiaries", rowIndex);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete beneficiary" }, { status: 500 });
  }
}
