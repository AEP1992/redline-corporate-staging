const statusStyles = {
  PASS: 'bg-green-100 text-green-800',
  Active: 'bg-green-100 text-green-800',
  REPAIR: 'bg-amber-100 text-amber-800',
  OOS: 'bg-orange-100 text-orange-800',
  EXPIRED: 'bg-red-100 text-red-800',
  UNKNOWN: 'bg-gray-100 text-gray-600',
  'Non-Compliant': 'bg-red-100 text-red-800',
  Compliant: 'bg-green-100 text-green-800',
};

export default function StatusBadge({ status }) {
  const style = statusStyles[status] || statusStyles.UNKNOWN;
  return (
    <span className={`status-badge ${style}`} data-testid={`status-${status}`}>
      {status}
    </span>
  );
}
