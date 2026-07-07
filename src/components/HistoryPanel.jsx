import { useState, useMemo } from 'react';
import clsx from 'clsx';
import { formulas } from '../data/formulas';
import { toneById } from '../data/lexicon';
import { ReactionBar } from './ReactionBar';
import '../styles/HistoryPanel.css';

const formatDate = (iso) => {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(
      d.getDate()
    ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '';
  }
};

export const HistoryPanel = ({
  entries,
  onRerunSame,
  onLoadInputs,
  onCopy,
  onToggleFavorite,
  onReact,
  onRemove,
  onClearAll,
  copyingId,
}) => {
  const [query, setQuery] = useState('');
  const [formulaFilter, setFormulaFilter] = useState('all');
  const [favOnly, setFavOnly] = useState(false);
  const [reactedOnly, setReactedOnly] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (formulaFilter !== 'all' && e.formula !== formulaFilter) return false;
      if (favOnly && !e.isFavorite) return false;
      if (reactedOnly && !e.reaction) return false;
      if (q) {
        const hay = `${e.headline} ${e.inputs?.keyword || ''} ${e.inputs?.target || ''} ${
          e.inputs?.benefit || ''
        }`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [entries, query, formulaFilter, favOnly, reactedOnly]);

  if (entries.length === 0) {
    return (
      <div className="history-panel">
        <div className="empty-state">
          <p className="empty-state-icon">🗂️</p>
          <p className="empty-state-text">
            아직 생성 이력이 없어요.
            <br />
            [생성] 탭에서 헤드라인을 만들어보세요!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="history-panel">
      <div className="history-toolbar">
        <input
          type="search"
          className="history-search"
          placeholder="🔍 키워드·헤드라인 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="이력 검색"
        />
        <div className="history-filters">
          <select
            className="history-select"
            value={formulaFilter}
            onChange={(e) => setFormulaFilter(e.target.value)}
            aria-label="공식 필터"
          >
            <option value="all">모든 공식</option>
            {formulas.map((f) => (
              <option key={f.id} value={f.id}>
                {f.emoji} {f.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={clsx('filter-chip', { 'filter-chip--active': favOnly })}
            onClick={() => setFavOnly((v) => !v)}
            aria-pressed={favOnly}
          >
            ⭐ 즐겨찾기
          </button>
          <button
            type="button"
            className={clsx('filter-chip', { 'filter-chip--active': reactedOnly })}
            onClick={() => setReactedOnly((v) => !v)}
            aria-pressed={reactedOnly}
          >
            💬 리액션
          </button>
        </div>
      </div>

      <div className="history-summary">
        <span>
          {filtered.length}
          {filtered.length !== entries.length && ` / ${entries.length}`}건
        </span>
        <button type="button" className="history-clear" onClick={onClearAll}>
          이력 전체 삭제
        </button>
      </div>

      <ul className="history-list">
        {filtered.map((e) => (
          <li key={e.id} className="history-item">
            <div className="history-item-main">
              <div className="history-item-top">
                <span className={clsx('formula-badge', `formula-badge--${e.formula}`)}>
                  {e.formulaEmoji} {e.formulaName}
                </span>
                <span className="history-quality">품질 {e.qualityScore}</span>
                <span className="history-date">{formatDate(e.generatedAt)}</span>
              </div>
              <p className="history-headline">{e.headline}</p>
              <p className="history-inputs">
                🔑 {e.inputs?.keyword}
                {e.inputs?.target ? ` · 🎯 ${e.inputs.target}` : ''}
                {e.inputs?.benefit ? ` · 🎁 ${e.inputs.benefit}` : ''}
                {e.inputs?.tone ? ` · ${toneById[e.inputs.tone]?.emoji || ''} ${toneById[e.inputs.tone]?.name || ''}` : ''}
              </p>
              <ReactionBar reaction={e.reaction} onReact={(r) => onReact(e.id, r)} size="sm" />
              {e.comment && <p className="history-comment">💬 {e.comment}</p>}
            </div>

            <div className="history-item-actions">
              <button
                type="button"
                className="history-action"
                onClick={() => onRerunSame(e.inputs)}
                title="같은 입력으로 새 시안 생성"
              >
                🔄 동일조건 재생성
              </button>
              <button
                type="button"
                className="history-action"
                onClick={() => onLoadInputs(e.inputs)}
                title="이 입력을 폼에 채우기"
              >
                📝 입력 불러오기
              </button>
              <div className="history-icon-actions">
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => onCopy(e.id, e.headline)}
                  aria-label="복사"
                  disabled={copyingId === e.id}
                >
                  {copyingId === e.id ? '✅' : '📋'}
                </button>
                <button
                  type="button"
                  className={clsx('btn-icon', { 'btn-favorite--active': e.isFavorite })}
                  onClick={() => onToggleFavorite(e.id)}
                  aria-label={e.isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}
                  aria-pressed={e.isFavorite}
                >
                  {e.isFavorite ? '⭐' : '☆'}
                </button>
                <button
                  type="button"
                  className="btn-icon btn-remove"
                  onClick={() => onRemove(e.id)}
                  aria-label="이력에서 삭제"
                >
                  ✕
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
