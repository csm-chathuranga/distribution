import { fmtDate } from '../../utils/format';

const extractSizeMl = (name = '') => {
  if (/1\.5\s*[Ll]/i.test(name)) return 1500;
  if (/(?:^|[^0-9.])1\s*[Ll](?![Ll0-9])/i.test(name)) return 1000;
  const m = name.match(/(\d+(?:\.\d+)?)\s*ml/i);
  return m ? parseFloat(m[1]) : 9999;
};

const sizeLabel = (ml) => {
  if (ml >= 9999) return 'Other';
  if (ml >= 1000) return `${ml / 1000}L`;
  return `${ml}ml`;
};

const shortCode = (sku, name) => {
  if (sku) return sku.length <= 6 ? sku : sku.slice(-4);
  const m = name.match(/([A-Z]{2,4})/);
  return m ? m[1] : name.slice(0, 3).toUpperCase();
};

const fmtCases = (q, caseSize) => {
  if (!caseSize || caseSize <= 1 || !q) return '';
  const cs = Math.floor(q / caseSize);
  if (cs === 0) return '';
  const units = q % caseSize;
  return units > 0 ? `${cs}cs+${units}` : `${cs}cs`;
};

const B = '1px solid #555';
const cell = { border: B, padding: '2px 2px', verticalAlign: 'middle', textAlign: 'center', fontSize: '7.5px', whiteSpace: 'nowrap' };
const hCell = { ...cell, fontWeight: '700', background: '#e5e7eb', fontSize: '7.5px' };
const szCell = { ...hCell, background: '#b6c3d4', fontSize: '8px', padding: '3px 2px' };
const outletCell = { ...cell, textAlign: 'left', fontSize: '7.5px', maxWidth: '26mm', overflowWrap: 'anywhere', whiteSpace: 'normal', padding: '2px 3px' };
const noCell = { ...cell, width: '7mm', fontSize: '7.5px' };
const valCell = { ...cell, textAlign: 'right', fontSize: '7px', minWidth: '12mm' };

export default function LoadingSheetRoutePrint({ sheet, customers = [], products = [], company }) {
  if (!sheet) return null;

  // Loaded qty map: productId → loaded_quantity (from sheet lines)
  const loadedMap = {};
  (sheet.Lines || []).forEach(l => { loadedMap[l.product_id] = parseFloat(l.loaded_quantity) || 0; });

  // Sort all active products by size then name
  const sortedProducts = [...products].sort((a, b) => {
    const d = extractSizeMl(a.name) - extractSizeMl(b.name);
    return d !== 0 ? d : a.name.localeCompare(b.name);
  });

  // Group by size
  const sizeMap = new Map();
  sortedProducts.forEach(p => {
    const ml = extractSizeMl(p.name);
    if (!sizeMap.has(ml)) sizeMap.set(ml, []);
    sizeMap.get(ml).push(p);
  });
  const sizeGroups = [...sizeMap.entries()];

  // Invoice lookup: sold qty, free qty, and total per customer
  // invoiceSold[custId][prodId] = sold qty
  // invoiceFree[custId][prodId] = free qty
  // invoiceTotal[custId] = total amount
  const invoiceSold = {};
  const invoiceFree = {};
  const invoiceTotal = {};

  (sheet.Invoices || [])
    .filter(inv => ['POSTED', 'DELIVERED', 'PAID', 'PARTIAL'].includes(inv.status))
    .forEach(inv => {
      const cid = inv.customer_id;
      if (!invoiceSold[cid]) invoiceSold[cid] = {};
      if (!invoiceFree[cid]) invoiceFree[cid] = {};
      (inv.Lines || []).forEach(il => {
        const pid = il.product_id;
        invoiceSold[cid][pid] = (invoiceSold[cid][pid] || 0) + (parseFloat(il.quantity) || 0);
        invoiceFree[cid][pid] = (invoiceFree[cid][pid] || 0) + (parseFloat(il.free_quantity) || 0);
      });
      invoiceTotal[cid] = (invoiceTotal[cid] || 0) + (parseFloat(inv.total_amount) || 0);
    });

  // Also compute free qty totals per product across all invoices (for loaded row)
  const freeTotalByProduct = {};
  Object.values(invoiceFree).forEach(custMap => {
    Object.entries(custMap).forEach(([pid, qty]) => {
      freeTotalByProduct[pid] = (freeTotalByProduct[pid] || 0) + qty;
    });
  });

  const isClosed = sheet.status === 'CLOSED';

  const footerRows = [
    { label: 'Loaded',  key: 'loaded_quantity',    always: true },
    { label: 'Cases',   key: null,                  always: true,  isCases: true },
    { label: 'Free',    key: null,                  always: true,  isFree: true },
    { label: 'Sold',    key: 'sold_quantity',        always: false },
    { label: 'Return',  key: 'returned_quantity',    always: false },
    { label: 'Damage',  key: 'damaged_quantity',     always: false },
    { label: 'Lost',    key: 'lost_quantity',         always: false },
  ];

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '8px', color: '#000', background: '#fff', padding: '4mm 5mm', width: '100%' }}>

      {/* Company header */}
      <div style={{ textAlign: 'center', marginBottom: '5px' }}>
        <div style={{ fontSize: '13px', fontWeight: '700' }}>{company?.name || 'Lanka Distribution'}</div>
        <div style={{ fontSize: '10px', fontWeight: '700', marginTop: '1px' }}>ROUTE SALES SHEET</div>
      </div>

      {/* Info table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '5px', fontSize: '7.5px' }}>
        <tbody>
          <tr>
            <td style={{ ...hCell, whiteSpace: 'nowrap' }}>Date</td>
            <td style={{ ...cell, minWidth: '22mm' }}>{fmtDate(sheet.sheet_date)}</td>
            <td style={{ ...hCell, whiteSpace: 'nowrap' }}>Sheet No.</td>
            <td style={{ ...cell, minWidth: '18mm' }}>{sheet.sheet_number || '—'}</td>
            <td style={{ ...hCell, whiteSpace: 'nowrap' }}>Route</td>
            <td style={{ ...cell, minWidth: '30mm' }}>{sheet.Route?.name || '—'}</td>
            <td style={{ ...hCell, whiteSpace: 'nowrap' }}>Departure Time</td>
            <td style={{ ...cell, minWidth: '22mm' }}>&nbsp;</td>
            <td style={{ ...hCell, whiteSpace: 'nowrap' }}>Arrival Time</td>
            <td style={{ ...cell, minWidth: '22mm' }}>&nbsp;</td>
          </tr>
          <tr>
            <td style={{ ...hCell, whiteSpace: 'nowrap' }}>Sales Rep</td>
            <td style={cell}>{sheet.SalesRep?.name || '—'}</td>
            <td style={{ ...hCell, whiteSpace: 'nowrap' }}>Driver</td>
            <td style={cell}>{sheet.Driver?.name || '—'}</td>
            <td style={{ ...hCell, whiteSpace: 'nowrap' }}>Vehicle</td>
            <td style={cell}>{sheet.vehicle_number || sheet.Vehicle?.registration_number || '—'}</td>
            <td style={{ ...hCell, whiteSpace: 'nowrap' }}>Status</td>
            <td colSpan={3} style={cell}>{sheet.status}</td>
          </tr>
        </tbody>
      </table>

      {/* Main table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '7mm' }} />
          <col style={{ width: '26mm' }} />
          {sortedProducts.map(p => (
            <col key={p.id} style={{ width: `${Math.max(13, Math.floor(260 / sortedProducts.length))}px` }} />
          ))}
          <col style={{ width: '14mm' }} />
        </colgroup>

        <thead>
          {/* Row 1: size group headers */}
          <tr>
            <td style={{ ...hCell, padding: '3px 2px' }} rowSpan={3}>#</td>
            <td style={{ ...hCell, padding: '3px 2px' }} rowSpan={3}>Name of Outlet</td>
            {sizeGroups.map(([ml, prods]) => (
              <td key={ml} colSpan={prods.length} style={{ ...szCell }}>{sizeLabel(ml)}</td>
            ))}
            <td style={{ ...hCell, padding: '3px 2px' }} rowSpan={3}>Value</td>
          </tr>

          {/* Row 2: short SKU sub-columns */}
          <tr>
            {sortedProducts.map(p => {
              const isLoaded = loadedMap[p.id] > 0;
              return (
                <td key={p.id} style={{ ...hCell, fontSize: '7px', background: isLoaded ? '#93c5fd' : '#d1d5db', padding: '2px 1px' }}>
                  {shortCode(p.sku, p.name)}
                </td>
              );
            })}
          </tr>

          {/* Row 3: loaded qty + free qty as "Ld / Fr" */}
          <tr>
            {sortedProducts.map(p => {
              const loaded = loadedMap[p.id] || 0;
              const free = freeTotalByProduct[p.id] || 0;
              const bg = loaded > 0 ? '#dbeafe' : '#f3f4f6';
              const col = loaded > 0 ? '#1d4ed8' : '#9ca3af';
              return (
                <td key={p.id} style={{ ...cell, fontWeight: '700', fontSize: '7px', background: bg, color: col, padding: '2px 1px', lineHeight: '1.3' }}>
                  {loaded > 0 ? loaded : '—'}
                  {free > 0 && <div style={{ color: '#059669', fontSize: '6.5px', fontWeight: '600' }}>+{free}F</div>}
                </td>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {customers.map((cust, idx) => (
            <tr key={cust.id} style={{ height: '11px' }}>
              <td style={noCell}>{idx + 1}</td>
              <td style={outletCell}>{cust.name}</td>
              {sortedProducts.map(p => {
                const sold = isClosed ? (invoiceSold[cust.id]?.[p.id] || 0) : 0;
                const free = isClosed ? (invoiceFree[cust.id]?.[p.id] || 0) : 0;
                const isLoaded = loadedMap[p.id] > 0;
                return (
                  <td key={p.id} style={{ ...cell, background: isLoaded ? '#fff' : '#f9fafb', padding: '2px 1px', lineHeight: '1.3' }}>
                    {sold > 0 ? sold : ''}
                    {free > 0 && <div style={{ color: '#059669', fontSize: '6.5px', fontWeight: '600' }}>+{free}F</div>}
                  </td>
                );
              })}
              <td style={valCell}>
                {isClosed && invoiceTotal[cust.id] ? invoiceTotal[cust.id].toFixed(2) : ''}
              </td>
            </tr>
          ))}

          {/* Blank rows — always show at least 3 empty rows */}
          {Array.from({ length: Math.max(0, 3 - customers.length) }).map((_, i) => (
            <tr key={`pad${i}`} style={{ height: '11px' }}>
              <td style={noCell}></td>
              <td style={outletCell}></td>
              {sortedProducts.map(p => (
                <td key={p.id} style={{ ...cell, background: loadedMap[p.id] > 0 ? '#fff' : '#f9fafb' }}></td>
              ))}
              <td style={valCell}></td>
            </tr>
          ))}
        </tbody>

        <tfoot>
          {footerRows.map(({ label, key, always, isFree, isCases }) => (
            <tr key={label}>
              <td colSpan={2} style={{ ...hCell, textAlign: 'right', fontSize: '7px' }}>{label}</td>
              {sortedProducts.map(p => {
                let val = '';
                if (isCases) {
                  const loaded = loadedMap[p.id] || 0;
                  const caseSize = p.case_size ? parseInt(p.case_size) : null;
                  val = fmtCases(loaded, caseSize);
                } else if (isFree) {
                  val = freeTotalByProduct[p.id] || '';
                } else {
                  const line = (sheet.Lines || []).find(l => l.product_id === p.id);
                  val = line && (always || isClosed) ? (parseFloat(line[key]) || 0) || '' : '';
                }
                const isLoaded = loadedMap[p.id] > 0;
                const color = label === 'Loaded' ? '#1d4ed8' : label === 'Cases' ? '#6d28d9' : label === 'Free' ? '#059669' : '#000';
                return (
                  <td key={p.id} style={{ ...cell, fontWeight: '600', fontSize: '7px', background: isLoaded ? '#f0f9ff' : '#f9fafb', color }}>
                    {val}
                  </td>
                );
              })}
              <td style={valCell}></td>
            </tr>
          ))}

          {/* Balance row */}
          <tr>
            <td colSpan={2} style={{ ...hCell, textAlign: 'right', fontSize: '7px' }}>Balance</td>
            {sortedProducts.map(p => {
              const l = (sheet.Lines || []).find(ln => ln.product_id === p.id);
              const freeGiven = freeTotalByProduct[p.id] || 0;
              const val = l ? Math.max(0,
                (parseFloat(l.loaded_quantity) || 0) + freeGiven
                - (parseFloat(l.sold_quantity) || 0)
                - (parseFloat(l.returned_quantity) || 0)
                - (parseFloat(l.damaged_quantity) || 0)
                - (parseFloat(l.lost_quantity) || 0)
                - freeGiven
              ) : '';
              return (
                <td key={p.id} style={{ ...cell, fontWeight: '700', fontSize: '7px', background: loadedMap[p.id] > 0 ? '#f0f9ff' : '#f9fafb' }}>
                  {val !== '' ? val : ''}
                </td>
              );
            })}
            <td style={valCell}></td>
          </tr>

          {/* Grand total */}
          {isClosed && (
            <tr>
              <td colSpan={2 + sortedProducts.length} style={{ ...hCell, textAlign: 'right', fontSize: '7.5px' }}>
                Total Value
              </td>
              <td style={{ ...valCell, fontWeight: '700', fontSize: '7.5px' }}>
                {Object.values(invoiceTotal).reduce((s, v) => s + v, 0).toFixed(2)}
              </td>
            </tr>
          )}
        </tfoot>
      </table>

      {/* Signatures */}
      <table style={{ width: '100%', marginTop: '20px', fontSize: '8px', textAlign: 'center' }}>
        <tbody>
          <tr>
            {['Sales Rep / Prepared By', 'Driver Signature', 'Supervisor / Approved By'].map(label => (
              <td key={label} style={{ width: '33%', padding: '0 12px' }}>
                <div style={{ borderTop: '1px solid #333', paddingTop: '4px' }}>{label}</div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
