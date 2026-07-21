import AppLayout from "../../components/layout/AppLayout";
import DocumentRow from "../../components/shared/DocumentRow";
import Pagination from "../../components/shared/Pagination";
import { useState } from "react";
import type { Document } from "../../types";

const docs: Document[] = [
  { id: "1", name: "BOL_PREMIUM_001.pdf", type: "Bill of Lading", confidence: 99.9, status: "Processed", date: "Oct 14, 2024", source: "SAP ERP", size: "1.2 MB" },
  { id: "2", name: "INV_PRIORITY_X.pdf", type: "Commercial Invoice", confidence: 99.4, status: "Processed", date: "Oct 14, 2024", source: "API Upload", size: "840 KB" },
  { id: "3", name: "MANIFEST_PRO_88.pdf", type: "Cargo Manifest", confidence: 98.1, status: "Processed", date: "Oct 13, 2024", source: "SAP ERP", size: "2.4 MB" },
  { id: "4", name: "PL_ENTERPRISE_5.pdf", type: "Packing List", confidence: 97.2, status: "Manual Review", date: "Oct 12, 2024", source: "Mail Drop", size: "512 KB" },
];

export default function DocumentLibraryPro() {
  const [page, setPage] = useState(1);

  return (
    <AppLayout title="Pro Document Library" subtitle="Priority Processing Queue">
      <div className="pt-8 pb-[120px] px-6 max-w-[1280px] mx-auto space-y-6">
        {/* Pro Banner */}
        <div className="bg-primary text-on-primary rounded-[20px] p-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary-fixed">workspace_premium</span>
            </div>
            <div>
              <h3 className="font-bold text-[18px]">Pro Processing Active</h3>
              <p className="text-on-primary/70 text-[13px]">Priority queue with dedicated AI inference infrastructure.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-secondary-fixed rounded-full animate-pulse" />
            <span className="text-[13px] text-secondary-fixed font-bold uppercase tracking-wider">Live</span>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input type="text" placeholder="Search Pro documents..." className="w-full bg-white border border-outline-variant rounded-xl py-3 pl-10 pr-4 text-[15px] focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all" />
          </div>
          <button className="bg-white border border-outline-variant px-5 py-3 rounded-xl text-[15px] font-medium hover:bg-surface-container transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">filter_list</span>Filter
          </button>
        </div>

        {/* Table */}
        <div className="bg-white border border-outline-variant/30 rounded-[20px] overflow-hidden ambient-shadow">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low/50">
              <tr>
                {["Document Name", "Type", "AI Confidence", "Status"].map((h) => (
                  <th key={h} className="px-8 py-4 text-[13px] text-on-surface-variant uppercase tracking-widest font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {docs.map((doc) => <DocumentRow key={doc.id} doc={doc} />)}
            </tbody>
          </table>
          <div className="px-8 py-6 flex items-center justify-between border-t border-outline-variant/30">
            <div className="text-[13px] text-on-surface-variant">Showing <span className="font-bold">1-4</span> of 1,248 pro documents</div>
            <Pagination current={page} total={312} onPageChange={setPage} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
