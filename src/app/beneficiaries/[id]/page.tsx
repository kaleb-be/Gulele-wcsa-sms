"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

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
  const id = params.id as string;

  const [beneficiary, setBeneficiary] = useState<Beneficiary | null>(null);
  const [records, setRecords] = useState<SupportRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/beneficiaries/${id}`).then((r) => r.json()),
      fetch(`/api/support-records?ben_id=${id}`).then((r) => r.json()),
    ]).then(([ben, recs]) => {
      setBeneficiary(ben);
      setRecords(recs);
      setLoading(false);
    });
  }, [id]);

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = {
      Active: "bg-green-100 text-green-800",
      Completed: "bg-blue-100 text-blue-800",
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
        <h1 className="text-2xl font-bold text-gray-800">
          Beneficiary Profile
        </h1>
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
            <span className="font-medium text-gray-800">
              {beneficiary.full_name}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block">Sex</span>
            <span className="font-medium text-gray-800">
              {beneficiary.sex}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block">Age</span>
            <span className="font-medium text-gray-800">
              {beneficiary.age}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block">Kebele</span>
            <span className="font-medium text-gray-800">
              {beneficiary.kebele}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block">Phone</span>
            <span className="font-medium text-gray-800">
              {beneficiary.phone}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block">ID Type</span>
            <span className="font-medium text-gray-800">
              {beneficiary.id_type}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block">ID Number</span>
            <span className="font-medium text-gray-800">
              {beneficiary.id_number}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block">Category</span>
            <span className="font-medium text-gray-800">
              {beneficiary.category}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block">Sub Details</span>
            <span className="font-medium text-gray-800">
              {beneficiary.sub_details}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block">Registered Date</span>
            <span className="font-medium text-gray-800">
              {beneficiary.registered_date}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block">Status</span>
            <span>{statusBadge(beneficiary.status)}</span>
          </div>
        </div>
        {beneficiary.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <span className="text-gray-500 block text-sm">Notes</span>
            <p className="text-gray-800 text-sm mt-1">{beneficiary.notes}</p>
          </div>
        )}
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
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
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
