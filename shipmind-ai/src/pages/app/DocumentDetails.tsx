import { Link, useParams } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import StatusBadge from "../../components/shared/StatusBadge";
import ConfidenceBadge from "../../components/shared/ConfidenceBadge";

const extractedFields = [
  { group: "Carrier Information", fields: [
    { label: "Carrier", value: "Maersk Line" },
    { label: "Vessel Name", value: "Edith Maersk" },
    { label: "Voyage Number", value: "VOY-2024-887" },
    { label: "Bill of Lading #", value: "MAEU 238891021" },
  ]},
  { group: "Port Details", fields: [
    { label: "Port of Loading", value: "Shanghai (CNSHA)" },
    { label: "Port of Discharge", value: "Rotterdam (NLRTM)" },
    { label: "ETD", value: "Oct 18, 2024" },
    { label: "ETA", value: "Nov 14, 2024" },
  ]},
  { group: "Cargo Details", fields: [
    { label: "Description", value: "Electronic Components" },
    { label: "HS Code", value: "8542.31" },
    { label: "Weight", value: "12,400 kg" },
    { label: "Volume", value: "48 CBM" },
    { label: "Containers", value: "2x 40HC" },
  ]},
];

export default function DocumentDetails() {
  const { id } = useParams();

  return (
    <AppLayout title="Document Details" subtitle="BOL_CH-29381.pdf">
      <div className="pt-8 pb-[120px] px-6 max-w-[1280px] mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-8 text-[13px] text-on-surface-variant">
          <Link to="/app/documents" className="hover:text-primary transition-colors">Documents</Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-primary font-medium">BOL_CH-29381.pdf</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Document Preview */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-outline-variant/30 rounded-[20px] overflow-hidden ambient-shadow">
              <div className="p-6 border-b border-outline-variant/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant">article</span>
                  <div>
                    <h3 className="font-semibold">BOL_CH-29381.pdf</h3>
                    <p className="text-[13px] text-on-surface-variant">Bill of Lading • 1.2 MB • Uploaded Oct 14, 2024</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status="Processed" />
                  <ConfidenceBadge value={99.4} />
                </div>
              </div>
              <div className="p-6 bg-surface-container-low min-h-[400px] flex items-center justify-center relative">
                <div className="w-full max-w-md bg-white rounded-xl border border-outline-variant p-8 shadow-sm">
                  <div className="border-b pb-4 mb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">BILL OF LADING</p>
                        <p className="text-[18px] font-bold mt-1">MAEU 238891021</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-on-surface-variant">Maersk Line</p>
                        <p className="text-[11px] text-on-surface-variant">Original</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-[12px]">
                    <div><p className="text-on-surface-variant mb-1">Port of Loading</p><p className="font-semibold">Shanghai</p></div>
                    <div><p className="text-on-surface-variant mb-1">Port of Discharge</p><p className="font-semibold">Rotterdam</p></div>
                    <div><p className="text-on-surface-variant mb-1">Vessel</p><p className="font-semibold">Edith Maersk</p></div>
                    <div><p className="text-on-surface-variant mb-1">Voyage</p><p className="font-semibold">VOY-2024-887</p></div>
                  </div>
                  <div className="mt-4 pt-4 border-t text-[12px]">
                    <p className="text-on-surface-variant mb-1">Description of Goods</p>
                    <p className="font-semibold">Electronic Components (HS: 8542.31)</p>
                    <p>12,400 kg • 48 CBM • 2x 40HC</p>
                  </div>
                </div>
                <div className="absolute top-3 right-3 px-2 py-0.5 bg-secondary/10 rounded text-[11px] text-secondary font-bold">
                  AI Extracted
                </div>
              </div>
              <div className="p-6 border-t border-outline-variant/20 flex gap-3">
                <button className="flex-1 border border-outline-variant py-3 rounded-xl text-[15px] font-medium hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  Download Original
                </button>
                <Link
                  to={`/app/documents/${id}/review`}
                  className="flex-1 bg-primary text-white py-3 rounded-xl text-[15px] font-bold hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">rate_review</span>
                  Open in Review Workspace
                </Link>
              </div>
            </div>
          </div>

          {/* Extracted Data Panel */}
          <div className="space-y-4">
            {extractedFields.map((group) => (
              <div key={group.group} className="bg-white border border-outline-variant/30 rounded-[20px] overflow-hidden ambient-shadow">
                <div className="p-4 border-b border-outline-variant/20 bg-surface-container-low/50">
                  <h4 className="text-[13px] font-bold uppercase tracking-wider text-on-surface-variant">{group.group}</h4>
                </div>
                <div className="p-4 space-y-3">
                  {group.fields.map((f) => (
                    <div key={f.label} className="flex justify-between gap-4">
                      <span className="text-[13px] text-on-surface-variant">{f.label}</span>
                      <span className="text-[13px] font-semibold text-right">{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="bg-secondary/5 border border-secondary/20 rounded-[20px] p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                <span className="text-[13px] font-bold text-secondary">AI Verification Passed</span>
              </div>
              <p className="text-[13px] text-on-surface-variant">
                All extracted data cross-referenced with carrier records. Confidence: 99.4%
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
