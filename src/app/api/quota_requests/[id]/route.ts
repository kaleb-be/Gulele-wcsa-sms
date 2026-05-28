import { NextResponse } from "next/server";
import { getSheetData, updateRow, findRowIndex, updateCell } from "@/lib/sheets";
import { auth } from "@/lib/auth";

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
    const { status } = await request.json();

    if (!status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    const rowIndex = await findRowIndex("quota_requests", 0, id);
    if (!rowIndex) {
      return NextResponse.json({ error: "Quota request not found" }, { status: 404 });
    }

    const rows = await getSheetData("quota_requests");
    const headers = rows[0];
    const currentRow = rows[rowIndex - 1];
    const projectId = currentRow[1];
    const requestedQuota = currentRow[4];

    const today = new Date().toISOString().split("T")[0];

    const updatedRow = headers.map((header, index) => {
      if (header === "status") return status;
      if (header === "reviewed_by") return session.user?.name || session.user?.email || "Unknown";
      if (header === "review_date") return today;
      return currentRow[index] || "";
    });

    await updateRow("quota_requests", rowIndex, updatedRow);

    if (status === "Approved") {
      const projectRowIndex = await findRowIndex("projects", 0, projectId);
      if (projectRowIndex) {
        const projectRows = await getSheetData("projects");
        const projectHeaders = projectRows[0];
        const quotaTotalIndex = projectHeaders.indexOf("quota_total");
        if (quotaTotalIndex !== -1) {
            // updateCell uses 1-based indexing for row and column
            await updateCell("projects", projectRowIndex, quotaTotalIndex + 1, requestedQuota);
        }
      }
    }

    return NextResponse.json({ message: `Quota request ${status}` });
  } catch (error) {
    console.error(`PATCH /api/quota_requests/${params.id} error:`, error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
