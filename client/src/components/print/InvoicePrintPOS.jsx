import { fmtDate } from '../../utils/format';

const W = '70mm';
const mono = 'Courier New, monospace';

function fmtAmt(val) {
  return parseFloat(val || 0).toFixed(2);
}

function Divider({ dashed }) {
  return (
    <div style={{ borderTop: dashed ? '1px dashed #000' : '1px solid #000', margin: '4px 0' }} />
  );
}

export default function InvoicePrintPOS({ invoice, company }) {
  if (!invoice) return null;

  const lines   = invoice.Lines || [];
  const paid    = parseFloat(invoice.paid_amount    || 0);
  const balance = parseFloat(invoice.balance_due    || 0);
  const vat     = parseFloat(invoice.vat_amount     || 0);
  const disc    = parseFloat(invoice.discount_amount || 0);
  const sub     = parseFloat(invoice.subtotal       || 0);
  const total   = parseFloat(invoice.total_amount   || 0);

  const typeLabel =
    invoice.invoice_type === 'CREDIT_NOTE' ? 'CREDIT NOTE'
    : invoice.invoice_type === 'PROFORMA'  ? 'PROFORMA INVOICE'
    : 'TAX INVOICE';

  const root = {
    fontFamily: mono,
    fontSize: '10px',
    color: '#000',
    background: '#fff',
    width: W,
    padding: '4mm 0',
    margin: '0 auto',
    lineHeight: '1.4',
  };

  const center = { textAlign: 'center' };
  const right  = { textAlign: 'right' };
  const bold   = { fontWeight: 'bold' };
  const row    = { display: 'flex', justifyContent: 'space-between' };

  return (
    <div style={root}>

      {/* Company header */}
      <div style={{ ...center, ...bold, fontSize: '13px' }}>
        {company?.name || 'Lanka Distribution'}
      </div>
      {company?.address && (
        <div style={{ ...center, fontSize: '9px', marginTop: '2px' }}>{company.address}</div>
      )}
      {company?.phone && (
        <div style={{ ...center, fontSize: '9px' }}>Tel: {company.phone}</div>
      )}
      {(company?.vat_number || company?.tin_number) && (
        <div style={{ ...center, fontSize: '9px' }}>
          {company?.vat_number && `VAT: ${company.vat_number}`}
          {company?.vat_number && company?.tin_number && '  '}
          {company?.tin_number && `TIN: ${company.tin_number}`}
        </div>
      )}

      <Divider />

      {/* Document type + number */}
      <div style={{ ...center, ...bold, fontSize: '11px' }}>{typeLabel}</div>
      <div style={{ ...center, fontSize: '9px' }}>{invoice.invoice_number}</div>

      <Divider dashed />

      {/* Customer */}
      <div style={row}>
        <span style={{ color: '#555' }}>Customer:</span>
        <span style={bold}>{invoice.Customer?.name || '—'}</span>
      </div>
      {invoice.Customer?.code && (
        <div style={row}>
          <span style={{ color: '#555' }}>Code:</span>
          <span>{invoice.Customer.code}</span>
        </div>
      )}
      <div style={row}>
        <span style={{ color: '#555' }}>Date:</span>
        <span>{fmtDate(invoice.invoice_date)}</span>
      </div>
      {invoice.due_date && (
        <div style={row}>
          <span style={{ color: '#555' }}>Due:</span>
          <span>{fmtDate(invoice.due_date)}</span>
        </div>
      )}

      <Divider dashed />

      {/* Items header */}
      <div style={{ display: 'flex', fontSize: '9px' }}>
        <span style={{ flex: 1, ...bold }}>ITEM</span>
        <span style={{ width: '36px', textAlign: 'right', ...bold }}>QTY</span>
        <span style={{ width: '50px', textAlign: 'right', ...bold }}>PRICE</span>
        <span style={{ width: '54px', textAlign: 'right', ...bold }}>TOTAL</span>
      </div>

      <Divider />

      {/* Line items */}
      {lines.map((line, i) => {
        const freeQty = line.free_quantity ? parseInt(line.free_quantity) : 0;
        return (
          <div key={line.id || i} style={{ marginBottom: '3px' }}>
            <div style={{ fontSize: '10px', ...bold, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {line.Product?.name || `Product #${line.product_id}`}
            </div>
            {line.Product?.sku && (
              <div style={{ fontSize: '8px', color: '#555' }}>{line.Product.sku}</div>
            )}
            <div style={{ display: 'flex' }}>
              <span style={{ flex: 1, fontSize: '9px', color: '#555' }}>
                {parseFloat(line.discount_rate || 0) > 0 && `Disc ${line.discount_rate}%`}
                {freeQty > 0 && ` +${freeQty} free`}
              </span>
              <span style={{ width: '36px', textAlign: 'right' }}>{line.quantity}</span>
              <span style={{ width: '50px', textAlign: 'right' }}>{fmtAmt(line.unit_price)}</span>
              <span style={{ width: '54px', textAlign: 'right', ...bold }}>{fmtAmt(line.line_total)}</span>
            </div>
          </div>
        );
      })}

      <Divider />

      {/* Totals */}
      <div style={row}>
        <span>Subtotal</span>
        <span>{fmtAmt(sub)}</span>
      </div>
      {disc > 0 && (
        <div style={row}>
          <span>Discount</span>
          <span>-{fmtAmt(disc)}</span>
        </div>
      )}
      {vat > 0 && (
        <div style={row}>
          <span>VAT</span>
          <span>{fmtAmt(vat)}</span>
        </div>
      )}

      <Divider />

      <div style={{ ...row, ...bold, fontSize: '12px' }}>
        <span>TOTAL</span>
        <span>LKR {fmtAmt(total)}</span>
      </div>

      {paid > 0 && (
        <div style={row}>
          <span>Paid</span>
          <span>{fmtAmt(paid)}</span>
        </div>
      )}
      {balance > 0 && (
        <>
          <Divider />
          <div style={{ ...row, ...bold }}>
            <span>BALANCE DUE</span>
            <span>LKR {fmtAmt(balance)}</span>
          </div>
        </>
      )}

      {/* Notes */}
      {invoice.notes && (
        <>
          <Divider dashed />
          <div style={{ fontSize: '9px' }}>Note: {invoice.notes}</div>
        </>
      )}

      <Divider dashed />

      {/* Signature */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '9px' }}>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <div style={{ borderTop: '1px solid #000', paddingTop: '3px', marginTop: '20px' }}>Prepared By</div>
        </div>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <div style={{ borderTop: '1px solid #000', paddingTop: '3px', marginTop: '20px' }}>Received By</div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ ...center, fontSize: '8px', color: '#555', marginTop: '8px' }}>
        {new Date().toLocaleString('en-LK')}
      </div>
      <div style={{ ...center, fontSize: '8px', color: '#555' }}>
        Computer generated document
      </div>

    </div>
  );
}
