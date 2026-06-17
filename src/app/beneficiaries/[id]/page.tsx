"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";
import { Trash2, Printer, Pencil, X, Check, ArrowLeft } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";
import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import Image from "next/image";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Beneficiary {
  ben_id: string;
  full_name: string;
  sex: string;
  age: string;
  date_of_birth: string;
  kebele: string;
  woreda: string;
  house_no: string;
  phone: string;
  id_type: string;
  id_number: string;
  category: string;
  sub_details: string;
  family_size: string;
  occupation: string;
  average_income: string;
  registered_date: string;
  registered_by: string;
  status: string;
  notes: string;
  photo_url?: string;
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
  support_range: string;
}

export default function BeneficiaryProfile() {
  const { t } = useLocale();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

    const { data: beneficiary, error: benError, isLoading: benLoading, mutate: mutateBen } = useSWR<Beneficiary>(
    id ? `/api/beneficiaries/${id}` : null,
    fetcher
  );

  const { data: recordsData, error: recError, isLoading: recLoading, mutate: mutateRecs } = useSWR<Enrollment[]>(
    id ? `/api/enrollments?ben_id=${id}` : null,
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

  const handleUpdateRecord = async (enrollmentId: string, updates: Partial<Enrollment>) => {
    setUpdatingRecordId(enrollmentId);
    try {
      const res = await fetch(`/api/enrollments/${enrollmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update enrollment");
      toast.success(t("common.save"));
      mutateRecs();
    } catch (err) {
      toast.error(t("common.na"));
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
      loading: t("common.saving"),
      success: t("common.save"),
      error: t("common.na"),
    }).finally(() => setSaving(false));
  };

  const handleDelete = async () => {
    if (!confirm(t("common.back"))) return;

    setDeleting(true);
    const promise = fetch(`/api/beneficiaries/${id}`, { method: "DELETE" }).then(async (res) => {
      if (!res.ok) throw new Error("Failed to delete");
      router.push("/beneficiaries");
    });

    toast.promise(promise, {
      loading: t("common.loading"),
      success: t("common.save"),
      error: t("common.na"),
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
        {t("beneficiaries.noResults")}
        <Link href="/beneficiaries" className="text-blue-600 hover:underline ml-2">
          {t("common.back")}
        </Link>
      </div>
    );
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
            {t("beneficiaries.title")}: <span className="text-blue-600">{beneficiary.full_name}</span>
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
                {t("common.print")}
              </button>
              <button
                onClick={startEdit}
                className="flex items-center justify-center gap-2 bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
              >
                <Pencil size={16} />
                {t("common.edit")}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <Trash2 size={16} />
                {deleting ? t("common.saving") : t("ngos.suspend")}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(false)}
                className="flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <X size={16} />
                {t("common.cancel")}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center justify-center gap-2 bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors disabled:opacity-50"
              >
                <Check size={16} />
                {saving ? t("common.saving") : t("common.save")}
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

      <div className="bg-white rounded-xl shadow-md p-6 mb-8 print:shadow-none print:border print:border-gray-200">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-6 pb-6 border-b border-gray-100">
          <div className="flex-shrink-0">
            {editing ? (
              <ImageUpload
                value={editForm.photo_url || ""}
                onChange={(url) => setEditForm({ ...editForm, photo_url: url })}
              />
            ) : beneficiary.photo_url ? (
              <Image src={beneficiary.photo_url} alt={beneficiary.full_name} width={72} height={72} className="rounded-full object-cover border-2 border-blue-100 shadow-sm" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200 shadow-sm">
                <span className="text-2xl font-bold text-gray-400">
                  {beneficiary.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </span>
              </div>
            )}
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-xl font-bold text-gray-800">
              {beneficiary.full_name}
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              ID: {beneficiary.ben_id} • Registered on {beneficiary.registered_date}
            </p>
            <div className="mt-3">
              {statusBadge(beneficiary.status)}
            </div>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          {t("enroll.subtitle")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500 block">{t("registerForm.fullName")}</span>
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
            <span className="text-gray-500 block">{t("registerForm.sex")}</span>
            {editing ? (
              <select
                value={editForm.sex || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, sex: e.target.value })
                }
                className="w-full border border-gray-300 rounded px-2 py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Female">{t("registerForm.female")}</option>
                <option value="Male">{t("registerForm.male")}</option>
              </select>
            ) : (
              <span className="font-medium text-gray-800">
                {beneficiary.sex}
              </span>
            )}
          </div>
          <div>
            <span className="text-gray-500 block">{t("registerForm.age")}</span>
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
            <span className="text-gray-500 block">{t("registerForm.dateOfBirth")}</span>
            {editing ? (
              <input
                type="date"
                value={editForm.date_of_birth || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, date_of_birth: e.target.value })
                }
                className="w-full border border-gray-300 rounded px-2 py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <span className="font-medium text-gray-800">
                {beneficiary.date_of_birth || "—"}
              </span>
            )}
          </div>
          <div>
            <span className="text-gray-500 block">{t("registerForm.woreda")}</span>
            {editing ? (
              <input
                type="text"
                value={editForm.woreda || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, woreda: e.target.value })
                }
                className="w-full border border-gray-300 rounded px-2 py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <span className="font-medium text-gray-800">
                {beneficiary.woreda || "—"}
              </span>
            )}
          </div>
          <div>
            <span className="text-gray-500 block">{t("registerForm.kebele")}</span>
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
            <span className="text-gray-500 block">{t("registerForm.houseNo")}</span>
            {editing ? (
              <input
                type="text"
                value={editForm.house_no || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, house_no: e.target.value })
                }
                className="w-full border border-gray-300 rounded px-2 py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <span className="font-medium text-gray-800">
                {beneficiary.house_no || "—"}
              </span>
            )}
          </div>
          <div>
            <span className="text-gray-500 block">{t("registerForm.phone")}</span>
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
            <span className="text-gray-500 block">{t("registerForm.idType")}</span>
            {editing ? (
              <select
                value={editForm.id_type || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, id_type: e.target.value })
                }
                className="w-full border border-gray-300 rounded px-2 py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Kebele ID">{t("registerForm.kebeleId")}</option>
                <option value="Fayda">{t("registerForm.fayda")}</option>
              </select>
            ) : (
              <span className="font-medium text-gray-800">
                {beneficiary.id_type}
              </span>
            )}
          </div>
          <div>
            <span className="text-gray-500 block">{t("registerForm.idNumber")}</span>
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
            <span className="text-gray-500 block">{t("registerForm.category")}</span>
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
            <span className="text-gray-500 block">{t("common.status")}</span>
            {editing ? (
              <select
                value={editForm.status || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, status: e.target.value })
                }
                className="w-full border border-gray-300 rounded px-2 py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Active">{t("statuses.active")}</option>
                <option value="Completed">{t("statuses.completed")}</option>
                <option value="Cancelled">{t("statuses.cancelled")}</option>
              </select>
            ) : (
              <span>{statusBadge(beneficiary.status)}</span>
            )}
          </div>
          <div>
            <span className="text-gray-500 block">{t("registerForm.familySize")}</span>
            {editing ? (
              <input
                type="number"
                value={editForm.family_size || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, family_size: e.target.value })
                }
                className="w-full border border-gray-300 rounded px-2 py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <span className="font-medium text-gray-800">
                {beneficiary.family_size || "—"}
              </span>
            )}
          </div>
          <div>
            <span className="text-gray-500 block">{t("registerForm.occupation")}</span>
            {editing ? (
              <input
                type="text"
                value={editForm.occupation || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, occupation: e.target.value })
                }
                className="w-full border border-gray-300 rounded px-2 py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <span className="font-medium text-gray-800">
                {beneficiary.occupation || "—"}
              </span>
            )}
          </div>
          <div>
            <span className="text-gray-500 block">{t("registerForm.avgIncome")}</span>
            {editing ? (
              <input
                type="number"
                value={editForm.average_income || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, average_income: e.target.value })
                }
                className="w-full border border-gray-300 rounded px-2 py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <span className="font-medium text-gray-800">
                {beneficiary.average_income || "—"}
              </span>
            )}
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <span className="text-gray-500 block text-sm">{t("registerForm.notes")}</span>
          {editing ? (
            <textarea
              value={editForm.notes || ""}
              onChange={(e) =>
                setEditForm({ ...editForm, notes: e.target.value })
              }
              rows={3}
              className="w-full border border-gray-300 rounded px-2 py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder={t("registerForm.notes")}
            />
          ) : (
            <p className="text-gray-800 text-sm mt-1 whitespace-pre-wrap">
              {beneficiary.notes || t("common.noData")}
            </p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden print:shadow-none print:border print:border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 print:bg-white">
          <h2 className="text-lg font-semibold text-gray-800">
            {t("projects.enrollments")}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 print:bg-white">
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  {t("projects.projectTitle")}
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  {t("projects.ngoLabel")}
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  {t("projects.areaLabel")}
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  {t("projects.startDate")}
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  {t("projects.endDate")}
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  {t("common.status")}
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  {t("enroll.supportRange")}
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">
                  {t("ngos.action")}
                </th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    {t("projects.noEnrollments")}
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr
                    key={r.enrollment_id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-gray-800 font-medium">
                      {r.project_title}
                    </td>
                    <td className="px-4 py-3 text-gray-800">{r.ngo_name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.aoi_category}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.start_date}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.end_date || "—"}
                    </td>
                    <td className="px-4 py-3">{statusBadge(r.status)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.support_range ? r.support_range + " ETB" : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.status === "Active" && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              const endDate = new Date().toISOString().split("T")[0];
                              handleUpdateRecord(r.enrollment_id, { status: "Completed", end_date: endDate });
                            }}
                            disabled={updatingRecordId === r.enrollment_id}
                            className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded font-bold uppercase hover:bg-blue-700 disabled:opacity-50"
                          >
                            {t("statuses.completed")}
                          </button>
                          <button
                            onClick={() => {
                              const endDate = new Date().toISOString().split("T")[0];
                              handleUpdateRecord(r.enrollment_id, { status: "Cancelled", end_date: endDate });
                            }}
                            disabled={updatingRecordId === r.enrollment_id}
                            className="text-[10px] bg-red-600 text-white px-2 py-1 rounded font-bold uppercase hover:bg-red-700 disabled:opacity-50"
                          >
                            {t("statuses.cancelled")}
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
    </div>
  );
}
