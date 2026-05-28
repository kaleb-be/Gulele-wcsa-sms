"use client";

import { useState } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { Plus, Check, X, Filter } from "lucide-react";
import { useSession } from "next-auth/react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Project {
  project_id: string;
  project_title: string;
  status: string;
}

interface QuotaRequest {
  request_id: string;
  project_id: string;
  project_title: string;
  requested_by: string;
  current_quota: string;
  requested_quota: string;
  reason: string;
  status: string;
  reviewed_by: string;
  request_date: string;
  review_date: string;
}

export default function QuotaRequestsPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";

  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: projectsData } = useSWR<Project[]>("/api/projects?status=Active", fetcher);
  const { data: requestsData, mutate } = useSWR<QuotaRequest[]>(
    `/api/quota_requests?${new URLSearchParams({
      ...(statusFilter && { status: statusFilter }),
    }).toString()}`,
    fetcher
  );

  const projects = Array.isArray(projectsData) ? projectsData : [];
  const requests = Array.isArray(requestsData) ? requestsData : [];

  const [form, setForm] = useState({
    project_id: "",
    requested_quota: "",
    reason: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.project_id || !form.requested_quota || !form.reason) {
      toast.error("Please fill all fields");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/quota_requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to submit request");
      toast.success("Quota request submitted");
      setShowModal(false);
      setForm({ project_id: "", requested_quota: "", reason: "" });
      mutate();
    } catch (err) {
      toast.error("Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveReject = async (id: string, newStatus: "Approved" | "Rejected") => {
    try {
      const res = await fetch(`/api/quota_requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success(`Request ${newStatus.toLowerCase()}`);
      mutate();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Quota Requests</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          Request Increase
        </button>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-600">Filter by status:</span>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
                <th className="text-left px-6 py-3 font-medium">Project</th>
                <th className="text-left px-6 py-3 font-medium">Current</th>
                <th className="text-left px-6 py-3 font-medium">Requested</th>
                <th className="text-left px-6 py-3 font-medium">Reason</th>
                <th className="text-left px-6 py-3 font-medium">By / Date</th>
                <th className="text-left px-6 py-3 font-medium">Status</th>
                <th className="text-left px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No requests found.</td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.request_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{r.project_title}</td>
                    <td className="px-6 py-4 text-gray-500">{r.current_quota}</td>
                    <td className="px-6 py-4 font-bold text-blue-700">{r.requested_quota}</td>
                    <td className="px-6 py-4 max-w-xs truncate" title={r.reason}>{r.reason}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium">{r.requested_by}</p>
                      <p className="text-[10px] text-gray-500 uppercase">{r.request_date}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.status === 'Approved' ? 'bg-green-100 text-green-800' :
                        r.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {isAdmin && r.status === 'Pending' && (
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleApproveReject(r.request_id, 'Approved')} className="p-1.5 hover:bg-green-50 rounded text-green-600" title="Approve">
                            <Check size={18} />
                          </button>
                          <button onClick={() => handleApproveReject(r.request_id, 'Rejected')} className="p-1.5 hover:bg-red-50 rounded text-red-600" title="Reject">
                            <X size={18} />
                          </button>
                        </div>
                      )}
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">Request Quota Increase</h2>
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
                  <option value="">Select Active Project</option>
                  {projects.map(p => <option key={p.project_id} value={p.project_id}>{p.project_title}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Requested Total Quota *</label>
                <input
                  required
                  type="number"
                  value={form.requested_quota}
                  onChange={(e) => setForm({ ...form, requested_quota: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Increase *</label>
                <textarea
                  required
                  rows={3}
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Explain why more slots are needed..."
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
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
