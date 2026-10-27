import { useState } from 'react';
import { Alert, Button, Card, Container, Form } from 'react-bootstrap';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth, homeFor } from '../context/AuthContext.jsx';
import { getErrorMessage, getFieldErrors } from '../services/api.js';

function validate(f) {
  const e = {};
  if (f.name.trim().length < 2) e.name = 'Full name is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email)) e.email = 'Enter a valid email address.';
  if (!/^\+?[0-9]{10,15}$/.test(f.phone.replace(/[\s-]/g, ''))) e.phone = 'Enter a valid phone number (10-15 digits).';
  if (f.password.length < 8 || !/[a-z]/.test(f.password) || !/[A-Z]/.test(f.password) || !/[0-9]/.test(f.password))
    e.password = 'At least 8 characters with upper-case, lower-case and a number.';
  if (f.password !== f.confirmPassword) e.confirmPassword = 'Passwords do not match.';
  return e;
}

export default function SignUp() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (user) return <Navigate to={homeFor(user)} replace />;

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    setServerError('');
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await register(form);
      navigate('/login', { replace: true });
    } catch (err) {
      setErrors(getFieldErrors(err));
      setServerError(getErrorMessage(err));
    } finally { setBusy(false); }
  };

  const field = (name, label, props = {}) => (
    <Form.Group className="mb-3" controlId={name}>
      <Form.Label>{label}</Form.Label>
      <Form.Control name={name} value={form[name]} onChange={onChange} isInvalid={!!errors[name]} {...props} />
      <Form.Control.Feedback type="invalid">{errors[name]}</Form.Control.Feedback>
    </Form.Group>
  );

  return (
    <Container className="auth-wrap">
      <Card className="auth-card shadow-sm">
        <Card.Body>
          <h2 className="text-center mb-4">Create your account</h2>
          {serverError && <Alert variant="danger">{serverError}</Alert>}
          <Form onSubmit={submit} noValidate>
            {field('name', 'Full name', { autoComplete: 'name' })}
            {field('email', 'Email', { type: 'email', autoComplete: 'email' })}
            {field('phone', 'Phone number', { type: 'tel', autoComplete: 'tel' })}
            <Form.Group className="mb-3" controlId="password">
              <Form.Label>Password</Form.Label>
              <div className="d-flex gap-2 align-items-start">
                <Form.Control name="password" value={form.password} onChange={onChange} type={showPassword ? 'text' : 'password'} autoComplete="new-password" isInvalid={!!errors.password} />
                <Button type="button" variant="outline-secondary" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>
                  {showPassword ? 'Hide' : 'Show'}
                </Button>
              </div>
              <Form.Control.Feedback type="invalid">{errors.password}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3" controlId="confirmPassword">
              <Form.Label>Confirm password</Form.Label>
              <div className="d-flex gap-2 align-items-start">
                <Form.Control name="confirmPassword" value={form.confirmPassword} onChange={onChange} type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" isInvalid={!!errors.confirmPassword} />
                <Button type="button" variant="outline-secondary" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'} aria-pressed={showConfirmPassword}>
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </Button>
              </div>
              <Form.Control.Feedback type="invalid">{errors.confirmPassword}</Form.Control.Feedback>
            </Form.Group>
            <Button type="submit" className="btn-gold w-100" disabled={busy}>{busy ? 'Creating account...' : 'Sign Up'}</Button>
          </Form>
          <p className="text-center mt-3 mb-0 small">Already registered? <Link to="/login">Login</Link></p>
        </Card.Body>
      </Card>
    </Container>
  );
}
