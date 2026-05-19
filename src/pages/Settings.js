import { useLayoutEffect, useRef, useState } from 'react';
import './Settings.css';
import editIcon from '../icons/edit.svg';
import yesIcon from '../icons/yes.svg';
import discordIcon from '../icons/discord.svg';
import telegramIcon from '../icons/telegram.svg';
import emailIcon from '../icons/email.svg';
import userBlankIcon from '../icons/user-blank.svg';
import { useStore } from '../hooks/useStore';

const SETTINGS_KEY = 'fallow:settings';
const DEFAULT_SETTINGS = {
  preferredName: 'Adhip',
  username: 'adhiparora13',
  email: 'adhiparora13@gmail.com',
  persona:
    "I'm a designer with a background in industrial design. I'm fascinated by physical as well as digital design, with a large emphasis on technology and it's implementation into human life. My design philosophy is driven by creating products and ideas that place an emphasis on overall human benefit, in whatever shape that may take.",
  webSearchCadence: 'Every 3 hours',
  reachMethod: 'via Discord',
};

function readSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
    return { ...DEFAULT_SETTINGS, ...(saved || {}) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export default function Settings() {
  const [emailRevealed, setEmailRevealed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [settings, setSettings] = useState(readSettings);
  const [draftSettings, setDraftSettings] = useState(settings);
  const personaRef = useRef(null);
  const { ready, seeds, conditions, branches, roots, conditionScans } = useStore();

  const discordConnected = ready && (
    seeds.length > 0
    || conditions.length > 0
    || Object.keys(branches || {}).length > 0
    || Object.keys(roots || {}).length > 0
    || Object.keys(conditionScans || {}).length > 0
  );

  function handleStartEdit() {
    setDraftSettings(settings);
    setIsEditing(true);
  }

  function handleSave() {
    setSettings(draftSettings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(draftSettings));
    setIsEditing(false);
  }

  function handleCancel() {
    setDraftSettings(settings);
    setIsEditing(false);
  }

  function updateDraft(key, value) {
    setDraftSettings((prev) => ({ ...prev, [key]: value }));
  }

  useLayoutEffect(() => {
    const textarea = personaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    if (isEditing) {
      textarea.style.overflowY = 'hidden';
      textarea.style.height = `${scrollHeight}px`;
      return;
    }

    const styles = window.getComputedStyle(textarea);
    const lineHeight = parseFloat(styles.lineHeight) || 23.1;
    const paddingTop = parseFloat(styles.paddingTop) || 0;
    const paddingBottom = parseFloat(styles.paddingBottom) || 0;
    const maxViewHeight = (lineHeight * 6) + paddingTop + paddingBottom;
    const isOverflowing = scrollHeight > maxViewHeight;
    textarea.style.overflowY = isOverflowing ? 'auto' : 'hidden';
    textarea.style.height = `${Math.min(scrollHeight, maxViewHeight)}px`;
  }, [draftSettings.persona, isEditing, settings.persona]);

  return (
    <div className="page settings-page">
      <div className="settings-wrapper">
        <div className="settings-card">
          <div className="settings-header">
            <h1 className="settings-title">Settings</h1>
            <div className="settings-header__actions">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    className="settings-edit-btn settings-edit-btn--cancel"
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="settings-edit-btn settings-edit-btn--save"
                    onClick={handleSave}
                  >
                    <img src={yesIcon} alt="" />
                    Save
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="settings-edit-btn"
                  onClick={handleStartEdit}
                >
                  <img src={editIcon} alt="" />
                  Edit
                </button>
              )}
            </div>
          </div>

          <img
            src={userBlankIcon}
            alt=""
            className="settings-avatar"
            width="128"
            height="128"
          />

          <div className="settings-fields">
            <div className="settings-field">
              <div className="settings-field__label">
                Preferred Name{' '}
                <span className="settings-field__helper">
                  (This is what we call you)
                </span>
              </div>
              {isEditing ? (
                <input
                  className="settings-field__input"
                  value={draftSettings.preferredName}
                  onChange={(e) => updateDraft('preferredName', e.target.value)}
                />
              ) : (
                <div className="settings-field__value">{settings.preferredName}</div>
              )}
            </div>

            <div className="settings-field">
              <div className="settings-field__label">Username</div>
              {isEditing ? (
                <input
                  className="settings-field__input"
                  value={draftSettings.username}
                  onChange={(e) => updateDraft('username', e.target.value)}
                />
              ) : (
                <div className="settings-field__value">{settings.username}</div>
              )}
            </div>

            <div className="settings-field">
              <div className="settings-field__label">Email</div>
              <div className="settings-field__row">
                {isEditing ? (
                  <input
                    className="settings-field__input"
                    type="email"
                    value={draftSettings.email}
                    onChange={(e) => updateDraft('email', e.target.value)}
                  />
                ) : (
                  <>
                    <div className="settings-field__value">
                      {emailRevealed ? settings.email : `***********@${settings.email.split('@')[1] || 'gmail.com'}`}
                    </div>
                    <button
                      type="button"
                      className="settings-field__reveal"
                      onClick={() => setEmailRevealed((v) => !v)}
                    >
                      {emailRevealed ? 'Hide' : 'Reveal'}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="settings-field">
              <div className="settings-field__label">Persona</div>
              <textarea
                ref={personaRef}
                className={`settings-field__value--box${isEditing ? ' is-editing' : ''}`}
                readOnly={!isEditing}
                value={isEditing ? draftSettings.persona : settings.persona}
                onChange={(e) => updateDraft('persona', e.target.value)}
              />
            </div>

            <div className="settings-field">
              <div className="settings-field__label">
                Web search cadence{' '}
                <span className="settings-field__helper">
                  (How often Fallow searches the web for new branches)
                </span>
              </div>
              {isEditing ? (
                <input
                  className="settings-field__input"
                  value={draftSettings.webSearchCadence}
                  onChange={(e) => updateDraft('webSearchCadence', e.target.value)}
                />
              ) : (
                <div className="settings-field__value">{settings.webSearchCadence}</div>
              )}
            </div>

            <div className="settings-field">
              <div className="settings-field__label">
                How should we reach you?
              </div>
              {isEditing ? (
                <input
                  className="settings-field__input"
                  value={draftSettings.reachMethod}
                  onChange={(e) => updateDraft('reachMethod', e.target.value)}
                />
              ) : (
                <div className="settings-field__value">{settings.reachMethod}</div>
              )}
            </div>

            <div className="settings-apps">
              <div className="settings-apps__label">Connected Apps</div>
              <div className="settings-apps__row">
                {[
                  { id: 'discord', label: 'Discord', icon: discordIcon, connected: discordConnected },
                  { id: 'telegram', label: 'Telegram', icon: telegramIcon, connected: false },
                  { id: 'email', label: 'Email', icon: emailIcon, connected: false },
                ].map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    className={`settings-app${app.connected ? ' is-connected' : ''}`}
                    aria-pressed={app.connected}
                  >
                    <div className="settings-app__top">
                      <div className="settings-app__status">
                        <img src={yesIcon} alt="" className="settings-app__check-mark" />
                      </div>
                      <img src={app.icon} alt={app.label} className="settings-app__icon" />
                    </div>
                    <span className="settings-app__label">{app.label}</span>
                    <span className="settings-app__sub">
                      {app.connected ? '\u00a0' : '(Not connected)'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
