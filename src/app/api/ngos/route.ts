import { NextResponse } from "next/server";
import { getSheetData, appendRow, generateId } from "@/lib/sheets";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.toLowerCase() || "";

    const rows = await getSheetData("ngos");
    const headers = rows[0] || [];
    let data = rows.slice(1).map((row) => {
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || "";
      });
      return obj;
    });

    if (status) data = data.filter((ngo: any) => ngo.status === status);
    if (search) {
      data = data.filter((ngo: any) =>
        ngo.name?.toLowerCase().includes(search) ||
        ngo.contact_person?.toLowerCase().includes(search)
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/ngos error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { name, contact_person, phone, email, registration_number, status, notes } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const ngo_id = await generateId("NGO", "ngos");

    await appendRow("ngos", [
      ngo_id,
      name,
      contact_person || "",
      phone || "",
      email || "",
      registration_number || "",
      status || "Active",
      notes || "",
    ]);

    return NextResponse.json({ message: "NGO created successfully", ngo_id });
  } catch (error) {
    console.error("POST /api/ngos error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}