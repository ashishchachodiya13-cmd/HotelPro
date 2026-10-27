import { useCallback, useEffect, useState } from 'react';
import { Alert, Col, Form, Row, Table } from 'react-bootstrap';
import api, { getErrorMessage } from '../../services/api.js';
import { formatDate, formatMoney } from '../../utils/format.js';
import Loading from '../Loading.jsx';
import StatusBadge from '../StatusBadge.jsx';

export default function BookingsTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/bookings', { params: { q: q || undefined, status: status || undefined, paymentStatus: paymentStatus || undefined } });
      setRows(data.bookings); setError('');
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setLoading(false); }
  }, [q, status, paymentStatus]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]); // debounce search typing

  return (
    <>
      <Row className="g-2 mb-3">
        <Col md={5}><Form.Control placeholder="Search booking ID, customer name or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search bookings" /></Col>
        <Col md={3}>
          <Form.Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Booking status">
            <option value="">All booking statuses</option>
            {['Pending', 'Confirmed', 'Cancelled', 'Completed'].map((s) => <option key={s}>{s}</option>)}
          </Form.Select>
        </Col>
        <Col md={4}>
          <Form.Select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} aria-label="Payment status">
            <option value="">All payment statuses</option>
            {['Pending', 'Paid', 'Failed', 'Refunded'].map((s) => <option key={s}>{s}</option>)}
          </Form.Select>
        </Col>
      </Row>
      {error && <Alert variant="danger">{error}</Alert>}
      {loading ? <Loading /> : rows.length === 0 ? <Alert variant="info">No bookings match your filters.</Alert> : (
        <Table responsive hover className="align-middle bg-white">
          <thead><tr><th>Booking ID</th><th>Customer</th><th>Room</th><th>Arrival</th><th>Departure</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b._id}>
                <td className="small">{b.bookingId}</td>
                <td>{b.user?.name || '-'}<div className="small text-muted">{b.user?.email}</div></td>
                <td>{b.room?.name || '-'}</td>
                <td>{formatDate(b.arrivalDate)}</td>
                <td>{formatDate(b.departureDate)}</td>
                <td>{formatMoney(b.totalAmount)}</td>
                <td><StatusBadge value={b.paymentStatus} /></td>
                <td><StatusBadge value={b.bookingStatus} /></td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
