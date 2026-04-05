import React from 'react';
import { motion } from 'framer-motion';
import { DELOS_THEME } from '@/theme';
import type { HostIntegrityReport } from '@/types/hostIntegrity';

interface HostIntegrityRadarProps {
  report: HostIntegrityReport;
}

// Simple SVG radar chart for 3 axes
export const HostIntegrityRadar: React.FC<HostIntegrityRadarProps> = ({ report }) => {
  // Normalize values to [0,1]
  const improv = Math.max(0, Math.min(1, report.improvisationScore / 100));
  const consist = Math.max(0, Math.min(1, report.narrativeConsistency / 100));
  const integrity = Math.max(0, Math.min(1, report.integrity / 100));

  // Radar points (top, bottom left, bottom right)
  const cx = 80, cy = 80, r = 60;
  const points = [
    [cx, cy - r * improv], // Top (Improvisation)
    [cx - r * Math.sin(Math.PI / 3) * consist, cy + r * Math.cos(Math.PI / 3) * consist], // Bottom left (Consistency)
    [cx + r * Math.sin(Math.PI / 3) * integrity, cy + r * Math.cos(Math.PI / 3) * integrity], // Bottom right (Integrity)
  ];

  return (
    <svg width={160} height={160} viewBox="0 0 160 160">
      {/* Radar grid */}
      {[0.4, 0.7, 1].map((lvl, i) => (
        <polygon
          key={i}
          points={[
            [cx, cy - r * lvl],
            [cx - r * Math.sin(Math.PI / 3) * lvl, cy + r * Math.cos(Math.PI / 3) * lvl],
            [cx + r * Math.sin(Math.PI / 3) * lvl, cy + r * Math.cos(Math.PI / 3) * lvl],
          ].map(p => p.join(",")).join(" ")}
          fill="none"
          stroke={DELOS_THEME.delosGrey}
          strokeWidth={i === 2 ? 2 : 1}
        />
      ))}
      {/* Highlighted shape */}
      <motion.polygon
        points={points.map(p => p.join(",")).join(" ")}
        fill={DELOS_THEME.hostSaffron + '33'}
        stroke={DELOS_THEME.hostSaffron}
        strokeWidth={3}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, type: 'spring' }}
      />
      {/* Axis labels */}
      <text x={cx} y={cy - r - 10} textAnchor="middle" fill={DELOS_THEME.delosGrey} fontFamily="monospace" fontSize={13}>
        Improvisation
      </text>
      <text x={cx - r * Math.sin(Math.PI / 3) - 10} y={cy + r * Math.cos(Math.PI / 3) + 8} textAnchor="end" fill={DELOS_THEME.delosGrey} fontFamily="monospace" fontSize={13}>
        Consistency
      </text>
      <text x={cx + r * Math.sin(Math.PI / 3) + 10} y={cy + r * Math.cos(Math.PI / 3) + 8} textAnchor="start" fill={DELOS_THEME.delosGrey} fontFamily="monospace" fontSize={13}>
        Integrity
      </text>
    </svg>
  );
};
