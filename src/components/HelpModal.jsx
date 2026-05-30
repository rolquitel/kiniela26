import { useState } from 'react';
import { X, HelpCircle, Trophy, Clock, Star, BookOpen } from 'lucide-react';

export default function HelpModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('rules');

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="glass-card modal-container animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrapper">
            <HelpCircle className="modal-title-icon text-primary" size={24} />
            <h2>Guía de Ayuda</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-tabs">
          <button
            className={`modal-tab-btn ${activeTab === 'rules' ? 'active' : ''}`}
            onClick={() => setActiveTab('rules')}
          >
            <Trophy size={16} />
            Reglas del Juego
          </button>
          <button
            className={`modal-tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
            onClick={() => setActiveTab('manual')}
          >
            <BookOpen size={16} />
            Manual de Uso
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'rules' ? (
            <div className="help-content-section">
              <div className="help-card-row">
                <div className="help-icon-box">
                  <Clock size={24} className="text-accent" />
                </div>
                <div className="help-text-box">
                  <h3>Cierre de Pronósticos</h3>
                  <p>
                    Tienes hasta <strong>1 hora antes</strong> de la hora oficial del partido para registrar o modificar tu quiniela.
                    Pasado ese tiempo, las predicciones se bloquean y no se pueden modificar bajo ninguna circunstancia.
                  </p>
                </div>
              </div>

              <div className="help-card-row mt-6">
                <div className="help-icon-box">
                  <Trophy size={24} className="text-primary" />
                </div>
                <div className="help-text-box">
                  <h3>Sistema de Puntos</h3>
                  <p>Los puntos se otorgan automáticamente cuando un partido finaliza:</p>
                  <ul className="help-list mt-2">
                    <li>
                      <span className="badge-pts success">3 Puntos</span> <strong>Marcador Exacto:</strong>
                      <p>Si aciertas el resultado exacto y goles de ambos equipos (ej. pronosticaste 2-1 y el juego termina 2-1).</p>
                    </li>
                    <li>
                      <span className="badge-pts info">1 Punto</span> <strong>Resultado General:</strong>
                      <p>Si aciertas al ganador (o empate) pero no los goles exactos (ej. pronosticaste 1-0, el juego termina 3-1; o pronosticaste 1-1 y termina 2-2).</p>
                    </li>
                    <li>
                      <span className="badge-pts danger">0 Puntos</span> <strong>Sin Aciertos:</strong>
                      <p>Si no aciertas ni el ganador ni el empate.</p>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="help-content-section">
              <div className="help-card-row">
                <div className="help-icon-box">
                  <Star size={24} className="text-primary" />
                </div>
                <div className="help-text-box">
                  <h3>¿Cómo jugar?</h3>
                  <p>
                    Navega a la sección **Mi Quiniela**, ingresa tus marcadores sugeridos y presiona **Guardar Marcador** para confirmar tu predicción.
                  </p>
                </div>
              </div>

              <div className="manual-grid mt-6">
                <div className="manual-item">
                  <h4>⚽ Partidos</h4>
                  <p>Visualiza el listado completo de partidos que ya finalizaron, los marcadores reales y tus puntos ganados.</p>
                </div>
                <div className="manual-item">
                  <h4>📊 Leaderboard</h4>
                  <p>Consulta la clasificación general para ver los puntajes acumulados de todos los jugadores en tiempo real.</p>
                </div>
                <div className="manual-item">
                  <h4>👥 Comunidad</h4>
                  <p>
                    Explora todos los juegos en una tabla interactiva para ver qué pronosticaron otros usuarios.
                    También puedes consultar el perfil de lectura de cualquier usuario para auditar sus quinielas juego por juego.
                  </p>
                </div>
                {window.localStorage.getItem('isAdmin') === 'true' && (
                  <div className="manual-item admin-highlight">
                    <h4>🛠️ Admin Panel</h4>
                    <p>
                      Permite a los administradores registrar marcadores finales de partidos (calculando puntos automáticamente) y dar de baja usuarios.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
