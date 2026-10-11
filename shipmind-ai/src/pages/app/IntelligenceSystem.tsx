import { useState, useEffect } from "react";
import AppLayout from "../../components/layout/AppLayout";
import {
  BarChart2,
  GitFork,
  TrendingUp,
  FileText,
  AlertTriangle,
  Lightbulb,
  Search,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Sparkles,
} from "lucide-react";
import { apiGet, apiPost } from "../../lib/api-client";

export default function IntelligenceSystem() {
  const [searchQuery, setSearchQuery] = useState("");
  const [totalDocs, setTotalDocs] = useState(18);
  const [totalEmissions, setTotalEmissions] = useState<number>(14716.0);
  const [answerResult, setAnswerResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchLiveMetrics();
  }, []);

  const fetchLiveMetrics = async () => {
    try {
      const docRes = await apiGet<{ total: number }>("/api/v1/documents", { limit: 1 });
      if (docRes && typeof docRes.total === "number") {
        setTotalDocs(docRes.total);
      }
    } catch {}

    try {
      const carbonRes = await apiGet<{ grandTotal: number }>("/api/v1/carbon/total");
      if (carbonRes && typeof carbonRes.grandTotal === "number") {
        setTotalEmissions(carbonRes.grandTotal / 1000.0);
      }
    } catch {}
  };

  const handleExecuteQuery = async (queryToRun?: string) => {
    const q = (queryToRun || searchQuery).trim();
    if (!q || isLoading) return;

    setIsLoading(true);
    setAnswerResult(null);
    try {
      const res = await apiPost<{ answer: string }>("/api/v1/copilot/query", {
        message: q,
      });
      setAnswerResult(res.answer || "Query completed.");
    } catch (err: any) {
      setAnswerResult(`⚠️ ${err.message || "Failed to process query."}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout title="Intelligence Command" subtitle="Botanical Intelligence Landing">
      <div className="pt-6 pb-[120px] px-6 max-w-[1400px] mx-auto space-y-8 font-sans">
        
        {/* Main Grid: Center Command (Col 1-2) + Right Intelligence Activity (Col 3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Center Stage Command Center (Matching Reference Image 5) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Command Header Hero */}
            <div className="bg-[#0a0f17] border border-slate-800 rounded-[28px] p-8 space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  RAG ACTIVE • DATA VERIFIED
                </span>
              </div>

              {/* Hero Title */}
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">
                  Ask CarbonIQ
                </h1>
                <p className="text-xs text-slate-400 mt-2 max-w-xl leading-relaxed">
                  Query your entire carbon graph. Synthesize emissions data, analyze supplier compliance, or forecast reduction pathways using Botanical Intelligence.
                </p>
              </div>

              {/* Search Bar with Execute Button (Matching Image 5) */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleExecuteQuery();
                }}
                className="bg-[#111926] border border-slate-700/80 rounded-2xl p-2 flex items-center gap-3 shadow-inner focus-within:border-emerald-500/60 transition-all"
              >
                <Search className="w-5 h-5 text-slate-500 pl-1 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. 'Analyze Q3 Scope 3 variance across Tier 1 suppliers...'"
                  className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-500 outline-none font-sans"
                />
                <button
                  type="submit"
                  disabled={isLoading || !searchQuery.trim()}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 disabled:opacity-40 active:scale-95 shadow-md shrink-0"
                >
                  {isLoading ? "Analyzing..." : "Execute"} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* Starter Quick Pills */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setSearchQuery("Summarize our latest carbon audit and verified emissions.");
                    handleExecuteQuery("Summarize our latest carbon audit and verified emissions.");
                  }}
                  className="text-[11px] font-mono bg-[#131d2b] hover:bg-emerald-950/60 text-slate-300 hover:text-emerald-300 border border-slate-800 hover:border-emerald-500/40 px-3 py-1.5 rounded-full transition-all"
                >
                  Summarize latest audit
                </button>
                <button
                  onClick={() => {
                    setSearchQuery("Forecast 2026 emissions using XGBoost model.");
                    handleExecuteQuery("Forecast 2026 emissions using XGBoost model.");
                  }}
                  className="text-[11px] font-mono bg-[#131d2b] hover:bg-emerald-950/60 text-slate-300 hover:text-emerald-300 border border-slate-800 hover:border-emerald-500/40 px-3 py-1.5 rounded-full transition-all"
                >
                  Forecast 2026 emissions
                </button>
                <button
                  onClick={() => {
                    setSearchQuery("Identify supplier anomalies and high-intensity freight.");
                    handleExecuteQuery("Identify supplier anomalies and high-intensity freight.");
                  }}
                  className="text-[11px] font-mono bg-[#131d2b] hover:bg-emerald-950/60 text-slate-300 hover:text-emerald-300 border border-slate-800 hover:border-emerald-500/40 px-3 py-1.5 rounded-full transition-all"
                >
                  Identify supplier anomalies
                </button>
              </div>

              {/* Execution Result Box if Query Run */}
              {answerResult && (
                <div className="p-4 rounded-2xl bg-[#0d1420] border border-emerald-500/40 shadow-xl space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Intelligence Synthesis
                    </span>
                    <button
                      onClick={() => setAnswerResult(null)}
                      className="text-[10px] text-slate-500 hover:text-slate-300"
                    >
                      Clear
                    </button>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line font-sans">
                    {answerResult}
                  </p>
                </div>
              )}
            </div>

            {/* 6 Category Intelligence Cards (Matching Reference Image 5) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* 1. Emissions */}
              <a
                href="/app/analytics"
                className="p-5 rounded-2xl bg-[#0a0f17] hover:bg-[#111927] border border-slate-800 hover:border-emerald-500/40 transition-all space-y-2 group shadow-lg"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm text-white group-hover:text-emerald-300">Emissions</h4>
                <p className="text-[11px] text-slate-400">Live tracking & categorization across Scopes 1, 2, and 3.</p>
              </a>

              {/* 2. Scope 3 */}
              <a
                href="/app/analytics"
                className="p-5 rounded-2xl bg-[#0a0f17] hover:bg-[#111927] border border-slate-800 hover:border-emerald-500/40 transition-all space-y-2 group shadow-lg"
              >
                <div className="w-8 h-8 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <GitFork className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm text-white group-hover:text-cyan-300">Scope 3</h4>
                <p className="text-[11px] text-slate-400">Value chain mapping, upstream logistics, and supplier spend.</p>
              </a>

              {/* 3. Forecast */}
              <a
                href="/app/analytics"
                className="p-5 rounded-2xl bg-[#0a0f17] hover:bg-[#111927] border border-slate-800 hover:border-emerald-500/40 transition-all space-y-2 group shadow-lg"
              >
                <div className="w-8 h-8 rounded-xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm text-white group-hover:text-purple-300">Forecast</h4>
                <p className="text-[11px] text-slate-400">Predictive reduction models powered by XGBoost & lag features.</p>
              </a>

              {/* 4. Documents */}
              <a
                href="/app/documents"
                className="p-5 rounded-2xl bg-[#0a0f17] hover:bg-[#111927] border border-slate-800 hover:border-emerald-500/40 transition-all space-y-2 group shadow-lg"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-950/60 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <FileText className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm text-white group-hover:text-blue-300">Documents</h4>
                <p className="text-[11px] text-slate-400">Audit-ready ledgers with 1536-dim pgvector semantic search.</p>
              </a>

              {/* 5. Anomalies */}
              <a
                href="/app/analytics"
                className="p-5 rounded-2xl bg-[#0a0f17] hover:bg-[#111927] border border-slate-800 hover:border-emerald-500/40 transition-all space-y-2 group shadow-lg"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-950/60 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm text-white group-hover:text-amber-300">Anomalies</h4>
                <p className="text-[11px] text-slate-400">AI-detected data variance and fugitive emission spikes.</p>
              </a>

              {/* 6. Decarbonize */}
              <a
                href="/app/analytics"
                className="p-5 rounded-2xl bg-[#0a0f17] hover:bg-[#111927] border border-slate-800 hover:border-emerald-500/40 transition-all space-y-2 group shadow-lg"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm text-white group-hover:text-emerald-300">Decarbonize</h4>
                <p className="text-[11px] text-slate-400">Actionable pathways for PPA procurement & fleet electrification.</p>
              </a>
            </div>
          </div>

          {/* Right Sidebar Status & Recent Activity (Matching Image 5) */}
          <div className="space-y-6">
            
            {/* System Context Card */}
            <div className="bg-[#0a0f17] border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
              <div>
                <p className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">System Context</p>
                <p className="text-xs font-bold text-slate-200 mt-1 font-mono">Current Audit Period: FY26</p>
              </div>

              <div className="pt-3 border-t border-slate-800">
                <p className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Total Footprint (YTD)</p>
                <p className="text-2xl font-black text-white font-mono mt-1">
                  {totalEmissions.toLocaleString("en-US", { maximumFractionDigits: 1 })} <span className="text-xs text-slate-400 font-normal">tCO₂e</span>
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 space-y-1">
                <p className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Connected Knowledge</p>
                <p className="text-xs text-emerald-400 font-mono font-bold">{totalDocs} Indexed Documents</p>
              </div>
            </div>

            {/* Recent Intelligence Activity Feed (Matching Image 5) */}
            <div className="bg-[#0a0f17] border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
              <h4 className="font-bold text-xs text-white font-mono uppercase tracking-wider">
                Recent Intelligence Activity
              </h4>

              <div className="space-y-3.5">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-3 h-3" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">Supplier report processed</p>
                    <p className="text-[10px] font-mono text-slate-500">2 mins ago • Air Freight AWB</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Cpu className="w-3 h-3" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">Model weights synced</p>
                    <p className="text-[10px] font-mono text-slate-500">1 hr ago • XGBoost v4.2</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-3 h-3" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-300">Anomaly in Facility Alpha</p>
                    <p className="text-[10px] font-mono text-slate-500">Action required • Refrigerant spike</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </AppLayout>
  );
}
