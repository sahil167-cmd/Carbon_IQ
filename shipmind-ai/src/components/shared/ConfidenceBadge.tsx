import { cn } from "../../lib/utils";

interface ConfidenceBadgeProps {
  value: number;
  className?: string;
}

export default function ConfidenceBadge({ value, className }: ConfidenceBadgeProps) {
  const isHigh = value >= 90;
  const isMedium = value >= 70 && value < 90;

  const colorClass = isHigh
    ? "bg-on-secondary-container/10 text-on-secondary-container"
    : isMedium
    ? "bg-surface-container text-on-surface-variant"
    : "bg-error-container/40 text-error";

  const dotClass = isHigh
    ? "bg-on-secondary-container"
    : isMedium
    ? "bg-outline"
    : "bg-error";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full",
        colorClass,
        className
      )}
    >
      <div className={cn("w-1.5 h-1.5 rounded-full", dotClass)} />
      <span className="text-[13px] font-bold">{value.toFixed(1)}%</span>
    </div>
  );
}
