"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import useSWR from "swr";
import toast from "react-hot-toast";
import { Search } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";

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

const CATEGORIES = ["Women with children", "Disabled", "Elderly", "Other"];
const SUB_LABELS: Record<string, string> = {
  "Women with children": "Number of children",
  Disabled: "Disability type",
  Elderly: "Age details",
  Other: "Sub details",
};

export default function BeneficiariesPage() {
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

  const { data: beneficiariesData, error, isLoading, mutate } = useSWR<Beneficiary[]>(
    `/api/beneficiaries?${params.toString()}`,
    fetcher
  );

  const beneficiaries = Array.isArray(beneficiariesData) ? beneficiariesData : [];

  const [form, setForm] = useState({
    full_name: "",
    sex: "Female",
    age: "",
    kebele: "",
    phone: "",
    id_type: "Kebele ID",
    id_number: "",
    category: "",
    sub_details: "",
    notes: "",
    photo_url: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.full_name.trim()) errs.full_name = "Full name is required";
    if (!form.category) errs.category = "Category is required";
    if (!form.id_number.trim()) errs.id_number = "ID number is required";
    if (form.id_type === "Fayda" && form.id_number.length !== 12)
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
        kebele: "",
        phone: "",
        id_type: "Kebele ID",
        id_number: "",
        category: "",
        sub_details: "",
        notes: "",
        photo_url: "",
      });
      mutate();
    });

    toast.promise(promise, {
      loading: "Saving beneficiary...",
      success: "Beneficiary added successfully",
      error: "Failed to create beneficiary",
    }).finally(() => setSubmitting(false));
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
        <h1 className="text-2xl font-bold text-gray-800">Beneficiaries</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors"
        >
          Register Beneficiary
        </button>
      </div>

      <div className="flex items-center gap-4 mb-4 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by name, ID or phone..."
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
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Pending">Pending</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
          <option value="Terminated">Terminated</option>
        </select>
        <select
          value={sex}
          onChange={(e) => setSex(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Sexes</option>
          <option value="Female">Female</option>
          <option value="Male">Male</option>
        </select>
        <input
          type="text"
          placeholder="Filter by Kebele..."
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
                  Full Name
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Category
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Kebele
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Action
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
                    <td className="px-4 py-4 text-right">
                      <div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div>
                    </td>
                  </tr>
                ))
              ) : beneficiaries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No beneficiaries found.
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
                        View
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
                Register Beneficiary
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
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => updateField("full_name", e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.full_name && (
                  <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sex
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
                    Female
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
                    Male
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Age
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
                    Kebele
                  </label>
                  <input
                    type="text"
                    value={form.kebele}
                    onChange={(e) => updateField("kebele", e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
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
                  ID Type
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
                    Kebele ID
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
                    Fayda
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID Number <span className="text-red-500">*</span>
                  {form.id_type === "Fayda" && (
                    <span className="text-gray-400 font-normal ml-1">
                      (12 digits required)
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
                  <p className="text-red-500 text-xs mt-1">{errors.id_number}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) => updateField("category", e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled>Select Category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="text-red-500 text-xs mt-1">{errors.category}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {SUB_LABELS[form.category] || "Sub details"}
                </label>
                <input
                  type="text"
                  value={form.sub_details}
                  onChange={(e) => updateField("sub_details", e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Photo (optional)
                </label>
                <ImageUpload value={form.photo_url} onChange={(url) => updateField("photo_url", url)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
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
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Register"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
