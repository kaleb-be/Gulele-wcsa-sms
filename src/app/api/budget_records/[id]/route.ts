import { NextResponse } from "next/server";
import { getSheetData, updateRow, findRowIndex } from "@/lib/sheets";
import { auth } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // session role check - assuming session.user.role exists based on lib/auth.ts return
    if ((session.user as any)?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin only" }, { status: 403 });
    }

    const { id } = params;
    const { approval_status } = await request.json();

    if (!approval_status) {
      return NextResponse.json({ error: "approval_status is required" }, { status: 400 });
    }

    const rowIndex = await findRowIndex("budget_records", 0, id);
    if (!rowIndex) {
      return NextResponse.json({ error: "Budget record not found" }, { status: 404 });
    }

    const rows = await getSheetData("budget_records");
    const headers = rows[0];
    const currentRow = rows[rowIndex - 1];

    const updatedRow = headers.map((header, index) => {
      if (header === "approval_status") return approval_status;
      if (header === "approved_by") return session.user?.name || session.user?.email || "Unknown";
      return currentRow[index] || "";
    });

    await updateRow("budget_records", rowIndex, updatedRow);

    return NextResponse.json({ message: `Budget record ${approval_status}` });
  } catch (error) {
    console.error(`PATCH /api/budget_records/${params.id} error:`, error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
