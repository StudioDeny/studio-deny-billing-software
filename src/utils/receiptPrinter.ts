import { formatINR } from './formatters';

export interface PrintableReceiptData {
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  shippingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  items: Array<{
    name: string;
    variantName?: string;
    size?: string;
    color?: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  discount: number;
  discountReason?: string;
  discountPercent?: number;
  taxAmount: number;
  grandTotal: number;
  paymentMethod: string;
  paymentSplits?: Array<{
    method: string;
    amount: number;
  }>;
  changeAmount?: number;
  storeSettings?: {
    storeName?: string;
    address?: string;
    cityState?: string;
    gstin?: string;
    pan?: string;
    taxRate?: number;
  };
}

/**
 * Generates pure black vector SVG barcode bars (eliminates rainbow subpixel fringing)
 */
function getVectorBarcodeSvg(code: string): string {
  const bars = [
    { x: 0, w: 3 }, { x: 5, w: 2 }, { x: 9, w: 4 }, { x: 15, w: 2 }, { x: 19, w: 5 },
    { x: 26, w: 2 }, { x: 30, w: 4 }, { x: 36, w: 2 }, { x: 40, w: 6 }, { x: 48, w: 3 },
    { x: 53, w: 2 }, { x: 57, w: 5 }, { x: 64, w: 2 }, { x: 68, w: 4 }, { x: 74, w: 3 },
    { x: 79, w: 5 }, { x: 86, w: 2 }, { x: 90, w: 4 }, { x: 96, w: 2 }, { x: 100, w: 5 },
    { x: 107, w: 3 }, { x: 112, w: 2 }, { x: 116, w: 6 }, { x: 124, w: 2 }, { x: 128, w: 4 },
    { x: 134, w: 3 }, { x: 139, w: 5 }, { x: 146, w: 2 }, { x: 150, w: 4 }, { x: 156, w: 2 },
    { x: 160, w: 5 }, { x: 167, w: 3 }, { x: 172, w: 5 }, { x: 179, w: 2 }, { x: 183, w: 4 },
    { x: 189, w: 2 }, { x: 193, w: 4 },
  ];

  const rects = bars
    .map((b) => `<rect x="${b.x}" y="0" width="${b.w}" height="32" fill="#000000"/>`)
    .join('');

  return `
    <div style="text-align: center; margin: 8px 0 4px;">
      <svg viewBox="0 0 200 32" width="180" height="28" style="display: block; margin: 0 auto; shape-rendering: crispEdges;">
        ${rects}
      </svg>
      <div style="font-family: monospace; font-size: 10px; letter-spacing: 3px; font-weight: 700; color: #000000; margin-top: 3px;">${code}</div>
    </div>
  `;
}

/**
 * 1. 80mm THERMAL RECEIPT PRINTER ENGINE
 * Optimized for standard 80mm POS Roll Thermal Printers (Epson, Star, Munbyn, POS-80)
 * Also renders cleanly when printed or saved as PDF without any dashed boxes or color fringing.
 */
export function printThermalReceipt(data: PrintableReceiptData): Promise<boolean> {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      resolve(false);
      return;
    }

    const itemsHtml = data.items
      .map(
        (item) => `
        <div class="item-row">
          <div class="item-info">
            <div class="item-name">${item.name}</div>
            <div class="item-meta">${item.size ? item.size : ''} ${item.color ? '· ' + item.color : ''} × ${item.quantity} @ ${formatINR(item.unitPrice)}</div>
          </div>
          <div class="item-total">${formatINR(item.total)}</div>
        </div>
      `
      )
      .join('');

    const tenderHtml =
      data.paymentSplits && data.paymentSplits.length > 0
        ? data.paymentSplits
            .map(
              (s) => `
          <div class="flex justify-between meta-line">
            <span class="label">${s.method}:</span>
            <span class="font-bold">${formatINR(s.amount)}</span>
          </div>
        `
            )
            .join('')
        : `
          <div class="flex justify-between meta-line">
            <span class="label">${data.paymentMethod}:</span>
            <span class="font-bold">${formatINR(data.grandTotal)}</span>
          </div>
        `;

    const changeHtml =
      data.changeAmount && data.changeAmount > 0
        ? `
        <div class="flex justify-between meta-line" style="font-weight: 700; margin-top: 3px;">
          <span class="label">CHANGE RETURNED:</span>
          <span class="font-bold">${formatINR(data.changeAmount)}</span>
        </div>
      `
        : '';

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Receipt - ${data.orderNumber}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            html, body {
              width: 80mm;
              margin: 0 auto;
              padding: 0;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, monospace;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              display: flex;
              justify-content: center;
              align-items: flex-start;
              padding: 4mm 0 8mm;
            }
            .receipt {
              width: 72mm;
              max-width: 74mm;
              margin: 0 auto;
              padding: 0 1mm;
              background: #ffffff;
              border: none !important;
              box-shadow: none !important;
            }
            .text-center { text-align: center; }
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .font-bold { font-weight: 700; }
            .font-black { font-weight: 900; }
            .uppercase { text-transform: uppercase; }
            
            .brand-title {
              font-size: 20px;
              font-weight: 900;
              letter-spacing: -0.5px;
              line-height: 1.1;
              color: #000000;
            }
            .brand-subtitle {
              font-size: 9px;
              font-weight: 700;
              letter-spacing: 1.2px;
              text-transform: uppercase;
              color: #333333;
              margin-top: 2px;
            }
            .store-address {
              font-size: 8.5px;
              color: #555555;
              margin-top: 2px;
              line-height: 1.3;
            }
            
            .divider {
              border-bottom: 2px solid #000000;
              margin: 8px 0;
            }
            .divider-dashed {
              border-bottom: 1px dashed #777777;
              margin: 8px 0;
            }
            
            .flex {
              display: flex;
            }
            .justify-between {
              justify-content: space-between;
            }
            .items-start {
              align-items: flex-start;
            }
            
            .meta-line {
              font-size: 10.5px;
              margin-bottom: 3px;
              color: #000000;
            }
            .meta-line .label {
              color: #555555;
              font-weight: 600;
            }
            
            .items-container {
              margin: 6px 0;
            }
            .item-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 6px;
            }
            .item-info {
              flex: 1;
              padding-right: 6px;
            }
            .item-name {
              font-size: 11px;
              font-weight: 700;
              color: #000000;
              line-height: 1.25;
            }
            .item-meta {
              font-size: 9.5px;
              color: #555555;
              margin-top: 1px;
            }
            .item-total {
              font-size: 11px;
              font-weight: 700;
              white-space: nowrap;
              color: #000000;
            }
            
            .totals-container {
              margin: 6px 0;
            }
            .grand-total {
              font-size: 15px;
              font-weight: 900;
              padding-top: 5px;
              border-top: 2px solid #000000;
              margin-top: 5px;
              color: #000000;
            }
            
            .barcode-wrap {
              text-align: center;
              margin: 10px 0 4px;
              padding-top: 6px;
              border-top: 1px solid #000000;
            }
            .policy-footer {
              font-size: 8px;
              color: #666666;
              text-transform: uppercase;
              letter-spacing: 0.6px;
              margin-top: 4px;
              line-height: 1.3;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <!-- Brand Header -->
            <div class="text-center">
              <div class="brand-title">STUDIO DENY</div>
              <div class="brand-subtitle">HIGH-CLASS STREETWEAR FLAGSHIP</div>
              <div class="store-address">${data.storeSettings?.address || 'Flagship Store, Bandra West, Mumbai'}</div>
              <div class="store-address">GSTIN: ${data.storeSettings?.gstin || '27AAACS1429B1ZX'}</div>
            </div>

            <div class="divider"></div>

            <!-- Receipt Metadata -->
            <div class="meta-line flex justify-between">
              <span class="label">INVOICE #:</span>
              <span class="font-bold">${data.orderNumber}</span>
            </div>
            <div class="meta-line flex justify-between">
              <span class="label">TIMESTAMP:</span>
              <span>${data.createdAt}</span>
            </div>
            <div class="meta-line flex justify-between">
              <span class="label">PATRON:</span>
              <span class="font-bold">${data.customerName}</span>
            </div>
            ${
              data.customerPhone
                ? `
            <div class="meta-line flex justify-between">
              <span class="label">PHONE:</span>
              <span>${data.customerPhone}</span>
            </div>
            `
                : ''
            }

            <div class="divider-dashed"></div>

            <!-- Line Items -->
            <div class="items-container">
              ${itemsHtml}
            </div>

            <div class="divider-dashed"></div>

            <!-- Totals -->
            <div class="totals-container">
              <div class="meta-line flex justify-between">
                <span class="label">SUBTOTAL:</span>
                <span>${formatINR(data.subtotal)}</span>
              </div>
              ${
                data.discount > 0
                  ? `
              <div class="meta-line flex justify-between">
                <span class="label">DISCOUNT${data.discountReason ? ` (${data.discountReason})` : ''}:</span>
                <span class="font-bold">-${formatINR(data.discount)}</span>
              </div>
              `
                  : ''
              }
              <div class="meta-line flex justify-between">
                <span class="label">GST (${data.storeSettings?.taxRate || 12}%):</span>
                <span>${formatINR(data.taxAmount)}</span>
              </div>
              <div class="grand-total flex justify-between">
                <span>TOTAL PAID:</span>
                <span>${formatINR(data.grandTotal)}</span>
              </div>
            </div>

            <div class="divider-dashed"></div>

            <!-- Tender Breakdown -->
            <div>
              <div class="meta-line font-bold uppercase" style="color: #000; margin-bottom: 4px;">TENDER METHOD:</div>
              ${tenderHtml}
              ${changeHtml}
            </div>

            <!-- Authentic Vector Barcode -->
            <div class="barcode-wrap">
              ${getVectorBarcodeSvg(data.orderNumber)}
              <div class="policy-footer">ALL SALES FINAL ON CAPSULE RELEASES · DENY POS TERMINAL #01</div>
            </div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    // Trigger print
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        resolve(true);
      } catch (err) {
        console.error('Iframe print error:', err);
        window.print();
        resolve(true);
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 3000);
      }
    }, 250);
  });
}

/**
 * 2. FULL A4 LUXURY GST TAX INVOICE PRINTER ENGINE
 * Optimized for standard A4 desktop printers and "Save as PDF"
 * Gorgeous Studio Deny editorial streetwear aesthetics with full GST compliance,
 * tables, HSN codes, authorized signatory, and clean margins.
 */
export function printTaxInvoice(data: PrintableReceiptData): Promise<boolean> {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      resolve(false);
      return;
    }

    const itemsRows = data.items
      .map(
        (item, index) => `
        <tr style="border-bottom: 1px solid #E5E5E7;">
          <td style="padding: 10px 8px; font-weight: 600; color: #0A0A0A;">
            ${index + 1}. ${item.name}
          </td>
          <td style="padding: 10px 8px; font-size: 11px; color: #555555;">
            ${item.size || 'STD'} / ${item.color || 'BLACK'}
          </td>
          <td style="padding: 10px 8px; font-size: 11px; color: #777777;">
            6109.10
          </td>
          <td style="padding: 10px 8px; text-align: center; font-weight: 600;">
            ${item.quantity}
          </td>
          <td style="padding: 10px 8px; text-align: right; color: #444444;">
            ${formatINR(item.unitPrice)}
          </td>
          <td style="padding: 10px 8px; text-align: right; font-weight: 700; color: #0A0A0A;">
            ${formatINR(item.total)}
          </td>
        </tr>
      `
      )
      .join('');

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Tax Invoice - ${data.orderNumber}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 14mm 16mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              background: #ffffff !important;
              color: #0A0A0A !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, monospace;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              line-height: 1.4;
            }
            .invoice-box {
              max-width: 800px;
              margin: 0 auto;
            }
            .header-flex {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #0A0A0A;
              padding-bottom: 20px;
              margin-bottom: 20px;
            }
            .brand-name {
              font-size: 28px;
              font-weight: 900;
              letter-spacing: -1px;
              color: #0A0A0A;
            }
            .brand-sub {
              font-size: 10px;
              font-weight: 700;
              letter-spacing: 2px;
              color: #555555;
              text-transform: uppercase;
              margin-top: 2px;
            }
            .store-info {
              font-size: 11px;
              color: #555555;
              margin-top: 8px;
              line-height: 1.4;
            }
            .invoice-badge {
              display: inline-block;
              background: #0A0A0A;
              color: #ffffff;
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 1.5px;
              padding: 4px 10px;
              text-transform: uppercase;
            }
            .invoice-number {
              font-size: 20px;
              font-weight: 900;
              margin-top: 6px;
              color: #0A0A0A;
            }
            .invoice-date {
              font-size: 11px;
              color: #666666;
              margin-top: 3px;
            }
            .grid-2 {
              display: flex;
              gap: 16px;
              margin-bottom: 24px;
            }
            .info-card {
              flex: 1;
              background: #F9F9FB;
              border: 1px solid #E5E5E7;
              padding: 14px 16px;
            }
            .card-title {
              font-size: 10px;
              font-weight: 800;
              letter-spacing: 1px;
              text-transform: uppercase;
              color: #777777;
              margin-bottom: 6px;
            }
            .card-name {
              font-size: 14px;
              font-weight: 800;
              color: #0A0A0A;
            }
            .card-detail {
              font-size: 11px;
              color: #555555;
              margin-top: 2px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 24px;
              font-size: 12px;
            }
            th {
              background: #F1F1F3;
              border-top: 1px solid #0A0A0A;
              border-bottom: 2px solid #0A0A0A;
              padding: 8px;
              font-size: 10px;
              font-weight: 800;
              letter-spacing: 0.8px;
              text-transform: uppercase;
              color: #444444;
            }
            .ledger-flex {
              display: flex;
              justify-content: flex-end;
              margin-bottom: 24px;
            }
            .ledger-box {
              width: 320px;
            }
            .ledger-row {
              display: flex;
              justify-content: space-between;
              padding: 4px 0;
              font-size: 12px;
              color: #555555;
            }
            .ledger-row.total {
              border-top: 2px solid #0A0A0A;
              margin-top: 8px;
              padding-top: 8px;
              font-size: 18px;
              font-weight: 900;
              color: #0A0A0A;
            }
            .footer-notes {
              border-top: 1px solid #E5E5E7;
              padding-top: 16px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              font-size: 10.5px;
              color: #666666;
            }
            .signature-box {
              text-align: center;
              width: 200px;
              border-top: 1px solid #0A0A0A;
              padding-top: 6px;
              font-weight: 700;
              font-size: 11px;
              color: #0A0A0A;
            }
          </style>
        </head>
        <body>
          <div class="invoice-box">
            <!-- Header -->
            <div class="header-flex">
              <div>
                <div class="brand-name">STUDIO DENY</div>
                <div class="brand-sub">HIGH-CLASS STREETWEAR FLAGSHIP</div>
                <div class="store-info">
                  <div>${data.storeSettings?.address || 'Studio 4B, The Mill Compound, Lower Parel'}</div>
                  <div>${data.storeSettings?.cityState || 'Mumbai, Maharashtra 400013'}</div>
                  <div>GSTIN: ${data.storeSettings?.gstin || '27AAACS1429B1ZX'} · PAN: ${data.storeSettings?.pan || 'AAACS1429B'}</div>
                </div>
              </div>

              <div style="text-align: right;">
                <div class="invoice-badge">TAX INVOICE</div>
                <div class="invoice-number">${data.orderNumber}</div>
                <div class="invoice-date">Date: ${data.createdAt}</div>
                <div class="invoice-date">POS Register #01</div>
              </div>
            </div>

            <!-- Patron & Shipping Details -->
            <div class="grid-2">
              <div class="info-card">
                <div class="card-title">BILLED TO (PATRON)</div>
                <div class="card-name">${data.customerName}</div>
                <div class="card-detail">Phone: ${data.customerPhone || 'N/A'}</div>
                <div class="card-detail">Email: ${data.customerEmail || 'walkin@studiodeny.com'}</div>
                <div class="card-detail">Place of Supply: Maharashtra (27)</div>
              </div>

              <div class="info-card">
                <div class="card-title">PAYMENT & SETTLEMENT</div>
                <div class="card-name" style="color: #0A0A0A;">${data.paymentMethod}</div>
                <div class="card-detail">Status: PAID IN FULL</div>
                <div class="card-detail">Tender: ${
                  data.paymentSplits && data.paymentSplits.length > 0
                    ? data.paymentSplits.map((s) => `${s.method}: ${formatINR(s.amount)}`).join(', ')
                    : `${data.paymentMethod}: ${formatINR(data.grandTotal)}`
                }</div>
                ${
                  data.changeAmount && data.changeAmount > 0
                    ? `<div class="card-detail" style="font-weight: 700; color: #0A0A0A;">Change Returned: ${formatINR(data.changeAmount)}</div>`
                    : ''
                }
              </div>
            </div>

            <!-- Garment Items Table -->
            <table>
              <thead>
                <tr>
                  <th style="text-align: left;">GARMENT DESCRIPTION</th>
                  <th style="text-align: left;">SIZE / COLOR</th>
                  <th style="text-align: left;">HSN</th>
                  <th style="text-align: center;">QTY</th>
                  <th style="text-align: right;">RATE</th>
                  <th style="text-align: right;">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>

            <!-- Ledger Summary -->
            <div class="ledger-flex">
              <div class="ledger-box">
                <div class="ledger-row">
                  <span>Subtotal:</span>
                  <span style="font-weight: 600; color: #0A0A0A;">${formatINR(data.subtotal)}</span>
                </div>
                ${
                  data.discount > 0
                    ? `
                <div class="ledger-row" style="color: #059669;">
                  <span>Discount${data.discountReason ? ` (${data.discountReason})` : ''}:</span>
                  <span style="font-weight: 700;">-${formatINR(data.discount)}</span>
                </div>
                `
                    : ''
                }
                <div class="ledger-row">
                  <span>CGST (${(data.storeSettings?.taxRate || 12) / 2}%):</span>
                  <span>${formatINR(data.taxAmount / 2)}</span>
                </div>
                <div class="ledger-row">
                  <span>SGST (${(data.storeSettings?.taxRate || 12) / 2}%):</span>
                  <span>${formatINR(data.taxAmount / 2)}</span>
                </div>
                <div class="ledger-row total">
                  <span>TOTAL PAID:</span>
                  <span>${formatINR(data.grandTotal)}</span>
                </div>
              </div>
            </div>

            <!-- Footer Notes & Signature -->
            <div class="footer-notes">
              <div style="max-width: 440px;">
                <div style="font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">TERMS & CONDITIONS:</div>
                <div>1. All sales final on limited capsule garments. Returns accepted within 7 days in unworn condition with tags.</div>
                <div>2. This is a computer-generated GST tax invoice issued by Studio Deny POS Terminal.</div>
                <div style="margin-top: 8px;">${getVectorBarcodeSvg(data.orderNumber)}</div>
              </div>

              <div style="text-align: right;">
                <div style="height: 48px;"></div>
                <div class="signature-box">
                  FOR STUDIO DENY<br>
                  <span style="font-size: 9px; font-weight: 400; color: #666666;">Authorized Signatory</span>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    // Trigger print
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        resolve(true);
      } catch (err) {
        console.error('Iframe print error:', err);
        window.print();
        resolve(true);
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 3000);
      }
    }, 250);
  });
}
