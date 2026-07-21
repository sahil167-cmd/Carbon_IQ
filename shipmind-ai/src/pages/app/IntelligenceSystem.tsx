import AppLayout from "../../components/layout/AppLayout";

const intelligenceModules = [
  {
    title: "Neural Route Engine",
    description: "Processes 14M+ data points per hour to compute optimal shipping routes across all transport modes globally.",
    icon: "route",
    metric: "14M+",
    metricLabel: "Data points/hr",
    active: true,
  },
  {
    title: "Document Intelligence",
    description: "Multi-model OCR pipeline supporting 82 languages, custom entity extraction, and semantic validation.",
    icon: "document_scanner",
    metric: "99.8%",
    metricLabel: "Accuracy",
    active: true,
  },
  {
    title: "Risk Prediction Matrix",
    description: "Analyzes historical disruption patterns, geopolitical events, and weather data to predict supply chain risks.",
    icon: "policy",
    metric: "200+",
    metricLabel: "Risk signals",
    active: true,
  },
  {
    title: "Carrier Intelligence",
    description: "Continuously scores 1,200+ carriers on reliability, cost efficiency, environmental compliance, and route coverage.",
    icon: "local_shipping",
    metric: "1,200+",
    metricLabel: "Carriers scored",
    active: false,
  },
  {
    title: "Cost Optimization AI",
    description: "Identifies spot market opportunities, contract arbitrage windows, and mode-shift savings in real-time.",
    icon: "savings",
    metric: "$2.4M",
    metricLabel: "Avg. client savings",
    active: true,
  },
  {
    title: "Compliance Intelligence",
    description: "Monitors 340+ trade regulations across 120+ countries and auto-flags non-compliant shipments.",
    icon: "gavel",
    metric: "340+",
    metricLabel: "Regulations tracked",
    active: false,
  },
];

export default function IntelligenceSystem() {
  return (
    <AppLayout title="Intelligence System" subtitle="AI Module Overview">
      <div className="pt-8 pb-[120px] px-6 max-w-[1280px] mx-auto space-y-8">
        <div className="bg-primary rounded-[24px] p-12 relative overflow-hidden text-on-primary">
          <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/20 blur-[80px] rounded-full" />
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <span className="text-[13px] uppercase tracking-wider text-on-primary/70 font-medium">Neural Processing</span>
              <p className="text-[40px] font-bold mt-2">42ms</p>
              <p className="text-on-primary/70 text-[13px]">Avg. inference latency</p>
            </div>
            <div>
              <span className="text-[13px] uppercase tracking-wider text-on-primary/70 font-medium">Model Accuracy</span>
              <p className="text-[40px] font-bold mt-2">99.8%</p>
              <p className="text-on-primary/70 text-[13px]">Across all document types</p>
            </div>
            <div>
              <span className="text-[13px] uppercase tracking-wider text-on-primary/70 font-medium">AI Uptime</span>
              <p className="text-[40px] font-bold mt-2">99.99%</p>
              <p className="text-on-primary/70 text-[13px]">Last 12 months</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {intelligenceModules.map((m) => (
            <div key={m.title} className={`bg-white border rounded-[20px] p-8 ambient-shadow flex flex-col ${m.active ? "border-outline-variant/30" : "border-outline-variant/10 opacity-60"}`}>
              <div className="flex items-start justify-between mb-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${m.active ? "bg-secondary/10 text-secondary" : "bg-surface-container text-outline"}`}>
                  <span className="material-symbols-outlined">{m.icon}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${m.active ? "bg-secondary animate-pulse" : "bg-outline"}`} />
                  <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                    {m.active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <h3 className="font-semibold text-[18px] mb-2">{m.title}</h3>
              <p className="text-[15px] text-on-surface-variant leading-relaxed flex-1">{m.description}</p>
              <div className="mt-8 pt-6 border-t border-outline-variant/20">
                <p className="text-[32px] font-bold text-primary leading-none">{m.metric}</p>
                <p className="text-[13px] text-on-surface-variant mt-1">{m.metricLabel}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
