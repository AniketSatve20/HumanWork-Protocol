import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

// Design tokens
const HOST_SAFFRON = '#FA831B';
const INDUSTRIAL_GREY = '#83858D';
const BONE = '#F5F5F5';

// Core Drives order and mapping
const CORE_DRIVES = [
  { key: 'technicalPrecision', label: 'Technical Precision' },
  { key: 'narrativeConsistency', label: 'Narrative Consistency' },
  { key: 'improvisation', label: 'Improvisation' },
  { key: 'cognitiveFluidity', label: 'Cognitive Fluidity' },
  { key: 'protocolAdherence', label: 'Protocol Adherence' },
];

// Props: values 0-100 for each core drive
export interface HostRadarChartProps {
  data: {
    technicalPrecision: number;
    narrativeConsistency: number;
    improvisation: number;
    cognitiveFluidity: number;
    protocolAdherence: number;
  };
  animate?: boolean;
}

export const HostRadarChart: React.FC<HostRadarChartProps> = ({ data, animate = true }) => {
  // Prepare data for recharts
  const chartData = CORE_DRIVES.map(({ key, label }) => ({
    drive: label,
    value: data[key as keyof typeof data],
  }));

  // Animation variants for bloom effect
  const variants = {
    hidden: { scale: 0.7, opacity: 0 },
    visible: { scale: 1, opacity: 1, transition: { duration: 1, type: 'spring', bounce: 0.25 } },
  };

  return (
    <motion.div
      initial={animate ? 'hidden' : false}
      animate={animate ? 'visible' : false}
      variants={variants}
      style={{ width: '100%', height: 340 }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
          <PolarGrid stroke={INDUSTRIAL_GREY} strokeWidth={0.5} />
          <PolarAngleAxis
            dataKey="drive"
            tick={{
              fill: BONE,
              fontFamily: 'serif',
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: 0.5,
            }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
            stroke={INDUSTRIAL_GREY}
          />
          <Radar
            name="Host Integrity"
            dataKey="value"
            stroke={HOST_SAFFRON}
            fill={HOST_SAFFRON}
            fillOpacity={0.2}
            dot={false}
            isAnimationActive={false}
          />
          {/* Overlay percentage values at each axis */}
          {chartData.map((entry, idx) => (
            <text
              key={entry.drive}
              x={
                170 + 120 * Math.cos((Math.PI / 2) - (2 * Math.PI * idx) / chartData.length)
              }
              y={
                170 - 120 * Math.sin((Math.PI / 2) - (2 * Math.PI * idx) / chartData.length)
              }
              textAnchor="middle"
              fontFamily="monospace"
              fontSize={15}
              fill={HOST_SAFFRON}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {entry.value}%
            </text>
          ))}
        </RadarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default HostRadarChart;
