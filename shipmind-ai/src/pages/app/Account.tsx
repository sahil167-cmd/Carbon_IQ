import AppLayout from "../../components/layout/AppLayout";
import { useState } from "react";

export default function Account() {
  const [copied, setCopied] = useState(false);
  const apiKey = "sk_live_51Ox8a2h9K2v8N1m4p7q";

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AppLayout title="Account Settings" subtitle="User Settings &amp; API Keys">
      <div className="pt-8 pb-[120px] px-6 max-w-[1280px] mx-auto space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-outline-variant/30 rounded-[20px] p-8 ambient-shadow">
              <h3 className="text-[18px] font-bold mb-6">User Profile</h3>
              <div className="flex gap-6 items-center mb-8 pb-8 border-b border-outline-variant/10">
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white text-3xl font-bold font-sans">
                  JS
                </div>
                <div>
                  <h4 className="text-xl font-semibold">James Sterling</h4>
                  <p className="text-[13px] text-on-surface-variant">james@globalfreight.com</p>
                  <span className="inline-block mt-2 bg-primary text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                    Admin
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[13px] text-on-surface-variant font-medium">First Name</label>
                  <input defaultValue="James" className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-xl text-[14px]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] text-on-surface-variant font-medium">Last Name</label>
                  <input defaultValue="Sterling" className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-xl text-[14px]" />
                </div>
              </div>
            </div>

            {/* API Access Key */}
            <div className="bg-white border border-outline-variant/30 rounded-[20px] p-8 ambient-shadow">
              <h3 className="text-[18px] font-bold mb-4">API Access Keys</h3>
              <p className="text-[13px] text-on-surface-variant mb-6">Use this key to authorize your custom scripts or ERP connectors.</p>
              <div className="flex gap-3">
                <input readOnly value={apiKey} type="text" className="flex-1 px-4 py-3 bg-surface-container font-mono text-[13px] rounded-xl outline-none border border-outline-variant/55" />
                <button onClick={handleCopy} className="bg-primary text-white px-6 py-3 rounded-xl text-[13px] font-bold hover:opacity-90 active:scale-95 transition-all">
                  {copied ? "Copied!" : "Copy Key"}
                </button>
              </div>
            </div>
          </div>

          {/* Right sidebar session / system health */}
          <div className="space-y-6">
            <div className="bg-white border border-outline-variant/30 rounded-[20px] p-6 ambient-shadow">
              <h4 className="font-semibold mb-4">Active Sessions</h4>
              <div className="space-y-4">
                <div className="flex gap-3 items-center">
                  <span className="material-symbols-outlined text-secondary">devices</span>
                  <div>
                    <p className="text-[13px] font-bold">San Francisco, USA</p>
                    <p className="text-[11px] text-on-surface-variant">MacBook Pro • Chrome • Active now</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
