import { Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <Container className="text-center py-5">
      <h1 className="display-4">404</h1>
      <p>We could not find that page.</p>
      <Link to="/" className="btn btn-gold">Back to home</Link>
    </Container>
  );
}
