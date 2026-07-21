import { useState } from "react";
import AppLayout from "../../components/layout/AppLayout";

const orgTabs = ["General", "Branding", "Security", "Billing", "Integrations"];

export default function OrganizationSettings() {
  const [activeTab, setActiveTab] = useState("General");
  const [orgName, setOrgName] = useState("Global Freight Co.");
  const [domain, setDomain] = useState("globalfreight.com");
  const [saved, setSaved] = useState(false);

  return (
    <AppLayout title="Organization Settings" subtitle="Account Configuration">
      <div className="pt-8 pb-[120px] px-6 max-w-[1280px] mx-auto">
        <div className="flex gap-1 mb-8 bg-surface-container rounded-2xl p-1 w-fit">
          {orgTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                activeTab === tab ? "bg-white text-primary shadow-sm font-bold" : "text-on-surface-variant hover:text-primary"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "General" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-outline-variant/30 rounded-[20px] p-8 ambient-shadow">
                <h3 className="font-semibold text-[18px] mb-6">Organization Details</h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[13px] font-medium text-on-surface-variant">Organization Name</label>
                    <input
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none text-[15px] transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] font-medium text-on-surface-variant">Primary Domain</label>
                    <input
                      type="text"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none text-[15px] transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] font-medium text-on-surface-variant">Industry</label>
                    <select className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none text-[15px] transition-all appearance-none">
                      <option>Freight Forwarding</option>
                      <option>Ocean Carrier</option>
                      <option>3PL Provider</option>
                      <option>Customs Broker</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] font-medium text-on-surface-variant">Organization Size</label>
                    <select className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest outline-none text-[15px] appearance-none">
                      <option>201 - 1,000 employees</option>
                      <option>1,000+ employees</option>
                    </select>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}
                      className="bg-primary text-white px-8 py-3 rounded-xl font-bold text-[15px] hover:opacity-90 transition-all active:scale-95 flex items-center gap-2"
                    >
                      {saved ? (
                        <><span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span> Saved</>
                      ) : "Save Changes"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-error-container/30 border border-error/20 rounded-[20px] p-8">
                <h3 className="font-semibold text-[18px] text-error mb-2">Danger Zone</h3>
                <p className="text-[15px] text-on-surface-variant mb-6">
                  Permanently delete this organization and all its data. This action cannot be undone.
                </p>
                <button className="border border-error text-error px-6 py-3 rounded-xl font-bold text-[15px] hover:bg-error-container transition-all">
                  Delete Organization
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white border border-outline-variant/30 rounded-[20px] p-6 ambient-shadow">
                <h4 className="font-semibold mb-4">Organization ID</h4>
                <code className="text-[13px] bg-surface-container px-3 py-2 rounded-lg block break-all">
                  org_gf_0x8a92b4c1
                </code>
                <p className="text-[13px] text-on-surface-variant mt-2">Use this for API integrations.</p>
              </div>
              <div className="bg-white border border-outline-variant/30 rounded-[20px] p-6 ambient-shadow">
                <h4 className="font-semibold mb-4">Current Plan</h4>
                <span className="bg-primary text-white text-[13px] font-bold px-3 py-1 rounded-full">Professional</span>
                <p className="text-[13px] text-on-surface-variant mt-3">Renews Jan 1, 2025</p>
                <button className="mt-4 w-full border border-outline-variant py-2.5 rounded-xl text-[13px] font-medium hover:bg-surface-container transition-colors">
                  Manage Billing
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab !== "General" && (
          <div className="bg-white border border-outline-variant/30 rounded-[20px] p-12 ambient-shadow text-center">
            <span className="material-symbols-outlined text-6xl text-outline mb-4 block">construction</span>
            <h3 className="text-2xl font-semibold mb-2">{activeTab} Settings</h3>
            <p className="text-[15px] text-on-surface-variant">This section is coming soon.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
