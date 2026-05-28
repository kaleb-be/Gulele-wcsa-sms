"use client";

import { useState } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { Search, Plus, Filter, Check, X, Receipt } from "lucide-react";
import { useSession } from "next-auth/react";
import ImageUpload from "@/components/ImageUpload";
import ProjectSearchSelect from "@/components/ProjectSearchSelect";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Project {
  project_id: string;
  project_title: string;
}

interface BudgetRecord {
  budget_id: string;
  project_id: string;
  project_title: string;
  ngo_id: string;
  record_type: string;
  amount: string;
  description: string;
  receipt_url: string;
  date: string;
  recorded_by: string;
  approved_by: string;
  approval_status: string;
  notes: string;
}

export default function BudgetPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";

  const [projectId, setProjectId] = useState("");
  const [status, setStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: projectsData } = useSWR<Project[]>("/api/projects", fetcher);
  const { data: budgetData, mutate } = useSWR<BudgetRecord[]>(
    `/api/budget_records?${new URLSearchParams({
      ...(projectId && { project_id: projectId }),
      ...(status && { approval_status: status }),
    }).toString()}`,
    fetcher
  );

  const projects = Array.isArray(projectsData) ? projectsData : [];
  const records = Array.isArray(budgetData) ? budgetData : [];

  const [form, setForm] = useState({
    project_id: "",
    record_type: "Expense",
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    receipt_url: "",
    notes: "",
  });

  const totalAllocated = records
    .filter(r => r.record_type === "Allocation" && r.approval_status === "Approved")
    .reduce((sum, r) => sum + parseFloat(r.amount || "0"), 0);
  
  const totalApprovedSpend = records
    .filter(r => r.record_type !== "Allocation" && r.approval_status === "Approved")
    .reduce((sum, r) => sum + parseFloat(r.amount || "0"), 0);

  const totalPending = records
    .filter(r => r.approval_status === "Pending")
    .reduce((sum, r) => sum + parseFloat(r.amount || "0"), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.project_id || !form.amount || !form.description) {
      toast.error("Please fill all required fields");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/budget_records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to create record");
      toast.success("Budget record added");
      setShowModal(false);
      setForm({
        project_id: "",
        record_type: "Expense",
        amount: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
        receipt_url: "",
        notes: "",
      });
      mutate();
    } catch (err) {
      toast.error("Failed to add record");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveReject = async (id: string, newStatus: "Approved" | "Rejected") => {
    try {
      const res = await fetch(`/api/budget_records/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approval_status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success(`Record ${newStatus.toLowerCase()}`);
      mutate();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Budget Management</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          Add Record
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500">
          <p className="text-xs font-bold text-gray-500 uppercase">Total Allocated</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{totalAllocated.toLocaleString()} ETB</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500">
          <p className="text-xs font-bold text-gray-500 uppercase">Approved Spend</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{totalApprovedSpend.toLocaleString()} ETB</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-yellow-500">
          <p className="text-xs font-bold text-gray-500 uppercase">Pending Approval</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{totalPending.toLocaleString()} ETB</p>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-600">Filters:</span>
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
        <ProjectSearchSelect projects={projects} projectId={projectId} setProjectId={setProjectId}/>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
                <th className="text-left px-6 py-3 font-medium">Project</th>
                <th className="text-left px-6 py-3 font-medium">Type</th>
                <th className="text-left px-6 py-3 font-medium">Amount</th>
                <th className="text-left px-6 py-3 font-medium">Description</th>
                <th className="text-left px-6 py-3 font-medium">Date</th>
                <th className="text-left px-6 py-3 font-medium">Status</th>
                <th className="text-left px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No records found.</td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.budget_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{r.project_title}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        r.record_type === 'Allocation' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {r.record_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold">{parseFloat(r.amount).toLocaleString()}</td>
                    <td className="px-6 py-4 max-w-xs truncate" title={r.description}>{r.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{r.date}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.approval_status === 'Approved' ? 'bg-green-100 text-green-800' :
                        r.approval_status === 'Rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {r.approval_status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {r.receipt_url && (
                          <a href={r.receipt_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-blue-600 flex items-center gap-1">
                            <div><Receipt size={20}/></div>
                            <div className={"font-semibold"}>View Receipt</div>
                          </a>
                        )}
                        {isAdmin && r.approval_status === 'Pending' && (
                          <>
                            <button onClick={() => handleApproveReject(r.budget_id, 'Approved')} className="p-1 hover:bg-green-50 rounded text-green-600">
                              <Check size={16} />
                            </button>
                            <button onClick={() => handleApproveReject(r.budget_id, 'Rejected')} className="p-1 hover:bg-red-50 rounded text-red-600">
                              <X size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">Add Budget Record</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project *</label>
                <select
                  required
                  value={form.project_id}
                  onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Project</option>
                  {projects.map(p => <option key={p.project_id} value={p.project_id}>{p.project_title}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select
                    value={form.record_type}
                    onChange={(e) => setForm({ ...form, record_type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Allocation">Allocation</option>
                    <option value="Expense">Expense</option>
                    <option value="Reimbursement">Reimbursement</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (ETB) *</label>
                  <input
                    required
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <input
                  required
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  required
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Image</label>
                <ImageUpload
                  value={form.receipt_url}
                  onChange={(url) => setForm({ ...form, receipt_url: url })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Adding..." : "Add Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
