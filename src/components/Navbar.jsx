import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, LayoutDashboard, ListOrdered, User, LogOut, Shield, Menu, X } from 'lucide-react';

export default function Navbar() {
  const { currentUser, userData, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    try {
      await logout();
      setMenuOpen(false);
      navigate('/login');
    } catch (error) {
      console.error("Failed to log out", error);
    }
  }

  return (
    <nav className="navbar">
      <div className="container nav-content">
        <Link to="/" className="nav-logo" onClick={() => setMenuOpen(false)}>
          <Trophy size={32} className="logo-icon" />
          <span>KINIE<span>26</span></span>
        </Link>

        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
          {currentUser ? (
            <>
              <Link to="/" className="nav-link" onClick={() => setMenuOpen(false)}>
                <LayoutDashboard size={20} />
                <span>Partidos</span>
              </Link>
              <Link to="/quinielas" className="nav-link" onClick={() => setMenuOpen(false)}>
                <User size={20} />
                <span>Mis Quinielas</span>
              </Link>
              <Link to="/leaderboard" className="nav-link" onClick={() => setMenuOpen(false)}>
                <ListOrdered size={20} />
                <span>Leaderboard</span>
              </Link>
              {userData?.isAdmin && (
                <Link to="/admin" className="nav-link admin-link" onClick={() => setMenuOpen(false)}>
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
              <Link to="/login" className="nav-link" onClick={() => setMenuOpen(false)}>Login</Link>
              <Link to="/signup" className="btn-primary" onClick={() => setMenuOpen(false)}>Registrarse</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
