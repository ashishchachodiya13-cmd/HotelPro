import { useState } from 'react';
import { Alert, Button, Modal } from 'react-bootstrap';
import api, { getErrorMessage } from '../services/api.js';
import { formatDate, formatMoney } from '../utils/format.js';
import PaymentPanel from './PaymentPanel.jsx';

/** Step 1: review the stay. Step 2: create the (held) booking, then pay. */
export default function BookingModal({ room, arrival, departure, guests, nights, onClose, onChanged }) {
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Display-only estimate. The server recalculates the real price from the room record.
  const estimate = room.pricePerNight * nights;

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/bookings', { roomId: room._id, arrivalDate: arrival, departureDate: departure, guests });
      setBooking(data.booking);
      onChanged?.();
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setBusy(false); }
  };

  return (
    <Modal show onHide={onClose} centered backdrop="static">
      <Modal.Header closeButton><Modal.Title>{booking ? 'Payment' : 'Review your booking'}</Modal.Title></Modal.Header>
      <Modal.Body>
        <h5>{room.name}</h5>
        <dl className="row small mb-3">
          <dt className="col-5">Arrival</dt><dd className="col-7">{formatDate(arrival)}</dd>
          <dt className="col-5">Departure</dt><dd className="col-7">{formatDate(departure)}</dd>
          <dt className="col-5">Nights</dt><dd className="col-7">{nights}</dd>
          <dt className="col-5">Guests</dt><dd className="col-7">{guests}</dd>
          <dt className="col-5">Rate</dt><dd className="col-7">{formatMoney(room.pricePerNight)} / night</dd>
          <dt className="col-5">Total</dt><dd className="col-7 fw-bold">{formatMoney(booking ? booking.totalAmount : estimate)}</dd>
        </dl>
        {error && <Alert variant="danger" className="small">{error}</Alert>}
        {booking ? (
          <PaymentPanel booking={booking} onUpdated={() => onChanged?.()} />
        ) : (
          <>
            <p className="small text-muted">Free cancellation up to 48 hours before arrival. Rooms are held for a few minutes while you pay.</p>
            <div className="d-flex gap-2 justify-content-end">
              <Button variant="outline-secondary" onClick={onClose}>Back</Button>
              <Button className="btn-gold" onClick={confirm} disabled={busy}>{busy ? 'Reserving...' : 'Confirm & continue to payment'}</Button>
            </div>
          </>
        )}
      </Modal.Body>
    </Modal>
  );
}
