import { NextRequest, NextResponse } from "next/server"
import { getSheetData } from "@/lib/sheets"
import { auth } from "@/lib/auth"
import { google } from "googleapis"

function getGoogleAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  })
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { rows, registered_by } = body

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 })
    }

    // Read sheet ONCE to find current max ID
    const existingRows = await getSheetData("beneficiaries")
    let maxNum = 0
    for (let i = 1; i < existingRows.length; i++) {
      const id = existingRows[i][0] ?? ""
      if (id.startsWith("BEN-")) {
        const num = parseInt(id.split("-")[1], 10)
        if (!isNaN(num) && num > maxNum) maxNum = num
      }
    }

    const today = new Date().toISOString().split("T")[0]
    const newSheetRows: string[][] = []
    const assignedIds: string[] = []

    rows.forEach((row: any, i: number) => {
      const num = maxNum + i + 1
      const ben_id = `BEN-${String(num).padStart(3, "0")}`
      assignedIds.push(ben_id)
      newSheetRows.push([
        ben_id,
        row.full_name || "",
        row.sex || "Female",
        row.age || "",
        "",              // date_of_birth
        "",              // kebele
        row.woreda || "",
        "",              // house_no
        row.phone || "",
        row.id_type || "Kebele ID",
        row.id_number || "",
        row.category || "",
        row.sub_details || "",
        "",              // family_size
        "",              // occupation
        "",              // average_income
        row.registered_date || today,
        registered_by || "",
        "Active",
        "",              // photo_url
        row.notes || "",
      ])
    })

    // Append all rows in ONE API call
    const authClient = getGoogleAuth()
    const sheets = google.sheets({ version: "v4", auth: authClient })
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
      range: "beneficiaries",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: newSheetRows },
    })

    return NextResponse.json({ created: assignedIds.length, ben_ids: assignedIds })
  } catch (error) {
    console.error("POST /api/import/beneficiaries error:", error)
    return NextResponse.json({ error: "Batch beneficiary import failed" }, { status: 500 })
  }
}
