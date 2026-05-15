import { NextRequest, NextResponse } from "next/server";
import { getSheetData, appendRow, generateId } from "@/lib/sheets";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.toLowerCase() || "";
    const category = searchParams.get("category") || "";
    const status = searchParams.get("status") || "";
    const sex = searchParams.get("sex") || "";
    const kebele = searchParams.get("kebele")?.toLowerCase() || "";

    const rows = await getSheetData("beneficiaries");
    const headers = rows[0] ?? [];
    let beneficiaries = rows.slice(1).map((row) =>
      Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""]))
    );

    if (search) {
      beneficiaries = beneficiaries.filter(
        (b: any) =>
          b.full_name?.toLowerCase().includes(search) ||
          b.id_number?.toLowerCase().includes(search) ||
          b.kebele?.toLowerCase().includes(search)
      );
    }
    if (category) {
      beneficiaries = beneficiaries.filter((b: any) => b.category === category);
    }
    if (status) {
      beneficiaries = beneficiaries.filter((b: any) => b.status === status);
    }
    if (sex) {
      beneficiaries = beneficiaries.filter((b: any) => b.sex === sex);
    }
    if (kebele) {
      beneficiaries = beneficiaries.filter((b: any) => b.kebele?.toLowerCase().includes(kebele));
    }

    return NextResponse.json(beneficiaries);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch beneficiaries" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      full_name,
      sex,
      age,
      kebele,
      phone,
      id_type,
      id_number,
      category,
      sub_details,
      registered_by,
      status,
      notes,
      photo_url,
    } = body;

    if (!full_name || !id_number) {
      return NextResponse.json({ error: "Full name and ID number are required" }, { status: 400 });
    }

    const ben_id = await generateId("BEN", "beneficiaries");
    const registered_date = new Date().toISOString().split("T")[0];

    await appendRow("beneficiaries", [
      ben_id,
      full_name,
      sex || "",
      age?.toString() || "",
      kebele || "",
      phone || "",
      id_type || "Kebele ID",
      id_number,
      category || "",
      sub_details || "",
      registered_date,
      registered_by || "",
      status || "Active",
      notes || "",
      photo_url || "",
    ]);

    return NextResponse.json({ ben_id, full_name });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create beneficiary" }, { status: 500 });
  }
}
