import { fmtDate } from '../../utils/format';

export default function DeliveryNotePrint({ delivery, company }) {
  if (!delivery) return null;

  const invoice = delivery.Invoice;
  const lines   = invoice?.Lines || [];

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
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#0891b2', textTransform: 'uppercase', letterSpacing: '1px' }}>
                DELIVERY NOTE
              </div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e3a5f', marginTop: '4px' }}>{delivery.dn_number}</div>
              <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>{fmtDate(delivery.dn_date)}</div>
              <div style={{
                display: 'inline-block', marginTop: '6px', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700',
                background: delivery.status === 'DELIVERED' ? '#dcfce7' : delivery.status === 'DISPATCHED' ? '#dbeafe' : '#fef9c3',
                color:      delivery.status === 'DELIVERED' ? '#16a34a' : delivery.status === 'DISPATCHED' ? '#2563eb' : '#ca8a04',
              }}>
                {delivery.status}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Deliver To + Trip Info ── */}
      <table style={{ width: '100%', marginBottom: '20px', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: 'top', width: '50%', paddingRight: '16px' }}>
              <div style={{ background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: '6px', padding: '12px 16px' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: '#0e7490', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>
                  Deliver To
                </div>
                <div style={{ fontWeight: '700', fontSize: '13px' }}>{delivery.Customer?.name || invoice?.Customer?.name || '—'}</div>
                {(delivery.Customer?.address || invoice?.Customer?.address) && (
                  <div style={{ color: '#555', marginTop: '3px', lineHeight: '1.5' }}>
                    {delivery.Customer?.address || invoice?.Customer?.address}
                  </div>
                )}
                {(delivery.Customer?.phone || invoice?.Customer?.phone) && (
                  <div style={{ color: '#555', marginTop: '2px' }}>Tel: {delivery.Customer?.phone || invoice?.Customer?.phone}</div>
                )}
              </div>
            </td>
            <td style={{ verticalAlign: 'top', width: '50%' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px 16px' }}>
                <table style={{ width: '100%', fontSize: '12px' }}>
                  <tbody>
                    {invoice?.invoice_number && (
                      <tr>
                        <td style={{ color: '#64748b', paddingBottom: '5px', paddingRight: '8px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>Invoice #</td>
                        <td style={{ fontWeight: '700', paddingBottom: '5px' }}>{invoice.invoice_number}</td>
                      </tr>
                    )}
                    <tr>
                      <td style={{ color: '#64748b', paddingBottom: '5px', paddingRight: '8px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>Driver</td>
                      <td style={{ paddingBottom: '5px' }}>{delivery.Driver?.name || '—'}</td>
                    </tr>
                    {delivery.Route?.name && (
                      <tr>
                        <td style={{ color: '#64748b', paddingBottom: '5px', paddingRight: '8px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>Route</td>
                        <td style={{ paddingBottom: '5px' }}>{delivery.Route.name}</td>
                      </tr>
                    )}
                    {delivery.dispatched_at && (
                      <tr>
                        <td style={{ color: '#64748b', paddingBottom: '5px', paddingRight: '8px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>Dispatched</td>
                        <td style={{ paddingBottom: '5px' }}>{fmtDate(delivery.dispatched_at)}</td>
                      </tr>
                    )}
                    {delivery.delivered_at && (
                      <tr>
                        <td style={{ color: '#64748b', paddingRight: '8px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>Delivered</td>
                        <td>{fmtDate(delivery.delivered_at)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Items (from linked invoice) ── */}
      {lines.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
          <thead>
            <tr style={{ background: '#0891b2', color: '#fff' }}>
              <th style={{ padding: '8px 10px', textAlign: 'left',  fontWeight: '600', fontSize: '11px' }}>#</th>
              <th style={{ padding: '8px 10px', textAlign: 'left',  fontWeight: '600', fontSize: '11px' }}>Product</th>
              <th style={{ padding: '8px 10px', textAlign: 'left',  fontWeight: '600', fontSize: '11px' }}>SKU</th>
              <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600', fontSize: '11px' }}>Quantity</th>
              <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600', fontSize: '11px' }}>Received</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={line.id || i} style={{ background: i % 2 === 0 ? '#fff' : '#f0fdff', borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 10px', color: '#888', fontSize: '11px' }}>{i + 1}</td>
                <td style={{ padding: '8px 10px', fontWeight: '600' }}>{line.Product?.name || `Product #${line.product_id}`}</td>
                <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '11px', color: '#666' }}>{line.Product?.sku || '—'}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700' }}>{line.quantity}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', borderLeft: '2px dashed #a5f3fc' }}>
                  {/* blank for recipient to fill in */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ padding: '20px', textAlign: 'center', color: '#888', border: '1px dashed #ddd', borderRadius: '6px', marginBottom: '16px' }}>
          Items are listed on the linked invoice ({invoice?.invoice_number || '—'})
        </div>
      )}

      {/* ── Notes ── */}
      {delivery.notes && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', fontSize: '11px' }}>
          <strong>Notes:</strong> {delivery.notes}
        </div>
      )}

      {/* ── Signature block ── */}
      <table style={{ width: '100%', marginTop: '40px' }}>
        <tbody>
          <tr>
            <td style={{ width: '45%', textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #333', marginTop: '60px', paddingTop: '6px', fontSize: '11px', color: '#555' }}>Driver Signature & Date</div>
            </td>
            <td style={{ width: '10%' }} />
            <td style={{ width: '45%', textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #333', marginTop: '60px', paddingTop: '6px', fontSize: '11px', color: '#555' }}>Customer Signature & Date</div>
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

