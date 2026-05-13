import { NextRequest, NextResponse } from "next/server";
import { getSheetData, appendRow, deleteRow, findRowIndex } from "@/lib/sheets";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ngo_id = searchParams.get("ngo_id") || "";
    const rows = await getSheetData("ngo_services");
    const headers = rows[0] ?? [];
    let items = rows.slice(1).map((row) =>
      Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""]))
    );
    if (ngo_id) {
      items = items.filter((item: any) => item.ngo_id === ngo_id);
    }
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch NGO services" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ngo_id, service_id, capacity } = body;

    if (!ngo_id || !service_id) {
      return NextResponse.json({ error: "ngo_id and service_id are required" }, { status: 400 });
    }

    await appendRow("ngo_services", [
      ngo_id,
      service_id,
      capacity?.toString() || "",
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create NGO service" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ngo_id = searchParams.get("ngo_id") || "";
    const service_id = searchParams.get("service_id") || "";

    const rows = await getSheetData("ngo_services");
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === ngo_id && rows[i][1] === service_id) {
        await deleteRow("ngo_services", i + 1);
        return NextResponse.json({ success: true });
      }
    }
    return NextResponse.json({ error: "NGO service not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete NGO service" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { ngo_id, service_id, capacity } = body;

    if (!ngo_id || !service_id) {
      return NextResponse.json({ error: "ngo_id and service_id are required" }, { status: 400 });
    }

    const { updateRow } = await import("@/lib/sheets");
    const rows = await getSheetData("ngo_services");
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === ngo_id && rows[i][1] === service_id) {
        const newRow = [...rows[i]];
        newRow[2] = capacity?.toString() || "";
        await updateRow("ngo_services", i + 1, newRow);
        return NextResponse.json({ success: true });
      }
    }
    return NextResponse.json({ error: "NGO service not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update NGO service capacity" }, { status: 500 });
  }
}
