import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  Truck,
  FileText,
  FileCheck2,
  Settings,
  Plus,
} from "lucide-react";
import { cn } from "../../lib/utils";

interface SideNavItem {
  label: string;
  icon: any;
  href: string;
}

const mainNavItems: SideNavItem[] = [
  { label: "Dashboard", icon: LayoutGrid, href: "/app/dashboard" },
  { label: "Shipments", icon: Truck, href: "/app/shipments" },
  { label: "Documents", icon: FileText, href: "/app/documents" },
  { label: "BRSR Reports", icon: FileCheck2, href: "/app/reports/brsr" },
];

export default function SideNav() {
  const location = useLocation();
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 flex flex-col py-6 px-4 gap-4 z-50 select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 py-1 mb-2">
        <div className="w-10 h-10 bg-[#0F6B3A] flex items-center justify-center rounded-xl flex-shrink-0 shadow-sm text-white">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10a10 10 0 0 1-10-10C2 6.477 6.477 2 12 2z"/>
            <path d="M7 12a5 5 0 0 1 5-5v10a5 5 0 0 1-5-5z"/>
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
            CarbonIQ
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            ENTERPRISE COMPLIANCE
          </p>
        </div>
      </div>

      {/* Primary Action Button */}
      <NavLink
        to="/app/reports/brsr"
        className="w-full bg-[#0F6B3A] hover:bg-[#125C3A] text-white text-[13.5px] font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98]"
      >
        <Plus className="w-4 h-4" />
        New Report
      </NavLink>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1 mt-2">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isItemActive =
            location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);

          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-[13.5px] font-medium",
                isItemActive
                  ? "bg-[#E6F4EA] text-[#0F6B3A] font-bold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Settings Link */}
      <div className="border-t border-slate-100 pt-3">
        <NavLink
          to="/app/settings/organization"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-[13.5px] font-medium",
              isActive
                ? "bg-[#E6F4EA] text-[#0F6B3A] font-bold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )
          }
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span>Settings</span>
        </NavLink>
      </div>
    </aside>
  );
}
