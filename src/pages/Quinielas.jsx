import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { collection, getDocs, query, where, doc, setDoc } from 'firebase/firestore';
import MatchCard from '../components/MatchCard';

export default function Quinielas() {
  const { currentUser } = useAuth();
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState({});
  const [userQuinielas, setUserQuinielas] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(null);

  useEffect(() => {
    if (!currentUser) return;

    async function fetchData() {
      try {
        // Fetch Teams
        const teamsSnap = await getDocs(collection(db, 'teams'));
        const teamsData = {};
        teamsSnap.docs.forEach(doc => teamsData[doc.id] = doc.data());
        setTeams(teamsData);

        // Fetch Matches
        const matchesSnap = await getDocs(collection(db, 'matches'));
        const matchesData = matchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        matchesData.sort((a, b) => {
          if (a.date === b.date) {
            return a.time.localeCompare(b.time);
          }
          return a.date.localeCompare(b.date);
        });
        setMatches(matchesData);

        // Fetch User Quinielas
        const q = query(
          collection(db, 'quinielas'),
          where('userId', '==', currentUser.uid)
        );
        const qSnap = await getDocs(q);
        const quinielasMap = {};
        qSnap.docs.forEach(doc => {
          quinielasMap[doc.data().matchId] = doc.data();
        });
        setUserQuinielas(quinielasMap);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [currentUser]);

  async function handleSubmitQuiniela(matchId, scoreA, scoreB) {
    if (!currentUser) return;

    // Check time restriction (1 hour before)
    const match = matches.find(m => m.id === matchId);
    if (!match) return;
    const matchTime = new Date(`${match.date}T${match.time}`);
    const now = new Date();
    const diff = (matchTime - now) / (1000 * 60 * 60);

    if (diff < 1) {
      alert("Lo siento, las quinielas se cierran 1 hora antes del partido.");
      return;
    }

    setSubmitting(matchId);
    try {
      const quinielaId = `${currentUser.uid}_${matchId}`;
      await setDoc(doc(db, "quinielas", quinielaId), {
        userId: currentUser.uid,
        matchId: matchId,
        predictedScoreA: parseInt(scoreA),
        predictedScoreB: parseInt(scoreB),
        pointsEarned: null,
        updatedAt: new Date().toISOString()
      });

      setUserQuinielas(prev => ({
        ...prev,
        [matchId]: {
          userId: currentUser.uid,
          matchId: matchId,
          predictedScoreA: parseInt(scoreA),
          predictedScoreB: parseInt(scoreB),
          pointsEarned: null,
          updatedAt: new Date().toISOString()
        }
      }));
    } catch (err) {
      console.error(err);
      alert("Error al guardar: " + err.message);
    } finally {
      setSubmitting(null);
    }
  }

  if (loading) return <div className="text-center py-20">Cargando tus quinielas...</div>;

  const upcomingMatches = matches.filter(m => m.status !== 'finished');
  const playedMatches = matches.filter(m => m.status === 'finished');

  return (
    <div className="quinielas-page animate-fade-in">
      <div className="section-header">
        <h1>Mis Quinielas</h1>
        <p>Edita tus predicciones activas y revisa tu historial de puntos</p>
      </div>

      <div className="quinielas-section mb-12">
        <h2 className="section-title mb-6">Pronósticos Activos</h2>
        <div className="matches-grid">
          {upcomingMatches.length === 0 ? (
            <div className="glass-card text-center py-10 w-full">
              <p className="text-muted">No hay partidos próximos para pronosticar.</p>
            </div>
          ) : (
            upcomingMatches.map(match => (
              <MatchCard
                key={match.id}
                match={match}
                teams={teams}
                currentUserQuiniela={userQuinielas[match.id]}
                onSave={(sA, sB) => handleSubmitQuiniela(match.id, sA, sB)}
                isSubmitting={submitting === match.id}
              />
            ))
          )}
        </div>
      </div>

      <div className="quinielas-section mt-12">
        <h2 className="section-title mb-6">Historial de Resultados</h2>
        <div className="matches-grid">
          {playedMatches.length === 0 ? (
            <div className="glass-card text-center py-10 w-full">
              <p className="text-muted">Aún no hay partidos finalizados.</p>
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
    </div>
  );
}
