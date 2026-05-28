import { NextResponse } from "next/server";
import { getSheetData, appendRow, generateId } from "@/lib/sheets";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const rows = await getSheetData("quota_requests");
    const headers = rows[0] || [];
    let data = rows.slice(1).map((row) => {
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || "";
      });
      return obj;
    });

    if (status) data = data.filter((q: any) => q.status === status);

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/quota_requests error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { project_id, requested_quota, reason } = body;

    if (!project_id || !requested_quota || !reason) {
      return NextResponse.json(
        { error: "project_id, requested_quota, and reason are required" },
        { status: 400 }
      );
    }

    // Look up current quota_total from projects
    const projectRows = await getSheetData("projects");
    const projectData = projectRows.slice(1).find((row) => row[0] === project_id);
    if (!projectData) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const current_quota = projectData[14]; // quota_total is at index 14

    const request_id = await generateId("QRQ", "quota_requests");
    const today = new Date().toISOString().split("T")[0];

    // Header order: request_id, project_id, requested_by, current_quota, requested_quota, reason, status, reviewed_by, request_date, review_date
    const newRow = [
      request_id,
      project_id,
      session.user?.name || session.user?.email || "Unknown",
      current_quota || "0",
      requested_quota,
      reason,
      "Pending",
      "", // reviewed_by
      today,
      "", // review_date
    ];

    await appendRow("quota_requests", newRow);

    return NextResponse.json({ message: "Quota request created successfully", request_id });
  } catch (error) {
    console.error("POST /api/quota_requests error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
