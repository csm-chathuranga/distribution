import { useState, useRef, useEffect } from 'react';
import { CalendarDays, Printer, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectToken } from '../../store/authSlice';
import { useGetCompanyQuery } from '../../api/reportsApi';
import { fmtDate, today } from '../../utils/format';

/* ─── Print styles ───────────────────────────────────────────── */
const B  = '1px solid #333';
const BL = '1px solid #bbb';
const th = { border: B, padding: '3px 5px', background: '#e5e7eb', fontWeight: '700', fontSize: '9px', textAlign: 'left', whiteSpace: 'nowrap' };
const td = { border: BL, padding: '3px 5px', fontSize: '9px' };
const tdR = { ...td, textAlign: 'right' };
const tdC = { ...td, textAlign: 'center' };

const extractMl = (name = '') => {
  if (/1\.5\s*[Ll]/i.test(name)) return 1500;
  if (/(?:^|[^0-9.])1\s*[Ll](?![Ll0-9])/i.test(name)) return 1000;
  const m = name.match(/(\d+(?:\.\d+)?)\s*ml/i);
  return m ? parseFloat(m[1]) : 9999;
};
const sizeLabel = ml => ml >= 9999 ? 'Other' : ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`;
const fmtCs = (q, cs) => {
  if (!q) return '';
  if (!cs || cs <= 1) return String(q);
  const cases = Math.floor(q / cs); const rem = q % cs;
  return cases > 0 ? (rem > 0 ? `${cases}cs+${rem}u` : `${cases}cs`) : `${rem}u`;
};
const fmt = v => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ─── Sheet print component ──────────────────────────────────── */
function SheetPrint({ sheet, date, company }) {
  const afterCredit = sheet.day_sale + sheet.total_collected - sheet.outstanding;
  const afterCheque = afterCredit - sheet.cheque_total;
  const afterBank   = afterCheque - sheet.bank_total;
  const excessShort = sheet.cash_total - afterBank;

  const inventory = [...(sheet.inventory || [])].sort((a, b) => extractMl(a.product_name) - extractMl(b.product_name));
  const sizeGroups = inventory.reduce((acc, p) => {
    const lbl = sizeLabel(extractMl(p.product_name));
    if (!acc[lbl]) acc[lbl] = [];
    acc[lbl].push(p);
    return acc;
  }, {});

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#111', padding: '8mm 10mm', width: '190mm', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '4px' }}>
        <div style={{ fontSize: '14px', fontWeight: '700' }}>{company?.name || 'Lanka Distribution'}</div>
        <div style={{ fontSize: '11px', fontWeight: '700' }}>DRIVER DAILY SHEET</div>
      </div>

      {/* Info rows */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '5px' }}>
        <tbody>
          <tr>
            <td style={th}>Date</td><td style={{ ...td, minWidth: '25mm' }}>{fmtDate(date)}</td>
            <td style={th}>Driver</td><td style={{ ...td, minWidth: '35mm' }}>{sheet.driver?.name || '—'}</td>
            <td style={th}>Route</td><td style={{ ...td, minWidth: '28mm' }}>{sheet.route?.name || '—'}</td>
            <td style={th}>Sheet No.</td><td style={{ ...td, minWidth: '18mm' }}>{sheet.sheet_number || '—'}</td>
          </tr>
          <tr>
            <td style={th}>Vehicle</td><td style={td}>{sheet.vehicle?.registration_number || '—'}</td>
            <td style={th}>Sales Rep</td><td style={td}>{sheet.sales_rep?.name || '—'}</td>
            <td style={th}>Status</td><td colSpan={3} style={td}>{sheet.sheet_status || '—'}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ display: 'flex', gap: '5mm', alignItems: 'flex-start' }}>
        {/* LEFT column */}
        <div style={{ flex: '0 0 85mm' }}>
          {/* Day Summary */}
          <div style={{ fontWeight: '700', fontSize: '9.5px', marginBottom: '2px' }}>Day Summary</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '5px' }}>
            <tbody>
              {[
                ['Day Sale',              fmt(sheet.day_sale),              true,  false, false],
                ['Credit Collection (+)', fmt(sheet.total_collected),       false, false, false],
                ['Total',                 fmt(sheet.day_sale + sheet.total_collected), true, true, false],
                ['Credit ( − )',          fmt(sheet.outstanding),           false, false, true ],
                ['Total',                 fmt(afterCredit),                 true,  true,  false],
                ['Cheque ( − )',          sheet.cheque_total > 0 ? fmt(sheet.cheque_total) : '—', false, false, true],
                ['Total',                 fmt(afterCheque),                 true,  true,  false],
                ['P/Cash ( + )',          '—',                              false, false, true ],
                ['Total',                 fmt(afterCheque),                 true,  true,  false],
                ['Bank Deposit ( − )',    sheet.bank_total > 0 ? fmt(sheet.bank_total) : '—', false, false, true],
                ['Total',                 fmt(afterBank),                   true,  true,  false],
                ['Cash',                  fmt(sheet.cash_total),            true,  false, false],
                ['Excess / Short',        fmt(excessShort),                 true,  true,  false],
              ].map(([lbl, val, bold, bTop, indent], i) => (
                <tr key={i} style={bTop ? { borderTop: B } : {}}>
                  <td style={{ ...td, paddingLeft: indent ? 14 : 5, fontWeight: bold ? '700' : '400', width: '58%' }}>{lbl}</td>
                  <td style={{ ...tdR, fontWeight: bold ? '700' : '400' }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Inventory Stock */}
          <div style={{ fontWeight: '700', fontSize: '9.5px', marginBottom: '2px' }}>Inventory Stock</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '5px' }}>
            <thead>
              <tr>
                <th style={{ ...th, width: '14%' }}>Size</th>
                <th style={{ ...th, width: '20%' }}>Item</th>
                <th style={{ ...th, width: '13%', textAlign: 'center' }}>Loaded</th>
                <th style={{ ...th, width: '13%', textAlign: 'center' }}>Sold</th>
                <th style={{ ...th, width: '13%', textAlign: 'center' }}>Return</th>
                <th style={{ ...th, width: '13%', textAlign: 'center' }}>Damage</th>
                <th style={{ ...th, width: '13%', textAlign: 'center' }}>Lost</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(sizeGroups).map(([lbl, prods]) =>
                prods.map((p, i) => {
                  const cs = parseInt(p.case_size) || 0;
                  return (
                    <tr key={p.product_id}>
                      {i === 0 && <td style={{ ...td, fontWeight: '600' }} rowSpan={prods.length}>{lbl}</td>}
                      <td style={{ ...td, fontSize: '8px' }}>{p.short_code || ''}</td>
                      <td style={tdC}>{fmtCs(p.loaded, cs)}</td>
                      <td style={tdC}>{p.sold     > 0 ? fmtCs(p.sold, cs)     : ''}</td>
                      <td style={tdC}>{p.returned > 0 ? fmtCs(p.returned, cs) : ''}</td>
                      <td style={tdC}>{p.damaged  > 0 ? fmtCs(p.damaged, cs)  : ''}</td>
                      <td style={tdC}>{p.lost     > 0 ? fmtCs(p.lost, cs)     : ''}</td>
                    </tr>
                  );
                })
              )}
              {inventory.length === 0 && (
                <tr><td colSpan={7} style={{ ...tdC, color: '#999' }}>No inventory data</td></tr>
              )}
            </tbody>
          </table>

          {/* Vehicle Log */}
          <div style={{ fontWeight: '700', fontSize: '9.5px', marginBottom: '2px' }}>Vehicle Log</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {['Open Km', 'Close Km', 'Day Km', 'Fuel (L)'].map(lbl => (
                <tr key={lbl}>
                  <td style={{ ...td, width: '50%', fontWeight: '600' }}>{lbl}</td>
                  <td style={td}>&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* RIGHT column */}
        <div style={{ flex: 1 }}>
          {/* Credit Bill */}
          <div style={{ fontWeight: '700', fontSize: '9.5px', marginBottom: '2px' }}>Credit Bill</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '5px' }}>
            <thead>
              <tr>
                <th style={{ ...th, width: '38%' }}>Customer</th>
                <th style={{ ...th, width: '20%', textAlign: 'right' }}>Invoice</th>
                <th style={{ ...th, width: '20%', textAlign: 'right' }}>Collected</th>
                <th style={{ ...th, width: '22%', textAlign: 'right' }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {(sheet.credit_bill || []).map((cb, i) => (
                <tr key={i}>
                  <td style={td}>{cb.customer_name}</td>
                  <td style={tdR}>{fmt(cb.invoice_total)}</td>
                  <td style={{ ...tdR, color: '#059669', fontWeight: '600' }}>{cb.collected > 0 ? fmt(cb.collected) : '—'}</td>
                  <td style={{ ...tdR, color: cb.balance > 0 ? '#dc2626' : '#111' }}>{cb.balance > 0 ? fmt(cb.balance) : '—'}</td>
                </tr>
              ))}
              {!(sheet.credit_bill || []).length && (
                <tr><td colSpan={4} style={{ ...tdC, color: '#999' }}>No invoices</td></tr>
              )}
              <tr style={{ borderTop: B }}>
                <td style={{ ...td, fontWeight: '700' }}>Total</td>
                <td style={{ ...tdR, fontWeight: '700' }}>{fmt((sheet.credit_bill || []).reduce((s, c) => s + c.invoice_total, 0))}</td>
                <td style={{ ...tdR, fontWeight: '700', color: '#059669' }}>{fmt(sheet.total_collected)}</td>
                <td style={{ ...tdR, fontWeight: '700', color: '#dc2626' }}>{fmt(sheet.outstanding)}</td>
              </tr>
            </tbody>
          </table>

          {/* Cheques */}
          {(sheet.cheques || []).length > 0 && (
            <>
              <div style={{ fontWeight: '700', fontSize: '9.5px', marginBottom: '2px', marginTop: '5px' }}>Cheques Collected</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '5px' }}>
                <thead>
                  <tr>
                    <th style={{ ...th, width: '22%' }}>Cheque #</th>
                    <th style={{ ...th, width: '30%' }}>Customer</th>
                    <th style={{ ...th, width: '24%' }}>Bank</th>
                    <th style={{ ...th, width: '24%', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.cheques.map((ch, i) => (
                    <tr key={i}>
                      <td style={td}>{ch.cheque_number}</td>
                      <td style={td}>{ch.customer_name}</td>
                      <td style={td}>{ch.bank_name || '—'}</td>
                      <td style={tdR}>{fmt(ch.amount)}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: B }}>
                    <td colSpan={3} style={{ ...td, fontWeight: '700' }}>Total Cheques</td>
                    <td style={{ ...tdR, fontWeight: '700' }}>{fmt(sheet.cheques.reduce((s, ch) => s + ch.amount, 0))}</td>
                  </tr>
                </tbody>
              </table>
            </>
          )}

          {/* Cash denomination */}
          <div style={{ fontWeight: '700', fontSize: '9.5px', marginBottom: '2px' }}>Cash</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Denomination</th>
                <th style={{ ...th, textAlign: 'center' }}>Count</th>
                <th style={{ ...th, textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {['5000 ×', '2000 ×', '1000 ×', '500 ×', '100 ×', '50 ×', '20 ×', 'Coins'].map(d => (
                <tr key={d}><td style={td}>{d}</td><td style={tdC}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td><td style={tdR}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td></tr>
              ))}
              <tr style={{ borderTop: B }}>
                <td colSpan={2} style={{ ...td, fontWeight: '700' }}>Total Cash</td>
                <td style={{ ...tdR, fontWeight: '700' }}>{fmt(sheet.cash_total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Signatures */}
      <table style={{ width: '100%', marginTop: '10mm', fontSize: '8px', textAlign: 'center' }}>
        <tbody>
          <tr>
            {['Driver Signature', 'Supervisor / Approved By'].map(lbl => (
              <td key={lbl} style={{ width: '50%', padding: '0 15mm' }}>
                <div style={{ borderTop: B, paddingTop: '3px' }}>{lbl}</div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ─── Date navigator ─────────────────────────────────────────── */
function DateNav({ date, onChange }) {
  const isToday = date === today();
  const shift = (days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    onChange(d.toISOString().slice(0, 10));
  };
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => shift(-1)} className="p-2 rounded-xl bg-gray-100 active:bg-gray-200">
        <ChevronLeft size={16} className="text-gray-600" />
      </button>
      <input
        type="date"
        value={date}
        max={today()}
        onChange={e => onChange(e.target.value)}
        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-300 text-center"
      />
      <button onClick={() => shift(1)} disabled={isToday} className="p-2 rounded-xl bg-gray-100 active:bg-gray-200 disabled:opacity-30">
        <ChevronRight size={16} className="text-gray-600" />
      </button>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function DriverDailySheet() {
  const token = useSelector(selectToken);
  const [date, setDate] = useState(today());
  const [loading, setLoading] = useState(false);
  const [sheet, setSheet] = useState(null);
  const printRef = useRef(null);

  const { data: company } = useGetCompanyQuery();

  const fetchSheet = async (d) => {
    setLoading(true);
    setSheet(null);
    try {
      const res = await fetch(`/api/reports/daily-collections-print?date=${d}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setSheet(json.sheets?.[0] ?? null);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSheet(date); }, [date]);

  const handlePrint = () => {
    if (!printRef.current) return;
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>Driver Daily Sheet</title><style>
      @page{size:A4 portrait;margin:0}body{margin:0}
      @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    </style></head><body>${printRef.current.innerHTML}</body></html>`);
    w.document.close(); w.focus();
    setTimeout(() => { w.print(); w.close(); }, 400);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header bar */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-sky-500" />
            <span className="text-xs font-semibold text-sky-600 uppercase tracking-wide">Daily Sheet</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchSheet(date)}
              disabled={loading}
              className="p-2 rounded-xl bg-gray-100 active:bg-gray-200 disabled:opacity-40"
            >
              <RefreshCw size={15} className={`text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handlePrint}
              disabled={!sheet || loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 active:opacity-80"
              style={{ background: '#0ea5e9' }}
            >
              <Printer size={14} /> Print
            </button>
          </div>
        </div>
        <DateNav date={date} onChange={setDate} />
      </div>

      {/* Content */}
      <div className="px-4 pt-4">
        {loading && (
          <div className="flex justify-center pt-20">
            <div className="w-7 h-7 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && !sheet && (
          <div className="flex flex-col items-center justify-center gap-3 pt-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
              <CalendarDays size={28} className="text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm">No sheet found for {fmtDate(date)}.</p>
          </div>
        )}

        {!loading && sheet && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
            <div ref={printRef}>
              <SheetPrint sheet={sheet} date={date} company={company} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
