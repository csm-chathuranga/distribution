import { fmtCurrency, fmtDate } from '../../utils/format';

const tableStyle = { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' };
const cellStyle = {
  border: '1px solid #555',
  padding: '5px 6px',
  verticalAlign: 'middle',
};
const labelStyle = { ...cellStyle, fontWeight: '700', background: '#f3f4f6' };

const qty = value => (parseFloat(value) || 0).toFixed(2);

export default function LoadingSheetPrint({ sheet, company }) {
  if (!sheet) return null;

  const lines = sheet.Lines || [];
  const totals = lines.reduce((sum, line) => {
    const loaded = parseFloat(line.loaded_quantity) || 0;
    const sold = parseFloat(line.sold_quantity) || 0;
    const returned = parseFloat(line.returned_quantity) || 0;
    const damaged = parseFloat(line.damaged_quantity) || 0;
    const lost = parseFloat(line.lost_quantity) || 0;
    const unitCost = parseFloat(line.unit_cost) || 0;
    sum.loaded += loaded;
    sum.sold += sold;
    sum.returned += returned;
    sum.damaged += damaged;
    sum.lost += lost;
    sum.loadValue += loaded * unitCost;
    sum.salesValue += sold * unitCost;
    return sum;
  }, { loaded: 0, sold: 0, returned: 0, damaged: 0, lost: 0, loadValue: 0, salesValue: 0 });

  return (
    <div style={{
      width: '100%',
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      lineHeight: 1.25,
      color: '#111',
      background: '#fff',
      padding: '6mm',
    }}>
      <header style={{ textAlign: 'center', marginBottom: '10px' }}>
        <div style={{ fontSize: '17px', fontWeight: '700' }}>{company?.name || 'Lanka Distribution'}</div>
        {company?.address && <div>{company.address}</div>}
        {company?.phone && <div>Tel: {company.phone}</div>}
        <div style={{ fontSize: '14px', fontWeight: '700', marginTop: '5px' }}>LOADING SHEET / STOCK REGISTER</div>
      </header>

      <table style={{ ...tableStyle, marginBottom: '10px', fontSize: '9px' }}>
        <tbody>
          <tr>
            <td style={{ ...labelStyle, width: '12%' }}>Sheet No.</td>
            <td style={{ ...cellStyle, width: '21%' }}>{sheet.sheet_number || '—'}</td>
            <td style={{ ...labelStyle, width: '10%' }}>Date</td>
            <td style={{ ...cellStyle, width: '17%' }}>{fmtDate(sheet.sheet_date)}</td>
            <td style={{ ...labelStyle, width: '10%' }}>Status</td>
            <td style={{ ...cellStyle, width: '12%' }}>{sheet.status || '—'}</td>
            <td style={{ ...labelStyle, width: '9%' }}>Vehicle</td>
            <td style={{ ...cellStyle, width: '9%' }}>{sheet.vehicle_number || '—'}</td>
          </tr>
          <tr>
            <td style={labelStyle}>Sales Rep</td>
            <td style={cellStyle}>{sheet.SalesRep?.name || '—'}</td>
            <td style={labelStyle}>Driver</td>
            <td style={cellStyle}>{sheet.Driver?.name || '—'}</td>
            <td style={labelStyle}>Route</td>
            <td style={cellStyle}>{sheet.Route?.name || '—'}</td>
            <td style={labelStyle}>Warehouse</td>
            <td style={cellStyle}>{sheet.Warehouse?.name || '—'}</td>
          </tr>
        </tbody>
      </table>

      <table style={{ ...tableStyle, fontSize: '9px' }}>
        <colgroup>
          <col style={{ width: '3%' }} />
          <col style={{ width: '24%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '9%' }} />
          <col style={{ width: '11%' }} />
        </colgroup>
        <thead>
          <tr style={{ textAlign: 'center', background: '#f3f4f6' }}>
            {['#', 'Product', 'SKU', 'Loaded', 'Sold', 'Returned', 'Damaged', 'Lost', 'Balance', 'Unit Cost', 'Value'].map(title => (
              <th key={title} style={{ ...cellStyle, fontWeight: '700' }}>{title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => {
            const loaded = parseFloat(line.loaded_quantity) || 0;
            const sold = parseFloat(line.sold_quantity) || 0;
            const returned = parseFloat(line.returned_quantity) || 0;
            const damaged = parseFloat(line.damaged_quantity) || 0;
            const lost = parseFloat(line.lost_quantity) || 0;
            const balance = Math.max(0, loaded - sold - returned - damaged - lost);
            const unitCost = parseFloat(line.unit_cost) || 0;
            const values = [
              index + 1,
              line.Product?.name || '—',
              line.Product?.sku || '—',
              qty(loaded),
              qty(sold),
              qty(returned),
              qty(damaged),
              qty(lost),
              qty(balance),
              fmtCurrency(unitCost),
              fmtCurrency(loaded * unitCost),
            ];
            return (
              <tr key={line.id || index}>
                {values.map((value, cellIndex) => (
                  <td key={cellIndex} style={{
                    ...cellStyle,
                    textAlign: cellIndex === 1 || cellIndex === 2 ? 'left' : 'center',
                    overflowWrap: 'anywhere',
                  }}>
                    {value}
                  </td>
                ))}
              </tr>
            );
          })}
          {lines.length === 0 && (
            <tr>
              <td colSpan={11} style={{ ...cellStyle, textAlign: 'center' }}>No items on this loading sheet.</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr style={{ fontWeight: '700', background: '#f3f4f6' }}>
            <td colSpan={3} style={{ ...cellStyle, textAlign: 'right' }}>TOTAL</td>
            <td style={{ ...cellStyle, textAlign: 'center' }}>{qty(totals.loaded)}</td>
            <td style={{ ...cellStyle, textAlign: 'center' }}>{qty(totals.sold)}</td>
            <td style={{ ...cellStyle, textAlign: 'center' }}>{qty(totals.returned)}</td>
            <td style={{ ...cellStyle, textAlign: 'center' }}>{qty(totals.damaged)}</td>
            <td style={{ ...cellStyle, textAlign: 'center' }}>{qty(totals.lost)}</td>
            <td style={cellStyle}> </td>
            <td style={cellStyle}> </td>
            <td style={{ ...cellStyle, textAlign: 'right' }}>{fmtCurrency(totals.loadValue)}</td>
          </tr>
          {sheet.status === 'CLOSED' && (
            <tr>
              <td colSpan={9} style={{ ...cellStyle, textAlign: 'right', fontWeight: '700' }}>Cash Collected</td>
              <td colSpan={2} style={{ ...cellStyle, textAlign: 'right' }}>{fmtCurrency(sheet.cash_collected)}</td>
            </tr>
          )}
          {sheet.status === 'CLOSED' && (
            <tr>
              <td colSpan={9} style={{ ...cellStyle, textAlign: 'right', fontWeight: '700' }}>Total Sales</td>
              <td colSpan={2} style={{ ...cellStyle, textAlign: 'right' }}>{fmtCurrency(sheet.total_sales_amount || totals.salesValue)}</td>
            </tr>
          )}
        </tfoot>
      </table>

      <table style={{ width: '100%', marginTop: '28px', fontSize: '9px', textAlign: 'center' }}>
        <tbody>
          <tr>
            <td style={{ width: '33%', padding: '0 18px' }}>
              <div style={{ borderTop: '1px solid #333', paddingTop: '4px' }}>Sales Rep / Prepared By</div>
            </td>
            <td style={{ width: '34%', padding: '0 18px' }}>
              <div style={{ borderTop: '1px solid #333', paddingTop: '4px' }}>Driver Signature</div>
            </td>
            <td style={{ width: '33%', padding: '0 18px' }}>
              <div style={{ borderTop: '1px solid #333', paddingTop: '4px' }}>Supervisor / Approved By</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
