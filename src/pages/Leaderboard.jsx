import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { Trophy, Medal, User } from 'lucide-react';

export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const q = query(collection(db, 'users'), orderBy('totalPoints', 'desc'), limit(50));
        const querySnapshot = await getDocs(q);
        setUsers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, []);

  if (loading) return <div className="text-center py-20">Cargando rankings...</div>;

  return (
    <div className="leaderboard-page animate-fade-in">
      <div className="section-header">
        <h1>Tabla de posiciones</h1>
        <p>Los mejores pronosticadores del Mundial 2026</p>
      </div>

      <div className="glass-card leaderboard-card">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th className="text-center">Pos</th>
              <th>Usuario</th>
              <th className="text-right">Puntos</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => (
              <tr key={user.id} className={index < 3 ? `top-three pos-${index + 1}` : ''}>
                <td className="text-center pos-col">
                  {index === 0 ? <Trophy className="medal gold" size={20} /> :
                    index === 1 ? <Medal className="medal silver" size={20} /> :
                      index === 2 ? <Medal className="medal bronze" size={20} /> :
                        index + 1}
                </td>
                <td className="user-col">
                  <div className="user-info-row">
                    <div className="avatar-small">
                      <User size={14} />
                    </div>
                    <span>{user.displayName}</span>
                  </div>
                </td>
                <td className="text-right points-col">
                  <strong>{user.totalPoints || 0}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
