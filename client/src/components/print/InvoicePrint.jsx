import { fmtCurrency, fmtDate } from '../../utils/format';

export default function InvoicePrint({ invoice, company }) {
  if (!invoice) return null;

  const lines   = invoice.Lines || [];
  const paid    = parseFloat(invoice.paid_amount   || 0);
  const balance = parseFloat(invoice.balance_due   || 0);
  const vat     = parseFloat(invoice.vat_amount    || 0);
  const disc    = parseFloat(invoice.discount_amount || 0);
  const sub     = parseFloat(invoice.subtotal      || 0);
  const total   = parseFloat(invoice.total_amount  || 0);

  const typeLabel =
    invoice.invoice_type === 'CREDIT_NOTE' ? 'CREDIT NOTE'
    : invoice.invoice_type === 'PROFORMA'  ? 'PROFORMA INVOICE'
    : 'TAX INVOICE';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: '500', color: '#111', background: '#fff', padding: '32px 40px', maxWidth: '800px' }}>

      {/* ── Header ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: 'top', width: '55%' }}>
              <div style={{ fontSize: '26px', fontWeight: '900', color: '#1e3a5f', letterSpacing: '-0.5px' }}>
                {company?.name || 'Lanka Distribution'}
              </div>
              {company?.address && <div style={{ marginTop: '4px', color: '#444', lineHeight: '1.4', fontWeight: '600' }}>{company.address}</div>}
              {company?.phone  && <div style={{ color: '#444', fontWeight: '600' }}>Tel: {company.phone}</div>}
              {company?.email  && <div style={{ color: '#444', fontWeight: '600' }}>{company.email}</div>}
              <div style={{ marginTop: '6px', fontSize: '14px', color: '#555', fontWeight: '600' }}>
                {company?.vat_number && <span>VAT Reg: <strong>{company.vat_number}</strong>&nbsp;&nbsp;</span>}
                {company?.tin_number && <span>TIN: <strong>{company.tin_number}</strong></span>}
              </div>
            </td>
            <td style={{ verticalAlign: 'top', textAlign: 'right' }}>
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#1e3a5f', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {typeLabel}
              </div>
              <table style={{ marginLeft: 'auto', marginTop: '8px', fontSize: '16px' }}>
                <tbody>
                  <tr>
                    <td style={{ color: '#555', paddingRight: '12px', paddingBottom: '4px', fontWeight: '600' }}>Invoice #</td>
                    <td style={{ fontWeight: '800' }}>{invoice.invoice_number}</td>
                  </tr>
                  <tr>
                    <td style={{ color: '#555', paddingRight: '12px', paddingBottom: '4px', fontWeight: '600' }}>Date</td>
                    <td style={{ fontWeight: '700' }}>{fmtDate(invoice.invoice_date)}</td>
                  </tr>
                  {invoice.due_date && (
                    <tr>
                      <td style={{ color: '#555', paddingRight: '12px', paddingBottom: '4px', fontWeight: '600' }}>Due Date</td>
                      <td style={{ fontWeight: '700', color: balance > 0 && new Date(invoice.due_date) < new Date() ? '#dc2626' : '#111' }}>
                        {fmtDate(invoice.due_date)}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ color: '#555', paddingRight: '12px', fontWeight: '600' }}>Status</td>
                    <td style={{ fontWeight: '800', color: invoice.status === 'PAID' ? '#16a34a' : invoice.status === 'POSTED' ? '#2563eb' : '#d97706' }}>
                      {invoice.status}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Bill To ── */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px 16px', marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Bill To</div>
        <div style={{ fontWeight: '800', fontSize: '17px' }}>{invoice.Customer?.name || '—'}</div>
        {invoice.Customer?.code      && <div style={{ color: '#444', fontSize: '14px', fontWeight: '600' }}>Code: {invoice.Customer.code}</div>}
        {invoice.Customer?.address   && <div style={{ color: '#444', marginTop: '3px', lineHeight: '1.4', fontWeight: '600' }}>{invoice.Customer.address}</div>}
        {invoice.Customer?.phone     && <div style={{ color: '#444', fontWeight: '600' }}>Tel: {invoice.Customer.phone}</div>}
        {invoice.Customer?.email     && <div style={{ color: '#444', fontWeight: '600' }}>{invoice.Customer.email}</div>}
      </div>

      {/* ── Line Items ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
        <thead>
          <tr style={{ background: '#1e3a5f', color: '#fff' }}>
            <th style={{ padding: '9px 10px', textAlign: 'left',  fontWeight: '700', fontSize: '14px' }}>#</th>
            <th style={{ padding: '9px 10px', textAlign: 'left',  fontWeight: '700', fontSize: '14px' }}>Product</th>
            <th style={{ padding: '9px 10px', textAlign: 'left',  fontWeight: '700', fontSize: '14px' }}>SKU</th>
            <th style={{ padding: '9px 10px', textAlign: 'right', fontWeight: '700', fontSize: '14px' }}>Qty</th>
            <th style={{ padding: '9px 10px', textAlign: 'right', fontWeight: '700', fontSize: '14px' }}>Unit Price</th>
            <th style={{ padding: '9px 10px', textAlign: 'right', fontWeight: '700', fontSize: '14px' }}>Disc %</th>
            <th style={{ padding: '9px 10px', textAlign: 'right', fontWeight: '700', fontSize: '14px' }}>VAT %</th>
            <th style={{ padding: '9px 10px', textAlign: 'right', fontWeight: '700', fontSize: '14px' }}>Line Total</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => (
            <tr key={line.id || i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '8px 10px', color: '#666', fontSize: '14px', fontWeight: '600' }}>{i + 1}</td>
              <td style={{ padding: '8px 10px', fontWeight: '700' }}>{line.Product?.name || `Product #${line.product_id}`}</td>
              <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '14px', color: '#555', fontWeight: '600' }}>{line.Product?.sku || '—'}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700' }}>{line.quantity}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '600' }}>{fmtCurrency(line.unit_price)}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right', color: '#666', fontWeight: '600' }}>
                {parseFloat(line.discount_rate || 0) > 0 ? `${line.discount_rate}%` : '—'}
              </td>
              <td style={{ padding: '8px 10px', textAlign: 'right', color: '#666', fontWeight: '600' }}>
                {parseFloat(line.vat_rate || 0) > 0 ? `${line.vat_rate}%` : '—'}
              </td>
              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '800', fontFamily: 'monospace' }}>{fmtCurrency(line.line_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Totals ── */}
      <table style={{ width: '100%', marginBottom: '20px' }}>
        <tbody>
          <tr>
            <td style={{ width: '55%' }} />
            <td>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '5px 10px', color: '#444', fontWeight: '600' }}>Subtotal</td>
                    <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '700' }}>{fmtCurrency(sub)}</td>
                  </tr>
                  {vat > 0 && (
                    <tr>
                      <td style={{ padding: '5px 10px', color: '#444', fontWeight: '600' }}>VAT</td>
                      <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '700' }}>{fmtCurrency(vat)}</td>
                    </tr>
                  )}
                  {disc > 0 && (
                    <tr>
                      <td style={{ padding: '5px 10px', color: '#444', fontWeight: '600' }}>Discount</td>
                      <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '700', color: '#dc2626' }}>−{fmtCurrency(disc)}</td>
                    </tr>
                  )}
                  <tr style={{ background: '#1e3a5f', color: '#fff' }}>
                    <td style={{ padding: '10px 10px', fontWeight: '800', fontSize: '17px' }}>TOTAL</td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: '800', fontSize: '17px', fontFamily: 'monospace' }}>{fmtCurrency(total)}</td>
                  </tr>
                  {paid > 0 && (
                    <tr>
                      <td style={{ padding: '5px 10px', color: '#16a34a', fontWeight: '700' }}>Amount Paid</td>
                      <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '700', color: '#16a34a' }}>{fmtCurrency(paid)}</td>
                    </tr>
                  )}
                  {balance > 0 && (
                    <tr style={{ borderTop: '2px solid #dc2626' }}>
                      <td style={{ padding: '7px 10px', fontWeight: '800', color: '#dc2626' }}>Balance Due</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '800', fontFamily: 'monospace', color: '#dc2626' }}>{fmtCurrency(balance)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Notes ── */}
      {invoice.notes && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', fontSize: '14px', fontWeight: '600' }}>
          <strong>Notes:</strong> {invoice.notes}
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '16px' }}>
        <table style={{ width: '100%' }}>
          <tbody>
            <tr>
              <td style={{ width: '33%', textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #333', marginTop: '40px', paddingTop: '6px', fontSize: '14px', color: '#444', fontWeight: '600' }}>Prepared By</div>
              </td>
              <td style={{ width: '33%' }} />
              <td style={{ width: '33%', textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #333', marginTop: '40px', paddingTop: '6px', fontSize: '14px', color: '#444', fontWeight: '600' }}>Received By</div>
              </td>
            </tr>
          </tbody>
        </table>
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#888', fontWeight: '600' }}>
          This is a computer-generated document. No signature required. · Printed: {new Date().toLocaleString('en-LK')}
        </div>
      </div>
    </div>
  );
}
