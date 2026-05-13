"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";
import { Trash2, Printer, Pencil, X, Check, ArrowLeft } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Beneficiary {
  ben_id: string;
  full_name: string;
  sex: string;
  age: string;
  kebele: string;
  phone: string;
  id_type: string;
  id_number: string;
  category: string;
  sub_details: string;
  registered_date: string;
  registered_by: string;
  status: string;
  notes: string;
}

interface SupportRecord {
  record_id: string;
  ben_id: string;
  ngo_id: string;
  service_id: string;
  start_date: string;
  end_date: string;
  status: string;
  assigned_by: string;
  notes: string;
  ngo_name: string;
  service_name: string;
  beneficiary_name: string;
}

export default function BeneficiaryProfile() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

    const { data: beneficiary, error: benError, isLoading: benLoading, mutate: mutateBen } = useSWR<Beneficiary>(
    id ? `/api/beneficiaries/${id}` : null,
    fetcher
  );

  const { data: recordsData, error: recError, isLoading: recLoading, mutate: mutateRecs } = useSWR<SupportRecord[]>(
    id ? `/api/support-records?ben_id=${id}` : null,
    fetcher
  );

  const records = Array.isArray(recordsData) ? recordsData : [];
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Beneficiary>>({});
  const [updatingRecordId, setUpdatingRecordId] = useState<string | null>(null);

  const startEdit = () => {
    if (beneficiary) {
      setEditForm(beneficiary);
      setEditing(true);
    }
  };

  const handleUpdateRecord = async (recordId: string, updates: Partial<SupportRecord>) => {
    setUpdatingRecordId(recordId);
    try {
      const res = await fetch(`/api/support-records/${recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update record");
      toast.success("Support record updated");
      mutateRecs();
    } catch (err) {
      toast.error("Failed to update record");
    } finally {
      setUpdatingRecordId(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const promise = fetch(`/api/beneficiaries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    }).then(async (res) => {
      if (!res.ok) throw new Error("Failed to save");
      setEditing(false);
      mutateBen();
    });

    toast.promise(promise, {
      loading: "Saving changes...",
      success: "Changes saved successfully",
      error: "Failed to save changes",
    }).finally(() => setSaving(false));
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this beneficiary? This action cannot be undone.")) return;

    setDeleting(true);
    const promise = fetch(`/api/beneficiaries/${id}`, { method: "DELETE" }).then(async (res) => {
      if (!res.ok) throw new Error("Failed to delete");
      router.push("/beneficiaries");
    });

    toast.promise(promise, {
      loading: "Deleting beneficiary...",
      success: "Beneficiary deleted successfully",
      error: "Failed to delete beneficiary",
    }).finally(() => setDeleting(false));
  };

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = {
      Active: "bg-green-100 text-green-800 border-green-200",
      Pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      Completed: "bg-blue-100 text-blue-800 border-blue-200",
      Cancelled: "bg-red-100 text-red-800 border-red-200",
      Terminated: "bg-orange-100 text-orange-800 border-orange-200",
    };
    return (
      <span
        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
          colors[s] || "bg-gray-100 text-gray-800 border-gray-200"
        }`}
      >
        {s}
      </span>
    );
  };

  if (benLoading) {
    return (
      <div className="max-w-4xl mx-auto animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i}>
                <div className="h-3 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!beneficiary || (beneficiary as any).error) {
    return (
      <div className="text-center py-16 text-gray-500">
        Beneficiary not found
      </div>
    );
  }

  return (
    <div>
      <div className="no-print flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Go back"
          >
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">
            Beneficiary Profile: <span className="text-blue-600">{beneficiary.full_name}</span>
          </h1>
        </div>
        <div className="flex gap-3">
          {!editing ? (
            <>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <Printer size={16} />
                Print
              </button>
              <button
                onClick={startEdit}
                className="flex items-center gap-2 bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
              >
                <Pencil size={16} />
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <Trash2 size={16} />
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(false)}
                className="flex items-center gap-2 bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <X size={16} />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors disabled:opacity-50"
              >
                <Check size={16} />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="print-area">
        <div className="text-center mb-6 pb-4 border-b-2 border-gray-300">
          <h2 className="text-lg font-bold text-gray-900">
            Women, Children and Social Affairs Office — Gullele Sub-City
          </h2>
          <p className="text-sm text-gray-600 mt-1">Beneficiary Profile</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Personal Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500 block">Full Name</span>
            {editing ? (
              <input
                type="text"
                value={editForm.full_name || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, full_name: e.target.value })
                }
                className="w-full border border-gray-300 rounded px-2 py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <span className="font-medium text-gray-800">
                {beneficiary.full_name}
              </span>
            )}
          </div>
          <div>
            <span className="text-gray-500 block">Sex</span>
            {editing ? (
              <select
                value={editForm.sex || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, sex: e.target.value })
                }
                className="w-full border border-gray-300 rounded px-2 py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
              </select>
            ) : (
              <span className="font-medium text-gray-800">
                {beneficiary.sex}
              </span>
            )}
          </div>
          <div>
            <span className="text-gray-500 block">Age</span>
            {editing ? (
              <input
                type="number"
                value={editForm.age || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, age: e.target.value })
                }
                className="w-full border border-gray-300 rounded px-2 py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <span className="font-medium text-gray-800">
                {beneficiary.age}
              </span>
            )}
          </div>
          <div>
            <span className="text-gray-500 block">Kebele</span>
            {editing ? (
              <input
                type="text"
                value={editForm.kebele || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, kebele: e.target.value })
                }
                className="w-full border border-gray-300 rounded px-2 py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <span className="font-medium text-gray-800">
                {beneficiary.kebele}
              </span>
            )}
          </div>
          <div>
            <span className="text-gray-500 block">Phone</span>
            {editing ? (
              <input
                type="text"
                value={editForm.phone || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, phone: e.target.value })
                }
                className="w-full border border-gray-300 rounded px-2 py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <span className="font-medium text-gray-800">
                {beneficiary.phone}
              </span>
            )}
          </div>
          <div>
            <span className="text-gray-500 block">ID Type</span>
            {editing ? (
              <select
                value={editForm.id_type || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, id_type: e.target.value })
                }
                className="w-full border border-gray-300 rounded px-2 py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Kebele ID">Kebele ID</option>
                <option value="Fayda">Fayda</option>
                <option value="Passport">Passport</option>
                <option value="Other">Other</option>
              </select>
            ) : (
              <span className="font-medium text-gray-800">
                {beneficiary.id_type}
              </span>
            )}
          </div>
          <div>
            <span className="text-gray-500 block">ID Number</span>
            {editing ? (
              <input
                type="text"
                value={editForm.id_number || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, id_number: e.target.value })
                }
                className="w-full border border-gray-300 rounded px-2 py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <span className="font-medium text-gray-800">
                {beneficiary.id_number}
              </span>
            )}
          </div>
          <div>
            <span className="text-gray-500 block">Category</span>
            {editing ? (
              <select
                value={editForm.category || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, category: e.target.value })
                }
                className="w-full border border-gray-300 rounded px-2 py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Women with children">Women with children</option>
                <option value="Disabled">Disabled</option>
                <option value="Elderly">Elderly</option>
                <option value="Other">Other</option>
              </select>
            ) : (
              <span className="font-medium text-gray-800">
                {beneficiary.category}
              </span>
            )}
          </div>
          <div>
            <span className="text-gray-500 block">Status</span>
            {editing ? (
              <select
                value={editForm.status || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, status: e.target.value })
                }
                className="w-full border border-gray-300 rounded px-2 py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            ) : (
              <span>{statusBadge(beneficiary.status)}</span>
            )}
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <span className="text-gray-500 block text-sm">Notes</span>
          {editing ? (
            <textarea
              value={editForm.notes || ""}
              onChange={(e) =>
                setEditForm({ ...editForm, notes: e.target.value })
              }
              rows={3}
              className="w-full border border-gray-300 rounded px-2 py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Beneficiary notes..."
            />
          ) : (
            <p className="text-gray-800 text-sm mt-1 whitespace-pre-wrap">
              {beneficiary.notes || "No notes available."}
            </p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            Support Records
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Record ID
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  NGO Name
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Service
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Start Date
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  End Date
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Status
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No support records found.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr
                    key={r.record_id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {r.record_id}
                    </td>
                    <td className="px-4 py-3 text-gray-800">{r.ngo_name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.service_name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.start_date}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.end_date || "—"}
                    </td>
                    <td className="px-4 py-3">{statusBadge(r.status)}</td>
                    <td className="px-4 py-3 text-right">
                      {r.status === "Pending" && (
                        <button
                          onClick={() => handleUpdateRecord(r.record_id, { status: "Active" })}
                          disabled={updatingRecordId === r.record_id}
                          className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          Activate
                        </button>
                      )}
                      {r.status === "Active" && (
                        <button
                          onClick={() => {
                            const endDate = new Date().toISOString().split("T")[0];
                            handleUpdateRecord(r.record_id, { status: "Terminated", end_date: endDate });
                          }}
                          disabled={updatingRecordId === r.record_id}
                          className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          Terminate
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
