import { cn } from "../../lib/utils";

interface KPICardProps {
  icon: string;
  iconFill?: boolean;
  iconColor?: string;
  iconBg?: string;
  label: string;
  value: string;
  badge?: string;
  badgeColor?: "green" | "red" | "default";
  className?: string;
}

export default function KPICard({
  icon,
  iconFill = false,
  iconColor = "text-primary",
  iconBg = "bg-surface-container",
  label,
  value,
  badge,
  badgeColor = "default",
  className,
}: KPICardProps) {
  const badgeClasses = {
    green: "text-secondary bg-secondary-container/20",
    red: "text-error bg-error-container",
    default: "text-on-surface-variant bg-surface-container",
  };

  return (
    <div
      className={cn(
        "bg-surface-container-lowest border border-outline-variant/30 p-8 rounded-[20px] transition-transform hover:-translate-y-1 duration-300",
        className
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <span
          className={cn("p-2 rounded-lg material-symbols-outlined", iconBg, iconColor)}
          style={iconFill ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          {icon}
        </span>
        {badge && (
          <span className={cn("text-[13px] font-bold px-2 py-0.5 rounded-full", badgeClasses[badgeColor])}>
            {badge}
          </span>
        )}
      </div>
      <p className="text-[13px] font-medium text-on-surface-variant mb-1 uppercase tracking-wider">
        {label}
      </p>
      <h3 className="text-[40px] font-bold leading-tight tracking-tighter">{value}</h3>
    </div>
  );
}
