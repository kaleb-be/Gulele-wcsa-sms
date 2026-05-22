import { NextRequest, NextResponse } from "next/server";
import { getSheetData, appendRow, generateId } from "@/lib/sheets";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await getSheetData("users");
    const headers = rows[0] ?? [];
    const users = rows.slice(1).map((row) => {
      const user = Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""]));
      delete user.password_hash;
      return user;
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { full_name, username, password, role } = body;

    if (!full_name || !username) {
      return NextResponse.json({ error: "Full name and username are required" }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const user_id = await generateId("USR", "users");
    const today = new Date().toISOString().split("T")[0];

    await appendRow("users", [
      user_id,
      username,
      password_hash,
      full_name,
      role || "staff",
      "Active",
      today,
      "",
    ]);

    return NextResponse.json({ user_id, username, full_name });
  } catch (error) {
    console.error("Failed to create user:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
