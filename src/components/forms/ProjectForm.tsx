"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useLocale } from "@/components/LocaleProvider";

interface ProjectFormData {
  project_title: string;
  operation_area: string;
  woreda: string;
  area_of_intervention: string;
  aoi_category: string;
  start_date: string;
  end_date: string;
  total_budget: string;
  quota_women: string;
  quota_children: string;
  quota_elderly: string;
  quota_disabled: string;
  notes: string;
}

interface ProjectFormProps {
  ngo_id: string;
  initialValues?: Partial<ProjectFormData>;
  onSuccess: (result: any) => void;
  onCancel?: () => void;
  submitLabel?: string;
  compact?: boolean;
}

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

export default function ProjectForm({
  ngo_id,
  initialValues,
  onSuccess,
  onCancel,
  submitLabel,
  compact = false,
}: ProjectFormProps) {
  const { t } = useLocale();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<ProjectFormData>({
    project_title: initialValues?.project_title || "",
    operation_area: initialValues?.operation_area || "",
    woreda: initialValues?.woreda || "",
    area_of_intervention: initialValues?.area_of_intervention || "",
    aoi_category: initialValues?.aoi_category || AOI_CATEGORIES[0],
    start_date: initialValues?.start_date || "",
    end_date: initialValues?.end_date || "",
    total_budget: initialValues?.total_budget || "",
    quota_women: initialValues?.quota_women || "0",
    quota_children: initialValues?.quota_children || "0",
    quota_elderly: initialValues?.quota_elderly || "0",
    quota_disabled: initialValues?.quota_disabled || "0",
    notes: initialValues?.notes || "",
  });

  const quotaTotal =
    (parseInt(form.quota_women) || 0) +
    (parseInt(form.quota_children) || 0) +
    (parseInt(form.quota_elderly) || 0) +
    (parseInt(form.quota_disabled) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ngo_id }),
      });
      if (!res.ok) throw new Error("Failed to create project");
      const result = await res.json();
      toast.success(t("ngos.addProject"));
      onSuccess(result);
    } catch (err) {
      toast.error("Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition-all";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const fieldGroupClass = compact ? "mb-3" : "mb-4";

  const formContent = (
    <div className={compact ? "grid grid-cols-1 gap-1" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
      <div className={fieldGroupClass}>
        <label className={labelClass}>{t("projects.title")}</label>
        <input
          type="text"
          value={form.project_title}
          onChange={(e) => setForm({ ...form, project_title: e.target.value })}
          className={inputClass}
          required
        />
      </div>
      <div className={fieldGroupClass}>
        <label className={labelClass}>{t("projects.operationArea")}</label>
        <input
          type="text"
          value={form.operation_area}
          onChange={(e) => setForm({ ...form, operation_area: e.target.value })}
          className={inputClass}
        />
      </div>
      <div className={fieldGroupClass}>
        <label className={labelClass}>{t("projects.woreda")}</label>
        <input
          type="text"
          value={form.woreda}
          onChange={(e) => setForm({ ...form, woreda: e.target.value })}
          className={inputClass}
        />
      </div>
      <div className={fieldGroupClass}>
        <label className={labelClass}>{t("projects.aoiCategory")}</label>
        <select
          value={form.aoi_category}
          onChange={(e) => setForm({ ...form, aoi_category: e.target.value })}
          className={inputClass}
        >
          {AOI_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className={fieldGroupClass}>
        <label className={labelClass}>{t("projects.startDate")}</label>
        <input
          type="date"
          value={form.start_date}
          onChange={(e) => setForm({ ...form, start_date: e.target.value })}
          className={inputClass}
        />
      </div>
      <div className={fieldGroupClass}>
        <label className={labelClass}>{t("projects.endDate")}</label>
        <input
          type="date"
          value={form.end_date}
          onChange={(e) => setForm({ ...form, end_date: e.target.value })}
          className={inputClass}
        />
      </div>
      <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className={labelClass}>{t("projects.quotaWomen")}</label>
          <input
            type="number"
            value={form.quota_women}
            onChange={(e) => setForm({ ...form, quota_women: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>{t("projects.quotaChildren")}</label>
          <input
            type="number"
            value={form.quota_children}
            onChange={(e) => setForm({ ...form, quota_children: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>{t("projects.quotaElderly")}</label>
          <input
            type="number"
            value={form.quota_elderly}
            onChange={(e) => setForm({ ...form, quota_elderly: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>{t("projects.quotaDisabled")}</label>
          <input
            type="number"
            value={form.quota_disabled}
            onChange={(e) => setForm({ ...form, quota_disabled: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>
      <div className="md:col-span-2">
        <p className="text-sm font-semibold text-gray-600 bg-gray-50 p-2 rounded border">
          {t("projects.autoQuota")}: {quotaTotal}
        </p>
      </div>
      <div className={compact ? "md:col-span-1" : "md:col-span-2"}>
        <label className={labelClass}>{t("projects.notes")}</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className={inputClass}
          rows={compact ? 2 : 3}
        ></textarea>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className={compact ? "" : "p-4"}>
      {formContent}
      <div className={`mt-6 flex justify-end gap-3 ${compact ? "mt-4" : ""}`}>
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
          className={`bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 ${compact ? "px-4 py-2" : "px-6 py-2"}`}
        >
          {submitting ? t("common.saving") : (submitLabel || t("common.save"))}
        </button>
      </div>
    </form>
  );
}
