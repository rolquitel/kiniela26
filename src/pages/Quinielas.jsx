import { useState, useEffect } from 'react';
import pb from '../pocketbase';
import { useAuth } from '../contexts/AuthContext';
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
        const teamsList = await pb.collection('teams').getFullList();
        const teamsData = {};
        teamsList.forEach(item => {
          teamsData[item.id] = { id: item.id, name: item.name, flagUrl: item.flagurl };
        });
        setTeams(teamsData);

        // Fetch Matches
        const matchesList = await pb.collection('matches').getFullList();
        const matchesData = matchesList.map(item => ({
          id: item.id,
          matchNumber: item.matchnumber,
          teamAId: item.teamaid,
          teamBId: item.teambid,
          venue: item.venue,
          date: item.date,
          time: item.time,
          status: item.status,
          scoreA: item.scorea,
          scoreB: item.scoreb,
          stage: item.stage
        }));

        matchesData.sort((a, b) => {
          if (a.date === b.date) {
            return a.time.localeCompare(b.time);
          }
          return a.date.localeCompare(b.date);
        });
        setMatches(matchesData);

        // Fetch User Quinielas
        const quinielasList = await pb.collection('quinielas').getFullList({
          filter: `userid = "${currentUser.uid}"`
        });
        const quinielasMap = {};
        quinielasList.forEach(item => {
          quinielasMap[item.matchid] = {
            id: item.id,
            userId: item.userid,
            matchId: item.matchid,
            predictedScoreA: item.predictedscorea,
            predictedScoreB: item.predictedscoreb,
            pointsEarned: item.pointsearned,
            updatedAt: item.updatedat
          };
        });
        setUserQuinielas(quinielasMap);

      } catch (err) {
        console.error("Error fetching data:", err);
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
      const existing = userQuinielas[matchId];
      let updatedRecord;

      const dataToSave = {
        userid: currentUser.uid,
        matchid: matchId,
        predictedscorea: parseInt(scoreA),
        predictedscoreb: parseInt(scoreB),
        pointsearned: null,
        updatedat: new Date().toISOString()
      };

      if (existing && existing.id) {
        // Update existing prediction
        updatedRecord = await pb.collection('quinielas').update(existing.id, {
          predictedscorea: dataToSave.predictedscorea,
          predictedscoreb: dataToSave.predictedscoreb,
          pointsearned: null,
          updatedat: dataToSave.updatedat
        });
      } else {
        // Create new prediction
        updatedRecord = await pb.collection('quinielas').create(dataToSave);
      }

      setUserQuinielas(prev => ({
        ...prev,
        [matchId]: {
          id: updatedRecord.id,
          userId: updatedRecord.userid,
          matchId: updatedRecord.matchid,
          predictedScoreA: updatedRecord.predictedscorea,
          predictedScoreB: updatedRecord.predictedscoreb,
          pointsEarned: updatedRecord.pointsearned,
          updatedAt: updatedRecord.updatedat
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
        <h1>Mi Quiniela</h1>
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
