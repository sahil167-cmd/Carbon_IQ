import AppLayout from "../../components/layout/AppLayout";
import ProgressBar from "../../components/shared/ProgressBar";

const statCards = [
  { label: "Active Shipments", value: "12,842", trend: "+12%", trendUp: true },
  { label: "On-Time Performance", value: "98.4%", trend: "✓", trendUp: true },
  { label: "Carbon Footprint (MT)", value: "2,410", trend: "-4.2%", trendUp: false },
  { label: "Average Cost/kg", value: "$1.42", trend: "-$0.12", trendUp: true },
];

const transportModes = [
  { icon: "directions_boat", label: "Sea Freight", pct: 64, transit: "24.2 Days" },
  { icon: "flight", label: "Air Freight", pct: 22, transit: "3.1 Days" },
  { icon: "local_shipping", label: "Road Freight", pct: 14, transit: "5.4 Days" },
];

const suppliers = [
  { initials: "GL", name: "Global Logistics Co.", score: 94, color: "text-secondary" },
  { initials: "NX", name: "NexTrans Corp", score: 82, color: "text-on-surface-variant" },
  { initials: "PS", name: "Prime Shipping", score: 91, color: "text-secondary" },
  { initials: "WF", name: "WayFair Hubs", score: 68, color: "text-error" },
  { initials: "EC", name: "EcoExpress", score: 87, color: "text-on-surface-variant" },
];

const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG"];

export default function Analytics() {
  return (
    <AppLayout title="Intelligence Dashboard" subtitle="Real-time Global Logistics Performance">
      <div className="p-6 bg-surface min-h-screen">
        {/* Header */}
        <header className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-[40px] font-semibold leading-none tracking-[-0.03em] text-primary">
              Intelligence Dashboard
            </h2>
            <p className="text-[15px] text-on-surface-variant mt-2">
              Real-time global logistics performance and predictive insights.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end mr-4">
              <span className="text-[13px] font-bold text-secondary">AI Optimization Active</span>
              <span className="text-[10px] text-on-surface-variant/60 uppercase">System Status: Optimal</span>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-secondary animate-emerald-pulse" />
          </div>
        </header>

        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {statCards.map((s) => (
            <div key={s.label} className="bg-white border border-outline-variant/30 rounded-[20px] p-6 ambient-shadow hover:-translate-y-0.5 transition-transform">
              <p className="text-[13px] text-on-surface-variant font-medium mb-1">{s.label}</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-bold">{s.value}</h3>
                <span className={`text-[12px] font-bold flex items-center ${s.trendUp ? "text-secondary" : "text-error"}`}>
                  <span className="material-symbols-outlined text-[14px]">
                    {s.trendUp ? "trending_up" : "trending_down"}
                  </span>
                  {s.trend}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* World Map */}
          <section className="col-span-12 lg:col-span-8 bg-white border border-outline-variant/30 rounded-[20px] ambient-shadow overflow-hidden flex flex-col h-[500px]">
            <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center">
              <div>
                <h4 className="text-[18px] font-bold">Global Country Analytics</h4>
                <p className="text-[13px] text-on-surface-variant">Shipping density and regional latency hotspots.</p>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 bg-surface-container rounded-lg text-[13px] font-bold">Real-time</button>
                <button className="px-3 py-1.5 hover:bg-surface-container rounded-lg text-[13px]">Forecast</button>
              </div>
            </div>
            <div className="flex-1 relative bg-slate-50 overflow-hidden">
              <div className="absolute inset-0 z-0 opacity-20 chart-grid" />
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBH4rDI-Iyv22Wq7UbykM050biwL4anV9ehSQwCeMdxvfR3UNmVMZuo2rRRGqCYgo-7GYdz__hCv-Th3opP1UChzmLr6OdE4UOF7lsmwT4HJLFYqf4fWSNnpYGGZw8P-iDiWxmnlu0_dp-BqeKF4RlT7QUo_kRJ-pT1G3IJnzQ9J5NHDRcXyJPedmUW17HxFtOR8IcFX716BvnLmQyOZ5hkM30Iu6udohlWPZvaXJnPvs9UFpEsi4A')" }}
              />
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {[
                  { port: "Shanghai Port", stat: "Delay Prob: 12%", color: "text-secondary" },
                  { port: "Rotterdam", stat: "Congestion: Low", color: "text-on-surface" },
                ].map((o) => (
                  <div key={o.port} className="glass p-3 rounded-xl border border-outline-variant/30 text-[13px]">
                    <span className={`block font-bold ${o.color}`}>{o.port}</span>
                    <span className="text-[10px] text-on-surface-variant">{o.stat}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Transport Mode */}
          <section className="col-span-12 lg:col-span-4 bg-white border border-outline-variant/30 rounded-[20px] ambient-shadow p-6 flex flex-col h-[500px]">
            <h4 className="text-[18px] font-bold mb-6">Transport Mode Breakdown</h4>
            <div className="flex-1 flex flex-col justify-around">
              {transportModes.map((m) => (
                <div key={m.label} className="group cursor-pointer">
                  <div className="flex justify-between items-end mb-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary">{m.icon}</span>
                      <span className="font-bold text-[13px]">{m.label}</span>
                    </div>
                    <span className="text-[13px] font-bold">{m.pct}%</span>
                  </div>
                  <ProgressBar value={m.pct} />
                  <p className="text-[11px] text-on-surface-variant mt-1">Average Transit: {m.transit}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-outline-variant/20">
              <button className="w-full py-3 border border-outline rounded-xl text-[13px] font-medium hover:bg-surface-container transition-colors">
                View Detailed Route Efficiency
              </button>
            </div>
          </section>

          {/* Shipment Trends */}
          <section className="col-span-12 lg:col-span-8 bg-white border border-outline-variant/30 rounded-[20px] ambient-shadow p-6 h-[400px] flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h4 className="text-[18px] font-bold">Shipment Trends</h4>
                <p className="text-[13px] text-on-surface-variant">Volume comparison: Actual vs. Predictive Forecast</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-[12px] font-medium">Actual</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-secondary/40 border border-secondary" />
                  <span className="text-[12px] font-medium">Forecast</span>
                </div>
              </div>
            </div>
            <div className="flex-1 relative mt-4">
              <div className="absolute inset-0 chart-grid opacity-30" />
              <svg className="w-full h-full overflow-visible" viewBox="0 0 800 240" preserveAspectRatio="none">
                <line stroke="#E5E7EB" strokeWidth="1" x1="0" x2="800" y1="200" y2="200" />
                <line stroke="#E5E7EB" strokeWidth="1" x1="0" x2="800" y1="150" y2="150" />
                <line stroke="#E5E7EB" strokeWidth="1" x1="0" x2="800" y1="100" y2="100" />
                <line stroke="#E5E7EB" strokeWidth="1" x1="0" x2="800" y1="50" y2="50" />
                <path d="M0,180 Q100,160 200,120 T400,140 T600,100 T800,40" fill="none" stroke="#006e2f66" strokeDasharray="6,4" strokeWidth="2" />
                <path d="M0,180 Q100,170 200,130 T300,150 T400,140 T500,110 T600,120" fill="none" stroke="#000000" strokeWidth="3" />
                <circle cx="600" cy="120" r="5" fill="#000000" />
                <circle cx="600" cy="120" r="10" fill="#000000" className="animate-ping opacity-20" />
              </svg>
              <div className="flex justify-between mt-4 text-[10px] text-on-surface-variant font-bold px-2">
                {months.map((m) => <span key={m}>{m}</span>)}
              </div>
            </div>
          </section>

          {/* Supplier Reliability */}
          <section className="col-span-12 lg:col-span-4 bg-white border border-outline-variant/30 rounded-[20px] ambient-shadow p-6 h-[400px] flex flex-col">
            <h4 className="text-[18px] font-bold mb-6">Supplier Reliability Score</h4>
            <div className="space-y-6 flex-1 overflow-y-auto scrollbar-hide">
              {suppliers.map((s) => (
                <div key={s.name} className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full bg-surface-container flex items-center justify-center font-bold text-[13px] ${s.color}`}>
                    {s.initials}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-[13px] font-bold">{s.name}</span>
                      <span className={`text-[13px] ${s.color}`}>{s.score}%</span>
                    </div>
                    <ProgressBar
                      value={s.score}
                      color={s.color === "text-secondary" ? "green" : s.color === "text-error" ? "error" : "outline"}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
