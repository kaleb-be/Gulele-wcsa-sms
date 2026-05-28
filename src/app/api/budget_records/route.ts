import { NextResponse } from "next/server";
import {getSheetData, appendRow, generateId, updateRow} from "@/lib/sheets";
import { auth } from "@/lib/auth";


export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const project_id = searchParams.get("project_id");
    const approval_status = searchParams.get("approval_status");

    const [budgetRows, projectRows] = await Promise.all([
      getSheetData("budget_records"),
      getSheetData("projects"),
    ]);

    // Build a project lookup map: project_id → project_title
    const projectHeaders = projectRows[0] ?? [];
    const projectMap: Record<string, string> = {};
    projectRows.slice(1).forEach((row) => {
      const obj: any = Object.fromEntries(projectHeaders.map((h, i) => [h, row[i] ?? ""]));
      if (obj.project_id) projectMap[obj.project_id] = obj.project_title || "";
    });

    const headers = budgetRows[0] ?? [];
    let data = budgetRows.slice(1).map((row) => {
      const obj: any = Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""]));
      // Inject project_title from lookup
      obj.project_title = projectMap[obj.project_id] || obj.project_id;
      return obj;
    });

    if (project_id) data = data.filter((b: any) => b.project_id === project_id);
    if (approval_status) data = data.filter((b: any) => b.approval_status === approval_status);

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/budget_records error:", error);
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
    const { approval_status } = await request.json();

    if (!["Approved", "Rejected"].includes(approval_status)) {
      return NextResponse.json({ error: "Invalid approval_status" }, { status: 400 });
    }

    const rows = await getSheetData("budget_records");
    const headers = rows[0] ?? [];

    // Find the row
    let rowIndex = -1;
    let currentRow: string[] = [];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        rowIndex = i + 1; // 1-based sheet row (header is row 1, first data is row 2)
        currentRow = [...rows[i]];
        break;
      }
    }

    if (rowIndex === -1) {
      return NextResponse.json({ error: "Budget record not found" }, { status: 404 });
    }

    // Pad currentRow to match headers length
    while (currentRow.length < headers.length) currentRow.push("");

    // Update only approval_status and approved_by columns
    const approvalStatusIdx = headers.indexOf("approval_status");
    const approvedByIdx = headers.indexOf("approved_by");

    if (approvalStatusIdx !== -1) currentRow[approvalStatusIdx] = approval_status;
    if (approvedByIdx !== -1) currentRow[approvedByIdx] = session.user?.name || "";

    await updateRow("budget_records", rowIndex, currentRow);

    return NextResponse.json({ message: `Budget record ${approval_status.toLowerCase()}` });
  } catch (error) {
    console.error(`PATCH /api/budget_records/${params.id} error:`, error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}