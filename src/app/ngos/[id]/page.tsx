"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, Plus, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
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
//   [
//   "Education",
//   "Economic Empowerment",
//   "Health and Nutrition",
//   "Psychosocial Support",
//   "Physical Rehabilitation",
//   "Family Empowerment",
//   "Child Development",
//   "Elderly Care",
//   "Disability Support",
//   "Legal Aid",
//   "Housing and Shelter",
// ];

interface Project {
  project_id: string;
  ngo_id: string;
  project_title: string;
  operation_area: string;
  woreda: string;
  area_of_intervention: string;
  aoi_category: string;
  start_date: string;
  end_date: string;
  total_budget: string;
  quota_total: string;
  status: string;
}

interface NGO {
  ngo_id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  registration_number: string;
  status: string;
  notes: string;
}

// const STATUS_OPTIONS = ["Active", "Inactive", "Suspended"];

export default function NGODetailPage() {
  const { t } = useLocale();
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";

  const { data, error, isLoading, mutate } = useSWR<{
    ngo: NGO;
    projects: Project[];
  }>(id ? `/api/ngos/${id}` : null, fetcher);

  // Add project modal
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit NGO modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editForm, setEditForm] = useState<Partial<NGO>>({});

  const [projectForm, setProjectForm] = useState({
    project_title: "",
    operation_area: "",
    woreda: "",
    area_of_intervention: "",
    aoi_category: AOI_CATEGORIES[0],
    start_date: "",
    end_date: "",
    total_budget: "",
    quota_women: "0",
    quota_children: "0",
    quota_elderly: "0",
    quota_disabled: "0",
    notes: "",
  });

  const computedQuotaTotal =
    (parseInt(projectForm.quota_women) || 0) +
    (parseInt(projectForm.quota_children) || 0) +
    (parseInt(projectForm.quota_elderly) || 0) +
    (parseInt(projectForm.quota_disabled) || 0);

  if (isLoading)
    return (
      <div className="p-8 text-center text-gray-500">{t("common.loading")}</div>
    );
  if (error || !data?.ngo)
    return (
      <div className="p-8 text-center text-red-500">{t("ngos.noResults")}</div>
    );

  const { ngo, projects } = data;

  const openEditModal = () => {
    setEditForm({ ...ngo });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/ngos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }
      toast.success(t("ngos.saveChanges"));
      setShowEditModal(false);
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleSuspend = async () => {
    if (!confirm(t("ngos.suspend"))) return;
    try {
      const res = await fetch(`/api/ngos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Suspended" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to suspend");
      toast.success(t("ngos.suspend"));
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...projectForm, ngo_id: id }),
      });
      if (!res.ok) throw new Error("Failed to create project");
      toast.success(t("ngos.addProject"));
      setShowModal(false);
      setProjectForm({
        project_title: "",
        operation_area: "",
        woreda: "",
        area_of_intervention: "",
        aoi_category: AOI_CATEGORIES[0],
        start_date: "",
        end_date: "",
        total_budget: "",
        quota_women: "0",
        quota_children: "0",
        quota_elderly: "0",
        quota_disabled: "0",
        notes: "",
      });
      mutate();
    } catch (err) {
      toast.error("Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = {
      Active: "bg-green-100 text-green-800",
      Inactive: "bg-gray-100 text-gray-800",
      Completed: "bg-blue-100 text-blue-800",
      Suspended: "bg-red-100 text-red-800",
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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">{ngo.name}</h1>
        </div>
        <div className="flex items-center gap-2 md:justify-start justify-center w-full md:w-auto">
        {statusBadge(ngo.status)}
        {isAdmin && (
          <>
            <button
              onClick={openEditModal}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Pencil size={15} /> {t("ngos.edit")}
            </button>
            <button
              onClick={handleSuspend}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Trash2 size={15} /> {t("ngos.suspend")}
            </button>
          </>
        )}
        </div>
    </div>

      <div className="bg-white rounded-xl shadow-md p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {t("ngos.contactPersonLabel")}
          </p>
          <p className="text-gray-800 mt-1">
            {ngo.contact_person || t("common.na")}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {t("ngos.phone")}
          </p>
          <p className="text-gray-800 mt-1">{ngo.phone || t("common.na")}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {t("ngos.email")}
          </p>
          <p className="text-gray-800 mt-1">{ngo.email || t("common.na")}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {t("ngos.registrationNumber")}
          </p>
          <p className="text-gray-800 mt-1">
            {ngo.registration_number || t("common.na")}
          </p>
        </div>
        <div className="md:col-span-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {t("ngos.notes")}
          </p>
          <p className="text-gray-800 mt-1 text-sm">
            {ngo.notes || t("common.noData")}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <h2 className="text-xl font-bold text-gray-800">
          {t("ngos.projects")} ({projects.length})
        </h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors flex items-center gap-2"
        >
          <Plus size={18} /> {t("ngos.addProject")}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
                <th className="text-left px-6 py-3 font-medium">
                  {t("projects.projectTitle")}
                </th>
                <th className="text-left px-6 py-3 font-medium">
                  {t("projects.aoiCategory")}
                </th>
                <th className="text-left px-6 py-3 font-medium">
                  {t("projects.dates")}
                </th>
                <th className="text-left px-6 py-3 font-medium">
                  {t("projects.status")}
                </th>
                <th className="text-left px-6 py-3 font-medium">
                  {t("projects.action")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
              {projects.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-500 italic"
                  >
                    {t("ngos.noProjects")}
                  </td>
                </tr>
              ) : (
                projects.map((p) => (
                  <tr
                    key={p.project_id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium">{p.project_title}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {p.aoi_category}
                    </td>
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                      {p.start_date} → {p.end_date || "Ongoing"}
                    </td>
                    <td className="px-6 py-4">{statusBadge(p.status)}</td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/projects/${p.project_id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                      >
                        {t("projects.view")} <ExternalLink size={14} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit NGO Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-800">
                {t("ngos.editNgo")}
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
                  {t("ngos.name")} *
                </label>
                <input
                  required
                  type="text"
                  value={editForm.name || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("ngos.contactPersonLabel")}
                </label>
                <input
                  type="text"
                  value={editForm.contact_person || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, contact_person: e.target.value })
                  }
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("ngos.phone")}
                  </label>
                  <input
                    type="text"
                    value={editForm.phone || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, phone: e.target.value })
                    }
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("ngos.email")}
                  </label>
                  <input
                    type="email"
                    value={editForm.email || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("ngos.registrationNumber")}
                </label>
                <input
                  type="text"
                  value={editForm.registration_number || ""}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      registration_number: e.target.value,
                    })
                  }
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("ngos.status")}
                </label>
                <select
                  value={editForm.status || "Active"}
                  onChange={(e) =>
                    setEditForm({ ...editForm, status: e.target.value })
                  }
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="Active">{t("statuses.active")}</option>
                  <option value="Inactive">{t("statuses.inactive")}</option>
                  <option value="Suspended">{t("statuses.suspended")}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("ngos.notes")}
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
                  {editSubmitting ? t("common.saving") : t("ngos.saveChanges")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-800">
                {t("projects.addProject")}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleProjectSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("projects.projectTitle")} *
                </label>
                <input
                  required
                  type="text"
                  value={projectForm.project_title}
                  onChange={(e) =>
                    setProjectForm({
                      ...projectForm,
                      project_title: e.target.value,
                    })
                  }
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("projects.aoiCategory")} *
                  </label>
                  <select
                    value={projectForm.aoi_category}
                    onChange={(e) =>
                      setProjectForm({
                        ...projectForm,
                        aoi_category: e.target.value,
                      })
                    }
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {AOI_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
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
                    value={projectForm.area_of_intervention}
                    onChange={(e) =>
                      setProjectForm({
                        ...projectForm,
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
                    value={projectForm.operation_area}
                    onChange={(e) =>
                      setProjectForm({
                        ...projectForm,
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
                    value={projectForm.woreda}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, woreda: e.target.value })
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
                    value={projectForm.start_date}
                    onChange={(e) =>
                      setProjectForm({
                        ...projectForm,
                        start_date: e.target.value,
                      })
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
                    value={projectForm.end_date}
                    onChange={(e) =>
                      setProjectForm({
                        ...projectForm,
                        end_date: e.target.value,
                      })
                    }
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("projects.totalBudget")}
                  </label>
                  <input
                    type="number"
                    value={projectForm.total_budget}
                    onChange={(e) =>
                      setProjectForm({
                        ...projectForm,
                        total_budget: e.target.value,
                      })
                    }
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div key="quota_women">
                  <label className="block text-xs font-medium text-gray-700 mb-1 capitalize">
                    {t("projects.quotaWomen")}
                  </label>
                  <input
                    type="number"
                    value={projectForm.quota_women}
                    onChange={(e) =>
                      setProjectForm({
                        ...projectForm,
                        quota_women: e.target.value,
                      })
                    }
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div key="quota_children">
                  <label className="block text-xs font-medium text-gray-700 mb-1 capitalize">
                    {t("projects.quotaChildren")}
                  </label>
                  <input
                    type="number"
                    value={projectForm.quota_children}
                    onChange={(e) =>
                      setProjectForm({
                        ...projectForm,
                        quota_children: e.target.value,
                      })
                    }
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div key="quota_elderly">
                  <label className="block text-xs font-medium text-gray-700 mb-1 capitalize">
                    {t("projects.quotaElderly")}
                  </label>
                  <input
                    type="number"
                    value={projectForm.quota_elderly}
                    onChange={(e) =>
                      setProjectForm({
                        ...projectForm,
                        quota_elderly: e.target.value,
                      })
                    }
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div key="quota_disabled">
                  <label className="block text-xs font-medium text-gray-700 mb-1 capitalize">
                    {t("projects.quotaDisabled")}
                  </label>
                  <input
                    type="number"
                    value={projectForm.quota_disabled}
                    onChange={(e) =>
                      setProjectForm({
                        ...projectForm,
                        quota_disabled: e.target.value,
                      })
                    }
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-blue-800">
                  {t("projects.autoQuota")}
                </span>
                <span className="text-xl font-bold text-blue-900">
                  {computedQuotaTotal}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("projects.notes")}
                </label>
                <textarea
                  rows={2}
                  value={projectForm.notes}
                  onChange={(e) =>
                    setProjectForm({ ...projectForm, notes: e.target.value })
                  }
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50"
                >
                  {submitting ? t("common.saving") : t("projects.addProject")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
