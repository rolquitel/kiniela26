import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Trophy, Medal, User } from 'lucide-react';

export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        // Fetch all users
        const usersSnap = await getDocs(collection(db, 'users'));
        const usersList = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), totalPoints: 0 }));

        // Fetch all matches
        const matchesSnap = await getDocs(collection(db, 'matches'));
        const matchesMap = {};
        matchesSnap.docs.forEach(doc => {
          matchesMap[doc.id] = doc.data();
        });

        // Fetch all predictions (quinielas)
        const quinielasSnap = await getDocs(collection(db, 'quinielas'));

        // Group points by userId
        const pointsMap = {};
        usersList.forEach(u => {
          pointsMap[u.id] = 0;
        });

        quinielasSnap.docs.forEach(qDoc => {
          const qData = qDoc.data();
          const match = matchesMap[qData.matchId];

          if (match && match.status === 'finished') {
            const finalA = match.scoreA;
            const finalB = match.scoreB;
            const predA = qData.predictedScoreA;
            const predB = qData.predictedScoreB;

            if (predA !== undefined && predB !== undefined && predA !== null && predB !== null) {
              let points = 0;
              if (predA === finalA && predB === finalB) {
                points = 3;
              } else {
                const finalResult = finalA > finalB ? 'A' : finalB > finalA ? 'B' : 'Draw';
                const predResult = predA > predB ? 'A' : predB > predA ? 'B' : 'Draw';
                if (finalResult === predResult) {
                  points = 1;
                }
              }
              if (pointsMap[qData.userId] !== undefined) {
                pointsMap[qData.userId] += points;
              } else {
                pointsMap[qData.userId] = points;
              }
            }
          }
        });

        // Map calculated points back to users and sort them
        const calculatedUsers = usersList.map(u => ({
          ...u,
          totalPoints: pointsMap[u.id] || 0
        }));

        calculatedUsers.sort((a, b) => b.totalPoints - a.totalPoints);
        setUsers(calculatedUsers);
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
