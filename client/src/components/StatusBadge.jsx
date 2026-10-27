import { Badge } from 'react-bootstrap';

const COLORS = {
  Confirmed: 'success', Paid: 'success', Completed: 'primary',
  Pending: 'warning', Failed: 'danger', Cancelled: 'secondary', Refunded: 'info',
};

export default function StatusBadge({ value }) {
  return <Badge bg={COLORS[value] || 'secondary'} text={['warning', 'info'].includes(COLORS[value]) ? 'dark' : undefined}>{value}</Badge>;
}
