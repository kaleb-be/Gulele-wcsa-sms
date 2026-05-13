"use client";

import { useState, useEffect } from "react";

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

interface Service {
  service_id: string;
  service_name: string;
  description: string;
}

interface NGO {
  ngo_id: string;
  name: string;
  focus_areas: string;
  contact_person: string;
  phone: string;
  email: string;
  registration_number: string;
  start_date: string;
  status: string;
  notes: string;
}

interface NGOService {
  ngo_id: string;
  service_id: string;
  capacity: string;
}

interface ExistingRecord {
  record_id: string;
  ngo_id: string;
  ngo_name: string;
  service_name: string;
  start_date: string;
}

export default function AssignSupportPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedNgo, setSelectedNgo] = useState<NGO | null>(null);
  const [availableNgos, setAvailableNgos] = useState<NGO[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error" | "duplicate"; text: string; existingRecord?: ExistingRecord } | null>(null);

  const [search, setSearch] = useState("");
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [benLoading, setBenLoading] = useState(false);

  const [services, setServices] = useState<Service[]>([]);
  const [ngos, setNgos] = useState<NGO[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [ngoServiceLoading, setNgoServiceLoading] = useState(false);

  const [notes, setNotes] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [assignedBy, setAssignedBy] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!search.trim()) {
      setBeneficiaries([]);
      return;
    }
    const timer = setTimeout(() => {
      setBenLoading(true);
      fetch(`/api/beneficiaries?search=${encodeURIComponent(search)}`)
        .then((r) => r.json())
        .then(setBeneficiaries)
        .finally(() => setBenLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setServicesLoading(true);
    Promise.all([
      fetch("/api/services").then((r) => r.json()),
      fetch("/api/ngos").then((r) => r.json()),
    ])
      .then(([servicesData, ngosData]) => {
        setServices(servicesData);
        setNgos(ngosData);
      })
      .finally(() => setServicesLoading(false));
  }, []);

  const handleServiceSelect = async (service: Service) => {
    setSelectedService(service);
    setSelectedNgo(null);
    setAvailableNgos([]);
    setNgoServiceLoading(true);
    try {
      const res = await fetch("/api/ngo-services");
      const ngoServices: NGOService[] = await res.json();
      const filtered = ngoServices.filter(
        (ns) => ns.service_id === service.service_id
      );
      const matched = ngos.filter((ngo) =>
        filtered.some((ns) => ns.ngo_id === ngo.ngo_id)
      );
      setAvailableNgos(matched);
    } catch {
      setMessage({ type: "error", text: "Failed to load available NGOs." });
    } finally {
      setNgoServiceLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedBeneficiary || !selectedService || !selectedNgo) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/support-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ben_id: selectedBeneficiary.ben_id,
          ngo_id: selectedNgo.ngo_id,
          service_id: selectedService.service_id,
          assigned_by: assignedBy,
          notes,
          start_date: startDate,
        }),
      });

      if (res.status === 409) {
        const data = await res.json();
        setMessage({
          type: "duplicate",
          text: `This beneficiary is already receiving ${data.existingRecord.service_name} from ${data.existingRecord.ngo_name} since ${data.existingRecord.start_date}. You cannot assign the same service twice.`,
          existingRecord: data.existingRecord,
        });
        return;
      }

      if (!res.ok) throw new Error("Failed to assign support");
      setMessage({ type: "success", text: "Support assigned successfully!" });
    } catch {
      setMessage({ type: "error", text: "Failed to assign support. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setSelectedBeneficiary(null);
    setSelectedService(null);
    setSelectedNgo(null);
    setAvailableNgos([]);
    setMessage(null);
    setNotes("");
    setStartDate(new Date().toISOString().split("T")[0]);
    setAssignedBy("");
    setSearch("");
    setBeneficiaries([]);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Assign Support</h1>
      </div>

      <div className="flex items-center gap-0 mb-8">
        {[
          { num: 1, label: "Select Beneficiary" },
          { num: 2, label: "Select Service" },
          { num: 3, label: "Confirm & Submit" },
        ].map((step, i) => (
          <div key={step.num} className="flex items-center">
            {i > 0 && (
              <div
                className={`w-10 h-0.5 ${
                  currentStep > step.num - 1 ? "bg-green-500" : "bg-gray-300"
                }`}
              />
            )}
            <button
              onClick={() =>
                currentStep > step.num ? setCurrentStep(step.num) : null
              }
              disabled={step.num > currentStep}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                currentStep === step.num
                  ? "bg-blue-900 text-white"
                  : currentStep > step.num
                    ? "bg-green-100 text-green-800 cursor-pointer hover:bg-green-200"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep > step.num
                    ? "bg-green-500 text-white"
                    : currentStep === step.num
                      ? "bg-white/20 text-white"
                      : "bg-gray-200 text-gray-500"
                }`}
              >
                {currentStep > step.num ? "\u2713" : step.num}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          </div>
        ))}
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : message.type === "duplicate"
                ? "bg-red-50 border-2 border-red-400 text-red-800"
                : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          <p className="font-medium">
            {message.type === "success"
              ? "\u2705 Success"
              : message.type === "duplicate"
                ? "\u26A0\uFE0F Duplicate Assignment"
                : "\u274C Error"}
          </p>
          <p className="mt-1">{message.text}</p>
          {message.type === "duplicate" && message.existingRecord && (
            <div className="mt-3 p-3 bg-white rounded border border-red-200 text-sm space-y-1">
              <p>
                <span className="font-medium">Record ID:</span>{" "}
                {message.existingRecord.record_id}
              </p>
              <p>
                <span className="font-medium">NGO:</span>{" "}
                {message.existingRecord.ngo_name}
              </p>
              <p>
                <span className="font-medium">Service:</span>{" "}
                {message.existingRecord.service_name}
              </p>
              <p>
                <span className="font-medium">Start Date:</span>{" "}
                {message.existingRecord.start_date}
              </p>
            </div>
          )}
          {message.type === "success" && (
            <button
              onClick={resetForm}
              className="mt-3 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              Assign Another
            </button>
          )}
        </div>
      )}

      {currentStep === 1 && (
        <div>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search beneficiaries by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 w-full max-w-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      Name
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      Category
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      Kebele
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      Phone
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {benLoading ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-12 text-center text-gray-500"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-900" />
                          Searching...
                        </div>
                      </td>
                    </tr>
                  ) : beneficiaries.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        {search.trim()
                          ? "No beneficiaries found."
                          : "Type a name to search."}
                      </td>
                    </tr>
                  ) : (
                    beneficiaries.map((b) => (
                      <tr
                        key={b.ben_id}
                        onClick={() => setSelectedBeneficiary(b)}
                        className={`border-b border-gray-100 cursor-pointer transition-colors ${
                          selectedBeneficiary?.ben_id === b.ben_id
                            ? "bg-blue-50 border-blue-300"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {b.full_name}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {b.category}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{b.kebele}</td>
                        <td className="px-4 py-3 text-gray-600">{b.phone || "N/A"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {selectedBeneficiary && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-green-800 mb-2">
                Selected Beneficiary
              </h3>
              <div className="text-sm text-green-700 space-y-1">
                <p>
                  <span className="font-medium">Name:</span>{" "}
                  {selectedBeneficiary.full_name}
                </p>
                <p>
                  <span className="font-medium">Category:</span>{" "}
                  {selectedBeneficiary.category}
                </p>
                <p>
                  <span className="font-medium">Kebele:</span>{" "}
                  {selectedBeneficiary.kebele}
                </p>
                <p>
                  <span className="font-medium">Phone:</span>{" "}
                  {selectedBeneficiary.phone || "N/A"}
                </p>
                <p>
                  <span className="font-medium">ID:</span>{" "}
                  {selectedBeneficiary.id_number}
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setCurrentStep(2)}
              disabled={!selectedBeneficiary}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next: Select Service
            </button>
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <div>
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Select a Service
            </h2>
            {servicesLoading ? (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-900 mr-2" />
                Loading services...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {services.map((svc) => (
                  <button
                    key={svc.service_id}
                    onClick={() => handleServiceSelect(svc)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      selectedService?.service_id === svc.service_id
                        ? "border-blue-500 bg-blue-50 shadow-md"
                        : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm"
                    }`}
                  >
                    <p className="font-medium text-gray-800">
                      {svc.service_name}
                    </p>
                    {svc.description && (
                      <p className="text-xs text-gray-500 mt-1">
                        {svc.description}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedService && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Available NGOs for {selectedService.service_name}
              </h3>
              {ngoServiceLoading ? (
                <div className="flex items-center justify-center py-8 text-gray-500">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-900 mr-2" />
                  Loading NGOs...
                </div>
              ) : availableNgos.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
                  No NGOs currently offer this service.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {availableNgos.map((ngo) => (
                    <button
                      key={ngo.ngo_id}
                      onClick={() => setSelectedNgo(ngo)}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${
                        selectedNgo?.ngo_id === ngo.ngo_id
                          ? "border-blue-500 bg-blue-50 shadow-md"
                          : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm"
                      }`}
                    >
                      <p className="font-medium text-gray-800">{ngo.name}</p>
                      {ngo.focus_areas && (
                        <p className="text-xs text-gray-500 mt-1">
                          Focus: {ngo.focus_areas}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Status: {ngo.status}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              disabled={!selectedNgo}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next: Confirm
            </button>
          </div>
        </div>
      )}

      {currentStep === 3 && (
        <div>
          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">
                Assignment Summary
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">
                    Beneficiary
                  </p>
                  <p className="font-semibold text-gray-800">
                    {selectedBeneficiary?.full_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {selectedBeneficiary?.category} &middot;{" "}
                    {selectedBeneficiary?.kebele}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">
                    Service
                  </p>
                  <p className="font-semibold text-gray-800">
                    {selectedService?.service_name}
                  </p>
                  {selectedService?.description && (
                    <p className="text-sm text-gray-500">
                      {selectedService.description}
                    </p>
                  )}
                </div>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">
                    NGO
                  </p>
                  <p className="font-semibold text-gray-800">
                    {selectedNgo?.name}
                  </p>
                  {selectedNgo?.focus_areas && (
                    <p className="text-sm text-gray-500">
                      {selectedNgo.focus_areas}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assigned By
                  </label>
                  <input
                    type="text"
                    value={assignedBy}
                    onChange={(e) => setAssignedBy(e.target.value)}
                    placeholder="Your name"
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes..."
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-8 py-2 text-sm font-medium text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Assign Support"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
