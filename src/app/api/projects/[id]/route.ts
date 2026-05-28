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

    const [projectRows, enrollmentRows, ngoRows] = await Promise.all([
      getSheetData("projects"),
      getSheetData("enrollments"),
      getSheetData("ngos"),
    ]);

    const projectHeaders = projectRows[0] || [];
    const projectData = projectRows.slice(1).find((row) => row[0] === id);
    if (!projectData) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const project: any = Object.fromEntries(projectHeaders.map((h, i) => [h, projectData[i] || ""]));

    // Attach NGO name
    const ngoHeaders = ngoRows[0] || [];
    const ngoData = ngoRows.slice(1).find((row) => row[0] === project.ngo_id);
    project.ngo_name = ngoData ? ngoData[ngoHeaders.indexOf("name")] || "" : "";

    // Active enrollment count
    const enrollmentHeaders = enrollmentRows[0] || [];
    const enrollments = enrollmentRows.slice(1)
      .filter((row) => row[enrollmentHeaders.indexOf("project_id")] === id)
      .map((row) => Object.fromEntries(enrollmentHeaders.map((h, i) => [h, row[i] || ""])));

    const activeEnrollments = enrollments.filter((e: any) => e.status === "Active").length;

    return NextResponse.json({ project, enrollments, activeEnrollments });
  } catch (error) {
    console.error(`GET /api/projects/${params.id} error:`, error);
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

    const rows = await getSheetData("projects");
    const headers = rows[0] || [];

    let rowIndex = -1;
    let currentRow: string[] = [];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        rowIndex = i + 1;
        currentRow = [...rows[i]];
        break;
      }
    }
    if (rowIndex === -1) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    while (currentRow.length < headers.length) currentRow.push("");

    headers.forEach((header, index) => {
      if (body.hasOwnProperty(header) && header !== "project_id" && header !== "ngo_id") {
        currentRow[index] = String(body[header] ?? "");
      }
    });

    await updateRow("projects", rowIndex, currentRow);
    return NextResponse.json({ message: "Project updated successfully" });
  } catch (error) {
    console.error(`PATCH /api/projects/${params.id} error:`, error);
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

    // Block delete if any active enrollments exist
    const enrollmentRows = await getSheetData("enrollments");
    const enrollmentHeaders = enrollmentRows[0] || [];
    const projectIdIdx = enrollmentHeaders.indexOf("project_id");
    const statusIdx = enrollmentHeaders.indexOf("status");

    const hasActiveEnrollments = enrollmentRows.slice(1).some(
      (row) => row[projectIdIdx] === id && row[statusIdx] === "Active"
    );
    if (hasActiveEnrollments) {
      return NextResponse.json(
        { error: "Cannot delete project with active enrollments. Complete or cancel all enrollments first." },
        { status: 409 }
      );
    }

    const rows = await getSheetData("projects");
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) { rowIndex = i + 1; break; }
    }
    if (rowIndex === -1) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    await deleteRow("projects", rowIndex);
    return NextResponse.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error(`DELETE /api/projects/${params.id} error:`, error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}