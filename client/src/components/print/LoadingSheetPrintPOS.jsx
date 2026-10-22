import { fmtCurrency, fmtDate } from '../../utils/format';

const W   = '76mm';
const bold = { fontWeight: '700' };
const mono = { fontFamily: 'monospace' };

function Divider({ dashed }) {
  return (
    <div style={{
      borderTop: dashed ? '1px dashed #999' : '1px solid #333',
      margin: '4px 0',
    }} />
  );
}

export default function LoadingSheetPrintPOS({ sheet, company }) {
  if (!sheet) return null;

  const lines      = sheet.Lines || [];
  const totalValue = lines.reduce((s, l) => s + parseFloat(l.loaded_quantity || 0) * parseFloat(l.unit_cost || 0), 0);

  return (
    <div style={{ width: W, fontFamily: 'Arial, sans-serif', fontSize: '17px', color: '#000', background: '#fff', padding: '4px 4px 8px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '4px' }}>
        {company?.logo_url && (
          <img src={company.logo_url} alt="logo" style={{ height: '40px', marginBottom: '4px' }} />
        )}
        <div style={{ fontSize: '20px', ...bold }}>{company?.name || 'Lanka Distribution'}</div>
        {company?.address && <div style={{ fontSize: '15px', color: '#555' }}>{company.address}</div>}
        {company?.phone   && <div style={{ fontSize: '15px', color: '#555' }}>{company.phone}</div>}
      </div>

      <Divider />
      <div style={{ textAlign: 'center', fontSize: '18px', ...bold, letterSpacing: '1px' }}>LOADING SHEET</div>
      <div style={{ textAlign: 'center', fontSize: '16px', ...bold }}>{sheet.sheet_number}</div>
      <div style={{ textAlign: 'center', fontSize: '15px', color: '#555' }}>{fmtDate(sheet.sheet_date)}</div>
      <Divider />

      {/* Trip details */}
      <div style={{ fontSize: '15px', marginBottom: '2px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#555' }}>Sales Rep</span>
          <span style={{ ...bold }}>{sheet.SalesRep?.name || '—'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#555' }}>Driver</span>
          <span style={{ ...bold }}>{sheet.Driver?.name || '—'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#555' }}>Route</span>
          <span style={{ ...bold }}>{sheet.Route?.name || '—'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#555' }}>Vehicle</span>
          <span style={{ ...bold }}>{sheet.vehicle_number || '—'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#555' }}>Warehouse</span>
          <span style={{ ...bold }}>{sheet.Warehouse?.name || '—'}</span>
        </div>
      </div>

      <Divider />

      {/* Column headers */}
      <div style={{ display: 'flex', fontSize: '14px', color: '#555', marginBottom: '2px' }}>
        <span style={{ flex: 1 }}>Product</span>
        <span style={{ width: '32px', textAlign: 'right' }}>Ld</span>
        <span style={{ width: '32px', textAlign: 'right' }}>Sd</span>
        <span style={{ width: '32px', textAlign: 'right' }}>Rt</span>
      </div>
      <Divider dashed />

      {/* Items */}
      {lines.map((line, i) => (
        <div key={line.id || i} style={{ marginBottom: '3px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <span style={{ flex: 1, fontSize: '16px', ...bold }}>{line.Product?.name || '—'}</span>
            <span style={{ width: '32px', textAlign: 'right', fontSize: '16px' }}>
              {parseInt(line.loaded_quantity || 0)}
            </span>
            <span style={{ width: '32px', textAlign: 'right', fontSize: '16px', color: '#16a34a' }}>
              {parseInt(line.sold_quantity || 0)}
            </span>
            <span style={{ width: '32px', textAlign: 'right', fontSize: '16px', color: '#d97706' }}>
              {parseInt(line.returned_quantity || 0)}
            </span>
          </div>
        </div>
      ))}

      <Divider />

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '17px', ...bold }}>
        <span>Total Load Value</span>
        <span style={{ ...mono }}>{fmtCurrency(totalValue)}</span>
      </div>
      {sheet.total_sales_amount > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '17px', ...bold }}>
          <span>Total Sales</span>
          <span style={{ ...mono }}>{fmtCurrency(sheet.total_sales_amount)}</span>
        </div>
      )}

      <Divider />
      <div style={{ textAlign: 'center', fontSize: '13px', color: '#aaa', marginTop: '4px' }}>
        {new Date().toLocaleString('en-LK')}
      </div>
    </div>
  );
}
