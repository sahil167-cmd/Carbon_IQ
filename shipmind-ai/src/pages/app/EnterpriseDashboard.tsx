import AppLayout from "../../components/layout/AppLayout";
import KPICard from "../../components/shared/KPICard";

const kpis = [
  { icon: "local_shipping", label: "Fleet Size", value: "284", badge: "+12%", badgeColor: "green" as const },
  { icon: "verified", label: "On-Time Rate", value: "98.2%", iconFill: true, iconColor: "text-secondary", iconBg: "bg-secondary-container/20" },
  { icon: "savings", label: "Cost Reduction", value: "$1.8M", badge: "MoM", badgeColor: "green" as const },
  { icon: "public", label: "Active Routes", value: "42" },
];

const regions = [
  { name: "Asia-Pacific", shipments: 4821, trend: "+14%", up: true },
  { name: "Europe", shipments: 3240, trend: "+6%", up: true },
  { name: "North America", shipments: 2910, trend: "-2%", up: false },
  { name: "Middle East", shipments: 1480, trend: "+22%", up: true },
];

export default function EnterpriseDashboard() {
  return (
    <AppLayout title="Enterprise Dashboard" subtitle="Global Fleet Intelligence">
      <div className="pt-8 pb-[120px] px-6 max-w-[1280px] mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpis.map((k) => <KPICard key={k.label} {...k} />)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Regional Breakdown */}
          <div className="lg:col-span-2 bg-white border border-outline-variant/30 rounded-[20px] overflow-hidden ambient-shadow">
            <div className="p-8 border-b border-outline-variant/20">
              <h3 className="text-[18px] font-semibold">Regional Shipment Volume</h3>
            </div>
            <div className="divide-y divide-outline-variant/20">
              {regions.map((r) => (
                <div key={r.name} className="px-8 py-6 flex items-center gap-6">
                  <div className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">public</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[15px]">{r.name}</p>
                    <p className="text-[13px] text-on-surface-variant">{r.shipments.toLocaleString()} shipments</p>
                  </div>
                  <span className={`flex items-center text-[13px] font-bold ${r.up ? "text-secondary" : "text-error"}`}>
                    <span className="material-symbols-outlined text-[14px]">{r.up ? "trending_up" : "trending_down"}</span>
                    {r.trend}
                  </span>
                  <div className="w-32 h-2 bg-surface-container rounded-full overflow-hidden">
                    <div
                      className="h-full bg-secondary rounded-full"
                      style={{ width: `${(r.shipments / 5000) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fleet Performance */}
          <div className="bg-primary text-on-primary rounded-[20px] p-8 flex flex-col justify-between ambient-shadow">
            <div>
              <span className="text-[13px] text-on-primary/70 uppercase tracking-wider font-medium">Fleet Intelligence</span>
              <h3 className="text-[40px] font-bold mt-4 mb-4">Peak Efficiency</h3>
              <p className="text-on-primary/70 text-[15px] leading-relaxed">
                Your global fleet is operating at 98.2% efficiency. The AI has identified 3 route optimizations to save additional costs.
              </p>
            </div>
            <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
              <button className="w-full bg-secondary text-white py-3 rounded-xl font-bold text-[15px] hover:opacity-90 transition-all">
                View Fleet Map
              </button>
              <button className="w-full border border-white/20 text-white py-3 rounded-xl font-bold text-[15px] hover:bg-white/10 transition-all">
                Export Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
