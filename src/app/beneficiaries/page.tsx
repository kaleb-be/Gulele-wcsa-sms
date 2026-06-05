"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import useSWR from "swr";
import toast from "react-hot-toast";
import { Search } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";
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
  photo_url?: string;
}

const CATEGORIES = ["Women", "Disabled", "Elderly", "Child", "Other"];
const SUB_LABELS: Record<string, string> = {
  Women: "Number of children",
  Disabled: "Disability type",
  Elderly: "Age details",
  Child: "Child details",
  Other: "Sub details",
};

export default function BeneficiariesPage() {
  const { t } = useLocale();

  const categoryOptions = [
    { value: "Women", label: t("beneficiaries.categories.womenWithChildren") },
    { value: "Disabled", label: t("beneficiaries.categories.disabled") },
    { value: "Elderly", label: t("beneficiaries.categories.elderly") },
    { value: "Child", label: t("beneficiaries.categories.child") },
    { value: "Other", label: t("beneficiaries.categories.other") },
  ];

  const subLabels: Record<string, string> = {
    Women: t("registerForm.subDetails.womenWithChildren"),
    Disabled: t("registerForm.subDetails.disabled"),
    Elderly: t("registerForm.subDetails.elderly"),
    Child: t("registerForm.subDetails.child"),
    Other: t("registerForm.subDetails.other"),
  };

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [sex, setSex] = useState("");
  const [kebele, setKebele] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (category) params.set("category", category);
  if (status) params.set("status", status);
  if (sex) params.set("sex", sex);
  if (kebele) params.set("kebele", kebele);

  const {
    data: beneficiariesData,
    error,
    isLoading,
    mutate,
  } = useSWR<Beneficiary[]>(`/api/beneficiaries?${params.toString()}`, fetcher);

  const beneficiaries = Array.isArray(beneficiariesData)
    ? beneficiariesData
    : [];

  const [form, setForm] = useState({
    full_name: "",
    sex: "Female",
    age: "",
    date_of_birth: "",
    kebele: "",
    woreda: "",
    house_no: "",
    phone: "",
    id_type: "Kebele ID",
    id_number: "",
    category: "",
    sub_details: "",
    family_size: "",
    occupation: "",
    average_income: "",
    notes: "",
    photo_url: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.full_name.trim()) errs.full_name = "Full name is required";
    if (!form.category) errs.category = "Category is required";
    if (!form.id_number.trim()) errs.id_number = "ID number is required";
    if (form.id_type === "Fayda" && form.id_number.length !== 16)
      errs.id_number = "Fayda ID must be exactly 12 digits";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    const promise = fetch("/api/beneficiaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    }).then(async (res) => {
      if (!res.ok) throw new Error("Failed to create");
      setShowModal(false);
      setForm({
        full_name: "",
        sex: "Female",
        age: "",
        date_of_birth: "",
        kebele: "",
        woreda: "",
        house_no: "",
        phone: "",
        id_type: "Kebele ID",
        id_number: "",
        category: "",
        sub_details: "",
        family_size: "",
        occupation: "",
        average_income: "",
        notes: "",
        photo_url: "",
      });
      mutate();
    });

    toast
      .promise(promise, {
        loading: t("common.saving"),
        success: "Beneficiary added successfully",
        error: t("registerForm.failedToRegister"),
      })
      .finally(() => setSubmitting(false));
  };

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

  const updateField = (field: string, value: string) => {
    const next = { ...form, [field]: value };
    if (field === "id_type" && value === "Kebele ID") {
      next.id_number = "";
    }
    if (field === "id_type" && value === "Fayda") {
      next.id_number = "";
    }
    setForm(next);
    if (errors[field]) setErrors({ ...errors, [field]: "" });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {t("beneficiaries.title")}
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors"
        >
          {t("beneficiaries.register")}
        </button>
      </div>

      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder={t("beneficiaries.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg pl-10 pr-4 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t("beneficiaries.allCategories")}</option>
          {categoryOptions.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t("beneficiaries.allStatuses")}</option>
          <option value="Active">{t("statuses.active")}</option>
          <option value="Pending">{t("statuses.pending")}</option>
          <option value="Completed">{t("statuses.completed")}</option>
          <option value="Cancelled">{t("statuses.cancelled")}</option>
          <option value="Terminated">{t("statuses.terminated")}</option>
        </select>
        <select
          value={sex}
          onChange={(e) => setSex(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t("beneficiaries.allSexes")}</option>
          <option value="Female">{t("registerForm.female")}</option>
          <option value="Male">{t("registerForm.male")}</option>
        </select>
        <input
          type="text"
          placeholder={t("beneficiaries.filterByKebele")}
          value={kebele}
          onChange={(e) => setKebele(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
        />
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  {t("beneficiaries.fullName")}
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  {t("beneficiaries.category")}
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  {t("beneficiaries.kebele")}
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  {t("beneficiaries.status")}
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  {t("beneficiaries.action")}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr
                    key={i}
                    className="animate-pulse border-b border-gray-100"
                  >
                    <td className="px-4 py-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div>
                    </td>
                  </tr>
                ))
              ) : beneficiaries.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    {t("beneficiaries.noResults")}
                  </td>
                </tr>
              ) : (
                beneficiaries.map((b) => (
                  <tr
                    key={b.ben_id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {b.full_name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{b.category}</td>
                    <td className="px-4 py-3 text-gray-600">{b.kebele}</td>
                    <td className="px-4 py-3">{statusBadge(b.status)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/beneficiaries/${b.ben_id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        {t("beneficiaries.view")}
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
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <h2 className="text-lg font-bold text-gray-800">
                {t("registerForm.title")}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("registerForm.fullName")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => updateField("full_name", e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.full_name && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.full_name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("registerForm.sex")}
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="sex"
                      value="Female"
                      checked={form.sex === "Female"}
                      onChange={(e) => updateField("sex", e.target.value)}
                      className="accent-blue-900"
                    />
                    {t("registerForm.female")}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="sex"
                      value="Male"
                      checked={form.sex === "Male"}
                      onChange={(e) => updateField("sex", e.target.value)}
                      className="accent-blue-900"
                    />
                    {t("registerForm.male")}
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("registerForm.age")}
                  </label>
                  <input
                    type="number"
                    value={form.age}
                    onChange={(e) => updateField("age", e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("registerForm.dateOfBirth")}
                  </label>
                  <input
                    type="date"
                    value={form.date_of_birth}
                    onChange={(e) =>
                      updateField("date_of_birth", e.target.value)
                    }
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("registerForm.woreda")}
                  </label>
                  <input
                    type="text"
                    value={form.woreda}
                    onChange={(e) => updateField("woreda", e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("registerForm.kebele")}
                  </label>
                  <input
                    type="text"
                    value={form.kebele}
                    onChange={(e) => updateField("kebele", e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("registerForm.houseNo")}
                  </label>
                  <input
                    type="text"
                    value={form.house_no}
                    onChange={(e) => updateField("house_no", e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("registerForm.phone")}
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("registerForm.idType")}
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="id_type"
                      value="Kebele ID"
                      checked={form.id_type === "Kebele ID"}
                      onChange={(e) => updateField("id_type", e.target.value)}
                      className="accent-blue-900"
                    />
                    {t("registerForm.kebeleId")}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="id_type"
                      value="Fayda"
                      checked={form.id_type === "Fayda"}
                      onChange={(e) => updateField("id_type", e.target.value)}
                      className="accent-blue-900"
                    />
                    {t("registerForm.fayda")}
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("registerForm.idNumber")}{" "}
                  <span className="text-red-500">*</span>
                  {form.id_type === "Fayda" && (
                    <span className="text-gray-400 font-normal ml-1">
                      {t("registerForm.faydaHint")}
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={form.id_number}
                  onChange={(e) => updateField("id_number", e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.id_number && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.id_number}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("registerForm.category")}
                </label>
                <select
                  value={form.category}
                  onChange={(e) => updateField("category", e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled>
                    {t("registerForm.selectCategory")}
                  </option>
                  {categoryOptions.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="text-red-500 text-xs mt-1">{errors.category}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {subLabels[form.category] ||
                    t("registerForm.subDetails.other")}
                </label>
                <input
                  type="text"
                  value={form.sub_details}
                  onChange={(e) => updateField("sub_details", e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("registerForm.familySize")}
                  </label>
                  <input
                    type="number"
                    value={form.family_size}
                    onChange={(e) => updateField("family_size", e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("registerForm.occupation")}
                  </label>
                  <input
                    type="text"
                    value={form.occupation}
                    onChange={(e) => updateField("occupation", e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("registerForm.avgIncome")}
                  </label>
                  <input
                    type="number"
                    value={form.average_income}
                    onChange={(e) =>
                      updateField("average_income", e.target.value)
                    }
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("registerForm.photo")}
                </label>
                <ImageUpload
                  value={form.photo_url}
                  onChange={(url) => updateField("photo_url", url)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("registerForm.notes")}
                </label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {t("registerForm.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50"
                >
                  {submitting
                    ? t("registerForm.saving")
                    : t("registerForm.register")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
