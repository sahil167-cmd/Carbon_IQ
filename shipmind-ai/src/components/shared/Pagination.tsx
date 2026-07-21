import { cn } from "../../lib/utils";

interface PaginationProps {
  current: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({ current, total, onPageChange, className }: PaginationProps) {
  const pages = [1, 2, 3];
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        disabled={current === 1}
        onClick={() => onPageChange(current - 1)}
        className="w-10 h-10 flex items-center justify-center rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-30"
      >
        <span className="material-symbols-outlined">chevron_left</span>
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={cn(
            "w-10 h-10 flex items-center justify-center rounded-xl text-[13px] font-bold transition-colors",
            p === current
              ? "bg-primary text-white"
              : "border border-outline-variant text-on-surface-variant hover:bg-surface-container"
          )}
        >
          {p}
        </button>
      ))}
      <span className="text-on-surface-variant px-1">...</span>
      <button
        onClick={() => onPageChange(total)}
        className="w-10 h-10 flex items-center justify-center rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors text-[13px] font-bold"
      >
        {total}
      </button>
      <button
        disabled={current === total}
        onClick={() => onPageChange(current + 1)}
        className="w-10 h-10 flex items-center justify-center rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-30"
      >
        <span className="material-symbols-outlined">chevron_right</span>
      </button>
    </div>
  );
}
