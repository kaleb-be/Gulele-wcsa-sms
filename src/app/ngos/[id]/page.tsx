"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, Plus, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useLocale } from "@/components/LocaleProvider";
import NgoForm from "@/components/forms/NgoForm";
import ProjectForm from "@/components/forms/ProjectForm";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const AOI_CATEGORIES = [
  "Food Support",
  "Medical Aid",
  "Education Support",
  "Disability Support",
  "Elderly Support",
  "Women Support",
  "Child Protection",
  "Emergency Support",
];
//   [
//   "Education",
//   "Economic Empowerment",
//   "Health and Nutrition",
//   "Psychosocial Support",
//   "Physical Rehabilitation",
//   "Family Empowerment",
//   "Child Development",
//   "Elderly Care",
//   "Disability Support",
//   "Legal Aid",
//   "Housing and Shelter",
// ];

interface Project {
  project_id: string;
  ngo_id: string;
  project_title: string;
  operation_area: string;
  woreda: string;
  area_of_intervention: string;
  aoi_category: string;
  start_date: string;
  end_date: string;
  total_budget: string;
  quota_total: string;
  status: string;
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

// const STATUS_OPTIONS = ["Active", "Inactive", "Suspended"];

export default function NGODetailPage() {
  const { t } = useLocale();
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";

  const { data, error, isLoading, mutate } = useSWR<{
    ngo: NGO;
    projects: Project[];
  }>(id ? `/api/ngos/${id}` : null, fetcher);

  // Add project modal
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit NGO modal
  const [showEditModal, setShowEditModal] = useState(false);

  if (isLoading)
    return (
      <div className="p-8 text-center text-gray-500">{t("common.loading")}</div>
    );
  if (error || !data?.ngo)
    return (
      <div className="p-8 text-center text-red-500">{t("ngos.noResults")}</div>
    );

  const { ngo, projects } = data;

  const openEditModal = () => {
    setShowEditModal(true);
  };

  const handleSuspend = async () => {
    if (!confirm(t("ngos.suspend"))) return;
    try {
      const res = await fetch(`/api/ngos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Suspended" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to suspend");
      toast.success(t("ngos.suspend"));
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = {
      Active: "bg-green-100 text-green-800",
      Inactive: "bg-gray-100 text-gray-800",
      Completed: "bg-blue-100 text-blue-800",
      Suspended: "bg-red-100 text-red-800",
    };
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[s] || "bg-gray-100 text-gray-800"}`}
      >
        {s}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">{ngo.name}</h1>
        </div>
        <div className="flex items-center gap-2 md:justify-start justify-center w-full md:w-auto">
        {statusBadge(ngo.status)}
        {isAdmin && (
          <>
            <button
              onClick={openEditModal}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Pencil size={15} /> {t("ngos.edit")}
            </button>
            <button
              onClick={handleSuspend}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Trash2 size={15} /> {t("ngos.suspend")}
            </button>
          </>
        )}
        </div>
    </div>

      <div className="bg-white rounded-xl shadow-md p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {t("ngos.contactPersonLabel")}
          </p>
          <p className="text-gray-800 mt-1">
            {ngo.contact_person || t("common.na")}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {t("ngos.phone")}
          </p>
          <p className="text-gray-800 mt-1">{ngo.phone || t("common.na")}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {t("ngos.email")}
          </p>
          <p className="text-gray-800 mt-1">{ngo.email || t("common.na")}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {t("ngos.registrationNumber")}
          </p>
          <p className="text-gray-800 mt-1">
            {ngo.registration_number || t("common.na")}
          </p>
        </div>
        <div className="md:col-span-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {t("ngos.notes")}
          </p>
          <p className="text-gray-800 mt-1 text-sm">
            {ngo.notes || t("common.noData")}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <h2 className="text-xl font-bold text-gray-800">
          {t("ngos.projects")} ({projects.length})
        </h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors flex items-center gap-2"
        >
          <Plus size={18} /> {t("ngos.addProject")}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
                <th className="text-left px-6 py-3 font-medium">
                  {t("projects.projectTitle")}
                </th>
                <th className="text-left px-6 py-3 font-medium">
                  {t("projects.aoiCategory")}
                </th>
                <th className="text-left px-6 py-3 font-medium">
                  {t("projects.dates")}
                </th>
                <th className="text-left px-6 py-3 font-medium">
                  {t("projects.status")}
                </th>
                <th className="text-left px-6 py-3 font-medium">
                  {t("projects.action")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
              {projects.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-500 italic"
                  >
                    {t("ngos.noProjects")}
                  </td>
                </tr>
              ) : (
                projects.map((p) => (
                  <tr
                    key={p.project_id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium">{p.project_title}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {p.aoi_category}
                    </td>
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                      {p.start_date} → {p.end_date || "Ongoing"}
                    </td>
                    <td className="px-6 py-4">{statusBadge(p.status)}</td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/projects/${p.project_id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                      >
                        {t("projects.view")} <ExternalLink size={14} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit NGO Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-800">
                {t("ngos.editNgo")}
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>
            <NgoForm
              initialValues={ngo}
              onSuccess={() => {
                setShowEditModal(false);
                mutate();
              }}
              onCancel={() => setShowEditModal(false)}
              submitLabel={t("ngos.saveChanges")}
            />
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-800">
                {t("projects.addProject")}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>
            <ProjectForm
              ngo_id={id}
              onSuccess={() => {
                setShowModal(false);
                mutate();
              }}
              onCancel={() => setShowModal(false)}
              submitLabel={t("projects.addProject")}
            />
          </div>
        </div>
      )}
    </div>
  );
}
