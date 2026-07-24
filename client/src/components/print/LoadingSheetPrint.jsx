import { fmtCurrency, fmtDate } from '../../utils/format';

export default function LoadingSheetPrint({ sheet, company }) {
  if (!sheet) return null;

  const lines = sheet.Lines || [];
  const totalValue = lines.reduce((s, l) => s + parseFloat(l.loaded_quantity || 0) * parseFloat(l.unit_cost || 0), 0);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#111', background: '#fff', padding: '32px 40px', maxWidth: '800px' }}>

      {/* ── Header ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: 'top', width: '55%' }}>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#1e3a5f' }}>{company?.name || 'Lanka Distribution'}</div>
              {company?.address && <div style={{ color: '#555', marginTop: '4px', lineHeight: '1.4' }}>{company.address}</div>}
              {company?.phone   && <div style={{ color: '#555' }}>Tel: {company.phone}</div>}
            </td>
            <td style={{ verticalAlign: 'top', textAlign: 'right' }}>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '1px' }}>
                LOADING SHEET
              </div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e3a5f', marginTop: '4px' }}>{sheet.sheet_number}</div>
              <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>{fmtDate(sheet.sheet_date)}</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Trip Details ── */}
      <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '6px', padding: '12px 16px', marginBottom: '20px' }}>
        <table style={{ width: '100%', fontSize: '12px' }}>
          <tbody>
            <tr>
              <td style={{ width: '25%', paddingBottom: '6px' }}>
                <span style={{ color: '#6d28d9', fontWeight: '600', fontSize: '10px', textTransform: 'uppercase' }}>Sales Rep</span>
                <div style={{ fontWeight: '700', marginTop: '2px' }}>{sheet.SalesRep?.name || '—'}</div>
              </td>
              <td style={{ width: '25%', paddingBottom: '6px' }}>
                <span style={{ color: '#6d28d9', fontWeight: '600', fontSize: '10px', textTransform: 'uppercase' }}>Driver</span>
                <div style={{ fontWeight: '700', marginTop: '2px' }}>{sheet.Driver?.name || '—'}</div>
              </td>
              <td style={{ width: '25%', paddingBottom: '6px' }}>
                <span style={{ color: '#6d28d9', fontWeight: '600', fontSize: '10px', textTransform: 'uppercase' }}>Route</span>
                <div style={{ fontWeight: '700', marginTop: '2px' }}>{sheet.Route?.name || '—'}</div>
              </td>
              <td style={{ width: '25%', paddingBottom: '6px' }}>
                <span style={{ color: '#6d28d9', fontWeight: '600', fontSize: '10px', textTransform: 'uppercase' }}>Vehicle</span>
                <div style={{ fontWeight: '700', marginTop: '2px' }}>{sheet.vehicle_number || '—'}</div>
              </td>
            </tr>
            <tr>
              <td colSpan={2}>
                <span style={{ color: '#6d28d9', fontWeight: '600', fontSize: '10px', textTransform: 'uppercase' }}>Warehouse</span>
                <div style={{ fontWeight: '700', marginTop: '2px' }}>{sheet.Warehouse?.name || '—'}</div>
              </td>
              <td colSpan={2}>
                <span style={{ color: '#6d28d9', fontWeight: '600', fontSize: '10px', textTransform: 'uppercase' }}>Status</span>
                <div style={{ fontWeight: '700', marginTop: '2px' }}>{sheet.status}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Items ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
        <thead>
          <tr style={{ background: '#7c3aed', color: '#fff' }}>
            <th style={{ padding: '8px 10px', textAlign: 'left',  fontWeight: '600', fontSize: '11px' }}>#</th>
            <th style={{ padding: '8px 10px', textAlign: 'left',  fontWeight: '600', fontSize: '11px' }}>Product</th>
            <th style={{ padding: '8px 10px', textAlign: 'left',  fontWeight: '600', fontSize: '11px' }}>SKU</th>
            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600', fontSize: '11px' }}>Loaded</th>
            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600', fontSize: '11px' }}>Sold</th>
            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600', fontSize: '11px' }}>Returned</th>
            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600', fontSize: '11px' }}>Unit Cost</th>
            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600', fontSize: '11px' }}>Load Value</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => (
            <tr key={line.id || i} style={{ background: i % 2 === 0 ? '#fff' : '#faf5ff', borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '7px 10px', color: '#888', fontSize: '11px' }}>{i + 1}</td>
              <td style={{ padding: '7px 10px', fontWeight: '600' }}>{line.Product?.name || '—'}</td>
              <td style={{ padding: '7px 10px', fontFamily: 'monospace', fontSize: '11px', color: '#666' }}>{line.Product?.sku || '—'}</td>
              <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '600' }}>{parseFloat(line.loaded_quantity || 0).toFixed(2)}</td>
              <td style={{ padding: '7px 10px', textAlign: 'right', color: '#16a34a', fontWeight: '600' }}>{parseFloat(line.sold_quantity || 0).toFixed(2)}</td>
              <td style={{ padding: '7px 10px', textAlign: 'right', color: '#d97706' }}>{parseFloat(line.returned_quantity || 0).toFixed(2)}</td>
              <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#666' }}>{fmtCurrency(line.unit_cost)}</td>
              <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'monospace' }}>
                {fmtCurrency(parseFloat(line.loaded_quantity || 0) * parseFloat(line.unit_cost || 0))}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: '#1e3a5f', color: '#fff' }}>
            <td colSpan={7} style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700' }}>Total Loaded Value</td>
            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700', fontFamily: 'monospace' }}>{fmtCurrency(totalValue)}</td>
          </tr>
          {sheet.total_sales_amount > 0 && (
            <tr style={{ background: '#16a34a', color: '#fff' }}>
              <td colSpan={7} style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700' }}>Total Sales Amount</td>
              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700', fontFamily: 'monospace' }}>{fmtCurrency(sheet.total_sales_amount)}</td>
            </tr>
          )}
        </tfoot>
      </table>

      {/* ── Signatures ── */}
      <table style={{ width: '100%', marginTop: '40px' }}>
        <tbody>
          <tr>
            <td style={{ width: '30%', textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #333', marginTop: '50px', paddingTop: '6px', fontSize: '11px', color: '#555' }}>Sales Rep / Prepared By</div>
            </td>
            <td style={{ width: '10%' }} />
            <td style={{ width: '30%', textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #333', marginTop: '50px', paddingTop: '6px', fontSize: '11px', color: '#555' }}>Driver Signature</div>
            </td>
            <td style={{ width: '10%' }} />
            <td style={{ width: '30%', textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #333', marginTop: '50px', paddingTop: '6px', fontSize: '11px', color: '#555' }}>Supervisor / Approved By</div>
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '10px', color: '#aaa', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
        Computer generated document · {new Date().toLocaleString('en-LK')}
      </div>
    </div>
  );
}
