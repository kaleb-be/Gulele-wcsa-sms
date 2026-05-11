"use client";

import { useState, useEffect } from "react";

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

export default function Dashboard() {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [ngos, setNgos] = useState<NGO[]>([]);
  const [records, setRecords] = useState<SupportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/beneficiaries").then((r) => r.json()),
      fetch("/api/ngos").then((r) => r.json()),
      fetch("/api/support-records").then((r) => r.json()),
    ]).then(([beneficiariesData, ngosData, recordsData]) => {
      setBeneficiaries(Array.isArray(beneficiariesData) ? beneficiariesData : []);
      setNgos(Array.isArray(ngosData) ? ngosData : []);
      setRecords(Array.isArray(recordsData) ? recordsData : []);
      setLoading(false);
    }).catch(() => {
      setBeneficiaries([]);
      setNgos([]);
      setRecords([]);
      setLoading(false);
    });
  }, []);

  const activeBeneficiaries = beneficiaries.filter(
    (b) => b.status === "Active"
  ).length;
  const activeNgos = ngos.filter((n) => n.status === "Active").length;
  const activeRecords = records.filter(
    (r) => r.status === "Active"
  ).length;

  const filteredRecords = records
    .filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          r.beneficiary_name?.toLowerCase().includes(q) ||
          r.ngo_name?.toLowerCase().includes(q) ||
          r.service_name?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .slice(-30)
    .reverse();

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      Active: "bg-green-100 text-green-800",
      Completed: "bg-blue-100 text-blue-800",
      Cancelled: "bg-red-100 text-red-800",
    };
    return (
      <span
        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
          colors[status] || "bg-gray-100 text-gray-800"
        }`}
      >
        {status}
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

  return (
    <div>
      <div className="no-print">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-600 text-white rounded-xl p-6 shadow-md">
            <p className="text-blue-100 text-sm font-medium uppercase tracking-wide">
              Active Beneficiaries
            </p>
            <p className="text-4xl font-bold mt-2">{activeBeneficiaries}</p>
          </div>
          <div className="bg-green-600 text-white rounded-xl p-6 shadow-md">
            <p className="text-green-100 text-sm font-medium uppercase tracking-wide">
              Active NGOs
            </p>
            <p className="text-4xl font-bold mt-2">{activeNgos}</p>
          </div>
          <div className="bg-purple-600 text-white rounded-xl p-6 shadow-md">
            <p className="text-purple-100 text-sm font-medium uppercase tracking-wide">
              Active Support Records
            </p>
            <p className="text-4xl font-bold mt-2">{activeRecords}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <input
            type="text"
            placeholder="Search by beneficiary, NGO, or service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 w-full max-w-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <button
            onClick={() => window.print()}
            className="ml-auto bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors"
          >
            Print
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Beneficiary
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  NGO
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
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No support records found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr
                    key={r.record_id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">{r.beneficiary_name}</td>
                    <td className="px-4 py-3">{r.ngo_name}</td>
                    <td className="px-4 py-3">{r.service_name}</td>
                    <td className="px-4 py-3">{r.start_date}</td>
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
