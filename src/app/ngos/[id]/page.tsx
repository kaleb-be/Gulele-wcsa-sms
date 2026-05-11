"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

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
  const id = params.id as string;

  const [ngo, setNgo] = useState<NGO | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [ngoServices, setNgoServices] = useState<NGOService[]>([]);
  const [records, setRecords] = useState<SupportRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/ngos/${id}`).then((r) => r.json()),
      fetch(`/api/ngo-services?ngo_id=${id}`).then((r) => r.json()),
      fetch(`/api/support-records?ngo_id=${id}`).then((r) => r.json()),
      fetch(`/api/services`).then((r) => r.json()),
    ]).then(([ngoData, ngoSvcData, recsData, svcData]) => {
      setNgo(ngoData);
      setNgoServices(ngoSvcData);
      setRecords(recsData);
      setServices(svcData);
      setLoading(false);
    });
  }, [id]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900" />
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
        <button
          onClick={() => window.print()}
          className="bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors"
        >
          Print
        </button>
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
