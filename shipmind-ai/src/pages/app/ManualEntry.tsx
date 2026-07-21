import { useState } from "react";
import AppLayout from "../../components/layout/AppLayout";

const sections = [
  {
    title: "Carrier Information",
    fields: [
      { id: "carrier", label: "Carrier Name", type: "text", placeholder: "e.g. Maersk Line" },
      { id: "vessel", label: "Vessel Name", type: "text", placeholder: "e.g. Edith Maersk" },
      { id: "voyage", label: "Voyage Number", type: "text", placeholder: "e.g. VOY-2024-887" },
      { id: "bol", label: "Bill of Lading #", type: "text", placeholder: "e.g. MAEU 238891021" },
    ],
  },
  {
    title: "Port Details",
    fields: [
      { id: "pol", label: "Port of Loading", type: "text", placeholder: "e.g. Shanghai (CNSHA)" },
      { id: "pod", label: "Port of Discharge", type: "text", placeholder: "e.g. Rotterdam (NLRTM)" },
      { id: "etd", label: "ETD", type: "date", placeholder: "" },
      { id: "eta", label: "ETA", type: "date", placeholder: "" },
    ],
  },
  {
    title: "Cargo Details",
    fields: [
      { id: "desc", label: "Description of Goods", type: "text", placeholder: "e.g. Electronic Components" },
      { id: "hs", label: "HS Code", type: "text", placeholder: "e.g. 8542.31" },
      { id: "weight", label: "Gross Weight (kg)", type: "number", placeholder: "e.g. 12400" },
      { id: "volume", label: "Volume (CBM)", type: "number", placeholder: "e.g. 48" },
    ],
  },
];

export default function ManualEntry() {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AppLayout title="Manual Entry" subtitle="Create Document Record">
      <div className="pt-8 pb-[120px] px-6 max-w-[1280px] mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-[40px] font-semibold leading-none tracking-[-0.03em]">Manual Entry</h2>
            <p className="text-[15px] text-on-surface-variant mt-2">Create a document record manually when auto-extraction isn't available.</p>
          </div>
          <div className="flex gap-3">
            <button className="border border-outline-variant px-6 py-3 rounded-xl text-[15px] font-medium hover:bg-surface-container transition-colors">
              Save Draft
            </button>
            <button
              onClick={handleSave}
              className="bg-primary text-white px-6 py-3 rounded-xl text-[15px] font-bold hover:opacity-90 transition-all active:scale-95 flex items-center gap-2"
            >
              {saved ? (
                <><span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span> Saved!</>
              ) : (
                <><span className="material-symbols-outlined">save</span> Save Record</>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {sections.map((s) => (
              <div key={s.title} className="bg-white border border-outline-variant/30 rounded-[20px] overflow-hidden ambient-shadow">
                <div className="p-6 border-b border-outline-variant/20 bg-surface-container-low/50">
                  <h3 className="font-semibold text-[18px]">{s.title}</h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {s.fields.map((f) => (
                    <div key={f.id} className="space-y-2">
                      <label className="text-[13px] font-medium text-on-surface-variant" htmlFor={f.id}>
                        {f.label}
                      </label>
                      <input
                        id={f.id}
                        type={f.type}
                        placeholder={f.placeholder}
                        value={formData[f.id] ?? ""}
                        onChange={(e) => setFormData({ ...formData, [f.id]: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all outline-none text-[15px]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white border border-outline-variant/30 rounded-[20px] p-6 ambient-shadow">
              <h4 className="font-semibold mb-4">Document Type</h4>
              {["Bill of Lading", "Commercial Invoice", "Cargo Manifest", "Packing List", "Certificate of Origin"].map((t) => (
                <label key={t} className="flex items-center gap-3 py-2.5 cursor-pointer group">
                  <input type="radio" name="doctype" className="w-4 h-4 text-primary" />
                  <span className="text-[15px] group-hover:text-primary transition-colors">{t}</span>
                </label>
              ))}
            </div>
            <div className="bg-secondary/5 border border-secondary/20 rounded-[20px] p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-secondary">auto_fix_high</span>
                <h4 className="font-semibold text-secondary">AI Suggestion</h4>
              </div>
              <p className="text-[13px] text-on-surface-variant">
                Fill in what you know and let AI autofill remaining fields from your historical data patterns.
              </p>
              <button className="mt-4 w-full border border-secondary text-secondary py-2.5 rounded-xl text-[13px] font-bold hover:bg-secondary/5 transition-colors">
                Enable AI Autofill
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
