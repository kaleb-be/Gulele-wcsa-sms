"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";
import { ArrowLeft, UserPlus, Search, Printer, Pencil, XCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const AOI_CATEGORIES = [
  "Education", "Economic Empowerment", "Health and Nutrition",
  "Psychosocial Support", "Physical Rehabilitation", "Family Empowerment",
  "Child Development", "Elderly Care", "Disability Support", "Legal Aid",
  "Housing and Shelter"
];

interface Project {
  project_id: string;
  ngo_id: string;
  ngo_name: string;
  project_title: string;
  aoi_category: string;
  area_of_intervention: string;
  operation_area: string;
  woreda: string;
  start_date: string;
  end_date: string;
  total_budget: string;
  quota_women: string;
  quota_children: string;
  quota_elderly: string;
  quota_disabled: string;
  quota_total: string;
  status: string;
  notes: string;
}

interface Enrollment {
  enrollment_id: string;
  ben_id: string;
  full_name: string;
  category: string;
  kebele: string;
  start_date: string;
  end_date: string;
  status: string;
  aoi_category: string;
}

interface Beneficiary {
  ben_id: string;
  full_name: string;
  category: string;
  kebele: string;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";

  const { data: projectData, error: projectError, isLoading: projectLoading, mutate: mutateProject } =
    useSWR<{ project: Project; activeEnrollments: number; enrollments: Enrollment[] }>(
      id ? `/api/projects/${id}` : null,
      fetcher
    );

  const { data: enrollmentsData, mutate: mutateEnrollments } = useSWR<Enrollment[]>(
    id ? `/api/enrollments?project_id=${id}` : null,
    fetcher
  );

  // Enroll modal
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [benSearch, setBenSearch] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [enrollForm, setEnrollForm] = useState({
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    notes: "",
  });

  // Edit project modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Project>>({});

  // Bulk actions
  const [selectedEnrollments, setSelectedEnrollments] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const { data: benResults } = useSWR<Beneficiary[]>(
    benSearch.length > 2 ? `/api/beneficiaries?search=${benSearch}` : null,
    fetcher
  );

  if (projectLoading) return <div className="p-8 text-center text-gray-500">Loading project details...</div>;
  if (projectError || !projectData?.project) return <div className="p-8 text-center text-red-500">Failed to load project.</div>;

  const { project, activeEnrollments } = projectData;
  const enrollments = Array.isArray(enrollmentsData) ? enrollmentsData : [];
  const quotaTotal = parseInt(project.quota_total) || 0;
  const progress = quotaTotal > 0 ? Math.min(100, (activeEnrollments / quotaTotal) * 100) : 0;

  const openEditModal = () => {
    setEditForm({ ...project });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditSubmitting(true);

    // Recompute quota_total from individual quotas on edit
    const qw = parseInt(editForm.quota_women || "0") || 0;
    const qc = parseInt(editForm.quota_children || "0") || 0;
    const qe = parseInt(editForm.quota_elderly || "0") || 0;
    const qd = parseInt(editForm.quota_disabled || "0") || 0;
    const newQuotaTotal = qw + qc + qe + qd;

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, quota_total: String(newQuotaTotal) }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }
      toast.success("Project updated");
      setShowEditModal(false);
      mutateProject();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleTerminate = async () => {
    if (!confirm(`Terminate project "${project.project_title}"? This will mark it as Terminated. Active enrollments must be resolved first.`)) return;
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Terminated" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to terminate");
      toast.success("Project terminated");
      mutateProject();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleEnroll = async (benId: string) => {
    setEnrolling(true);
    try {
      const res = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ben_id: benId,
          project_id: project.project_id,
          ...enrollForm,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "duplicate") {
          toast.error(`Duplicate: already enrolled in ${data.conflictingEnrollment.project_title}`);
        } else if (data.error === "quota_exceeded") {
          toast.error("Project quota exceeded");
        } else {
          throw new Error(data.message || "Failed to enroll");
        }
        return;
      }
      toast.success("Beneficiary enrolled successfully");
      setShowEnrollModal(false);
      setBenSearch("");
      mutateEnrollments();
      mutateProject();
    } catch (err) {
      toast.error("Failed to enroll beneficiary");
    } finally {
      setEnrolling(false);
    }
  };

  // Bulk selection
  const toggleSelect = (id: string) => {
    setSelectedEnrollments((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const active = enrollments.filter((e) => e.status === "Active");
    if (selectedEnrollments.size === active.length) {
      setSelectedEnrollments(new Set());
    } else {
      setSelectedEnrollments(new Set(active.map((e) => e.enrollment_id)));
    }
  };

  const handleBulkTerminate = async () => {
    if (selectedEnrollments.size === 0) return;
    if (!confirm(`Terminate ${selectedEnrollments.size} enrollment(s)?`)) return;
    setBulkProcessing(true);
    const today = new Date().toISOString().split("T")[0];
    try {
      await Promise.all(
        Array.from(selectedEnrollments).map((eid) =>
          fetch(`/api/enrollments/${eid}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "Cancelled", end_date: today }),
          })
        )
      );
      toast.success(`${selectedEnrollments.size} enrollment(s) terminated`);
      setSelectedEnrollments(new Set());
      mutateEnrollments();
      mutateProject();
    } catch (err) {
      toast.error("Some terminations failed");
    } finally {
      setBulkProcessing(false);
    }
  };

  const activeEnrollmentsList = enrollments.filter((e) => e.status === "Active");
  const allActiveSelected = activeEnrollmentsList.length > 0 &&
    selectedEnrollments.size === activeEnrollmentsList.length;

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = {
      Active: "bg-green-100 text-green-800",
      Completed: "bg-blue-100 text-blue-800",
      Cancelled: "bg-red-100 text-red-800",
      Terminated: "bg-gray-100 text-gray-800",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[s] || "bg-gray-100 text-gray-800"}`}>
        {s}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="no-print flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{project.project_title}</h1>
            <p className="text-sm text-gray-500">{project.ngo_name}</p>
          </div>
          {statusBadge(project.status)}
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <button onClick={openEditModal}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Pencil size={15} /> Edit
              </button>
              {project.status === "Active" && (
                <button onClick={handleTerminate}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors">
                  <XCircle size={15} /> Terminate
                </button>
              )}
            </>
          )}
          <button onClick={() => window.print()}
                  className="flex items-center gap-2 bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            <Printer size={18} /> Print
          </button>
        </div>
      </div>

      <div className="print-only mb-8">
        <div className="text-center pb-4 border-b-2 border-gray-300">
          <h2 className="text-xl font-bold text-gray-900">Women, Children and Social Affairs Office — Gullele Sub-City</h2>
          <p className="text-sm text-gray-600 mt-1">Project Details & Enrollment List</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-md p-6 grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-4 text-sm">
            <div>
              <p className="text-gray-500 font-medium">NGO</p>
              <p className="text-gray-900 font-semibold">{project.ngo_name}</p>
            </div>
            <div>
              <p className="text-gray-500 font-medium">AOI Category</p>
              <p className="text-gray-900 font-semibold">{project.aoi_category}</p>
            </div>
            <div>
              <p className="text-gray-500 font-medium">Area of Intervention</p>
              <p className="text-gray-900 font-semibold">{project.area_of_intervention || "—"}</p>
            </div>
            <div>
              <p className="text-gray-500 font-medium">Operation Area / Woreda</p>
              <p className="text-gray-900 font-semibold">{project.operation_area || "—"} {project.woreda ? `/ ${project.woreda}` : ""}</p>
            </div>
            <div>
              <p className="text-gray-500 font-medium">Dates</p>
              <p className="text-gray-900 font-semibold">{project.start_date || "—"} → {project.end_date || "Ongoing"}</p>
            </div>
            <div>
              <p className="text-gray-500 font-medium">Total Budget</p>
              <p className="text-gray-900 font-semibold">{project.total_budget ? `${parseFloat(project.total_budget).toLocaleString()} ETB` : "N/A"}</p>
            </div>
            {project.notes && (
              <div className="md:col-span-2">
                <p className="text-gray-500 font-medium">Notes</p>
                <p className="text-gray-900">{project.notes}</p>
              </div>
            )}
          </div>

          {/* Enrollments table */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-gray-800">Enrollments</h2>
                {selectedEnrollments.size > 0 && (
                  <button
                    onClick={handleBulkTerminate}
                    disabled={bulkProcessing}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    <XCircle size={13} />
                    {bulkProcessing ? "Processing..." : `Terminate ${selectedEnrollments.size} selected`}
                  </button>
                )}
              </div>
              {project.status === "Active" && (
                <button
                  onClick={() => setShowEnrollModal(true)}
                  className="no-print bg-blue-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors flex items-center gap-2"
                >
                  <UserPlus size={16} /> Enroll Beneficiary
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                <tr className="border-b border-gray-100 text-gray-500">
                  <th className="py-3 px-2 text-left w-8">
                    <input
                      type="checkbox"
                      checked={allActiveSelected}
                      onChange={toggleSelectAll}
                      className="accent-blue-900"
                    />
                  </th>
                  <th className="text-left py-3 px-2 font-medium">Beneficiary</th>
                  <th className="text-left py-3 px-2 font-medium">Category</th>
                  <th className="text-left py-3 px-2 font-medium">Kebele</th>
                  <th className="text-left py-3 px-2 font-medium">Start Date</th>
                  <th className="text-left py-3 px-2 font-medium">End Date</th>
                  <th className="text-left py-3 px-2 font-medium">Status</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-700">
                {enrollments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400 italic">No enrollments yet.</td>
                  </tr>
                ) : (
                  enrollments.map((enr) => (
                    <tr key={enr.enrollment_id} className={selectedEnrollments.has(enr.enrollment_id) ? "bg-red-50" : ""}>
                      <td className="py-3 px-2">
                        {enr.status === "Active" && (
                          <input
                            type="checkbox"
                            checked={selectedEnrollments.has(enr.enrollment_id)}
                            onChange={() => toggleSelect(enr.enrollment_id)}
                            className="accent-blue-900"
                          />
                        )}
                      </td>
                      <td className="py-3 px-2 font-medium">{enr.full_name}</td>
                      <td className="py-3 px-2">{enr.category}</td>
                      <td className="py-3 px-2">{enr.kebele}</td>
                      <td className="py-3 px-2">{enr.start_date}</td>
                      <td className="py-3 px-2">{enr.end_date || "—"}</td>
                      <td className="py-3 px-2">{statusBadge(enr.status)}</td>
                    </tr>
                  ))
                )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6 no-print">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-sm font-bold text-gray-800 mb-4">Quota Utilization</h3>
            <div className="space-y-4">
              <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-sm text-center font-medium text-gray-700">
                {activeEnrollments} of {quotaTotal || "∞"} total slots filled
              </p>
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-50">
                {[
                  { label: "Women", value: project.quota_women },
                  { label: "Children", value: project.quota_children },
                  { label: "Elderly", value: project.quota_elderly },
                  { label: "Disabled", value: project.quota_disabled },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 p-3 rounded-lg text-center">
                    <p className="text-[10px] uppercase text-gray-500 font-bold">{label}</p>
                    <p className="text-lg font-bold text-gray-800">{value || 0}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enroll Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">Enroll Beneficiary</h2>
              <button onClick={() => { setShowEnrollModal(false); setBenSearch(""); }} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={benSearch}
                  onChange={(e) => setBenSearch(e.target.value)}
                />
              </div>
              <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
                {benSearch.length <= 2 ? (
                  <p className="p-4 text-center text-gray-400 text-xs italic">Type at least 3 characters</p>
                ) : !benResults || benResults.length === 0 ? (
                  <p className="p-4 text-center text-gray-400 text-xs italic">No beneficiaries found</p>
                ) : (
                  benResults.map((ben) => (
                    <div key={ben.ben_id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                      <div>
                        <p className="text-sm font-bold text-gray-800">{ben.full_name}</p>
                        <p className="text-[10px] text-gray-500">{ben.category} • Kebele {ben.kebele}</p>
                      </div>
                      <button
                        onClick={() => handleEnroll(ben.ben_id)}
                        disabled={enrolling}
                        className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded font-bold hover:bg-blue-200 disabled:opacity-50"
                      >
                        Enroll
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date</label>
                  <input type="date" value={enrollForm.start_date}
                         onChange={(e) => setEnrollForm({ ...enrollForm, start_date: e.target.value })}
                         className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Date (Optional)</label>
                  <input type="date" value={enrollForm.end_date}
                         onChange={(e) => setEnrollForm({ ...enrollForm, end_date: e.target.value })}
                         className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-800">Edit Project</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Title *</label>
                <input required type="text" value={editForm.project_title || ""}
                       onChange={(e) => setEditForm({ ...editForm, project_title: e.target.value })}
                       className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">AOI Category</label>
                  <select value={editForm.aoi_category || ""}
                          onChange={(e) => setEditForm({ ...editForm, aoi_category: e.target.value })}
                          className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    {AOI_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Area of Intervention</label>
                  <input type="text" value={editForm.area_of_intervention || ""}
                         onChange={(e) => setEditForm({ ...editForm, area_of_intervention: e.target.value })}
                         className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Operation Area</label>
                  <input type="text" value={editForm.operation_area || ""}
                         onChange={(e) => setEditForm({ ...editForm, operation_area: e.target.value })}
                         className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Woreda</label>
                  <input type="text" value={editForm.woreda || ""}
                         onChange={(e) => setEditForm({ ...editForm, woreda: e.target.value })}
                         className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input type="date" value={editForm.start_date || ""}
                         onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                         className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input type="date" value={editForm.end_date || ""}
                         onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                         className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Budget (ETB)</label>
                <input type="number" value={editForm.total_budget || ""}
                       onChange={(e) => setEditForm({ ...editForm, total_budget: e.target.value })}
                       className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(["quota_women", "quota_children", "quota_elderly", "quota_disabled"] as const).map((field) => (
                  <div key={field}>
                    <label className="block text-xs font-medium text-gray-700 mb-1 capitalize">
                      {field.replace("quota_", "Quota ")}
                    </label>
                    <input type="number" value={editForm[field] || "0"}
                           onChange={(e) => setEditForm({ ...editForm, [field]: e.target.value })}
                           className="border border-gray-300 rounded-lg px-3 py-2 w-full text-xs focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                ))}
              </div>
              {/* Show computed total */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-blue-800">Auto-calculated Total Quota</span>
                <span className="text-xl font-bold text-blue-900">
                  {(parseInt(editForm.quota_women || "0") || 0) +
                    (parseInt(editForm.quota_children || "0") || 0) +
                    (parseInt(editForm.quota_elderly || "0") || 0) +
                    (parseInt(editForm.quota_disabled || "0") || 0)}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea rows={2} value={editForm.notes || ""}
                          onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                          className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowEditModal(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={editSubmitting}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50">
                  {editSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}