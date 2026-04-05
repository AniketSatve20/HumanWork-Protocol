import React from 'react';
import HostRadarChart, { HostRadarChartProps } from './HostRadarChart';

// Design tokens
const HOST_SAFFRON = '#FA831B';
const INDUSTRIAL_GREY = '#83858D';

interface DiagnosticsHUDProps {
  radarData: HostRadarChartProps['data'];
  recentFragments: { hash: string; label?: string }[];
  animateRadar?: boolean;
}

export const DiagnosticsHUD: React.FC<DiagnosticsHUDProps> = ({ radarData, recentFragments, animateRadar = true }) => {
  return (
    <div
      className="relative w-full max-w-xl mx-auto mt-8 rounded-none border border-solid"
      style={{
        borderColor: INDUSTRIAL_GREY,
        borderWidth: 0.5,
        borderRadius: 0,
        background: 'rgba(24, 26, 32, 0.85)',
        backdropFilter: 'blur(4px)', // subtle glass effect
        boxShadow: '0 2px 24px 0 rgba(0,0,0,0.12)',
        overflow: 'hidden',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          background: 'rgba(34, 36, 42, 0.92)',
          borderBottom: `0.5px solid ${INDUSTRIAL_GREY}`,
          padding: '0.5rem 1.25rem',
        }}
      >
        <span
          style={{
            color: HOST_SAFFRON,
            fontFamily: 'monospace',
            fontSize: 13,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          SYSTEM STATUS: SCANNING NARRATIVE...
        </span>
      </div>
      <div className="flex flex-row items-stretch">
        {/* Sidebar: Recent Fragments */}
        <aside
          style={{
            minWidth: 120,
            borderRight: `0.5px solid ${INDUSTRIAL_GREY}`,
            background: 'rgba(34, 36, 42, 0.85)',
            padding: '1.25rem 0.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              color: INDUSTRIAL_GREY,
              fontFamily: 'monospace',
              fontSize: 11,
              fontWeight: 600,
              marginBottom: 8,
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            Recent Fragments
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {recentFragments.map((frag) => (
              <li key={frag.hash} style={{ marginBottom: 6 }}>
                <a
                  href={`https://hashscan.io/testnet/transaction/${frag.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: INDUSTRIAL_GREY,
                    fontFamily: 'monospace',
                    fontSize: 10,
                    textDecoration: 'underline dotted',
                    wordBreak: 'break-all',
                  }}
                  title={frag.label || frag.hash}
                >
                  {frag.label ? `${frag.label}: ` : ''}
                  {frag.hash.slice(0, 10)}...{frag.hash.slice(-6)}
                </a>
              </li>
            ))}
          </ul>
        </aside>
        {/* Main Radar Chart Area */}
        <main className="flex-1 flex items-center justify-center p-6">
          <HostRadarChart data={radarData} animate={animateRadar} />
        </main>
      </div>
    </div>
  );
};

export default DiagnosticsHUD;
