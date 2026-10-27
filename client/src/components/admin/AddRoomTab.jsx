import { useState } from 'react';
import { Alert, Card } from 'react-bootstrap';
import RoomForm from './RoomForm.jsx';

export default function AddRoomTab({ onSaved }) {
  const [formKey, setFormKey] = useState(0);
  const [msg, setMsg] = useState('');
  return (
    <Card><Card.Body>
      <h5 className="mb-3">Add a new room</h5>
      {msg && <Alert variant="success">{msg}</Alert>}
      <RoomForm key={formKey} onSaved={(room) => { setMsg(`"${room.name}" was added.`); setFormKey((k) => k + 1); onSaved?.(room); }} />
    </Card.Body></Card>
  );
}
