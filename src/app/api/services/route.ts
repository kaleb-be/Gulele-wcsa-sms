import { NextRequest, NextResponse } from "next/server";
import { getSheetData, appendRow, generateId } from "@/lib/sheets";

export async function GET() {
  try {
    const rows = await getSheetData("services");
    const headers = rows[0] ?? [];
    const services = rows.slice(1).map((row) =>
      Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""]))
    );
    return NextResponse.json(services);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { service_name, description } = body;

    if (!service_name) {
      return NextResponse.json({ error: "Service name is required" }, { status: 400 });
    }

    const service_id = await generateId("SVC", "services");

    await appendRow("services", [
      service_id,
      service_name,
      description || "",
    ]);

    return NextResponse.json({ service_id, service_name });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create service" }, { status: 500 });
  }
}
