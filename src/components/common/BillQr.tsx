import React, { useMemo } from 'react';
import { billQrSvg, BillQrInput } from '../../utils/billQr';

// Full-bill QR (scan with any phone camera to read the whole bill offline).
// Sits alongside the bill-number barcode, which stays for counter scanners.
export const BillQr: React.FC<{ bill: BillQrInput; size?: number }> = ({ bill, size = 170 }) => {
  const svg = useMemo(() => billQrSvg(bill, size), [bill, size]);
  if (!svg) return null;
  return (
    <div className="flex flex-col items-center select-none">
      <div dangerouslySetInnerHTML={{ __html: svg }} />
      <span className="font-mono text-[9px] text-[#4A4844] mt-1 uppercase">Scan for full bill</span>
    </div>
  );
};
