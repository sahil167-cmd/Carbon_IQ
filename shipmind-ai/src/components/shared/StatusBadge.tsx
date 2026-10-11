import { cn } from "../../lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  // DB DocumentStatus enum values
  UPLOADED: {
    label: "Uploaded",
    className: "bg-blue-50 text-blue-700 border border-blue-200",
  },
  EXTRACTING: {
    label: "Extracting...",
    className: "bg-amber-50 text-amber-700 border border-amber-200 italic animate-pulse",
  },
  EXTRACTED: {
    label: "Extracted",
    className: "bg-purple-50 text-purple-700 border border-purple-200",
  },
  VALIDATING: {
    label: "Validating...",
    className: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  },
  NEEDS_REVIEW: {
    label: "Needs Review",
    className: "bg-orange-50 text-orange-700 border border-orange-200 font-bold",
  },
  APPROVED: {
    label: "Approved",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold",
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-rose-50 text-rose-700 border border-rose-200 font-bold",
  },
  CALCULATED: {
    label: "Calculated",
    className: "bg-teal-50 text-teal-700 border border-teal-200 font-bold",
  },
  CALCULATION_BLOCKED: {
    label: "Calc Blocked",
    className: "bg-red-50 text-red-700 border border-red-200 font-bold",
  },
  EXTRACTION_FAILED: {
    label: "Extraction Failed",
    className: "bg-red-50 text-red-700 border border-red-200 font-bold",
  },
  // Logistics ShipmentStatus values
  DRAFT: {
    label: "Draft",
    className: "bg-slate-100 text-slate-700 border border-slate-200 font-medium",
  },
  PLANNED: {
    label: "Planned",
    className: "bg-blue-50 text-blue-700 border border-blue-200 font-semibold",
  },
  OPTIMIZED: {
    label: "Optimized",
    className: "bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold",
  },
  DISPATCHED: {
    label: "Dispatched",
    className: "bg-amber-50 text-amber-700 border border-amber-200 font-semibold",
  },
  IN_TRANSIT: {
    label: "In Transit",
    className: "bg-cyan-50 text-cyan-700 border border-cyan-200 font-semibold",
  },
  DELIVERED: {
    label: "Delivered",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-rose-50 text-rose-700 border border-rose-200 font-semibold",
  },
  // Legacy UI strings
  Processed: {
    label: "Processed",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  Flagged: {
    label: "Flagged",
    className: "bg-rose-50 text-rose-700 border border-rose-200",
  },
  "Manual Review": {
    label: "Manual Review",
    className: "bg-orange-50 text-orange-700 border border-orange-200",
  },
  Processing: {
    label: "Processing...",
    className: "bg-amber-50 text-amber-700 border border-amber-200 italic",
  },
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status || "Unknown",
    className: "bg-gray-100 text-gray-700 border border-gray-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center text-[12px] font-semibold px-3 py-1 rounded-full",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
