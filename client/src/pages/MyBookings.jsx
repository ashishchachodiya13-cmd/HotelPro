import { useCallback, useEffect, useState } from 'react';
import { Alert, Card, Col, Container, Modal, Row, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaBed } from 'react-icons/fa';
import api, { getErrorMessage } from '../services/api.js';
import { formatDate, formatDateTime, formatMoney, imageUrl } from '../utils/format.js';
import Loading from '../components/Loading.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import PaymentPanel from '../components/PaymentPanel.jsx';

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [paying, setPaying] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const load = useCallback(async () => {
    try { setBookings((await api.get('/bookings/my')).data.bookings); setError(''); }
    catch (e) { setError(getErrorMessage(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const cancel = async (b) => {
    const msg = b.refundEligible || b.paymentStatus !== 'Paid'
      ? 'Cancel this booking?'
      : `This booking starts in less than ${b.freeCancelHours} hours, so it is NOT eligible for a refund. Cancel anyway?`;
    if (!window.confirm(msg)) return;
    setCancellingId(b._id);
    setNotice('');
    try {
      const { data } = await api.patch(`/bookings/${b._id}/cancel`);
      setNotice(`${data.message}${data.booking.refundNote ? ' ' + data.booking.refundNote : ''}`);
      await load();
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setCancellingId(null); }
  };

  return (
    <Container className="py-4">
      <h2 className="mb-3">My Bookings</h2>
      {notice && <Alert variant="success" dismissible onClose={() => setNotice('')}>{notice}</Alert>}
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {loading ? <Loading /> : bookings.length === 0 ? (
        <Alert variant="info">You have no bookings yet. <Link to="/rooms">Browse rooms</Link> to plan your stay.</Alert>
      ) : (
        <Row className="g-3">
          {bookings.map((b) => {
            const img = imageUrl(b.room?.images?.[0]);
            return (
              <Col xs={12} key={b._id}>
                <Card className="booking-card">
                  <Row className="g-0">
                    <Col md={3}>
                      {img ? <img src={img} alt={b.room?.name} className="booking-img" /> : <div className="booking-img room-img-placeholder"><FaBed size={32} /></div>}
                    </Col>
                    <Col md={9}>
                      <Card.Body>
                        <div className="d-flex flex-wrap justify-content-between gap-2">
                          <div>
                            <h5 className="mb-0">{b.room?.name || 'Room'}</h5>
                            <small className="text-muted">Booking ID: {b.bookingId}</small>
                          </div>
                          <div className="d-flex gap-2 align-items-start">
                            <StatusBadge value={b.bookingStatus} />
                            <StatusBadge value={b.paymentStatus} />
                          </div>
                        </div>
                        <Row className="small mt-3 gy-1">
                          <Col sm={6} lg={3}><strong>Arrival</strong><br />{formatDate(b.arrivalDate)}</Col>
                          <Col sm={6} lg={3}><strong>Departure</strong><br />{formatDate(b.departureDate)}</Col>
                          <Col sm={6} lg={2}><strong>Nights</strong><br />{b.nights}</Col>
                          <Col sm={6} lg={4}><strong>Total</strong><br />{formatMoney(b.totalAmount)}</Col>
                          <Col sm={6} lg={3}><strong>Phone</strong><br />{b.phone}</Col>
                          <Col sm={6} lg={3}><strong>Booked on</strong><br />{formatDateTime(b.createdAt)}</Col>
                        </Row>
                        {b.refundNote && <p className="small text-muted mt-2 mb-0">{b.refundNote}</p>}
                        {b.cancelReason && b.bookingStatus === 'Cancelled' && <p className="small text-muted mb-0">{b.cancelReason}</p>}
                        <div className="mt-3 d-flex gap-2">
                          {b.canPay && <Button size="sm" className="btn-gold" onClick={() => setPaying(b)}>Pay now</Button>}
                          {b.canCancel && (
                            <Button size="sm" variant="outline-danger" disabled={cancellingId === b._id} onClick={() => cancel(b)}>
                              {cancellingId === b._id ? 'Cancelling...' : 'Cancel booking'}
                            </Button>
                          )}
                        </div>
                      </Card.Body>
                    </Col>
                  </Row>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      <Modal show={!!paying} onHide={() => { setPaying(null); load(); }} centered>
        <Modal.Header closeButton><Modal.Title>Complete payment</Modal.Title></Modal.Header>
        <Modal.Body>{paying && <PaymentPanel booking={paying} onUpdated={load} />}</Modal.Body>
      </Modal>
    </Container>
  );
}
