import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import MatchCard from '../components/MatchCard';

export default function Home() {
  const { currentUser } = useAuth();
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [userQuinielas, setUserQuinielas] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const teamsSnap = await getDocs(collection(db, 'teams'));
        const teamsData = {};
        teamsSnap.docs.forEach(doc => teamsData[doc.id] = doc.data());
        setTeams(teamsData);

        const matchesSnap = await getDocs(query(collection(db, 'matches'), orderBy('date')));
        const matchesData = matchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        matchesData.sort((a, b) => {
          if (a.date === b.date) {
            return a.time.localeCompare(b.time);
          }
          return 0;
        });

        setMatches(matchesData);

        if (currentUser) {
          const quinielasSnap = await getDocs(query(collection(db, 'quinielas'), where('userId', '==', currentUser.uid)));
          const quinielasData = {};
          quinielasSnap.docs.forEach(doc => {
            quinielasData[doc.data().matchId] = doc.data();
          });
          setUserQuinielas(quinielasData);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [currentUser]);

  // Show only matches that have already been played (finished)
  const playedMatches = matches.filter(m => m.status === 'finished');

  if (loading) return <div className="text-center py-20">Cargando partidos...</div>;

  return (
    <div className="home-page animate-fade-in">
      <div className="section-header">
        <h1>Partidos Jugados</h1>
        <p>Resultados del Mundial 2026 y tus puntos obtenidos</p>
      </div>

      <div className="matches-grid">
        {playedMatches.length === 0 ? (
          <div className="glass-card text-center py-20 w-full">
            <p className="text-muted">No hay partidos jugados disponibles.</p>
          </div>
        ) : (
          playedMatches.map(match => (
            <MatchCard
              key={match.id}
              match={match}
              teams={teams}
              currentUserQuiniela={userQuinielas[match.id]}
            />
          ))
        )}
      </div>
    </div>
  );
}
