// Generic status map — context-specific maps below for collision resolution
const STATUS_MAP = {
  // Invoice / Order
  DRAFT: 'badge-gray',
  POSTED: 'badge-blue',
  PAID: 'badge-green',
  PARTIAL: 'badge-yellow',
  OVERDUE: 'badge-red',
  CANCELLED: 'badge-red',
  CONFIRMED: 'badge-blue',
  // PO / GRN
  APPROVED: 'badge-blue',
  // Delivery
  PENDING: 'badge-yellow',
  DISPATCHED: 'badge-blue',
  DELIVERED: 'badge-green',
  RETURNED: 'badge-amber',
  // Loading Sheet
  LOADED: 'badge-purple',
  CLOSED: 'badge-green',
  // Cheque (these mirror RECEIVED / DEPOSITED etc.)
  DEPOSITED: 'badge-blue',
  CLEARED: 'badge-green',
  BOUNCED: 'badge-red',
  // Boolean
  true: 'badge-green',
  false: 'badge-gray',
};

// Context-specific overrides for keys that clash across domains
const CONTEXT_MAP = {
  cheque: { RECEIVED: 'badge-yellow' },
  grn: { RECEIVED: 'badge-green' },
};

const LABEL_MAP = {
  DRAFT: 'Draft', POSTED: 'Posted', PAID: 'Paid', PARTIAL: 'Partial',
  OVERDUE: 'Overdue', CANCELLED: 'Cancelled', CONFIRMED: 'Confirmed',
  APPROVED: 'Approved', RECEIVED: 'Received',
  PENDING: 'Pending', DISPATCHED: 'Dispatched', DELIVERED: 'Delivered', RETURNED: 'Returned',
  LOADED: 'Loaded', CLOSED: 'Closed',
  DEPOSITED: 'Deposited', CLEARED: 'Cleared', BOUNCED: 'Bounced',
  true: 'Active', false: 'Inactive',
};

export default function StatusBadge({ status, context }) {
  const contextOverride = context && CONTEXT_MAP[context] ? CONTEXT_MAP[context][status] : null;
  const cls = contextOverride || STATUS_MAP[status] || 'badge-gray';
  const label = LABEL_MAP[status] !== undefined ? LABEL_MAP[status] : String(status);
  return <span className={cls}>{label}</span>;
}
