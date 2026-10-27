import { useEffect, useState } from 'react';
import { Button, Carousel, Col, Container, Row } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import RoomCard from '../components/RoomCard.jsx';
import Loading from '../components/Loading.jsx';

// To use real hotel photos: put images in src/assets and set `image` (e.g. import hero1 from '../assets/hero1.jpg').
// Without an image the slide shows a gradient, so the page always looks intentional.
const SLIDES = [
  { title: 'Welcome to HotelPro', text: 'Comfortable rooms, effortless booking and a stay you will remember.', image: null, className: 'hero-1' },
  { title: 'Rooms for every journey', text: 'From cosy standard rooms to family suites, find the space that fits.', image: null, className: 'hero-2' },
  { title: 'Book in minutes', text: 'Pick your dates, see live availability and pay securely online.', image: null, className: 'hero-3' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { hash } = useLocation();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api.get('/rooms', { params: { limit: 3 } })
      .then((r) => setRooms(r.data.rooms))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (hash) document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
  }, [hash, loading]);

  return (
    <>
      <Carousel fade indicators controls interval={5500} className="hero">
        {SLIDES.map((s) => (
          <Carousel.Item key={s.title}>
            <div className={`hero-slide ${s.className}`} style={s.image ? { backgroundImage: `linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,.45)), url(${s.image})` } : undefined}>
              <Container>
                <h1>{s.title}</h1>
                <p className="lead">{s.text}</p>
                <div className="d-flex gap-2 flex-wrap justify-content-center">
                  <Button className="btn-gold btn-lg" onClick={() => navigate('/rooms')}>Book Your Stay</Button>
                  <Button variant="outline-light" size="lg" onClick={() => navigate('/rooms')}>Explore Rooms</Button>
                </div>
              </Container>
            </div>
          </Carousel.Item>
        ))}
      </Carousel>

      <section id="about" className="py-5">
        <Container>
          <Row className="align-items-center gy-3">
            <Col md={6}>
              <h2>About HotelPro</h2>
              <p>HotelPro is a hotel booking and management platform. Guests can browse rooms, check live availability for their dates, pay securely and manage their reservations. Hotel staff get one dashboard for rooms, bookings and guests.</p>
            </Col>
            <Col md={6}>
              <Row className="text-center g-3">
                {[['Live availability', 'No double bookings'], ['Secure payments', 'Verified server-side'], ['Easy changes', 'Cancel from your account']].map(([t, d]) => (
                  <Col key={t} xs={4}><div className="feature-box"><strong>{t}</strong><div className="small text-muted">{d}</div></div></Col>
                ))}
              </Row>
            </Col>
          </Row>
        </Container>
      </section>

      <section className="py-5 bg-light">
        <Container>
          <div className="d-flex justify-content-between align-items-end mb-3">
            <h2 className="mb-0">Featured rooms</h2>
            <Link to="/rooms">View all rooms</Link>
          </div>
          {loading ? <Loading /> : failed ? (
            <p className="text-muted">Rooms could not be loaded right now. Please try again shortly.</p>
          ) : rooms.length === 0 ? (
            <p className="text-muted">Rooms will appear here once they are added.</p>
          ) : (
            <Row className="g-4">
              {rooms.map((r) => <Col md={6} lg={4} key={r._id}><RoomCard room={r} actionLabel="View & Book" onBook={() => navigate('/rooms')} /></Col>)}
            </Row>
          )}
        </Container>
      </section>
    </>
  );
}
