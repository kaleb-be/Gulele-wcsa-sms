import { NextRequest, NextResponse } from "next/server";
import { getSheetData, appendRow, generateId } from "@/lib/sheets";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ben_id = searchParams.get("ben_id") || "";
    const ngo_id = searchParams.get("ngo_id") || "";
    const service_id = searchParams.get("service_id") || "";
    const status = searchParams.get("status") || "";

    const rows = await getSheetData("support_records");
    const headers = rows[0] ?? [];
    let records = rows.slice(1).map((row) =>
      Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""]))
    );

    if (ben_id) records = records.filter((r: any) => r.ben_id === ben_id);
    if (ngo_id) records = records.filter((r: any) => r.ngo_id === ngo_id);
    if (service_id) records = records.filter((r: any) => r.service_id === service_id);
    if (status) records = records.filter((r: any) => r.status === status);

    const ngos = await getSheetData("ngos");
    const ngoHeaders = ngos[0] ?? [];
    const ngoMap = new Map<string, string>();
    ngos.slice(1).forEach((row) => {
      ngoMap.set(row[0], row[1]);
    });

    const services = await getSheetData("services");
    const svcHeaders = services[0] ?? [];
    const svcMap = new Map<string, string>();
    services.slice(1).forEach((row) => {
      svcMap.set(row[0], row[1]);
    });

    const beneficiaries = await getSheetData("beneficiaries");
    const benHeaders = beneficiaries[0] ?? [];
    const benMap = new Map<string, string>();
    beneficiaries.slice(1).forEach((row) => {
      benMap.set(row[0], row[1]);
    });

    const enriched = records.map((r: any) => ({
      ...r,
      ngo_name: ngoMap.get(r.ngo_id) || "",
      service_name: svcMap.get(r.service_id) || "",
      beneficiary_name: benMap.get(r.ben_id) || "",
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch support records" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ben_id, ngo_id, service_id, assigned_by, notes } = body;

    if (!ben_id || !ngo_id || !service_id) {
      return NextResponse.json({ error: "ben_id, ngo_id, and service_id are required" }, { status: 400 });
    }

    const rows = await getSheetData("support_records");
    const headers = rows[0] ?? [];
    const records = rows.slice(1).map((row) =>
      Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""]))
    );

    const duplicate = records.find(
      (r: any) => r.ben_id === ben_id && r.service_id === service_id && (r.status === "Active" || r.status === "Pending")
    );

    if (duplicate) {
      const ngos = await getSheetData("ngos");
      const ngoMap = new Map<string, string>();
      ngos.slice(1).forEach((row) => ngoMap.set(row[0], row[1]));

      const services = await getSheetData("services");
      const svcMap = new Map<string, string>();
      services.slice(1).forEach((row) => svcMap.set(row[0], row[1]));

      return NextResponse.json(
        {
          error: "duplicate",
          existingRecord: {
            record_id: duplicate.record_id,
            ngo_id: duplicate.ngo_id,
            ngo_name: ngoMap.get(duplicate.ngo_id) || "",
            service_name: svcMap.get(duplicate.service_id) || "",
            start_date: duplicate.start_date,
          },
        },
        { status: 409 }
      );
    }

    const record_id = await generateId("REC", "support_records");
    const today = new Date().toISOString().split("T")[0];
    const start_date_val = body.start_date || today;
    
    // Determine status: Pending if start_date is in the future
    const status = start_date_val > today ? "Pending" : "Active";

    await appendRow("support_records", [
      record_id,
      ben_id,
      ngo_id,
      service_id,
      start_date_val,
      "",
      status,
      assigned_by || "",
      notes || "",
    ]);

    return NextResponse.json({ record_id, start_date: start_date_val, status });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create support record" }, { status: 500 });
  }
}
