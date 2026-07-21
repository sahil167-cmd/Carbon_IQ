import { Link } from "react-router-dom";

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
}

export default function AppHeader({ title = "Dashboard", subtitle = "Shipment Intelligence" }: AppHeaderProps) {
  return (
    <header className="fixed top-0 right-0 left-64 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30 z-40 px-6 h-16 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-primary">{title}</h2>
        <span className="text-outline-variant">/</span>
        <span className="text-[15px] text-on-surface-variant">{subtitle}</span>
      </div>
      <div className="flex items-center gap-6">
        <div className="relative hidden md:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-40 text-xl">
            search
          </span>
          <input
            type="text"
            placeholder="Search shipments..."
            className="bg-surface-container rounded-full pl-10 pr-4 py-2 text-sm border-none focus:ring-1 focus:ring-primary w-64 transition-all outline-none"
          />
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 rounded-full hover:bg-surface-container transition-colors relative">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-surface"></span>
          </button>
          <Link
            to="/app/account"
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-xs"
          >
            JS
          </Link>
        </div>
      </div>
    </header>
  );
}
