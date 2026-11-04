import { fmtDate } from '../../utils/format';

const W = '76mm';
const receiptFont = 'Arial, "Helvetica Neue", Helvetica, sans-serif';
const fmtAmt = val => parseFloat(val || 0).toFixed(2);

function Divider({ dashed }) {
  return <div style={{ borderTop: dashed ? '1px dashed #000' : '1px solid #000', margin: '4px 0' }} />;
}

const REASON_LABEL = { EXPIRED: 'Expired', DAMAGED: 'Damaged', WRONG_ITEM: 'Wrong Item', OTHER: 'Other' };

export default function CustomerReturnPrintPOS({ ret, company }) {
  if (!ret) return null;

  const lines = ret.Lines || [];
  const totalValue = lines.reduce((s, l) => s + parseFloat(l.quantity) * parseFloat(l.unit_price), 0);

  const root = {
    fontFamily: receiptFont,
    fontSize: '14px',
    fontWeight: '500',
    color: '#000',
    background: '#fff',
    width: W,
    padding: '4mm 0',
    margin: '0 auto',
    lineHeight: '1.4',
  };
  const center = { textAlign: 'center' };
  const bold   = { fontWeight: '700' };
  const row    = { display: 'flex', justifyContent: 'space-between' };

  return (
    <div style={root}>

      {/* Company header */}
      {company?.name && (
        <div style={{ ...center, ...bold, fontSize: '16px' }}>{company.name}</div>
      )}
      {company?.address && <div style={{ ...center, fontSize: '12px' }}>{company.address}</div>}
      {company?.phone && <div style={{ ...center, fontSize: '12px' }}>Tel: {company.phone}</div>}

      <Divider />

      <div style={{ ...center, ...bold, fontSize: '15px' }}>CUSTOMER RETURN NOTE</div>
      <div style={{ ...center, fontSize: '12px' }}>Return No: {ret.return_number}</div>

      <Divider dashed />

      <div style={row}>
        <span style={bold}>Customer:</span>
        <span style={bold}>{ret.Customer?.name || '—'}</span>
      </div>
      <div style={row}>
        <span>Date:</span>
        <span>{fmtDate(ret.return_date)}</span>
      </div>
      {ret.OriginalInvoice && (
        <div style={row}>
          <span>Invoice:</span>
          <span>{ret.OriginalInvoice.invoice_number}</span>
        </div>
      )}
      <div style={row}>
        <span>Status:</span>
        <span style={bold}>{ret.status}</span>
      </div>

      <Divider dashed />

      {/* Items header */}
      <div style={{ display: 'flex', fontSize: '13px' }}>
        <span style={{ flex: 1, ...bold }}>ITEM</span>
        <span style={{ width: '40px', textAlign: 'right', ...bold }}>QTY</span>
        <span style={{ width: '75px', textAlign: 'right', ...bold }}>PRICE</span>
        <span style={{ width: '80px', textAlign: 'right', ...bold }}>TOTAL</span>
      </div>

      <Divider />

      {lines.map((line, i) => {
        const qty   = parseFloat(line.quantity);
        const price = parseFloat(line.unit_price);
        return (
          <div key={i} style={{ marginBottom: '5px' }}>
            <div style={{ ...bold, fontSize: '14px' }}>{line.Product?.name || '—'}</div>
            {line.reason && (
              <div style={{ fontSize: '12px', color: '#555' }}>{REASON_LABEL[line.reason] || line.reason}</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <span style={{ width: '40px', textAlign: 'right' }}>{qty}</span>
              <span style={{ width: '75px', textAlign: 'right' }}>{fmtAmt(price)}</span>
              <span style={{ width: '80px', textAlign: 'right', ...bold }}>{fmtAmt(qty * price)}</span>
            </div>
          </div>
        );
      })}

      <Divider />

      <div style={{ ...row, ...bold, fontSize: '16px' }}>
        <span>TOTAL RETURN</span>
        <span>LKR {fmtAmt(totalValue)}</span>
      </div>

      {ret.notes && (
        <>
          <Divider dashed />
          <div style={{ fontSize: '12px' }}>Note: {ret.notes}</div>
        </>
      )}

      <Divider dashed />

      {/* Signatures */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '12px' }}>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <div style={{ borderTop: '1px solid #000', paddingTop: '3px' }}>Sales Rep</div>
        </div>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <div style={{ borderTop: '1px solid #000', paddingTop: '3px' }}>Customer</div>
        </div>
      </div>

      <div style={{ ...center, fontSize: '12px', color: '#333', marginTop: '8px' }}>
        {new Date().toLocaleString('en-LK')}
      </div>
      <div style={{ ...center, fontSize: '12px', color: '#333' }}>Computer generated document</div>

    </div>
  );
}
