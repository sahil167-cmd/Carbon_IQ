import AppLayout from "../../components/layout/AppLayout";

const systemModules = [
  { name: "OCR Engine v4.2", status: "Running", version: "4.2.1", cpu: "32%", uptime: "99.99%", icon: "document_scanner" },
  { name: "Route Intelligence", status: "Running", version: "3.8.0", cpu: "18%", uptime: "99.95%", icon: "route" },
  { name: "Compliance Guard", status: "Running", version: "2.1.4", cpu: "8%", uptime: "100%", icon: "security" },
  { name: "ERP Connector", status: "Degraded", version: "5.0.2", cpu: "45%", uptime: "97.2%", icon: "hub" },
  { name: "Carrier Feed Sync", status: "Running", version: "1.9.3", cpu: "12%", uptime: "99.8%", icon: "sync" },
];

const statusColor: Record<string, string> = {
  Running: "text-secondary",
  Degraded: "text-error",
  Stopped: "text-outline",
};

const statusDot: Record<string, string> = {
  Running: "bg-secondary",
  Degraded: "bg-error",
  Stopped: "bg-outline",
};

const auditLog = [
  { user: "Elena Voss", action: "Updated ERP connector credentials", time: "10 min ago" },
  { user: "Marcus Chen", action: "Deployed OCR model v4.2.1", time: "2 hr ago" },
  { user: "System", action: "Auto-scaled route engine to 3 instances", time: "6 hr ago" },
  { user: "Sarah Jenkins", action: "Cleared document cache", time: "1 day ago" },
];

export default function AdminConsole() {
  return (
    <AppLayout title="Admin Console" subtitle="System Management">
      <div className="pt-8 pb-[120px] px-6 max-w-[1280px] mx-auto space-y-8">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { icon: "group", label: "Total Users", value: "27" },
            { icon: "description", label: "Docs Processed", value: "12.4K" },
            { icon: "dataset", label: "API Calls Today", value: "1.2M" },
            { icon: "cloud", label: "Storage Used", value: "2.4 TB" },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-outline-variant/30 rounded-[20px] p-6 ambient-shadow flex items-center gap-4">
              <div className="w-12 h-12 bg-surface-container rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">{s.icon}</span>
              </div>
              <div>
                <p className="text-[13px] text-on-surface-variant">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* System Modules */}
          <div className="lg:col-span-2 bg-white border border-outline-variant/30 rounded-[20px] overflow-hidden ambient-shadow">
            <div className="p-6 border-b border-outline-variant/20">
              <h3 className="font-semibold text-[18px]">AI System Modules</h3>
            </div>
            <div className="divide-y divide-outline-variant/20">
              {systemModules.map((m) => (
                <div key={m.name} className="px-6 py-5 flex items-center gap-4">
                  <div className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-primary">{m.icon}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[15px]">{m.name}</span>
                      <span className="text-[11px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">v{m.version}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className={`w-2 h-2 rounded-full ${statusDot[m.status]}`} />
                      <span className={`text-[13px] font-medium ${statusColor[m.status]}`}>{m.status}</span>
                    </div>
                  </div>
                  <div className="text-right text-[13px] text-on-surface-variant">
                    <p>CPU: <span className="font-bold text-primary">{m.cpu}</span></p>
                    <p>Uptime: <span className="font-bold">{m.uptime}</span></p>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant">
                      <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                    </button>
                    <button className="p-2 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant">
                      <span className="material-symbols-outlined text-[18px]">settings</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Log */}
          <div className="bg-white border border-outline-variant/30 rounded-[20px] overflow-hidden ambient-shadow">
            <div className="p-6 border-b border-outline-variant/20">
              <h3 className="font-semibold text-[18px]">Audit Log</h3>
            </div>
            <div className="p-4 space-y-4">
              {auditLog.map((entry, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-[11px] flex-shrink-0">
                    {entry.user === "System" ? (
                      <span className="material-symbols-outlined text-[14px]">smart_toy</span>
                    ) : entry.user.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium">{entry.user}</p>
                    <p className="text-[13px] text-on-surface-variant">{entry.action}</p>
                    <p className="text-[11px] text-outline mt-1">{entry.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-outline-variant/20">
              <button className="w-full text-[13px] text-on-surface-variant hover:text-primary transition-colors font-medium">
                View Full Audit Trail →
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
