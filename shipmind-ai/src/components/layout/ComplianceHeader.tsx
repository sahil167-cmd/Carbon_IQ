import { NavLink } from "react-router-dom";
import { RefreshCw, Bell, HelpCircle, User, FileSpreadsheet } from "lucide-react";

interface ComplianceHeaderProps {
  onSync?: () => void;
  isSyncing?: boolean;
}

export default function ComplianceHeader({ onSync, isSyncing }: ComplianceHeaderProps) {
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();

  const initials = (user.fullName || "Sahil Borhade")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="fixed top-0 right-0 left-64 bg-white border-b border-slate-200 z-40 px-8 h-16 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)] select-none">
      {/* Left Compliance Brand & Sublinks */}
      <div className="flex items-center gap-8">
        <div className="leading-tight">
          <span className="block text-sm font-bold text-slate-900 tracking-tight">CarbonIQ</span>
          <span className="block text-sm font-bold text-[#0F6B3A] tracking-tight">Compliance</span>
        </div>

        <nav className="hidden lg:flex items-center gap-6 text-[13px] font-medium text-slate-600">
          <NavLink
            to="/app/reports/brsr"
            className={({ isActive }) =>
              isActive ? "text-[#0F6B3A] font-semibold" : "hover:text-slate-900 transition-colors"
            }
          >
            Overview
          </NavLink>
          <NavLink
            to="/app/reports/brsr"
            className="hover:text-slate-900 transition-colors"
          >
            History
          </NavLink>
          <a
            href="#compliance-guide"
            onClick={(e) => {
              e.preventDefault();
              alert("SEBI BRSR Compliance Framework Guide: Mandatory reporting for top 1,000 listed entities across Principles 1 to 9.");
            }}
            className="hover:text-slate-900 transition-colors"
          >
            Compliance Guide
          </a>
          <NavLink
            to="/app/documents"
            className="flex items-center gap-1.5 hover:text-slate-900 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
            View Carbon Ledger
          </NavLink>
        </nav>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-[#0F6B3A] hover:bg-[#125C3A] disabled:opacity-75 text-white text-xs font-semibold rounded-lg transition-all shadow-sm active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Sync Verified Data'}</span>
        </button>

        <div className="flex items-center gap-1 text-slate-400 pl-2 border-l border-slate-200">
          <button
            className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
          </button>
          <button
            className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title="Help & Documentation"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <div
            className="w-7 h-7 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-[11px] font-bold text-slate-700 ml-1 cursor-pointer"
            title={user.fullName || 'User Profile'}
          >
            {initials || <User className="w-3.5 h-3.5" />}
          </div>
        </div>
      </div>
    </header>
  );
}
