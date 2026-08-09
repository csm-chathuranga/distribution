import { fmtCurrency, fmtDate } from '../../utils/format';

export default function SupplierReturnPrint({ ret, company }) {
  if (!ret) return null;
  const lines = ret.Lines || [];
  const total = lines.reduce((s, l) => s + parseFloat(l.line_total || 0), 0);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#111', background: '#fff', padding: '32px 40px', maxWidth: '800px' }}>

      {/* Header */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
        <tbody><tr>
          <td style={{ verticalAlign: 'top', width: '55%' }}>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#1e3a5f' }}>{company?.name || 'Lanka Distribution'}</div>
            {company?.address && <div style={{ color: '#555', marginTop: '4px', lineHeight: '1.4' }}>{company.address}</div>}
            {company?.phone  && <div style={{ color: '#555' }}>Tel: {company.phone}</div>}
            <div style={{ marginTop: '6px', fontSize: '11px', color: '#777' }}>
              {company?.vat_number && <span>VAT Reg: <strong>{company.vat_number}</strong>&nbsp;&nbsp;</span>}
              {company?.tin_number && <span>TIN: <strong>{company.tin_number}</strong></span>}
            </div>
          </td>
          <td style={{ verticalAlign: 'top', textAlign: 'right' }}>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '1px' }}>
              SUPPLIER RETURN
            </div>
            <table style={{ marginLeft: 'auto', marginTop: '8px', fontSize: '12px' }}>
              <tbody>
                <tr>
                  <td style={{ color: '#777', paddingRight: '12px', paddingBottom: '3px' }}>Return #</td>
                  <td style={{ fontWeight: '700', fontFamily: 'monospace' }}>{ret.return_number}</td>
                </tr>
                <tr>
                  <td style={{ color: '#777', paddingRight: '12px', paddingBottom: '3px' }}>Date</td>
                  <td>{fmtDate(ret.return_date)}</td>
                </tr>
                {ret.GoodsReceived && (
                  <tr>
                    <td style={{ color: '#777', paddingRight: '12px', paddingBottom: '3px' }}>GRN Ref.</td>
                    <td style={{ fontFamily: 'monospace' }}>{ret.GoodsReceived.grn_number}</td>
                  </tr>
                )}
                <tr>
                  <td style={{ color: '#777', paddingRight: '12px' }}>Status</td>
                  <td style={{ fontWeight: '600', color: ret.status === 'POSTED' ? '#16a34a' : '#d97706' }}>{ret.status}</td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr></tbody>
      </table>

      {/* Supplier */}
      <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '6px', padding: '12px 16px', marginBottom: '20px' }}>
        <div style={{ fontSize: '10px', fontWeight: '700', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Return To (Supplier)</div>
        <div style={{ fontWeight: '700', fontSize: '13px' }}>{ret.Supplier?.name || '—'}</div>
        {ret.Supplier?.address && <div style={{ color: '#555', marginTop: '3px', lineHeight: '1.4' }}>{ret.Supplier.address}</div>}
        {ret.Supplier?.phone   && <div style={{ color: '#555' }}>Tel: {ret.Supplier.phone}</div>}
      </div>

      {/* Items */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
        <thead>
          <tr style={{ background: '#dc2626', color: '#fff' }}>
            <th style={{ padding: '8px 10px', textAlign: 'left',  fontWeight: '600', fontSize: '11px' }}>#</th>
            <th style={{ padding: '8px 10px', textAlign: 'left',  fontWeight: '600', fontSize: '11px' }}>Product</th>
            <th style={{ padding: '8px 10px', textAlign: 'left',  fontWeight: '600', fontSize: '11px' }}>SKU</th>
            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600', fontSize: '11px' }}>Qty Returned</th>
            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600', fontSize: '11px' }}>Unit Cost</th>
            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600', fontSize: '11px' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => (
            <tr key={line.id || i} style={{ background: i % 2 === 0 ? '#fff' : '#fff5f5', borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '7px 10px', color: '#888', fontSize: '11px' }}>{i + 1}</td>
              <td style={{ padding: '7px 10px', fontWeight: '600' }}>{line.Product?.name || `Product #${line.product_id}`}</td>
              <td style={{ padding: '7px 10px', fontFamily: 'monospace', fontSize: '11px', color: '#666' }}>{line.Product?.sku || '—'}</td>
              <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'monospace' }}>{parseFloat(line.quantity)}</td>
              <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'monospace' }}>{fmtCurrency(line.unit_cost)}</td>
              <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '600', fontFamily: 'monospace', color: '#dc2626' }}>{fmtCurrency(line.line_total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: '#dc2626', color: '#fff' }}>
            <td colSpan={5} style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700', fontSize: '13px' }}>TOTAL CREDIT</td>
            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700', fontSize: '13px', fontFamily: 'monospace' }}>{fmtCurrency(total)}</td>
          </tr>
        </tfoot>
      </table>

      {ret.notes && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', fontSize: '11px' }}>
          <strong>Reason / Notes:</strong> {ret.notes}
        </div>
      )}

      <table style={{ width: '100%', marginTop: '40px' }}>
        <tbody><tr>
          <td style={{ width: '45%', textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #333', marginTop: '50px', paddingTop: '6px', fontSize: '11px', color: '#555' }}>Authorised By</div>
          </td>
          <td style={{ width: '10%' }} />
          <td style={{ width: '45%', textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #333', marginTop: '50px', paddingTop: '6px', fontSize: '11px', color: '#555' }}>Supplier Acknowledgement</div>
          </td>
        </tr></tbody>
      </table>

      <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '10px', color: '#aaa', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
        Computer generated document · Printed: {new Date().toLocaleString('en-LK')}
      </div>
    </div>
  );
}
