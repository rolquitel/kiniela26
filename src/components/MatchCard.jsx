import { useState } from 'react';
import { Calendar, Clock, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function MatchCard({ match, teams, currentUserQuiniela, onSave, isSubmitting }) {
  const teamA = teams[match.teamAId];
  const teamB = teams[match.teamBId];

  const [prevQuiniela, setPrevQuiniela] = useState(currentUserQuiniela);
  const [scoreA, setScoreA] = useState(currentUserQuiniela?.predictedScoreA ?? '');
  const [scoreB, setScoreB] = useState(currentUserQuiniela?.predictedScoreB ?? '');

  if (currentUserQuiniela !== prevQuiniela) {
    setPrevQuiniela(currentUserQuiniela);
    setScoreA(currentUserQuiniela?.predictedScoreA ?? '');
    setScoreB(currentUserQuiniela?.predictedScoreB ?? '');
  }

  const matchTime = new Date(`${match.date}T${match.time}`);
  const now = new Date();
  const isLocked = (matchTime - now) / (1000 * 60 * 60) < 1 || match.status === 'finished';
  const isFinished = match.status === 'finished';

  // Calculate points dynamically in the UI
  let pointsEarned = 0;
  if (isFinished && currentUserQuiniela) {
    const finalA = match.scoreA;
    const finalB = match.scoreB;
    const predA = currentUserQuiniela.predictedScoreA;
    const predB = currentUserQuiniela.predictedScoreB;

    if (predA !== undefined && predB !== undefined && predA !== null && predB !== null) {
      if (predA === finalA && predB === finalB) {
        pointsEarned = 3;
      } else {
        const finalResult = finalA > finalB ? 'A' : finalB > finalA ? 'B' : 'Draw';
        const predResult = predA > predB ? 'A' : predB > predA ? 'B' : 'Draw';
        if (finalResult === predResult) {
          pointsEarned = 1;
        }
      }
    }
  }

  return (
    <div className={`glass-card match-card ${isLocked ? 'locked' : ''}`}>
      <div className="match-meta">
        <span className="match-match-number">#{match.matchNumber}</span>
        <span><Calendar size={14} /> {match.date}</span>
        <span><Clock size={14} /> {match.time}</span>
        {match.status === 'live' && <span className="live-pill">En Vivo</span>}
      </div>
      <div className="match-venue-row">
        <MapPin size={14} /> {match.venue}
      </div>

      <div className="match-teams-row">
        <div className="team-info">
          <img src={teamA?.flagUrl} alt="" className="flag-lg" />
          <span className="team-name">{teamA?.name}</span>
        </div>

        <div className="match-prediction">
          <input
            type="number"
            value={scoreA}
            onChange={e => setScoreA(e.target.value)}
            disabled={isLocked || isSubmitting}
            placeholder="-"
          />
          <span className="vs">vs</span>
          <input
            type="number"
            value={scoreB}
            onChange={e => setScoreB(e.target.value)}
            disabled={isLocked || isSubmitting}
            placeholder="-"
          />
        </div>

        <div className="team-info">
          <span className="team-name text-right">{teamB?.name}</span>
          <img src={teamB?.flagUrl} alt="" className="flag-lg" />
        </div>
      </div>

      <div className="match-footer">
        {isFinished ? (
          <div className="result-display">
            <span className="label">Resultado Final:</span>
            <span className="final-score">{match.scoreA} - {match.scoreB}</span>
            {currentUserQuiniela && (
              <span className={`points-badge ${pointsEarned > 0 ? 'success' : ''}`}>
                +{pointsEarned} pts
              </span>
            )}
          </div>
        ) : isLocked ? (
          <div className="locked-msg">
            <AlertCircle size={16} />
            <span>Predicciones cerradas</span>
          </div>
        ) : (
          <button
            className={`btn-primary btn-sm save-btn ${currentUserQuiniela ? 'updated' : ''}`}
            onClick={() => onSave(scoreA, scoreB)}
            disabled={isSubmitting || scoreA === '' || scoreB === ''}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar Marcador'}
          </button>
        )}
      </div>

      {currentUserQuiniela && !isFinished && (
        <div className="saved-badge">
          <CheckCircle2 size={14} />
          <span>Predicción guardada</span>
        </div>
      )}
    </div>
  );
}
