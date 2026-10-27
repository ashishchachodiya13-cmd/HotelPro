import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Table } from 'react-bootstrap';
import api, { getErrorMessage } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatDate } from '../../utils/format.js';
import Loading from '../Loading.jsx';

export default function UsersTab() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try { setUsers((await api.get('/admin/users')).data.users); setError(''); }
    catch (e) { setError(getErrorMessage(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const changeRole = async (u) => {
    const role = u.role === 'admin' ? 'customer' : 'admin';
    if (!window.confirm(`Change ${u.name} to ${role}? Their current sessions will be signed out.`)) return;
    try { await api.patch(`/admin/users/${u._id}/role`, { role }); setNotice(`${u.name} is now ${role}.`); load(); }
    catch (e) { setError(getErrorMessage(e)); }
  };

  return (
    <>
      {notice && <Alert variant="success" dismissible onClose={() => setNotice('')}>{notice}</Alert>}
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {loading ? <Loading /> : (
        <Table responsive hover className="align-middle bg-white">
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Registered</th><th /></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td>{u.name}</td><td>{u.email}</td><td>{u.phone}</td>
                <td><Badge bg={u.role === 'admin' ? 'dark' : 'secondary'}>{u.role}</Badge></td>
                <td>{formatDate(u.createdAt)}</td>
                <td>{u._id !== me.id && <Button size="sm" variant="outline-secondary" onClick={() => changeRole(u)}>{u.role === 'admin' ? 'Make customer' : 'Make admin'}</Button>}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
