import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { Calendar, Clock, User, Award, Search, Info } from 'lucide-react';

export default function Comunidad() {
  const [activeTab, setActiveTab] = useState('games');
  
  // Data States
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState({});
  const [users, setUsers] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Selection States
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [matchPredictions, setMatchPredictions] = useState([]);
  const [userPredictions, setUserPredictions] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Filter/Search States
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch initial base data (matches, teams, users)
  useEffect(() => {
    async function fetchBaseData() {
      setLoading(true);
      try {
        // 1. Fetch Teams
        const teamsSnap = await getDocs(collection(db, 'teams'));
        const teamsData = {};
        teamsSnap.docs.forEach(doc => {
          teamsData[doc.id] = doc.data();
        });
        setTeams(teamsData);

        // 2. Fetch Matches
        const matchesSnap = await getDocs(collection(db, 'matches'));
        const matchesData = matchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        matchesData.sort((a, b) => {
          if (a.date === b.date) {
            return a.time.localeCompare(b.time);
          }
          return a.date.localeCompare(b.date);
        });
        setMatches(matchesData);

        // 3. Fetch Users
        const usersSnap = await getDocs(query(collection(db, 'users'), orderBy('totalPoints', 'desc')));
        const usersData = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(usersData);

        const uMap = {};
        usersData.forEach(u => {
          uMap[u.id] = u.displayName || u.email || 'Usuario';
        });
        setUsersMap(uMap);

      } catch (err) {
        console.error("Error fetching community data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchBaseData();
  }, []);

  // Fetch predictions for a specific match when selected
  const handleSelectMatch = async (match) => {
    setSelectedMatch(match);
    setLoadingDetails(true);
    try {
      const q = query(
        collection(db, 'quinielas'),
        where('matchId', '==', match.id)
      );
      const qSnap = await getDocs(q);
      const preds = qSnap.docs.map(doc => doc.data());
      setMatchPredictions(preds);
    } catch (err) {
      console.error("Error fetching match predictions:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Fetch predictions for a specific user when selected
  const handleSelectUser = async (user) => {
    setSelectedUser(user);
    setLoadingDetails(true);
    try {
      const q = query(
        collection(db, 'quinielas'),
        where('userId', '==', user.id)
      );
      const qSnap = await getDocs(q);
      const preds = qSnap.docs.map(doc => doc.data());
      setUserPredictions(preds);
    } catch (err) {
      console.error("Error fetching user predictions:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Helper to calculate score points dynamically/consistently
  const calculatePoints = (match, prediction) => {
    if (match.status !== 'finished') return '-';
    if (!prediction) return 0;
    const finalA = match.scoreA;
    const finalB = match.scoreB;
    const predA = prediction.predictedScoreA;
    const predB = prediction.predictedScoreB;

    if (predA === undefined || predB === undefined || predA === null || predB === null) return 0;

    if (predA === finalA && predB === finalB) {
      return 3; // Exact match score
    } else {
      const finalResult = finalA > finalB ? 'A' : finalB > finalA ? 'B' : 'Draw';
      const predResult = predA > predB ? 'A' : predB > predA ? 'B' : 'Draw';
      if (finalResult === predResult) {
        return 1; // Correct result (win/draw) but wrong score
      }
    }
    return 0;
  };

  // Filtered games or users based on search query
  const filteredMatches = matches.filter(m => {
    const teamA = teams[m.teamAId]?.name || '';
    const teamB = teams[m.teamBId]?.name || '';
    return teamA.toLowerCase().includes(searchQuery.toLowerCase()) || 
           teamB.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredUsers = users.filter(u => {
    const name = u.displayName || u.email || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading) return <div className="text-center py-20">Cargando datos de la comunidad...</div>;

  return (
    <div className="comunidad-page animate-fade-in">
      <div className="section-header">
        <h1>Resultados de la Comunidad</h1>
        <p>Consulta las predicciones de los usuarios y las estadísticas generales</p>
      </div>

      {/* Tabs */}
      <div className="comunidad-tabs-container">
        <div className="comunidad-tabs">
          <button 
            className={`comunidad-tab-btn ${activeTab === 'games' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('games');
              setSearchQuery('');
              setSelectedMatch(null);
              setSelectedUser(null);
            }}
          >
            ⚽ Todos los Partidos
          </button>
          <button 
            className={`comunidad-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('users');
              setSearchQuery('');
              setSelectedMatch(null);
              setSelectedUser(null);
            }}
          >
            👥 Quinielas por Usuario
          </button>
        </div>

        {/* Search Bar */}
        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder={activeTab === 'games' ? "Buscar por país..." : "Buscar por usuario..."} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="comunidad-layout">
        
        {/* Tab 1: Games list */}
        {activeTab === 'games' && (
          <>
            <div className="table-column glass-card">
              <h2 className="column-title">Partidos del Torneo</h2>
              <div className="table-responsive">
                <table className="comunidad-table">
                  <thead>
                    <tr>
                      <th>Fecha / Hora</th>
                      <th>Partido</th>
                      <th className="text-center">Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMatches.map(match => {
                      const tA = teams[match.teamAId];
                      const tB = teams[match.teamBId];
                      const isSelected = selectedMatch?.id === match.id;
                      return (
                        <tr 
                          key={match.id} 
                          onClick={() => handleSelectMatch(match)}
                          className={`clickable-row ${isSelected ? 'active-row' : ''}`}
                        >
                          <td className="time-cell">
                            <div>{match.date}</div>
                            <div className="text-muted text-xs">{match.time}</div>
                          </td>
                          <td className="teams-cell">
                            <div className="team-row">
                              <img src={tA?.flagUrl} alt="" className="flag-sm" />
                              <span className="name">{tA?.name}</span>
                            </div>
                            <div className="team-row mt-1">
                              <img src={tB?.flagUrl} alt="" className="flag-sm" />
                              <span className="name">{tB?.name}</span>
                            </div>
                          </td>
                          <td className="text-center score-cell">
                            {match.status === 'finished' ? (
                              <span className="score-badge">{match.scoreA} - {match.scoreB}</span>
                            ) : match.status === 'live' ? (
                              <span className="live-badge">En Vivo</span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredMatches.length === 0 && (
                      <tr>
                        <td colSpan="3" className="text-center text-muted py-8">No se encontraron partidos.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Details Panel for Selected Game */}
            <div className="details-column">
              {selectedMatch ? (
                <div className="glass-card details-card animate-fade-in">
                  <div className="details-header">
                    <span className="match-tag">Partido #{selectedMatch.matchNumber}</span>
                    <h3>
                      {teams[selectedMatch.teamAId]?.name} vs {teams[selectedMatch.teamBId]?.name}
                    </h3>
                    <div className="details-meta mt-1 text-muted text-sm">
                      <span><Calendar size={12} className="inline mr-1" /> {selectedMatch.date}</span>
                      <span className="ml-4"><Clock size={12} className="inline mr-1" /> {selectedMatch.time}</span>
                    </div>
                  </div>

                  {loadingDetails ? (
                    <div className="text-center py-12 text-muted">Cargando predicciones...</div>
                  ) : (
                    <div className="predictions-list mt-6">
                      <h4 className="list-title mb-4">Pronósticos de los Usuarios</h4>
                      {matchPredictions.length === 0 ? (
                        <div className="text-center py-8 text-muted border-dashed-container">
                          Ningún usuario ha pronosticado este partido aún.
                        </div>
                      ) : (
                        <table className="details-table">
                          <thead>
                            <tr>
                              <th>Usuario</th>
                              <th className="text-center">Pronóstico</th>
                              <th className="text-right">Puntos</th>
                            </tr>
                          </thead>
                          <tbody>
                            {matchPredictions.map((pred, i) => {
                              const points = calculatePoints(selectedMatch, pred);
                              return (
                                <tr key={i}>
                                  <td>
                                    <div className="user-avatar-row">
                                      <div className="avatar-xs"><User size={10} /></div>
                                      <span>{usersMap[pred.userId] || 'Usuario'}</span>
                                    </div>
                                  </td>
                                  <td className="text-center font-mono">
                                    {pred.predictedScoreA} - {pred.predictedScoreB}
                                  </td>
                                  <td className="text-right">
                                    {selectedMatch.status === 'finished' ? (
                                      <span className={`points-badge-small ${points > 0 ? 'success' : ''}`}>
                                        +{points} pts
                                      </span>
                                    ) : (
                                      <span className="text-muted">-</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="glass-card empty-details-card text-center text-muted">
                  <Info size={40} className="mx-auto text-muted mb-4 opacity-50" />
                  <p>Selecciona un partido del listado para ver las quinielas registradas por los usuarios.</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Tab 2: Users list */}
        {activeTab === 'users' && (
          <>
            <div className="table-column glass-card">
              <h2 className="column-title">Clasificación General</h2>
              <div className="table-responsive">
                <table className="comunidad-table">
                  <thead>
                    <tr>
                      <th className="text-center" width="70">Pos</th>
                      <th>Usuario</th>
                      <th className="text-right">Puntos Totales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user, idx) => {
                      const isSelected = selectedUser?.id === user.id;
                      return (
                        <tr 
                          key={user.id} 
                          onClick={() => handleSelectUser(user)}
                          className={`clickable-row ${isSelected ? 'active-row' : ''}`}
                        >
                          <td className="text-center font-bold">
                            {idx + 1}
                          </td>
                          <td>
                            <div className="user-avatar-row">
                              <div className="avatar-xs"><User size={10} /></div>
                              <span>{user.displayName || user.email}</span>
                            </div>
                          </td>
                          <td className="text-right font-bold points-col-txt">
                            {user.totalPoints || 0} pts
                          </td>
                        </tr>
                      );
                    })}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan="3" className="text-center text-muted py-8">No se encontraron usuarios.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Details Panel for Selected User */}
            <div className="details-column">
              {selectedUser ? (
                <div className="glass-card details-card animate-fade-in">
                  <div className="details-header user-details-header">
                    <div className="avatar-lg"><User size={28} /></div>
                    <div className="user-details-title">
                      <h3>{selectedUser.displayName || selectedUser.email}</h3>
                      <p className="text-muted text-sm">Puntaje Total: <strong>{selectedUser.totalPoints || 0} puntos</strong></p>
                    </div>
                  </div>

                  {loadingDetails ? (
                    <div className="text-center py-12 text-muted">Cargando quinielas del usuario...</div>
                  ) : (
                    <div className="predictions-list mt-6">
                      <h4 className="list-title mb-4">Quinielas Registradas</h4>
                      {userPredictions.length === 0 ? (
                        <div className="text-center py-8 text-muted border-dashed-container">
                          Este usuario no ha registrado ninguna quiniela.
                        </div>
                      ) : (
                        <div className="table-responsive max-h-details">
                          <table className="details-table">
                            <thead>
                              <tr>
                                <th>Partido</th>
                                <th className="text-center">F. Real</th>
                                <th className="text-center">Pronóstico</th>
                                <th className="text-right">Puntos</th>
                              </tr>
                            </thead>
                            <tbody>
                              {userPredictions.map((pred, i) => {
                                const match = matches.find(m => m.id === pred.matchId);
                                if (!match) return null;
                                const tA = teams[match.teamAId];
                                const tB = teams[match.teamBId];
                                const points = calculatePoints(match, pred);

                                return (
                                  <tr key={i}>
                                    <td className="py-2">
                                      <div className="text-xs font-bold text-muted">#{match.matchNumber}</div>
                                      <div className="teams-text-display">
                                        <span>{tA?.name}</span>
                                        <span className="vs-txt">vs</span>
                                        <span>{tB?.name}</span>
                                      </div>
                                    </td>
                                    <td className="text-center font-mono font-bold">
                                      {match.status === 'finished' ? `${match.scoreA}-${match.scoreB}` : '-'}
                                    </td>
                                    <td className="text-center font-mono">
                                      {pred.predictedScoreA} - {pred.predictedScoreB}
                                    </td>
                                    <td className="text-right">
                                      {match.status === 'finished' ? (
                                        <span className={`points-badge-small ${points > 0 ? 'success' : ''}`}>
                                          +{points} pts
                                        </span>
                                      ) : (
                                        <span className="text-muted">-</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="glass-card empty-details-card text-center text-muted">
                  <Award size={40} className="mx-auto text-muted mb-4 opacity-50" />
                  <p>Selecciona un usuario del listado para ver el desglose detallado de sus quinielas y puntos ganados.</p>
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
