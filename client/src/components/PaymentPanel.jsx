import { useState } from 'react';
import { Alert, Button, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../services/api.js';
import { formatMoney } from '../utils/format.js';

function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load the Razorpay checkout script.'));
    document.body.appendChild(s);
  });
}

/**
 * Handles the payment step for a Pending booking.
 * Razorpay mode: opens the real checkout, then the server verifies the signature.
 * Sandbox mode (no Razorpay keys): shows clearly-labelled simulate buttons. No real money moves.
 */
export default function PaymentPanel({ booking, onUpdated }) {
  const [phase, setPhase] = useState('idle'); // idle | working | sandbox | paid | failed
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState(booking);

  const finish = (b) => { setResult(b); setPhase('paid'); onUpdated?.(b); };

  const fail = async (msg) => {
    setError(msg);
    setPhase('failed');
    try { await api.post('/payments/failed', { bookingId: booking._id }); } catch { /* ignore */ }
    onUpdated?.();
  };

  const start = async () => {
    setError('');
    setPhase('working');
    try {
      const { data: o } = await api.post('/payments/order', { bookingId: booking._id });
      setOrder(o);
      if (o.mode === 'sandbox') return setPhase('sandbox');

      await loadRazorpay();
      const rzp = new window.Razorpay({
        key: o.keyId,
        amount: o.amount,
        currency: o.currency,
        name: 'HotelPro',
        description: `Booking ${o.bookingRef}`,
        order_id: o.orderId,
        handler: async (resp) => {
          setPhase('working');
          try {
            const { data } = await api.post('/payments/verify', { bookingId: booking._id, ...resp });
            finish(data.booking);
          } catch (e) { fail(getErrorMessage(e)); }
        },
        modal: { ondismiss: () => setPhase((p) => (p === 'working' ? 'idle' : p)) },
        theme: { color: '#14213d' },
      });
      rzp.on('payment.failed', (r) => fail(r?.error?.description || 'Payment failed.'));
      rzp.open();
    } catch (e) {
      setError(getErrorMessage(e));
      setPhase('idle');
    }
  };

  const sandbox = async (outcome) => {
    setPhase('working');
    try {
      const { data } = await api.post('/payments/sandbox/confirm', { bookingId: booking._id, outcome });
      if (outcome === 'failed') { setError('Sandbox payment marked as failed.'); setPhase('failed'); onUpdated?.(); }
      else finish(data.booking);
    } catch (e) { setError(getErrorMessage(e)); setPhase('sandbox'); }
  };

  if (phase === 'paid') {
    return (
      <div className="text-center py-3">
        <div className="display-6 text-success">&#10003;</div>
        <h5>Booking confirmed</h5>
        <p className="mb-1">Reference: <strong>{result.bookingId}</strong></p>
        {order?.sandbox && <p className="small text-warning-emphasis">Sandbox payment: no real money was charged.</p>}
        <Link to="/my-bookings" className="btn btn-gold mt-2">View My Bookings</Link>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2">Amount due: <strong>{formatMoney(booking.totalAmount)}</strong></p>
      {phase === 'sandbox' && (
        <Alert variant="warning" className="small">
          <strong>SANDBOX MODE.</strong> No payment gateway is configured, so this is a simulation. No real transaction takes place.
          Add Razorpay keys in <code>server/.env</code> to accept real payments.
        </Alert>
      )}
      {error && <Alert variant="danger" className="small">{error}</Alert>}
      {phase === 'sandbox' ? (
        <div className="d-flex gap-2 flex-wrap">
          <Button variant="success" onClick={() => sandbox('success')}>Simulate successful payment</Button>
          <Button variant="outline-danger" onClick={() => sandbox('failed')}>Simulate failed payment</Button>
        </div>
      ) : (
        <Button className="btn-gold" onClick={start} disabled={phase === 'working'}>
          {phase === 'working' ? <><Spinner size="sm" className="me-2" />Processing...</> : phase === 'failed' ? 'Try payment again' : 'Pay now'}
        </Button>
      )}
      <p className="small text-muted mt-3 mb-0">Your room is held while you complete payment. Unpaid bookings are released automatically.</p>
    </div>
  );
}
