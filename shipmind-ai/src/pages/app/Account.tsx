import AppLayout from "../../components/layout/AppLayout";
import { useState, useEffect } from "react";

export default function Account() {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  
  // Real authenticated user from localStorage
  const [user, setUser] = useState<{
    id?: string;
    email?: string;
    fullName?: string;
    role?: string;
    organizationId?: string;
    organizationName?: string;
  } | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Admin");
  const [orgName, setOrgName] = useState("Enterprise Account");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const u = JSON.parse(stored);
        setUser(u);
        const parts = (u.fullName || "Sahil Borhade").trim().split(" ");
        setFirstName(parts[0] || "Sahil");
        setLastName(parts.slice(1).join(" ") || "Borhade");
        setEmail(u.email || "sahil@carboniq.ai");
        setRole(u.role || "ADMIN");
        setOrgName(u.organizationName || "CarbonIQ Enterprise Tenant");
      } else {
        setFirstName("Sahil");
        setLastName("Borhade");
        setEmail("sahil@carboniq.ai");
        setRole("ADMIN");
        setOrgName("CarbonIQ Enterprise");
      }
    } catch {
      setFirstName("Sahil");
      setLastName("Borhade");
      setEmail("sahil@carboniq.ai");
    }
  }, []);

  const apiKey = `sk_live_carboniq_${(user?.organizationId || "cmssknvps000119nwrhreznyy").slice(0, 16)}_${(user?.id || "usr_9921").slice(0, 8)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedFullName = `${firstName} ${lastName}`.trim();
    const updatedUser = {
      ...user,
      fullName: updatedFullName,
      email,
      role,
      organizationName: orgName,
    };
    localStorage.setItem("user", JSON.stringify(updatedUser));
    setUser(updatedUser);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const initials = `${firstName?.[0] || "S"}${lastName?.[0] || "B"}`.toUpperCase();

  // Dynamic device detection
  const isWindows = navigator.userAgent.includes("Windows");
  const isMac = navigator.userAgent.includes("Mac");
  const osName = isWindows ? "Windows 11" : isMac ? "macOS" : "Linux";
  const browserName = navigator.userAgent.includes("Chrome") ? "Chrome" : "Browser";
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";

  return (
    <AppLayout title="Account Settings" subtitle="User Settings & API Keys">
      <div className="pt-8 pb-[120px] px-6 max-w-[1280px] mx-auto space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-outline-variant/30 rounded-[20px] p-8 ambient-shadow">
              <h3 className="text-[18px] font-bold mb-6">User Profile</h3>
              <div className="flex gap-6 items-center mb-8 pb-8 border-b border-outline-variant/10">
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white text-3xl font-bold font-sans shadow-md">
                  {initials}
                </div>
                <div>
                  <h4 className="text-xl font-semibold">{firstName} {lastName}</h4>
                  <p className="text-[13px] text-on-surface-variant">{email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="bg-primary text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {role}
                    </span>
                    <span className="bg-secondary/10 text-secondary text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-secondary/20">
                      {orgName}
                    </span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[13px] text-on-surface-variant font-medium">First Name</label>
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-xl text-[14px] font-medium outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] text-on-surface-variant font-medium">Last Name</label>
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-xl text-[14px] font-medium outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[13px] text-on-surface-variant font-medium">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-xl text-[14px] font-medium outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] text-on-surface-variant font-medium">Organization</label>
                    <input
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-xl text-[14px] font-medium outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="submit"
                    className="bg-primary text-white px-6 py-2.5 rounded-xl text-[13px] font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check</span>
                    Save Changes
                  </button>
                  {saved && (
                    <span className="text-secondary text-[13px] font-bold animate-in fade-in duration-200">
                      ✓ Profile details updated!
                    </span>
                  )}
                </div>
              </form>
            </div>

            {/* API Access Key */}
            <div className="bg-white border border-outline-variant/30 rounded-[20px] p-8 ambient-shadow">
              <h3 className="text-[18px] font-bold mb-4">API Access Keys</h3>
              <p className="text-[13px] text-on-surface-variant mb-6">
                Use this key to authorize your custom scripts, ERP connectors, or automated emissions pipelines.
              </p>
              <div className="flex gap-3">
                <input
                  readOnly
                  value={apiKey}
                  type="text"
                  className="flex-1 px-4 py-3 bg-surface-container font-mono text-[13px] rounded-xl outline-none border border-outline-variant/55 text-on-surface"
                />
                <button
                  onClick={handleCopy}
                  className="bg-primary text-white px-6 py-3 rounded-xl text-[13px] font-bold hover:opacity-90 active:scale-95 transition-all"
                >
                  {copied ? "Copied!" : "Copy Key"}
                </button>
              </div>
            </div>
          </div>

          {/* Right sidebar session / system health */}
          <div className="space-y-6">
            <div className="bg-white border border-outline-variant/30 rounded-[20px] p-6 ambient-shadow">
              <h4 className="font-semibold mb-4 text-[15px]">Active Sessions</h4>
              <div className="space-y-4">
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
                    <span className="material-symbols-outlined">devices</span>
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-on-surface">{userTimezone}</p>
                    <p className="text-[11px] text-on-surface-variant">
                      {osName} • {browserName} • <span className="text-secondary font-bold">Active now</span>
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-outline-variant/20">
                  <p className="text-[11px] text-on-surface-variant">
                    Logged in as <strong className="text-on-surface">{email}</strong>
                  </p>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    Tenant ID: <code className="text-[10px] bg-surface-container px-1 py-0.5 rounded font-mono">{user?.organizationId || "cmssknvps000119nwrhreznyy"}</code>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
