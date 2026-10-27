import { useEffect, useState } from 'react';
import { Alert, Button, Col, Container, Row } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import RoomCard from '../components/RoomCard.jsx';
import Loading from '../components/Loading.jsx';

export default function UserHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/rooms', { params: { limit: 6 } })
      .then((r) => setRooms(r.data.rooms))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Container className="py-4">
      <div className="welcome-banner mb-4">
        <h2>Hi, {user.name}</h2>
        <p className="mb-3">Ready for your next stay? Check availability for your dates in a few clicks.</p>
        <div className="d-flex gap-2 flex-wrap">
          <Button className="btn-gold" onClick={() => navigate('/rooms')}>Search rooms</Button>
          <Link to="/my-bookings" className="btn btn-outline-light">My Bookings</Link>
        </div>
      </div>
      <h4 className="mb-3">Featured rooms</h4>
      {error && <Alert variant="danger">{error}</Alert>}
      {loading ? <Loading /> : rooms.length === 0 ? <Alert variant="info">No rooms are available yet.</Alert> : (
        <Row className="g-4">
          {rooms.map((r) => <Col md={6} lg={4} key={r._id}><RoomCard room={r} actionLabel="Choose dates" onBook={() => navigate('/rooms')} /></Col>)}
        </Row>
      )}
    </Container>
  );
}
