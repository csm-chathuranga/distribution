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

// Extract short SKU-like abbreviation from product name (last 2–4 non-numeric chars before size)
const shortCode = (sku, name) => {
  if (sku) return sku.length <= 6 ? sku : sku.slice(-4);
  // fallback: take first 2 caps or first 2 letters
  const m = name.match(/([A-Z]{2,4})/);
  return m ? m[1] : name.slice(0, 3).toUpperCase();
};

const B = '1px solid #333';
const cell = { border: B, padding: '1px 1px', verticalAlign: 'middle', textAlign: 'center', fontSize: '6.5px', whiteSpace: 'nowrap' };
const hCell = { ...cell, fontWeight: '700', background: '#e5e7eb' };
const szCell = { ...hCell, background: '#c8d3e0', fontSize: '7px' };
const outletCell = { ...cell, textAlign: 'left', fontSize: '6.5px', maxWidth: '32mm', overflowWrap: 'anywhere', whiteSpace: 'normal', padding: '1px 2px' };
const noCell = { ...cell, width: '6mm' };

export default function LoadingSheetRoutePrint({ sheet, customers = [], products = [], company }) {
  if (!sheet) return null;

  // Loaded qty map: productId → loaded_quantity
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

  // Invoice qty lookup: invoiceQty[customerId][productId] = qty, also total per customer
  const invoiceQty = {};
  const invoiceTotal = {};
  (sheet.Invoices || [])
    .filter(inv => ['POSTED', 'DELIVERED', 'PAID', 'PARTIAL'].includes(inv.status))
    .forEach(inv => {
      if (!invoiceQty[inv.customer_id]) invoiceQty[inv.customer_id] = {};
      (inv.Lines || []).forEach(il => {
        invoiceQty[inv.customer_id][il.product_id] =
          (invoiceQty[inv.customer_id][il.product_id] || 0) + (parseFloat(il.quantity) || 0);
      });
      invoiceTotal[inv.customer_id] = (invoiceTotal[inv.customer_id] || 0) + (parseFloat(inv.total_amount) || 0);
    });

  const isClosed = sheet.status === 'CLOSED';

  // Footer totals per product
  const footerRows = [
    { label: 'Loaded', key: 'loaded_quantity', always: true },
    { label: 'Sold',   key: 'sold_quantity',   always: false },
    { label: 'Return', key: 'returned_quantity',always: false },
    { label: 'Damage', key: 'damaged_quantity', always: false },
    { label: 'Lost',   key: 'lost_quantity',    always: false },
  ];

  const colCount = 2 + sortedProducts.length + 1; // #, Outlet, products, Value

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '7px', color: '#000', background: '#fff', padding: '3mm 4mm', width: '100%' }}>

      {/* Company header */}
      <div style={{ textAlign: 'center', marginBottom: '4px' }}>
        <div style={{ fontSize: '11px', fontWeight: '700' }}>{company?.name || 'Lanka Distribution'}</div>
        <div style={{ fontSize: '9px', fontWeight: '700' }}>ROUTE SALES SHEET</div>
      </div>

      {/* Info row */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4px', fontSize: '6.5px' }}>
        <tbody>
          <tr>
            <td style={hCell}>Date</td>
            <td style={{ ...cell, minWidth: '20mm' }}>{fmtDate(sheet.sheet_date)}</td>
            <td style={hCell}>Sheet No.</td>
            <td style={{ ...cell, minWidth: '16mm' }}>{sheet.sheet_number || '—'}</td>
            <td style={hCell}>Route</td>
            <td style={{ ...cell, minWidth: '28mm' }}>{sheet.Route?.name || '—'}</td>
            <td style={hCell}>Departure Time</td>
            <td style={{ ...cell, minWidth: '20mm' }}>&nbsp;</td>
            <td style={hCell}>Arrival Time</td>
            <td style={{ ...cell, minWidth: '20mm' }}>&nbsp;</td>
          </tr>
          <tr>
            <td style={hCell}>Sales Rep</td>
            <td style={cell}>{sheet.SalesRep?.name || '—'}</td>
            <td style={hCell}>Driver</td>
            <td style={cell}>{sheet.Driver?.name || '—'}</td>
            <td style={hCell}>Vehicle</td>
            <td style={cell}>{sheet.vehicle_number || sheet.Vehicle?.registration_number || '—'}</td>
            <td style={hCell}>Status</td>
            <td colSpan={3} style={cell}>{sheet.status}</td>
          </tr>
        </tbody>
      </table>

      {/* Main table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '7mm' }} />   {/* # */}
          <col style={{ width: '34mm' }} />  {/* Outlet */}
          {sortedProducts.map(p => (
            <col key={p.id} style={{ width: `${Math.max(7, Math.floor(190 / sortedProducts.length))}px` }} />
          ))}
          <col style={{ width: '16mm' }} /> {/* Value */}
        </colgroup>

        <thead>
          {/* Row 1: size group headers */}
          <tr>
            <td style={hCell} rowSpan={3}>#</td>
            <td style={hCell} rowSpan={3}>Name of Outlet</td>
            {sizeGroups.map(([ml, prods]) => (
              <td key={ml} colSpan={prods.length} style={szCell}>{sizeLabel(ml)}</td>
            ))}
            <td style={hCell} rowSpan={3}>Value</td>
          </tr>

          {/* Row 2: short SKU sub-columns */}
          <tr>
            {sortedProducts.map(p => {
              const isLoaded = loadedMap[p.id] > 0;
              return (
                <td key={p.id} style={{ ...hCell, fontSize: '6px', background: isLoaded ? '#bfdbfe' : '#e5e7eb' }}>
                  {shortCode(p.sku, p.name)}
                </td>
              );
            })}
          </tr>

          {/* Row 3: loaded qty */}
          <tr>
            {sortedProducts.map(p => {
              const loaded = loadedMap[p.id] || 0;
              return (
                <td key={p.id} style={{ ...cell, fontWeight: '700', fontSize: '6px', background: loaded > 0 ? '#dbeafe' : '#f9fafb', color: loaded > 0 ? '#1d4ed8' : '#9ca3af' }}>
                  {loaded > 0 ? loaded : '—'}
                </td>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {customers.map((cust, idx) => (
            <tr key={cust.id} style={{ height: '8px' }}>
              <td style={noCell}>{idx + 1}</td>
              <td style={outletCell}>{cust.name}</td>
              {sortedProducts.map(p => {
                const q = isClosed ? (invoiceQty[cust.id]?.[p.id] || '') : '';
                const isLoaded = loadedMap[p.id] > 0;
                return (
                  <td key={p.id} style={{ ...cell, background: isLoaded ? '#fff' : '#fafafa' }}>
                    {q || ''}
                  </td>
                );
              })}
              <td style={{ ...cell, textAlign: 'right', fontSize: '6px' }}>
                {isClosed && invoiceTotal[cust.id] ? invoiceTotal[cust.id].toFixed(2) : ''}
              </td>
            </tr>
          ))}

          {/* Pad with 3 blank rows minimum */}
          {Array.from({ length: Math.max(0, 3 - customers.length) }).map((_, i) => (
            <tr key={`pad${i}`} style={{ height: '8px' }}>
              <td style={noCell}></td>
              <td style={outletCell}></td>
              {sortedProducts.map(p => (
                <td key={p.id} style={{ ...cell, background: loadedMap[p.id] > 0 ? '#fff' : '#fafafa' }}></td>
              ))}
              <td style={cell}></td>
            </tr>
          ))}
        </tbody>

        <tfoot>
          {footerRows.map(({ label, key, always }) => (
            <tr key={label}>
              <td colSpan={2} style={{ ...hCell, textAlign: 'right', fontSize: '6px' }}>{label}</td>
              {sortedProducts.map(p => {
                const line = (sheet.Lines || []).find(l => l.product_id === p.id);
                const val = line && (always || isClosed) ? (parseFloat(line[key]) || 0) || '' : '';
                return (
                  <td key={p.id} style={{ ...cell, fontWeight: '600', fontSize: '6px', background: loadedMap[p.id] > 0 ? '#f0f9ff' : '#fafafa', color: label === 'Loaded' ? '#1d4ed8' : '#000' }}>
                    {val}
                  </td>
                );
              })}
              <td style={cell}></td>
            </tr>
          ))}

          {/* Balance row */}
          <tr>
            <td colSpan={2} style={{ ...hCell, textAlign: 'right', fontSize: '6px' }}>Balance</td>
            {sortedProducts.map(p => {
              const l = (sheet.Lines || []).find(ln => ln.product_id === p.id);
              const val = l ? Math.max(0,
                (parseFloat(l.loaded_quantity) || 0) - (parseFloat(l.sold_quantity) || 0)
                - (parseFloat(l.returned_quantity) || 0) - (parseFloat(l.damaged_quantity) || 0)
                - (parseFloat(l.lost_quantity) || 0)
              ) : '';
              return (
                <td key={p.id} style={{ ...cell, fontWeight: '700', fontSize: '6px', background: loadedMap[p.id] > 0 ? '#f0f9ff' : '#fafafa' }}>
                  {val !== '' && val !== 0 ? val : val === 0 && l ? 0 : ''}
                </td>
              );
            })}
            <td style={cell}></td>
          </tr>

          {/* Grand total row */}
          {isClosed && (
            <tr>
              <td colSpan={2 + sortedProducts.length} style={{ ...hCell, textAlign: 'right', fontSize: '6px' }}>Total Value</td>
              <td style={{ ...cell, fontWeight: '700', fontSize: '6.5px' }}>
                {Object.values(invoiceTotal).reduce((s, v) => s + v, 0).toFixed(2)}
              </td>
            </tr>
          )}
        </tfoot>
      </table>

      {/* Signatures */}
      <table style={{ width: '100%', marginTop: '16px', fontSize: '7px', textAlign: 'center' }}>
        <tbody>
          <tr>
            {['Sales Rep / Prepared By', 'Driver Signature', 'Supervisor / Approved By'].map(label => (
              <td key={label} style={{ width: '33%', padding: '0 10px' }}>
                <div style={{ borderTop: '1px solid #333', paddingTop: '3px' }}>{label}</div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
