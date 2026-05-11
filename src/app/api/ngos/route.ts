import { NextRequest, NextResponse } from "next/server";
import { getSheetData, appendRow, generateId } from "@/lib/sheets";

export async function GET() {
  try {
    const rows = await getSheetData("ngos");
    const headers = rows[0] ?? [];
    const ngos = rows.slice(1).map((row) =>
      Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""]))
    );
    return NextResponse.json(ngos);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch NGOs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      focus_areas,
      contact_person,
      phone,
      email,
      registration_number,
      start_date,
      status,
      notes,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const ngo_id = await generateId("NGO", "ngos");

    await appendRow("ngos", [
      ngo_id,
      name,
      focus_areas || "",
      contact_person || "",
      phone || "",
      email || "",
      registration_number || "",
      start_date || "",
      status || "Active",
      notes || "",
    ]);

    return NextResponse.json({ ngo_id, name });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create NGO" }, { status: 500 });
  }
}
