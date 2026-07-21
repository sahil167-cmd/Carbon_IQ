import { NavLink } from "react-router-dom";
import { cn } from "../../lib/utils";

interface SideNavItem {
  label: string;
  icon: string;
  href: string;
}

const mainNavItems: SideNavItem[] = [
  { label: "Dashboard", icon: "dashboard", href: "/app/dashboard" },
  { label: "Shipments", icon: "local_shipping", href: "/app/shipments" },
  { label: "Fleet", icon: "precision_manufacturing", href: "/app/fleet" },
  { label: "Intelligence", icon: "insights", href: "/app/analytics" },
  { label: "Documents", icon: "description", href: "/app/documents" },
  { label: "Settings", icon: "settings", href: "/app/settings/organization" },
];

const bottomNavItems: SideNavItem[] = [
  { label: "Support", icon: "help", href: "/app/support" },
  { label: "Account", icon: "account_circle", href: "/app/account" },
];

export default function SideNav() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-surface-container-lowest border-r border-outline-variant/20 flex flex-col py-6 px-4 gap-4 z-50">
      <div className="flex items-center gap-3 px-3 py-2 mb-4">
        <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-lg flex-shrink-0">
          <span className="material-symbols-outlined text-white material-symbols-filled" style={{ fontSize: 20 }}>
            dataset
          </span>
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-primary tracking-tight leading-none">
            ShipMind AI
          </h1>
          <p className="text-[11px] text-on-surface-variant uppercase tracking-widest mt-0.5">
            Enterprise Logistics
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {mainNavItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 p-3 rounded-lg transition-colors text-[13px] font-medium",
                isActive
                  ? "bg-secondary-container/10 text-secondary border-l-2 border-secondary font-bold rounded-l-none"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className="material-symbols-outlined"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <NavLink
        to="/app/upload"
        className="bg-primary text-on-primary text-[13px] font-bold px-4 py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-95"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
        New Shipment
      </NavLink>

      <div className="border-t border-outline-variant/20 pt-4 space-y-1">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 p-3 rounded-lg transition-colors text-[13px]",
                isActive
                  ? "text-secondary font-bold"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              )
            }
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </aside>
  );
}
