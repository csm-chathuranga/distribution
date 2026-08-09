import { fmtCurrency, fmtDate } from '../../utils/format';

const METHOD_LABEL = {
  CASH: 'Cash', CHEQUE: 'Cheque',
  BANK_TRANSFER: 'Bank Transfer', CARD: 'Card',
};

export default function ReceiptPrint({ receipt, company }) {
  if (!receipt) return null;
  const amount = parseFloat(receipt.amount || 0);
  const allocations = receipt.Allocations || receipt.allocations || [];

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#111', background: '#fff', padding: '32px 40px', maxWidth: '600px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #16a34a', paddingBottom: '16px' }}>
        <div style={{ fontSize: '22px', fontWeight: '800', color: '#1e3a5f' }}>{company?.name || 'Lanka Distribution'}</div>
        {company?.address && <div style={{ color: '#555', fontSize: '11px', marginTop: '3px' }}>{company.address}</div>}
        {company?.phone   && <div style={{ color: '#555', fontSize: '11px' }}>Tel: {company.phone}</div>}
        <div style={{ fontSize: '18px', fontWeight: '800', color: '#16a34a', marginTop: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          OFFICIAL RECEIPT
        </div>
      </div>

      {/* Receipt meta */}
      <table style={{ width: '100%', marginBottom: '16px', fontSize: '12px' }}>
        <tbody>
          <tr>
            <td style={{ color: '#555', paddingBottom: '6px', width: '40%' }}>Receipt No.</td>
            <td style={{ fontWeight: '700', fontFamily: 'monospace', paddingBottom: '6px' }}>{receipt.receipt_number}</td>
          </tr>
          <tr>
            <td style={{ color: '#555', paddingBottom: '6px' }}>Date</td>
            <td style={{ paddingBottom: '6px' }}>{fmtDate(receipt.receipt_date)}</td>
          </tr>
          <tr>
            <td style={{ color: '#555', paddingBottom: '6px' }}>Received From</td>
            <td style={{ fontWeight: '600', paddingBottom: '6px' }}>{receipt.Customer?.name || '—'}</td>
          </tr>
          {receipt.Customer?.address && (
            <tr>
              <td style={{ color: '#555', paddingBottom: '6px' }}>Address</td>
              <td style={{ paddingBottom: '6px' }}>{receipt.Customer.address}</td>
            </tr>
          )}
          <tr>
            <td style={{ color: '#555', paddingBottom: '6px' }}>Payment Method</td>
            <td style={{ paddingBottom: '6px' }}>{METHOD_LABEL[receipt.payment_method] || receipt.payment_method}</td>
          </tr>
          {receipt.cheque_number && (
            <tr>
              <td style={{ color: '#555', paddingBottom: '6px' }}>Cheque No.</td>
              <td style={{ fontFamily: 'monospace', paddingBottom: '6px' }}>{receipt.cheque_number}</td>
            </tr>
          )}
          {receipt.bank && (
            <tr>
              <td style={{ color: '#555', paddingBottom: '6px' }}>Bank</td>
              <td style={{ paddingBottom: '6px' }}>{receipt.bank}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Amount box */}
      <div style={{ background: '#f0fdf4', border: '2px solid #16a34a', borderRadius: '8px', padding: '16px', textAlign: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Amount Received (LKR)</div>
        <div style={{ fontSize: '28px', fontWeight: '800', color: '#15803d', fontFamily: 'monospace' }}>{fmtCurrency(amount)}</div>
      </div>

      {/* Allocations */}
      {allocations.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#555', textTransform: 'uppercase', marginBottom: '8px' }}>Applied To Invoices</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: '600', color: '#555' }}>Invoice #</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '600', color: '#555' }}>Amount Applied</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((a, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{a.Invoice?.invoice_number || `INV-${a.invoice_id}`}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{fmtCurrency(a.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {receipt.notes && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '8px 12px', marginBottom: '16px', fontSize: '11px' }}>
          <strong>Notes:</strong> {receipt.notes}
        </div>
      )}

      {/* Signature */}
      <table style={{ width: '100%', marginTop: '30px' }}>
        <tbody><tr>
          <td style={{ width: '45%', textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #333', marginTop: '50px', paddingTop: '6px', fontSize: '11px', color: '#555' }}>Received By</div>
          </td>
          <td style={{ width: '10%' }} />
          <td style={{ width: '45%', textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #333', marginTop: '50px', paddingTop: '6px', fontSize: '11px', color: '#555' }}>Customer Signature</div>
          </td>
        </tr></tbody>
      </table>

      <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '10px', color: '#aaa', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
        This is a computer-generated receipt · Printed: {new Date().toLocaleString('en-LK')}
      </div>
    </div>
  );
}
