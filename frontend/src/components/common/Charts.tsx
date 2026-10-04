import React, { useState } from 'react';

// ==================== DONUT / PIE CHART ====================
export interface DonutChartItem {
  label: string;
  value: number;
  color: string;
}

export const DonutChart: React.FC<{
  data: DonutChartItem[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string | number;
}> = ({ data, size = 220, strokeWidth = 32, centerLabel = 'Total', centerValue }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedAngle = 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {total === 0 ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="var(--neutral-200)"
              strokeWidth={strokeWidth}
              fill="none"
            />
          ) : (
            data.map((item, idx) => {
              if (item.value <= 0) return null;
              const ratio = item.value / total;
              const strokeDasharray = `${circumference * ratio} ${circumference * (1 - ratio)}`;
              const strokeDashoffset = -accumulatedAngle;
              accumulatedAngle += circumference * ratio;

              const isHovered = hoveredIndex === idx;

              return (
                <circle
                  key={idx}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={item.color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  fill="none"
                  style={{
                    cursor: 'pointer',
                    transition: 'stroke-width 0.2s ease, filter 0.2s ease',
                    filter: isHovered ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))' : 'none',
                    transform: 'rotate(-90deg)',
                    transformOrigin: '50% 50%',
                  }}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })
          )}
        </svg>

        {/* Center label */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--neutral-900)' }}>
            {hoveredIndex !== null ? data[hoveredIndex].value : centerValue ?? total}
          </span>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase' }}>
            {hoveredIndex !== null ? data[hoveredIndex].label : centerLabel}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', width: '100%' }}>
        {data.map((item, idx) => {
          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
          const isHovered = hoveredIndex === idx;

          return (
            <div
              key={idx}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 8px',
                borderRadius: '6px',
                backgroundColor: isHovered ? 'var(--neutral-100)' : 'transparent',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
            >
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.75rem' }}>
                <span style={{ fontWeight: isHovered ? 600 : 500, color: 'var(--neutral-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.label}
                </span>
                <span style={{ fontWeight: 700, color: 'var(--neutral-900)', marginLeft: '4px' }}>
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ==================== BAR CHART ====================
export interface BarChartItem {
  label: string;
  value: number;
  color?: string;
}

export const BarChart: React.FC<{
  data: BarChartItem[];
  height?: number;
  barColor?: string;
}> = ({ data, height = 200, barColor = 'var(--accent-primary)' }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          height: `${height}px`,
          padding: '16px 8px 0',
          gap: '12px',
          borderBottom: '1px solid var(--neutral-200)',
        }}
      >
        {data.map((item, idx) => {
          const heightPercent = (item.value / maxValue) * 100;
          const isHovered = hoveredIdx === idx;
          const color = item.color || barColor;

          return (
            <div
              key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%',
                justifyContent: 'flex-end',
                position: 'relative',
                cursor: 'pointer',
              }}
            >
              {/* Tooltip */}
              {isHovered && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-32px',
                    backgroundColor: 'var(--neutral-900)',
                    color: '#ffffff',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    zIndex: 10,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  }}
                >
                  {item.value} complaints
                </div>
              )}

              {/* Bar */}
              <div
                style={{
                  width: '100%',
                  maxWidth: '48px',
                  height: `${Math.max(heightPercent, 4)}%`,
                  backgroundColor: color,
                  borderRadius: '6px 6px 0 0',
                  transition: 'all 0.25s ease',
                  opacity: isHovered ? 1 : 0.85,
                  transform: isHovered ? 'scaleY(1.02)' : 'scaleY(1)',
                  transformOrigin: 'bottom',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Labels below bars */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '0 8px' }}>
        {data.map((item, idx) => (
          <div
            key={idx}
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: '0.72rem',
              fontWeight: hoveredIdx === idx ? 700 : 500,
              color: hoveredIdx === idx ? 'var(--neutral-900)' : 'var(--neutral-500)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
};

// ==================== AREA / TREND CHART ====================
export interface TrendPoint {
  label: string;
  value: number;
}

export const AreaTrendChart: React.FC<{
  data: TrendPoint[];
  height?: number;
  lineColor?: string;
  fillColor?: string;
}> = ({
  data,
  height = 180,
  lineColor = 'var(--accent-primary)',
  fillColor = 'rgba(37, 99, 235, 0.1)',
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  if (!data || data.length === 0) return null;

  const width = 500;
  const padding = 24;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const minValue = 0;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * graphWidth;
    const y = padding + graphHeight - ((d.value - minValue) / (maxValue - minValue)) * graphHeight;
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = padding + graphHeight * (1 - ratio);
          return (
            <line
              key={i}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="var(--neutral-200)"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
          );
        })}

        {/* Shaded Area */}
        <path d={areaD} fill={fillColor} />

        {/* Trend Line */}
        <path d={pathD} fill="none" stroke={lineColor} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points */}
        {points.map((p, i) => {
          const isHovered = hoveredPoint === i;
          return (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r={isHovered ? 6 : 4}
                fill="#ffffff"
                stroke={lineColor}
                strokeWidth={2}
                style={{ cursor: 'pointer', transition: 'r 0.2s ease' }}
                onMouseEnter={() => setHoveredPoint(i)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
              {isHovered && (
                <g>
                  <rect
                    x={p.x - 28}
                    y={p.y - 32}
                    width={56}
                    height={22}
                    rx={4}
                    fill="var(--neutral-900)"
                  />
                  <text
                    x={p.x}
                    y={p.y - 17}
                    fill="#ffffff"
                    fontSize={11}
                    fontWeight={600}
                    textAnchor="middle"
                  >
                    {p.value}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* X Axis Labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: `0 ${padding}px`, marginTop: '4px' }}>
        {data.map((d, i) => (
          <span key={i} style={{ fontSize: '0.72rem', color: 'var(--neutral-500)', fontWeight: 500 }}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
};
