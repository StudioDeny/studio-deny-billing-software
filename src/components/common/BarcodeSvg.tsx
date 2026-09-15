import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

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
  const svgRef = useRef<SVGSVGElement>(null);
  const numericWidth = typeof width === 'number' ? width : 200;

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        width: 2,
        height,
        displayValue: false,
        margin: 0,
      });
    } catch {
      // Value has characters CODE128 can't encode (rare) - leave the SVG empty
      // rather than fall back to a fake pattern.
    }
  }, [value, height]);

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <svg ref={svgRef} width={numericWidth} height={height} className="block" />
      {value && (
        <span className="font-mono text-[10px] tracking-[3px] font-bold text-[#0A0A0A] mt-1">
          {value}
        </span>
      )}
    </div>
  );
};
