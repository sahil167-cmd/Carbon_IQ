/**
 * BrsrDocumentPage — A4 white page wrapper.
 * Renders a single physical page with running header, footer, and margin-safe content.
 */

import React from 'react';

interface BrsrDocumentPageProps {
  children: React.ReactNode;
  companyName: string;
  financialYear: string;
  pageNumber?: number;
  totalPages?: number;
  /** If true, omits the running header (e.g., cover page) */
  noBanner?: boolean;
}

export default function BrsrDocumentPage({
  children,
  companyName,
  financialYear,
  pageNumber,
  totalPages,
  noBanner = false,
}: BrsrDocumentPageProps) {
  return (
    <div className="brsr-page">
      {/* Running header — omitted on cover page */}
      {!noBanner && (
        <div className="brsr-page-header">
          <span style={{ fontWeight: 600, color: '#1a1a1a', fontSize: '8.5px' }}>
            {companyName || 'Listed Entity'}
          </span>
          <span>Business Responsibility &amp; Sustainability Report {financialYear}</span>
        </div>
      )}

      {/* Page content */}
      <div>{children}</div>

      {/* Running footer */}
      <div className="brsr-page-footer">
        <span>Confidential &mdash; Not for general distribution</span>
        {pageNumber !== undefined && totalPages !== undefined && (
          <span>Page {pageNumber} of {totalPages}</span>
        )}
      </div>
    </div>
  );
}
