import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoBig from '../logo/logo-big.svg';
import './Login.css';

const SPLASH_MS = 2000;
const ENTER_TRANSITION_MS = 2000;
const LETTER_WAVE_TOTAL_MS = 100;
const TAGLINE = 'Ideas never leave, they just wait for the right time';
const ENTER_TRANSITION_TEXT = "Hang tight, we're preparing your fallow...";
const ENTER_TRANSITION_LETTERS = ENTER_TRANSITION_TEXT.split('');

export default function Login() {
  const [stage, setStage] = useState('splash');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (stage !== 'splash') return undefined;
    const t = setTimeout(() => setStage('empty'), SPLASH_MS);
    return () => clearTimeout(t);
  }, [stage]);

  useEffect(() => {
    if (stage !== 'preparing') return undefined;
    const t = setTimeout(() => navigate('/garden'), ENTER_TRANSITION_MS);
    return () => clearTimeout(t);
  }, [navigate, stage]);

  function handleEnter() {
    setStage('preparing');
  }

  return (
    <div className="login-root" data-stage={stage}>
      {/* Shared mark — same size in every state, only its position transitions */}
      <div className="mark" aria-hidden="true">
        <img className="mark__logo" src={logoBig} alt="" />
        <span className="mark__wordmark">Fallow</span>
      </div>

      {/* Splash-only tagline */}
      <p className="splash-tagline">{TAGLINE}</p>

      {stage === 'preparing' && (
        <div className="login-transition" role="status" aria-live="polite">
          {ENTER_TRANSITION_LETTERS.map((letter, index) => (
            <span
              key={`${letter}-${index}`}
              className="login-transition__letter"
              style={{
                animationDelay: `${(index * LETTER_WAVE_TOTAL_MS) / Math.max(ENTER_TRANSITION_LETTERS.length - 1, 1)}ms`,
              }}
            >
              {letter === ' ' ? '\u00A0' : letter}
            </span>
          ))}
        </div>
      )}

      {/* Card */}
      <div className="login-card-wrap" aria-hidden={stage === 'splash'}>
        <div className="login-card">
          <div className="login-card__mark-spacer" aria-hidden="true" />
          <p className="login-card__tagline">{TAGLINE}</p>

          <div className="login-card__body">
            <div className="login-card__fields">
              <div className="login-card__field-stack">
                <input
                  className="login-card__field login-card__field--username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  autoComplete="username"
                  aria-label="Username"
                />
                <input
                  className="login-card__field login-card__field--password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password..."
                  autoComplete="current-password"
                  aria-label="Password"
                />
              </div>
              <button type="button" className="login-card__forgot">
                Forgotten your password?
              </button>
            </div>
          </div>

          <div className="login-card__actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleEnter}
            >
              Enter
            </button>
          </div>
        </div>
      </div>

      <div className="login-credit login-credit--splash">
        Planted by Hermes Agent
      </div>
      <div className="login-credit login-credit--card">
        Planted by Hermes Agent
      </div>
    </div>
  );
}
