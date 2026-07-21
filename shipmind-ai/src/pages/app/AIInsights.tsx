import AppLayout from "../../components/layout/AppLayout";

const insights = [
  {
    type: "warning",
    icon: "warning",
    title: "Port Congestion Alert",
    body: "Shanghai port experiencing 3-5 day delays due to weather disruptions. 12 of your active shipments may be affected.",
    action: "View Affected Shipments",
    time: "2 min ago",
    color: "amber",
  },
  {
    type: "opportunity",
    icon: "savings",
    title: "Cost Optimization Opportunity",
    body: "AI detected a $142K savings opportunity by rerouting 8 LCL shipments through Valencia instead of Rotterdam next month.",
    action: "Review Optimization",
    time: "18 min ago",
    color: "green",
  },
  {
    type: "compliance",
    icon: "policy",
    title: "Compliance Check Required",
    body: "New US import regulations for HS 8542.xx codes take effect Nov 1. 24 upcoming shipments require updated documentation.",
    action: "Review Compliance Updates",
    time: "1 hr ago",
    color: "red",
  },
  {
    type: "performance",
    icon: "trending_up",
    title: "Carrier Performance Milestone",
    body: "MSC Mediterranean has achieved 97.2% on-time delivery across your 85 recent ocean shipments—a 4.3% improvement.",
    action: "View Carrier Report",
    time: "3 hr ago",
    color: "green",
  },
  {
    type: "prediction",
    icon: "psychology",
    title: "Predictive ETA Update",
    body: "Vessel Emma Maersk (VOY-2024-892) now predicted to arrive 18 hours early. Adjust your warehouse intake schedule.",
    action: "Update Schedule",
    time: "6 hr ago",
    color: "blue",
  },
];

const colorMap: Record<string, string> = {
  amber: "bg-amber-50 border-amber-200 text-amber-700",
  green: "bg-secondary/5 border-secondary/20 text-secondary",
  red: "bg-error-container border-error/20 text-error",
  blue: "bg-primary/5 border-primary/20 text-primary",
};

const iconBg: Record<string, string> = {
  amber: "bg-amber-100 text-amber-600",
  green: "bg-secondary/10 text-secondary",
  red: "bg-error-container text-error",
  blue: "bg-primary/10 text-primary",
};

export default function AIInsights() {
  return (
    <AppLayout title="AI Insights" subtitle="Predictive Intelligence Feed">
      <div className="pt-8 pb-[120px] px-6 max-w-[1280px] mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-[40px] font-semibold leading-none tracking-[-0.03em] text-primary">AI Insights</h2>
            <p className="text-[15px] text-on-surface-variant mt-2">
              Real-time predictive intelligence from the ShipMind AI engine.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="border border-outline-variant px-4 py-2 rounded-xl text-[13px] font-medium hover:bg-surface-container transition-colors">
              Filter by Type
            </button>
            <button className="bg-primary text-white px-4 py-2 rounded-xl text-[13px] font-bold hover:opacity-90 transition-all">
              Mark All Read
            </button>
          </div>
        </div>

        {/* Insights Feed */}
        <div className="space-y-4">
          {insights.map((insight, i) => (
            <div
              key={i}
              className={`border rounded-[20px] p-6 flex gap-6 items-start transition-all hover:-translate-y-0.5 ${colorMap[insight.color]}`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg[insight.color]}`}>
                <span className="material-symbols-outlined">{insight.icon}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4">
                  <h4 className="font-semibold text-[18px] text-primary">{insight.title}</h4>
                  <span className="text-[13px] text-on-surface-variant whitespace-nowrap">{insight.time}</span>
                </div>
                <p className="text-[15px] text-on-surface-variant mt-2 leading-relaxed">{insight.body}</p>
                <button className="mt-4 text-[13px] font-bold flex items-center gap-1 hover:gap-2 transition-all">
                  {insight.action} <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
