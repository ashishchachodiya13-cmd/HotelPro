import { useState } from 'react';
import { Alert, Button, Card, Container, Form } from 'react-bootstrap';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, homeFor } from '../context/AuthContext.jsx';
import { getErrorMessage } from '../services/api.js';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (user) return <Navigate to={homeFor(user)} replace />;

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) errs.email = 'Enter a valid email address.';
    if (!form.password) errs.password = 'Password is required.';
    setErrors(errs);
    setServerError('');
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const u = await login(form.email, form.password);
      const from = location.state?.from;
      navigate(u.role === 'admin' ? '/adminhome' : from && from !== '/adminhome' ? from : '/userhome', { replace: true });
    } catch (err) { setServerError(getErrorMessage(err)); }
    finally { setBusy(false); }
  };

  return (
    <Container className="auth-wrap">
      <Card className="auth-card shadow-sm">
        <Card.Body>
          <h2 className="text-center mb-4">Welcome back</h2>
          {serverError && <Alert variant="danger">{serverError}</Alert>}
          <Form onSubmit={submit} noValidate>
            <Form.Group className="mb-3" controlId="email">
              <Form.Label>Email</Form.Label>
              <Form.Control name="email" type="email" autoComplete="email" value={form.email} onChange={onChange} isInvalid={!!errors.email} />
              <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-4" controlId="password">
              <Form.Label>Password</Form.Label>
              <div className="d-flex gap-2 align-items-start">
                <Form.Control name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={onChange} isInvalid={!!errors.password} />
                <Button type="button" variant="outline-secondary" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>
                  {showPassword ? 'Hide' : 'Show'}
                </Button>
              </div>
              <Form.Control.Feedback type="invalid">{errors.password}</Form.Control.Feedback>
            </Form.Group>
            <Button type="submit" className="btn-gold w-100" disabled={busy}>{busy ? 'Signing in...' : 'Login'}</Button>
          </Form>
          <p className="text-center mt-3 mb-0 small">New to HotelPro? <Link to="/signup">Create an account</Link></p>
        </Card.Body>
      </Card>
    </Container>
  );
}