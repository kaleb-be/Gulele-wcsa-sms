"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";
import { Trash2, Printer } from "lucide-react";

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

  const { data: ngo, error: ngoError, isLoading: ngoLoading } = useSWR<NGO>(
    id ? `/api/ngos/${id}` : null,
    fetcher
  );

  const { data: ngoServicesData, isLoading: ngoServicesLoading } = useSWR<NGOService[]>(
    id ? `/api/ngo-services?ngo_id=${id}` : null,
    fetcher
  );

  const { data: recordsData, isLoading: recordsLoading } = useSWR<SupportRecord[]>(
    id ? `/api/support-records?ngo_id=${id}` : null,
    fetcher
  );

  const { data: servicesData } = useSWR<Service[]>(`/api/services`, fetcher);

  const ngoServices = Array.isArray(ngoServicesData) ? ngoServicesData : [];
  const records = Array.isArray(recordsData) ? recordsData : [];
  const services = Array.isArray(servicesData) ? servicesData : [];
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this NGO? This action cannot be undone.")) return;

    setDeleting(true);
    const promise = fetch(`/api/ngos/${id}`, { method: "DELETE" }).then(async (res) => {
      if (!res.ok) throw new Error("Failed to delete");
      router.push("/ngos");
    });

    toast.promise(promise, {
      loading: "Deleting NGO...",
      success: "NGO deleted successfully",
      error: "Failed to delete NGO",
    }).finally(() => setDeleting(false));
  };

  const serviceName = (serviceId: string) => {
    const svc = services.find((s) => s.service_id === serviceId);
    return svc ? svc.service_name : serviceId;
  };

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = {
      Active: "bg-green-100 text-green-800",
      Completed: "bg-blue-100 text-blue-800",
      Inactive: "bg-gray-100 text-gray-800",
      Suspended: "bg-red-100 text-red-800",
      Cancelled: "bg-red-100 text-red-800",
    };
    return (
      <span
        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
          colors[s] || "bg-gray-100 text-gray-800"
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
    return (
      <div className="text-center py-16 text-gray-500">NGO not found</div>
    );
  }

  return (
    <div>
      <div className="no-print flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">NGO Profile</h1>
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Printer size={16} />
            Print
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            <Trash2 size={16} />
            {deleting ? "Deleting..." : "Delete"}
          </button>
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
            <span className="font-medium text-gray-800">{ngo.name}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Focus Areas</span>
            <span className="font-medium text-gray-800">
              {ngo.focus_areas}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block">Status</span>
            <span>{statusBadge(ngo.status)}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Contact Person</span>
            <span className="font-medium text-gray-800">
              {ngo.contact_person || "—"}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block">Phone</span>
            <span className="font-medium text-gray-800">
              {ngo.phone || "—"}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block">Email</span>
            <span className="font-medium text-gray-800">
              {ngo.email || "—"}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block">Registration Number</span>
            <span className="font-medium text-gray-800">
              {ngo.registration_number || "—"}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block">Start Date</span>
            <span className="font-medium text-gray-800">
              {ngo.start_date || "—"}
            </span>
          </div>
        </div>
        {ngo.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <span className="text-gray-500 block text-sm">Notes</span>
            <p className="text-gray-800 text-sm mt-1">{ngo.notes}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            Services Offered
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Service Name
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Capacity
                </th>
              </tr>
            </thead>
            <tbody>
              {ngoServices.length === 0 ? (
                <tr>
                  <td
                    colSpan={2}
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
                    <td className="px-4 py-3 text-gray-800">
                      {serviceName(ns.service_id)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {ns.capacity || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
                  Beneficiary Name
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
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
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
                    <td className="px-4 py-3 text-gray-800">
                      {r.beneficiary_name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.service_name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.start_date}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.end_date || "—"}
                    </td>
                    <td className="px-4 py-3">{statusBadge(r.status)}</td>
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
