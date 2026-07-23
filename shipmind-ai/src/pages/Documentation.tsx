import MarketingLayout from "../components/layout/MarketingLayout";
import { Link } from "react-router-dom";

const sections = [
  {
    title: "Getting Started",
    icon: "rocket_launch",
    items: ["Quick Start Guide", "Authentication & API Keys", "Sandbox Environment", "First API Call"],
  },
  {
    title: "Core Concepts",
    icon: "lightbulb",
    items: ["Document Extraction", "Confidence Scoring", "Semantic Validation", "Webhook Events"],
  },
  {
    title: "API Reference",
    icon: "code",
    items: ["Document Upload", "Extraction Results", "Carrier Data", "Analytics Endpoints"],
  },
  {
    title: "Integrations",
    icon: "hub",
    items: ["SAP ERP Connector", "Oracle Cloud", "NetSuite Integration", "Slack Notifications"],
  },
  {
    title: "Advanced Usage",
    icon: "precision_manufacturing",
    items: ["Custom Entity Training", "White-Label API", "Rate Limits & Quotas", "Error Handling"],
  },
  {
    title: "Support",
    icon: "help",
    items: ["FAQ", "Release Notes", "Status Page", "Contact Support"],
  },
];

export default function Documentation() {
  return (
    <MarketingLayout>
      <div className="max-w-[1280px] mx-auto px-16 py-20">
        <div className="text-center mb-16">
          <h1 className="text-[72px] leading-[1.1] font-bold tracking-[-0.04em] mb-6">Documentation</h1>
          <p className="text-[18px] leading-7 text-on-surface-variant max-w-2xl mx-auto mb-8">
            Everything you need to integrate ShipMind AI into your logistics operations.
          </p>
          <div className="relative max-w-xl mx-auto">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input
              type="text"
              placeholder="Search documentation..."
              className="w-full bg-white border border-outline-variant rounded-2xl py-4 pl-12 pr-4 text-[15px] focus:ring-2 focus:ring-primary focus:border-primary outline-none shadow-sm transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((s) => (
            <div key={s.title} className="bg-white border border-outline-variant/30 rounded-[20px] p-8 ambient-shadow hover:-translate-y-1 transition-transform group">
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center mb-6 text-secondary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">{s.icon}</span>
              </div>
              <h3 className="font-semibold text-[18px] mb-4">{s.title}</h3>
              <ul className="space-y-2">
                {s.items.map((item) => (
                  <li key={item}>
                    <a href="#" className="text-[15px] text-on-surface-variant hover:text-secondary transition-colors flex items-center gap-2">
                      <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-primary rounded-[24px] p-12 text-center text-on-primary relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-secondary/20 blur-[80px] rounded-full" />
          <div className="relative z-10">
            <h2 className="text-[40px] font-semibold tracking-[-0.03em] mb-4">Need help getting started?</h2>
            <p className="text-on-primary/70 max-w-xl mx-auto mb-8">
              Our solutions engineers are ready to help you configure and launch ShipMind AI in your environment.
            </p>
            <Link to="/contact" className="bg-secondary text-white px-8 py-4 rounded-xl font-bold text-[15px] hover:opacity-90 transition-all inline-block">
              Talk to an Engineer
            </Link>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
