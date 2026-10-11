/**
 * BrsrSectionHeader — Formal section heading with thin green rule.
 * Mirrors the visual style of real BRSR statutory filings.
 */

interface BrsrSectionHeaderProps {
  section: string;        // e.g. "SECTION A"
  title: string;          // e.g. "GENERAL DISCLOSURES"
  subtitle?: string;      // optional sub-line
}

export default function BrsrSectionHeader({ section, title, subtitle }: BrsrSectionHeaderProps) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div className="brsr-section-title">{section} — {title}</div>
      <hr className="brsr-section-rule" />
      {subtitle && (
        <p style={{ fontSize: '10px', color: '#4a4a4a', marginTop: '0', marginBottom: '10px' }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
