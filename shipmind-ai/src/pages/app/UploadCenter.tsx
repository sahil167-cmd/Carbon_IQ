import { useState } from "react";
import AppLayout from "../../components/layout/AppLayout";

const steps = ["Upload", "Configure", "Review", "Complete"];

const docTypes = [
  { id: "bol", label: "Bill of Lading", icon: "article", count: 0 },
  { id: "invoice", label: "Commercial Invoice", icon: "receipt_long", count: 0 },
  { id: "manifest", label: "Cargo Manifest", icon: "inventory_2", count: 0 },
  { id: "packing", label: "Packing List", icon: "checklist", count: 0 },
];

export default function UploadCenter() {
  const [step, setStep] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...dropped]);
  };

  return (
    <AppLayout title="Upload Center" subtitle="Document Processing">
      <div className="pt-8 pb-[120px] px-6 max-w-[1280px] mx-auto">
        {/* Stepper */}
        <div className="flex items-center gap-0 mb-12">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-bold cursor-pointer transition-all ${
                  i === step
                    ? "bg-primary text-white"
                    : i < step
                    ? "bg-secondary/10 text-secondary"
                    : "text-on-surface-variant"
                }`}
                onClick={() => setStep(i)}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                  i === step ? "bg-white text-primary" : i < step ? "bg-secondary text-white" : "bg-surface-container-high"
                }`}>
                  {i < step ? "✓" : i + 1}
                </span>
                {s}
              </div>
              {i < steps.length - 1 && <div className="w-8 h-px bg-outline-variant/40 mx-1" />}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Zone */}
          <div className="lg:col-span-2 space-y-6">
            <div
              className={`border-2 border-dashed rounded-[24px] p-16 text-center transition-all cursor-pointer ${
                dragging
                  ? "border-secondary bg-secondary/5"
                  : "border-outline-variant/50 hover:border-secondary/50 hover:bg-secondary/5"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <div className="w-20 h-20 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-secondary text-4xl">cloud_upload</span>
              </div>
              <h3 className="text-2xl font-semibold mb-3">Drop your documents here</h3>
              <p className="text-[15px] text-on-surface-variant mb-6">
                Supports PDF, JPG, PNG, TIFF — up to 50MB per file
              </p>
              <label className="bg-primary text-white px-8 py-3 rounded-xl text-[15px] font-bold hover:opacity-90 transition-all active:scale-95 cursor-pointer">
                Browse Files
                <input type="file" multiple className="hidden" onChange={(e) => {
                  if (e.target.files) setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                }} />
              </label>
            </div>

            {files.length > 0 && (
              <div className="bg-white border border-outline-variant/30 rounded-[20px] overflow-hidden ambient-shadow">
                <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center">
                  <h4 className="font-semibold">{files.length} file(s) selected</h4>
                  <button onClick={() => setFiles([])} className="text-[13px] text-error hover:underline">
                    Clear all
                  </button>
                </div>
                <ul className="divide-y divide-outline-variant/20">
                  {files.map((f, i) => (
                    <li key={i} className="px-6 py-4 flex items-center gap-4">
                      <span className="material-symbols-outlined text-on-surface-variant">description</span>
                      <span className="flex-1 text-[15px] font-medium truncate">{f.name}</span>
                      <span className="text-[13px] text-on-surface-variant">{(f.size / 1024).toFixed(0)} KB</span>
                      <button onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))} className="text-on-surface-variant hover:text-error transition-colors">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="p-6">
                  <button
                    onClick={() => setStep(1)}
                    className="w-full bg-primary text-white py-4 rounded-xl font-bold text-[15px] hover:opacity-90 transition-all active:scale-95"
                  >
                    Process {files.length} Document(s)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            <div className="bg-white border border-outline-variant/30 rounded-[20px] p-6 ambient-shadow">
              <h4 className="font-semibold mb-4 text-[13px] uppercase tracking-wider text-on-surface-variant">Supported Types</h4>
              <div className="space-y-3">
                {docTypes.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer">
                    <span className="material-symbols-outlined text-secondary">{t.icon}</span>
                    <span className="text-[15px] font-medium">{t.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-primary-container rounded-[20px] p-6 border border-outline-variant/10">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
                <span className="text-[13px] font-bold text-on-primary-container uppercase tracking-wider">AI Ready</span>
              </div>
              <h4 className="text-white font-semibold text-[18px] mb-2">OCR + Extraction Active</h4>
              <p className="text-on-primary-container text-[13px]">
                Upload documents and our AI will classify, extract, and validate data automatically in seconds.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
