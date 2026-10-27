import { Col, Container, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="hotelpro-footer mt-auto">
      <Container>
        <Row className="gy-4">
          <Col md={4}>
            <h5 className="brand">HotelPro</h5>
            <p className="small mb-0">Comfortable rooms, simple booking, friendly service.</p>
          </Col>
          <Col md={4}>
            <h6>Quick links</h6>
            <ul className="list-unstyled small mb-0">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/rooms">Rooms</Link></li>
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/signup">Sign Up</Link></li>
            </ul>
          </Col>
          <Col md={4}>
            <h6>Contact</h6>
            <ul className="list-unstyled small mb-0">
              <li>Email: stay@hotelpro.example</li>
              <li>Phone: +91 00000 00000</li>
              <li className="mt-2">Cancellation: free up to 48 hours before arrival.</li>
              <li>Privacy Policy &middot; Terms of Stay</li>
            </ul>
          </Col>
        </Row>
        <hr />
        <p className="text-center small mb-0">&copy; {new Date().getFullYear()} HotelPro. All rights reserved.</p>
      </Container>
    </footer>
  );
}
