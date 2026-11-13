import { useState, useRef } from 'react';
import { Printer, FileText, Search } from 'lucide-react';
import { useGetCompanyQuery } from '../../api/reportsApi';
import { useGetUsersQuery } from '../../api/settingsApi';
import { usePermission } from '../../hooks/usePermission';
import { fmtDate, fmtCurrency, today } from '../../utils/format';
import { useSelector } from 'react-redux';
import { selectToken } from '../../store/authSlice';

/* ─── helpers ─────────────────────────────────────────────── */
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
  if (!q) return '—';
  if (!cs || cs <= 1) return String(q);
  const cases = Math.floor(q / cs); const rem = q % cs;
  return cases > 0 ? (rem > 0 ? `${cases}cs+${rem}u` : `${cases}cs`) : `${rem}u`;
};
const fmt = v => fmtCurrency(v || 0);

/* ─── Print layout ─────────────────────────────────────────── */
function SheetPrint({ sheet, date, company, type }) {
  const isDriver = type === 'driver';

  const afterCredit   = sheet.day_sale + sheet.total_collected - sheet.outstanding;
  const afterCheque   = afterCredit - sheet.cheque_total;
  const afterPCash    = afterCheque; // P/Cash not tracked — placeholder
  const afterBank     = afterPCash - sheet.bank_total;
  const excessShort   = sheet.cash_total - afterBank;

  const inventory = [...(sheet.inventory || [])].sort((a, b) => extractMl(a.product_name) - extractMl(b.product_name));
  const sizeGroups = inventory.reduce((acc, p) => {
    const lbl = sizeLabel(extractMl(p.product_name));
    if (!acc[lbl]) acc[lbl] = [];
    acc[lbl].push(p);
    return acc;
  }, {});

  return (
    <div style={{ pageBreakAfter: 'always', fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#111', padding: '8mm 10mm', width: '190mm', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '4px' }}>
        <div style={{ fontSize: '14px', fontWeight: '700' }}>{company?.name || 'Lanka Distribution'}</div>
        <div style={{ fontSize: '11px', fontWeight: '700' }}>
          {isDriver ? 'DRIVER DAILY SHEET' : 'SALES REP DAILY COLLECTION SHEET'}
        </div>
      </div>

      {/* Info */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '5px' }}>
        <tbody>
          <tr>
            <td style={th}>Date</td><td style={{ ...td, minWidth: '25mm' }}>{fmtDate(date)}</td>
            <td style={th}>{isDriver ? 'Driver' : 'Sales Rep'}</td><td style={{ ...td, minWidth: '35mm' }}>{isDriver ? sheet.driver?.name : sheet.sales_rep?.name || '—'}</td>
            <td style={th}>Route</td><td style={{ ...td, minWidth: '28mm' }}>{sheet.route?.name || '—'}</td>
            <td style={th}>Sheet No.</td><td style={{ ...td, minWidth: '18mm' }}>{sheet.sheet_number || '—'}</td>
          </tr>
          <tr>
            <td style={th}>Vehicle</td><td style={td}>{sheet.vehicle?.registration_number || '—'}</td>
            <td style={th}>{isDriver ? 'Sales Rep' : 'Driver'}</td>
            <td style={td}>{isDriver ? sheet.sales_rep?.name : sheet.driver?.name || '—'}</td>
            <td style={th}>Status</td><td colSpan={3} style={td}>{sheet.sheet_status || '—'}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ display: 'flex', gap: '5mm', alignItems: 'flex-start' }}>
        {/* LEFT */}
        <div style={{ flex: '0 0 85mm' }}>
          {/* Day Summary */}
          <div style={{ fontWeight: '700', fontSize: '9.5px', marginBottom: '2px' }}>Day Summary</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '5px' }}>
            <tbody>
              {[
                ['Day Sale',              fmt(sheet.day_sale),                                    true,  false, false],
                ['Credit Collection (+)', fmt(sheet.total_collected),                             false, false, false],
                ['Total',                 fmt(sheet.day_sale + sheet.total_collected),            true,  true,  false],
                ['Credit ( − )',          fmt(sheet.outstanding),                                 false, false, true ],
                ['Total',                 fmt(afterCredit),                                       true,  true,  false],
                ['Cheque ( − )',          sheet.cheque_total > 0 ? fmt(sheet.cheque_total) : '—', false, false, true ],
                ['Total',                 fmt(afterCheque),                                       true,  true,  false],
                ['P/Cash ( + )',          '—',                                                    false, false, true ],
                ['Total',                 fmt(afterPCash),                                        true,  true,  false],
                ['Bank Deposit ( − )',    sheet.bank_total > 0   ? fmt(sheet.bank_total)   : '—', false, false, true ],
                ['Total',                 fmt(afterBank),                                         true,  true,  false],
                ['Cash',                  fmt(sheet.cash_total),                                  true,  false, false],
                ['Excess / Short',        fmt(excessShort),                                       true,  true,  false],
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
                <th style={{ ...th, width: '20%' }}>Size</th>
                <th style={{ ...th, width: '13%', textAlign: 'center' }}>Loaded</th>
                <th style={{ ...th, width: '13%', textAlign: 'center' }}>Sold</th>
                <th style={{ ...th, width: '13%', textAlign: 'center' }}>Return</th>
                <th style={{ ...th, width: '13%', textAlign: 'center' }}>Damage</th>
                <th style={{ ...th, width: '13%', textAlign: 'center' }}>Lost</th>
                <th style={{ ...th, width: '15%', textAlign: 'center' }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(sizeGroups).map(([lbl, prods]) =>
                prods.map((p, i) => {
                  const cs = parseInt(p.case_size) || 0;
                  const bal = p.loaded - p.sold - p.returned - p.damaged - p.lost;
                  return (
                    <tr key={p.product_id}>
                      {i === 0 && <td style={{ ...td, fontWeight: '600' }} rowSpan={prods.length}>{lbl}</td>}
                      <td style={tdC}>{fmtCs(p.loaded, cs)}</td>
                      <td style={tdC}>{p.sold     > 0 ? fmtCs(p.sold, cs)     : '—'}</td>
                      <td style={tdC}>{p.returned > 0 ? fmtCs(p.returned, cs) : '—'}</td>
                      <td style={tdC}>{p.damaged  > 0 ? fmtCs(p.damaged, cs)  : '—'}</td>
                      <td style={tdC}>{p.lost     > 0 ? fmtCs(p.lost, cs)     : '—'}</td>
                      <td style={{ ...tdC, fontWeight: '600' }}>{bal > 0 ? fmtCs(bal, cs) : '0'}</td>
                    </tr>
                  );
                })
              )}
              {inventory.length === 0 && <tr><td colSpan={7} style={{ ...tdC, color: '#999' }}>No inventory data</td></tr>}
            </tbody>
          </table>

          {/* Vehicle log */}
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

        {/* RIGHT */}
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
              {!(sheet.credit_bill || []).length && <tr><td colSpan={4} style={{ ...tdC, color: '#999' }}>No invoices</td></tr>}
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
                  {(sheet.cheques || []).map((ch, i) => (
                    <tr key={i}>
                      <td style={td}>{ch.cheque_number}</td>
                      <td style={td}>{ch.customer_name}</td>
                      <td style={td}>{ch.bank_name || '—'}</td>
                      <td style={tdR}>{fmt(ch.amount)}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: B }}>
                    <td colSpan={3} style={{ ...td, fontWeight: '700' }}>Total Cheques</td>
                    <td style={{ ...tdR, fontWeight: '700' }}>{fmt((sheet.cheques || []).reduce((s, ch) => s + ch.amount, 0))}</td>
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
            {[isDriver ? 'Driver Signature' : 'Sales Rep / Prepared By', 'Supervisor / Approved By'].map(lbl => (
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

/* ─── Page ─────────────────────────────────────────────────── */
export default function DailySheet() {
  const canViewAll = usePermission('sales.view_all');
  const canUsers   = usePermission('settings.users');
  const token      = useSelector(selectToken);

  const [date,      setDate]      = useState(today());
  const [repId,     setRepId]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [sheetData, setSheetData] = useState(null);
  const [printType, setPrintType] = useState('rep');
  const printRef = useRef(null);

  const { data: company }   = useGetCompanyQuery();
  const { data: usersData } = useGetUsersQuery({ limit: 200 }, { skip: !canUsers });
  const salesReps = usersData?.data || [];

  const handleFetch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date });
      if (repId) params.set('sales_rep_id', repId);
      const res = await fetch(`/api/reports/daily-collections-print?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setSheetData(json);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const doPrint = (type) => {
    if (!sheetData?.sheets?.length) return;
    setPrintType(type);
    setTimeout(() => {
      const w = window.open('', '_blank');
      w.document.write(`<!DOCTYPE html><html><head><title>Daily Sheet</title><style>
        @page{size:A4 portrait;margin:0}body{margin:0}
        @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
      </style></head><body>${printRef.current?.innerHTML || ''}</body></html>`);
      w.document.close(); w.focus();
      setTimeout(() => { w.print(); w.close(); }, 400);
    }, 100);
  };

  return (
    <div className="space-y-5 pb-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Daily Sheet</h1>
        <p className="text-sm text-gray-500">Generate Sales Rep or Driver daily collection sheet for printing</p>
      </div>

      {/* Controls */}
      <div className="card p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sales Rep / Driver</label>
            <select value={repId} onChange={e => setRepId(e.target.value)} className="input w-full">
              <option value="">— Select user —</option>
              {salesReps.map(u => <option key={u.id} value={u.id}>{u.name} ({u.Role?.display_name || u.role})</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleFetch}
              disabled={!repId || loading}
              className="btn btn-primary w-full flex items-center justify-center gap-2"
            >
              <Search size={16} />
              {loading ? 'Loading…' : 'Generate'}
            </button>
          </div>
        </div>
      </div>

      {/* Result */}
      {sheetData && (
        <>
          {!sheetData.sheets?.length ? (
            <div className="card p-10 text-center">
              <FileText size={36} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-500 font-medium">No loading sheet found for this date and user</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {sheetData.sheets[0]?.sales_rep?.name} — {fmtDate(sheetData.date)}
                  </p>
                  <p className="text-xs text-gray-400">Route: {sheetData.sheets[0]?.route?.name || '—'} · Sheet: {sheetData.sheets[0]?.sheet_number || '—'}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => doPrint('rep')} className="btn btn-primary flex items-center gap-2">
                    <Printer size={15} /> Print Rep Sheet
                  </button>
                  <button onClick={() => doPrint('driver')} className="btn-secondary flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium">
                    <Printer size={15} /> Print Driver Sheet
                  </button>
                </div>
              </div>

              {/* Summary cards */}
              {sheetData.sheets.map(s => (
                <div key={s.sheet_id} className="card p-4 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    {[
                      ['Day Sale', s.day_sale],
                      ['Collected', s.total_collected],
                      ['Cash', s.cash_total],
                      ['Outstanding', s.outstanding],
                    ].map(([lbl, val]) => (
                      <div key={lbl} className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">{lbl}</p>
                        <p className="font-bold text-gray-900 mt-0.5">{fmt(val)}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">{s.credit_bill?.length || 0} customers · {s.inventory?.length || 0} products loaded · {s.cheques?.length || 0} cheques</p>

                  {/* Cheques collected */}
                  {s.cheques?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-1.5">Cheques Collected</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="border border-gray-200 px-2 py-1 text-left">Cheque #</th>
                              <th className="border border-gray-200 px-2 py-1 text-left">Customer</th>
                              <th className="border border-gray-200 px-2 py-1 text-left">Bank</th>
                              <th className="border border-gray-200 px-2 py-1 text-left">Cheque Date</th>
                              <th className="border border-gray-200 px-2 py-1 text-right">Amount</th>
                              <th className="border border-gray-200 px-2 py-1 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {s.cheques.map(ch => (
                              <tr key={ch.id}>
                                <td className="border border-gray-100 px-2 py-1 font-mono">{ch.cheque_number}</td>
                                <td className="border border-gray-100 px-2 py-1">{ch.customer_name}</td>
                                <td className="border border-gray-100 px-2 py-1 text-gray-500">{ch.bank_name || '—'}</td>
                                <td className="border border-gray-100 px-2 py-1">{fmtDate(ch.cheque_date)}</td>
                                <td className="border border-gray-100 px-2 py-1 text-right font-semibold text-emerald-700">{fmt(ch.amount)}</td>
                                <td className="border border-gray-100 px-2 py-1 text-center">
                                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${ch.status === 'CLEARED' ? 'bg-green-100 text-green-700' : ch.status === 'BOUNCED' ? 'bg-red-100 text-red-700' : ch.status === 'DEPOSITED' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {ch.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                            <tr className="border-t-2 border-gray-300 font-semibold">
                              <td colSpan={4} className="border border-gray-100 px-2 py-1">Total</td>
                              <td className="border border-gray-100 px-2 py-1 text-right text-emerald-700">{fmt(s.cheques.reduce((sum, ch) => sum + ch.amount, 0))}</td>
                              <td className="border border-gray-100 px-2 py-1" />
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Hidden print area — renders both types; doPrint opens the right one */}
              <div ref={printRef} style={{ display: 'none' }}>
                {sheetData.sheets.map(s => (
                  <SheetPrint key={s.sheet_id} sheet={s} date={sheetData.date} company={company} type={printType} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
