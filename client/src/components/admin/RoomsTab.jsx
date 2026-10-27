import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Modal, Table } from 'react-bootstrap';
import api, { getErrorMessage } from '../../services/api.js';
import { formatMoney, imageUrl } from '../../utils/format.js';
import Loading from '../Loading.jsx';
import RoomForm from './RoomForm.jsx';

export default function RoomsTab({ version, onChanged }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    try { setRooms((await api.get('/admin/rooms')).data.rooms); setError(''); }
    catch (e) { setError(getErrorMessage(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load, version]);

  const deactivate = async (r) => {
    if (!window.confirm(`Deactivate "${r.name}"? It will be hidden from customers; existing bookings are kept.`)) return;
    try { await api.delete(`/rooms/${r._id}`); setNotice(`"${r.name}" deactivated.`); load(); onChanged?.(); }
    catch (e) { setError(getErrorMessage(e)); }
  };

  const reactivate = async (r) => {
    const fd = new FormData(); fd.append('isActive', 'true');
    try { await api.put(`/rooms/${r._id}`, fd); setNotice(`"${r.name}" is active again.`); load(); }
    catch (e) { setError(getErrorMessage(e)); }
  };

  return (
    <>
      {notice && <Alert variant="success" dismissible onClose={() => setNotice('')}>{notice}</Alert>}
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {loading ? <Loading /> : rooms.length === 0 ? <Alert variant="info">No rooms yet. Use the Add Room tab.</Alert> : (
        <Table responsive hover className="align-middle bg-white">
          <thead><tr><th>Image</th><th>Room type</th><th>Description</th><th>Price</th><th>Amenities</th><th>Guests</th><th>Qty</th><th>Status</th><th /></tr></thead>
          <tbody>
            {rooms.map((r) => (
              <tr key={r._id}>
                <td>{r.images?.[0] ? <img src={imageUrl(r.images[0])} alt={r.name} className="table-thumb" /> : <span className="text-muted small">none</span>}</td>
                <td className="fw-semibold">{r.name}</td>
                <td className="small desc-cell">{r.description}</td>
                <td>{formatMoney(r.pricePerNight)}</td>
                <td className="small">{(r.amenities || []).join(', ')}</td>
                <td>{r.maxOccupancy}</td>
                <td>{r.inventory}</td>
                <td>{r.isActive ? <Badge bg="success">Active</Badge> : <Badge bg="secondary">Inactive</Badge>}</td>
                <td className="text-nowrap">
                  <Button size="sm" variant="outline-primary" className="me-1" onClick={() => setEditing(r)}>Edit</Button>
                  {r.isActive ? <Button size="sm" variant="outline-danger" onClick={() => deactivate(r)}>Deactivate</Button>
                    : <Button size="sm" variant="outline-success" onClick={() => reactivate(r)}>Activate</Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Modal show={!!editing} onHide={() => setEditing(null)} size="lg" centered>
        <Modal.Header closeButton><Modal.Title>Edit room</Modal.Title></Modal.Header>
        <Modal.Body>
          {editing && <RoomForm room={editing} onCancel={() => setEditing(null)} onSaved={(r) => { setEditing(null); setNotice(`"${r.name}" updated.`); load(); }} />}
        </Modal.Body>
      </Modal>
    </>
  );
}
