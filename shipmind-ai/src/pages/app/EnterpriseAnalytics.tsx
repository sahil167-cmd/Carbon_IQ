import AppLayout from "../../components/layout/AppLayout";
import KPICard from "../../components/shared/KPICard";

const kpis = [
  { icon: "description", label: "Documents Analyzed", value: "248K", badge: "+18%", badgeColor: "green" as const },
  { icon: "verified", label: "Avg. Accuracy", value: "99.4%", iconFill: true, iconColor: "text-secondary", iconBg: "bg-secondary-container/20" },
  { icon: "schedule", label: "Avg. Processing Time", value: "1.8s" },
  { icon: "savings", label: "Cost Savings", value: "$4.2M", badge: "YTD", badgeColor: "green" as const },
];

const enterpriseKpis = [
  { label: "Ocean Freight", spend: "$1.2M", change: "-8%", up: false },
  { label: "Air Freight", spend: "$840K", change: "+3%", up: true },
  { label: "Road Freight", spend: "$320K", change: "-12%", up: false },
  { label: "Customs Duties", spend: "$180K", change: "-2%", up: false },
];

export default function EnterpriseAnalytics() {
  return (
    <AppLayout title="Enterprise Analytics" subtitle="Deep Intelligence Reporting">
      <div className="pt-8 pb-[120px] px-6 max-w-[1280px] mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpis.map((k) => <KPICard key={k.label} {...k} />)}
        </div>

        {/* Enterprise Spend */}
        <div className="bg-white border border-outline-variant/30 rounded-[20px] overflow-hidden ambient-shadow">
          <div className="p-8 border-b border-outline-variant/20">
            <h3 className="text-[18px] font-semibold">Freight Spend Breakdown (YTD)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-outline-variant/20">
            {enterpriseKpis.map((e) => (
              <div key={e.label} className="p-8 flex flex-col gap-2">
                <span className="text-[13px] text-on-surface-variant font-medium">{e.label}</span>
                <span className="text-[32px] font-bold">{e.spend}</span>
                <span className={`flex items-center text-[13px] font-bold ${e.up ? "text-error" : "text-secondary"}`}>
                  <span className="material-symbols-outlined text-[14px]">{e.up ? "trending_up" : "trending_down"}</span>
                  {e.change} vs last year
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-outline-variant/30 rounded-[20px] p-8 ambient-shadow">
            <h4 className="font-semibold text-[18px] mb-6">Document Volume by Month</h4>
            <div className="flex items-end gap-4 h-48">
              {[40, 65, 55, 80, 75, 95, 88, 72, 90, 100, 85, 92].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col gap-2 items-center">
                  <div className="w-full bg-primary/10 hover:bg-primary/20 transition-colors rounded-t-sm" style={{ height: `${h}%` }} />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-3 text-[10px] text-on-surface-variant">
              {["J","F","M","A","M","J","J","A","S","O","N","D"].map((m) => <span key={m}>{m}</span>)}
            </div>
          </div>

          <div className="bg-white border border-outline-variant/30 rounded-[20px] p-8 ambient-shadow">
            <h4 className="font-semibold text-[18px] mb-6">Accuracy by Document Type</h4>
            <div className="space-y-5">
              {[
                { type: "Bill of Lading", acc: 99.8 },
                { type: "Commercial Invoice", acc: 99.2 },
                { type: "Cargo Manifest", acc: 98.4 },
                { type: "Packing List", acc: 97.9 },
                { type: "Terminal Receipt", acc: 96.1 },
              ].map((d) => (
                <div key={d.type}>
                  <div className="flex justify-between text-[13px] mb-1">
                    <span className="font-medium">{d.type}</span>
                    <span className="font-bold text-secondary">{d.acc}%</span>
                  </div>
                  <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-secondary rounded-full" style={{ width: `${d.acc}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
