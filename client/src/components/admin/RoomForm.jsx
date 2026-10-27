import { useState } from 'react';
import { Alert, Button, Col, Form, Row } from 'react-bootstrap';
import api, { getErrorMessage, getFieldErrors } from '../../services/api.js';
import { imageUrl } from '../../utils/format.js';

/** Shared by Add Room (no `room`) and Edit Room (`room` provided). */
export default function RoomForm({ room, onSaved, onCancel }) {
  const [f, setF] = useState({
    name: room?.name || '',
    description: room?.description || '',
    pricePerNight: room?.pricePerNight ?? '',
    maxOccupancy: room?.maxOccupancy ?? 2,
    inventory: room?.inventory ?? 1,
    amenities: (room?.amenities || []).join(', '),
    isActive: room?.isActive ?? true,
  });
  const [existing, setExisting] = useState(room?.images || []);
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (e) => setF({ ...f, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const pickFiles = (e) => {
    const list = Array.from(e.target.files || []);
    const bad = list.find((x) => !['image/jpeg', 'image/png', 'image/webp'].includes(x.type) || x.size > 5 * 1024 * 1024);
    if (bad) { setErrors({ ...errors, images: 'Images must be JPG, PNG or WEBP and 5 MB or smaller.' }); e.target.value = ''; return; }
    setErrors({ ...errors, images: undefined });
    setFiles(list);
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!f.name.trim()) errs.name = 'Room type is required.';
    if (f.description.trim().length < 10) errs.description = 'Description must be at least 10 characters.';
    if (!(Number(f.pricePerNight) > 0)) errs.pricePerNight = 'Enter a price above 0.';
    if (!(Number.isInteger(Number(f.maxOccupancy)) && f.maxOccupancy >= 1 && f.maxOccupancy <= 10)) errs.maxOccupancy = 'Whole number, 1-10.';
    if (!(Number.isInteger(Number(f.inventory)) && f.inventory >= 1)) errs.inventory = 'Whole number, at least 1.';
    setErrors(errs);
    setServerError('');
    if (Object.keys(errs).length) return;

    const fd = new FormData();
    Object.entries({ ...f, isActive: String(f.isActive) }).forEach(([k, v]) => fd.append(k, v));
    if (room) fd.append('keepImages', JSON.stringify(existing));
    files.forEach((file) => fd.append('images', file));

    setBusy(true);
    try {
      const { data } = room ? await api.put(`/rooms/${room._id}`, fd) : await api.post('/rooms', fd);
      onSaved(data.room);
    } catch (err) { setErrors(getFieldErrors(err)); setServerError(getErrorMessage(err)); }
    finally { setBusy(false); }
  };

  const text = (name, label, props = {}) => (
    <Form.Group className="mb-3" controlId={`room-${name}`}>
      <Form.Label>{label}</Form.Label>
      <Form.Control name={name} value={f[name]} onChange={set} isInvalid={!!errors[name]} {...props} />
      <Form.Control.Feedback type="invalid">{errors[name]}</Form.Control.Feedback>
    </Form.Group>
  );

  return (
    <Form onSubmit={submit} noValidate>
      {serverError && <Alert variant="danger">{serverError}</Alert>}
      {text('name', 'Room type')}
      {text('description', 'Description', { as: 'textarea', rows: 3 })}
      <Row>
        <Col sm={4}>{text('pricePerNight', 'Price per night (INR)', { type: 'number', min: 1, step: '0.01' })}</Col>
        <Col sm={4}>{text('maxOccupancy', 'Max occupancy', { type: 'number', min: 1, max: 10 })}</Col>
        <Col sm={4}>{text('inventory', 'Rooms of this type', { type: 'number', min: 1 })}</Col>
      </Row>
      {text('amenities', 'Amenities (comma separated)', { placeholder: 'Free WiFi, Air conditioning, TV' })}
      {room && <Form.Check className="mb-3" type="switch" id="room-active" name="isActive" label="Active (visible to customers)" checked={f.isActive} onChange={set} />}

      {existing.length > 0 && (
        <div className="mb-3">
          <Form.Label>Current images</Form.Label>
          <div className="d-flex flex-wrap gap-2">
            {existing.map((p) => (
              <div key={p} className="thumb">
                <img src={imageUrl(p)} alt="" />
                <button type="button" className="thumb-x" aria-label="Remove image" onClick={() => setExisting(existing.filter((x) => x !== p))}>&times;</button>
              </div>
            ))}
          </div>
        </div>
      )}
      <Form.Group className="mb-3" controlId="room-images">
        <Form.Label>{room ? 'Add more images' : 'Room images'} (JPG/PNG/WEBP, up to 5 MB each)</Form.Label>
        <Form.Control type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={pickFiles} isInvalid={!!errors.images} />
        <Form.Control.Feedback type="invalid">{errors.images}</Form.Control.Feedback>
      </Form.Group>

      <div className="d-flex gap-2">
        <Button type="submit" className="btn-gold" disabled={busy}>{busy ? 'Saving...' : room ? 'Save changes' : 'Add room'}</Button>
        {onCancel && <Button variant="outline-secondary" onClick={onCancel}>Cancel</Button>}
      </div>
    </Form>
  );
}
