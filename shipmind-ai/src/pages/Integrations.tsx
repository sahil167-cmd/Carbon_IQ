import MarketingLayout from "../components/layout/MarketingLayout";

const integrations = [
  { name: "SAP ERP", category: "ERP", icon: "corporate_fare", desc: "Bidirectional sync for purchase orders and shipment records." },
  { name: "Oracle Cloud", category: "ERP", icon: "cloud", desc: "Real-time data push to Oracle Supply Chain Management." },
  { name: "NetSuite", category: "ERP", icon: "hub", desc: "Automated fulfillment updates and invoice matching." },
  { name: "Salesforce", category: "CRM", icon: "support_agent", desc: "Connect shipment data to customer records and opportunities." },
  { name: "Slack", category: "Communication", icon: "chat", desc: "Instant alerts for delays, flags, and key milestones." },
  { name: "Microsoft Teams", category: "Communication", icon: "groups", desc: "Shipment notifications delivered directly to team channels." },
  { name: "Power BI", category: "Analytics", icon: "bar_chart", desc: "Push CarbonIQ data into custom Power BI dashboards." },
  { name: "Tableau", category: "Analytics", icon: "insights", desc: "Live data connector for advanced logistics visualization." },
  { name: "DHL API", category: "Carrier", icon: "local_shipping", desc: "Direct tracking and rate quoting via DHL API." },
  { name: "FedEx", category: "Carrier", icon: "local_shipping", desc: "Integrated tracking, bookings, and label generation." },
  { name: "Maersk", category: "Carrier", icon: "directions_boat", desc: "Ocean shipment data, vessel tracking, and booking API." },
  { name: "REST API", category: "Developer", icon: "code", desc: "Full-featured REST API for custom integrations." },
];

const categories = ["All", "ERP", "CRM", "Communication", "Analytics", "Carrier", "Developer"];

export default function Integrations() {
  return (
    <MarketingLayout>
      <div className="max-w-[1280px] mx-auto px-16 py-20">
        <div className="text-center mb-16">
          <h1 className="text-[72px] leading-[1.1] font-bold tracking-[-0.04em] mb-6">Integrations</h1>
          <p className="text-[18px] leading-7 text-on-surface-variant max-w-2xl mx-auto">
            Connect CarbonIQ with your existing tools to create a unified logistics intelligence stack.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 justify-center mb-12">
          {categories.map((cat, i) => (
            <button
              key={cat}
              className={`px-5 py-2.5 rounded-full text-[13px] font-medium border transition-all ${
                i === 0
                  ? "bg-primary text-white border-primary"
                  : "border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {integrations.map((integ) => (
            <div key={integ.name} className="bg-white border border-outline-variant/30 rounded-[20px] p-6 ambient-shadow hover:-translate-y-1 transition-transform group cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-surface-container rounded-xl flex items-center justify-center group-hover:bg-secondary/10 transition-colors">
                  <span className="material-symbols-outlined text-primary group-hover:text-secondary transition-colors">{integ.icon}</span>
                </div>
                <span className="text-[11px] font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {integ.category}
                </span>
              </div>
              <h3 className="font-semibold text-[18px] mb-2">{integ.name}</h3>
              <p className="text-[13px] text-on-surface-variant leading-relaxed">{integ.desc}</p>
              <button className="mt-4 text-secondary text-[13px] font-bold flex items-center gap-1 hover:gap-2 transition-all opacity-0 group-hover:opacity-100">
                Learn more <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center p-12 bg-surface-container-lowest border border-outline-variant/30 rounded-[24px]">
          <h2 className="text-[40px] font-semibold tracking-[-0.03em] mb-4">Don't see your tool?</h2>
          <p className="text-[18px] text-on-surface-variant max-w-xl mx-auto mb-8">
            Our REST API and webhook system support any integration. We also offer custom connector development.
          </p>
          <button className="bg-primary text-white px-8 py-4 rounded-xl font-bold text-[15px] hover:opacity-90 transition-all">
            Request an Integration
          </button>
        </div>
      </div>
    </MarketingLayout>
  );
}
