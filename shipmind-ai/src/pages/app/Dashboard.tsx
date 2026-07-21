import { Link } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import KPICard from "../../components/shared/KPICard";
import DocumentRow from "../../components/shared/DocumentRow";
import type { Document } from "../../types";

const kpis = [
  { icon: "description", label: "Total Documents", value: "12,482", badge: "+12%", badgeColor: "green" as const },
  { icon: "verified", label: "Extraction Accuracy", value: "99.8%", iconFill: true, iconColor: "text-secondary", iconBg: "bg-secondary-container/20" },
  { icon: "flag", label: "Flagged for Review", value: "24", badge: "High", badgeColor: "red" as const, iconColor: "text-error", iconBg: "bg-error-container/40" },
  { icon: "hub", label: "Integrated Carriers", value: "158" },
];

const recentDocs: Document[] = [
  { id: "1", name: "BOL_CH-29381.pdf", type: "Bill of Lading", confidence: 99.4, status: "Processed", date: "Oct 14, 2024", source: "SAP ERP", size: "1.2 MB" },
  { id: "2", name: "INV_MAERSK_001.pdf", type: "Invoice", confidence: 76.2, status: "Flagged", date: "Oct 14, 2024", source: "Mail Drop", size: "840 KB" },
  { id: "3", name: "BOL_FEDEX_Z88.pdf", type: "Bill of Lading", confidence: 88.9, status: "Manual Review", date: "Oct 13, 2024", source: "API Upload", size: "1.1 MB" },
  { id: "4", name: "BOL_UPS_TRAK_9.pdf", type: "Bill of Lading", confidence: 99.9, status: "Processed", date: "Oct 12, 2024", source: "SAP ERP", size: "640 KB" },
];

export default function Dashboard() {
  return (
    <AppLayout title="Dashboard" subtitle="Shipment Intelligence">
      <div className="pt-8 pb-[120px] px-6 max-w-[1280px] mx-auto space-y-10">
        {/* KPI Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpis.map((k) => (
            <KPICard key={k.label} {...k} />
          ))}
        </section>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity Table */}
          <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant/30 rounded-[20px] overflow-hidden">
            <div className="p-8 border-b border-outline-variant/20 flex justify-between items-center">
              <div>
                <h4 className="text-2xl font-semibold mb-1">Recent Activity</h4>
                <p className="text-[15px] text-on-surface-variant opacity-60">Real-time AI document processing stream</p>
              </div>
              <button className="p-2 hover:bg-surface-container rounded-lg transition-colors">
                <span className="material-symbols-outlined">more_horiz</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-container/30">
                  <tr>
                    {["Document Name", "Type", "AI Confidence", "Status"].map((h) => (
                      <th key={h} className="px-8 py-4 text-[13px] text-on-surface-variant uppercase tracking-widest font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {recentDocs.map((doc) => (
                    <DocumentRow key={doc.id} doc={doc} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sidebar Widgets */}
          <div className="space-y-6">
            {/* AI Engine Status */}
            <div className="glass border border-outline-variant/30 rounded-[20px] p-8">
              <h4 className="text-[13px] font-bold mb-6 flex items-center gap-2 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                AI Engine Status
              </h4>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-[15px] text-on-surface-variant">Latency</span>
                  <span className="text-[13px] font-bold">42ms</span>
                </div>
                <div className="h-1 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-secondary w-4/5 rounded-full" />
                </div>
                <div className="pt-4 border-t border-outline-variant/20">
                  <p className="text-[15px] text-on-surface-variant leading-relaxed">
                    System is operating at{" "}
                    <span className="text-secondary font-bold">Peak Efficiency</span>. 1,204 documents queued for nocturnal optimization.
                  </p>
                </div>
              </div>
            </div>

            {/* Skeleton Widget */}
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-[20px] p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg skeleton" />
                <div className="space-y-2">
                  <div className="w-24 h-4 rounded skeleton" />
                  <div className="w-16 h-3 rounded skeleton" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="w-full h-24 rounded-xl skeleton" />
                <div className="flex gap-2">
                  <div className="w-1/2 h-10 rounded-lg skeleton" />
                  <div className="w-1/2 h-10 rounded-lg skeleton" />
                </div>
              </div>
              <p className="mt-4 text-center text-[13px] text-on-surface-variant opacity-40 italic">
                Syncing carrier rates...
              </p>
            </div>
          </div>
        </div>

        {/* Bento Insights */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-8 bg-primary text-on-primary rounded-[20px] p-10 flex flex-col justify-between min-h-[320px]">
            <div>
              <h3 className="text-[40px] font-semibold leading-[1.2] tracking-[-0.03em] mb-4">
                Unlocking $2.4M in<br />Hidden Inefficiencies.
              </h3>
              <p className="text-on-primary-container max-w-md text-[18px] leading-7">
                Our predictive models identified systematic routing errors across 14% of your ocean freight contracts.
              </p>
            </div>
            <div className="flex gap-4 items-center">
              <Link
                to="/app/analytics"
                className="bg-secondary-fixed text-on-secondary-fixed font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-all"
              >
                Review Optimization Report
              </Link>
              <span className="text-on-primary-container text-[13px]">Updated 2m ago</span>
            </div>
          </div>
          <div className="md:col-span-4 bg-surface-container-high rounded-[20px] p-10 flex flex-col items-center justify-center text-center">
            <span
              className="material-symbols-outlined text-6xl text-primary mb-6"
              style={{ fontVariationSettings: "'wght' 200" }}
            >
              rocket_launch
            </span>
            <h4 className="text-2xl font-semibold mb-2">v4.2 Deploy</h4>
            <p className="text-on-surface-variant text-[15px] px-4">
              New OCR engines for Cyrillic and Kanji scripts now active.
            </p>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
