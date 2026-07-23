import { Link } from "react-router-dom";
import MarketingLayout from "../components/layout/MarketingLayout";

const features = [
  {
    icon: "auto_mode",
    title: "Multi-lingual Document Support",
    body: "Automatically parse Bills of Lading and Invoices in 45+ languages, including complex character sets.",
    active: true,
  },
  {
    icon: "insights",
    title: "Semantic Verification",
    body: "AI cross-references document data with live port updates and carrier tracking numbers.",
    active: false,
  },
  {
    icon: "sync",
    title: "Instant ERP Mapping",
    body: "Push validated shipment data directly into SAP, Oracle, or NetSuite via pre-built connectors.",
    active: false,
  },
];


const logos = [
  { icon: "anchor", name: "PACIFIC" },
  { icon: "flight", name: "SKYNET" },
  { icon: "train", name: "RAILFORCE" },
  { icon: "directions_boat", name: "MARITIME" },
];

export default function Home() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="relative overflow-hidden py-[120px]">
        <div className="max-w-[1280px] mx-auto px-16 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 flex flex-col items-start gap-8 z-10">
            <span className="px-4 py-1.5 bg-secondary/10 text-secondary text-[13px] font-bold rounded-full border border-secondary/20">
              Series A Funded • AI-Driven Logistics
            </span>
            <h1 className="text-[72px] leading-[1.1] font-bold tracking-[-0.04em] text-primary">
              Shipment Intelligence,{" "}
              <span className="text-secondary">Redefined.</span>
            </h1>
            <p className="text-[18px] leading-7 text-on-surface-variant max-w-2xl">
              Unify your logistics data with an enterprise-grade AI engine. Extract, validate, and optimize global shipments with 99.9% accuracy.
            </p>
            <div className="flex gap-4">
              <Link
                to="/register"
                className="px-8 py-4 bg-primary text-on-primary rounded-xl text-[15px] font-bold hover:-translate-y-px transition-transform active:scale-95"
              >
                Request Access
              </Link>
              <button className="px-8 py-4 border border-outline-variant bg-white text-primary rounded-xl text-[15px] font-bold hover:bg-surface-container-low transition-all active:scale-95">
                Watch Platform Demo
              </button>
            </div>
          </div>
          <div className="lg:col-span-5 relative mt-12 lg:mt-0">
            <div className="relative z-10 p-2 glass border border-white rounded-[24px] shadow-2xl">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCTqo1ucxitbE5nhJTG2QRZwlh1TPMeef3EQoz_YUAqpReLi3ho24N-5Whmd84Lf68addvSjlgviNOvbpH_qtGOMJjfzIIIqn4tQIxtAEUWYcs1-IVGR7_VWc0vnRgRh2SDtjTviqB_kZ7HRDzpKqwGLtR3DwhLj48K33Dx5TKNDcbBdt-MxgKOfkuamgFF_Il2kEVqru9TCV1xL_awuY95gI5Ugrz_CBguLNGg4V1C1PwbBpcl30blSAZfV7w8CllV"
                alt="ShipMind AI Interface"
                className="rounded-[20px] w-full h-auto"
              />
              <div className="absolute -bottom-10 -left-10 p-6 glass border border-white/50 rounded-[20px] ambient-shadow max-w-[280px] hidden md:block">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                      verified
                    </span>
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-primary">Confidence Score</p>
                    <p className="text-[13px] text-secondary">99.8% Accuracy</p>
                  </div>
                </div>
                <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="h-full bg-secondary w-[99.8%]" />
                </div>
              </div>
            </div>
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-secondary/10 rounded-full blur-3xl -z-10" />
          </div>
        </div>
      </section>

      {/* Trusted By */}
      <section id="network" className="py-12 border-y border-outline-variant/20 bg-white">
        <div className="max-w-[1280px] mx-auto px-16 text-center">
          <p className="text-[13px] font-medium text-on-surface-variant mb-8 uppercase tracking-widest">
            Powering logistics for global leaders
          </p>
          <div className="flex flex-wrap justify-center items-center gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {logos.map((l) => (
              <div key={l.name} className="flex items-center gap-2 font-bold text-2xl text-primary">
                <span className="material-symbols-outlined">{l.icon}</span>
                {l.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Document Extraction */}
      <section id="platform" className="py-[120px] bg-surface-container-lowest">
        <div className="max-w-[1280px] mx-auto px-16">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-[40px] leading-[1.2] font-semibold tracking-[-0.03em] text-primary mb-6">
              Automate the chaos of freight documents
            </h2>
            <p className="text-[18px] leading-7 text-on-surface-variant">
              Our proprietary OCR engine doesn't just read text; it understands the semantic context of global trade documents.
            </p>
          </div>
          <div className="bg-white border border-outline-variant rounded-[24px] p-8 md:p-12 ambient-shadow overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                {features.map((f, i) => (
                  <div
                    key={i}
                    className={`p-6 rounded-2xl transition-colors group ${
                      f.active
                        ? "bg-secondary/5 border-l-4 border-secondary"
                        : "hover:bg-surface-container"
                    }`}
                  >
                    <h4 className={`text-2xl font-semibold mb-2 ${f.active ? "text-primary" : "text-primary group-hover:text-secondary transition-colors"}`}>
                      {f.title}
                    </h4>
                    <p className="text-on-surface-variant">{f.body}</p>
                  </div>
                ))}
              </div>
              <div className="relative">
                <div className="glass border border-white rounded-xl shadow-xl p-6">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <span className="text-[13px] font-medium text-secondary px-3 py-1 bg-secondary/10 rounded-full">
                      Extraction Active
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div className="h-32 bg-surface-container-high rounded-lg overflow-hidden relative">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="material-symbols-outlined text-outline text-4xl">description</span>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-secondary/20 to-transparent animate-pulse" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-surface border border-outline-variant rounded-lg">
                        <p className="text-[10px] text-outline-variant font-bold uppercase">Carrier</p>
                        <p className="text-[13px] font-bold text-primary">Maersk Line</p>
                      </div>
                      <div className="p-3 bg-surface border border-outline-variant rounded-lg">
                        <p className="text-[10px] text-outline-variant font-bold uppercase">Vessel</p>
                        <p className="text-[13px] font-bold text-primary">Edith Maersk</p>
                      </div>
                    </div>
                    <div className="p-4 bg-secondary-container/20 rounded-lg border border-secondary/20">
                      <div className="flex justify-between text-[13px] mb-2">
                        <span className="text-secondary font-bold">Confidence Analysis</span>
                        <span className="text-secondary">99.2%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/50 rounded-full overflow-hidden">
                        <div className="h-full bg-secondary w-[92%]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Bento Grid */}
      <section id="solutions" className="py-[120px]">
        <div className="max-w-[1280px] mx-auto px-16">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div className="max-w-2xl">
              <h2 className="text-[40px] font-semibold leading-[1.2] tracking-[-0.03em] text-primary mb-4">
                Enterprise-grade capabilities. Startup speed.
              </h2>
              <p className="text-[18px] leading-7 text-on-surface-variant">
                Everything you need to orchestrate global supply chains in a single, unified interface.
              </p>
            </div>
            <Link
              to="/about"
              className="text-secondary font-bold hover:underline mb-2 flex items-center gap-1"
            >
              Explore features{" "}
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Item 1 */}
            <div className="md:col-span-8 bg-white border border-outline-variant p-8 rounded-[24px] ambient-shadow flex flex-col justify-between group overflow-hidden">
              <div>
                <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center mb-6 text-secondary group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>insights</span>
                </div>
                <h3 className="text-2xl font-semibold text-primary mb-4">Predictive ETAs</h3>
                <p className="text-on-surface-variant max-w-md">
                  Our AI factors in weather patterns, port congestion, and historical lane performance to predict arrivals with 24-hour precision.
                </p>
              </div>
              <div className="mt-8 bg-surface-container-low rounded-xl h-48 relative overflow-hidden">
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-secondary/10 to-transparent flex items-end px-8 gap-2">
                  {[40, 60, 55, 80, 95, 70].map((h, i) => (
                    <div key={i} className="flex-1 bg-secondary/40 rounded-t-sm" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>
            {/* Item 2 */}
            <div className="md:col-span-4 bg-tertiary text-on-primary border border-tertiary p-8 rounded-[24px] ambient-shadow flex flex-col group">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6 text-white group-hover:rotate-12 transition-transform">
                <span className="material-symbols-outlined">security</span>
              </div>
              <h3 className="text-2xl font-semibold mb-4">Compliance Guard</h3>
              <p className="text-on-tertiary-container/80 mb-8">
                Automatically screen shipments against 200+ global sanctions lists and trade regulations in real-time.
              </p>
              <div className="mt-auto pt-8 border-t border-white/10">
                <span className="text-[13px] font-medium text-secondary-fixed">Certified SOC2 Type II</span>
              </div>
            </div>
            {/* Item 3 */}
            <div className="md:col-span-4 bg-white border border-outline-variant p-8 rounded-[24px] ambient-shadow group">
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center mb-6 text-secondary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">sync</span>
              </div>
              <h3 className="text-2xl font-semibold text-primary mb-4">Live ERP Sync</h3>
              <p className="text-on-surface-variant">
                Bidirectional synchronization ensures your source of truth is always updated across your entire tech stack.
              </p>
            </div>
            {/* Item 4 */}
            <div className="md:col-span-8 glass border border-outline-variant p-8 rounded-[24px] ambient-shadow flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1">
                <h3 className="text-2xl font-semibold text-primary mb-4">Intelligent Routing</h3>
                <p className="text-on-surface-variant">
                  Identify alternative routes and carriers when disruptions occur. Save up to 14% on spot-market freight costs.
                </p>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-4 w-full">
                {[{ v: "14%", l: "Avg. Savings" }, { v: "40%", l: "Time Reduced" }].map((s) => (
                  <div key={s.l} className="aspect-square rounded-2xl bg-surface-container-high flex flex-col items-center justify-center text-center p-4">
                    <span className="text-2xl font-bold text-secondary">{s.v}</span>
                    <span className="text-[13px] text-on-surface-variant">{s.l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-[120px]">
        <div className="max-w-[1280px] mx-auto px-16">
          <div className="bg-primary rounded-[32px] p-12 md:p-24 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/20 blur-[100px] rounded-full" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary-container/40 blur-[100px] rounded-full" />
            <div className="relative z-10">
              <h2 className="text-[72px] leading-[1.1] font-bold tracking-[-0.04em] text-white mb-8">
                Ready to modernize your logistics?
              </h2>
              <p className="text-[18px] leading-7 text-on-primary-container max-w-2xl mx-auto mb-12">
                Join over 500+ global shippers and freight forwarders using ShipMind AI to eliminate manual data entry and gain predictive visibility.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link
                  to="/register"
                  className="px-10 py-5 bg-secondary text-white rounded-xl text-[15px] font-bold hover:-translate-y-0.5 hover:shadow-lg transition-all active:scale-95"
                >
                  Get Started Today
                </Link>
                <Link
                  to="/contact"
                  className="px-10 py-5 border border-white/20 text-white rounded-xl text-[15px] font-bold hover:bg-white/10 transition-all active:scale-95"
                >
                  Talk to Sales
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
