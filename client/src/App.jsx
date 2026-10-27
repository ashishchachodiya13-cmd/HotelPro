import { Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import HomePage from './pages/HomePage.jsx';
import Login from './pages/Login.jsx';
import SignUp from './pages/SignUp.jsx';
import GetRooms from './pages/GetRooms.jsx';
import UserHome from './pages/UserHome.jsx';
import MyBookings from './pages/MyBookings.jsx';
import AdminHome from './pages/AdminHome.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="flex-grow-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/rooms" element={<GetRooms />} />
          <Route path="/userhome" element={<ProtectedRoute role="customer"><UserHome /></ProtectedRoute>} />
          <Route path="/my-bookings" element={<ProtectedRoute role="customer"><MyBookings /></ProtectedRoute>} />
          <Route path="/adminhome" element={<ProtectedRoute role="admin"><AdminHome /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
