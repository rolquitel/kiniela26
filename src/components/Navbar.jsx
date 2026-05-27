import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, LayoutDashboard, ListOrdered, User, LogOut, Shield } from 'lucide-react';

export default function Navbar() {
  const { currentUser, userData, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Failed to log out", error);
    }
  }

  return (
    <nav className="navbar">
      <div className="container nav-content">
        <Link to="/" className="nav-logo">
          <Trophy size={32} className="logo-icon" />
          <span>KINIE<span>26</span></span>
        </Link>

        <div className="nav-links">
          {currentUser ? (
            <>
              <Link to="/" className="nav-link">
                <LayoutDashboard size={20} />
                <span>Partidos</span>
              </Link>
              <Link to="/quinielas" className="nav-link">
                <User size={20} />
                <span>Mis Quinielas</span>
              </Link>
              <Link to="/leaderboard" className="nav-link">
                <ListOrdered size={20} />
                <span>Leaderboard</span>
              </Link>
              {userData?.isAdmin && (
                <Link to="/admin" className="nav-link admin-link">
                  <Shield size={20} />
                  <span>Admin</span>
                </Link>
              )}
              <div className="nav-user">
                <span className="user-points">{userData?.totalPoints || 0} pts</span>
                <button onClick={handleLogout} className="logout-btn" title="Logout">
                  <LogOut size={20} />
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/signup" className="btn-primary">Registrarse</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
