import clsx from 'clsx';
import '../styles/ReactionBar.css';

// F11 리액션 정의
export const REACTIONS = [
  { id: 'like', emoji: '👍', label: '좋아요' },
  { id: 'love', emoji: '❤️', label: '최고' },
  { id: 'fire', emoji: '🔥', label: '강력' },
  { id: 'hmm', emoji: '🤔', label: '애매' },
];

export const ReactionBar = ({ reaction, onReact, size = 'md' }) => (
  <div className={clsx('reaction-bar', `reaction-bar--${size}`)} role="group" aria-label="리액션">
    {REACTIONS.map((r) => (
      <button
        key={r.id}
        type="button"
        className={clsx('reaction-btn', { 'reaction-btn--active': reaction === r.id })}
        onClick={() => onReact(r.id)}
        aria-label={r.label}
        aria-pressed={reaction === r.id}
        title={r.label}
      >
        <span className="reaction-emoji">{r.emoji}</span>
      </button>
    ))}
  </div>
);
