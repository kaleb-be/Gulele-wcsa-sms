"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  UserPlus,
  Search,
  Printer,
  Pencil,
  XCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const AOI_CATEGORIES = [
  "Food Support",
  "Medical Aid",
  "Education Support",
  "Disability Support",
  "Elderly Support",
  "Women Support",
  "Child Protection",
  "Emergency Support",
];
// [  "Education", "Economic Empowerment", "Health and Nutrition",
//   "Psychosocial Support", "Physical Rehabilitation", "Family Empowerment",
//   "Child Development", "Elderly Care", "Disability Support", "Legal Aid",
//   "Housing and Shelter"
// ];

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
  support_range: string;
}

interface Beneficiary {
  ben_id: string;
  full_name: string;
  category: string;
  kebele: string;
}

export default function ProjectDetailPage() {
  const { t } = useLocale();
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";

  const {
    data: projectData,
    error: projectError,
    isLoading: projectLoading,
    mutate: mutateProject,
  } = useSWR<{
    project: Project;
    activeEnrollments: number;
    enrollments: Enrollment[];
  }>(id ? `/api/projects/${id}` : null, fetcher);

  const { data: enrollmentsData, mutate: mutateEnrollments } = useSWR<
    Enrollment[]
  >(id ? `/api/enrollments?project_id=${id}` : null, fetcher);

  // Enroll modal
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [benSearch, setBenSearch] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [enrollForm, setEnrollForm] = useState({
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    notes: "",
    support_range: "",
  });

  // Edit project modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Project>>({});

  // Bulk actions
  const [selectedEnrollments, setSelectedEnrollments] = useState<Set<string>>(
    new Set(),
  );
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const { data: benResults } = useSWR<Beneficiary[]>(
    benSearch.length > 2 ? `/api/beneficiaries?search=${benSearch}` : null,
    fetcher,
  );

  if (projectLoading)
    return (
      <div className="p-8 text-center text-gray-500">{t("common.loading")}</div>
    );
  if (projectError || !projectData?.project)
    return (
      <div className="p-8 text-center text-red-500">{t("common.noData")}</div>
    );

  const { project, activeEnrollments } = projectData;
  const enrollments = Array.isArray(enrollmentsData) ? enrollmentsData : [];
  const quotaTotal = parseInt(project.quota_total) || 0;
  const progress =
    quotaTotal > 0 ? Math.min(100, (activeEnrollments / quotaTotal) * 100) : 0;

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
        body: JSON.stringify({
          ...editForm,
          quota_total: String(newQuotaTotal),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }
      toast.success(t("common.save"));
      setShowEditModal(false);
      mutateProject();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleTerminate = async () => {
    if (!confirm(t("projects.terminateConfirm"))) return;
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Terminated" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to terminate");
      toast.success(t("projects.terminate"));
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
          toast.error(t("enroll.duplicateTitle"));
        } else if (data.error === "quota_exceeded") {
          toast.error(t("enroll.quotaTitle"));
        } else {
          throw new Error(data.message || "Failed to enroll");
        }
        return;
      }
      toast.success(t("enroll.enrollmentSuccess"));
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
    if (!confirm(`Terminate ${selectedEnrollments.size} enrollment(s)?`))
      return;
    setBulkProcessing(true);
    const today = new Date().toISOString().split("T")[0];
    try {
      await Promise.all(
        Array.from(selectedEnrollments).map((eid) =>
          fetch(`/api/enrollments/${eid}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "Cancelled", end_date: today }),
          }),
        ),
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

  const activeEnrollmentsList = enrollments.filter(
    (e) => e.status === "Active",
  );
  const allActiveSelected =
    activeEnrollmentsList.length > 0 &&
    selectedEnrollments.size === activeEnrollmentsList.length;

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = {
      Active: "bg-green-100 text-green-800",
      Completed: "bg-blue-100 text-blue-800",
      Cancelled: "bg-red-100 text-red-800",
      Terminated: "bg-gray-100 text-gray-800",
    };
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[s] || "bg-gray-100 text-gray-800"}`}
      >
        {s}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {project.project_title}
            </h1>
            <p className="text-sm text-gray-500">{project.ngo_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:justify-start justify-center w-full md:w-auto">
          {statusBadge(project.status)}
          {isAdmin && (
            <>
              <button
                onClick={openEditModal}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Pencil size={15} /> {t("projects.edit")}
              </button>
              {project.status === "Active" && (
                <button
                  onClick={handleTerminate}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <XCircle size={15} /> {t("projects.terminate")}
                </button>
              )}
            </>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Printer size={18} /> {t("projects.print")}
          </button>
        </div>
      </div>

      <div className="print-only mb-8">
        <div className="text-center pb-4 border-b-2 border-gray-300">
          <h2 className="text-xl font-bold text-gray-900">
            Women, Children and Social Affairs Office — Gullele Sub-City
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Project Details & Enrollment List
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-md p-6 grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-4 text-sm">
            <div>
              <p className="text-gray-500 font-medium">
                {t("projects.ngoLabel")}
              </p>
              <p className="text-gray-900 font-semibold">{project.ngo_name}</p>
            </div>
            <div>
              <p className="text-gray-500 font-medium">
                {t("projects.aoiLabel")}
              </p>
              <p className="text-gray-900 font-semibold">
                {project.aoi_category}
              </p>
            </div>
            <div>
              <p className="text-gray-500 font-medium">
                {t("projects.areaLabel")}
              </p>
              <p className="text-gray-900 font-semibold">
                {project.area_of_intervention || "—"}
              </p>
            </div>
            <div>
              <p className="text-gray-500 font-medium">
                {t("projects.operationLabel")}
              </p>
              <p className="text-gray-900 font-semibold">
                {project.operation_area || "—"}{" "}
                {project.woreda ? `/ ${project.woreda}` : ""}
              </p>
            </div>
            <div>
              <p className="text-gray-500 font-medium">
                {t("projects.datesLabel")}
              </p>
              <p className="text-gray-900 font-semibold">
                {project.start_date || "—"} →{" "}
                {project.end_date || t("projects.ongoing")}
              </p>
            </div>
            <div>
              <p className="text-gray-500 font-medium">
                {t("projects.budgetLabel")}
              </p>
              <p className="text-gray-900 font-semibold">
                {project.total_budget
                  ? `${parseFloat(project.total_budget).toLocaleString()} ETB`
                  : t("common.na")}
              </p>
            </div>
            {project.notes && (
              <div className="md:col-span-2">
                <p className="text-gray-500 font-medium">
                  {t("projects.notes")}
                </p>
                <p className="text-gray-900">{project.notes}</p>
              </div>
            )}
          </div>

          {/* Enrollments table */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-gray-800">
                  {t("projects.enrollments")}
                </h2>
                {selectedEnrollments.size > 0 && (
                  <button
                    onClick={handleBulkTerminate}
                    disabled={bulkProcessing}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    <XCircle size={13} />
                    {bulkProcessing
                      ? t("common.saving")
                      : `${t("projects.terminate")} ${selectedEnrollments.size} selected`}
                  </button>
                )}
              </div>
              {project.status === "Active" && (
                <button
                  onClick={() => setShowEnrollModal(true)}
                  className="no-print bg-blue-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors flex items-center gap-2"
                >
                  <UserPlus size={16} /> {t("projects.enrollBeneficiary")}
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
                    <th className="text-left py-3 px-2 font-medium">
                      {t("table.beneficiary")}
                    </th>
                    <th className="text-left py-3 px-2 font-medium">
                      {t("beneficiaries.category")}
                    </th>
                    <th className="text-left py-3 px-2 font-medium">
                      {t("beneficiaries.kebele")}
                    </th>
                    <th className="text-left py-3 px-2 font-medium">
                      {t("projects.startDate")}
                    </th>
                    <th className="text-left py-3 px-2 font-medium">
                      {t("projects.endDate")}
                    </th>
                    <th className="text-left py-3 px-2 font-medium">
                      {t("projects.status")}
                    </th>
                    <th className="text-left py-3 px-2 font-medium">
                      {t("enroll.supportRange")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-700">
                  {enrollments.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-8 text-center text-gray-400 italic"
                      >
                        {t("projects.noEnrollments")}
                      </td>
                    </tr>
                  ) : (
                    enrollments.map((enr) => (
                      <tr
                        key={enr.enrollment_id}
                        className={
                          selectedEnrollments.has(enr.enrollment_id)
                            ? "bg-red-50"
                            : ""
                        }
                      >
                        <td className="py-3 px-2">
                          {enr.status === "Active" && (
                            <input
                              type="checkbox"
                              checked={selectedEnrollments.has(
                                enr.enrollment_id,
                              )}
                              onChange={() => toggleSelect(enr.enrollment_id)}
                              className="accent-blue-900"
                            />
                          )}
                        </td>
                        <td className="py-3 px-2 font-medium">
                          {enr.full_name}
                        </td>
                        <td className="py-3 px-2">{enr.category}</td>
                        <td className="py-3 px-2">{enr.kebele}</td>
                        <td className="py-3 px-2">{enr.start_date}</td>
                        <td className="py-3 px-2">{enr.end_date || "—"}</td>
                        <td className="py-3 px-2">{statusBadge(enr.status)}</td>
                        <td className="py-3 px-2">
                          {enr.support_range ? enr.support_range + " ETB" : "—"}
                        </td>
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
            <h3 className="text-sm font-bold text-gray-800 mb-4">
              {t("projects.quotaUtilization")}
            </h3>
            <div className="space-y-4">
              <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-center font-medium text-gray-700">
                {activeEnrollments} {t("projects.slotsfilledMiddle")}{" "}
                {quotaTotal || "∞"} {t("projects.slotsfilledEnd")}
              </p>
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-50">
                {[
                  {
                    label: t("projects.quotaWomen"),
                    value: project.quota_women,
                  },
                  {
                    label: t("projects.quotaChildren"),
                    value: project.quota_children,
                  },
                  {
                    label: t("projects.quotaElderly"),
                    value: project.quota_elderly,
                  },
                  {
                    label: t("projects.quotaDisabled"),
                    value: project.quota_disabled,
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="bg-gray-50 p-3 rounded-lg text-center"
                  >
                    <p className="text-[10px] uppercase text-gray-500 font-bold">
                      {label}
                    </p>
                    <p className="text-lg font-bold text-gray-800">
                      {value || 0}
                    </p>
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
              <h2 className="text-lg font-bold text-gray-800">
                {t("enroll.title")}
              </h2>
              <button
                onClick={() => {
                  setShowEnrollModal(false);
                  setBenSearch("");
                  setEnrollForm({
                    start_date: new Date().toISOString().split("T")[0],
                    end_date: "",
                    notes: "",
                    support_range: "",
                  });
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder={t("enroll.searchBeneficiary")}
                  className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={benSearch}
                  onChange={(e) => setBenSearch(e.target.value)}
                />
              </div>
              <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
                {benSearch.length <= 2 ? (
                  <p className="p-4 text-center text-gray-400 text-xs italic">
                    {t("enroll.typeToSearch")}
                  </p>
                ) : !benResults || benResults.length === 0 ? (
                  <p className="p-4 text-center text-gray-400 text-xs italic">
                    {t("enroll.noResults")}
                  </p>
                ) : (
                  benResults.map((ben) => (
                    <div
                      key={ben.ben_id}
                      className="p-3 flex items-center justify-between hover:bg-gray-50"
                    >
                      <div>
                        <p className="text-sm font-bold text-gray-800">
                          {ben.full_name}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {ben.category} • {t("beneficiaries.kebele")}{" "}
                          {ben.kebele}
                        </p>
                      </div>
                      <button
                        onClick={() => handleEnroll(ben.ben_id)}
                        disabled={enrolling}
                        className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded font-bold hover:bg-blue-200 disabled:opacity-50"
                      >
                        {t("enroll.completeEnrollment")}
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    {t("enroll.startDate")}
                  </label>
                  <input
                    type="date"
                    value={enrollForm.start_date}
                    onChange={(e) =>
                      setEnrollForm({
                        ...enrollForm,
                        start_date: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    {t("enroll.endDate")}
                  </label>
                  <input
                    type="date"
                    value={enrollForm.end_date}
                    onChange={(e) =>
                      setEnrollForm({ ...enrollForm, end_date: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  {t("enroll.supportRangeOptional")}
                </label>
                <select
                  value={enrollForm.support_range}
                  onChange={(e) =>
                    setEnrollForm({
                      ...enrollForm,
                      support_range: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t("enroll.selectRange")}</option>
                  <option value="500-999">500 - 999</option>
                  <option value="1000-1999">1,000 - 1,999</option>
                  <option value="2000-3000">2,000 - 3,000</option>
                  <option value="3000-5000">3,000 - 5,000</option>
                  <option value="5000-10000">5,000 - 10,000</option>
                  <option value="10000-20000">10,000 - 20,000</option>
                  <option value="20000-50000">20,000 - 50,000</option>
                  <option value="50000-above">{t("enroll.supportRangeAbove")}</option>
                </select>
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
              <h2 className="text-lg font-bold text-gray-800">
                {t("projects.editProject")}
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("projects.projectTitle")} *
                </label>
                <input
                  required
                  type="text"
                  value={editForm.project_title || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, project_title: e.target.value })
                  }
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("projects.aoiCategory")}
                  </label>
                  <select
                    value={editForm.aoi_category || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, aoi_category: e.target.value })
                    }
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {AOI_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("projects.areaOfIntervention")}
                  </label>
                  <input
                    type="text"
                    value={editForm.area_of_intervention || ""}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        area_of_intervention: e.target.value,
                      })
                    }
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("projects.operationArea")}
                  </label>
                  <input
                    type="text"
                    value={editForm.operation_area || ""}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        operation_area: e.target.value,
                      })
                    }
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("projects.woreda")}
                  </label>
                  <input
                    type="text"
                    value={editForm.woreda || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, woreda: e.target.value })
                    }
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("projects.startDate")}
                  </label>
                  <input
                    type="date"
                    value={editForm.start_date || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, start_date: e.target.value })
                    }
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("projects.endDate")}
                  </label>
                  <input
                    type="date"
                    value={editForm.end_date || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, end_date: e.target.value })
                    }
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("projects.totalBudget")}
                </label>
                <input
                  type="number"
                  value={editForm.total_budget || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, total_budget: e.target.value })
                  }
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(
                  [
                    "quota_women",
                    "quota_children",
                    "quota_elderly",
                    "quota_disabled",
                  ] as const
                ).map((field) => (
                  <div key={field}>
                    <label className="block text-xs font-medium text-gray-700 mb-1 capitalize">
                      {t(`projects.${field.replace("quota_", "quota")}`)}
                    </label>
                    <input
                      type="number"
                      value={editForm[field] || "0"}
                      onChange={(e) =>
                        setEditForm({ ...editForm, [field]: e.target.value })
                      }
                      className="border border-gray-300 rounded-lg px-3 py-2 w-full text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                ))}
              </div>
              {/* Show computed total */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-blue-800">
                  {t("projects.autoQuota")}
                </span>
                <span className="text-xl font-bold text-blue-900">
                  {(parseInt(editForm.quota_women || "0") || 0) +
                    (parseInt(editForm.quota_children || "0") || 0) +
                    (parseInt(editForm.quota_elderly || "0") || 0) +
                    (parseInt(editForm.quota_disabled || "0") || 0)}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("projects.notes")}
                </label>
                <textarea
                  rows={2}
                  value={editForm.notes || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, notes: e.target.value })
                  }
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50"
                >
                  {editSubmitting ? t("common.saving") : t("common.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
