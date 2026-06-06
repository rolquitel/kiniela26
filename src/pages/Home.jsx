import { useState, useEffect } from 'react';
import pb from '../pocketbase';
import { useAuth } from '../contexts/AuthContext';
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

        // Sort matches by date descending (most recent first), and if dates are equal, by time descending
        matchesData.sort((a, b) => {
          if (b.date === a.date) {
            return b.time.localeCompare(a.time);
          }
          return b.date.localeCompare(a.date);
        });

        setMatches(matchesData);

        // Fetch current user predictions
        if (currentUser) {
          const quinielasList = await pb.collection('quinielas').getFullList({
            filter: `userid = "${currentUser.uid}"`
          });
          const quinielasData = {};
          quinielasList.forEach(item => {
            quinielasData[item.matchid] = {
              id: item.id,
              userId: item.userid,
              matchId: item.matchid,
              predictedScoreA: item.predictedscorea,
              predictedScoreB: item.predictedscoreb,
              pointsEarned: item.pointsearned,
              updatedAt: item.updatedat
            };
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
