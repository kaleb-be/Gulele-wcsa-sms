"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import * as XLSX from "xlsx";
import { useLocale } from "@/components/LocaleProvider";
import useSWR from "swr";
import NgoForm from "@/components/forms/NgoForm";
import ProjectForm from "@/components/forms/ProjectForm";
import { ChevronRight, ChevronLeft, Upload, Check, Info, AlertTriangle, X, Download, Printer } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface MappedRow {
  full_name: string;
  sex: string;
  age: string;
  woreda: string;
  phone: string;
  id_type: string;
  id_number: string;
  category: string;
  support_range: string;
  sub_details: string;
  registered_date: string;
  registered_by: string;
  notes: string;
}

const HEADER_ALIASES: Record<string, string> = {
  "full name": "full_name",
  "name": "full_name",
  "sex": "sex",
  "gender": "sex",
  "age": "age",
  "woreda": "woreda",
  "phone": "phone",
  "telephone": "phone",
  "id type": "id_type",
  "idtype": "id_type",
  "id number": "id_number",
  "idnumber": "id_number",
  "id no": "id_number",
  "support category": "category",
  "category": "category",
  "support range": "support_range",
  "registration date": "registered_date",
  "date": "registered_date",
  "collected by": "registered_by",
  "remarks": "notes",
  "sub details": "sub_details",
};

function normalizeSex(val: string): string {
  const v = val.toLowerCase().trim();
  if (v === "m" || v.startsWith("male") || v === "ወንድ") return "Male";
  return "Female";
}

function normalizeIdType(val: string): string {
  const v = val.toLowerCase().trim();
  if (v.includes("fayda") || v.includes("ፋይዳ")) return "Fayda";
  return "Kebele ID";
}

function normalizeCategory(val: string): string {
  const v = val.toLowerCase();
  if (v.includes("women") || v.includes("ሴቶ") || v.includes("woman")) return "Women";
  if (v.includes("child") || v.includes("ህፃ") || v.includes("kid")) return "Child";
  if (v.includes("elder") || v.includes("አዛው")) return "Elderly";
  if (v.includes("disab") || v.includes("አካል")) return "Disabled";
  return "Other";
}

function mapHeaders(headers: any[]): Record<number, string> {
  const map: Record<number, string> = {};
  headers.forEach((h, i) => {
    const normalized = String(h || "").toLowerCase().trim();
    if (HEADER_ALIASES[normalized]) {
      map[i] = HEADER_ALIASES[normalized];
    }
  });
  return map;
}

function mapRow(row: any[], headerMap: Record<number, string>): MappedRow {
  const obj: any = {};
  Object.entries(headerMap).forEach(([i, field]) => {
    obj[field] = String(row[parseInt(i)] || "").trim();
  });
  return {
    full_name: obj.full_name || "",
    sex: normalizeSex(obj.sex || ""),
    age: obj.age || "",
    woreda: obj.woreda || "",
    phone: obj.phone || "",
    id_type: normalizeIdType(obj.id_type || ""),
    id_number: obj.id_number || "",
    category: normalizeCategory(obj.category || ""),
    support_range: obj.support_range || "",
    sub_details: obj.sub_details || "",
    registered_date: obj.registered_date || new Date().toISOString().split("T")[0],
    registered_by: obj.registered_by || "",
    notes: obj.notes || "",
  };
}

type RowStatus =
  | { type: "new" }
  | { type: "confirmed_duplicate"; existingBen: any }
  | { type: "possible_duplicate"; existingBen: any; matchReason: string }
  | { type: "skip"; reason: string };

export default function ImportPage() {
  const { t } = useLocale();
  const { data: session } = useSession();
  const [step, setStep] = useState(1);
  
  // Step 1 state
  const [file, setFile] = useState<File | null>(null);
  const [confirmTemplate, setConfirmTemplate] = useState(false);
  const [extractedOrgName, setExtractedOrgName] = useState("");
  const [dataRows, setDataRows] = useState<any[][]>([]);
  const [mappedRows, setMappedRows] = useState<MappedRow[]>([]);
  
  // Step 2 state
  const [ngoMode, setNgoMode] = useState<"existing" | "new">("existing");
  const [selectedNgoId, setSelectedNgoId] = useState("");
  const [editedOrgName, setEditedOrgName] = useState("");
  const { data: ngos } = useSWR("/api/ngos", fetcher);

  // Step 3 state
  const [projectMode, setProjectMode] = useState<"existing" | "new">("existing");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const { data: projects } = useSWR(selectedNgoId ? `/api/projects?ngo_id=${selectedNgoId}` : null, fetcher);

  // Step 4 state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [classifications, setClassifications] = useState<{ row: MappedRow; status: RowStatus; index: number }[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [importStatus, setImportStatus] = useState("");
  const [importError, setImportError] = useState("");
  const [possibleDuplicatesData, setPossibleDuplicatesData] = useState<any[]>([]);
  const [results, setResults] = useState<{
    created: any[];
    enrollmentsCreated: number;
    confirmedDuplicates: any[];
    enrollmentsSkipped: any[];
    possibleDuplicates: any[];
    skipped: any[];
    errors: any[];
  } | null>(null);

  // Auto-select NGO if extracted name matches
  useEffect(() => {
    if (step === 2 && ngos && extractedOrgName && !selectedNgoId) {
      const match = (ngos as any[]).find(n => 
        n.name.toLowerCase().includes(extractedOrgName.toLowerCase()) ||
        extractedOrgName.toLowerCase().includes(n.name.toLowerCase())
      );
      if (match) setSelectedNgoId(match.ngo_id);
    }
  }, [step, ngos, extractedOrgName, selectedNgoId]);

  // Auto-switch to new project if none exist
  useEffect(() => {
    if (step === 3 && projects && (projects as any[]).length === 0) {
      setProjectMode("new");
    }
  }, [step, projects]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const arrayBuffer = evt.target?.result as ArrayBuffer;
      const wb = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

      if (raw.length < 2) {
        toast.error("File seems empty or invalid");
        return;
      }

      // Extract org name
      const titleStr = (raw[0] as any[]).map(c => String(c)).join(" ");
      const afterLabel = titleStr.split(/Organization Name\)\s*:/i)[1] || "";
      const extracted = afterLabel
        .split(/Date\s*\)|የመረጃው/i)[0]
        .replace(/_+/g, "")
        .trim();
      setExtractedOrgName(extracted);
      setEditedOrgName(extracted);

      // Map rows
      const headers = raw[1];
      const headerMap = mapHeaders(headers);
      const rows = raw.slice(2).filter(row => row.some(cell => String(cell).trim() !== ""));
      setDataRows(rows);
      setMappedRows(rows.map(r => mapRow(r, headerMap)));
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const startAnalysis = async () => {
    setIsAnalyzing(true);
    setStep(4);
    try {
      const existing = await fetch("/api/beneficiaries").then(r => r.json());
      const allBeneficiaries = Array.isArray(existing) ? existing : [];

      const idMap = new Map<string, any>();
      const nameMap = new Map<string, any[]>();

      allBeneficiaries.forEach(ben => {
        const idKey = `${ben.id_type}::${ben.id_number}`.toLowerCase();
        if (ben.id_number) idMap.set(idKey, ben);

        const nameKey = ben.full_name?.toLowerCase().trim().replace(/\s+/g, " ");
        if (nameKey) {
          if (!nameMap.has(nameKey)) nameMap.set(nameKey, []);
          nameMap.get(nameKey)!.push(ben);
        }
      });

      const results = mappedRows.map((row, index) => {
        if (!row.full_name?.trim()) return { row, status: { type: "skip", reason: "missing_name" } as RowStatus, index };
        
        if (!row.id_number?.trim()) {
          const nameKey = row.full_name.toLowerCase().trim().replace(/\s+/g, " ");
          const nameMatches = nameMap.get(nameKey) || [];
          if (nameMatches.length > 0) {
            return { row, status: { type: "possible_duplicate", existingBen: nameMatches[0], matchReason: "name_match_no_id" } as RowStatus, index };
          }
          return { row, status: { type: "new" } as RowStatus, index };
        }

        const idKey = `${row.id_type}::${row.id_number}`.toLowerCase();
        if (idMap.has(idKey)) {
          return { row, status: { type: "confirmed_duplicate", existingBen: idMap.get(idKey)! } as RowStatus, index };
        }

        const nameKey = row.full_name.toLowerCase().trim().replace(/\s+/g, " ");
        const nameMatches = (nameMap.get(nameKey) || []).filter(b => {
          const ageDiff = Math.abs(parseInt(b.age) - parseInt(row.age || "0"));
          return b.woreda === row.woreda || ageDiff <= 2;
        });

        if (nameMatches.length > 0) {
          return { row, status: { type: "possible_duplicate", existingBen: nameMatches[0], matchReason: "name_woreda_age_match" } as RowStatus, index };
        }

        return { row, status: { type: "new" } as RowStatus, index };
      });

      setClassifications(results);
    } catch (err) {
      toast.error("Failed to analyze data");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startImport = async () => {
    setIsImporting(true)

    const currentResults = {
      created: [] as any[],
      enrollmentsCreated: 0,
      confirmedDuplicates: [] as any[],
      enrollmentsSkipped: [] as any[],
      possibleDuplicates: [] as any[],
      skipped: [] as any[],
      errors: [] as any[],
    }

    // Collect possible duplicates and skipped rows immediately
    // (no API calls needed for these)
    classifications.forEach(({ row, status, index }) => {
      const rowNum = index + 3
      if (status.type === "skip") {
        currentResults.skipped.push({ rowNum, name: row.full_name, reason: status.reason })
      } else if (status.type === "possible_duplicate") {
        currentResults.possibleDuplicates.push({
          rowNum,
          full_name: row.full_name,
          id_type: row.id_type,
          id_number: row.id_number,
          age: row.age,
          woreda: row.woreda,
          phone: row.phone,
          category: row.category,
          support_range: row.support_range,
          matched_name: status.existingBen?.full_name || "",
          matched_ben_id: status.existingBen?.ben_id || "",
          match_reason: status.matchReason || "",
        })
      }
    })

    const newRows = classifications.filter(c => c.status.type === "new")
    const confirmedRows = classifications.filter(c => c.status.type === "confirmed_duplicate")

    const sessionRes = await fetch("/api/auth/session")
    const sessionData = await sessionRes.json()
    const staffName = sessionData?.user?.name || ""

    // Step 1: Batch create all new beneficiaries (1 API call total)
    if (newRows.length > 0) {
      try {
        const benRes = await fetch("/api/import/beneficiaries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rows: newRows.map(c => c.row),
            registered_by: staffName,
          }),
        })
        const benData = await benRes.json()

        if (!benRes.ok) {
          // If batch fails, mark all new rows as errors
          newRows.forEach(({ row, index }) => {
            currentResults.errors.push({
              rowNum: index + 3,
              name: row.full_name,
              message: benData.error || "Batch creation failed",
            })
          })
        } else {
          const assignedIds: string[] = benData.ben_ids || []
          newRows.forEach((c, i) => {
            if (assignedIds[i]) {
              currentResults.created.push({ ...c.row, ben_id: assignedIds[i] })
            }
          })
        }
      } catch (err: any) {
        newRows.forEach(({ row, index }) => {
          currentResults.errors.push({ rowNum: index + 3, name: row.full_name, message: err.message })
        })
      }
    }

    setProcessedCount(newRows.length)

    // Step 2: Batch create all enrollments (1 API call total)
    // Combine new beneficiaries (if created) + confirmed duplicates
    const enrollmentsToSend = [
      ...currentResults.created.map(ben => ({
        ben_id: ben.ben_id,
        start_date: resolveStartDate(ben.registered_date, selectedProject?.start_date || ""),
        end_date: selectedProject?.end_date || "",
        support_range: ben.support_range || "",
        notes: ben.notes || "",
      })),
      ...confirmedRows.map(c => ({
        ben_id: (c.status as any).existingBen.ben_id,
        start_date: resolveStartDate(c.row.registered_date, selectedProject?.start_date || ""),
        end_date: selectedProject?.end_date || "",
        support_range: c.row.support_range || "",
        notes: c.row.notes || "",
      })),
    ]

    if (enrollmentsToSend.length > 0) {
      try {
        const enrRes = await fetch("/api/import/enrollments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enrollments: enrollmentsToSend,
            project_id: selectedProjectId,
            aoi_category: selectedProject?.aoi_category || "",
            ngo_id: selectedProject?.ngo_id || "",
            enrolled_by: staffName,
          }),
        })
        const enrData = await enrRes.json()

        if (enrRes.ok) {
          currentResults.enrollmentsCreated = enrData.enrolled || 0
          const dupCount = enrData.duplicates || 0
          if (dupCount > 0) {
            for (let i = 0; i < dupCount; i++) {
              currentResults.enrollmentsSkipped.push({ message: "Duplicate enrollment" })
            }
          }
        } else {
          currentResults.errors.push({ rowNum: 0, name: "Enrollment batch", message: enrData.error })
        }
      } catch (err: any) {
        currentResults.errors.push({ rowNum: 0, name: "Enrollment batch", message: err.message })
      }
    }

    // Populate confirmedDuplicates for the results table
    confirmedRows.forEach(c => {
      currentResults.confirmedDuplicates.push({
        rowNum: c.index + 3,
        name: c.row.full_name,
        ben_id: (c.status as any).existingBen.ben_id,
        status: "enrolled",
      })
    })

    setProcessedCount(classifications.length)
    setResults(currentResults)
    setIsImporting(false)
  }

  function resolveStartDate(rowDate: string, projectStartDate: string): string {
    const trimmed = String(rowDate || "").trim()
    if (trimmed.length >= 8 && !isNaN(Date.parse(trimmed))) return trimmed
    if (projectStartDate && projectStartDate.length >= 8 &&
        !isNaN(Date.parse(projectStartDate))) return projectStartDate
    return new Date().toISOString().split("T")[0]
  }

  const downloadPossibleDuplicates = () => {
    if (!results || results.possibleDuplicates.length === 0) {
      toast.error("No possible duplicates to download")
      return
    }
    const data = results.possibleDuplicates
    if (!data[0]) return

    const headers = [
      "row_number", "full_name", "id_type", "id_number", "age",
      "woreda", "phone", "category", "support_range",
      "matched_name", "matched_ben_id", "match_reason"
    ]

    const escapeCSV = (val: any): string => {
      const str = String(val ?? "")
      if (str.includes(",") || str.includes("\n") || str.includes('"')) {
        return '"' + str.replace(/"/g, '""') + '"'
      }
      return str
    }

    const csvRows = [
      headers.join(","),
      ...data.map(row =>
        headers.map(h => escapeCSV(row[h] ?? row[h.replace("row_number", "rowNum")] ?? "")).join(",")
      )
    ]

    const csvString = "\uFEFF" + csvRows.join("\n")
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `possible_duplicates_${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const summary = useMemo(() => {
    const counts = { new: 0, confirmed: 0, possible: 0, skip: 0 };
    classifications.forEach(c => {
      if (c.status.type === "new") counts.new++;
      else if (c.status.type === "confirmed_duplicate") counts.confirmed++;
      else if (c.status.type === "possible_duplicate") counts.possible++;
      else if (c.status.type === "skip") counts.skip++;
    });
    return counts;
  }, [classifications]);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">{t("import.title")}</h1>
        <p className="text-gray-600 mt-2">{t("import.subtitle")}</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between mb-10 overflow-x-auto pb-4 no-print">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
              step >= s ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-300 text-gray-400"
            }`}>
              {step > s ? <Check size={20} /> : s}
            </div>
            <span className={`ml-3 whitespace-nowrap font-medium ${step >= s ? "text-blue-600" : "text-gray-400"}`}>
              {t(`import.step${s}`)}
            </span>
            {s < 4 && <div className={`w-12 h-0.5 mx-4 ${step > s ? "bg-blue-600" : "bg-gray-200"}`} />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[400px]">
        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="p-8">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8 flex gap-4">
              <div className="mt-1 text-blue-600"><Info size={24} /></div>
              <div>
                <h3 className="font-bold text-blue-900">{t("import.templateNotice")}</h3>
                <p className="text-blue-800 text-sm mt-1">{t("import.templateDescription")}</p>
                <div className="mt-3 overflow-x-auto rounded-lg border border-blue-200">
                  <table className="text-xs w-full border-collapse">
                    <tbody>
                      <tr className="bg-blue-100">
                        <td colSpan={6} className="px-2 py-1.5 font-medium text-blue-900 border border-blue-200">
                          {t("import.templateRow1")} <span className="italic">["Organization Name): ___"]</span>
                        </td>
                      </tr>
                      <tr className="bg-blue-50 font-bold text-blue-800">
                        {["Full Name","Sex","Age","woreda","Phone","ID Number","..."].map(h => (
                          <td key={h} className="px-2 py-1 border border-blue-200 whitespace-nowrap">{h}</td>
                        ))}
                      </tr>
                      <tr className="text-gray-500 italic">
                        {["Amina Yusuf","Female","35","5","0911...","ET123...","..."].map((v,i) => (
                          <td key={i} className="px-2 py-1 border border-blue-200 whitespace-nowrap">{v}</td>
                        ))}
                      </tr>
                      <tr className="text-gray-400 italic">
                        {["Tesfaye Bekele","Male","47","3","0922...","P998...","..."].map((v,i) => (
                          <td key={i} className="px-2 py-1 border border-blue-200 whitespace-nowrap">{v}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
                <label className="flex items-center mt-4 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={confirmTemplate} 
                    onChange={e => setConfirmTemplate(e.target.checked)}
                    className="w-5 h-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-3 text-blue-900 font-medium group-hover:underline">{t("import.confirmTemplate")}</span>
                </label>
              </div>
            </div>

            <div 
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                file ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200 hover:border-blue-400"
              }`}
              style={{ minHeight: "120px" }}
            >
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                onChange={handleFileChange}
                className="hidden" 
                id="fileInput"
              />
              <label htmlFor="fileInput" className="cursor-pointer flex flex-col items-center">
                {file ? (
                  <div className="text-green-600">
                    <Check size={48} className="mx-auto mb-4" />
                    <p className="font-bold text-lg">{file.name}</p>
                    <p className="text-sm">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div className="text-gray-500">
                    <Upload size={48} className="mx-auto mb-4" />
                    <p className="font-medium text-lg">{t("import.dropzone")}</p>
                    <p className="text-sm mt-1">{t("import.acceptedFormats")}</p>
                  </div>
                )}
              </label>
            </div>

            {mappedRows.length > 0 && (
              <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-gray-800">{t("import.preview")}</h4>
                  <p className="text-sm text-gray-500">{mappedRows.length} {t("import.rowsFound")}</p>
                </div>
                <div className="overflow-x-auto border rounded-xl">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Full Name</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Category</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">ID Type</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">ID Number</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Support Range</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Woreda</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {mappedRows.slice(0, 3).map((row, i) => (
                        <tr key={i}>
                          <td className="px-4 py-3">{row.full_name}</td>
                          <td className="px-4 py-3">{row.category}</td>
                          <td className="px-4 py-3">{row.id_type}</td>
                          <td className="px-4 py-3">{row.id_number}</td>
                          <td className="px-4 py-3">{row.support_range}</td>
                          <td className="px-4 py-3">{row.woreda}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-8 flex justify-end">
              <button
                disabled={!file || !confirmTemplate}
                onClick={() => setStep(2)}
                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {t("common.next")} <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: NGO */}
        {step === 2 && (
          <div className="p-8">
            <div className="mb-8">
              <label className="block text-sm font-bold text-gray-700 mb-2">{t("import.orgName")}</label>
              <div className="flex items-center gap-4">
                <input 
                  type="text" 
                  value={editedOrgName}
                  onChange={e => setEditedOrgName(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                  {extractedOrgName ? t("import.detectedOrg") : t("import.notDetected")}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div 
                className={`p-6 border-2 rounded-2xl cursor-pointer transition-all ${
                  ngoMode === "existing" ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-blue-300"
                }`}
                onClick={() => setNgoMode("existing")}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    ngoMode === "existing" ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300"
                  }`}>
                    {ngoMode === "existing" && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <h3 className="font-bold text-gray-800">{t("import.selectExistingNgo")}</h3>
                </div>
                {ngoMode === "existing" && (
                  <select
                    value={selectedNgoId}
                    onChange={e => setSelectedNgoId(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">-- {t("import.selectExistingNgo")} --</option>
                    {ngos && (ngos as any[]).map(n => (
                      <option key={n.ngo_id} value={n.ngo_id}>{n.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div 
                className={`p-6 border-2 rounded-2xl cursor-pointer transition-all ${
                  ngoMode === "new" ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-blue-300"
                }`}
                onClick={() => setNgoMode("new")}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    ngoMode === "new" ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300"
                  }`}>
                    {ngoMode === "new" && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <h3 className="font-bold text-gray-800">{t("import.registerNewNgo")}</h3>
                </div>
                {ngoMode === "new" && (
                  <div className="bg-white p-6 rounded-xl border">
                    <NgoForm 
                      compact 
                      initialValues={{ name: editedOrgName }}
                      onSuccess={(res) => {
                        setSelectedNgoId(res.ngo_id);
                        setStep(3);
                      }}
                      submitLabel={t("import.registerAndContinue")}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="text-gray-600 px-6 py-3 rounded-xl font-bold hover:bg-gray-100 flex items-center gap-2"
              >
                <ChevronLeft size={20} /> {t("common.back")}
              </button>
              <button
                disabled={ngoMode === "new" || !selectedNgoId}
                onClick={() => setStep(3)}
                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {t("common.next")} <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Project */}
        {step === 3 && (
          <div className="p-8">
            <div className="mb-8 p-4 bg-gray-50 rounded-xl flex justify-between items-center border">
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">{t("import.ngoLabel")}</p>
                <h3 className="font-bold text-gray-800">{(ngos as any[]).find(n => n.ngo_id === selectedNgoId)?.name}</h3>
              </div>
              <button onClick={() => setStep(2)} className="text-blue-600 text-sm font-bold hover:underline">{t('import.changeNGO')}</button>
            </div>

            <div className="space-y-4">
              <div 
                className={`p-6 border-2 rounded-2xl cursor-pointer transition-all ${
                  projectMode === "existing" ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-blue-300"
                } ${projects && projects.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => projects && projects.length > 0 && setProjectMode("existing")}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    projectMode === "existing" ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300"
                  }`}>
                    {projectMode === "existing" && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <h3 className="font-bold text-gray-800">{t("import.selectExistingProject")}</h3>
                </div>
                {projectMode === "existing" && (
                  <select
                    value={selectedProjectId}
                    onChange={e => {
                      const pid = e.target.value;
                      setSelectedProjectId(pid);
                      if (projects) {
                        const proj = (projects as any[]).find(p => p.project_id === pid);
                        setSelectedProject(proj || null);
                      }
                    }}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">-- {t("import.selectExistingProject")} --</option>
                    {projects && (projects as any[]).map(p => (
                      <option key={p.project_id} value={p.project_id}>
                        {p.project_title} ({p.aoi_category})
                      </option>
                    ))}
                  </select>
                )}
                {projects && projects.length === 0 && (
                  <p className="text-sm text-amber-600 font-medium italic">{t("import.noProjectsForNgo")}</p>
                )}
              </div>

              <div 
                className={`p-6 border-2 rounded-2xl cursor-pointer transition-all ${
                  projectMode === "new" ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-blue-300"
                }`}
                onClick={() => setProjectMode("new")}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    projectMode === "new" ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300"
                  }`}>
                    {projectMode === "new" && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <h3 className="font-bold text-gray-800">{t("import.registerNewProject")}</h3>
                </div>
                {projectMode === "new" && (
                  <div className="bg-white p-6 rounded-xl border">
                    <ProjectForm 
                      compact 
                      ngo_id={selectedNgoId}
                      onSuccess={(res) => {
                        setSelectedProjectId(res.project_id);
                        setSelectedProject(res);
                        startAnalysis();
                      }}
                      submitLabel={t("import.registerAndContinue")}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="text-gray-600 px-6 py-3 rounded-xl font-bold hover:bg-gray-100 flex items-center gap-2"
              >
                <ChevronLeft size={20} /> {t("common.back")}
              </button>
              <button
                disabled={projectMode === "new" || !selectedProjectId}
                onClick={startAnalysis}
                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {t("common.next")} <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Review & Import */}
        {step === 4 && (
          <div className="p-8">
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-lg font-bold text-gray-700">Analyzing data for duplicates...</p>
              </div>
            ) : results ? (
              /* Results Screen */
              <div>
                {importError && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
                    <p className="font-bold">Import Error:</p>
                    <p>{importError}</p>
                  </div>
                )}
                <div className="mb-8 border-b pb-6 text-center">
                  <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check size={40} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">{t("import.resultsTitle")}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                  <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                    <p className="text-2xl font-bold text-green-700">{results.created.length}</p>
                    <p className="text-sm text-green-800">{t("import.beneficiariesRegistered")}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                    <p className="text-2xl font-bold text-green-700">{results.enrollmentsCreated}</p>
                    <p className="text-sm text-green-800">{t("import.enrollmentsCreated")}</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-2xl font-bold text-blue-700">{results.confirmedDuplicates.length}</p>
                    <p className="text-sm text-blue-800">{t("import.confirmedDuplicates")}</p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                    <p className="text-2xl font-bold text-amber-700">{results.possibleDuplicates.length}</p>
                    <p className="text-sm text-amber-800">{t("import.possibleDuplicates")}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-2xl font-bold text-gray-700">{results.skipped.length}</p>
                    <p className="text-sm text-gray-800">{t("import.rowsSkipped")}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                    <p className="text-2xl font-bold text-red-700">{results.errors.length}</p>
                    <p className="text-sm text-red-800">{t("import.errorsOccurred")}</p>
                  </div>
                </div>

                {/* Confirmed Duplicates Table */}
                <details className="mb-4 bg-white border rounded-xl overflow-hidden group">
                  <summary className="p-4 font-bold text-gray-800 cursor-pointer hover:bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Info size={18} className="text-blue-500" />
                      {t("import.confirmedDuplicatesSection")} ({results.confirmedDuplicates.length})
                    </div>
                    <ChevronRight size={20} className="group-open:rotate-90 transition-transform" />
                  </summary>
                  <div className="p-4 border-t overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-3 py-2 text-left">{t("import.rowNum")}</th>
                          <th className="px-3 py-2 text-left">{t("registerForm.fullName")}</th>
                          <th className="px-3 py-2 text-left">{t("import.matchedTo")} (ben_id)</th>
                          <th className="px-3 py-2 text-left">{t("import.enrollmentStatus")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {results.confirmedDuplicates.map((d, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2">{d.rowNum}</td>
                            <td className="px-3 py-2 font-medium">{d.name}</td>
                            <td className="px-3 py-2 text-gray-500">{d.ben_id}</td>
                            <td className="px-3 py-2">
                              {d.status === "enrolled" ? (
                                <span className="text-green-600 font-medium">{t("import.enrolled")}</span>
                              ) : (
                                <span className="text-amber-600 font-medium">{t("import.alreadyEnrolled")}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>

                {/* Possible Duplicates Table */}
                <details className="mb-4 bg-white border rounded-xl overflow-hidden group">
                  <summary className="p-4 font-bold text-gray-800 cursor-pointer hover:bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={18} className="text-amber-500" />
                      {t("import.possibleDuplicatesSection")} ({results.possibleDuplicates.length})
                    </div>
                    <ChevronRight size={20} className="group-open:rotate-90 transition-transform" />
                  </summary>
                  <div className="p-4 border-t overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-3 py-2 text-left">{t("import.rowNum")}</th>
                          <th className="px-3 py-2 text-left">{t("registerForm.fullName")}</th>
                          <th className="px-3 py-2 text-left">{t("registerForm.idNumber")}</th>
                          <th className="px-3 py-2 text-left">{t("registerForm.age")}</th>
                          <th className="px-3 py-2 text-left">{t("registerForm.woreda")}</th>
                          <th className="px-3 py-2 text-left">{t("import.matchReason")}</th>
                          <th className="px-3 py-2 text-left">{t("import.matchedTo")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {results.possibleDuplicates.map((d, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2">{d.rowNum}</td>
                            <td className="px-3 py-2 font-medium">{d.full_name}</td>
                            <td className="px-3 py-2">{d.id_number}</td>
                            <td className="px-3 py-2">{d.age}</td>
                            <td className="px-3 py-2">{d.woreda}</td>
                            <td className="px-3 py-2 text-amber-600">{t(`import.matchReason_${d.match_reason}`)}</td>
                            <td className="px-3 py-2">{d.matched_name} ({d.matched_ben_id})</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>

                {/* Errors Table */}
                {results.errors.length > 0 && (
                  <details className="mb-4 bg-white border rounded-xl overflow-hidden group">
                    <summary className="p-4 font-bold text-gray-800 cursor-pointer hover:bg-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <X size={18} className="text-red-500" />
                        {t("import.errorsSection")} ({results.errors.length})
                      </div>
                      <ChevronRight size={20} className="group-open:rotate-90 transition-transform" />
                    </summary>
                    <div className="p-4 border-t overflow-x-auto">
                      <table className="w-full text-sm text-red-600">
                        <thead className="bg-red-50 border-b">
                          <tr>
                            <th className="px-3 py-2 text-left">{t("import.rowNum")}</th>
                            <th className="px-3 py-2 text-left">{t("registerForm.fullName")}</th>
                            <th className="px-3 py-2 text-left">{t("import.errorMessage")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {results.errors.map((e, i) => (
                            <tr key={i}>
                              <td className="px-3 py-2 font-bold">{e.rowNum}</td>
                              <td className="px-3 py-2">{e.name}</td>
                              <td className="px-3 py-2 font-medium">{e.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                )}

                <div className="flex flex-col md:flex-row gap-4 mt-10 no-print">
                  <button
                    onClick={downloadPossibleDuplicates}
                    className="flex-1 bg-amber-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-amber-700 flex items-center justify-center gap-2"
                  >
                    <Download size={20} /> {t("import.downloadPossibleDuplicates")}
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex-1 bg-gray-800 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-900 flex items-center justify-center gap-2"
                  >
                    <Printer size={20} /> {t("import.printReport")}
                  </button>
                </div>

                <div className="flex flex-col md:flex-row gap-4 mt-4 no-print border-t pt-8">
                  <button
                    onClick={() => {
                      setStep(1);
                      setFile(null);
                      setResults(null);
                      setClassifications([]);
                    }}
                    className="flex-1 border border-blue-600 text-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-50"
                  >
                    {t("import.importAnother")}
                  </button>
                  <Link
                    href="/beneficiaries"
                    className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center"
                  >
                    {t("import.viewBeneficiaries")}
                  </Link>
                </div>

                {/* Print Report Template (Hidden on screen) */}
                <div className="hidden print:block p-8">
                  <div className="text-center border-b-2 border-gray-900 pb-4 mb-8">
                    <h1 className="text-2xl font-bold uppercase">Women, Children and Social Affairs Office</h1>
                    <h2 className="text-xl font-bold uppercase">Gullele Sub-City — Addis Ababa</h2>
                    <p className="mt-2 font-bold text-lg">Beneficiary Import Report</p>
                    <p className="text-sm">Date: {new Date().toLocaleString()}</p>
                  </div>

                  <div className="mb-8 bg-gray-50 p-6 rounded border">
                    <h3 className="font-bold mb-4 border-b">Summary</h3>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <p>NGO:</p> <p className="font-bold">{(ngos as any[]).find(n => n.ngo_id === selectedNgoId)?.name}</p>
                      <p>Project:</p> <p className="font-bold">{(projects as any[]).find(p => p.project_id === selectedProjectId)?.project_title}</p>
                      <p>New Beneficiaries Created:</p> <p className="font-bold">{results.created.length}</p>
                      <p>Enrollments Created:</p> <p className="font-bold">{results.enrollmentsCreated}</p>
                      <p>Confirmed Duplicates Matched:</p> <p className="font-bold">{results.confirmedDuplicates.length}</p>
                      <p>Possible Duplicates Skipped:</p> <p className="font-bold">{results.possibleDuplicates.length}</p>
                      <p>Errors Occurred:</p> <p className="font-bold">{results.errors.length}</p>
                    </div>
                  </div>

                  <h3 className="font-bold mb-4 border-b">Possible Duplicates (Requires Review)</h3>
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b-2">
                        <th className="text-left py-2 px-1">Row</th>
                        <th className="text-left py-2 px-1">Name</th>
                        <th className="text-left py-2 px-1">ID</th>
                        <th className="text-left py-2 px-1">Match Reason</th>
                        <th className="text-left py-2 px-1">Matched To</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-300">
                      {results.possibleDuplicates.map((d, i) => (
                        <tr key={i}>
                          <td className="py-2 px-1">{d.rowNum}</td>
                          <td className="py-2 px-1 font-bold">{d.full_name}</td>
                          <td className="py-2 px-1">{d.id_number}</td>
                          <td className="py-2 px-1">{t(`import.matchReason_${d.match_reason}`)}</td>
                          <td className="py-2 px-1">{d.matched_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : isImporting ? (
              /* Import Progress Screen */
              <div className="flex flex-col items-center justify-center py-20 px-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">{t("import.importing")}</h2>
                <div className="flex items-center gap-3 mt-4">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <p className="font-bold text-blue-600 text-lg">{importStatus}</p>
                </div>
                <p className="mt-2 text-gray-500 text-sm">Please wait, this may take a moment...</p>
              </div>
            ) : (
              /* Classification Review Screen */
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-6">{t("import.reviewTitle")}</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="p-4 bg-gray-50 rounded-xl border flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">{t("import.ngoLabel")}</p>
                      <h3 className="font-bold text-gray-800">{(ngos as any[]).find(n => n.ngo_id === selectedNgoId)?.name}</h3>
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl border flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">{t("import.projectLabel")}</p>
                      <h3 className="font-bold text-gray-800">{(projects as any[]).find(p => p.project_id === selectedProjectId)?.project_title}</h3>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mb-10">
                  <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-xl text-green-800">
                    <Check size={20} className="text-green-600" />
                    <span className="font-bold">{summary.new}</span> {t("import.newRows")}
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-800">
                    <Info size={20} className="text-blue-600" />
                    <span className="font-bold">{summary.confirmed}</span> {t("import.confirmedDuplicateRows")}
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-800">
                    <AlertTriangle size={20} className="text-amber-600" />
                    <span className="font-bold">{summary.possible}</span> {t("import.possibleDuplicateRows")}
                  </div>
                  {summary.skip > 0 && (
                    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-800">
                      <X size={20} className="text-red-600" />
                      <span className="font-bold">{summary.skip}</span> {t("import.skipRows")}
                    </div>
                  )}
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setStep(3)}
                    className="text-gray-600 px-6 py-3 rounded-xl font-bold hover:bg-gray-100 flex items-center gap-2"
                  >
                    <ChevronLeft size={20} /> {t("common.back")}
                  </button>
                  <button
                    onClick={startImport}
                    className="bg-blue-600 text-white px-10 py-4 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200"
                  >
                    {t("import.startImport")}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .max-w-5xl { max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
          .bg-white { box-shadow: none !important; border: none !important; }
        }
      `}</style>
    </div>
  );
}
