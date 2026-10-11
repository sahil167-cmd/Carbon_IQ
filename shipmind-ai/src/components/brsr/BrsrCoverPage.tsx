/**
 * BrsrCoverPage — Professional BRSR report cover page.
 * White A4 format. Company-first, CarbonIQ as subtle attribution.
 */

interface BrsrCoverPageProps {
  companyName: string;
  cin?: string;
  financialYear: string;
  boundary: string;
  registeredOffice?: string;
}

export default function BrsrCoverPage({
  companyName,
  cin,
  financialYear,
  boundary,
  registeredOffice,
}: BrsrCoverPageProps) {
  return (
    <div className="brsr-page" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '1020px' }}>
      {/* Top band — thin accent */}
      <div style={{ borderTop: '6px solid #2e6b4f', paddingTop: '32px' }}>
        {/* Company identity */}
        <div style={{ marginBottom: '48px' }}>
          {/* Logo placeholder — shows company initials in a subtle box */}
          <div style={{
            width: '64px',
            height: '64px',
            border: '1px solid #d0d0d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
            background: '#f8f8f8',
          }}>
            <span style={{ fontSize: '22px', fontWeight: 700, color: '#2e6b4f', letterSpacing: '-0.02em' }}>
              {(companyName || 'CO').slice(0, 2).toUpperCase()}
            </span>
          </div>

          <div style={{ fontSize: '11px', color: '#4a4a4a', marginBottom: '4px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {companyName || 'Listed Entity'}
          </div>
          {cin && (
            <div style={{ fontSize: '9.5px', color: '#6b6b6b' }}>CIN: {cin}</div>
          )}
        </div>

        {/* Report title block */}
        <div style={{ borderLeft: '3px solid #2e6b4f', paddingLeft: '20px', marginBottom: '48px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#4a4a4a', marginBottom: '8px', fontWeight: 600 }}>
            Statutory Disclosure
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a1a', lineHeight: 1.15, marginBottom: '8px' }}>
            Business Responsibility<br />
            &amp; Sustainability<br />
            Report
          </div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#2e6b4f', marginTop: '12px' }}>
            {financialYear}
          </div>
        </div>

        {/* Entity details block */}
        <div style={{ borderTop: '1px solid #d0d0d0', paddingTop: '20px', marginTop: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', color: '#1a1a1a' }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 0', color: '#6b6b6b', width: '38%' }}>Reporting Boundary</td>
                <td style={{ padding: '4px 0', fontWeight: 600 }}>{boundary === 'CONSOLIDATED' ? 'Consolidated (Group including Subsidiaries)' : 'Standalone Entity'}</td>
              </tr>
              {registeredOffice && (
                <tr>
                  <td style={{ padding: '4px 0', color: '#6b6b6b', verticalAlign: 'top' }}>Registered Office</td>
                  <td style={{ padding: '4px 0' }}>{registeredOffice}</td>
                </tr>
              )}
              <tr>
                <td style={{ padding: '4px 0', color: '#6b6b6b' }}>Regulatory Framework</td>
                <td style={{ padding: '4px 0' }}>SEBI (LODR) Regulations, 2015 — BRSR Format</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0', color: '#6b6b6b' }}>GHG Protocol Standard</td>
                <td style={{ padding: '4px 0' }}>GHG Protocol Corporate Standard (2015) + GLEC Framework</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom attribution — subtle, small */}
      <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: '12px', marginTop: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '8px', color: '#9a9a9a', fontStyle: 'italic' }}>
          Prepared using CarbonIQ Sustainability Intelligence Platform
        </span>
        <span style={{ fontSize: '8px', color: '#9a9a9a' }}>
          Confidential
        </span>
      </div>
    </div>
  );
}
