import { useState, useEffect, useCallback } from "react";
import AppLayout from "../../components/layout/AppLayout";
import { apiGet, apiPost } from "../../lib/api-client";

const orgTabs = ["General", "Facilities & Sites", "Reporting Periods", "Integrations"];

interface Site {
  id: string;
  name: string;
  type: string;
  country: string;
  city?: string;
  status: string;
}

interface ReportingPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

export default function OrganizationSettings() {
  const [activeTab, setActiveTab] = useState("General");
  const [sites, setSites] = useState<Site[]>([]);
  const [periods, setPeriods] = useState<ReportingPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [seedLoading, setSeedLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  // Site Form State
  const [siteForm, setSiteForm] = useState({
    name: "Detroit Logistics Center",
    type: "WAREHOUSE",
    country: "US",
    city: "Detroit",
  });
  const [creatingSite, setCreatingSite] = useState(false);

  // Period Form State
  const [periodForm, setPeriodForm] = useState({
    name: "FY 2026 Reporting Period",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
  });
  const [creatingPeriod, setCreatingPeriod] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sitesRes, periodsRes] = await Promise.allSettled([
        apiGet<{ items: Site[] }>("/api/v1/sites"),
        apiGet<{ items: ReportingPeriod[] }>("/api/v1/reporting-periods"),
      ]);

      if (sitesRes.status === "fulfilled") {
        const val: any = sitesRes.value;
        const list = Array.isArray(val) ? val : (val?.items || []);
        setSites(list);
      }
      if (periodsRes.status === "fulfilled") {
        const val: any = periodsRes.value;
        const list = Array.isArray(val) ? val : (val?.items || []);
        setPeriods(list);
      }
    } catch (err: any) {
      console.error("Error fetching org setup:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // One-click quick seed for demo setup
  const handleQuickSeed = async () => {
    setSeedLoading(true);
    setFeedbackMsg("");
    try {
      // 1. Create Default Site if none
      if (sites.length === 0) {
        await apiPost("/api/v1/sites", {
          name: "Global HQ & Logistics Hub",
          type: "OFFICE",
          country: "US",
          city: "Chicago",
        });
      }
      // 2. Create Default Period if none
      if (periods.length === 0) {
        await apiPost("/api/v1/reporting-periods", {
          name: "CY 2026 Reporting Period",
          startDate: "2026-01-01",
          endDate: "2026-12-31",
        });
      }
      setFeedbackMsg("Default Site and Reporting Period initialized successfully!");
      await fetchData();
    } catch (err: any) {
      setFeedbackMsg(`Setup failed: ${err.message}`);
    } finally {
      setSeedLoading(false);
    }
  };

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingSite(true);
    setFeedbackMsg("");
    try {
      await apiPost("/api/v1/sites", siteForm);
      setFeedbackMsg(`Site "${siteForm.name}" created successfully!`);
      setSiteForm({ name: "", type: "WAREHOUSE", country: "US", city: "" });
      await fetchData();
    } catch (err: any) {
      setFeedbackMsg(`Failed to create site: ${err.message}`);
    } finally {
      setCreatingSite(false);
    }
  };

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingPeriod(true);
    setFeedbackMsg("");
    try {
      await apiPost("/api/v1/reporting-periods", periodForm);
      setFeedbackMsg(`Reporting Period "${periodForm.name}" created successfully!`);
      await fetchData();
    } catch (err: any) {
      setFeedbackMsg(`Failed to create period: ${err.message}`);
    } finally {
      setCreatingPeriod(false);
    }
  };

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();

  return (
    <AppLayout title="Organization Settings" subtitle="Account & Facility Configuration">
      <div className="pt-8 pb-[120px] px-6 max-w-[1280px] mx-auto space-y-6">
        
        {/* Quick Seed Banner if missing setup */}
        {!loading && (sites.length === 0 || periods.length === 0) && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-[20px] p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-2xl">
                ⚡
              </div>
              <div>
                <h4 className="text-base font-bold text-emerald-950">Quick Setup Required for Uploads</h4>
                <p className="text-xs text-emerald-800">
                  You need at least 1 Facility Site and 1 Open Reporting Period to upload GHG documents.
                </p>
              </div>
            </div>
            <button
              onClick={handleQuickSeed}
              disabled={seedLoading}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 whitespace-nowrap disabled:opacity-50"
            >
              {seedLoading ? "Initializing..." : "1-Click Initialize Defaults"}
            </button>
          </div>
        )}

        {feedbackMsg && (
          <div className={`p-4 font-medium text-xs rounded-xl border ${
            feedbackMsg.includes("failed") || feedbackMsg.includes("Failed")
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}>
            {feedbackMsg}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex gap-1 bg-surface-container rounded-2xl p-1 w-fit">
          {orgTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                activeTab === tab
                  ? "bg-white text-primary shadow-sm font-bold"
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab 1: General */}
        {activeTab === "General" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-outline-variant/30 rounded-[20px] p-8 ambient-shadow space-y-6">
                <h3 className="font-semibold text-[18px]">Organization Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[13px] font-medium text-on-surface-variant">
                      Organization ID
                    </label>
                    <input
                      type="text"
                      disabled
                      value={user.organizationId || "org_active"}
                      className="w-full px-4 py-3 rounded-xl border border-outline-variant/50 bg-surface-container text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[13px] font-medium text-on-surface-variant">
                      User Account Email
                    </label>
                    <input
                      type="text"
                      disabled
                      value={user.email || "admin@carboniq.com"}
                      className="w-full px-4 py-3 rounded-xl border border-outline-variant/50 bg-surface-container text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[13px] font-medium text-on-surface-variant">
                      Role
                    </label>
                    <input
                      type="text"
                      disabled
                      value={user.role || "ORG_ADMIN"}
                      className="w-full px-4 py-3 rounded-xl border border-outline-variant/50 bg-surface-container text-xs font-bold text-emerald-700"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Facilities & Sites */}
        {activeTab === "Facilities & Sites" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create Site Form */}
            <div className="bg-white border border-outline-variant/30 rounded-[20px] p-6 space-y-4">
              <h3 className="font-bold text-base text-primary">Add New Facility / Site</h3>
              <form onSubmit={handleCreateSite} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant">Site Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chicago Logistics Hub"
                    value={siteForm.name}
                    onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })}
                    className="w-full mt-1 p-3 border border-outline-variant/40 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant">Site Type *</label>
                  <select
                    value={siteForm.type}
                    onChange={(e) => setSiteForm({ ...siteForm, type: e.target.value })}
                    className="w-full mt-1 p-3 border border-outline-variant/40 rounded-xl text-xs font-semibold"
                  >
                    <option value="WAREHOUSE">WAREHOUSE</option>
                    <option value="OFFICE">OFFICE</option>
                    <option value="MANUFACTURING_PLANT">MANUFACTURING_PLANT</option>
                    <option value="DISTRIBUTION_CENTER">DISTRIBUTION_CENTER</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant">Country (2-letter ISO) *</label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    placeholder="US"
                    value={siteForm.country}
                    onChange={(e) => setSiteForm({ ...siteForm, country: e.target.value.toUpperCase() })}
                    className="w-full mt-1 p-3 border border-outline-variant/40 rounded-xl text-xs font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant">City</label>
                  <input
                    type="text"
                    placeholder="Chicago"
                    value={siteForm.city}
                    onChange={(e) => setSiteForm({ ...siteForm, city: e.target.value })}
                    className="w-full mt-1 p-3 border border-outline-variant/40 rounded-xl text-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={creatingSite}
                  className="w-full py-3 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {creatingSite ? "Saving..." : "Create Facility Site"}
                </button>
              </form>
            </div>

            {/* Sites List */}
            <div className="lg:col-span-2 bg-white border border-outline-variant/30 rounded-[20px] p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-base text-primary">Configured Facilities ({sites.length})</h3>
              </div>
              {sites.length === 0 ? (
                <div className="p-8 text-center text-xs text-on-surface-variant bg-surface-container/20 rounded-xl">
                  No sites registered yet. Create one on the left or click "1-Click Initialize Defaults".
                </div>
              ) : (
                <div className="divide-y divide-outline-variant/20">
                  {sites.map((s) => (
                    <div key={s.id} className="py-4 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-primary">{s.name}</h4>
                        <p className="text-xs text-on-surface-variant">
                          Type: <span className="font-semibold">{s.type}</span> | Region: <span className="font-semibold">{s.country}</span> {s.city ? `(${s.city})` : ""}
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[11px] font-bold">
                        ACTIVE
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}


        {/* Tab 3: Reporting Periods */}
        {activeTab === "Reporting Periods" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create Period Form */}
            <div className="bg-white border border-outline-variant/30 rounded-[20px] p-6 space-y-4">
              <h3 className="font-bold text-base text-primary">Create Reporting Period</h3>
              <form onSubmit={handleCreatePeriod} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant">Period Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CY 2026 Reporting Period"
                    value={periodForm.name}
                    onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
                    className="w-full mt-1 p-3 border border-outline-variant/40 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={periodForm.startDate}
                    onChange={(e) => setPeriodForm({ ...periodForm, startDate: e.target.value })}
                    className="w-full mt-1 p-3 border border-outline-variant/40 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant">End Date *</label>
                  <input
                    type="date"
                    required
                    value={periodForm.endDate}
                    onChange={(e) => setPeriodForm({ ...periodForm, endDate: e.target.value })}
                    className="w-full mt-1 p-3 border border-outline-variant/40 rounded-xl text-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={creatingPeriod}
                  className="w-full py-3 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {creatingPeriod ? "Saving..." : "Create Reporting Period"}
                </button>
              </form>
            </div>

            {/* Periods List */}
            <div className="lg:col-span-2 bg-white border border-outline-variant/30 rounded-[20px] p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-base text-primary">Configured Reporting Periods ({periods.length})</h3>
              </div>
              {periods.length === 0 ? (
                <div className="p-8 text-center text-xs text-on-surface-variant bg-surface-container/20 rounded-xl">
                  No reporting periods created yet.
                </div>
              ) : (
                <div className="divide-y divide-outline-variant/20">
                  {periods.map((p) => (
                    <div key={p.id} className="py-4 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-primary">{p.name}</h4>
                        <p className="text-xs text-on-surface-variant">
                          {new Date(p.startDate).toLocaleDateString()} — {new Date(p.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                        p.status === "OPEN" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-800"
                      }`}>
                        {p.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Integrations */}
        {activeTab === "Integrations" && (
          <div className="bg-white border border-outline-variant/30 rounded-[20px] p-8 ambient-shadow space-y-4">
            <h3 className="font-bold text-base">Connected Services</h3>
            <p className="text-xs text-on-surface-variant">
              PostgreSQL DB, Redis Queue (BullMQ), MinIO/S3 Storage, Tesseract OCR Engine are all connected.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
