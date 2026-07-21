import { useState } from "react";
import AppLayout from "../../components/layout/AppLayout";

const steps = ["Upload Files", "Configure Extraction", "Review & Validate", "Complete"];

const docTypes = [
  { id: "bol", label: "Bill of Lading", icon: "article" },
  { id: "invoice", label: "Commercial Invoice", icon: "receipt_long" },
  { id: "manifest", label: "Cargo Manifest", icon: "inventory_2" },
  { id: "packing", label: "Packing List", icon: "checklist" },
  { id: "cert", label: "Certificate of Origin", icon: "verified" },
];

export default function UploadWizard() {
  const [step, setStep] = useState(0);
  const [selectedType, setSelectedType] = useState("bol");
  const [processing, setProcessing] = useState(false);

  const next = () => {
    if (step === 2) {
      setProcessing(true);
      setTimeout(() => { setProcessing(false); setStep(3); }, 2000);
    } else {
      setStep((p) => Math.min(p + 1, 3));
    }
  };

  return (
    <AppLayout title="Upload Wizard" subtitle="Guided Document Processing">
      <div className="pt-8 pb-[120px] px-6 max-w-3xl mx-auto">
        {/* Stepper */}
        <div className="mb-12">
          <div className="flex items-center gap-0 mb-4">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-[13px] font-black border-2 transition-all ${
                  i < step ? "bg-secondary border-secondary text-white" : i === step ? "border-primary bg-white text-primary" : "border-outline-variant bg-white text-on-surface-variant"
                }`}>
                  {i < step ? "✓" : i + 1}
                </div>
                {i < steps.length - 1 && <div className={`flex-1 h-0.5 transition-all ${i < step ? "bg-secondary" : "bg-outline-variant/30"}`} />}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[11px] font-medium text-on-surface-variant">
            {steps.map((s) => <span key={s} className="text-center">{s}</span>)}
          </div>
        </div>

        {/* Steps */}
        <div className="bg-white border border-outline-variant/30 rounded-[24px] p-10 ambient-shadow">
          {step === 0 && (
            <div>
              <h3 className="text-2xl font-semibold mb-2">Upload your documents</h3>
              <p className="text-[15px] text-on-surface-variant mb-8">Drop files to begin AI-powered extraction.</p>
              <div className="border-2 border-dashed border-outline-variant rounded-[20px] p-16 text-center hover:border-secondary/50 transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-5xl text-outline mb-4 block">cloud_upload</span>
                <p className="font-semibold mb-2">Drag & drop files here</p>
                <p className="text-[13px] text-on-surface-variant">or click to browse • PDF, JPG, PNG, TIFF</p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h3 className="text-2xl font-semibold mb-2">Configure extraction settings</h3>
              <p className="text-[15px] text-on-surface-variant mb-8">Select document type and extraction preferences.</p>
              <div className="space-y-3 mb-8">
                {docTypes.map((t) => (
                  <label key={t.id} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedType === t.id ? "border-primary bg-primary/5" : "border-outline-variant hover:border-primary/30"
                  }`}>
                    <input type="radio" name="doctype" value={t.id} checked={selectedType === t.id} onChange={() => setSelectedType(t.id)} className="text-primary" />
                    <span className="material-symbols-outlined text-primary">{t.icon}</span>
                    <span className="font-medium">{t.label}</span>
                  </label>
                ))}
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/5 border border-secondary/20">
                <span className="text-[15px] font-medium text-secondary">Enable AI Auto-Classification</span>
                <div className="w-12 h-6 bg-secondary rounded-full relative cursor-pointer">
                  <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1" />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 className="text-2xl font-semibold mb-2">Review extracted data</h3>
              <p className="text-[15px] text-on-surface-variant mb-8">Verify before committing to the system.</p>
              <div className="space-y-4">
                {[
                  { label: "Carrier", value: "Maersk Line", conf: 99 },
                  { label: "Vessel", value: "Edith Maersk", conf: 98 },
                  { label: "B/L Number", value: "MAEU 238891021", conf: 99 },
                  { label: "Port of Loading", value: "Shanghai", conf: 97 },
                  { label: "Port of Discharge", value: "Rotterdam", conf: 99 },
                ].map((f) => (
                  <div key={f.label} className="flex items-center gap-4 p-3 rounded-xl bg-surface-container-low">
                    <span className="text-[13px] text-on-surface-variant w-32">{f.label}</span>
                    <input defaultValue={f.value} className="flex-1 bg-white border border-outline-variant rounded-lg px-3 py-2 text-[14px] outline-none focus:border-primary transition-all" />
                    <div className={`w-2 h-2 rounded-full ${f.conf >= 98 ? "bg-secondary" : "bg-amber-400"}`} />
                    <span className="text-[12px] text-on-surface-variant w-10">{f.conf}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-5xl text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              </div>
              <h3 className="text-2xl font-semibold mb-2">Processing Complete!</h3>
              <p className="text-[15px] text-on-surface-variant mb-8">
                3 documents processed with 99.4% average confidence.
              </p>
              <button onClick={() => setStep(0)} className="bg-primary text-white px-8 py-4 rounded-xl font-bold text-[15px] hover:opacity-90 transition-all">
                Upload More Documents
              </button>
            </div>
          )}

          {step < 3 && (
            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep((p) => Math.max(p - 1, 0))}
                disabled={step === 0}
                className="px-6 py-3 border border-outline-variant rounded-xl text-[15px] font-medium hover:bg-surface-container transition-colors disabled:opacity-30"
              >
                Back
              </button>
              <button
                onClick={next}
                disabled={processing}
                className="bg-primary text-white px-8 py-3 rounded-xl text-[15px] font-bold hover:opacity-90 transition-all active:scale-95 flex items-center gap-2"
              >
                {processing ? (
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                ) : step === 2 ? "Submit" : "Continue"}
                {!processing && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
              </button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
