import clsx from 'clsx';
import '../styles/Tabs.css';

export const Tabs = ({ tabs, active, onChange }) => (
  <nav className="tabs" role="tablist" aria-label="화면 전환">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        type="button"
        role="tab"
        aria-selected={active === tab.id}
        className={clsx('tab', { 'tab--active': active === tab.id })}
        onClick={() => onChange(tab.id)}
      >
        <span className="tab-emoji">{tab.emoji}</span>
        <span className="tab-label">{tab.label}</span>
        {typeof tab.badge === 'number' && tab.badge > 0 && (
          <span className="tab-badge">{tab.badge}</span>
        )}
      </button>
    ))}
  </nav>
);
