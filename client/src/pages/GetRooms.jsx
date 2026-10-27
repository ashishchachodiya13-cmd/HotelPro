import { useEffect, useState } from 'react';
import { Alert, Button, Col, Container, Form, Row } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { isoDay } from '../utils/format.js';
import RoomCard from '../components/RoomCard.jsx';
import Loading from '../components/Loading.jsx';
import BookingModal from '../components/BookingModal.jsx';

export default function GetRooms() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [arrival, setArrival] = useState(isoDay(0));
  const [departure, setDeparture] = useState(isoDay(1));
  const [guests, setGuests] = useState(1);
  const [rooms, setRooms] = useState([]);
  const [searched, setSearched] = useState(null); // { arrival, departure, nights, guests } after a search
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try { setRooms((await api.get('/rooms')).data.rooms); setSearched(null); }
    catch (e) { setError(getErrorMessage(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  const search = async (e) => {
    e?.preventDefault();
    setError('');
    if (!arrival || !departure) return setError('Please choose both arrival and departure dates.');
    if (departure <= arrival) return setError('Departure must be later than arrival.');
    setLoading(true);
    try {
      const { data } = await api.get('/rooms/availability', { params: { arrival, departure, guests } });
      setRooms(data.rooms);
      setSearched({ arrival, departure, nights: data.nights, guests: Number(guests) });
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  };

  const onBook = (room) => {
    if (!user) return navigate('/login', { state: { from: location.pathname } });
    if (user.role === 'admin') return setError('Administrator accounts cannot make bookings. Use a customer account.');
    if (!searched) return setError('Choose your dates and press "Search availability" first.');
    setSelected(room);
  };

  return (
    <Container className="py-4">
      <h2 className="mb-1">Rooms</h2>
      <p className="text-muted">Choose your dates to see what is available.</p>

      <Form onSubmit={search} className="search-bar mb-4">
        <Row className="g-3 align-items-end">
          <Col md={3} sm={6}>
            <Form.Label htmlFor="arrival">Arrival</Form.Label>
            <Form.Control id="arrival" type="date" min={isoDay(0)} value={arrival}
              onChange={(e) => { setArrival(e.target.value); if (departure <= e.target.value) { const d = new Date(e.target.value); d.setDate(d.getDate() + 1); setDeparture(d.toISOString().slice(0, 10)); } }} />
          </Col>
          <Col md={3} sm={6}>
            <Form.Label htmlFor="departure">Departure</Form.Label>
            <Form.Control id="departure" type="date" min={arrival} value={departure} onChange={(e) => setDeparture(e.target.value)} />
          </Col>
          <Col md={2} sm={6}>
            <Form.Label htmlFor="guests">Guests</Form.Label>
            <Form.Select id="guests" value={guests} onChange={(e) => setGuests(e.target.value)}>
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
            </Form.Select>
          </Col>
          <Col md={4} sm={6} className="d-flex gap-2">
            <Button type="submit" className="btn-gold flex-grow-1">Search availability</Button>
            {searched && <Button variant="outline-secondary" onClick={loadAll}>Clear</Button>}
          </Col>
        </Row>
      </Form>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {searched && <p className="small text-muted">Showing rooms free for all {searched.nights} night(s), {searched.guests} guest(s).</p>}

      {loading ? <Loading label="Finding rooms..." /> : rooms.length === 0 ? (
        <Alert variant="info">{searched ? 'No rooms are available for those dates. Try different dates.' : 'No rooms have been added yet.'}</Alert>
      ) : (
        <Row className="g-4">
          {rooms.map((r) => (
            <Col key={r._id} md={6} lg={4}>
              <RoomCard room={r} onBook={onBook} actionLabel={searched ? 'Book this room' : 'Select dates to book'} />
            </Col>
          ))}
        </Row>
      )}

      {selected && searched && (
        <BookingModal room={selected} arrival={searched.arrival} departure={searched.departure} guests={searched.guests} nights={searched.nights}
          onClose={() => { setSelected(null); search(); }} onChanged={() => {}} />
      )}
    </Container>
  );
}
