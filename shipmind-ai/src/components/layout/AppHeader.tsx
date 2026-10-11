import { Link } from "react-router-dom";
import { useUnreadCount } from "../../hooks/useNotifications";
import { useHealthCheck } from "../../hooks/useHealthCheck";

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
}

export default function AppHeader({ title = "Dashboard", subtitle = "Shipment Intelligence" }: AppHeaderProps) {
  const unreadCount = useUnreadCount();
  const { data: healthData, isSuccess: isBackendOnline } = useHealthCheck();

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();

  const fullName = user.fullName || "Sahil Borhade";
  const nameParts = fullName.trim().split(" ");
  const initials = (
    nameParts.length >= 2
      ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
      : fullName.slice(0, 2) || "SB"
  ).toUpperCase();

  return (
    <header className="fixed top-0 right-0 left-64 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30 z-40 px-6 h-16 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-primary">{title}</h2>
        <span className="text-outline-variant">/</span>
        <span className="text-[15px] text-on-surface-variant">{subtitle}</span>
      </div>
      <div className="flex items-center gap-6">
        {/* Backend Connectivity Status Pill */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container text-xs">
          <span className={`w-2 h-2 rounded-full ${isBackendOnline ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="text-on-surface-variant font-medium">
            {isBackendOnline ? `API Online (${healthData?.data?.status ?? 'ok'})` : 'API Standby'}
          </span>
        </div>

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
          <button 
            className="p-2 rounded-full hover:bg-surface-container transition-colors relative text-on-surface"
            title={`${unreadCount} unread notifications`}
          >
            <span className="material-symbols-outlined">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-error text-on-error rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-surface">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          <Link
            to="/app/account"
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-xs hover:opacity-90 transition-all shadow-sm"
            title={`${user?.fullName || 'User'} (Account Settings)`}
          >
            {initials}
          </Link>
        </div>
      </div>
    </header>
  );
}

