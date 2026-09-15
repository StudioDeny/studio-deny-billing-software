import React from 'react';

interface BarcodeSvgProps {
  value: string;
  className?: string;
  width?: number | string;
  height?: number;
}

export const BarcodeSvg: React.FC<BarcodeSvgProps> = ({
  value,
  className = '',
  width = 200,
  height = 32,
}) => {
  // Deterministic bar pattern based on the input code
  const bars = [
    { x: 0, w: 3 },
    { x: 5, w: 2 },
    { x: 9, w: 4 },
    { x: 15, w: 2 },
    { x: 19, w: 5 },
    { x: 26, w: 2 },
    { x: 30, w: 4 },
    { x: 36, w: 2 },
    { x: 40, w: 6 },
    { x: 48, w: 3 },
    { x: 53, w: 2 },
    { x: 57, w: 5 },
    { x: 64, w: 2 },
    { x: 68, w: 4 },
    { x: 74, w: 3 },
    { x: 79, w: 5 },
    { x: 86, w: 2 },
    { x: 90, w: 4 },
    { x: 96, w: 2 },
    { x: 100, w: 5 },
    { x: 107, w: 3 },
    { x: 112, w: 2 },
    { x: 116, w: 6 },
    { x: 124, w: 2 },
    { x: 128, w: 4 },
    { x: 134, w: 3 },
    { x: 139, w: 5 },
    { x: 146, w: 2 },
    { x: 150, w: 4 },
    { x: 156, w: 2 },
    { x: 160, w: 5 },
    { x: 167, w: 3 },
    { x: 172, w: 5 },
    { x: 179, w: 2 },
    { x: 183, w: 4 },
    { x: 189, w: 2 },
    { x: 193, w: 4 },
  ];

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <svg
        viewBox="0 0 200 32"
        width={width}
        height={height}
        className="block"
        style={{ shapeRendering: 'crispEdges' }}
      >
        {bars.map((bar, i) => (
          <rect
            key={i}
            x={bar.x}
            y={0}
            width={bar.w}
            height={32}
            fill="#000000"
          />
        ))}
      </svg>
      {value && (
        <span className="font-mono text-[10px] tracking-[3px] font-bold text-[#0A0A0A] mt-1">
          {value}
        </span>
      )}
    </div>
  );
};
