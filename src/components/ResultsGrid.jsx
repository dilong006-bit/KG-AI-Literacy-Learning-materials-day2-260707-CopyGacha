import { HeadlineCard } from './HeadlineCard';
import { RouletteReel } from './RouletteReel';
import '../styles/ResultsGrid.css';

export const ResultsGrid = ({
  entries,
  rolling,
  error,
  inputs,
  styleStats,
  onCopy,
  onToggleFavorite,
  onReact,
  onComment,
  onRegenerate,
  onImageUsed,
  copyingId,
}) => {
  if (rolling) {
    return <RouletteReel inputs={inputs} />;
  }

  if (error && (!entries || entries.length === 0)) {
    return (
      <div className="results-container">
        <div className="error-message" role="alert">
          {error}
        </div>
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="results-container">
        <div className="empty-state">
          <p className="empty-state-icon">✨</p>
          <p className="empty-state-text">
            키워드를 입력하고 생성 버튼을 클릭하세요.
            <br />
            6가지 검증된 공식으로 헤드라인이 생성됩니다!
          </p>
        </div>
      </div>
    );
  }

  // 인기 스타일(F12) 순서로 정렬 — 선호 공식이 위로
  const ranking = styleStats?.ranking || [];
  const ordered = [...entries].sort(
    (a, b) => ranking.indexOf(a.formula) - ranking.indexOf(b.formula)
  );
  const topFormulas = styleStats?.topFormulas || new Set();

  return (
    <div className="results-container">
      <div className="results-header">
        <h2>생성된 헤드라인</h2>
        <p className="results-count">
          {entries.length}개 · 품질순/인기순으로 정렬됩니다
        </p>
      </div>

      <div className="results-grid">
        {ordered.map((entry) => (
          <HeadlineCard
            key={entry.id}
            entry={entry}
            isTopFormula={topFormulas.has(entry.formula)}
            onCopy={onCopy}
            onToggleFavorite={onToggleFavorite}
            onReact={onReact}
            onComment={onComment}
            onRegenerate={onRegenerate}
            onImageUsed={onImageUsed}
            copyLoading={copyingId === entry.id}
          />
        ))}
      </div>
    </div>
  );
};
