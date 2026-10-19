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


const standards = [
  { icon: "verified", name: "GHG PROTOCOL" },
  { icon: "calculate", name: "GLEC V3.0" },
  { icon: "description", name: "SEBI BRSR CORE" },
  { icon: "inventory_2", name: "ISO 14083 / EN 16258" },
  { icon: "analytics", name: "DEFRA EMISSIONS" },
];

export default function Home() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="relative overflow-hidden py-[100px]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 flex flex-col items-start gap-6 z-10">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 text-emerald-800 text-[13px] font-bold rounded-full border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              GHG Protocol & GLEC Certified Carbon Engine
            </span>
            <h1 className="text-[48px] md:text-[68px] leading-[1.1] font-extrabold tracking-[-0.04em] text-primary">
              Carbon Accounting,{" "}
              <span className="text-secondary">Automated.</span>
            </h1>
            <p className="text-[17px] md:text-[18px] leading-7 text-on-surface-variant max-w-2xl">
              End-to-end Scope 1, 2, and 3 freight emissions intelligence. Transform logistics bills of lading into audit-ready BRSR and GLEC compliance reports with 100% deterministic accuracy.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                to="/login"
                className="px-8 py-4 bg-primary text-white rounded-xl text-[15px] font-bold hover:bg-primary/90 transition-all shadow-md active:scale-95"
              >
                Access Dashboard
              </Link>
              <Link
                to="/register"
                className="px-8 py-4 border border-outline-variant bg-white text-primary rounded-xl text-[15px] font-bold hover:bg-surface-container-low transition-all active:scale-95"
              >
                Create Account
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 relative mt-8 lg:mt-0">
            {/* Native CarbonIQ Glassmorphic Preview */}
            <div className="relative z-10 glass border border-slate-200/90 rounded-[28px] shadow-2xl p-6 bg-white/95 backdrop-blur-xl">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#0F6B3A] flex items-center justify-center text-white shadow-sm">
                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">CarbonIQ Emission Engine</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Real-time GLEC & GHG Protocol</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              </div>

              {/* Emissions KPI Grid */}
              <div className="grid grid-cols-3 gap-2.5 mb-5">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Scope 1</span>
                  <div className="text-sm md:text-base font-extrabold text-slate-900 mt-0.5">1,420.5</div>
                  <div className="text-[10px] font-medium text-slate-500">tCO₂e (Fleet)</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Scope 2</span>
                  <div className="text-sm md:text-base font-extrabold text-slate-900 mt-0.5">680.2</div>
                  <div className="text-[10px] font-medium text-slate-500">tCO₂e (Energy)</div>
                </div>
                <div className="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-200 text-center">
                  <span className="text-[10px] font-bold tracking-wider text-emerald-800 uppercase">Scope 3</span>
                  <div className="text-sm md:text-base font-extrabold text-emerald-700 mt-0.5">4,890.1</div>
                  <div className="text-[10px] font-medium text-emerald-600">tCO₂e (Freight)</div>
                </div>
              </div>

              {/* Verified Manifest Activity */}
              <div className="space-y-2.5 mb-5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Verified Manifest Pipeline</span>
                  <span className="text-[11px] text-emerald-600 font-bold">100% Audit Ready</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100/80 text-emerald-800 flex items-center justify-center">
                      <span className="material-symbols-outlined text-base">local_shipping</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">MUM-DEL Interstate Freight</p>
                      <p className="text-[10px] text-slate-500">1,420 km • Heavy Commercial Truck</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-extrabold text-slate-900">1,136 kg CO₂e</p>
                    <span className="text-[10px] text-emerald-600 font-bold">GLEC V3.0</span>
                  </div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100/80 text-blue-800 flex items-center justify-center">
                      <span className="material-symbols-outlined text-base">directions_boat</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">JNPT to Rotterdam Maritime</p>
                      <p className="text-[10px] text-slate-500">6,500 nm • Container Vessel</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-extrabold text-slate-900">3,420 kg CO₂e</p>
                    <span className="text-[10px] text-blue-600 font-bold">ISO 14083</span>
                  </div>
                </div>
              </div>

              {/* Engine Confidence */}
              <div className="p-3 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-xl border border-emerald-500/20">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-emerald-900 font-bold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-emerald-600" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                    ML Forecasting & Audit Trail
                  </span>
                  <span className="text-emerald-700 font-extrabold">99.8% Precision</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 w-[99.8%] rounded-full" />
                </div>
              </div>
            </div>
            <div className="absolute -top-16 -right-16 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl -z-10" />
            <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-teal-400/15 rounded-full blur-3xl -z-10" />
          </div>
        </div>
      </section>

      {/* Standards & Compliance */}
      <section id="network" className="py-12 border-y border-outline-variant/20 bg-white">
        <div className="max-w-[1280px] mx-auto px-6 md:px-16 text-center">
          <p className="text-[13px] font-semibold text-slate-400 mb-8 uppercase tracking-widest">
            Certified Carbon Accounting & Framework Standards
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-14 text-slate-700 font-bold">
            {standards.map((s) => (
              <div key={s.name} className="flex items-center gap-2 text-xs md:text-sm font-extrabold text-slate-800 tracking-tight hover:text-emerald-700 transition-colors">
                <span className="material-symbols-outlined text-emerald-600 text-lg md:text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                {s.name}
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
      <section className="py-[100px]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-16">
          <div className="bg-[#0F6B3A] rounded-[32px] p-10 md:p-20 text-center relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/20 blur-[100px] rounded-full" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-400/20 blur-[100px] rounded-full" />
            <div className="relative z-10">
              <h2 className="text-[44px] md:text-[64px] leading-[1.1] font-extrabold tracking-[-0.04em] text-white mb-6">
                Audit-Ready Carbon Intelligence Platform
              </h2>
              <p className="text-[17px] md:text-[18px] leading-7 text-emerald-100 max-w-2xl mx-auto mb-10">
                Transform supply chain bills of lading and logistics records into verified GHG Protocol and SEBI BRSR reports with zero manual friction.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link
                  to="/login"
                  className="px-10 py-4 bg-white text-[#0F6B3A] rounded-xl text-[15px] font-bold hover:bg-slate-50 hover:shadow-lg transition-all active:scale-95"
                >
                  Access Platform
                </Link>
                <Link
                  to="/register"
                  className="px-10 py-4 border border-white/40 text-white rounded-xl text-[15px] font-bold hover:bg-white/10 transition-all active:scale-95"
                >
                  Create Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
