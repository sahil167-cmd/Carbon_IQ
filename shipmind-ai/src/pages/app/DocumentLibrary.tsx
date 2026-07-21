import { useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import Pagination from "../../components/shared/Pagination";
import StatusBadge from "../../components/shared/StatusBadge";
import ConfidenceBadge from "../../components/shared/ConfidenceBadge";
import type { Document, DocumentStatus } from "../../types";

const documents: Document[] = [
  { id: "1", name: "INV-2024-0892.pdf", type: "Commercial Invoice", confidence: 99.8, status: "Processed", date: "Oct 14, 2024", source: "SAP ERP", size: "1.2 MB" },
  { id: "2", name: "BOL-HK-4410.pdf", type: "Bill of Lading", confidence: 76.4, status: "Manual Review", date: "Oct 14, 2024", source: "Mail Drop", size: "840 KB" },
  { id: "3", name: "MANIFEST_LAX_12.jpg", type: "Cargo Manifest", confidence: 42.1, status: "Flagged", date: "Oct 13, 2024", source: "Mobile Scan", size: "2.4 MB" },
  { id: "4", name: "RECEIPT_SHG_01.pdf", type: "Terminal Receipt", confidence: 65, status: "Processing", date: "Just now", source: "API Upload", size: "45 KB" },
  { id: "5", name: "PL_6772_EU.pdf", type: "Packing List", confidence: 94.2, status: "Processed", date: "Oct 12, 2024", source: "SAP ERP", size: "2.1 MB" },
];

const filterButtons = [
  { label: "Status: All" },
  { label: "Date: Last 30 days" },
  { label: "Source: ERP Connect" },
  { label: "Confidence: High" },
];

const docThumbs: Record<string, string> = {
  "1": "https://lh3.googleusercontent.com/aida-public/AB6AXuD1w2zh5scrji172hzo_zuKdFuzk3iyhV3IGUNjmXzBHjI0vFw84jsWxZLW6CDfOgZ6aOYhG2y5-gBDwNRp5lJs921-SjRsusFnowzFDKnFHXAZNXvLvYl9336PI2MwgS7abacggRn7EodZ9AbeP8MJz909x4VKwF5vSUtIsB6w16bgo02r8rzl_L_v7nkPw2cq20Zc4wbYwrb46QUq40_2u3dStvmneQwp1IxCO5C0K_SNTB02ndg",
  "2": "https://lh3.googleusercontent.com/aida-public/AB6AXuAnLuSERUFf37cumorHA-7s3LZFLYr4hpxlsuOAiffS1VkckemXC5fj6i0GlrhPMBVAPZkuRhm1dJfFMnhimyA0WNJCJtR4bY3GGXflTrhPZ1tMy0iBSi-cDeOE41pOqW5hn_idDuqEGJ50FpOH2EqZZ7WfYrlCA_Nn1SO5XDm62m3iWXzIRnyF_dLGRKIsGWZO5rzhgQK7kbmaN9dzHk5w6Kapwg0fdTbykFyme1EMT10eFtYZBog",
  "3": "https://lh3.googleusercontent.com/aida-public/AB6AXuB15wMWju9gV73JXLNDE6RbAkkqIG19hgMNdglatbSk3dbxWIPjk9wa80TAa-2loExglzuyba51loNdNXY-gqyfSQGx3lxFfc4sclpiPD-LBD-E-wIK2JPK-i_J8ONhmgFLiXtMCA7tUXO-akjbLdhxZ5Qs93bBx_0JGxi2kcE-UWy2NJ9bbaK46XHPra4mENVRHetz2_4KwG4JadgtSShPA4h2ZIoSAgd9wbQ9QqovhIch46M_bbI",
  "5": "https://lh3.googleusercontent.com/aida-public/AB6AXuBHNbhskPg4XDI6NWD1RtANnJ3zjCHsjNA5KdkRZOsIYcSIO8y6LGbmrizO4nYZCjOE8IhlmfUqxSRctpUs0v1jzysZ6PMIq4HMtHPcyLn3Kr9FPRC8MlkH-gH7DbwGC86lRcNsA0ZhRISeH7w4kPtPwJ6C3R9hsL9dLVY8VyRIQzp4tLsioAEeX3tw8zbEnz1zkloyYCfmEDUxTqY_cy2V8Pn42Dd_N-3UBa3HQFY7Z2c-N0wWluA",
};

export default function DocumentLibrary() {
  const [page, setPage] = useState(1);
  const [checked, setChecked] = useState<string[]>([]);

  const toggleCheck = (id: string) =>
    setChecked((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  return (
    <AppLayout title="Document Library" subtitle="AI Processing Stream">
      {/* Header */}
      <header className="sticky top-16 z-30 glass border-b border-outline-variant/30 px-5 md:px-16 py-6">
        <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-[40px] font-semibold leading-[1.2] tracking-[-0.03em] text-primary">Document Library</h2>
            <p className="text-[15px] text-on-surface-variant">Automated classification and data extraction from 4,284 files.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-grow md:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
              <input
                className="w-full bg-surface border border-outline-variant rounded-xl py-2.5 pl-10 pr-4 text-[15px] focus:ring-2 focus:ring-primary/5 focus:border-primary outline-none transition-all"
                placeholder="Search invoices, BOLs, receipts..."
                type="text"
              />
            </div>
            <button className="bg-surface border border-outline-variant p-2.5 rounded-xl text-on-surface hover:bg-surface-container transition-colors active:scale-95">
              <span className="material-symbols-outlined">tune</span>
            </button>
            <button className="bg-primary text-white py-2.5 px-6 rounded-xl text-[13px] font-bold hover:opacity-90 transition-all active:scale-95 hidden lg:block">
              Upload Documents
            </button>
          </div>
        </div>
      </header>

      <div className="px-5 md:px-16 pb-[120px]">
        {/* Stats Overview */}
        <section className="mt-6 max-w-[1280px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white border border-outline-variant p-8 rounded-[20px] ambient-shadow flex flex-col justify-between">
              <span className="text-[13px] font-medium text-on-surface-variant uppercase tracking-widest">Global Confidence</span>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-[40px] font-bold leading-tight text-primary">98.2%</span>
                <span className="text-secondary text-[13px] font-bold flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[14px]">trending_up</span> 0.4%
                </span>
              </div>
              <div className="mt-6 w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-secondary w-[98.2%]" />
              </div>
            </div>
            <div className="bg-white border border-outline-variant p-8 rounded-[20px] ambient-shadow flex flex-col justify-between">
              <span className="text-[13px] font-medium text-on-surface-variant uppercase tracking-widest">Awaiting Review</span>
              <div className="mt-4">
                <span className="text-[40px] font-bold leading-tight text-primary">124</span>
              </div>
              <p className="mt-2 text-[13px] text-on-surface-variant">42 urgent flagged items</p>
            </div>
            <div className="md:col-span-2 bg-primary-container p-8 rounded-[20px] ambient-shadow relative overflow-hidden group">
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex justify-between items-start">
                  <span className="text-[13px] text-on-primary-container uppercase tracking-widest font-medium">AI Extraction Engine</span>
                  <div className="flex items-center gap-1.5 bg-secondary-container/20 px-3 py-1 rounded-full border border-secondary-fixed/30">
                    <span className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
                    <span className="text-[11px] font-bold text-secondary uppercase">Live Processing</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-white">
                    Optimize your workflow with Predictive Serenity.
                  </h3>
                  <button className="mt-4 text-white text-[13px] flex items-center gap-2 group-hover:gap-3 transition-all">
                    Launch Automation Studio <span className="material-symbols-outlined">arrow_forward</span>
                  </button>
                </div>
              </div>
              <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-secondary/10 blur-[80px] rounded-full" />
            </div>
          </div>
        </section>

        {/* Library Content */}
        <section className="mt-10 max-w-[1280px] mx-auto">
          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2 md:pb-0">
              {filterButtons.map((f) => (
                <button
                  key={f.label}
                  className="bg-white border border-outline-variant px-4 py-2 rounded-full text-[13px] text-primary flex items-center gap-2 whitespace-nowrap hover:bg-surface-container-low transition-colors"
                >
                  {f.label} <span className="material-symbols-outlined text-[16px]">expand_more</span>
                </button>
              ))}
              <div className="w-px h-6 bg-outline-variant/30 mx-2" />
              <button className="text-on-surface-variant text-[13px] hover:text-primary transition-colors whitespace-nowrap">
                Clear all
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[13px] text-on-surface-variant">{checked.length} items selected</span>
              <button
                disabled={checked.length === 0}
                className="bg-white border border-outline-variant px-4 py-2 rounded-xl text-[13px] text-on-surface-variant disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:bg-surface-container-low transition-colors"
              >
                Bulk Actions
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-outline-variant rounded-[20px] ambient-shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low/50">
                    <th className="py-4 pl-8 pr-4 w-12">
                      <input type="checkbox" className="w-5 h-5 rounded border-outline-variant" />
                    </th>
                    {["Document", "Status", "Confidence", "Date Processed", "Source", "Actions"].map((h, i) => (
                      <th key={h} className={`py-4 px-4 text-[13px] text-on-surface-variant uppercase tracking-widest font-bold ${i === 5 ? "text-right pr-8" : ""}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-surface transition-colors group">
                      <td className="py-5 pl-8 pr-4">
                        <input
                          type="checkbox"
                          checked={checked.includes(doc.id)}
                          onChange={() => toggleCheck(doc.id)}
                          className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary/20"
                        />
                      </td>
                      <td className="py-5 px-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-12 bg-surface-container-high rounded border border-outline-variant flex-shrink-0 overflow-hidden relative">
                            {docThumbs[doc.id] ? (
                              <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url('${docThumbs[doc.id]}')` }} />
                            ) : (
                              <div className="absolute inset-0 bg-primary/5 animate-pulse flex items-center justify-center">
                                <span className="material-symbols-outlined text-on-surface-variant opacity-30">pending</span>
                              </div>
                            )}
                          </div>
                          <div>
                            <Link to={`/app/documents/${doc.id}`} className="text-[15px] font-semibold text-primary hover:text-secondary transition-colors">
                              {doc.name}
                            </Link>
                            <div className="text-[12px] text-on-surface-variant">{doc.type} • {doc.size}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-5 px-4">
                        {doc.status === "Processing" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[12px] font-bold italic">
                            Processing...
                          </span>
                        ) : (
                          <StatusBadge status={doc.status as DocumentStatus} />
                        )}
                      </td>
                      <td className="py-5 px-4">
                        {doc.status === "Processing" ? (
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-surface-container rounded-full overflow-hidden">
                              <div className="h-full bg-primary/20 animate-pulse w-[65%]" />
                            </div>
                          </div>
                        ) : (
                          <ConfidenceBadge value={doc.confidence} />
                        )}
                      </td>
                      <td className="py-5 px-4 text-[15px] text-on-surface-variant">{doc.date}</td>
                      <td className="py-5 px-4 text-[15px] text-on-surface-variant">{doc.source}</td>
                      <td className="py-5 pl-4 pr-8 text-right">
                        <button className="text-on-surface-variant hover:text-primary transition-colors">
                          <span className="material-symbols-outlined">more_horiz</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-8 py-6 flex items-center justify-between border-t border-outline-variant/30">
              <div className="text-[13px] text-on-surface-variant">
                Showing <span className="font-bold text-primary">1-5</span> of 4,284 documents
              </div>
              <Pagination current={page} total={857} onPageChange={setPage} />
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
