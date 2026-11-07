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

const shortCode = (product) => {
  if (product.short_code) return product.short_code;
  const { sku, name } = product;
  if (sku) return sku.length <= 6 ? sku : sku.slice(-4);
  const m = name.match(/([A-Z]{2,4})/);
  return m ? m[1] : name.slice(0, 3).toUpperCase();
};

const fmtCases = (q, caseSize) => {
  if (!caseSize || caseSize <= 1 || !q) return '';
  const cs = Math.floor(q / caseSize);
  const units = q % caseSize;
  if (cs === 0) return `${units}u`;
  return units > 0 ? `${cs}cs+${units}u` : `${cs}cs`;
};

const B = '1px solid #555';
const cell = { border: B, padding: '2px 3px', verticalAlign: 'middle', textAlign: 'center', fontSize: '9px', whiteSpace: 'nowrap' };
const hCell = { ...cell, fontWeight: '700', background: '#e5e7eb', fontSize: '9px' };
const szCell = { ...hCell, background: '#b6c3d4', fontSize: '9.5px', padding: '3px 2px' };
const outletCell = { ...cell, textAlign: 'left', fontSize: '9px', maxWidth: '26mm', overflowWrap: 'anywhere', whiteSpace: 'normal', padding: '2px 3px' };
const noCell = { ...cell, width: '20mm', fontSize: '8px', textAlign: 'left', padding: '2px 3px' };

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

  const invoicedCustomerIds = new Set();
  const invoiceNumberMap = {};
  (sheet.Invoices || [])
    .filter(inv => ['POSTED', 'DELIVERED', 'PAID', 'PARTIAL'].includes(inv.status))
    .forEach(inv => {
      const cid = inv.customer_id;
      invoicedCustomerIds.add(cid);
      invoiceNumberMap[cid] = inv.invoice_number;
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
    { label: 'Free',    key: null,                  always: true,  isFree: true },
    { label: 'Sold',    key: 'sold_quantity',        always: false },
    { label: 'Return',  key: 'returned_quantity',    always: false },
    { label: 'Damage',  key: 'damaged_quantity',     always: false },
    { label: 'Lost',    key: 'lost_quantity',         always: false },
  ];

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#000', background: '#fff', padding: '4mm 5mm', width: '100%' }}>

      {/* Company header */}
      <div style={{ textAlign: 'center', marginBottom: '5px' }}>
        <div style={{ fontSize: '15px', fontWeight: '700' }}>{company?.name || 'Lanka Distribution'}</div>
        <div style={{ fontSize: '11px', fontWeight: '700', marginTop: '1px' }}>ROUTE SALES SHEET</div>
      </div>

      {/* Info table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '5px', fontSize: '9px' }}>
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
          <col style={{ width: '20mm' }} />
          <col style={{ width: '26mm' }} />
          {sortedProducts.map(p => (
            <col key={p.id} style={{ width: `${Math.max(13, Math.floor(260 / sortedProducts.length))}px` }} />
          ))}
        </colgroup>

        <thead>
          {/* Row 1: size group headers */}
          <tr>
            <td style={{ ...hCell, padding: '3px 2px' }} rowSpan={2}>Invoice</td>
            <td style={{ ...hCell, padding: '3px 2px' }} rowSpan={2}>Name of Outlet</td>
            {sizeGroups.map(([ml, prods]) => (
              <td key={ml} colSpan={prods.length} style={{ ...szCell }}>{sizeLabel(ml)}</td>
            ))}
          </tr>

          {/* Row 2: short code sub-columns */}
          <tr>
            {sortedProducts.map(p => {
              const isLoaded = loadedMap[p.id] > 0;
              return (
                <td key={p.id} style={{ ...hCell, fontSize: '8.5px', background: isLoaded ? '#93c5fd' : '#d1d5db', padding: '2px 1px' }}>
                  {shortCode(p)}
                </td>
              );
            })}
          </tr>

        </thead>

        <tbody>
          {customers.filter(c => invoicedCustomerIds.has(c.id)).map((cust, idx) => (
            <tr key={cust.id} style={{ height: '11px' }}>
              <td style={noCell}>{invoiceNumberMap[cust.id] || '—'}</td>
              <td style={outletCell}>{cust.name}</td>
              {sortedProducts.map(p => {
                const sold = invoiceSold[cust.id]?.[p.id] || 0;
                const free = invoiceFree[cust.id]?.[p.id] || 0;
                const isLoaded = loadedMap[p.id] > 0;
                return (
                  <td key={p.id} style={{ ...cell, background: isLoaded ? '#fff' : '#f9fafb', padding: '2px 1px', lineHeight: '1.3', color: sold > 0 ? '#1d4ed8' : 'inherit' }}>
                    {sold > 0 ? sold : ''}
                    {free > 0 && <div style={{ color: '#059669', fontSize: '8px', fontWeight: '600' }}>+{free}F</div>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>

        <tfoot>
          {footerRows.filter(({ always }) => always || isClosed).map(({ label, key, always, isFree }) => (
            <tr key={label}>
              <td colSpan={2} style={{ ...hCell, textAlign: 'right', fontSize: '8.5px', color: label === 'Loaded' ? '#1d4ed8' : label === 'Free' ? '#059669' : '#000' }}>{label}</td>
              {sortedProducts.map(p => {
                let val = '';
                if (isFree) {
                  val = freeTotalByProduct[p.id] || '';
                } else {
                  const line = (sheet.Lines || []).find(l => l.product_id === p.id);
                  val = line && (always || isClosed) ? (parseFloat(line[key]) || 0) || '' : '';
                }
                const isLoaded = loadedMap[p.id] > 0;
                const color = label === 'Loaded' ? '#1d4ed8' : label === 'Free' ? '#059669' : '#000';
                return (
                  <td key={p.id} style={{ ...cell, fontWeight: '600', fontSize: '8.5px', background: isLoaded ? '#f0f9ff' : '#f9fafb', color }}>
                    {val}
                  </td>
                );
              })}
            </tr>
          ))}

          {/* Cases row — one merged cell per size group: total units / case size = cases */}
          <tr>
            <td colSpan={2} style={{ ...hCell, textAlign: 'right', fontSize: '8.5px' }}>Cases</td>
            {sizeGroups.map(([ml, prods]) => {
              const totalLoaded = prods.reduce((s, p) => s + (loadedMap[p.id] || 0), 0);
              const totalFree = prods.reduce((s, p) => s + (freeTotalByProduct[p.id] || 0), 0);
              const totalUnits = totalLoaded + totalFree;
              const firstCaseSize = prods.find(p => p.case_size && parseInt(p.case_size) > 1)?.case_size;
              const csNum = firstCaseSize ? parseInt(firstCaseSize) : null;
              const fullCases = csNum ? Math.floor(totalUnits / csNum) : 0;
              const rem = csNum ? totalUnits % csNum : 0;
              const casesLabel = csNum
                ? (fullCases > 0 ? `${fullCases}cs${rem > 0 ? `+${rem}u` : ''}` : `${rem}u`)
                : (totalUnits > 0 ? `${totalUnits}u` : '');
              return (
                <td key={ml} colSpan={prods.length} style={{ ...cell, fontWeight: '700', background: '#ede9fe', color: '#6d28d9', textAlign: 'center', lineHeight: '1.4' }}>
                  <div style={{ fontSize: '9.5px' }}>{casesLabel}</div>
                  {csNum && <div style={{ fontSize: '7.5px', color: '#7c3aed', fontWeight: '400' }}>{totalUnits}u ÷ {csNum}</div>}
                </td>
              );
            })}
          </tr>

          {/* Balance row — only when closed */}
          {isClosed && (
            <tr>
              <td colSpan={2} style={{ ...hCell, textAlign: 'right', fontSize: '8.5px' }}>Balance</td>
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
                  <td key={p.id} style={{ ...cell, fontWeight: '700', fontSize: '8.5px', background: loadedMap[p.id] > 0 ? '#f0f9ff' : '#f9fafb' }}>
                    {val !== '' ? val : ''}
                  </td>
                );
              })}
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
