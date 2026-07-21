import { cn } from "../../lib/utils";

interface ProgressBarProps {
  value: number; // 0-100
  color?: "green" | "primary" | "error" | "outline";
  height?: string;
  className?: string;
  showLabel?: boolean;
}

const colorMap = {
  green: "bg-secondary",
  primary: "bg-primary",
  error: "bg-error",
  outline: "bg-on-surface-variant",
};

export default function ProgressBar({
  value,
  color = "green",
  height = "h-1.5",
  className,
  showLabel = false,
}: ProgressBarProps) {
  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between mb-1">
          <span className="text-[13px] text-on-surface-variant">Progress</span>
          <span className="text-[13px] font-bold">{value}%</span>
        </div>
      )}
      <div className={cn("w-full bg-surface-container rounded-full overflow-hidden", height)}>
        <div
          className={cn("h-full rounded-full transition-all duration-500", colorMap[color])}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}
