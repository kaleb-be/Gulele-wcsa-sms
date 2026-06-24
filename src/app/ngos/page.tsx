"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import toast from "react-hot-toast";
import { Search } from "lucide-react";
import { useLocale } from "@/components/LocaleProvider";
import NgoForm from "@/components/forms/NgoForm";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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

export default function NGOsPage() {
  const { t } = useLocale();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status) params.set("status", status);

  const { data: ngosData, error, isLoading, mutate } = useSWR<NGO[]>(
    `/api/ngos?${params.toString()}`,
    fetcher
  );

  const ngos = Array.isArray(ngosData) ? ngosData : [];

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = {
      Active: "bg-green-100 text-green-800",
      Inactive: "bg-gray-100 text-gray-800",
      Suspended: "bg-red-100 text-red-800",
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{t("ngos.title")}</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors"
        >
          {t("ngos.add")}
        </button>
      </div>

      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder={t("ngos.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg pl-10 pr-4 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t("ngos.allStatuses")}</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  {t("ngos.name")}
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  {t("ngos.contactPerson")}
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  {t("ngos.status")}
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  {t("ngos.action")}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse border-b border-gray-100">
                    <td className="px-4 py-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                    </td>
                  </tr>
                ))
              ) : ngos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    {t("ngos.noResults")}
                  </td>
                </tr>
              ) : (
                ngos.map((ngo) => (
                  <tr
                    key={ngo.ngo_id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {ngo.name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {ngo.contact_person}
                    </td>
                    <td className="px-4 py-3">{statusBadge(ngo.status)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/ngos/${ngo.ngo_id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        {t("ngos.view")}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4">
            <div className="flex items-center justify-between px-6 pt-6 pb-2 border-b">
              <h2 className="text-lg font-bold text-gray-800">{t("ngos.add")}</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <NgoForm 
              onSuccess={() => {
                setShowModal(false);
                mutate();
              }}
              onCancel={() => setShowModal(false)}
              submitLabel={t("ngos.add")}
            />
          </div>
        </div>
      )}
    </div>
  );
}
