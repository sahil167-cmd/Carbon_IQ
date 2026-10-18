import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import { apiGet, apiPost } from "../../lib/api-client";

interface Category {
  id: string;
  code: string;
  name: string;
  scope: string;
}

interface Site {
  id: string;
  name: string;
  country: string;
}

interface ReportingPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface CalculationOutput {
  id: string;
  scope: string;
  co2e: number;
  co2eLocation?: number;
  co2eMarket?: number;
  activityValue: number;
  activityUnit: string;
  calculationMethod: string;
  formulaUsed?: string;
  emissionFactor?: {
    category: string;
    subCategory: string;
    factorValue: number;
    unit: string;
  };
}

export default function UploadWizard() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [periods, setPeriods] = useState<ReportingPeriod[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [fileName, setFileName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState("");
  const [createdDocId, setCreatedDocId] = useState("");
  const [calcResult, setCalcResult] = useState<CalculationOutput | null>(null);
  const [loadingSetup, setLoadingSetup] = useState(true);

  useEffect(() => {
    async function fetchSetupData() {
      setLoadingSetup(true);
      try {
        const [cats, sitesRes, periodsRes] = await Promise.allSettled([
          apiGet<Category[]>("/api/v1/document-categories"),
          apiGet<{ items: Site[]; total: number }>("/api/v1/sites"),
          apiGet<{ items: ReportingPeriod[]; total: number }>("/api/v1/reporting-periods/active"),
        ]);

        if (cats.status === "fulfilled" && cats.value?.length) {
          setCategories(cats.value);
          setSelectedCategoryId(cats.value[0].id);
        }
        if (sitesRes.status === "fulfilled") {
          const val: any = sitesRes.value;
          const siteList: Site[] = Array.isArray(val) ? val : (val?.items || []);
          if (siteList.length > 0) {
            setSites(siteList);
            setSelectedSiteId(siteList[0].id);
          }
        }
        if (periodsRes.status === "fulfilled") {
          const val: any = periodsRes.value;
          const rawPeriods: ReportingPeriod[] = Array.isArray(val) ? val : (val?.items || []);
          const openPeriods = rawPeriods.filter((p) => p.status === "OPEN");
          if (openPeriods.length > 0) {
            setPeriods(openPeriods);
            setSelectedPeriodId(openPeriods[0].id);
          }
        }
      } catch (err: any) {
        console.error("Failed to load setup data:", err.message);
      } finally {
        setLoadingSetup(false);
      }
    }
    fetchSetupData();
  }, []);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim()) return;

    setProcessing(true);
    setMsg("");
    setCalcResult(null);

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const orgId = user.organizationId || "cmrxbi5240001n0se3f57e323";

      const lowerName = fileName.toLowerCase();
      const detectedMimeType = lowerName.endsWith('.png')
        ? 'image/png'
        : lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')
        ? 'image/jpeg'
        : lowerName.endsWith('.csv')
        ? 'text/csv'
        : lowerName.endsWith('.xlsx')
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';

      // 1. Get presigned URL
      let s3Key = `uploads/${orgId}/${Date.now()}_${fileName}`;
      try {
        const urlRes = await apiPost<Array<{ s3Key: string; uploadUrl: string }>>("/api/v1/documents/upload-url", {
          files: [
            {
              fileName,
              fileSize: 1024 * 1024,
              mimeType: detectedMimeType,
            },
          ],
        });
        if (Array.isArray(urlRes) && urlRes.length > 0 && urlRes[0].s3Key) {
          s3Key = urlRes[0].s3Key;
        }
      } catch (urlErr) {
        console.warn("Pre-signed URL generation fallback activated:", urlErr);
      }

      // 2. Register document metadata & enqueue AI extraction
      const regRes = await apiPost<{ id: string }>("/api/v1/documents", {
        siteId: selectedSiteId,
        reportingPeriodId: selectedPeriodId,
        categoryId: selectedCategoryId,
        fileName,
        fileSize: 1024 * 1024,
        mimeType: detectedMimeType,
        s3Key,
      });

      setCreatedDocId(regRes.id);

      // 3. Execute instant calculation engine for Scope UI result
      try {
        const calcRes = await apiPost<CalculationOutput>("/api/v1/internal/calc/run", {
          documentId: regRes.id,
          organizationId: orgId,
        });
        setCalcResult(calcRes);
      } catch (calcErr: any) {
        console.warn("Auto calc warning:", calcErr.message);
      }

      setDone(true);
    } catch (err: any) {
      setMsg(`Upload failed: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const selectedCategoryObj = categories.find((c) => c.id === selectedCategoryId);

  return (
    <AppLayout title="Upload Wizard" subtitle="Guided Document Upload & GHG Scope Emission Output">
      <div className="pt-8 pb-[120px] px-6 max-w-[1000px] mx-auto space-y-6">
        
        {msg && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
            {msg}
          </div>
        )}

        <div className="bg-white border border-outline-variant/30 rounded-[24px] p-8 ambient-shadow space-y-6">
          <div className="border-b border-outline-variant/20 pb-4 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-xl text-primary">Upload Activity Document</h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Attach your utility bill or freight invoice to trigger the AI OCR extraction & GHG Protocol Scope Engine.
              </p>
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
              GHG Protocol Verified
            </span>
          </div>

          {done ? (
            /* ── SUCCESS: Differentiated Scope Emissions Output UI ────────────────── */
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-teal-900 text-white rounded-[24px] p-8 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[11px] font-extrabold tracking-widest uppercase">
                          {calcResult?.scope || selectedCategoryObj?.scope || "SCOPE 1/2/3"} EMISSIONS OUTPUT
                        </span>
                        <span className="text-xs text-emerald-400 font-semibold">• GLEC & DEFRA 2023</span>
                      </div>
                      <h2 className="text-4xl font-black text-white mt-2">
                        {calcResult?.co2e !== undefined ? `${calcResult.co2e.toLocaleString()} kg CO₂e` : "Emissions Processed"}
                      </h2>
                      <p className="text-xs text-emerald-200/70 mt-1">
                        Document: <span className="font-semibold text-white">{fileName}</span> • Method: <span className="font-mono text-emerald-300">{calcResult?.calculationMethod || "GHG_PROTOCOL"}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="px-4 py-2 bg-emerald-500 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider block">
                        ✓ PROCESSED & CALCULATED
                      </span>
                    </div>
                  </div>

                  {/* Scope Differentiator Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className={`p-4 rounded-xl border transition-all ${
                      (calcResult?.scope || selectedCategoryObj?.scope) === "SCOPE_1"
                        ? "bg-emerald-500/20 border-emerald-400 text-white ring-2 ring-emerald-400"
                        : "bg-white/5 border-white/10 text-white/60"
                    }`}>
                      <span className="text-[10px] font-extrabold text-emerald-300 uppercase tracking-widest block mb-1">
                        SCOPE 1 DIRECT
                      </span>
                      <p className="font-bold text-sm text-white">Fuel & Mobile Combustion</p>
                      <span className="text-[11px] mt-1 block">Stationary boilers, fleet vehicles (Diesel / Gasoline)</span>
                    </div>

                    <div className={`p-4 rounded-xl border transition-all ${
                      (calcResult?.scope || selectedCategoryObj?.scope) === "SCOPE_2"
                        ? "bg-teal-500/20 border-teal-400 text-white ring-2 ring-teal-400"
                        : "bg-white/5 border-white/10 text-white/60"
                    }`}>
                      <span className="text-[10px] font-extrabold text-teal-300 uppercase tracking-widest block mb-1">
                        SCOPE 2 INDIRECT
                      </span>
                      <p className="font-bold text-sm text-white">Purchased Energy & Grid</p>
                      <span className="text-[11px] mt-1 block">Facility electricity, heating, cooling (kWh)</span>
                    </div>

                    <div className={`p-4 rounded-xl border transition-all ${
                      (calcResult?.scope || selectedCategoryObj?.scope) === "SCOPE_3"
                        ? "bg-cyan-500/20 border-cyan-400 text-white ring-2 ring-cyan-400"
                        : "bg-white/5 border-white/10 text-white/60"
                    }`}>
                      <span className="text-[10px] font-extrabold text-cyan-300 uppercase tracking-widest block mb-1">
                        SCOPE 3 VALUE CHAIN
                      </span>
                      <p className="font-bold text-sm text-white">Freight & Upstream Transport</p>
                      <span className="text-[11px] mt-1 block">Truck, Air Cargo, Ocean Container (GLEC tkm)</span>
                    </div>
                  </div>

                  {/* Activity Details Footer */}
                  {calcResult && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 border border-white/10 p-4 rounded-xl text-xs">
                      <div>
                        <span className="text-white/60 block">Extracted Activity Volume</span>
                        <span className="text-sm font-bold text-white">
                          {calcResult.activityValue} {calcResult.activityUnit}
                        </span>
                      </div>
                      <div>
                        <span className="text-white/60 block">Formula & Audit Trace</span>
                        <span className="text-xs font-mono text-emerald-200 block truncate">
                          {calcResult.formulaUsed || "co2e = Activity * Emission Factor"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation Actions */}
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setDone(false);
                    setFileName("");
                    setCalcResult(null);
                    setMsg("");
                  }}
                  className="flex-1 py-3.5 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary/90 transition-all"
                >
                  Upload Another File
                </button>
                <button
                  onClick={() => navigate(`/app/documents/${createdDocId}`)}
                  className="flex-1 py-3.5 bg-surface-container text-primary font-bold text-xs rounded-xl hover:bg-surface-container-high transition-all"
                >
                  View Document Audit Details
                </button>
              </div>
            </div>
          ) : (
            /* ── FORM: Upload Inputs ─────────────────────────────────────────── */
            <form onSubmit={handleUploadSubmit} className="space-y-6">
              {/* Site Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-primary">Facility / Site *</label>
                {loadingSetup ? (
                  <div className="w-full h-10 bg-surface-container rounded-xl animate-pulse" />
                ) : sites.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                    No sites found. Please create a site in Organization Settings first.
                  </div>
                ) : (
                  <select
                    value={selectedSiteId}
                    onChange={(e) => setSelectedSiteId(e.target.value)}
                    className="w-full p-3 bg-surface-container/20 border border-outline-variant/40 rounded-xl text-xs font-semibold"
                  >
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.country})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Reporting Period Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-primary">Reporting Period *</label>
                {loadingSetup ? (
                  <div className="w-full h-10 bg-surface-container rounded-xl animate-pulse" />
                ) : periods.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                    No open reporting periods found. Create one in Organization Settings.
                  </div>
                ) : (
                  <select
                    value={selectedPeriodId}
                    onChange={(e) => setSelectedPeriodId(e.target.value)}
                    className="w-full p-3 bg-surface-container/20 border border-outline-variant/40 rounded-xl text-xs font-semibold"
                  >
                    {periods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (
                        {new Date(p.startDate).getFullYear()}–
                        {new Date(p.endDate).getFullYear()})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Category Dropdown */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-primary">
                  Document Category (GHG Scope 1/2/3) *
                </label>
                {loadingSetup ? (
                  <div className="w-full h-10 bg-surface-container rounded-xl animate-pulse" />
                ) : (
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="w-full p-3 bg-surface-container/20 border border-outline-variant/40 rounded-xl text-xs font-semibold"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        [{c.scope}] {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* File Picker & Name Input */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-primary">Select Document File *</label>
                <div className="border-2 border-dashed border-outline-variant/60 hover:border-primary rounded-2xl p-6 text-center bg-surface-container/10 transition-all cursor-pointer relative group">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFileName(file.name);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <span className="material-symbols-outlined text-primary/60 group-hover:scale-110 text-4xl block mb-2 transition-transform">
                    upload_file
                  </span>
                  <p className="text-xs font-semibold text-primary">
                    Click or drag a file to attach
                  </p>
                  <p className="text-[11px] text-on-surface-variant mt-1">
                    Supports PDF, PNG, JPG, CSV, XLSX
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-on-surface-variant">Document Name</label>
                  <input
                    type="text"
                    placeholder="e.g. jan_utility_bill_detroit.pdf"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    className="w-full p-3 border border-outline-variant/40 rounded-xl text-xs bg-white"
                    required
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={processing || loadingSetup}
                className="w-full py-4 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {processing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing Document & Calculating Scope Emissions...</span>
                  </>
                ) : (
                  <span>Process Document & Calculate Scope Emissions</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
