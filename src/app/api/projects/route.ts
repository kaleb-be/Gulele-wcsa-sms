import { NextResponse } from "next/server";
import { getSheetData, appendRow, generateId } from "@/lib/sheets";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const ngo_id = searchParams.get("ngo_id");
    const status = searchParams.get("status");
    const aoi_category = searchParams.get("aoi_category");

    // Fetch enrollments to compute active counts per project
    const [projectRows, enrollmentRows] = await Promise.all([
      getSheetData("projects"),
      getSheetData("enrollments"),
    ]);

    const enrollmentHeaders = enrollmentRows[0] || [];
    const projIdIdx = enrollmentHeaders.indexOf("project_id");
    const statusIdx = enrollmentHeaders.indexOf("status");

    // Build active enrollment count map
    const activeCountMap: Record<string, number> = {};
    enrollmentRows.slice(1).forEach((row) => {
      if (row[statusIdx] === "Active") {
        const pid = row[projIdIdx];
        activeCountMap[pid] = (activeCountMap[pid] || 0) + 1;
      }
    });

    const headers = projectRows[0] || [];
    let data = projectRows.slice(1).map((row) => {
      const obj: any = Object.fromEntries(headers.map((h, i) => [h, row[i] || ""]));
      obj.active_enrollments = activeCountMap[obj.project_id] || 0;
      return obj;
    });

    if (ngo_id) data = data.filter((p: any) => p.ngo_id === ngo_id);
    if (status) data = data.filter((p: any) => p.status === status);
    if (aoi_category) data = data.filter((p: any) => p.aoi_category === aoi_category);

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const {
      ngo_id,
      project_title,
      operation_area,
      woreda,
      area_of_intervention,
      aoi_category,
      start_date,
      end_date,
      total_budget,
      quota_women,
      quota_children,
      quota_elderly,
      quota_disabled,
      status,
      notes,
    } = body;

    if (!ngo_id || !project_title || !aoi_category) {
      return NextResponse.json(
        { error: "ngo_id, project_title, and aoi_category are required" },
        { status: 400 }
      );
    }

    // Auto-calculate quota_total from individual quotas
    const qw = parseInt(quota_women) || 0;
    const qc = parseInt(quota_children) || 0;
    const qe = parseInt(quota_elderly) || 0;
    const qd = parseInt(quota_disabled) || 0;
    const quota_total = qw + qc + qe + qd;

    const project_id = await generateId("PRJ", "projects");

    // Header order: project_id, ngo_id, project_title, operation_area, woreda,
    // area_of_intervention, aoi_category, start_date, end_date, total_budget,
    // quota_women, quota_children, quota_elderly, quota_disabled, quota_total, status, notes
    await appendRow("projects", [
      project_id,
      ngo_id,
      project_title,
      operation_area || "",
      woreda || "",
      area_of_intervention || "",
      aoi_category,
      start_date || "",
      end_date || "",
      total_budget || "",
      String(qw),
      String(qc),
      String(qe),
      String(qd),
      String(quota_total),
      status || "Active",
      notes || "",
    ]);

    return NextResponse.json({ 
      project_id, 
      ngo_id, 
      project_title, 
      operation_area,
      woreda,
      area_of_intervention,
      aoi_category, 
      start_date, 
      end_date,
      total_budget,
      quota_women: String(qw),
      quota_children: String(qc),
      quota_elderly: String(qe),
      quota_disabled: String(qd),
      quota_total: String(quota_total),
      status: status || "Active",
      notes: notes || ""
    });
  } catch (error) {
    console.error("POST /api/projects error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}