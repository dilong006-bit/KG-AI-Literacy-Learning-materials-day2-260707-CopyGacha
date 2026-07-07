import { useState } from 'react';
import '../styles/FavoritesSection.css';

export const FavoritesSection = ({
  favorites,
  onRemove,
  onCopy,
  onClearAll,
  copyingId,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (favorites.length === 0) {
    return null;
  }

  return (
    <div className="favorites-section">
      <button
        type="button"
        className="favorites-header"
        onClick={() => setIsExpanded((v) => !v)}
        aria-expanded={isExpanded}
        aria-label={`즐겨찾기 ${favorites.length}개, ${isExpanded ? '접기' : '펼치기'}`}
      >
        <h3 className="favorites-title">⭐ 즐겨찾기 ({favorites.length})</h3>
        <span className="expand-btn" aria-hidden="true">
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>

      {isExpanded && (
        <div className="favorites-content">
          <div className="favorites-list">
            {favorites.map((favorite) => (
              <div key={favorite.id} className="favorite-item">
                <div className="favorite-info">
                  <p className="favorite-headline">{favorite.headline}</p>
                  <p className="favorite-formula">{favorite.formulaName}</p>
                </div>
                <div className="favorite-actions">
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => onCopy(favorite.id, favorite.headline)}
                    aria-label="헤드라인 복사"
                    title="복사"
                    disabled={copyingId === favorite.id}
                  >
                    {copyingId === favorite.id ? '✅' : '📋'}
                  </button>
                  <button
                    type="button"
                    className="btn-icon btn-remove"
                    onClick={() => onRemove(favorite.id)}
                    aria-label="즐겨찾기에서 제거"
                    title="제거"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button type="button" className="btn-clear-all" onClick={onClearAll}>
            즐겨찾기 전체 해제
          </button>
        </div>
      )}
    </div>
  );
};
