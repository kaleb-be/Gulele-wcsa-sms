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
    const { enrollments, project_id, aoi_category, ngo_id, enrolled_by } = body

    if (!Array.isArray(enrollments) || enrollments.length === 0) {
      return NextResponse.json({ error: "No enrollments provided" }, { status: 400 })
    }
    if (!project_id || !aoi_category) {
      return NextResponse.json({ error: "project_id and aoi_category are required" }, { status: 400 })
    }

    // Read enrollments sheet ONCE
    const existingRows = await getSheetData("enrollments")
    const enrollmentHeaders = existingRows[0] || []
    const benIdIdx = enrollmentHeaders.indexOf("ben_id")
    const aoiIdx = enrollmentHeaders.indexOf("aoi_category")
    const statusIdx = enrollmentHeaders.indexOf("status")
    const startIdx = enrollmentHeaders.indexOf("start_date")
    const endIdx = enrollmentHeaders.indexOf("end_date")

    const activeEnrollments = existingRows.slice(1).filter(row => row[statusIdx] === "Active")

    // Find current max enrollment ID
    let maxEnrNum = 0
    existingRows.slice(1).forEach(row => {
      const id = row[0] ?? ""
      if (id.startsWith("ENR-")) {
        const num = parseInt(id.split("-")[1], 10)
        if (!isNaN(num) && num > maxEnrNum) maxEnrNum = num
      }
    })

    const results: { ben_id: string; status: "enrolled" | "duplicate" }[] = []
    const newEnrollmentRows: string[][] = []
    let idCounter = maxEnrNum

    for (const enr of enrollments) {
      const newStart = new Date(enr.start_date)
      const newEnd = enr.end_date ? new Date(enr.end_date) : new Date("9999-12-31")

      const conflict = activeEnrollments.find(row => {
        if (row[benIdIdx] !== enr.ben_id) return false
        if (row[aoiIdx] !== aoi_category) return false
        const exStart = new Date(row[startIdx])
        const exEnd = row[endIdx] ? new Date(row[endIdx]) : new Date("9999-12-31")
        return exStart <= newEnd && exEnd >= newStart
      })

      if (conflict) {
        results.push({ ben_id: enr.ben_id, status: "duplicate" })
        continue
      }

      idCounter++
      const enrollment_id = `ENR-${String(idCounter).padStart(3, "0")}`
      newEnrollmentRows.push([
        enrollment_id,
        enr.ben_id,
        project_id,
        ngo_id || "",
        aoi_category,
        enr.start_date,
        enr.end_date || "",
        "Active",
        enrolled_by || "",
        enr.notes || "",
        enr.support_range || "",
      ])
      results.push({ ben_id: enr.ben_id, status: "enrolled" })
    }

    if (newEnrollmentRows.length > 0) {
      const authClient = getGoogleAuth()
      const sheets = google.sheets({ version: "v4", auth: authClient })
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
        range: "enrollments",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: newEnrollmentRows },
      })
    }

    return NextResponse.json({
      results,
      enrolled: results.filter(r => r.status === "enrolled").length,
      duplicates: results.filter(r => r.status === "duplicate").length,
    })
  } catch (error) {
    console.error("POST /api/import/enrollments error:", error)
    return NextResponse.json({ error: "Batch enrollment import failed" }, { status: 500 })
  }
}
