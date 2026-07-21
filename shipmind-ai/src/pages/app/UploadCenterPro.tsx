import AppLayout from "../../components/layout/AppLayout";

export default function UploadCenterPro() {
  return (
    <AppLayout title="Upload Center Pro" subtitle="Priority Document Processing">
      <div className="pt-8 pb-[120px] px-6 max-w-[1280px] mx-auto space-y-6">
        {/* Pro Banner */}
        <div className="bg-primary rounded-[24px] p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/20 blur-[80px] rounded-full" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="material-symbols-outlined text-secondary-fixed text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                <h2 className="text-[40px] font-bold text-on-primary leading-none">Pro Processing</h2>
              </div>
              <p className="text-on-primary/70 text-[18px]">Priority queue • Dedicated AI infrastructure • 1.2s average processing</p>
            </div>
            <div className="text-right">
              <p className="text-[13px] text-on-primary/70 mb-2">Queue Status</p>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                <div className="w-2 h-2 bg-secondary-fixed rounded-full animate-pulse" />
                <span className="text-secondary-fixed font-bold text-[13px]">0 documents waiting</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Drop Zone */}
          <div className="bg-white border border-outline-variant/30 rounded-[20px] p-8 ambient-shadow">
            <h3 className="font-semibold text-[18px] mb-6">Priority Upload</h3>
            <div className="border-2 border-dashed border-secondary/30 rounded-[20px] p-12 text-center hover:border-secondary hover:bg-secondary/5 transition-all cursor-pointer group">
              <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-secondary text-3xl">cloud_upload</span>
              </div>
              <p className="font-semibold text-[18px] mb-2">Drop files for priority processing</p>
              <p className="text-[13px] text-on-surface-variant">Processing begins immediately • Results in &lt;2 seconds</p>
            </div>
          </div>

          {/* Processing Stats */}
          <div className="space-y-4">
            <div className="bg-white border border-outline-variant/30 rounded-[20px] p-6 ambient-shadow">
              <h4 className="font-semibold mb-4">Today's Stats</h4>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Processed", value: "1,248" },
                  { label: "Avg. Time", value: "1.2s" },
                  { label: "Accuracy", value: "99.9%" },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-[12px] text-on-surface-variant">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-secondary/5 border border-secondary/20 rounded-[20px] p-6">
              <h4 className="font-semibold text-secondary mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">auto_mode</span>
                Auto-Classification Active
              </h4>
              <p className="text-[13px] text-on-surface-variant">
                AI will automatically detect document types, extract all fields, and route to appropriate workflows.
              </p>
            </div>

            <div className="bg-white border border-outline-variant/30 rounded-[20px] p-6 ambient-shadow">
              <h4 className="font-semibold mb-4">Recent Processing</h4>
              <div className="space-y-3">
                {["INV_2024_001.pdf", "BOL_HK_4410.pdf", "PL_MANIFEST.pdf"].map((f, i) => (
                  <div key={f} className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span className="text-[13px] text-on-surface-variant flex-1">{f}</span>
                    <span className="text-[11px] text-secondary font-bold">{["1.1s", "0.9s", "1.4s"][i]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
