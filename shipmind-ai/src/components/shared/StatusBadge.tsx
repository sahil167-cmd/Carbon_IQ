import { cn } from "../../lib/utils";
import type { DocumentStatus } from "../../types";

interface StatusBadgeProps {
  status: DocumentStatus;
  className?: string;
}

const statusConfig: Record<DocumentStatus, { label: string; className: string }> = {
  Processed: {
    label: "Processed",
    className: "bg-secondary-container/20 text-secondary",
  },
  Flagged: {
    label: "Flagged",
    className: "bg-error-container text-error",
  },
  "Manual Review": {
    label: "Manual Review",
    className: "bg-surface-container-high text-on-surface-variant",
  },
  Processing: {
    label: "Processing...",
    className: "bg-surface-container-high text-on-surface-variant italic",
  },
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center text-[13px] font-medium px-3 py-1 rounded-full",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
