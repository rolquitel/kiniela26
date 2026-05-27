import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where, getDoc, setDoc } from 'firebase/firestore';
import { Plus, Trash2, Save, Trophy, Calendar, Database, UserPlus, Users as UsersIcon } from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
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
      const teamsSnap = await getDocs(collection(db, 'teams'));
      const teamsArr = teamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeams(teamsArr);

      if (activeTab === 'matches') {
        const matchesSnap = await getDocs(collection(db, 'matches'));
        const matchesArr = matchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        matchesArr.sort((a, b) => {
          if (a.date === b.date) {
            return a.time.localeCompare(b.time);
          }
          return a.date.localeCompare(b.date);
        });
        setMatches(matchesArr);
      }

      if (activeTab === 'users') {
        const usersSnap = await getDocs(collection(db, 'users'));
        setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      const existingTeamsSnap = await getDocs(collection(db, 'teams'));
      const existingTeamsMap = {};
      existingTeamsSnap.docs.forEach(doc => {
        existingTeamsMap[doc.data().name] = doc.id;
      });

      // 3. Create missing teams
      const teamIds = { ...existingTeamsMap };
      for (const name of uniqueTeamNames) {
        if (!teamIds[name]) {
          // const docRef = await addDoc(collection(db, 'teams'), {
          await setDoc(doc(db, 'teams', name), {
            name,
            flagUrl: TEAM_FLAGS[name] || TEAM_FLAGS["Placeholder"]
          });
          teamIds[name] = name;
        }
      }

      // 4. Create matches (104 total)
      // Note: We'll do this in chunks to avoid overwhelming Firestore or the browser
      const batchSize = 25;
      for (let i = 0; i < WORLD_CUP_2026_DATA.length; i += batchSize) {
        const chunk = WORLD_CUP_2026_DATA.slice(i, i + batchSize);
        const matchPromises = chunk.map(m => {
          return addDoc(collection(db, 'matches'), {
            teamAId: teamIds[m.team1],
            teamBId: teamIds[m.team2],
            venue: m.venue,
            date: m.date,
            time: m.time,
            stage: m.stage,
            status: "scheduled",
            scoreA: 0,
            scoreB: 0,
            matchNumber: m.matchNumber
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
      const secondaryApp = initializeApp(db.app.options, "Secondary");
      const secondaryAuth = getAuth(secondaryApp);

      const res = await createUserWithEmailAndPassword(secondaryAuth, newUser.email, newUser.password);
      const user = res.user;

      const userDoc = {
        uid: user.uid,
        email: user.email,
        displayName: newUser.displayName,
        totalPoints: 0,
        isAdmin: false,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, "users", user.uid), userDoc);
      await createQuinielaForUser(user.uid);

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
      await addDoc(collection(db, 'teams'), newTeam);
      setNewTeam({ name: '', flagUrl: '' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleAddMatch(e) {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'matches'), newMatch);
      setNewMatch({
        teamAId: '', teamBId: '', venue: '', date: '', time: '',
        status: 'scheduled', scoreA: 0, scoreB: 0
      });
      fetchData();
      // Optionally trigger quiniela update for all users for THIS new match
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteMatch(id) {
    if (window.confirm('¿Eliminar partido?')) {
      await deleteDoc(doc(db, 'matches', id));
      fetchData();
    }
  }

  async function handleDeleteUser(userId) {
    if (!window.confirm("¿Estás seguro de que deseas eliminar a este usuario? Se borrarán permanentemente sus quinielas y su perfil de la base de datos. Esta acción no se puede deshacer.")) return;

    setLoading(true);
    try {
      // 1. Delete user's quinielas
      const qSnap = await getDocs(query(collection(db, 'quinielas'), where('userId', '==', userId)));
      const deletePromises = qSnap.docs.map(d => deleteDoc(doc(db, 'quinielas', d.id)));
      await Promise.all(deletePromises);

      // 2. Delete user document from users collection
      await deleteDoc(doc(db, 'users', userId));

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

      await updateDoc(doc(db, 'matches', matchId), updatedMatch);
      fetchData();

      const newStatus = updatedMatch.status;
      if (newStatus === 'finished' || oldStatus === 'finished') {
        const confirmProcess = window.confirm(
          newStatus === 'finished'
            ? '¿Deseas calcular/recalcular los puntos para este partido?'
            : 'El partido ya no está finalizado. ¿Deseas resetear los puntos asociados a este partido?'
        );
        if (confirmProcess) {
          await calculatePoints(matchId, updatedMatch.scoreA, updatedMatch.scoreB, newStatus === 'finished');
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
      const qSnap = await getDocs(query(collection(db, 'quinielas'), where('matchId', '==', matchId)));
      const updates = [];

      for (const qDoc of qSnap.docs) {
        const qData = qDoc.data();
        const predA = qData.predictedScoreA;
        const predB = qData.predictedScoreB;
        const oldPoints = qData.pointsEarned || 0;

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
        updates.push(updateDoc(doc(db, 'quinielas', qDoc.id), { pointsEarned: isFinished ? newPoints : null }));

        // Adjust user totalPoints
        const userRef = doc(db, 'users', qData.userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const currentTotal = userSnap.data().totalPoints || 0;
          const newTotal = Math.max(0, currentTotal - oldPoints + newPoints);
          updates.push(updateDoc(userRef, { totalPoints: newTotal }));
        }
      }

      await Promise.all(updates);
      alert(isFinished ? `Puntos recalculados para ${qSnap.size} quinielas.` : `Puntos reseteados para ${qSnap.size} quinielas.`);
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
                <button className="delete-btn" onClick={() => deleteDoc(doc(db, 'teams', team.id)).then(fetchData)}><Trash2 size={16} /></button>
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
