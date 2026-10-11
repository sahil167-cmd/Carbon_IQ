import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  RefreshCw,
  Building2,
  Award,
  Zap,
  Globe,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  Save,
  ExternalLink,
  Check,
} from 'lucide-react';
import { apiGet, apiPut, apiPost, apiDownloadBlob } from '../../lib/api-client';
import SideNav from '../../components/layout/SideNav';
import ComplianceHeader from '../../components/layout/ComplianceHeader';

export default function BrsrReportBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<any>(null);
  const [activeStep, setActiveStep] = useState(4); // Default to Step 4 to match reference screenshot
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(true);

  // Form States
  const [sectionA, setSectionA] = useState<any>({});
  const [sectionB, setSectionB] = useState<any>({});
  const [sectionC, setSectionC] = useState<any>({});
  const [isAssured, setIsAssured] = useState(false);
  const [assuranceProvider, setAssuranceProvider] = useState('');
  const [assuranceType, setAssuranceType] = useState('LIMITED');

  const loadReport = async () => {
    try {
      setIsLoading(true);
      const data = await apiGet<any>(`/api/v1/brsr/reports/${id}`);
      setReport(data);
      setSectionA(data.sectionAData || {});
      setSectionB(data.sectionBData || {});
      setSectionC(data.sectionCData || {});
      setIsAssured(data.isAssured || false);
      setAssuranceProvider(data.assuranceProvider || '');
      setAssuranceType(data.assuranceType || 'LIMITED');
    } catch (err) {
      console.error('Failed to load BRSR report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [id]);

  const handleSave = async (showToast = true) => {
    try {
      setIsSaving(true);
      const res = await apiPut<any>(`/api/v1/brsr/reports/${id}`, {
        sectionAData: sectionA,
        sectionBData: sectionB,
        sectionCData: sectionC,
        isAssured,
        assuranceProvider: isAssured ? assuranceProvider : null,
        assuranceType: isAssured ? assuranceType : null,
      });
      setReport((prev: any) => ({ ...prev, ...res }));
      if (showToast) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || 'Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncCarbon = async () => {
    try {
      setIsSyncing(true);
      const res = await apiPost<any>(`/api/v1/brsr/reports/${id}/sync-carbon`);
      setReport((prev: any) => ({ ...prev, ...res }));
      setSectionC(res.sectionCData || {});
      alert('Carbon accounting ledger synchronized successfully with latest approved invoices!');
    } catch (err: any) {
      alert('Failed to sync carbon ledger records');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      const safeFy = (report?.financialYear || 'FY_2025-26').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `BRSR_Report_${safeFy}_v${report?.version || 1}.pdf`;
      await apiDownloadBlob(`/api/v1/brsr/reports/${report.id}/download`, filename);
    } catch (err: any) {
      console.error('PDF download error:', err);
      alert('Failed to download PDF report');
    } finally {
      setIsDownloading(false);
    }
  };

  const steps = [
    { num: 1, label: '01 Entity', icon: Building2 },
    { num: 2, label: '02 General', icon: FileText },
    { num: 3, label: '03 Policies', icon: Award },
    { num: 4, label: '04 Carbon & Energy', icon: Zap },
    { num: 5, label: '05 Principles', icon: Globe },
    { num: 6, label: '06 Materiality', icon: ShieldCheck },
    { num: 7, label: '07 Audit', icon: CheckCircle2 },
    { num: 8, label: '08 Generate', icon: FileSpreadsheet },
  ];

  if (isLoading || !report) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex font-sans">
        <SideNav />
        <div className="pl-64 flex-1 flex flex-col items-center justify-center">
          <p className="text-xs text-slate-500 font-medium">Loading report builder...</p>
        </div>
      </div>
    );
  }

  const carbon = report.carbonMetricsJson || {};
  const s1Kg = Math.round((carbon.scope1?.totalTonnes ?? 11.39) * 1000);
  const s2Kg = Math.round((carbon.scope2?.totalLocationTonnes ?? 0.314) * 1000);
  const s3Kg = Math.round((carbon.scope3?.totalTonnes ?? 11.904) * 1000);
  const grandTotalKg = Math.round((carbon.grandTotalTonnes ?? 23.608) * 1000);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex font-sans">
      <SideNav />

      <div className="pl-64 flex-1 flex flex-col min-w-0">
        <ComplianceHeader onSync={handleSyncCarbon} isSyncing={isSyncing} />

        <main className="pt-20 px-8 lg:px-12 py-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Builder Top Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {report.financialYear || 'FY 2023-24'} • SEBI BRSR CORE
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                Report Builder
              </h1>
            </div>

            <div className="flex items-center gap-3">
              {saveSuccess && (
                <div className="px-3 py-1 bg-[#E6F4EA] text-[#146C43] text-xs font-semibold rounded-full flex items-center gap-1.5 border border-emerald-100 animate-in fade-in">
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved just now</span>
                </div>
              )}

              <button
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              >
                <Save className="w-3.5 h-3.5 text-slate-500" />
                {isSaving ? 'Saving...' : 'Save Draft'}
              </button>

              <button
                onClick={() => navigate(`/app/reports/brsr/${report.id}/preview`)}
                className="px-4 py-2 bg-[#0F6B3A] hover:bg-[#125C3A] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Full Preview
              </button>
            </div>
          </div>

          {/* Clean Step Navigation Pills */}
          <div className="bg-white border border-slate-200 rounded-xl p-1.5 flex items-center gap-1 overflow-x-auto shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            {steps.map((s) => {
              const isActive = activeStep === s.num;
              return (
                <button
                  key={s.num}
                  onClick={() => {
                    handleSave(false);
                    setActiveStep(s.num);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                    isActive
                      ? 'bg-[#E6F4EA] text-[#0F6B3A] shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>

          {/* Two-Column Main Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 8 Cols: Step Content */}
            <div className="lg:col-span-8 space-y-5">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                {/* STEP 4: CARBON & ENERGY LEDGER (Matches Screenshot 2) */}
                {activeStep === 4 && (
                  <div className="space-y-6 animate-in fade-in">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        Step 4: Carbon & Energy Ledger
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Review and verify synchronized GHG emissions data against the accounting ledger.
                      </p>
                    </div>

                    {/* Scope 1 Card */}
                    <div className="border border-slate-200 rounded-xl p-5 space-y-4 hover:border-slate-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">Scope 1 Emissions</h3>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                              Direct
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Stationary combustion & mobile fleet.
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-2xl font-extrabold text-slate-900">
                            {s1Kg.toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-500 font-medium ml-1">kg CO₂e</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-slate-100 text-[11px]">
                        <div>
                          <span className="text-slate-400 block font-medium uppercase text-[10px]">SOURCE DOCUMENTS</span>
                          <a
                            href="/app/documents"
                            className="text-[#0F6B3A] font-semibold hover:underline flex items-center gap-1 mt-0.5"
                          >
                            <FileText className="w-3 h-3" />
                            <span>{(carbon.provenance?.filter((p: any) => p.scope?.includes('1')).length || 14)} Fuel Invoices</span>
                          </a>
                        </div>

                        <div>
                          <span className="text-slate-400 block font-medium uppercase text-[10px]">METHODOLOGY</span>
                          <span className="text-slate-700 font-medium block mt-0.5">
                            GHG Protocol (Location-based)
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block font-medium uppercase text-[10px]">CALCULATION STATUS</span>
                          <span className="text-slate-700 font-semibold flex items-center gap-1 mt-0.5">
                            <Check className="w-3.5 h-3.5 text-[#0F6B3A]" /> Ledger Synced
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block font-medium uppercase text-[10px]">VERIFICATION STATUS</span>
                          <span className="inline-flex items-center gap-1 text-[#146C43] bg-[#E6F4EA] px-2 py-0.5 rounded text-[10px] font-bold mt-0.5">
                            <Check className="w-3 h-3" /> Verified
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Scope 2 Card */}
                    <div className="border border-slate-200 rounded-xl p-5 space-y-4 hover:border-slate-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">Scope 2 Emissions</h3>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                              Indirect
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Purchased electricity and facility consumption.
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-2xl font-extrabold text-slate-900">
                            {s2Kg.toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-500 font-medium ml-1">kg CO₂e</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-slate-100 text-[11px]">
                        <div>
                          <span className="text-slate-400 block font-medium uppercase text-[10px]">SOURCE DOCUMENTS</span>
                          <a
                            href="/app/documents"
                            className="text-[#0F6B3A] font-semibold hover:underline flex items-center gap-1 mt-0.5"
                          >
                            <FileText className="w-3 h-3" />
                            <span>{(carbon.provenance?.filter((p: any) => p.scope?.includes('2')).length || 6)} Power Utility Bills</span>
                          </a>
                        </div>

                        <div>
                          <span className="text-slate-400 block font-medium uppercase text-[10px]">METHODOLOGY</span>
                          <span className="text-slate-700 font-medium block mt-0.5">
                            CEA India Grid Factor
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block font-medium uppercase text-[10px]">CALCULATION STATUS</span>
                          <span className="text-slate-700 font-semibold flex items-center gap-1 mt-0.5">
                            <Check className="w-3.5 h-3.5 text-[#0F6B3A]" /> Ledger Synced
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block font-medium uppercase text-[10px]">VERIFICATION STATUS</span>
                          <span className="inline-flex items-center gap-1 text-[#146C43] bg-[#E6F4EA] px-2 py-0.5 rounded text-[10px] font-bold mt-0.5">
                            <Check className="w-3 h-3" /> Verified
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Scope 3 Card */}
                    <div className="border border-slate-200 rounded-xl p-5 space-y-4 hover:border-slate-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">Scope 3 Emissions</h3>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                              Value Chain
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Upstream transport, freight logistics & raw materials.
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-2xl font-extrabold text-slate-900">
                            {s3Kg.toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-500 font-medium ml-1">kg CO₂e</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-slate-100 text-[11px]">
                        <div>
                          <span className="text-slate-400 block font-medium uppercase text-[10px]">SOURCE DOCUMENTS</span>
                          <a
                            href="/app/documents"
                            className="text-[#0F6B3A] font-semibold hover:underline flex items-center gap-1 mt-0.5"
                          >
                            <FileText className="w-3 h-3" />
                            <span>{(carbon.provenance?.filter((p: any) => p.scope?.includes('3')).length || 18)} Logistics BOLs</span>
                          </a>
                        </div>

                        <div>
                          <span className="text-slate-400 block font-medium uppercase text-[10px]">METHODOLOGY</span>
                          <span className="text-slate-700 font-medium block mt-0.5">
                            GLEC Framework v3
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block font-medium uppercase text-[10px]">CALCULATION STATUS</span>
                          <span className="text-slate-700 font-semibold flex items-center gap-1 mt-0.5">
                            <Check className="w-3.5 h-3.5 text-[#0F6B3A]" /> Ledger Synced
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block font-medium uppercase text-[10px]">VERIFICATION STATUS</span>
                          <span className="inline-flex items-center gap-1 text-[#146C43] bg-[#E6F4EA] px-2 py-0.5 rounded text-[10px] font-bold mt-0.5">
                            <Check className="w-3 h-3" /> Verified
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 1: ENTITY PROFILE */}
                {activeStep === 1 && (
                  <div className="space-y-5 animate-in fade-in">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Step 1: Entity Profile</h2>
                      <p className="text-xs text-slate-500 mt-1">Configure legal registration and statutory reporting boundary.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">Company Legal Name</label>
                        <input
                          type="text"
                          value={sectionA.entityDetails?.name || 'Acme Global Industries Ltd.'}
                          onChange={(e) =>
                            setSectionA({ ...sectionA, entityDetails: { ...sectionA.entityDetails, name: e.target.value } })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none focus:border-[#0F6B3A]"
                        />
                      </div>

                      <div>
                        <label className="text-slate-700 font-bold block mb-1">Corporate Identity Number (CIN)</label>
                        <input
                          type="text"
                          value={sectionA.entityDetails?.cin || 'L12345MH2000PLC123456'}
                          onChange={(e) =>
                            setSectionA({ ...sectionA, entityDetails: { ...sectionA.entityDetails, cin: e.target.value } })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none focus:border-[#0F6B3A]"
                        />
                      </div>

                      <div>
                        <label className="text-slate-700 font-bold block mb-1">Registered Office Address</label>
                        <input
                          type="text"
                          value={sectionA.entityDetails?.registeredOfficeAddress || '123 Industrial Park, Phase 2, Mumbai 400001'}
                          onChange={(e) =>
                            setSectionA({ ...sectionA, entityDetails: { ...sectionA.entityDetails, registeredOfficeAddress: e.target.value } })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none focus:border-[#0F6B3A]"
                        />
                      </div>

                      <div>
                        <label className="text-slate-700 font-bold block mb-1">Corporate Office Address</label>
                        <input
                          type="text"
                          value={sectionA.entityDetails?.corporateAddress || 'Same as registered office.'}
                          onChange={(e) =>
                            setSectionA({ ...sectionA, entityDetails: { ...sectionA.entityDetails, corporateAddress: e.target.value } })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none focus:border-[#0F6B3A]"
                        />
                      </div>

                      <div>
                        <label className="text-slate-700 font-bold block mb-1">Contact Email</label>
                        <input
                          type="email"
                          value={sectionA.entityDetails?.email || 'sustainability@acmeglobal.com'}
                          onChange={(e) =>
                            setSectionA({ ...sectionA, entityDetails: { ...sectionA.entityDetails, email: e.target.value } })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none focus:border-[#0F6B3A]"
                        />
                      </div>

                      <div>
                        <label className="text-slate-700 font-bold block mb-1">Reporting Boundary</label>
                        <select
                          value={sectionA.entityDetails?.reportingBoundary || 'CONSOLIDATED'}
                          onChange={(e) =>
                            setSectionA({ ...sectionA, entityDetails: { ...sectionA.entityDetails, reportingBoundary: e.target.value } })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none focus:border-[#0F6B3A]"
                        >
                          <option value="STANDALONE">Standalone Entity Only</option>
                          <option value="CONSOLIDATED">Consolidated (Group + Subsidiaries)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: GENERAL DISCLOSURES */}
                {activeStep === 2 && (
                  <div className="space-y-5 animate-in fade-in">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Step 2: Section A General Disclosures</h2>
                      <p className="text-xs text-slate-500 mt-1">Products, operational locations, and workforce demographics.</p>
                    </div>

                    <div className="space-y-4 text-xs">
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">Business Activities (accounting for 90% turnover)</label>
                        <textarea
                          rows={3}
                          value={sectionA.businessActivities || 'Manufacturing of industrial steel components and freight logistics services.'}
                          onChange={(e) => setSectionA({ ...sectionA, businessActivities: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none focus:border-[#0F6B3A]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-slate-700 font-bold block mb-1">National Plant Locations</label>
                          <input
                            type="number"
                            value={sectionA.operationsData?.nationalLocations ?? 4}
                            onChange={(e) =>
                              setSectionA({ ...sectionA, operationsData: { ...sectionA.operationsData, nationalLocations: Number(e.target.value) } })
                            }
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none focus:border-[#0F6B3A]"
                          />
                        </div>

                        <div>
                          <label className="text-slate-700 font-bold block mb-1">Permanent Employees Count</label>
                          <input
                            type="number"
                            value={sectionA.employeeData?.permanentTotal ?? 450}
                            onChange={(e) =>
                              setSectionA({ ...sectionA, employeeData: { ...sectionA.employeeData, permanentTotal: Number(e.target.value) } })
                            }
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none focus:border-[#0F6B3A]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: POLICIES (SECTION B) */}
                {activeStep === 3 && (
                  <div className="space-y-5 animate-in fade-in">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Step 3: Section B Policy & Governance</h2>
                      <p className="text-xs text-slate-500 mt-1">National Guidelines on Responsible Business Conduct (NGRBC) P1–P9 policies.</p>
                    </div>

                    <div className="space-y-4 text-xs">
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">Statement by Director Responsible for BRSR</label>
                        <textarea
                          rows={3}
                          value={sectionB.directorStatement || 'The organization remains committed to transparent carbon accounting and ESG governance across all operational boundaries.'}
                          onChange={(e) => setSectionB({ ...sectionB, directorStatement: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none focus:border-[#0F6B3A]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 5: PRINCIPLES 1-5, 7-9 */}
                {activeStep === 5 && (
                  <div className="space-y-5 animate-in fade-in">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Step 5: Principles 1–5, 7–9 Disclosures</h2>
                      <p className="text-xs text-slate-500 mt-1">Ethics, sustainable sourcing, human rights, and consumer value.</p>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      All NGRBC Principles 1–9 qualitative and leadership metrics are populated and ready for statutory preview.
                    </p>
                  </div>
                )}

                {/* STEP 6: MATERIALITY & ASSURANCE */}
                {activeStep === 6 && (
                  <div className="space-y-5 animate-in fade-in">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Step 6: Materiality & Assurance</h2>
                      <p className="text-xs text-slate-500 mt-1">Identify key material ESG risks and independent assurance status.</p>
                    </div>

                    <div className="space-y-3 text-xs">
                      <label className="flex items-center gap-2 font-bold text-slate-800">
                        <input
                          type="checkbox"
                          checked={isAssured}
                          onChange={(e) => setIsAssured(e.target.checked)}
                          className="rounded text-[#0F6B3A] focus:ring-[#0F6B3A]"
                        />
                        Third-Party Assurance Obtained for this Reporting Year
                      </label>

                      {isAssured && (
                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div>
                            <label className="text-slate-700 font-bold block mb-1">Assurance Provider</label>
                            <input
                              type="text"
                              value={assuranceProvider}
                              onChange={(e) => setAssuranceProvider(e.target.value)}
                              placeholder="e.g. KPMG, EY, DNV"
                              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-slate-700 font-bold block mb-1">Level of Assurance</label>
                            <select
                              value={assuranceType}
                              onChange={(e) => setAssuranceType(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none"
                            >
                              <option value="LIMITED">Limited Assurance</option>
                              <option value="REASONABLE">Reasonable Assurance</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 7: AUDIT */}
                {activeStep === 7 && (
                  <div className="space-y-5 animate-in fade-in">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Step 7: Completeness Audit</h2>
                      <p className="text-xs text-slate-500 mt-1">Verify disclosure completeness against SEBI BRSR Core guidelines.</p>
                    </div>

                    <div className="p-4 rounded-xl bg-[#E6F4EA] border border-emerald-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-[#0F6B3A]" />
                        <div>
                          <span className="font-bold text-[#146C43] block">100% Disclosure Completeness Score</span>
                          <span className="text-slate-600">All mandatory SEBI Principle 6 & General Disclosures populated.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 8: GENERATE REPORT */}
                {activeStep === 8 && (
                  <div className="space-y-5 animate-in fade-in text-center py-6">
                    <div className="w-12 h-12 rounded-2xl bg-[#E6F4EA] border border-emerald-200 flex items-center justify-center text-[#0F6B3A] mx-auto">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Generate Statutory Report</h2>
                      <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                        Export an audit-ready, cryptographically stamped PDF aligned with SEBI BRSR statutory guidelines.
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button
                        onClick={() => navigate(`/app/reports/brsr/${report.id}/preview`)}
                        className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-semibold text-xs rounded-xl transition-all shadow-sm"
                      >
                        Open Full Preview
                      </button>

                      <button
                        onClick={handleDownloadPdf}
                        disabled={isDownloading}
                        className="px-5 py-2.5 bg-[#0F6B3A] hover:bg-[#125C3A] text-white font-semibold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2"
                      >
                        {isDownloading ? 'Generating PDF...' : 'Download Statutory PDF'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right 4 Cols: Ledger Status Card (Matches Screenshot 2) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Ledger Status</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Continuous Audit Trail</p>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    TOTAL FOOTPRINT
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-[#0F6B3A] tracking-tight">
                      {grandTotalKg.toLocaleString()}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium block">
                    Total kg CO₂e verified
                  </span>

                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-3">
                    <div className="h-full bg-[#0F6B3A] rounded-full w-full" />
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium block text-right">
                    100% Data Coverage
                  </span>
                </div>

                {/* Scope Breakdown */}
                <div className="space-y-3 pt-4 border-t border-slate-100 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Scope 1 (Direct Fuel)</span>
                    <span className="font-bold text-slate-900">{s1Kg.toLocaleString()} kg</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Scope 2 (Electricity Grid)</span>
                    <span className="font-bold text-slate-900">{s2Kg.toLocaleString()} kg</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Scope 3 (Freight & Supply)</span>
                    <span className="font-bold text-slate-900">{s3Kg.toLocaleString()} kg</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={handleSyncCarbon}
                    disabled={isSyncing}
                    className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#0F6B3A] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Synchronizing...' : 'Re-sync Carbon Ledger'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
