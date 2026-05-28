import { NextResponse } from "next/server";
import { getSheetData, updateRow, deleteRow } from "@/lib/sheets";
import { auth } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = params;

    const ngoRows = await getSheetData("ngos");
    const ngoHeaders = ngoRows[0] || [];
    const ngoData = ngoRows.slice(1).find((row) => row[0] === id);
    if (!ngoData) return NextResponse.json({ error: "NGO not found" }, { status: 404 });

    const ngo: any = Object.fromEntries(ngoHeaders.map((h, i) => [h, ngoData[i] || ""]));

    const projectRows = await getSheetData("projects");
    const projectHeaders = projectRows[0] || [];
    const projects = projectRows.slice(1)
      .filter((row) => row[1] === id)
      .map((row) => Object.fromEntries(projectHeaders.map((h, i) => [h, row[i] || ""])));

    return NextResponse.json({ ngo, projects });
  } catch (error) {
    console.error(`GET /api/ngos/${params.id} error:`, error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session.user as any)?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin only" }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();

    const rows = await getSheetData("ngos");
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
    if (rowIndex === -1) return NextResponse.json({ error: "NGO not found" }, { status: 404 });

    // Pad to header length
    while (currentRow.length < headers.length) currentRow.push("");

    // Update only fields present in body
    headers.forEach((header, index) => {
      if (body.hasOwnProperty(header) && header !== "ngo_id") {
        currentRow[index] = String(body[header] ?? "");
      }
    });

    await updateRow("ngos", rowIndex, currentRow);
    return NextResponse.json({ message: "NGO updated successfully" });
  } catch (error) {
    console.error(`PATCH /api/ngos/${params.id} error:`, error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session.user as any)?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin only" }, { status: 403 });
    }

    const { id } = params;

    // Block delete if NGO has any projects
    const projectRows = await getSheetData("projects");
    const hasProjects = projectRows.slice(1).some((row) => row[1] === id);
    if (hasProjects) {
      return NextResponse.json(
        { error: "Cannot delete NGO with existing projects. Remove all projects first." },
        { status: 409 }
      );
    }

    const rows = await getSheetData("ngos");
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) { rowIndex = i + 1; break; }
    }
    if (rowIndex === -1) return NextResponse.json({ error: "NGO not found" }, { status: 404 });

    await deleteRow("ngos", rowIndex);
    return NextResponse.json({ message: "NGO deleted successfully" });
  } catch (error) {
    console.error(`DELETE /api/ngos/${params.id} error:`, error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}