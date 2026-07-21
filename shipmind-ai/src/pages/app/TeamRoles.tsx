import { useState } from "react";
import AppLayout from "../../components/layout/AppLayout";

const roles = [
  { name: "Admin", description: "Full access to all features and settings.", users: 2, color: "bg-primary text-white" },
  { name: "Manager", description: "Can manage shipments, documents, and view analytics.", users: 5, color: "bg-secondary/10 text-secondary" },
  { name: "Analyst", description: "Read-only access to analytics and reports.", users: 8, color: "bg-surface-container-high text-on-surface-variant" },
  { name: "Viewer", description: "View-only access to dashboards.", users: 12, color: "bg-surface-container text-on-surface-variant" },
];

const teamMembers = [
  { name: "Elena Voss", email: "elena@globalfreight.com", role: "Admin", avatar: "EV", status: "Active" },
  { name: "Marcus Chen", email: "marcus@globalfreight.com", role: "Manager", avatar: "MC", status: "Active" },
  { name: "Sarah Jenkins", email: "sarah@globalfreight.com", role: "Manager", avatar: "SJ", status: "Active" },
  { name: "Julian Aris", email: "julian@globalfreight.com", role: "Analyst", avatar: "JA", status: "Pending" },
  { name: "Alex Park", email: "alex@globalfreight.com", role: "Viewer", avatar: "AP", status: "Active" },
];

const statusColors: Record<string, string> = {
  Active: "bg-secondary/10 text-secondary",
  Pending: "bg-amber-100 text-amber-700",
};

export default function TeamRoles() {
  const [showInvite, setShowInvite] = useState(false);

  return (
    <AppLayout title="Team & Roles" subtitle="User Management">
      <div className="pt-8 pb-[120px] px-6 max-w-[1280px] mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-[40px] font-semibold leading-none tracking-[-0.03em]">Team &amp; Roles</h2>
            <p className="text-[15px] text-on-surface-variant mt-2">Manage who has access and what they can do.</p>
          </div>
          <button
            onClick={() => setShowInvite((p) => !p)}
            className="bg-primary text-white px-6 py-3 rounded-xl font-bold text-[15px] hover:opacity-90 transition-all active:scale-95 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Invite Member
          </button>
        </div>

        {showInvite && (
          <div className="mb-8 bg-white border border-outline-variant/30 rounded-[20px] p-6 ambient-shadow">
            <h4 className="font-semibold mb-4">Invite Team Member</h4>
            <div className="flex gap-4">
              <input
                type="email"
                placeholder="colleague@company.com"
                className="flex-1 px-4 py-3 rounded-xl border border-outline-variant outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 text-[15px] transition-all"
              />
              <select className="px-4 py-3 rounded-xl border border-outline-variant outline-none text-[15px] bg-white appearance-none">
                <option>Manager</option>
                <option>Analyst</option>
                <option>Viewer</option>
              </select>
              <button className="bg-secondary text-white px-6 py-3 rounded-xl font-bold text-[15px] hover:opacity-90 transition-all">
                Send Invite
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roles */}
          <div className="space-y-4">
            <h3 className="font-semibold text-[18px] mb-2">Permission Roles</h3>
            {roles.map((r) => (
              <div key={r.name} className="bg-white border border-outline-variant/30 rounded-[20px] p-5 ambient-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[13px] font-bold px-3 py-1 rounded-full ${r.color}`}>{r.name}</span>
                  <span className="text-[13px] text-on-surface-variant">{r.users} users</span>
                </div>
                <p className="text-[13px] text-on-surface-variant">{r.description}</p>
              </div>
            ))}
          </div>

          {/* Members Table */}
          <div className="lg:col-span-2">
            <h3 className="font-semibold text-[18px] mb-4">Team Members ({teamMembers.length})</h3>
            <div className="bg-white border border-outline-variant/30 rounded-[20px] overflow-hidden ambient-shadow">
              <div className="divide-y divide-outline-variant/20">
                {teamMembers.map((m) => (
                  <div key={m.email} className="px-6 py-5 flex items-center gap-4 hover:bg-surface-container-low transition-colors">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-[13px] flex-shrink-0">
                      {m.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[15px] truncate">{m.name}</p>
                      <p className="text-[13px] text-on-surface-variant truncate">{m.email}</p>
                    </div>
                    <span className={`text-[13px] font-medium px-3 py-1 rounded-full ${statusColors[m.status]}`}>
                      {m.status}
                    </span>
                    <select
                      defaultValue={m.role}
                      className="px-3 py-1.5 rounded-lg border border-outline-variant text-[13px] bg-white appearance-none outline-none focus:border-primary transition-all"
                    >
                      {roles.map((r) => <option key={r.name}>{r.name}</option>)}
                    </select>
                    <button className="text-on-surface-variant hover:text-error transition-colors">
                      <span className="material-symbols-outlined text-[18px]">more_vert</span>
                    </button>
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
