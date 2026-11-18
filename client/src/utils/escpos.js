/* ESC/POS command builder for 76mm thermal receipts (32 cols normal font) */

const ESC  = '\x1B';
const GS   = '\x1D';
const LF   = '\x0A';
const COLS = 32;

export const C = {
  init:    ESC + '@',
  cut:     GS  + 'V\x42\x00',
  bold:    ESC + 'E\x01',
  boldOff: ESC + 'E\x00',
  center:  ESC + 'a\x01',
  left:    ESC + 'a\x00',
  feed:    (n = 3) => ESC + 'd' + String.fromCharCode(n),
};

function pad(str, len, dir = 'left') {
  const s = String(str ?? '');
  if (dir === 'right') return s.padEnd(len, ' ').slice(0, len);
  return s.padStart(len, ' ').slice(-len);
}

function divider(ch = '-') { return ch.repeat(COLS) + LF; }

// Two-column line (left label, right value) — purely left-aligned
function twoCol(left, right) {
  const r = String(right ?? '');
  const l = String(left  ?? '').slice(0, COLS - r.length);
  return l.padEnd(COLS - r.length) + r + LF;
}

function fmtAmt(val) { return parseFloat(val || 0).toFixed(2); }

function fmtDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ─── Main receipt builder ───────────────────────────────────── */
export function buildInvoiceReceipt(invoice, company) {
  const lines = [...(invoice?.Lines || [])].sort((a, b) => {
    const ml = (n = '') => { const m = n.match(/(\d+(?:\.\d+)?)\s*ml/i); return m ? +m[1] : 9999; };
    return ml(a.Product?.name) - ml(b.Product?.name);
  });
  const returns = invoice?.Order?.Returns || [];
  const sub     = parseFloat(invoice?.subtotal       || 0);
  const total   = parseFloat(invoice?.total_amount   || 0);
  const paid    = parseFloat(invoice?.paid_amount    || 0);
  const balance = parseFloat(invoice?.balance_due    || 0);
  const vat     = parseFloat(invoice?.vat_amount     || 0);
  const disc    = parseFloat(invoice?.discount_amount || 0);
  const typeLabel = invoice?.invoice_type === 'CREDIT_NOTE' ? 'CREDIT NOTE'
                  : invoice?.invoice_type === 'PROFORMA'    ? 'PROFORMA INVOICE'
                  : 'INVOICE';

  const cmds = [C.init];

  /* ── Principal header (centered by printer) ── */
  cmds.push(C.center);
  // Double-height + double-width (0x30) — split across 2 lines to avoid wrap
  cmds.push(C.bold + ESC + '!\x30' + 'MAX BEVERAGES' + ESC + '!\x00' + C.boldOff + LF);
  cmds.push(C.bold + ESC + '!\x30' + '(PVT) LTD'    + ESC + '!\x00' + C.boldOff + LF);
  cmds.push('640/4, Metro Park, Thunandahena,' + LF);
  cmds.push('Korathota, Kaduwela.' + LF);
  cmds.push('Tel: +94 112 054 943' + LF);
  cmds.push('+94 770 139 200' + LF);
  cmds.push('Fax: +94 112 7772 003' + LF);
  cmds.push('maxbeverages.lk' + LF);

  cmds.push(C.left + divider('-'));

  /* ── Distributor (centered) ── */
  cmds.push(C.center);
  cmds.push(C.bold + (company?.name || 'Distribution') + C.boldOff + LF);
  if (company?.address) cmds.push(company.address + LF);
  if (company?.phone)   cmds.push('Tel: ' + company.phone + LF);

  cmds.push(C.left + divider('='));

  /* ── Document number (centered) ── */
  cmds.push(C.center);
  cmds.push(C.bold + typeLabel + C.boldOff + LF);
  cmds.push(C.bold + (invoice?.invoice_number || '') + C.boldOff + LF);

  cmds.push(C.left + divider('-'));

  /* ── Customer info (left-aligned two-col) ── */
  cmds.push(twoCol('Customer:', invoice?.Customer?.name || '-'));
  if (invoice?.Customer?.code) cmds.push(twoCol('Code:', invoice.Customer.code));
  cmds.push(twoCol('Date:', fmtDate(invoice?.invoice_date)));

  /* ── Items header ── */
  cmds.push(divider('-'));
  cmds.push(C.bold + pad('ITEM', 16, 'right') + pad('QTY', 6) + pad('TOTAL', 10) + C.boldOff + LF);
  cmds.push(divider('-'));

  /* ── Items ── */
  for (const line of lines) {
    const freeQty = parseInt(line.free_quantity || 0);
    const name    = (line.Product?.name || `Product #${line.product_id}`).slice(0, COLS);
    cmds.push(C.bold + name + C.boldOff + LF);

    if (parseFloat(line.discount_rate || 0) > 0)
      cmds.push(' '.repeat(16) + pad('Disc ' + line.discount_rate + '%', 16) + LF);
    if (freeQty > 0)
      cmds.push(C.bold + '+' + freeQty + ' free' + C.boldOff + LF);

    // Data row: unit price (left), qty (QTY col), total (TOTAL col)
    const priceLabel = pad(fmtAmt(line.unit_price), 16, 'right');
    cmds.push(priceLabel + pad(parseInt(line.quantity), 6) + pad(fmtAmt(line.line_total), 10) + LF);
  }

  /* ── Returns ── */
  if (returns.length > 0) {
    cmds.push(divider('-'));
    cmds.push(C.bold + 'RETURNS' + C.boldOff + LF);
    for (const r of returns) {
      cmds.push((r.Product?.name || `#${r.product_id}`).slice(0, COLS) + LF);
      if (r.action === 'DEDUCT')
        cmds.push(twoCol('Deducted', '- ' + fmtAmt(parseFloat(r.quantity) * parseFloat(r.unit_price))));
      else
        cmds.push(twoCol('Replaced', 'x' + parseInt(r.quantity)));
    }
  }

  cmds.push(divider('-'));

  /* ── Totals ── */
  const subDisplay = sub > 0 ? sub : lines.reduce((s, l) => s + parseFloat(l.line_total || 0), 0);
  cmds.push(twoCol('Subtotal', fmtAmt(subDisplay)));
  if (disc > 0) cmds.push(twoCol('Discount', '-' + fmtAmt(disc)));
  if (vat  > 0) cmds.push(twoCol('VAT', fmtAmt(vat)));

  cmds.push(divider('-'));
  cmds.push(C.bold + twoCol('TOTAL', 'LKR ' + fmtAmt(total)) + C.boldOff);

  if (paid > 0) cmds.push(twoCol('Paid', fmtAmt(paid)));

  if (balance > 0) {
    cmds.push(divider('-'));
    cmds.push(C.bold + twoCol('BALANCE DUE', 'LKR ' + fmtAmt(balance)) + C.boldOff);
  }

  if (invoice?.notes) {
    cmds.push(divider('-'));
    cmds.push(('Note: ' + invoice.notes).slice(0, COLS) + LF);
  }

  cmds.push(divider('-'));

  /* ── Signatures ── */
  cmds.push(LF);
  const repName = invoice?.SalesRep?.name || '';
  if (repName) cmds.push(repName + LF);
  // Dotted lines for signatures
  cmds.push('.' .repeat(14) + '  ' + '.'.repeat(14) + LF);
  cmds.push(pad('Prepared By', 16, 'right') + pad('Received By', 16) + LF);
  cmds.push(LF);

  /* ── Footer ── */
  cmds.push(C.center);
  cmds.push(new Date().toLocaleString('en-LK') + LF);
  cmds.push('Computer generated' + LF);
  cmds.push(C.left);

  cmds.push(C.feed(4), C.cut);

  return cmds;
}
