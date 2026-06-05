"use client";

import { useState } from "react";
import useSWR from "swr";
import { Printer, Search, Users, Home, ClipboardList } from "lucide-react";
import { useLocale } from "@/components/LocaleProvider";

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

interface Enrollment {
  enrollment_id: string;
  ben_id: string;
  project_id: string;
  ngo_id: string;
  aoi_category: string;
  start_date: string;
  end_date: string;
  status: string;
  enrolled_by: string;
  notes: string;
  project_title: string;
  ngo_name: string;
  beneficiary_name: string;
}

interface Project {
  project_id: string;
  status: string;
}

export default function Dashboard() {
  const { t } = useLocale();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: beneficiariesData, isLoading: benLoading } = useSWR<Beneficiary[]>("/api/beneficiaries", fetcher);
  const { data: ngosData, isLoading: ngosLoading } = useSWR<NGO[]>("/api/ngos", fetcher);
  const { data: recordsData, isLoading: recordsLoading } = useSWR<Enrollment[]>("/api/enrollments", fetcher);
  const { data: projectsData, isLoading: projectsLoading } = useSWR<Project[]>("/api/projects", fetcher);

  const beneficiaries = Array.isArray(beneficiariesData) ? beneficiariesData : [];
  const ngos = Array.isArray(ngosData) ? ngosData : [];
  const records = Array.isArray(recordsData) ? recordsData : [];
  const projects = Array.isArray(projectsData) ? projectsData : [];

  const loading = benLoading || ngosLoading || recordsLoading || projectsLoading;

  const activeBeneficiaries = beneficiaries.filter(
    (b) => b.status === "Active"
  ).length;
  const activeNgos = ngos.filter((n) => n.status === "Active").length;
  const activeEnrollments = records.filter(
    (r) => r.status === "Active"
  ).length;
  const activeProjects = projects.filter((p) => p.status === "Active").length;

  const filteredRecords = records
    .filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          r.beneficiary_name?.toLowerCase().includes(q) ||
          r.ngo_name?.toLowerCase().includes(q) ||
          r.project_title?.toLowerCase().includes(q) ||
          r.aoi_category?.toLowerCase().includes(q)
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
      <div className="max-w-7xl mx-auto animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
        <div className="h-10 bg-gray-200 rounded-lg w-full max-w-md mb-8"></div>
        <div className="bg-white rounded-xl shadow-md h-96"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="no-print">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-600 text-white rounded-xl p-6 shadow-md flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <Users size={24} />
            </div>
            <div>
              <p className="text-blue-100 text-sm font-medium uppercase tracking-wide">
                {t("dashboard.activeBeneficiaries")}
              </p>
              <p className="text-4xl font-bold">{activeBeneficiaries}</p>
            </div>
          </div>
          <div className="bg-green-600 text-white rounded-xl p-6 shadow-md flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <Home size={24} />
            </div>
            <div>
              <p className="text-green-100 text-sm font-medium uppercase tracking-wide">
                {t("dashboard.activeNgos")}
              </p>
              <p className="text-4xl font-bold">{activeNgos}</p>
            </div>
          </div>
          <div className="bg-purple-600 text-white rounded-xl p-6 shadow-md flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <ClipboardList size={24} />
            </div>
            <div>
              <p className="text-purple-100 text-sm font-medium uppercase tracking-wide">
                {t("dashboard.activeEnrollments")}
              </p>
              <p className="text-4xl font-bold">{activeEnrollments}</p>
            </div>
          </div>
          <div className="bg-orange-500 text-white rounded-xl p-6 shadow-md flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <ClipboardList size={24} />
            </div>
            <div>
              <p className="text-orange-100 text-sm font-medium uppercase tracking-wide">
                {t("dashboard.activeProjects")}
              </p>
              <p className="text-4xl font-bold">{activeProjects}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={t("dashboard.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg pl-10 pr-4 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t("dashboard.allStatuses")}</option>
            <option value="Active">{t("statuses.active")}</option>
            <option value="Completed">{t("statuses.completed")}</option>
            <option value="Cancelled">{t("statuses.cancelled")}</option>
          </select>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 ml-auto bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors"
          >
            <Printer size={18} />
            {t("dashboard.print")}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  {t("table.beneficiary")}
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  {t("table.projectTitle")}
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  {t("table.ngo")}
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  {t("table.aoiCategory")}
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  {t("table.startDate")}
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  {t("common.status")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    {t("dashboard.noRecords")}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, idx) => (
                  <tr
                    key={`${r.enrollment_id}-${idx}`}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">{r.beneficiary_name}</td>
                    <td className="px-4 py-3">{r.project_title}</td>
                    <td className="px-4 py-3">{r.ngo_name}</td>
                    <td className="px-4 py-3">{r.aoi_category}</td>
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
