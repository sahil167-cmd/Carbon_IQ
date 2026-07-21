import MarketingLayout from "../components/layout/MarketingLayout";
import { Link } from "react-router-dom";

const premiumFeatures = [
  { icon: "psychology", title: "Custom AI Model Training", desc: "Train dedicated OCR models on your specific document formats and terminology." },
  { icon: "route", title: "Dedicated Neural Route Engine", desc: "A private instance of our route optimization AI, calibrated to your carrier network." },
  { icon: "api", title: "Unlimited API Access", desc: "Full API with no rate limits, dedicated infrastructure, and 99.99% SLA." },
  { icon: "support_agent", title: "White-Glove Onboarding", desc: "Dedicated solutions engineer for 90-day implementation and optimization." },
  { icon: "shield", title: "Custom Data Residency", desc: "Choose where your data is processed and stored — EU, US, APAC." },
  { icon: "handshake", title: "Enterprise MSA & SOW", desc: "Full contract flexibility with custom service agreements." },
];

export default function PremiumPricing() {
  return (
    <MarketingLayout>
      <div className="max-w-[1280px] mx-auto px-16 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-24">
          <div>
            <span className="text-[13px] uppercase tracking-widest text-secondary font-bold block mb-6">Enterprise Plan</span>
            <h1 className="text-[72px] leading-[1.1] font-bold tracking-[-0.04em] mb-6">
              The OS for <br />Global Trade.
            </h1>
            <p className="text-[18px] leading-7 text-on-surface-variant mb-10">
              For organizations requiring maximum flexibility, unlimited scale, and dedicated AI infrastructure. Pricing is custom to your fleet size and requirements.
            </p>
            <div className="flex gap-4">
              <Link to="/contact" className="px-8 py-4 bg-primary text-white rounded-xl font-bold text-[15px] hover:-translate-y-px transition-transform active:scale-95">
                Talk to Sales
              </Link>
              <button className="px-8 py-4 border border-outline-variant rounded-xl font-bold text-[15px] hover:bg-surface-container-low transition-all active:scale-95">
                Download ROI Calculator
              </button>
            </div>
          </div>
          <div className="bg-primary rounded-[24px] p-12 text-on-primary relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-secondary/20 blur-[60px] rounded-full" />
            <div className="relative z-10 space-y-8">
              <div>
                <span className="text-[13px] text-on-primary/70 uppercase tracking-wider">Starting at</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-5xl font-bold">Custom</span>
                </div>
                <p className="text-on-primary/70 text-[13px] mt-1">Annual contract, billed quarterly</p>
              </div>
              <div className="space-y-4">
                {["Unlimited shipments", "Dedicated AI infrastructure", "Custom SLA (99.99%)", "White-label portal"].map((f) => (
                  <div key={f} className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span className="text-[15px]">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-[40px] font-semibold tracking-[-0.03em] mb-4 text-center">Premium Capabilities</h2>
          <p className="text-[18px] text-on-surface-variant text-center max-w-2xl mx-auto mb-12">
            Unlock the full power of ShipMind AI with capabilities designed for global enterprises.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {premiumFeatures.map((f) => (
              <div key={f.title} className="bg-white border border-outline-variant/30 rounded-[20px] p-8 ambient-shadow group hover:-translate-y-1 transition-transform">
                <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center mb-6 text-secondary group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">{f.icon}</span>
                </div>
                <h3 className="font-semibold text-[18px] mb-3">{f.title}</h3>
                <p className="text-[15px] text-on-surface-variant leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
