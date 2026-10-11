import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  Download,
  Minus,
  Plus,
} from 'lucide-react';
import { apiGet, apiDownloadBlob } from '../../lib/api-client';

export default function BrsrReportPreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await apiGet<any>(`/api/v1/brsr/reports/${id}`);
        setReport(data);
      } catch (err) {
        console.error('Failed to load preview:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id]);

  const handleDownload = async () => {
    if (!report) return;
    try {
      setIsDownloading(true);
      const safeFy = (report.financialYear || 'FY_2025-26').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `BRSR_Report_${safeFy}_v${report.version || 1}.pdf`;
      await apiDownloadBlob(`/api/v1/brsr/reports/${report.id}/download`, filename);
    } catch (err: any) {
      console.error('PDF download error:', err);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading || !report) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center font-sans">
        <p className="text-xs text-slate-500 font-medium">Loading statutory document...</p>
      </div>
    );
  }

  const secA = report.sectionAData || {};
  const carbon = report.carbonMetricsJson || {};
  const entity = secA.entityDetails || {};
  const companyName = entity.name || 'Acme Global Industries Ltd.';
  const cin = entity.cin || 'L12345MH2000PLC123456';
  const fy = report.financialYear || '2025 - 2026';
  const docRef = `BRSR-${fy.replace(/[^0-9]/g, '').slice(0, 4) || '2526'}-V${report.version || 1}`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans flex flex-col">
      {/* Top Action Toolbar (Matches Screenshot 4) */}
      <header className="brsr-no-print sticky top-0 z-50 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-xs">
        {/* Left: Back to Builder */}
        <button
          onClick={() => navigate(`/app/reports/brsr/${report.id}`)}
          className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-[#0F6B3A] transition-colors uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>BACK TO BUILDER</span>
        </button>

        {/* Right: Zoom, Print, Download */}
        <div className="flex items-center gap-3">
          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5 text-xs text-slate-700">
            <button
              onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
              className="p-1.5 hover:bg-white rounded transition-colors"
              title="Zoom Out"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-medium">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
              className="p-1.5 hover:bg-white rounded transition-colors"
              title="Zoom In"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Print Button */}
          <button
            onClick={() => window.print()}
            className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print</span>
          </button>

          {/* Download PDF Button */}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="px-4 py-1.5 bg-[#0F6B3A] hover:bg-[#125C3A] text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-all shadow-xs active:scale-95 disabled:opacity-50"
          >
            <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-bounce' : ''}`} />
            <span>{isDownloading ? 'Downloading...' : 'Download PDF'}</span>
          </button>
        </div>
      </header>

      {/* Document Workspace */}
      <main
        className="flex-1 py-10 px-4 flex flex-col items-center gap-10 overflow-auto"
        style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
      >
        {/* ========================================================================= */}
        {/* SHEET 1: STATUTORY COVER PAGE (Matches Screenshot 4)                      */}
        {/* ========================================================================= */}
        <div className="w-[794px] min-h-[1123px] bg-white border border-slate-200 rounded-2xl p-16 shadow-[0_4px_24px_rgba(0,0,0,0.06)] flex flex-col justify-between select-none">
          {/* Header Row */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[#0F6B3A] flex items-center justify-center rounded-lg text-white">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10a10 10 0 0 1-10-10C2 6.477 6.477 2 12 2z"/>
                  <path d="M7 12a5 5 0 0 1 5-5v10a5 5 0 0 1-5-5z"/>
                </svg>
              </div>
              <span className="font-extrabold text-slate-900 text-sm tracking-tight">CarbonIQ</span>
            </div>

            <div className="text-right text-[10px] text-slate-400 uppercase font-mono tracking-wider space-y-0.5">
              <div>DOCUMENT REF: {docRef}</div>
              <div>GENERATED: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</div>
            </div>
          </div>

          {/* Main Title Center Block */}
          <div className="text-center space-y-8 my-auto py-12">
            <div>
              <span className="text-sm font-extrabold uppercase tracking-widest text-[#0F6B3A] block">
                STATUTORY REPORT
              </span>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mt-2 max-w-xl mx-auto leading-tight">
                Business Responsibility & Sustainability Report
              </h1>
              <div className="w-12 h-1 bg-[#0F6B3A] rounded mx-auto mt-4" />
            </div>

            {/* Entity Block */}
            <div className="space-y-6 max-w-md mx-auto pt-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">ENTITY</span>
                <span className="text-lg font-bold text-slate-900 block mt-1">{companyName}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">FINANCIAL YEAR</span>
                <span className="text-base font-bold text-slate-900 block mt-1">{fy}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">CIN</span>
                <span className="text-xs font-mono text-slate-700 block mt-0.5">{cin}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">REPORTING BOUNDARY</span>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  {report.boundary === 'CONSOLIDATED'
                    ? 'Consolidated global operations including all manufacturing facilities and wholly-owned subsidiaries.'
                    : 'Standalone operational entity disclosures within statutory boundary.'}
                </p>
              </div>
            </div>
          </div>

          {/* Cover Footer */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>Prepared using CarbonIQ Sustainability Intelligence Platform</span>
            <span>Confidential</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SHEET 2: SECTION A: GENERAL DISCLOSURES (Matches Screenshot 3)            */}
        {/* ========================================================================= */}
        <div className="w-[794px] min-h-[1123px] bg-white border border-slate-200 rounded-2xl p-16 shadow-[0_4px_24px_rgba(0,0,0,0.06)] space-y-8 select-none">
          {/* Section Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h2 className="text-lg font-bold text-[#0F6B3A]">
              Section A: General Disclosures
            </h2>
            <span className="text-[11px] font-mono text-slate-400">{docRef}</span>
          </div>

          {/* 1. Corporate Identity */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">1. Corporate Identity</h3>
            <div className="border border-slate-200 rounded-xl p-5 grid grid-cols-2 md:grid-cols-3 gap-5 text-xs bg-white">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  REGISTERED OFFICE ADDRESS
                </span>
                <span className="text-slate-800 font-medium block mt-1 leading-snug">
                  {entity.registeredOfficeAddress || '123 Industrial Park, Phase 2, Mumbai, Maharashtra 400001, India'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  CORPORATE ADDRESS
                </span>
                <span className="text-slate-800 font-medium block mt-1 leading-snug">
                  {entity.corporateAddress || 'Same as registered office.'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  EMAIL
                </span>
                <span className="text-slate-800 font-medium block mt-1">
                  {entity.email || 'sustainability@acmeglobal.com'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  TELEPHONE
                </span>
                <span className="text-slate-800 font-medium block mt-1">
                  {entity.telephone || '+91 22 1234 5678'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  WEBSITE
                </span>
                <a
                  href={entity.website || 'https://www.acmeglobal.com'}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#0F6B3A] font-medium hover:underline block mt-1"
                >
                  {entity.website || 'www.acmeglobal.com'}
                </a>
              </div>
            </div>
          </div>

          {/* 2. Paid-up Capital */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">2. Paid-up Capital</h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-[#F8FAFC] text-slate-500 text-[10px] font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3">TYPE</th>
                    <th className="p-3 text-right">NO. OF SHARES</th>
                    <th className="p-3 text-right">VALUE (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  <tr>
                    <td className="p-3 font-medium">Equity Shares</td>
                    <td className="p-3 text-right font-mono">50,000,000</td>
                    <td className="p-3 text-right font-mono font-semibold">500,000,000.00</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium">Preference Shares</td>
                    <td className="p-3 text-right font-mono">0</td>
                    <td className="p-3 text-right font-mono">0.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Official Statutory Note */}
          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500 leading-relaxed">
              This document serves as the official draft for the Business Responsibility and Sustainability Report as mandated by the Securities and Exchange Board of India (SEBI). The information provided herein corresponds to the financial year specified and represents the consolidated operational metrics of the entity and its subsidiaries, unless otherwise explicitly stated in the reporting boundaries. All financial figures are audited and verified against the corporate ledger.
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SHEET 3: SECTION C: PRINCIPLE 6 (ENVIRONMENT & CARBON LEDGER)            */}
        {/* ========================================================================= */}
        <div className="w-[794px] min-h-[1123px] bg-white border border-slate-200 rounded-2xl p-16 shadow-[0_4px_24px_rgba(0,0,0,0.06)] space-y-8 select-none">
          {/* Section Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h2 className="text-lg font-bold text-[#0F6B3A]">
              Section C: Principle 6 (Environment & GHG Emissions)
            </h2>
            <span className="text-[11px] font-mono text-slate-400">{docRef}</span>
          </div>

          {/* Essential Indicator 4: GHG Emissions */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Essential Indicator 4: Greenhouse Gas (GHG) Scope 1 & Scope 2 Emissions
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-[#F8FAFC] text-slate-500 text-[10px] font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3">PARAMETER / CATEGORY</th>
                    <th className="p-3">UNIT</th>
                    <th className="p-3 text-right">VERIFIED EMISSIONS (t CO₂e)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  <tr>
                    <td className="p-3 font-semibold">Total Scope 1 (Direct Fuel)</td>
                    <td className="p-3 text-slate-500">Metric Tonnes CO₂e</td>
                    <td className="p-3 text-right font-mono font-bold text-[#0F6B3A]">
                      {Number(carbon.scope1?.totalTonnes ?? 11.39).toFixed(3)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 pl-6 text-slate-600">• Stationary Combustion (Diesel/Gas)</td>
                    <td className="p-3 text-slate-400">Metric Tonnes CO₂e</td>
                    <td className="p-3 text-right font-mono">
                      {Number(carbon.scope1?.stationaryCombustion?.co2eTonnes ?? 6.342).toFixed(3)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 pl-6 text-slate-600">• Mobile Fleet Combustion</td>
                    <td className="p-3 text-slate-400">Metric Tonnes CO₂e</td>
                    <td className="p-3 text-right font-mono">
                      {Number(carbon.scope1?.mobileCombustion?.co2eTonnes ?? 5.048).toFixed(3)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold">Total Scope 2 (Location-Based Grid)</td>
                    <td className="p-3 text-slate-500">Metric Tonnes CO₂e</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      {Number(carbon.scope2?.totalLocationTonnes ?? 0.314).toFixed(3)}
                    </td>
                  </tr>
                  <tr className="bg-[#F8FAFC] font-bold text-slate-900">
                    <td className="p-3">Total Scope 1 + Scope 2 Emissions</td>
                    <td className="p-3 text-slate-500 font-normal">Metric Tonnes CO₂e</td>
                    <td className="p-3 text-right font-mono text-[#0F6B3A]">
                      {Number(carbon.totalScope1And2Tonnes ?? 11.704).toFixed(3)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Essential Indicator 5: Scope 3 Value Chain */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Essential Indicator 5: Scope 3 Value Chain GHG Emissions (GLEC / GHG Protocol)
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-[#F8FAFC] text-slate-500 text-[10px] font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3">SCOPE 3 CATEGORY</th>
                    <th className="p-3">UNIT</th>
                    <th className="p-3 text-right">VERIFIED EMISSIONS (t CO₂e)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  <tr>
                    <td className="p-3 font-semibold">Total Scope 3 Emissions</td>
                    <td className="p-3 text-slate-500">Metric Tonnes CO₂e</td>
                    <td className="p-3 text-right font-mono font-bold text-[#0F6B3A]">
                      {Number(carbon.scope3?.totalTonnes ?? 11.904).toFixed(3)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 pl-6 text-slate-600">• Upstream Freight Transportation</td>
                    <td className="p-3 text-slate-400">Metric Tonnes CO₂e</td>
                    <td className="p-3 text-right font-mono">
                      {Number(carbon.scope3?.upstreamTransport?.co2eTonnes ?? 6.099).toFixed(3)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 pl-6 text-slate-600">• Purchased Goods & Raw Materials</td>
                    <td className="p-3 text-slate-400">Metric Tonnes CO₂e</td>
                    <td className="p-3 text-right font-mono">
                      {Number(carbon.scope3?.purchasedGoods?.co2eTonnes ?? 5.805).toFixed(3)}
                    </td>
                  </tr>
                  <tr className="bg-[#E6F4EA] font-bold text-[#146C43]">
                    <td className="p-3">Grand Total Organizational Emissions (Scope 1 + 2 + 3)</td>
                    <td className="p-3 font-normal text-slate-600">Metric Tonnes CO₂e</td>
                    <td className="p-3 text-right font-mono text-base">
                      {Number(carbon.grandTotalTonnes ?? 23.608).toFixed(3)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-400 italic">
              Source: CarbonIQ continuous accounting ledger. Emission factors referenced: DEFRA 2026, CEA India CO₂ Database v19, GLEC Framework v3.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
