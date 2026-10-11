/**
 * BrsrDisclosureTable — Simple two-column key/value disclosure table.
 * Used for SECTION A entity details, contact info, etc.
 */

import React from 'react';

interface DisclosureRow {
  label: string;
  value: string | number | null | undefined;
  indent?: boolean;
}

interface BrsrDisclosureTableProps {
  rows: DisclosureRow[];
  caption?: string;
}

const MISSING = <span className="brsr-missing">Management input required</span>;
const NA = <span className="brsr-na">Not applicable</span>;

export function fmt(value: string | number | null | undefined): React.ReactNode {
  if (value === null || value === undefined || value === '') return MISSING;
  if (String(value).trim() === 'N/A') return NA;
  return String(value);
}

export default function BrsrDisclosureTable({ rows, caption }: BrsrDisclosureTableProps) {
  return (
    <div style={{ marginBottom: '18px' }}>
      {caption && (
        <p className="brsr-subsection-title">{caption}</p>
      )}
      <table className="brsr-table">
        <colgroup>
          <col style={{ width: '42%' }} />
          <col style={{ width: '58%' }} />
        </colgroup>
        <thead>
          <tr>
            <th>Particular</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td className={`label-col${row.indent ? ' indent' : ''}`}>{row.label}</td>
              <td>{fmt(row.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
