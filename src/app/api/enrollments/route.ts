import { NextResponse } from "next/server";
import { getSheetData, appendRow, generateId } from "@/lib/sheets";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const ben_id = searchParams.get("ben_id");
    const project_id = searchParams.get("project_id");
    const status = searchParams.get("status");

    // Fetch all four sheets in parallel
    const [enrollmentRows, beneficiaryRows, projectRows, ngoRows] = await Promise.all([
      getSheetData("enrollments"),
      getSheetData("beneficiaries"),
      getSheetData("projects"),
      getSheetData("ngos"),
    ]);

    // Build lookup maps for O(1) joins
    const benHeaders = beneficiaryRows[0] || [];
    const benMap: Record<string, any> = {};
    beneficiaryRows.slice(1).forEach((row) => {
      const obj: any = Object.fromEntries(benHeaders.map((h, i) => [h, row[i] || ""]));
      if (obj.ben_id) benMap[obj.ben_id] = obj;
    });

    const projectHeaders = projectRows[0] || [];
    const projectMap: Record<string, any> = {};
    projectRows.slice(1).forEach((row) => {
      const obj: any = Object.fromEntries(projectHeaders.map((h, i) => [h, row[i] || ""]));
      if (obj.project_id) projectMap[obj.project_id] = obj;
    });

    const ngoHeaders = ngoRows[0] || [];
    const ngoMap: Record<string, any> = {};
    ngoRows.slice(1).forEach((row) => {
      const obj: any = Object.fromEntries(ngoHeaders.map((h, i) => [h, row[i] || ""]));
      if (obj.ngo_id) ngoMap[obj.ngo_id] = obj;
    });

    const headers = enrollmentRows[0] || [];
    let data = enrollmentRows.slice(1).map((row) => {
      const obj: any = Object.fromEntries(headers.map((h, i) => [h, row[i] || ""]));

      // Join beneficiary fields
      const ben = benMap[obj.ben_id];
      obj.full_name = ben?.full_name || "";
      obj.category = ben?.category || "";
      obj.kebele = ben?.kebele || "";
      obj.beneficiary_name = ben?.full_name || "";

      // Join project fields
      const proj = projectMap[obj.project_id];
      obj.project_title = proj?.project_title || "";

      // Join NGO fields
      const ngo = ngoMap[obj.ngo_id];
      obj.ngo_name = ngo?.name || "";

      return obj;
    });

    if (ben_id) data = data.filter((e: any) => e.ben_id === ben_id);
    if (project_id) data = data.filter((e: any) => e.project_id === project_id);
    if (status) data = data.filter((e: any) => e.status === status);

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/enrollments error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { ben_id, project_id, start_date, end_date, notes, support_range } = body;

    if (!ben_id || !project_id || !start_date) {
      return NextResponse.json(
        { error: "ben_id, project_id, and start_date are required" },
        { status: 400 }
      );
    }

    // 1. Fetch project details
    const projectRows = await getSheetData("projects");
    const projectHeaders = projectRows[0] || [];
    const projectData = projectRows.slice(1).find((row) => row[0] === project_id);

    if (!projectData) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const project: any = {};
    projectHeaders.forEach((header, index) => {
      project[header] = projectData[index] || "";
    });

    // 2. Fetch NGO details for conflicting enrollment display if needed
    const ngoRows = await getSheetData("ngos");
    const ngoHeaders = ngoRows[0] || [];
    const ngos = ngoRows.slice(1).map(row => {
      const obj: any = {};
      ngoHeaders.forEach((h, i) => obj[h] = row[i] || "");
      return obj;
    });

    // 3. Fetch all enrollments for duplicate check
    const enrollmentRows = await getSheetData("enrollments");
    const enrollmentHeaders = enrollmentRows[0] || [];
    const enrollments = enrollmentRows.slice(1).map((row) => {
      const obj: any = {};
      enrollmentHeaders.forEach((header, index) => {
        obj[header] = row[index] || "";
      });
      return obj;
    });

    const activeEnrollmentsForBen = enrollments.filter(
      (e: any) => e.ben_id === ben_id && e.status === "Active"
    );

    // 4. Duplicate prevention logic
    const newStart = new Date(start_date);
    const newEnd = end_date ? new Date(end_date) : (project.end_date ? new Date(project.end_date) : new Date("9999-12-31"));

    for (const existing of activeEnrollmentsForBen) {
      if (existing.aoi_category === project.aoi_category) {
        const existingStart = new Date(existing.start_date);
        let existingEndStr = existing.end_date;
        if (!existingEndStr) {
          // Look up project end date for existing enrollment if not set
          const existingProject = projectRows.slice(1).find(p => p[0] === existing.project_id);
          existingEndStr = existingProject ? existingProject[8] : ""; // end_date is at index 8
        }
        const existingEnd = existingEndStr ? new Date(existingEndStr) : new Date("9999-12-31");

        // Overlap check: existing.start_date <= new.end_date AND existing.end_date >= new.start_date
        if (existingStart <= newEnd && existingEnd >= newStart) {
          const conflictingProjectRow = projectRows.slice(1).find(p => p[0] === existing.project_id);
          const conflictingProjectTitle = conflictingProjectRow ? conflictingProjectRow[2] : "Unknown";
          const conflictingNgoId = conflictingProjectRow ? conflictingProjectRow[1] : "";
          const conflictingNgo = ngos.find(n => n.ngo_id === conflictingNgoId);

          return NextResponse.json({
            error: "duplicate",
            conflictingEnrollment: {
              enrollment_id: existing.enrollment_id,
              project_title: conflictingProjectTitle,
              ngo_name: conflictingNgo ? conflictingNgo.name : "Unknown",
              aoi_category: existing.aoi_category,
              start_date: existing.start_date,
              end_date: existing.end_date
            }
          }, { status: 409 });
        }
      }
    }

    // 5. Quota check
    const activeEnrollmentsForProject = enrollments.filter(
      (e: any) => e.project_id === project_id && e.status === "Active"
    ).length;

    if (project.quota_total && activeEnrollmentsForProject >= parseInt(project.quota_total)) {
      return NextResponse.json({
        error: "quota_exceeded",
        projectTitle: project.project_title,
        quota: project.quota_total
      }, { status: 409 });
    }

    // 6. Generate enrollment_id
    const enrollment_id = await generateId("ENR", "enrollments");

    // 7. Append row
    // enrollment_id, ben_id, project_id, ngo_id, aoi_category, start_date, end_date, status, enrolled_by, notes
    const newRow = [
      enrollment_id,
      ben_id,
      project_id,
      project.ngo_id,
      project.aoi_category,
      start_date,
      end_date || "",
      "Active",
      session.user?.name || session.user?.email || "Unknown",
      notes || "",
      support_range || "",
    ];

    await appendRow("enrollments", newRow);

    return NextResponse.json({ message: "Enrollment created successfully", enrollment_id });
  } catch (error) {
    console.error("POST /api/enrollments error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
