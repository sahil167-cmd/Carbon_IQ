import { useState } from "react";
import AppLayout from "../../components/layout/AppLayout";
import StatusBadge from "../../components/shared/StatusBadge";
import ConfidenceBadge from "../../components/shared/ConfidenceBadge";

const queueItems = [
  { id: "q1", name: "INV_MAERSK_001.pdf", type: "Invoice", confidence: 76.2, reason: "Shipper address mismatch", priority: "High" },
  { id: "q2", name: "BOL_FEDEX_Z88.pdf", type: "Bill of Lading", confidence: 88.9, reason: "Low OCR quality on seal", priority: "Medium" },
  { id: "q3", name: "MANIFEST_LAX_12.jpg", type: "Cargo Manifest", confidence: 42.1, reason: "Unreadable section detected", priority: "Critical" },
  { id: "q4", name: "INV_CHINA_2024.pdf", type: "Invoice", confidence: 81.0, reason: "Currency conversion ambiguity", priority: "Medium" },
  { id: "q5", name: "BOL_HAPAG_99.pdf", type: "Bill of Lading", confidence: 67.3, reason: "Consignee details unclear", priority: "High" },
];

const priorityColors: Record<string, string> = {
  Critical: "bg-error-container text-error",
  High: "bg-amber-100 text-amber-700",
  Medium: "bg-surface-container-high text-on-surface-variant",
};

export default function AIReviewQueue() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <AppLayout title="AI Review Queue" subtitle="Flagged for Human Review">
      <div className="pt-8 pb-[120px] px-6 max-w-[1280px] mx-auto">
        {/* Header row */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 bg-error rounded-full animate-pulse" />
            <span className="text-[18px] font-bold text-error">5 Documents Require Review</span>
          </div>
          <div className="flex gap-3">
            <button className="border border-outline-variant px-4 py-2 rounded-xl text-[13px] font-medium hover:bg-surface-container transition-colors">
              Sort by Priority
            </button>
            <button className="bg-secondary text-white px-4 py-2 rounded-xl text-[13px] font-bold hover:opacity-90 transition-all">
              Batch Approve
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Queue List */}
          <div className="lg:col-span-2 space-y-3">
            {queueItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelected(item.id)}
                className={`w-full text-left p-5 rounded-[16px] border transition-all ${
                  selected === item.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-outline-variant/30 bg-white hover:border-primary/30 hover:shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="font-semibold text-[15px] truncate">{item.name}</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${priorityColors[item.priority]}`}>
                    {item.priority}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[13px] text-on-surface-variant">{item.type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-on-surface-variant italic">{item.reason}</span>
                  <ConfidenceBadge value={item.confidence} />
                </div>
              </button>
            ))}
          </div>

          {/* Review Panel */}
          <div className="lg:col-span-3">
            {selected ? (
              (() => {
                const item = queueItems.find((q) => q.id === selected)!;
                return (
                  <div className="bg-white border border-outline-variant/30 rounded-[20px] overflow-hidden ambient-shadow">
                    <div className="p-6 border-b border-outline-variant/20 flex items-center justify-between">
                      <h3 className="font-semibold">{item.name}</h3>
                      <div className="flex gap-2">
                        <StatusBadge status="Flagged" />
                        <ConfidenceBadge value={item.confidence} />
                      </div>
                    </div>
                    <div className="p-6 bg-surface-container-low min-h-64 flex items-center justify-center">
                      <div className="text-center space-y-3">
                        <span className="material-symbols-outlined text-6xl text-outline">description</span>
                        <p className="text-[15px] text-on-surface-variant">Document preview</p>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                          <span className="material-symbols-outlined text-amber-500 text-[18px]">warning</span>
                          <span className="text-[13px] text-amber-700 font-medium">{item.reason}</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="space-y-2">
                        <label className="text-[13px] font-bold text-on-surface-variant">Review Notes</label>
                        <textarea
                          rows={3}
                          placeholder="Add your review notes here..."
                          className="w-full px-4 py-3 rounded-xl border border-outline-variant resize-none text-[15px] focus:outline-none focus:border-primary transition-all"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <button className="bg-secondary text-white py-3 rounded-xl font-bold text-[13px] hover:opacity-90 transition-all">
                          Approve
                        </button>
                        <button className="border border-error text-error py-3 rounded-xl font-bold text-[13px] hover:bg-error-container transition-all">
                          Reject
                        </button>
                        <button className="border border-outline-variant text-on-surface-variant py-3 rounded-xl font-bold text-[13px] hover:bg-surface-container transition-all">
                          Escalate
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="bg-white border border-outline-variant/30 rounded-[20px] h-full min-h-[400px] flex flex-col items-center justify-center text-center p-12">
                <span className="material-symbols-outlined text-6xl text-outline mb-4">rate_review</span>
                <h4 className="text-2xl font-semibold mb-2">Select a document to review</h4>
                <p className="text-[15px] text-on-surface-variant max-w-xs">
                  Click any item in the queue to open it in the review panel.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
