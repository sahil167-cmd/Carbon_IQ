import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge";
import ConfidenceBadge from "./ConfidenceBadge";
import type { Document } from "../../types";

interface DocumentRowProps {
  doc: Document;
  selectable?: boolean;
  checked?: boolean;
  onCheck?: (id: string) => void;
}

const iconMap: Record<string, string> = {
  "Bill of Lading": "article",
  Invoice: "receipt_long",
  "Cargo Manifest": "article",
  "Terminal Receipt": "pending",
  "Packing List": "article",
  "Commercial Invoice": "description",
};

export default function DocumentRow({
  doc,
  selectable = false,
  checked = false,
  onCheck,
}: DocumentRowProps) {
  return (
    <tr className="hover:bg-surface-container/20 transition-colors group">
      {selectable && (
        <td className="py-5 pl-8 pr-4">
          <input
            type="checkbox"
            checked={checked}
            onChange={() => onCheck?.(doc.id)}
            className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary/20"
          />
        </td>
      )}
      <td className="px-8 py-6">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-on-surface-variant opacity-40">
            {iconMap[doc.type] ?? "description"}
          </span>
          <Link
            to={`/app/documents/${doc.id}`}
            className="text-[15px] font-semibold hover:text-secondary transition-colors"
          >
            {doc.name}
          </Link>
        </div>
      </td>
      <td className="px-8 py-6 text-[15px] text-on-surface-variant">{doc.type}</td>
      <td className="px-8 py-6 text-center">
        <ConfidenceBadge value={doc.confidence} />
      </td>
      <td className="px-8 py-6">
        <StatusBadge status={doc.status} />
      </td>
    </tr>
  );
}
