import { useCallback, useEffect, useState } from 'react';
import { Alert, Card, Col, Container, Row, Tab, Tabs } from 'react-bootstrap';
import api, { getErrorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatMoney } from '../utils/format.js';
import BookingsTab from '../components/admin/BookingsTab.jsx';
import RoomsTab from '../components/admin/RoomsTab.jsx';
import AddRoomTab from '../components/admin/AddRoomTab.jsx';
import UsersTab from '../components/admin/UsersTab.jsx';

export default function AdminHome() {
  const { user } = useAuth();
  const [key, setKey] = useState('bookings');
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [roomsVersion, setRoomsVersion] = useState(0); // bump to make the rooms tab refetch

  const loadStats = useCallback(() => {
    api.get('/admin/stats').then((r) => setStats(r.data)).catch((e) => setError(getErrorMessage(e)));
  }, []);
  useEffect(() => { loadStats(); }, [loadStats, key]);

  const onRoomSaved = () => { setRoomsVersion((v) => v + 1); loadStats(); setKey('rooms'); };

  return (
    <Container className="py-4">
      <div className="admin-banner mb-4">
        <h2 className="mb-0">Hi, {user.name}</h2>
        <span className="opacity-75">HotelPro administrator dashboard</span>
      </div>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {stats && (
        <Row className="g-3 mb-4">
          {[['Bookings', stats.bookings], ['Rooms', stats.rooms], ['Users', stats.users], ['Paid revenue', formatMoney(stats.revenue)]].map(([l, v]) => (
            <Col xs={6} md={3} key={l}><Card className="stat-card"><Card.Body><div className="text-muted small">{l}</div><div className="fs-4 fw-semibold">{v}</div></Card.Body></Card></Col>
          ))}
        </Row>
      )}
      <Tabs activeKey={key} onSelect={(k) => setKey(k)} className="mb-3 admin-tabs" mountOnEnter unmountOnExit>
        <Tab eventKey="bookings" title="All Bookings"><BookingsTab /></Tab>
        <Tab eventKey="rooms" title="All Rooms"><RoomsTab version={roomsVersion} onChanged={loadStats} /></Tab>
        <Tab eventKey="add" title="Add Room"><AddRoomTab onSaved={onRoomSaved} /></Tab>
        <Tab eventKey="users" title="All Users"><UsersTab /></Tab>
      </Tabs>
    </Container>
  );
}
