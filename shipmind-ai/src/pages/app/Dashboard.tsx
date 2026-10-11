import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import KPICard from "../../components/shared/KPICard";
import StatusBadge from "../../components/shared/StatusBadge";
import ForecastCard from "../../components/forecast/ForecastCard";
import { apiGet } from "../../lib/api-client";

interface DocItem {
  id: string;
  fileName: string;
  mimeType: string;
  status: string;
  source: string;
  createdAt: string;
  category?: { name: string; scope: string; code: string };
}

export default function Dashboard() {
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [totalDocs, setTotalDocs] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [docsRes, queueRes] = await Promise.allSettled([
          apiGet<{ items: DocItem[]; total: number }>("/api/v1/documents", { limit: 20 }),
          apiGet<{ items: unknown[]; total: number }>("/api/v1/review-queue"),
        ]);

        if (docsRes.status === "fulfilled") {
          setDocuments(docsRes.value.items || []);
          setTotalDocs(docsRes.value.total ?? 0);
        }
        if (queueRes.status === "fulfilled") {
          setReviewCount(queueRes.value.total ?? 0);
        }
      } catch (err: any) {
        console.error("Dashboard load error:", err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const kpis = [
    {
      icon: "folder_open",
      label: "Historical Documents",
      value: loading ? "—" : totalDocs !== null ? totalDocs.toLocaleString() : "0",
      badge: "Live Log",
      badgeColor: "green" as const,
    },
    {
      icon: "co2",
      label: "Emissions Standards",
      value: "DEFRA & GLEC",
      badge: "Official",
      badgeColor: "green" as const,
      iconFill: true,
      iconColor: "text-emerald-700",
      iconBg: "bg-emerald-100",
    },
    {
      icon: "flag",
      label: "Review Queue",
      value: loading ? "—" : reviewCount !== null ? reviewCount.toString() : "0",
      badge: "Live",
      badgeColor: "green" as const,
      iconColor: "text-error",
      iconBg: "bg-error-container/40",
    },
    {
      icon: "history",
      label: "Audit Log Status",
      value: "100% Immutable",
      badgeColor: "green" as const,
    },
  ];

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();

  return (
    <AppLayout
      title="Dashboard & History"
      subtitle={`Welcome back${user.fullName ? `, ${user.fullName}` : ""} — Historical GHG Emissions & Audit Log`}
    >
      <div className="pt-8 pb-[120px] px-6 max-w-[1280px] mx-auto space-y-8">
        
        {/* Scope 1 / 2 / 3 Historical Summary Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white rounded-[20px] p-6 shadow-md border border-emerald-800/40">
            <span className="text-emerald-400 font-extrabold text-[11px] uppercase tracking-wider block mb-1">
              SCOPE 1 — DIRECT COMBUSTION
            </span>
            <p className="text-2xl font-bold">Stationary & Fleet Fuel</p>
            <p className="text-xs text-emerald-200/70 mt-2">
              Official DEFRA Factors: Diesel (2.6878 kgCO2e/L), Petrol (2.3148 kgCO2e/L)
            </p>
          </div>

          <div className="bg-gradient-to-br from-teal-900 to-slate-900 text-white rounded-[20px] p-6 shadow-md border border-teal-800/40">
            <span className="text-teal-400 font-extrabold text-[11px] uppercase tracking-wider block mb-1">
              SCOPE 2 — PURCHASED ENERGY
            </span>
            <p className="text-2xl font-bold">Grid Electricity & Heating</p>
            <p className="text-xs text-teal-200/70 mt-2">
              Official Grid Factors: US (0.3850), India (0.7160), Europe (0.2550 kgCO2e/kWh)
            </p>
          </div>

          <div className="bg-gradient-to-br from-cyan-900 to-slate-900 text-white rounded-[20px] p-6 shadow-md border border-cyan-800/40">
            <span className="text-cyan-400 font-extrabold text-[11px] uppercase tracking-wider block mb-1">
              SCOPE 3 — VALUE CHAIN FREIGHT
            </span>
            <p className="text-2xl font-bold">Upstream Freight & Travel</p>
            <p className="text-xs text-cyan-200/70 mt-2">
              GLEC Framework v2.0: Truck (0.0921), Ocean (0.0161), Air (0.6020 kgCO2e/tkm)
            </p>
          </div>
        </section>

        {/* KPI Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpis.map((k) => (
            <KPICard key={k.label} {...k} />
          ))}
        </section>

        {/* ML Carbon Emission Forecast Card */}
        <ForecastCard />

        {/* Main Activity History Table */}
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-[20px] overflow-hidden ambient-shadow">
          <div className="p-8 border-b border-outline-variant/20 flex justify-between items-center">
            <div>
              <h4 className="text-2xl font-bold text-primary mb-1">Historical Processing Stream</h4>
              <p className="text-[14px] text-on-surface-variant">
                Complete historical record of uploaded activity documents and calculated carbon footprints
              </p>
            </div>
            <span className="px-3 py-1 bg-surface-container text-xs font-bold text-primary rounded-full">
              {documents.length} Records Logged
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container/30">
                <tr>
                  {["Document Name", "Category / Scope", "Status", "Date Uploaded", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-8 py-4 text-[12px] text-on-surface-variant uppercase tracking-widest font-semibold"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-xs text-on-surface-variant">
                      Loading activity history log...
                    </td>
                  </tr>
                ) : documents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-xs text-on-surface-variant">
                      No historical documents in log. Upload your first document in the Upload Wizard.
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-surface-container/20 transition-colors">
                      <td className="px-8 py-4">
                        <Link to={`/app/documents/${doc.id}`} className="font-bold text-sm text-primary hover:underline block">
                          {doc.fileName}
                        </Link>
                        <span className="text-[11px] text-on-surface-variant font-mono">{doc.id}</span>
                      </td>
                      <td className="px-8 py-4 text-xs font-medium">
                        {doc.category?.name || "General Category"}
                      </td>
                      <td className="px-8 py-4 text-xs">
                        <StatusBadge status={doc.status} />
                      </td>
                      <td className="px-8 py-4 text-xs text-on-surface-variant font-medium">
                        {new Date(doc.createdAt).toLocaleDateString()} {new Date(doc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-8 py-4 text-xs">
                        <Link
                          to={`/app/documents/${doc.id}`}
                          className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl font-bold transition-all"
                        >
                          View Audit Trace →
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
