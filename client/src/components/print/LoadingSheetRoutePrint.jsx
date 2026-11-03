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

const cell = {
  border: '1px solid #333',
  padding: '2px 2px',
  verticalAlign: 'middle',
  textAlign: 'center',
  fontSize: '7px',
  whiteSpace: 'nowrap',
};
const headerCell = { ...cell, fontWeight: '700', background: '#e5e7eb' };
const sizeHeader = { ...headerCell, background: '#d1d5db', fontSize: '7.5px' };
const outletCell = { ...cell, textAlign: 'left', fontSize: '7px', maxWidth: '38mm', overflowWrap: 'anywhere', whiteSpace: 'normal' };

export default function LoadingSheetRoutePrint({ sheet, customers = [], products = [], company }) {
  if (!sheet) return null;

  // Build loaded qty map from sheet lines: productId → loaded_quantity
  const loadedMap = {};
  (sheet.Lines || []).forEach(line => {
    loadedMap[line.product_id] = parseFloat(line.loaded_quantity) || 0;
  });

  // Sort all products by size then name
  const sortedProducts = [...products].sort((a, b) => {
    const diff = extractSizeMl(a.name) - extractSizeMl(b.name);
    return diff !== 0 ? diff : a.name.localeCompare(b.name);
  });

  // Group by size
  const sizeMap = new Map(); // ml → [product, ...]
  sortedProducts.forEach(p => {
    const ml = extractSizeMl(p.name);
    if (!sizeMap.has(ml)) sizeMap.set(ml, []);
    sizeMap.get(ml).push(p);
  });
  const sizeGroups = [...sizeMap.entries()]; // [[ml, [products...]], ...]

  // Build invoice qty lookup: invoiceQty[customerId][productId] = qty
  const invoiceQty = {};
  (sheet.Invoices || [])
    .filter(inv => ['POSTED','DELIVERED','PAID','PARTIAL'].includes(inv.status))
    .forEach(inv => {
      if (!invoiceQty[inv.customer_id]) invoiceQty[inv.customer_id] = {};
      (inv.Lines || []).forEach(il => {
        invoiceQty[inv.customer_id][il.product_id] =
          (invoiceQty[inv.customer_id][il.product_id] || 0) + (parseFloat(il.quantity) || 0);
      });
    });

  const isClosed = sheet.status === 'CLOSED';

  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      fontSize: '7.5px',
      color: '#000',
      background: '#fff',
      padding: '3mm',
      width: '100%',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '5px' }}>
        <div style={{ fontSize: '12px', fontWeight: '700' }}>{company?.name || 'Lanka Distribution'}</div>
        <div style={{ fontSize: '10px', fontWeight: '700', marginTop: '1px' }}>ROUTE SALES SHEET</div>
      </div>

      {/* Sheet info */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '5px', fontSize: '7px' }}>
        <tbody>
          <tr>
            <td style={headerCell}>Sheet No.</td><td style={cell}>{sheet.sheet_number || '—'}</td>
            <td style={headerCell}>Date</td><td style={cell}>{fmtDate(sheet.sheet_date)}</td>
            <td style={headerCell}>Route</td><td style={cell}>{sheet.Route?.name || '—'}</td>
            <td style={headerCell}>Sales Rep</td><td style={cell}>{sheet.SalesRep?.name || '—'}</td>
            <td style={headerCell}>Driver</td><td style={cell}>{sheet.Driver?.name || '—'}</td>
            <td style={headerCell}>Vehicle</td><td style={cell}>{sheet.vehicle_number || '—'}</td>
            <td style={headerCell}>Status</td><td style={cell}>{sheet.status}</td>
          </tr>
        </tbody>
      </table>

      {/* Main table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '5mm' }} />
          <col style={{ width: '35mm' }} />
          {sortedProducts.map(p => <col key={p.id} style={{ width: `${Math.max(8, Math.floor(220 / sortedProducts.length))}px` }} />)}
        </colgroup>
        <thead>
          {/* Size group header */}
          <tr>
            <td style={headerCell} rowSpan={3}>#</td>
            <td style={headerCell} rowSpan={3}>Outlet</td>
            {sizeGroups.map(([ml, prods]) => (
              <td key={ml} colSpan={prods.length} style={sizeHeader}>{sizeLabel(ml)}</td>
            ))}
          </tr>
          {/* SKU row */}
          <tr>
            {sortedProducts.map(p => {
              const isLoaded = loadedMap[p.id] > 0;
              return (
                <td key={p.id} style={{ ...headerCell, fontSize: '6.5px', background: isLoaded ? '#bfdbfe' : '#e5e7eb' }}>
                  {p.sku || '—'}
                </td>
              );
            })}
          </tr>
          {/* Loaded qty row */}
          <tr>
            {sortedProducts.map(p => {
              const loaded = loadedMap[p.id] || 0;
              return (
                <td key={p.id} style={{ ...cell, fontWeight: '700', fontSize: '6.5px', background: loaded > 0 ? '#dbeafe' : '#f9fafb', color: loaded > 0 ? '#1d4ed8' : '#9ca3af' }}>
                  {loaded > 0 ? loaded : '—'}
                </td>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {customers.map((cust, idx) => (
            <tr key={cust.id}>
              <td style={cell}>{idx + 1}</td>
              <td style={outletCell}>{cust.name}</td>
              {sortedProducts.map(p => {
                const q = isClosed ? (invoiceQty[cust.id]?.[p.id] || '') : '';
                const isLoaded = loadedMap[p.id] > 0;
                return (
                  <td key={p.id} style={{ ...cell, background: isLoaded ? '#fff' : '#f9fafb', color: q ? '#000' : undefined }}>
                    {q || ''}
                  </td>
                );
              })}
            </tr>
          ))}
          {/* Pad with empty rows */}
          {customers.length < 4 && Array.from({ length: 4 - customers.length }).map((_, i) => (
            <tr key={`e${i}`}>
              <td style={cell}></td>
              <td style={outletCell}></td>
              {sortedProducts.map(p => <td key={p.id} style={{ ...cell, background: loadedMap[p.id] > 0 ? '#fff' : '#f9fafb' }}></td>)}
            </tr>
          ))}
        </tbody>
        <tfoot>
          {[
            { label: 'Loaded', key: 'loaded_quantity', color: '#1d4ed8' },
            { label: 'Sold',    key: 'sold_quantity',     color: '#000' },
            { label: 'Return',  key: 'returned_quantity', color: '#000' },
            { label: 'Damage',  key: 'damaged_quantity',  color: '#000' },
            { label: 'Lost',    key: 'lost_quantity',     color: '#000' },
          ].map(({ label, key, color }) => (
            <tr key={label}>
              <td colSpan={2} style={{ ...headerCell, textAlign: 'right', fontSize: '6.5px' }}>{label}</td>
              {sortedProducts.map(p => {
                const sheetLine = (sheet.Lines || []).find(l => l.product_id === p.id);
                const val = sheetLine
                  ? (label === 'Loaded' || isClosed ? (parseFloat(sheetLine[key]) || 0) || '' : '')
                  : '';
                return (
                  <td key={p.id} style={{ ...cell, fontWeight: '600', fontSize: '6.5px', color, background: loadedMap[p.id] > 0 ? '#f0f9ff' : '#f9fafb' }}>
                    {val}
                  </td>
                );
              })}
            </tr>
          ))}
          {isClosed && (
            <tr>
              <td colSpan={2} style={{ ...headerCell, textAlign: 'right', fontSize: '6.5px' }}>Balance</td>
              {sortedProducts.map(p => {
                const l = (sheet.Lines || []).find(ln => ln.product_id === p.id);
                const val = l ? Math.max(0,
                  (parseFloat(l.loaded_quantity)||0)-(parseFloat(l.sold_quantity)||0)
                  -(parseFloat(l.returned_quantity)||0)-(parseFloat(l.damaged_quantity)||0)-(parseFloat(l.lost_quantity)||0)
                ) : '';
                return <td key={p.id} style={{ ...cell, fontWeight: '600', fontSize: '6.5px', background: loadedMap[p.id] > 0 ? '#f0f9ff' : '#f9fafb' }}>{val || ''}</td>;
              })}
            </tr>
          )}
        </tfoot>
      </table>

      {/* Signatures */}
      <table style={{ width: '100%', marginTop: '18px', fontSize: '7px', textAlign: 'center' }}>
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
