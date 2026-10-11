/**
 * BrsrPolicyMatrix — P1–P9 cross-table (Section B policy disclosures).
 * Renders as an actual compliance cross-reference table.
 */

interface PolicyEntry {
  hasCoverage?: boolean;
  boardApproved?: boolean;
  webLink?: string;
  translated?: boolean;
  designatedOfficer?: boolean;
  extendedToValueChain?: boolean;
  ngrbc?: boolean;
}

interface PolicyData {
  [principle: string]: PolicyEntry;
}

interface BrsrPolicyMatrixProps {
  policyData?: PolicyData;
}

const PRINCIPLES = [
  { key: 'P1', label: 'P1 — Ethics & Transparency' },
  { key: 'P2', label: 'P2 — Sustainable Products' },
  { key: 'P3', label: 'P3 — Employee Wellbeing' },
  { key: 'P4', label: 'P4 — Stakeholders' },
  { key: 'P5', label: 'P5 — Human Rights' },
  { key: 'P6', label: 'P6 — Environment' },
  { key: 'P7', label: 'P7 — Public Engagement' },
  { key: 'P8', label: 'P8 — Inclusive Growth' },
  { key: 'P9', label: 'P9 — Consumer Value' },
];

type BoolKey = 'hasCoverage' | 'boardApproved' | 'translated' | 'designatedOfficer' | 'extendedToValueChain' | 'ngrbc';

const ATTRIBUTES: { key: BoolKey; label: string }[] = [
  { key: 'hasCoverage', label: 'Policy covers this Principle' },
  { key: 'boardApproved', label: 'Board approved' },
  { key: 'translated', label: 'Translated to local language' },
  { key: 'designatedOfficer', label: 'Designated officer responsible' },
  { key: 'extendedToValueChain', label: 'Extended to value chain' },
  { key: 'ngrbc', label: 'Performance against NGRBC' },
];

function yn(val: boolean | undefined): string {
  if (val === undefined || val === null) return '—';
  return val ? 'Y' : 'N';
}

export default function BrsrPolicyMatrix({ policyData }: BrsrPolicyMatrixProps) {
  const data = policyData || {};

  return (
    <div style={{ marginBottom: '18px', overflowX: 'auto' }}>
      <table className="brsr-table" style={{ fontSize: '9.5px' }}>
        <thead>
          <tr>
            <th style={{ minWidth: '160px' }}>Attribute</th>
            {PRINCIPLES.map((p) => (
              <th key={p.key} className="num" style={{ minWidth: '36px' }}>{p.key}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ATTRIBUTES.map((attr) => (
            <tr key={attr.key}>
              <td className="label-col">{attr.label}</td>
              {PRINCIPLES.map((p) => (
                <td key={p.key} className="num" style={{ textAlign: 'center' }}>
                  {yn(data[p.key]?.[attr.key])}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td className="label-col">Web link to policy</td>
            {PRINCIPLES.map((p) => (
              <td key={p.key} style={{ fontSize: '8px', color: '#4a4a4a', textAlign: 'center' }}>
                {data[p.key]?.webLink ? (
                  <a href={data[p.key]!.webLink} target="_blank" rel="noreferrer" style={{ color: '#2e6b4f' }}>
                    Link
                  </a>
                ) : '—'}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
