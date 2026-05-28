"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, Plus, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";

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

const STATUS_OPTIONS = ["Active", "Inactive", "Suspended"];

export default function NGODetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";

  const { data, error, isLoading, mutate } = useSWR<{ ngo: NGO; projects: Project[] }>(
    id ? `/api/ngos/${id}` : null,
    fetcher
  );

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

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading NGO details...</div>;
  if (error || !data?.ngo) return <div className="p-8 text-center text-red-500">Failed to load NGO.</div>;

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
      toast.success("NGO updated successfully");
      setShowEditModal(false);
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleSuspend = async () => {
    if (!confirm(`Suspend "${ngo.name}"? This will mark them as Suspended. No active projects should exist.`)) return;
    try {
      const res = await fetch(`/api/ngos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Suspended" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to suspend");
      toast.success("NGO suspended");
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
      toast.success("Project created successfully");
      setShowModal(false);
      setProjectForm({
        project_title: "", operation_area: "", woreda: "",
        area_of_intervention: "", aoi_category: AOI_CATEGORIES[0],
        start_date: "", end_date: "", total_budget: "",
        quota_women: "0", quota_children: "0", quota_elderly: "0",
        quota_disabled: "0", notes: "",
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
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[s] || "bg-gray-100 text-gray-800"}`}>
        {s}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">{ngo.name}</h1>
          {statusBadge(ngo.status)}
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={openEditModal}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Pencil size={15} /> Edit
            </button>
            <button
              onClick={handleSuspend}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Trash2 size={15} /> Suspend
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact Person</p>
          <p className="text-gray-800 mt-1">{ngo.contact_person || "N/A"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</p>
          <p className="text-gray-800 mt-1">{ngo.phone || "N/A"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</p>
          <p className="text-gray-800 mt-1">{ngo.email || "N/A"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Registration #</p>
          <p className="text-gray-800 mt-1">{ngo.registration_number || "N/A"}</p>
        </div>
        <div className="md:col-span-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</p>
          <p className="text-gray-800 mt-1 text-sm">{ngo.notes || "No notes."}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <h2 className="text-xl font-bold text-gray-800">Projects ({projects.length})</h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors flex items-center gap-2"
        >
          <Plus size={18} /> Add Project
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
              <th className="text-left px-6 py-3 font-medium">Title</th>
              <th className="text-left px-6 py-3 font-medium">AOI Category</th>
              <th className="text-left px-6 py-3 font-medium">Dates</th>
              <th className="text-left px-6 py-3 font-medium">Status</th>
              <th className="text-left px-6 py-3 font-medium">Action</th>
            </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
            {projects.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500 italic">No projects found for this NGO.</td>
              </tr>
            ) : (
              projects.map((p) => (
                <tr key={p.project_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium">{p.project_title}</td>
                  <td className="px-6 py-4 text-gray-600">{p.aoi_category}</td>
                  <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                    {p.start_date} → {p.end_date || "Ongoing"}
                  </td>
                  <td className="px-6 py-4">{statusBadge(p.status)}</td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/projects/${p.project_id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                    >
                      View <ExternalLink size={14} />
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
              <h2 className="text-lg font-bold text-gray-800">Edit NGO</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  required
                  type="text"
                  value={editForm.name || ""}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                <input
                  type="text"
                  value={editForm.contact_person || ""}
                  onChange={(e) => setEditForm({ ...editForm, contact_person: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editForm.phone || ""}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email || ""}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number</label>
                <input
                  type="text"
                  value={editForm.registration_number || ""}
                  onChange={(e) => setEditForm({ ...editForm, registration_number: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editForm.status || "Active"}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={editForm.notes || ""}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
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

      {/* Add Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-800">Add New Project</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleProjectSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Title *</label>
                <input required type="text" value={projectForm.project_title}
                       onChange={(e) => setProjectForm({ ...projectForm, project_title: e.target.value })}
                       className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">AOI Category *</label>
                  <select value={projectForm.aoi_category}
                          onChange={(e) => setProjectForm({ ...projectForm, aoi_category: e.target.value })}
                          className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    {AOI_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Area of Intervention (description)</label>
                  <input type="text" value={projectForm.area_of_intervention}
                         onChange={(e) => setProjectForm({ ...projectForm, area_of_intervention: e.target.value })}
                         className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Operation Area</label>
                  <input type="text" value={projectForm.operation_area}
                         onChange={(e) => setProjectForm({ ...projectForm, operation_area: e.target.value })}
                         className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Woreda</label>
                  <input type="text" value={projectForm.woreda}
                         onChange={(e) => setProjectForm({ ...projectForm, woreda: e.target.value })}
                         className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input type="date" value={projectForm.start_date}
                         onChange={(e) => setProjectForm({ ...projectForm, start_date: e.target.value })}
                         className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input type="date" value={projectForm.end_date}
                         onChange={(e) => setProjectForm({ ...projectForm, end_date: e.target.value })}
                         className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Budget (ETB)</label>
                  <input type="number" value={projectForm.total_budget}
                         onChange={(e) => setProjectForm({ ...projectForm, total_budget: e.target.value })}
                         className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>

              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {["quota_women", "quota_children", "quota_elderly", "quota_disabled"].map((field) => (
                  <div key={field}>
                    <label className="block text-xs font-medium text-gray-700 mb-1 capitalize">
                      {field.replace("quota_", "Quota ")}
                    </label>
                    <input type="number" value={(projectForm as any)[field]}
                           onChange={(e) => setProjectForm({ ...projectForm, [field]: e.target.value })}
                           className="border border-gray-300 rounded-lg px-3 py-2 w-full text-xs focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                ))}
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-blue-800">Total Quota</span>
                <span className="text-xl font-bold text-blue-900">{computedQuotaTotal}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea rows={2} value={projectForm.notes}
                          onChange={(e) => setProjectForm({ ...projectForm, notes: e.target.value })}
                          className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50">
                  {submitting ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}