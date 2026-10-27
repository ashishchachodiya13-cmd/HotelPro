import { Badge, Button, Card } from 'react-bootstrap';
import { FaBed, FaUserFriends } from 'react-icons/fa';
import { formatMoney, imageUrl } from '../utils/format.js';

export default function RoomCard({ room, onBook, disabled, actionLabel = 'Book Now' }) {
  const img = imageUrl(room.images?.[0]);
  return (
    <Card className="room-card h-100">
      {img ? (
        <Card.Img variant="top" src={img} alt={room.name} className="room-img" loading="lazy" />
      ) : (
        <div className="room-img room-img-placeholder" aria-hidden="true"><FaBed size={40} /></div>
      )}
      <Card.Body className="d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start">
          <Card.Title className="mb-1">{room.name}</Card.Title>
          <div className="text-end">
            <div className="price">{formatMoney(room.pricePerNight)}</div>
            <small className="text-muted">per night</small>
          </div>
        </div>
        <div className="small text-muted mb-2"><FaUserFriends className="me-1" />Up to {room.maxOccupancy} guests</div>
        <Card.Text className="small">{room.description}</Card.Text>
        <div className="mb-3">
          {(room.amenities || []).slice(0, 5).map((a) => (
            <Badge key={a} bg="light" text="dark" className="me-1 mb-1 border">{a}</Badge>
          ))}
        </div>
        <div className="mt-auto">
          {room.totalPrice != null && (
            <div className="small mb-2">
              {room.nights} night{room.nights > 1 ? 's' : ''} total: <strong>{formatMoney(room.totalPrice)}</strong>
              {room.availableUnits <= 2 && <span className="text-danger ms-2">Only {room.availableUnits} left</span>}
            </div>
          )}
          <Button className="btn-gold w-100" onClick={() => onBook?.(room)} disabled={disabled}>{actionLabel}</Button>
        </div>
      </Card.Body>
    </Card>
  );
}
