import { useState, useEffect, useCallback } from 'react';
import pb from '../pocketbase';
import { Plus, Trash2, Save, Trophy, Calendar, Database, UserPlus, Users as UsersIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { WORLD_CUP_2026_DATA, TEAM_FLAGS } from '../data/wc2026';

export default function Admin() {
  const { createQuinielaForUser } = useAuth();
  const [activeTab, setActiveTab] = useState('matches');
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newTeam, setNewTeam] = useState({ name: '', flagUrl: '' });
  const [newUser, setNewUser] = useState({ email: '', password: '', displayName: '' });
  const [newMatch, setNewMatch] = useState({
    teamAId: '',
    teamBId: '',
    venue: '',
    date: '',
    time: '',
    status: 'scheduled',
    scoreA: 0,
    scoreB: 0
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch Teams
      const teamsList = await pb.collection('teams').getFullList();
      const teamsArr = teamsList.map(item => ({ id: item.id, name: item.name, flagUrl: item.flagurl }));
      setTeams(teamsArr);

      if (activeTab === 'matches') {
        // Fetch Matches
        const matchesList = await pb.collection('matches').getFullList();
        const matchesArr = matchesList.map(item => ({
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
        matchesArr.sort((a, b) => {
          if (a.date === b.date) {
            return a.time.localeCompare(b.time);
          }
          return a.date.localeCompare(b.date);
        });
        setMatches(matchesArr);
      }

      if (activeTab === 'users') {
        // Fetch Users
        const usersList = await pb.collection('users').getFullList({
          sort: '-totalpoints'
        });
        setUsers(usersList.map(item => ({
          id: item.id,
          email: item.email,
          displayName: item.displayname || item.name || 'Usuario',
          totalPoints: item.totalpoints || 0,
          isAdmin: item.isadmin || false
        })));
      }
    } catch (err) {
      console.error("Error fetching admin data:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSeedData() {
    if (!window.confirm("¿Poblar la base de datos con TODOS los 104 partidos y 48+ equipos del Mundial 2026?")) return;

    setLoading(true);
    try {
      // 1. Get unique teams from data
      const uniqueTeamNames = new Set();
      WORLD_CUP_2026_DATA.forEach(m => {
        uniqueTeamNames.add(m.team1);
        uniqueTeamNames.add(m.team2);
      });

      // 2. Fetch existing teams to avoid duplicates
      const existingTeams = await pb.collection('teams').getFullList();
      const existingTeamsMap = {};
      existingTeams.forEach(t => {
        existingTeamsMap[t.name] = t.id;
      });

      // 3. Create missing teams
      const teamIds = { ...existingTeamsMap };
      for (const name of uniqueTeamNames) {
        if (!teamIds[name]) {
          const createdTeam = await pb.collection('teams').create({
            name: name,
            flagurl: TEAM_FLAGS[name] || TEAM_FLAGS["Placeholder"]
          });
          teamIds[name] = createdTeam.id;
        }
      }

      // 4. Create matches (104 total)
      // PocketBase creates are fast, but we'll do them in chunks to avoid rate/browser bottlenecks
      const batchSize = 25;
      for (let i = 0; i < WORLD_CUP_2026_DATA.length; i += batchSize) {
        const chunk = WORLD_CUP_2026_DATA.slice(i, i + batchSize);
        const matchPromises = chunk.map(m => {
          return pb.collection('matches').create({
            teamaid: teamIds[m.team1],
            teambid: teamIds[m.team2],
            venue: m.venue,
            date: m.date,
            time: m.time,
            stage: m.stage,
            status: "scheduled",
            scorea: 0,
            scoreb: 0,
            matchnumber: m.matchNumber
          });
        });
        await Promise.all(matchPromises);
      }

      alert("¡Base de datos poblada con éxito! Se cargaron 104 partidos.");
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Error al poblar datos: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleManualUserCreation(e) {
    e.preventDefault();
    setLoading(true);
    try {
      // Create user directly in PocketBase
      const createdUser = await pb.collection('users').create({
        email: newUser.email,
        password: newUser.password,
        passwordConfirm: newUser.password,
        displayname: newUser.displayName,
        name: newUser.displayName,
        totalpoints: 0,
        isadmin: false
      });

      // Auto-generate quiniela predictions
      await createQuinielaForUser(createdUser.id);

      alert(`Usuario ${newUser.displayName} creado con éxito.`);
      setNewUser({ email: '', password: '', displayName: '' });
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Error creando usuario: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddTeam(e) {
    e.preventDefault();
    try {
      await pb.collection('teams').create({
        name: newTeam.name,
        flagurl: newTeam.flagUrl
      });
      setNewTeam({ name: '', flagUrl: '' });
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Error al agregar equipo: " + err.message);
    }
  }

  async function handleAddMatch(e) {
    e.preventDefault();
    try {
      await pb.collection('matches').create({
        teamaid: newMatch.teamAId,
        teambid: newMatch.teamBId,
        venue: newMatch.venue,
        date: newMatch.date,
        time: newMatch.time,
        status: newMatch.status,
        scorea: parseInt(newMatch.scoreA) || 0,
        scoreb: parseInt(newMatch.scoreB) || 0,
        matchnumber: matches.length + 1
      });
      setNewMatch({
        teamAId: '', teamBId: '', venue: '', date: '', time: '',
        status: 'scheduled', scoreA: 0, scoreB: 0
      });
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Error al agregar partido: " + err.message);
    }
  }

  async function handleDeleteMatch(id) {
    if (window.confirm('¿Eliminar partido?')) {
      try {
        await pb.collection('matches').delete(id);
        fetchData();
      } catch (err) {
        console.error(err);
        alert("Error al eliminar partido: " + err.message);
      }
    }
  }

  async function handleDeleteUser(userId) {
    if (!window.confirm("¿Estás seguro de que deseas eliminar a este usuario? Se borrarán permanentemente sus quinielas y su perfil de la base de datos. Esta acción no se puede deshacer.")) return;

    setLoading(true);
    try {
      // 1. Delete associated quinielas
      const qSnap = await pb.collection('quinielas').getFullList({
        filter: `userid = "${userId}"`
      });
      const deletePromises = qSnap.map(d => pb.collection('quinielas').delete(d.id));
      await Promise.all(deletePromises);

      // 2. Delete user record (which also removes their Auth account in PocketBase)
      await pb.collection('users').delete(userId);

      alert("Usuario y sus datos asociados eliminados con éxito.");
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Error al eliminar usuario: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateMatch(matchId, updatedMatch) {
    try {
      const oldMatch = matches.find(m => m.id === matchId);
      const oldStatus = oldMatch ? oldMatch.status : '';

      await pb.collection('matches').update(matchId, {
        matchnumber: parseInt(updatedMatch.matchNumber),
        date: updatedMatch.date,
        time: updatedMatch.time,
        venue: updatedMatch.venue,
        teamaid: updatedMatch.teamAId,
        teambid: updatedMatch.teamBId,
        scorea: parseInt(updatedMatch.scoreA),
        scoreb: parseInt(updatedMatch.scoreB),
        status: updatedMatch.status
      });
      fetchData();

      const newStatus = updatedMatch.status;
      if (newStatus === 'finished' || oldStatus === 'finished') {
        const confirmProcess = window.confirm(
          newStatus === 'finished'
            ? '¿Deseas calcular/recalcular los puntos para este partido?'
            : 'El partido ya no está finalizado. ¿Deseas resetear los puntos asociados a este partido?'
        );
        if (confirmProcess) {
          await calculatePoints(matchId, parseInt(updatedMatch.scoreA), parseInt(updatedMatch.scoreB), newStatus === 'finished');
        }
      } else {
        alert("Partido actualizado con éxito.");
      }
    } catch (err) {
      console.error(err);
      alert('Error al actualizar el partido: ' + err.message);
    }
  }

  async function calculatePoints(matchId, finalA, finalB, isFinished) {
    try {
      const qList = await pb.collection('quinielas').getFullList({
        filter: `matchid = "${matchId}"`
      });
      const updates = [];

      for (const qData of qList) {
        const predA = qData.predictedscorea;
        const predB = qData.predictedscoreb;
        const oldPoints = qData.pointsearned || 0;

        let newPoints = 0;
        if (isFinished && predA !== undefined && predB !== undefined && predA !== null && predB !== null) {
          if (predA === finalA && predB === finalB) {
            newPoints = 3;
          } else {
            const finalResult = finalA > finalB ? 'A' : finalB > finalA ? 'B' : 'Draw';
            const predResult = predA > predB ? 'A' : predB > predA ? 'B' : 'Draw';
            if (finalResult === predResult) {
              newPoints = 1;
            }
          }
        }

        // Update quiniela pointsEarned
        updates.push(pb.collection('quinielas').update(qData.id, { pointsearned: isFinished ? newPoints : null }));

        // Adjust user totalPoints
        try {
          const user = await pb.collection('users').getOne(qData.userid);
          const currentTotal = user.totalpoints || 0;
          const newTotal = Math.max(0, currentTotal - oldPoints + newPoints);
          updates.push(pb.collection('users').update(user.id, { totalpoints: newTotal }));
        } catch (uErr) {
          console.error("Error adjusting user score:", uErr);
        }
      }

      await Promise.all(updates);
      alert(isFinished ? `Puntos recalculados para ${qList.length} quinielas.` : `Puntos reseteados para ${qList.length} quinielas.`);
    } catch (err) {
      console.error(err);
      alert('Error calculando puntos: ' + err.message);
    }
  }

  return (
    <div className="admin-page animate-fade-in">
      <div className="admin-header">
        <h1>Panel de Administración</h1>
        <div className="admin-actions">
          <button className="btn-outline btn-sm" onClick={handleSeedData}>
            <Database size={16} /> Cargar Datos WC 2026
          </button>
        </div>
      </div>

      <div className="admin-tabs-nav">
        <button className={activeTab === 'matches' ? 'active' : ''} onClick={() => setActiveTab('matches')}>
          <Calendar size={18} /> Partidos
        </button>
        <button className={activeTab === 'teams' ? 'active' : ''} onClick={() => setActiveTab('teams')}>
          <Trophy size={18} /> Equipos
        </button>
        <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>
          <UsersIcon size={18} /> Usuarios
        </button>
      </div>

      {loading && <div className="text-center py-10">Procesando...</div>}

      {!loading && activeTab === 'teams' && (
        <div className="admin-content">
          <div className="glass-card mb-8">
            <h3>Agregar Equipo</h3>
            <form onSubmit={handleAddTeam} className="admin-form-row">
              <div className="input-group">
                <input placeholder="Nombre del Equipo" value={newTeam.name} onChange={e => setNewTeam({ ...newTeam, name: e.target.value })} required />
              </div>
              <div className="input-group">
                <input placeholder="URL de la Bandera" value={newTeam.flagUrl} onChange={e => setNewTeam({ ...newTeam, flagUrl: e.target.value })} required />
              </div>
              <button type="submit" className="btn-primary"><Plus size={20} /> Agregar</button>
            </form>
          </div>
          <div className="teams-grid">
            {teams.map(team => (
              <div key={team.id} className="team-badge glass-card">
                <img src={team.flagUrl} alt={team.name} className="admin-flag" />
                <span>{team.name}</span>
                <button className="delete-btn" onClick={() => pb.collection('teams').delete(team.id).then(fetchData)}><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && activeTab === 'users' && (
        <div className="admin-content">
          <div className="glass-card mb-8">
            <h3>Crear Usuario Manualmente</h3>
            <form onSubmit={handleManualUserCreation} className="admin-user-form">
              <div className="form-grid">
                <div className="input-group">
                  <label>Nombre</label>
                  <input value={newUser.displayName} onChange={e => setNewUser({ ...newUser, displayName: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label>Email</label>
                  <input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label>Contraseña</label>
                  <input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required />
                </div>
              </div>
              <button type="submit" className="btn-primary mt-4"><UserPlus size={20} /> Crear Usuario</button>
            </form>
          </div>
          <div className="glass-card">
            <h3>Usuarios Registrados</h3>
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th className="text-right">Puntos</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.displayName}</td>
                    <td>{u.email}</td>
                    <td className="text-right">{u.totalPoints || 0}</td>
                    <td className="text-center">
                      <button
                        className="btn-outline btn-sm text-error"
                        title="Borrar Usuario"
                        onClick={() => handleDeleteUser(u.id)}
                        disabled={u.isAdmin}
                        style={{ display: 'inline-flex', padding: '0.4rem', borderRadius: '6px', cursor: u.isAdmin ? 'not-allowed' : 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && activeTab === 'matches' && (
        <div className="admin-content">
          <div className="glass-card mb-8">
            <h3>Programar Partido</h3>
            <form onSubmit={handleAddMatch} className="admin-match-form">
              <div className="form-grid">
                <div className="input-group">
                  <label>Equipo A</label>
                  <select value={newMatch.teamAId} onChange={e => setNewMatch({ ...newMatch, teamAId: e.target.value })} required>
                    <option value="">Seleccionar...</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>Equipo B</label>
                  <select value={newMatch.teamBId} onChange={e => setNewMatch({ ...newMatch, teamBId: e.target.value })} required>
                    <option value="">Seleccionar...</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>Sede</label>
                  <input value={newMatch.venue} onChange={e => setNewMatch({ ...newMatch, venue: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label>Fecha</label>
                  <input type="date" value={newMatch.date} onChange={e => setNewMatch({ ...newMatch, date: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label>Hora</label>
                  <input type="time" value={newMatch.time} onChange={e => setNewMatch({ ...newMatch, time: e.target.value })} required />
                </div>
              </div>
              <button type="submit" className="btn-primary w-full mt-4">Crear Partido</button>
            </form>
          </div>
          <div className="glass-card matches-table-container">
            <table className="admin-matches-table">
              <thead>
                <tr>
                  <th># Num</th>
                  <th>Fecha / Hora</th>
                  <th>Sede</th>
                  <th>Equipo A</th>
                  <th>Goles A</th>
                  <th>v</th>
                  <th>Goles B</th>
                  <th>Equipo B</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {matches.map(match => (
                  <tr key={match.id}>
                    <td>
                      <input
                        type="number"
                        defaultValue={match.matchNumber}
                        id={`matchNumber-${match.id}`}
                        className="table-input-number"
                      />
                    </td>
                    <td>
                      <div className="table-datetime-cell">
                        <input
                          type="date"
                          defaultValue={match.date}
                          id={`date-${match.id}`}
                          className="table-input-date"
                        />
                        <input
                          type="time"
                          defaultValue={match.time}
                          id={`time-${match.id}`}
                          className="table-input-time"
                        />
                      </div>
                    </td>
                    <td>
                      <input
                        type="text"
                        defaultValue={match.venue}
                        id={`venue-${match.id}`}
                        className="table-input-text"
                      />
                    </td>
                    <td>
                      <select defaultValue={match.teamAId} id={`teamAId-${match.id}`} className="table-select">
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        defaultValue={match.scoreA}
                        id={`scoreA-${match.id}`}
                        className="table-input-score"
                      />
                    </td>
                    <td className="text-center font-bold text-muted">v</td>
                    <td>
                      <input
                        type="number"
                        defaultValue={match.scoreB}
                        id={`scoreB-${match.id}`}
                        className="table-input-score"
                      />
                    </td>
                    <td>
                      <select defaultValue={match.teamBId} id={`teamBId-${match.id}`} className="table-select">
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </td>
                    <td>
                      <select defaultValue={match.status} id={`status-${match.id}`} className="table-select-status">
                        <option value="scheduled">Programado</option>
                        <option value="live">En Vivo</option>
                        <option value="finished">Finalizado</option>
                      </select>
                    </td>
                    <td>
                      <div className="table-actions-cell">
                        <button
                          className="btn-primary btn-xs"
                          title="Guardar Cambios"
                          onClick={() => {
                            const matchNumber = parseInt(document.getElementById(`matchNumber-${match.id}`).value) || 0;
                            const date = document.getElementById(`date-${match.id}`).value;
                            const time = document.getElementById(`time-${match.id}`).value;
                            const venue = document.getElementById(`venue-${match.id}`).value;
                            const teamAId = document.getElementById(`teamAId-${match.id}`).value;
                            const teamBId = document.getElementById(`teamBId-${match.id}`).value;
                            const scoreA = parseInt(document.getElementById(`scoreA-${match.id}`).value) || 0;
                            const scoreB = parseInt(document.getElementById(`scoreB-${match.id}`).value) || 0;
                            const status = document.getElementById(`status-${match.id}`).value;
                            handleUpdateMatch(match.id, {
                              matchNumber, date, time, venue, teamAId, teamBId, scoreA, scoreB, status
                            });
                          }}
                        >
                          <Save size={14} />
                        </button>
                        <button
                          className="btn-outline btn-xs text-error"
                          title="Eliminar Partido"
                          onClick={() => handleDeleteMatch(match.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
