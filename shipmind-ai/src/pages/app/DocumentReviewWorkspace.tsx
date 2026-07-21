import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";

const fields = [
  { label: "Bill of Lading #", extracted: "MAEU 238891021", confidence: 99 },
  { label: "Carrier", extracted: "Maersk Line", confidence: 99 },
  { label: "Vessel", extracted: "Edith Maersk", confidence: 98 },
  { label: "Port of Loading", extracted: "Shanghai (CNSHA)", confidence: 97 },
  { label: "Port of Discharge", extracted: "Rotterdam (NLRTM)", confidence: 99 },
  { label: "ETD", extracted: "Oct 18, 2024", confidence: 95 },
  { label: "ETA", extracted: "Nov 14, 2024", confidence: 94 },
  { label: "HS Code", extracted: "8542.31", confidence: 88 },
  { label: "Weight", extracted: "12,400 kg", confidence: 96 },
];

export default function DocumentReviewWorkspace() {
  const { id } = useParams();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.label, f.extracted]))
  );
  const [approved, setApproved] = useState<string[]>([]);

  return (
    <AppLayout title="Review Workspace" subtitle="BOL_CH-29381.pdf">
      <div className="h-[calc(100vh-4rem)] flex overflow-hidden">
        {/* Left: Document Viewer */}
        <div className="flex-1 bg-surface-container-low overflow-auto p-6 flex items-center justify-center">
          <div className="bg-white rounded-[20px] shadow-xl p-8 max-w-md w-full border border-outline-variant/30">
            <div className="flex justify-between items-start mb-6 border-b pb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">BILL OF LADING</p>
                <p className="text-[18px] font-bold mt-1">MAEU 238891021</p>
              </div>
              <div className="text-right text-[12px] text-on-surface-variant">
                <p>Maersk Line</p>
                <p>Original</p>
              </div>
            </div>
            <div className="space-y-3 text-[12px]">
              {fields.map((f) => (
                <div key={f.label} className="flex justify-between gap-4 py-1 border-b border-outline-variant/10 last:border-0">
                  <span className="text-on-surface-variant">{f.label}</span>
                  <span className={`font-semibold text-right ${f.confidence < 90 ? "bg-amber-50 px-1 rounded" : ""}`}>
                    {f.extracted}
                    {f.confidence < 90 && <span className="material-symbols-outlined text-amber-500 text-[14px] ml-1">warning</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Edit Panel */}
        <div className="w-96 bg-surface-container-lowest border-l border-outline-variant/20 overflow-auto flex flex-col">
          <div className="p-6 border-b border-outline-variant/20 flex items-center justify-between">
            <h3 className="font-semibold">Extracted Fields</h3>
            <span className="text-[13px] text-secondary font-bold">
              {approved.length}/{fields.length} Approved
            </span>
          </div>
          <div className="flex-1 overflow-auto divide-y divide-outline-variant/10">
            {fields.map((f) => {
              const isApproved = approved.includes(f.label);
              return (
                <div key={f.label} className={`p-4 transition-colors ${isApproved ? "bg-secondary/5" : ""}`}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[13px] font-bold text-on-surface-variant">{f.label}</label>
                    <div className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${f.confidence >= 95 ? "bg-secondary" : f.confidence >= 85 ? "bg-amber-400" : "bg-error"}`} />
                      <span className="text-[11px] text-on-surface-variant">{f.confidence}%</span>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={values[f.label]}
                    onChange={(e) => setValues({ ...values, [f.label]: e.target.value })}
                    disabled={isApproved}
                    className={`w-full px-3 py-2 rounded-lg border text-[14px] transition-all outline-none ${
                      isApproved
                        ? "bg-secondary/10 border-secondary/30 text-secondary font-medium"
                        : "border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary bg-white"
                    }`}
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => setApproved((p) => isApproved ? p.filter((x) => x !== f.label) : [...p, f.label])}
                      className={`flex-1 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                        isApproved
                          ? "bg-secondary text-white hover:bg-secondary/90"
                          : "border border-secondary text-secondary hover:bg-secondary/5"
                      }`}
                    >
                      {isApproved ? "✓ Approved" : "Approve"}
                    </button>
                    <button className="px-3 py-1.5 rounded-lg border border-outline-variant text-[12px] text-on-surface-variant hover:bg-surface-container transition-colors">
                      Flag
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-6 border-t border-outline-variant/20 space-y-3">
            <button
              onClick={() => setApproved(fields.map((f) => f.label))}
              className="w-full bg-secondary text-white py-3 rounded-xl font-bold text-[15px] hover:opacity-90 transition-all active:scale-95"
            >
              Approve All & Submit
            </button>
            <button className="w-full border border-error text-error py-3 rounded-xl font-bold text-[15px] hover:bg-error-container transition-all">
              Reject Document
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
