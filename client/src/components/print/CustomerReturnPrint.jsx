import { fmtDate, fmtCurrency } from '../../utils/format';

export default function CustomerReturnPrint({ ret, company }) {
  if (!ret) return null;

  const lines = ret.Lines || [];
  const totalValue = lines.reduce((s, l) => s + parseFloat(l.quantity) * parseFloat(l.unit_price), 0);

  const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: '11px' };
  const th = { borderBottom: '2px solid #333', padding: '5px 4px', textAlign: 'left', fontWeight: '700' };
  const td = { borderBottom: '1px solid #ddd', padding: '5px 4px', fontSize: '11px' };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#111', background: '#fff', padding: '10mm', maxWidth: '190mm', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        {company?.name && <div style={{ fontSize: '16px', fontWeight: '700' }}>{company.name}</div>}
        {company?.address && <div style={{ fontSize: '10px' }}>{company.address}</div>}
        {company?.phone && <div style={{ fontSize: '10px' }}>Tel: {company.phone}</div>}
        <div style={{ fontSize: '14px', fontWeight: '700', marginTop: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>Customer Return Note</div>
        <div style={{ fontSize: '10px', color: '#666' }}>This document certifies that the listed goods were returned</div>
      </div>

      <hr style={{ borderColor: '#333', marginBottom: '8px' }} />

      {/* Meta */}
      <table style={{ width: '100%', fontSize: '11px', marginBottom: '12px' }}>
        <tbody>
          <tr>
            <td style={{ width: '50%', padding: '2px 0' }}>
              <span style={{ color: '#666' }}>Return No: </span>
              <span style={{ fontWeight: '700', color: '#1a56db' }}>{ret.return_number}</span>
            </td>
            <td style={{ width: '50%', padding: '2px 0' }}>
              <span style={{ color: '#666' }}>Date: </span>
              <span style={{ fontWeight: '700' }}>{fmtDate(ret.return_date)}</span>
            </td>
          </tr>
          <tr>
            <td style={{ padding: '2px 0' }}>
              <span style={{ color: '#666' }}>Customer: </span>
              <span style={{ fontWeight: '700' }}>{ret.Customer?.name}</span>
            </td>
            <td style={{ padding: '2px 0' }}>
              <span style={{ color: '#666' }}>Status: </span>
              <span style={{ fontWeight: '700' }}>{ret.status}</span>
            </td>
          </tr>
          {ret.OriginalInvoice && (
            <tr>
              <td style={{ padding: '2px 0' }}>
                <span style={{ color: '#666' }}>Original Invoice: </span>
                <span style={{ fontFamily: 'monospace' }}>{ret.OriginalInvoice.invoice_number}</span>
              </td>
              {ret.CreditNote && (
                <td style={{ padding: '2px 0' }}>
                  <span style={{ color: '#666' }}>Credit Note: </span>
                  <span style={{ fontFamily: 'monospace' }}>{ret.CreditNote.invoice_number}</span>
                </td>
              )}
            </tr>
          )}
        </tbody>
      </table>

      {/* Items table */}
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={th}>Product</th>
            <th style={{ ...th, width: '70px' }}>SKU</th>
            <th style={{ ...th, textAlign: 'right', width: '50px' }}>Qty</th>
            <th style={{ ...th, textAlign: 'right', width: '90px' }}>Unit Price</th>
            <th style={{ ...th, textAlign: 'right', width: '90px' }}>Value</th>
            <th style={{ ...th, width: '80px' }}>Reason</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => (
            <tr key={i}>
              <td style={td}>{line.Product?.name}</td>
              <td style={{ ...td, fontFamily: 'monospace', fontSize: '10px', color: '#666' }}>{line.Product?.sku}</td>
              <td style={{ ...td, textAlign: 'right', fontWeight: '700' }}>{parseFloat(line.quantity)}</td>
              <td style={{ ...td, textAlign: 'right' }}>{fmtCurrency(line.unit_price)}</td>
              <td style={{ ...td, textAlign: 'right', fontWeight: '700' }}>{fmtCurrency(parseFloat(line.quantity) * parseFloat(line.unit_price))}</td>
              <td style={{ ...td, fontSize: '10px', color: '#666' }}>{line.reason || '—'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} style={{ ...td, textAlign: 'right', fontWeight: '700', borderTop: '2px solid #333', borderBottom: 'none' }}>Total Return Value</td>
            <td style={{ ...td, textAlign: 'right', fontWeight: '700', color: '#c00', fontSize: '13px', borderTop: '2px solid #333', borderBottom: 'none' }}>{fmtCurrency(totalValue)}</td>
            <td style={{ borderTop: '2px solid #333', borderBottom: 'none' }} />
          </tr>
        </tfoot>
      </table>

      {ret.notes && (
        <div style={{ marginTop: '12px', fontSize: '10px', color: '#555', background: '#f9f9f9', padding: '6px 8px', borderRadius: '4px' }}>
          <strong>Notes: </strong>{ret.notes}
        </div>
      )}

      {/* Signatures */}
      <div style={{ display: 'flex', gap: '40px', marginTop: '40px', paddingTop: '12px', borderTop: '1px solid #ccc', fontSize: '10px', color: '#555' }}>
        <div style={{ flex: 1 }}>
          <div style={{ borderBottom: '1px solid #555', height: '30px', marginBottom: '4px' }} />
          Driver / Sales Rep Signature
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ borderBottom: '1px solid #555', height: '30px', marginBottom: '4px' }} />
          Customer Signature
        </div>
      </div>
    </div>
  );
}
