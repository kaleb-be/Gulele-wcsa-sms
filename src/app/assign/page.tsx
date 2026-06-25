"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import toast from "react-hot-toast";
import {Search, ArrowRight, CheckCircle2, AlertCircle, AlertTriangle, X, Check} from "lucide-react";
import { useLocale } from "@/components/LocaleProvider";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Beneficiary {
  ben_id: string;
  full_name: string;
  category: string;
  kebele: string;
}

interface Project {
  project_id: string;
  project_title: string;
  ngo_name: string;
  aoi_category: string;
  start_date: string;
  end_date: string;
  quota_total: string;
  active_enrollments: number;
}

export default function EnrollmentFlow() {
  const { t } = useLocale();
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedBen, setSelectedBen] = useState<Beneficiary | null>(null);
  const [selectedProj, setSelectedProj] = useState<Project | null>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [supportRange, setSupportRange] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error' | 'duplicate' | 'quota_exceeded'; message: string; data?: any } | null>(null);

  const { data: beneficiaries } = useSWR<Beneficiary[]>(
    search.length > 2 ? `/api/beneficiaries?search=${search}` : null,
    fetcher
  );

  const { data: projects } = useSWR<Project[]>(
    step === 2 ? "/api/projects?status=Active" : null,
    fetcher
  );

  const handleNextStep = () => {
    if (step === 1 && selectedBen) setStep(2);
    if (step === 2 && selectedProj) setStep(3);
  };

  const handleEnroll = async () => {
    if (!selectedBen || !selectedProj) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ben_id: selectedBen.ben_id,
          project_id: selectedProj.project_id,
          start_date: startDate,
          end_date: endDate,
          notes,
          support_range: supportRange,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setResult({ type: data.error, message: data.message, data });
      } else if (!res.ok) {
        throw new Error(data.message || "Failed to enroll");
      } else {
        setResult({ type: "success", message: t("enroll.enrollmentSuccess"), data });
        toast.success(t("enroll.enrollmentSuccess"));
      }
    } catch (err) {
      setResult({ type: "error", message: "An unexpected error occurred." });
      toast.error(t("enroll.processing"));
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStep(1);
    setSelectedBen(null);
    setSelectedProj(null);
    setResult(null);
    setSearch("");
    setNotes("");
    setSupportRange("");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 overflow-x-hidden">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800">{t("enroll.title")}</h1>
        <p className="text-gray-500 mt-2">{t("enroll.subtitle")}</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-2 md:gap-4">
        {[1, 2, 3].map((s) => {
          const labels = [
            t("enroll.step1"),
            t("enroll.step2"),
            t("enroll.step3"),
          ];
          return (
            <div key={s} className="flex items-center gap-1 md:gap-2">
              <div
                className={`w-7 h-7 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all text-xs md:text-sm border-2 font-bold flex-shrink-0 ${
                  step === s
                    ? "bg-blue-900 text-white"
                    : step > s
                      ? "bg-green-100 border-green-300 text-green-700"
                      : "bg-white border-gray-300 text-gray-400"
                }`}
              >
                {step > s ? <Check size={16} /> : s}
              </div>
              {/* Label: always visible on desktop, only visible for active step on mobile */}
              <span
                className={`text-xs font-bold uppercase tracking-wider hidden md:inline ${
                  step >= s ? "text-gray-700" : "text-gray-400"
                }`}
              >
          {labels[s - 1]}
        </span>
              <span
                className={`text-xs font-bold uppercase tracking-wider md:hidden ${
                  step === s ? "text-gray-700 inline" : "hidden"
                }`}
              >
          {labels[s - 1]}
        </span>
              {s < 3 && (
                <div className="w-6 md:w-12 h-px bg-gray-200 mx-1 md:mx-2 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {result ? (
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
          {result.type === 'success' ? (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">{t("enroll.enrollmentSuccess")}</h2>
              <p className="text-gray-600">
                <span className="font-bold">{selectedBen?.full_name}</span> {t("enroll.enrolledIn")} <br />
                <span className="font-bold text-blue-900">{selectedProj?.project_title}</span>
              </p>
              <div className="flex justify-center gap-4 pt-4">
                <button onClick={reset} className="px-6 py-2 bg-blue-900 text-white rounded-lg font-medium">{t("enroll.enrollAnother")}</button>
                <Link href={`/projects/${selectedProj?.project_id}`} className="px-6 py-2 border border-gray-200 rounded-lg font-medium hover:bg-gray-50">{t("enroll.viewProject")}</Link>
              </div>
            </div>
          ) : result.type === 'duplicate' ? (
            <div className="space-y-4 text-left">
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-800">
                <AlertCircle size={24} className="flex-shrink-0" />
                <div>
                  <p className="font-bold">{t("enroll.duplicateTitle")}</p>
                  <p className="text-sm">
                    {t("enroll.duplicateMessage")}
                    (<span className="font-bold">{result.data.conflictingEnrollment.aoi_category}</span>) {t("enroll.duringPeriod")}
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm border border-gray-100">
                <p><span className="text-gray-500">{t("enroll.conflictingProject")}:</span> <span className="font-bold">{result.data.conflictingEnrollment.project_title}</span></p>
                <p><span className="text-gray-500">{t("projects.ngo")}:</span> {result.data.conflictingEnrollment.ngo_name}</p>
                <p><span className="text-gray-500">{t("projects.dates")}:</span> {result.data.conflictingEnrollment.start_date} to {result.data.conflictingEnrollment.end_date || t("projects.ongoing")}</p>
              </div>
              <button onClick={() => {
                setResult(null)
                setSelectedProj(null)
                setStep(2)
              }} className="w-full py-3 border border-gray-200 rounded-xl font-bold hover:bg-gray-50">{t("enroll.chooseDifferent")}</button>
            </div>
          ) : result.type === 'quota_exceeded' ? (
            <div className="space-y-4 text-left">
              <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-100 rounded-xl text-orange-800">
                <AlertTriangle size={24} className="flex-shrink-0" />
                <div>
                  <p className="font-bold">{t("enroll.quotaTitle")}</p>
                  <p className="text-sm">
                    {t("enroll.quotaMessage")} <span className="font-bold">{result.data.quota}</span> {t("enroll.beneficiaries")}
                  </p>
                </div>
              </div>
              <button onClick={() => {
                setResult(null)
                setSelectedProj(null)
                setStep(2)
              }} className="w-full py-3 border border-gray-200 rounded-xl font-bold hover:bg-gray-50">{t("enroll.chooseDifferent")}</button>
            </div>
          ) : (
            <div className="space-y-4">
               <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                <X size={40} />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Error</h2>
              <p className="text-gray-600">{result.message}</p>
              <button onClick={() => setResult(null)} className="px-6 py-2 bg-gray-800 text-white rounded-lg">Try Again</button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden min-h-[400px]">
          {step === 1 && (
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-gray-800">{t("enroll.step1")}</h2>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    autoFocus
                    type="text"
                    placeholder={t("enroll.searchBeneficiary")}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {search.length <= 2 ? (
                  <div className="text-center py-12 text-gray-400 italic">{t("enroll.typeToSearch")}</div>
                ) : !beneficiaries ? (
                  <div className="text-center py-12">{t("common.loading")}</div>
                ) : beneficiaries.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">{t("beneficiaries.noResults")}</div>
                ) : (
                  beneficiaries.map((ben) => (
                    <button
                      key={ben.ben_id}
                      onClick={() => setSelectedBen(ben)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        selectedBen?.ben_id === ben.ben_id 
                        ? "border-blue-900 bg-blue-50" 
                        : "border-gray-50 hover:border-blue-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-gray-800">{ben.full_name}</p>
                          <p className="text-sm text-gray-500">{ben.category} • {t("beneficiaries.kebele")} {ben.kebele}</p>
                        </div>
                        {selectedBen?.ben_id === ben.ben_id && <CheckCircle2 className="text-blue-900" />}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {selectedBen && (
                <div className="pt-4 flex justify-end">
                  <button
                    onClick={handleNextStep}
                    className="bg-blue-900 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-800 transition-colors"
                  >
                    {t("enroll.continue")} <ArrowRight size={18} />
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="p-8 space-y-6">
               <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">{t("enroll.step2")}</h2>
                <button onClick={() => setStep(1)} className="text-sm text-blue-600 font-medium">{t("enroll.back")}</button>
              </div>

              <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {!projects ? (
                  <div className="text-center py-12">{t("common.loading")}</div>
                ) : projects.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 italic">{t("enroll.noProjectsAvailable")}</div>
                ) : (
                  Object.entries(
                    projects.reduce((acc, p) => {
                      if (!acc[p.aoi_category]) acc[p.aoi_category] = [];
                      acc[p.aoi_category].push(p);
                      return acc;
                    }, {} as Record<string, Project[]>)
                  ).map(([cat, projs]) => (
                    <div key={cat} className="space-y-3">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2">{cat}</h3>
                      <div className="grid grid-cols-1 gap-3">
                        {projs.map((p) => {
                          const remaining = (parseInt(p.quota_total) || 9999) - (p.active_enrollments || 0);
                          const isFull = remaining <= 0;
                          return (
                            <button
                              key={p.project_id}
                              disabled={isFull}
                              onClick={() => setSelectedProj(p)}
                              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                                isFull ? "opacity-50 cursor-not-allowed bg-gray-50" :
                                selectedProj?.project_id === p.project_id 
                                ? "border-blue-900 bg-blue-50" 
                                : "border-gray-50 hover:border-blue-200 hover:bg-gray-50"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-bold text-gray-800">{p.project_title}</p>
                                {selectedProj?.project_id === p.project_id && <CheckCircle2 className="text-blue-900" />}
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <p className="text-gray-500">{p.ngo_name}</p>
                                <p className={`font-bold ${remaining < 5 ? "text-orange-600" : "text-green-600"}`}>
                                  {isFull ? t("enroll.fullCapacity") : `${remaining} ${t("enroll.slotsLeft")}`}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {selectedProj && (
                <div className="pt-4 flex justify-end">
                  <button
                    onClick={handleNextStep}
                    className="bg-blue-900 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-800 transition-colors"
                  >
                    {t("enroll.confirmEnrollment")} <ArrowRight size={18} />
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 3 && selectedBen && selectedProj && (
            <div className="p-8 space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">{t("enroll.step3")}</h2>
                <button onClick={() => setStep(2)} className="text-sm text-blue-600 font-medium">{t("enroll.back")}</button>
              </div>

              <div className="bg-blue-50 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6 border border-blue-100">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-blue-600">{t("enroll.step1")}</p>
                  <p className="text-lg font-bold text-gray-800">{selectedBen.full_name}</p>
                  <p className="text-sm text-gray-500">{selectedBen.category} • {t("beneficiaries.kebele")} {selectedBen.kebele}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-blue-600">{t("enroll.step2")}</p>
                  <p className="text-lg font-bold text-gray-800">{selectedProj.project_title}</p>
                  <p className="text-sm text-gray-500">{selectedProj.ngo_name} • {selectedProj.aoi_category}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{t("enroll.startDate")} *</label>
                  <input
                    type="date"
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{t("enroll.endDate")}</label>
                  <input
                    type="date"
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  {t("enroll.supportRangeOptional")}
                </label>
                <select
                  value={supportRange}
                  onChange={(e) => setSupportRange(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                >
                  <option value="">{t("enroll.selectRange")}</option>
                  <option value="500-999">500 - 999</option>
                  <option value="1000-1999">1,000 - 1,999</option>
                  <option value="2000-3000">2,000 - 3,000</option>
                  <option value="3000-5000">3,000 - 5,000</option>
                  <option value="5000-10000">5,000 - 10,000</option>
                  <option value="10000-20000">10,000 - 20,000</option>
                  <option value="20000-50000">20,000 - 50,000</option>
                  <option value="50000-above">{t("enroll.supportRangeAbove")}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t("enroll.notes")}</label>
                <textarea
                  rows={3}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder={t("enroll.additionalInfo")}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="pt-4">
                <button
                  disabled={submitting}
                  onClick={handleEnroll}
                  className="w-full bg-blue-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-800 transition-colors disabled:opacity-50"
                >
                  {submitting ? t("enroll.processing") : t("enroll.completeEnrollment")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
