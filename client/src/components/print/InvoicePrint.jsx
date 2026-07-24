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
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#111', background: '#fff', padding: '32px 40px', maxWidth: '800px' }}>

      {/* ── Header ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: 'top', width: '55%' }}>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#1e3a5f', letterSpacing: '-0.5px' }}>
                {company?.name || 'Lanka Distribution'}
              </div>
              {company?.address && <div style={{ marginTop: '4px', color: '#555', lineHeight: '1.4' }}>{company.address}</div>}
              {company?.phone  && <div style={{ color: '#555' }}>Tel: {company.phone}</div>}
              {company?.email  && <div style={{ color: '#555' }}>{company.email}</div>}
              <div style={{ marginTop: '6px', fontSize: '11px', color: '#777' }}>
                {company?.vat_number && <span>VAT Reg: <strong>{company.vat_number}</strong>&nbsp;&nbsp;</span>}
                {company?.tin_number && <span>TIN: <strong>{company.tin_number}</strong></span>}
              </div>
            </td>
            <td style={{ verticalAlign: 'top', textAlign: 'right' }}>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#1e3a5f', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {typeLabel}
              </div>
              <table style={{ marginLeft: 'auto', marginTop: '8px', fontSize: '12px' }}>
                <tbody>
                  <tr>
                    <td style={{ color: '#777', paddingRight: '12px', paddingBottom: '3px' }}>Invoice #</td>
                    <td style={{ fontWeight: '700' }}>{invoice.invoice_number}</td>
                  </tr>
                  <tr>
                    <td style={{ color: '#777', paddingRight: '12px', paddingBottom: '3px' }}>Date</td>
                    <td>{fmtDate(invoice.invoice_date)}</td>
                  </tr>
                  {invoice.due_date && (
                    <tr>
                      <td style={{ color: '#777', paddingRight: '12px', paddingBottom: '3px' }}>Due Date</td>
                      <td style={{ color: balance > 0 && new Date(invoice.due_date) < new Date() ? '#dc2626' : '#111' }}>
                        {fmtDate(invoice.due_date)}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ color: '#777', paddingRight: '12px' }}>Status</td>
                    <td style={{ fontWeight: '600', color: invoice.status === 'PAID' ? '#16a34a' : invoice.status === 'POSTED' ? '#2563eb' : '#d97706' }}>
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
        <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Bill To</div>
        <div style={{ fontWeight: '700', fontSize: '13px' }}>{invoice.Customer?.name || '—'}</div>
        {invoice.Customer?.code      && <div style={{ color: '#555', fontSize: '11px' }}>Code: {invoice.Customer.code}</div>}
        {invoice.Customer?.address   && <div style={{ color: '#555', marginTop: '3px', lineHeight: '1.4' }}>{invoice.Customer.address}</div>}
        {invoice.Customer?.phone     && <div style={{ color: '#555' }}>Tel: {invoice.Customer.phone}</div>}
        {invoice.Customer?.email     && <div style={{ color: '#555' }}>{invoice.Customer.email}</div>}
      </div>

      {/* ── Line Items ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
        <thead>
          <tr style={{ background: '#1e3a5f', color: '#fff' }}>
            <th style={{ padding: '8px 10px', textAlign: 'left',  fontWeight: '600', fontSize: '11px' }}>#</th>
            <th style={{ padding: '8px 10px', textAlign: 'left',  fontWeight: '600', fontSize: '11px' }}>Product</th>
            <th style={{ padding: '8px 10px', textAlign: 'left',  fontWeight: '600', fontSize: '11px' }}>SKU</th>
            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600', fontSize: '11px' }}>Qty</th>
            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600', fontSize: '11px' }}>Unit Price</th>
            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600', fontSize: '11px' }}>Disc %</th>
            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600', fontSize: '11px' }}>VAT %</th>
            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600', fontSize: '11px' }}>Line Total</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => (
            <tr key={line.id || i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '7px 10px', color: '#888', fontSize: '11px' }}>{i + 1}</td>
              <td style={{ padding: '7px 10px', fontWeight: '600' }}>{line.Product?.name || `Product #${line.product_id}`}</td>
              <td style={{ padding: '7px 10px', fontFamily: 'monospace', fontSize: '11px', color: '#666' }}>{line.Product?.sku || '—'}</td>
              <td style={{ padding: '7px 10px', textAlign: 'right' }}>{line.quantity}</td>
              <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'monospace' }}>{fmtCurrency(line.unit_price)}</td>
              <td style={{ padding: '7px 10px', textAlign: 'right', color: '#888' }}>
                {parseFloat(line.discount_rate || 0) > 0 ? `${line.discount_rate}%` : '—'}
              </td>
              <td style={{ padding: '7px 10px', textAlign: 'right', color: '#888' }}>
                {parseFloat(line.vat_rate || 0) > 0 ? `${line.vat_rate}%` : '—'}
              </td>
              <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '600', fontFamily: 'monospace' }}>{fmtCurrency(line.line_total)}</td>
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
                    <td style={{ padding: '4px 10px', color: '#555' }}>Subtotal</td>
                    <td style={{ padding: '4px 10px', textAlign: 'right', fontFamily: 'monospace' }}>{fmtCurrency(sub)}</td>
                  </tr>
                  {vat > 0 && (
                    <tr>
                      <td style={{ padding: '4px 10px', color: '#555' }}>VAT</td>
                      <td style={{ padding: '4px 10px', textAlign: 'right', fontFamily: 'monospace' }}>{fmtCurrency(vat)}</td>
                    </tr>
                  )}
                  {disc > 0 && (
                    <tr>
                      <td style={{ padding: '4px 10px', color: '#555' }}>Discount</td>
                      <td style={{ padding: '4px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#dc2626' }}>−{fmtCurrency(disc)}</td>
                    </tr>
                  )}
                  <tr style={{ background: '#1e3a5f', color: '#fff' }}>
                    <td style={{ padding: '8px 10px', fontWeight: '700', fontSize: '13px' }}>TOTAL</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700', fontSize: '13px', fontFamily: 'monospace' }}>{fmtCurrency(total)}</td>
                  </tr>
                  {paid > 0 && (
                    <tr>
                      <td style={{ padding: '4px 10px', color: '#16a34a' }}>Amount Paid</td>
                      <td style={{ padding: '4px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#16a34a' }}>{fmtCurrency(paid)}</td>
                    </tr>
                  )}
                  {balance > 0 && (
                    <tr style={{ borderTop: '2px solid #dc2626' }}>
                      <td style={{ padding: '6px 10px', fontWeight: '700', color: '#dc2626' }}>Balance Due</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '700', fontFamily: 'monospace', color: '#dc2626' }}>{fmtCurrency(balance)}</td>
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
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', fontSize: '11px' }}>
          <strong>Notes:</strong> {invoice.notes}
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '16px' }}>
        <table style={{ width: '100%' }}>
          <tbody>
            <tr>
              <td style={{ width: '33%', textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #333', marginTop: '40px', paddingTop: '6px', fontSize: '11px', color: '#555' }}>Prepared By</div>
              </td>
              <td style={{ width: '33%' }} />
              <td style={{ width: '33%', textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #333', marginTop: '40px', paddingTop: '6px', fontSize: '11px', color: '#555' }}>Received By</div>
              </td>
            </tr>
          </tbody>
        </table>
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '10px', color: '#aaa' }}>
          This is a computer-generated document. No signature required. · Printed: {new Date().toLocaleString('en-LK')}
        </div>
      </div>
    </div>
  );
}
