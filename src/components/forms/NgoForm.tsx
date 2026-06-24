"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useLocale } from "@/components/LocaleProvider";

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

interface NgoFormProps {
  initialValues?: Partial<NGO>;
  onSuccess: (result: { ngo_id: string; name: string }) => void;
  onCancel?: () => void;
  submitLabel?: string;
  compact?: boolean;
}

const STATUS_OPTIONS = ["Active", "Inactive", "Suspended"];

export default function NgoForm({
  initialValues,
  onSuccess,
  onCancel,
  submitLabel,
  compact = false,
}: NgoFormProps) {
  const { t } = useLocale();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: initialValues?.name || "",
    contact_person: initialValues?.contact_person || "",
    phone: initialValues?.phone || "",
    email: initialValues?.email || "",
    registration_number: initialValues?.registration_number || "",
    status: initialValues?.status || "Active",
    notes: initialValues?.notes || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    const isEdit = !!initialValues?.ngo_id;
    const url = isEdit ? `/api/ngos/${initialValues?.ngo_id}` : "/api/ngos";
    const method = isEdit ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save NGO");
      }

      const savedNgo = await res.json();
      toast.success(isEdit ? t("ngos.saveChanges") : "NGO added successfully");
      onSuccess({ 
        ngo_id: savedNgo.ngo_id || initialValues?.ngo_id, 
        name: savedNgo.name || form.name 
      });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition-all";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const fieldGroupClass = compact ? "mb-3" : "mb-4";

  const formContent = (
    <div className={compact ? "grid grid-cols-1 gap-1" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
      <div className={fieldGroupClass}>
        <label className={labelClass}>{t("ngos.name")}</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={`${inputClass} ${errors.name ? "border-red-500" : "border-gray-300"}`}
          required
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>
      <div className={fieldGroupClass}>
        <label className={labelClass}>{t("ngos.contactPerson")}</label>
        <input
          type="text"
          value={form.contact_person}
          onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
          className={`${inputClass} border-gray-300`}
        />
      </div>
      <div className={fieldGroupClass}>
        <label className={labelClass}>{t("ngos.phone")}</label>
        <input
          type="text"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className={`${inputClass} border-gray-300`}
        />
      </div>
      <div className={fieldGroupClass}>
        <label className={labelClass}>{t("ngos.email")}</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className={`${inputClass} border-gray-300`}
        />
      </div>
      <div className={fieldGroupClass}>
        <label className={labelClass}>{t("ngos.registrationNumber")}</label>
        <input
          type="text"
          value={form.registration_number}
          onChange={(e) => setForm({ ...form, registration_number: e.target.value })}
          className={`${inputClass} border-gray-300`}
        />
      </div>
      <div className={fieldGroupClass}>
        <label className={labelClass}>{t("ngos.status")}</label>
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          className={`${inputClass} border-gray-300`}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
      <div className={`${fieldGroupClass} ${compact ? "" : "md:col-span-2"}`}>
        <label className={labelClass}>{t("ngos.notes")}</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className={`${inputClass} border-gray-300`}
          rows={compact ? 2 : 3}
        ></textarea>
      </div>
    </div>
  );

  if (compact) {
    return (
      <form onSubmit={handleSubmit}>
        {formContent}
        <div className="mt-4 flex justify-end gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
            >
              {t("common.cancel")}
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? t("common.saving") : (submitLabel || t("common.save"))}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-4">
      {formContent}
      <div className="mt-6 flex justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
          >
            {t("common.cancel")}
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? t("common.saving") : (submitLabel || t("common.save"))}
        </button>
      </div>
    </form>
  );
}
