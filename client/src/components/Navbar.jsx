import { Container, Nav, Navbar as BsNavbar } from 'react-bootstrap';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { FaHotel } from 'react-icons/fa';
import { useAuth, homeFor } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <BsNavbar expand="lg" className="hotelpro-nav" variant="dark" sticky="top">
      <Container>
        <BsNavbar.Brand as={Link} to="/" className="brand"><FaHotel className="me-2" />HotelPro</BsNavbar.Brand>
        <BsNavbar.Toggle aria-controls="main-nav" />
        <BsNavbar.Collapse id="main-nav">
          <Nav className="me-auto">
            <Nav.Link as={NavLink} to="/" end>Home</Nav.Link>
            <Nav.Link as={NavLink} to="/rooms">Rooms</Nav.Link>
            <Nav.Link as={Link} to="/#about">About</Nav.Link>
            {user?.role === 'customer' && <Nav.Link as={NavLink} to="/my-bookings">My Bookings</Nav.Link>}
          </Nav>
          <Nav className="align-items-lg-center gap-lg-2">
            {user ? (
              <>
                <Nav.Link as={Link} to={homeFor(user)}>{user.role === 'admin' ? 'Admin Dashboard' : 'Dashboard'}</Nav.Link>
                <span className="text-white-50 small d-none d-lg-inline">Hi, {user.name.split(' ')[0]}</span>
                <button className="btn btn-outline-light btn-sm" onClick={onLogout}>Logout</button>
              </>
            ) : (
              <>
                <Nav.Link as={NavLink} to="/login">Login</Nav.Link>
                <Link className="btn btn-gold btn-sm" to="/signup">Sign Up</Link>
              </>
            )}
          </Nav>
        </BsNavbar.Collapse>
      </Container>
    </BsNavbar>
  );
}
