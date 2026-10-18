import { fmtDate } from '../../utils/format';

const W = '76mm';
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
  const returns = invoice.Order?.Returns || [];
  const paid    = parseFloat(invoice.paid_amount    || 0);
  const balance = parseFloat(invoice.balance_due    || 0);
  const vat     = parseFloat(invoice.vat_amount     || 0);
  const disc    = parseFloat(invoice.discount_amount || 0);
  const sub     = parseFloat(invoice.subtotal       || 0);
  const total   = parseFloat(invoice.total_amount   || 0);
  const returnDeduction = returns
    .filter(r => r.action === 'DEDUCT')
    .reduce((s, r) => s + parseFloat(r.quantity) * parseFloat(r.unit_price), 0);
  const REASON_LABEL = { EXPIRED: 'Expired', DAMAGED: 'Damaged', WRONG_ITEM: 'Wrong Item', OTHER: 'Other' };

  const typeLabel =
    invoice.invoice_type === 'CREDIT_NOTE' ? 'CREDIT NOTE'
    : invoice.invoice_type === 'PROFORMA'  ? 'PROFORMA INVOICE'
    : 'TAX INVOICE';

  const root = {
    fontFamily: mono,
    fontSize: '18px',
    fontWeight: '800',
    color: '#000',
    background: '#fff',
    width: W,
    padding: '4mm 0',
    margin: '0 auto',
    lineHeight: '1.4',
  };

  const center = { textAlign: 'center' };
  const bold   = { fontWeight: '800' };
  const row    = { display: 'flex', justifyContent: 'space-between' };

  return (
    <div style={root}>

      {/* Company header */}
      <div style={{ ...center, ...bold, fontSize: '21px' }}>
        {company?.name || 'Lanka Distribution'}
      </div>
      {company?.address && (
        <div style={{ ...center, fontSize: '17px', marginTop: '2px' }}>{company.address}</div>
      )}
      {company?.phone && (
        <div style={{ ...center, fontSize: '17px' }}>Tel: {company.phone}</div>
      )}
      {(company?.vat_number || company?.tin_number) && (
        <div style={{ ...center, fontSize: '17px' }}>
          {company?.vat_number && `VAT: ${company.vat_number}`}
          {company?.vat_number && company?.tin_number && '  '}
          {company?.tin_number && `TIN: ${company.tin_number}`}
        </div>
      )}

      <Divider />

      {/* Document type + number */}
      <div style={{ ...center, ...bold, fontSize: '19px' }}>{typeLabel}</div>
      <div style={{ ...center, fontSize: '17px' }}>{invoice.invoice_number}</div>

      <Divider dashed />

      {/* Customer */}
      <div style={row}>
        <span style={{ color: '#333' }}>Customer:</span>
        <span style={bold}>{invoice.Customer?.name || '—'}</span>
      </div>
      {invoice.Customer?.code && (
        <div style={row}>
          <span style={{ color: '#333' }}>Code:</span>
          <span>{invoice.Customer.code}</span>
        </div>
      )}
      <div style={row}>
        <span style={{ color: '#333' }}>Date:</span>
        <span>{fmtDate(invoice.invoice_date)}</span>
      </div>
      {invoice.due_date && (
        <div style={row}>
          <span style={{ color: '#333' }}>Due:</span>
          <span>{fmtDate(invoice.due_date)}</span>
        </div>
      )}

      <Divider dashed />

      {/* Items header */}
      <div style={{ display: 'flex', fontSize: '17px' }}>
        <span style={{ flex: 1, ...bold }}>ITEM</span>
        <span style={{ width: '65px', textAlign: 'right', ...bold }}>QTY</span>
        <span style={{ width: '85px', textAlign: 'right', ...bold }}>PRICE</span>
        <span style={{ width: '90px', textAlign: 'right', ...bold }}>TOTAL</span>
      </div>

      <Divider />

      {/* Line items */}
      {lines.map((line, i) => {
        const freeQty = line.free_quantity ? parseInt(line.free_quantity) : 0;
        return (
          <div key={line.id || i} style={{ marginBottom: '5px' }}>
            <div style={{ fontSize: '18px', ...bold }}>
              {line.Product?.name || `Product #${line.product_id}`}
            </div>
            {line.Product?.sku && (
              <div style={{ fontSize: '16px', color: '#333' }}>{line.Product.sku}</div>
            )}
            {(parseFloat(line.discount_rate || 0) > 0 || freeQty > 0) && (
              <div style={{ fontSize: '17px', color: '#c00' }}>
                {parseFloat(line.discount_rate || 0) > 0 && `Disc ${line.discount_rate}%`}
                {freeQty > 0 && ` +${freeQty} free`}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <span style={{ width: '65px', textAlign: 'right' }}>{line.quantity}</span>
              <span style={{ width: '85px', textAlign: 'right' }}>{fmtAmt(line.unit_price)}</span>
              <span style={{ width: '90px', textAlign: 'right', ...bold }}>{fmtAmt(line.line_total)}</span>
            </div>
          </div>
        );
      })}

      {/* Returns & Collections */}
      {returns.length > 0 && (
        <>
          <Divider dashed />
          <div style={{ ...bold, fontSize: '15px', marginBottom: '4px' }}>RETURNS / COLLECTIONS</div>
          {returns.map((r, i) => (
            <div key={r.id || i} style={{ marginBottom: '3px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ flex: 1 }}>{r.Product?.name || `Product #${r.product_id}`}</span>
                <span style={{ width: '42px', textAlign: 'right' }}>{r.quantity}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', color: '#555' }}>
                <span>{REASON_LABEL[r.reason] || r.reason} · {r.action === 'REPLACE' ? 'Replaced' : 'Deducted'}</span>
                {r.action === 'DEDUCT' && (
                  <span style={{ color: '#c00', ...bold }}>− {fmtAmt(parseFloat(r.quantity) * parseFloat(r.unit_price))}</span>
                )}
              </div>
            </div>
          ))}
          {returnDeduction > 0 && (
            <div style={{ ...row, color: '#c00', ...bold, marginTop: '4px' }}>
              <span>Return Deduction</span>
              <span>− {fmtAmt(returnDeduction)}</span>
            </div>
          )}
        </>
      )}

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

      <div style={{ ...row, ...bold, fontSize: '20px' }}>
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
          <div style={{ ...row, ...bold, fontSize: '20px' }}>
            <span>BALANCE DUE</span>
            <span>LKR {fmtAmt(balance)}</span>
          </div>
        </>
      )}

      {/* Notes */}
      {invoice.notes && (
        <>
          <Divider dashed />
          <div style={{ fontSize: '17px' }}>Note: {invoice.notes}</div>
        </>
      )}

      <Divider dashed />

      {/* Signature */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '17px' }}>
        <div style={{ textAlign: 'center', width: '45%' }}>
          {invoice.SalesRep?.name && (
            <div style={{ fontWeight: '800', marginBottom: '2px' }}>{invoice.SalesRep.name}</div>
          )}
          <div style={{ borderTop: '1px solid #000', paddingTop: '3px', marginTop: '20px' }}>Prepared By</div>
        </div>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <div style={{ borderTop: '1px solid #000', paddingTop: '3px', marginTop: '20px' }}>Received By</div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ ...center, fontSize: '16px', color: '#333', marginTop: '8px' }}>
        {new Date().toLocaleString('en-LK')}
      </div>
      <div style={{ ...center, fontSize: '16px', color: '#333' }}>
        Computer generated document
      </div>

    </div>
  );
}
