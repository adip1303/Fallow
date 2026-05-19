import { useEffect, useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import logoSmall from '../logo/logo-small.svg';
import iconDiscord from '../icons/discord.svg';
import iconTelegram from '../icons/telegram.svg';
import iconEmail from '../icons/email.svg';
import iconYes from '../icons/yes.svg';
import './Onboarding.css';

const STEPS = [
  {
    id: 1,
    type: 'text',
    title: 'Tell us what you do',
    sub: 'This helps Fallow understand your background',
  },
  {
    id: 2,
    type: 'text',
    title: 'What gets you excited?',
    sub: 'Your interests help Fallow find relevant ideas',
  },
  {
    id: 3,
    type: 'text',
    title: 'What do you have to work with?',
    sub: 'Tools, resources, skills, access',
  },
  {
    id: 4,
    type: 'text',
    title: 'What are you working towards?',
    sub: 'Your goals shape how Fallow surfaces ideas',
  },
  {
    id: 5,
    type: 'multi',
    title: 'How should we reach you?',
    sub: 'Select all that apply. You can change this later in the settings.',
    options: [
      {
        id: 'fallow',
        title: 'Fallow',
        sub: 'In-app notifications and ideas feed',
        icon: logoSmall,
        defaultSelected: true,
      },
      {
        id: 'discord',
        title: 'Discord',
        sub: 'Messages via your connected Discord account',
        icon: iconDiscord,
      },
      {
        id: 'telegram',
        title: 'Telegram',
        sub: 'Messages via your Telegram account',
        icon: iconTelegram,
      },
      {
        id: 'email',
        title: 'Email',
        sub: 'Sent to the address associated with your account',
        icon: iconEmail,
      },
    ],
  },
];

export default function Onboarding() {
  const { step } = useParams();
  const navigate = useNavigate();
  const stepNum = Number(step);

  const [textAnswers, setTextAnswers] = useState({});
  const [reachOptions, setReachOptions] = useState({ fallow: true });
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    if (!transitioning) return undefined;
    const t = setTimeout(() => navigate('/garden'), 2000);
    return () => clearTimeout(t);
  }, [transitioning, navigate]);

  if (transitioning) return <Transition />;

  if (!stepNum || stepNum < 1 || stepNum > STEPS.length) {
    return <Navigate to="/onboarding/1" replace />;
  }

  const current = STEPS[stepNum - 1];
  const isLast = stepNum === STEPS.length;

  function handleBack() {
    if (stepNum === 1) {
      navigate('/login');
    } else {
      navigate(`/onboarding/${stepNum - 1}`);
    }
  }

  function handleContinue() {
    if (isLast) {
      setTransitioning(true);
    } else {
      navigate(`/onboarding/${stepNum + 1}`);
    }
  }

  function toggleOption(id) {
    setReachOptions((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="onboarding">
      <div className="onboarding__steps" aria-label={`Step ${stepNum} of ${STEPS.length}`}>
        {STEPS.map((s) => (
          <span
            key={s.id}
            className={`onboarding__step${s.id === stepNum ? ' is-active' : ''}`}
          />
        ))}
      </div>

      <div className="onboarding__heading">
        <h1 className="onboarding__title">{current.title}</h1>
        <p className="onboarding__subtitle">{current.sub}</p>
      </div>

      <div className="onboarding__form">
        {current.type === 'text' ? (
          <textarea
            className="onboarding__textarea"
            value={textAnswers[stepNum] || ''}
            onChange={(e) =>
              setTextAnswers((prev) => ({ ...prev, [stepNum]: e.target.value }))
            }
            placeholder=""
            aria-label={current.title}
          />
        ) : (
          <div className="onboarding__options">
            {current.options.map((opt) => {
              const selected = !!reachOptions[opt.id];
              return (
                <button
                  type="button"
                  key={opt.id}
                  className={`onboarding__option${selected ? ' is-selected' : ''}`}
                  onClick={() => toggleOption(opt.id)}
                  aria-pressed={selected}
                >
                  <span className="onboarding__check" aria-hidden="true">
                    <img className="onboarding__check-mark" src={iconYes} alt="" />
                  </span>
                  <img className="onboarding__option-icon" src={opt.icon} alt="" />
                  <span className="onboarding__option-text">
                    <span className="onboarding__option-title">{opt.title}</span>
                    <span className="onboarding__option-sub">{opt.sub}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="onboarding__actions">
          <button
            type="button"
            className="onboarding__btn onboarding__btn--secondary"
            onClick={handleBack}
          >
            Go Back
          </button>
          <button
            type="button"
            className="onboarding__btn onboarding__btn--primary"
            onClick={handleContinue}
          >
            {isLast ? 'Finish' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Transition() {
  const text = "Hang tight, we're preparing your fallow…";
  return (
    <div className="onboarding-transition">
      <div className="onboarding-transition__text" aria-label={text}>
        {Array.from(text).map((ch, i) => (
          <span
            key={i}
            className="wave-char"
            aria-hidden="true"
            style={{ animationDelay: `${i * 12}ms` }}
          >
            {ch === ' ' ? ' ' : ch}
          </span>
        ))}
      </div>
    </div>
  );
}
