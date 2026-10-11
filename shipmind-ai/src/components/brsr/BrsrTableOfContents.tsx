/**
 * BrsrTableOfContents — BRSR Table of Contents with dot leaders.
 * Renders as a real document TOC, not navigation pills.
 */

interface TocEntry {
  label: string;
  page: number;
  level?: 'section' | 'subsection';
}

interface BrsrTableOfContentsProps {
  entries: TocEntry[];
}

export default function BrsrTableOfContents({ entries }: BrsrTableOfContentsProps) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a1a1a', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Contents
      </div>
      <div style={{ borderTop: '2px solid #2e6b4f', marginBottom: '20px', paddingTop: '0' }} />

      {entries.map((entry, i) => (
        <div
          key={i}
          className="brsr-toc-row"
          style={entry.level === 'subsection' ? { paddingLeft: '20px' } : {}}
        >
          <span
            className="brsr-toc-label"
            style={{
              fontWeight: entry.level !== 'subsection' ? 600 : 400,
              fontSize: entry.level !== 'subsection' ? '11px' : '10.5px',
              color: entry.level !== 'subsection' ? '#1a1a1a' : '#4a4a4a',
            }}
          >
            {entry.label}
          </span>
          <span className="brsr-toc-dots" />
          <span className="brsr-toc-page">{entry.page}</span>
        </div>
      ))}
    </div>
  );
}
