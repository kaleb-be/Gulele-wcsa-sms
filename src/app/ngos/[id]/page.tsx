"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  Trash2,
  Printer,
  Pencil,
  X,
  Check,
  Search,
  Eye,
  Plus,
  ArrowLeft,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface NGO {
  ngo_id: string;
  name: string;
  focus_areas: string;
  contact_person: string;
  phone: string;
  email: string;
  registration_number: string;
  start_date: string;
  status: string;
  notes: string;
}

interface Service {
  service_id: string;
  service_name: string;
  description: string;
}

interface NGOService {
  ngo_id: string;
  service_id: string;
  capacity: string;
}

interface SupportRecord {
  record_id: string;
  ben_id: string;
  ngo_id: string;
  service_id: string;
  beneficiary_name: string;
  service_name: string;
  start_date: string;
  end_date: string;
  status: string;
}

export default function NGOProfile() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const {
    data: ngo,
    error: ngoError,
    isLoading: ngoLoading,
    mutate: mutateNgo,
  } = useSWR<NGO>(id ? `/api/ngos/${id}` : null, fetcher);

  const {
    data: ngoServicesData,
    isLoading: ngoServicesLoading,
    mutate: mutateNgoServices,
  } = useSWR<NGOService[]>(
    id ? `/api/ngo-services?ngo_id=${id}` : null,
    fetcher,
  );

  const {
    data: recordsData,
    isLoading: recordsLoading,
    mutate: mutateRecs,
  } = useSWR<SupportRecord[]>(
    id ? `/api/support-records?ngo_id=${id}` : null,
    fetcher,
  );

  const { data: servicesData } = useSWR<Service[]>(`/api/services`, fetcher);

  const ngoServices = Array.isArray(ngoServicesData) ? ngoServicesData : [];
  const records = Array.isArray(recordsData) ? recordsData : [];
  const services = Array.isArray(servicesData) ? servicesData : [];

  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<NGO>>({});
  const [editingCapacity, setEditingCapacity] = useState<{
    service_id: string;
    capacity: string;
  } | null>(null);
  const [updatingCapacity, setUpdatingCapacity] = useState(false);
  const [updatingRecordId, setUpdatingRecordId] = useState<string | null>(null);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [addingService, setAddingService] = useState(false);
  const [newServiceForm, setNewServiceForm] = useState({
    service_id: "",
    capacity: "",
  });

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        r.beneficiary_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.record_id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "All" || r.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [records, searchQuery, statusFilter]);

  const activeCountByService = useMemo(() => {
    const counts: Record<string, number> = {};
    records.forEach((r) => {
      if (r.status === "Active") {
        counts[r.service_id] = (counts[r.service_id] || 0) + 1;
      }
    });
    return counts;
  }, [records]);

  const startEdit = () => {
    if (ngo) {
      setEditForm(ngo);
      setEditing(true);
    }
  };

  const handleSaveNgo = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/ngos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error("Failed to save NGO");
      toast.success("NGO updated successfully");
      setEditing(false);
      mutateNgo();
    } catch (err) {
      toast.error("Failed to update NGO");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCapacity = async () => {
    if (!editingCapacity) return;
    setUpdatingCapacity(true);
    try {
      const res = await fetch(`/api/ngo-services`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ngo_id: id,
          service_id: editingCapacity.service_id,
          capacity: editingCapacity.capacity,
        }),
      });
      if (!res.ok) throw new Error("Failed to update capacity");
      toast.success("Capacity updated");
      setEditingCapacity(null);
      mutateNgoServices();
    } catch (err) {
      toast.error("Failed to update capacity");
    } finally {
      setUpdatingCapacity(false);
    }
  };

  const handleUpdateRecord = async (
    recordId: string,
    updates: Partial<SupportRecord>,
  ) => {
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

  const handleAddService = async () => {
    if (!newServiceForm.service_id) return;
    setAddingService(true);
    try {
      const res = await fetch(`/api/ngo-services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ngo_id: id,
          service_id: newServiceForm.service_id,
          capacity: newServiceForm.capacity,
        }),
      });
      if (!res.ok) throw new Error("Failed to add service");
      toast.success("Service added successfully");
      setShowAddServiceModal(false);
      setNewServiceForm({ service_id: "", capacity: "" });
      mutateNgoServices();
    } catch (err) {
      toast.error("Failed to add service");
    } finally {
      setAddingService(false);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (
      !confirm(
        `Are you sure you want to remove ${serviceName(serviceId)} from this NGO's offerings?`,
      )
    )
      return;
    try {
      const res = await fetch(
        `/api/ngo-services?ngo_id=${id}&service_id=${serviceId}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) throw new Error("Failed to delete service");
      toast.success("Service removed");
      mutateNgoServices();
    } catch (err) {
      toast.error("Failed to remove service");
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this NGO? This action cannot be undone.",
      )
    )
      return;

    setDeleting(true);
    const promise = fetch(`/api/ngos/${id}`, { method: "DELETE" }).then(
      async (res) => {
        if (!res.ok) throw new Error("Failed to delete");
        router.push("/ngos");
      },
    );

    toast
      .promise(promise, {
        loading: "Deleting NGO...",
        success: "NGO deleted successfully",
        error: "Failed to delete NGO",
      })
      .finally(() => setDeleting(false));
  };

  const serviceName = (serviceId: string) => {
    const svc = services.find((s) => s.service_id === serviceId);
    return svc ? svc.service_name : serviceId;
  };

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = {
      Active: "bg-green-100 text-green-800 border-green-200",
      Pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      Completed: "bg-blue-100 text-blue-800 border-blue-200",
      Inactive: "bg-gray-100 text-gray-800 border-gray-200",
      Suspended: "bg-red-100 text-red-800 border-red-200",
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

  if (ngoLoading) {
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

  if (!ngo || (ngo as any).error) {
    return <div className="text-center py-16 text-gray-500">NGO not found</div>;
  }

  return (
    <div>
      <div className="no-print flex flex-col sm:flex-row items-center sm:justify-between mb-6 gap-6">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Go back"
          >
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">
            NGO Profile: <span className="text-blue-600">{ngo.name}</span>
          </h1>
        </div>
        <div className="flex flex-row flex-wrap justify-center sm:justify-end gap-3 w-full sm:w-auto">
          {!editing ? (
            <>
              <button
                onClick={() => window.print()}
                className="flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <Printer size={16} />
                Print
              </button>
              <button
                onClick={startEdit}
                className="flex items-center justify-center gap-2 bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
              >
                <Pencil size={16} />
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <Trash2 size={16} />
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(false)}
                className="flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <X size={16} />
                Cancel
              </button>
              <button
                onClick={handleSaveNgo}
                disabled={saving}
                className="flex items-center justify-center gap-2 bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors disabled:opacity-50"
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
          <p className="text-sm text-gray-600 mt-1">NGO Profile</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Organization Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500 block">Name</span>
            {editing ? (
              <input
                type="text"
                value={editForm.name || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                className="w-full border border-gray-300 rounded px-2 py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <span className="font-medium text-gray-800">{ngo.name}</span>
            )}
          </div>
          <div>
            <span className="text-gray-500 block">Focus Areas</span>
            {editing ? (
              <input
                type="text"
                value={editForm.focus_areas || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, focus_areas: e.target.value })
                }
                className="w-full border border-gray-300 rounded px-2 py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <span className="font-medium text-gray-800">
                {ngo.focus_areas}
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
                <option value="Inactive">Inactive</option>
                <option value="Suspended">Suspended</option>
              </select>
            ) : (
              <span>{statusBadge(ngo.status)}</span>
            )}
          </div>
          <div>
            <span className="text-gray-500 block">Contact Person</span>
            {editing ? (
              <input
                type="text"
                value={editForm.contact_person || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, contact_person: e.target.value })
                }
                className="w-full border border-gray-300 rounded px-2 py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <span className="font-medium text-gray-800">
                {ngo.contact_person || "—"}
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
                {ngo.phone || "—"}
              </span>
            )}
          </div>
          <div>
            <span className="text-gray-500 block">Email</span>
            {editing ? (
              <input
                type="email"
                value={editForm.email || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
                className="w-full border border-gray-300 rounded px-2 py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <span className="font-medium text-gray-800">
                {ngo.email || "—"}
              </span>
            )}
          </div>
          <div>
            <span className="text-gray-500 block">Registration Number</span>
            {editing ? (
              <input
                type="text"
                value={editForm.registration_number || ""}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    registration_number: e.target.value,
                  })
                }
                className="w-full border border-gray-300 rounded px-2 py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <span className="font-medium text-gray-800">
                {ngo.registration_number || "—"}
              </span>
            )}
          </div>
          <div>
            <span className="text-gray-500 block">Start Date</span>
            {editing ? (
              <input
                type="date"
                value={editForm.start_date || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, start_date: e.target.value })
                }
                className="w-full border border-gray-300 rounded px-2 py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <span className="font-medium text-gray-800">
                {ngo.start_date || "—"}
              </span>
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
              placeholder="NGO notes..."
            />
          ) : (
            <p className="text-gray-800 text-sm mt-1 whitespace-pre-wrap">
              {ngo.notes || "No notes available."}
            </p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            Services Offered
          </h2>
          <button
            onClick={() => setShowAddServiceModal(true)}
            className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
          >
            <Plus size={16} />
            Add Service
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Service Name
                </th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">
                  Capacity
                </th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">
                  Currently Active
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {ngoServices.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No services offered.
                  </td>
                </tr>
              ) : (
                ngoServices.map((ns, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-gray-800 font-medium">
                      {serviceName(ns.service_id)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-center">
                      {editingCapacity?.service_id === ns.service_id ? (
                        <input
                          type="text"
                          value={editingCapacity.capacity}
                          onChange={(e) =>
                            setEditingCapacity({
                              ...editingCapacity,
                              capacity: e.target.value,
                            })
                          }
                          className="w-20 border border-gray-300 rounded px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      ) : (
                        ns.capacity || "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                          (activeCountByService[ns.service_id] || 0) >=
                            parseInt(ns.capacity || "0") && ns.capacity
                            ? "bg-red-100 text-red-800"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {activeCountByService[ns.service_id] || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editingCapacity?.service_id === ns.service_id ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={handleUpdateCapacity}
                            disabled={updatingCapacity}
                            className="text-green-600 hover:text-green-800"
                            title="Save"
                          >
                            <Check size={18} />
                          </button>
                          <button
                            onClick={() => setEditingCapacity(null)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Cancel"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() =>
                              setEditingCapacity({
                                service_id: ns.service_id,
                                capacity: ns.capacity,
                              })
                            }
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            <Pencil size={14} />
                            <span className="text-xs">Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteService(ns.service_id)}
                            className="text-red-600 hover:text-red-800 flex items-center gap-1"
                          >
                            <Trash2 size={14} />
                            <span className="text-xs">Remove</span>
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

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-800 whitespace-nowrap">
            Support Records
          </h2>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative flex-grow">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Terminated">Terminated</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Beneficiary Name
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Service
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Start Date
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
              {filteredRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    {searchQuery || statusFilter !== "All"
                      ? "No records match your filters."
                      : "No support records found."}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr
                    key={r.record_id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">
                        {r.beneficiary_name}
                      </div>
                      <div className="text-[10px] font-mono text-gray-400">
                        {r.record_id}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.service_name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.start_date}</td>
                    <td className="px-4 py-3">{statusBadge(r.status)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() =>
                            router.push(`/beneficiaries/${r.ben_id}`)
                          }
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="View Beneficiary"
                        >
                          <Eye size={16} />
                        </button>
                        {r.status === "Pending" && (
                          <button
                            onClick={() =>
                              handleUpdateRecord(r.record_id, {
                                status: "Active",
                              })
                            }
                            disabled={updatingRecordId === r.record_id}
                            className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            Activate
                          </button>
                        )}
                        {r.status === "Active" && (
                          <button
                            onClick={() => {
                              const endDate = new Date()
                                .toISOString()
                                .split("T")[0];
                              handleUpdateRecord(r.record_id, {
                                status: "Terminated",
                                end_date: endDate,
                              });
                            }}
                            disabled={updatingRecordId === r.record_id}
                            className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            Terminate
                          </button>
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

      {showAddServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-bold text-gray-800">
                Add Service to NGO
              </h3>
              <button
                onClick={() => setShowAddServiceModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Service
                </label>
                <select
                  value={newServiceForm.service_id}
                  onChange={(e) =>
                    setNewServiceForm({
                      ...newServiceForm,
                      service_id: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a service...</option>
                  {services
                    .filter(
                      (s) =>
                        !ngoServices.some(
                          (ns) => ns.service_id === s.service_id,
                        ),
                    )
                    .map((s) => (
                      <option key={s.service_id} value={s.service_id}>
                        {s.service_name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacity (Optional)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 50"
                  value={newServiceForm.capacity}
                  onChange={(e) =>
                    setNewServiceForm({
                      ...newServiceForm,
                      capacity: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowAddServiceModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddService}
                  disabled={addingService || !newServiceForm.service_id}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-900 rounded-lg hover:bg-blue-800 disabled:opacity-50"
                >
                  {addingService ? "Adding..." : "Add Service"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
