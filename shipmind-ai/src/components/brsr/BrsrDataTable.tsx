/**
 * BrsrDataTable — General-purpose multi-column corporate data table.
 * Used for GHG, energy, water, waste, and other quantitative disclosures.
 */

import React from 'react';

export interface DataColumn {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  bold?: boolean;
  indent?: boolean;
  colSpan?: number;
}

// Use separate named props instead of index signature to avoid boolean conflicts
export interface DataRow {
  _isTotal?: boolean;
  _indent?: boolean;
  [key: string]: unknown;
}

interface BrsrDataTableProps {
  columns: DataColumn[];
  rows: DataRow[];
  caption?: string;
  footnote?: string;
}

function cellVal(v: unknown): React.ReactNode {
  if (v === null || v === undefined || v === '') return <span className="brsr-missing">—</span>;
  return String(v);
}

export default function BrsrDataTable({ columns, rows, caption, footnote }: BrsrDataTableProps) {
  return (
    <div style={{ marginBottom: '18px' }}>
      {caption && <p className="brsr-subsection-title">{caption}</p>}
      <table className="brsr-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={col.align === 'right' ? 'num' : ''}
                colSpan={col.colSpan}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={row._isTotal ? 'total-row' : ''}>
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={[
                    col.align === 'right' ? 'num' : '',
                    col.indent || row._indent ? 'indent' : '',
                    col.bold || row._isTotal ? 'label-col' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={col.bold || row._isTotal ? { fontWeight: 600 } : undefined}
                >
                  {cellVal(row[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {footnote && <p className="brsr-footnote">{footnote}</p>}
    </div>
  );
}
