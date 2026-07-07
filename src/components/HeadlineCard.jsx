import { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { ReactionBar } from './ReactionBar';
import { CardMedia } from './CardMedia';
import { triggerDownload } from '../utils/unsplash';
import '../styles/HeadlineCard.css';

const COMMENT_MAX = 200;

const qualityLevel = (score) => {
  if (score >= 75) return 'high';
  if (score >= 60) return 'mid';
  return 'low';
};

export const HeadlineCard = ({
  entry,
  isTopFormula,
  onCopy,
  onToggleFavorite,
  onReact,
  onComment,
  onRegenerate,
  onImageUsed,
  copyLoading,
}) => {
  const [showInfo, setShowInfo] = useState(false);
  const [editingComment, setEditingComment] = useState(false);
  const [draft, setDraft] = useState(entry.comment || '');
  const infoWrapRef = useRef(null);

  useEffect(() => {
    setDraft(entry.comment || '');
  }, [entry.comment]);

  useEffect(() => {
    if (!showInfo) return undefined;
    const handleClickOutside = (e) => {
      if (infoWrapRef.current && !infoWrapRef.current.contains(e.target)) setShowInfo(false);
    };
    const handleKey = (e) => e.key === 'Escape' && setShowInfo(false);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [showInfo]);

  const saveComment = () => {
    onComment(entry.id, draft.trim());
    setEditingComment(false);
  };

  // 이미지 "사용"(복사/즐겨찾기) 시 다운로드 트리거 1회 (가이드라인 준수)
  const markImageUsed = () => {
    if (entry.image && !entry.image.downloadTriggered) {
      triggerDownload(entry.image.downloadLocation);
      onImageUsed?.(entry.id);
    }
  };

  return (
    <div className="headline-card">
      <CardMedia image={entry.image} status={entry.imageStatus} query={entry.image?.query} />
      <div className="card-header">
        <div className="badge-wrap" ref={infoWrapRef}>
          <span className={clsx('formula-badge', `formula-badge--${entry.formula}`)}>
            {entry.formulaEmoji} {entry.formulaName}
          </span>
          {isTopFormula && (
            <span className="popularity-badge" title="내 사용 데이터 기반 인기 공식">
              🔥 인기
            </span>
          )}
          <button
            type="button"
            className="btn-info"
            onClick={() => setShowInfo((v) => !v)}
            aria-label={`${entry.formulaName} 공식 설명 보기`}
            aria-expanded={showInfo}
            title="공식 설명"
          >
            ?
          </button>
          {showInfo && (
            <div className="formula-popover" role="tooltip">
              <strong className="popover-title">
                {entry.formulaEmoji} {entry.formulaName} · {entry.formulaFramework}
              </strong>
              <p className="popover-body">{entry.formulaDescription}</p>
            </div>
          )}
        </div>

        <div className="card-actions">
          <button
            type="button"
            className={clsx('btn-icon btn-copy', { 'btn-copy--loading': copyLoading })}
            onClick={() => {
              markImageUsed();
              onCopy(entry.id, entry.headline);
            }}
            aria-label="헤드라인 클립보드에 복사"
            title="클립보드에 복사"
            disabled={copyLoading}
          >
            {copyLoading ? '✅' : '📋'}
          </button>
          <button
            type="button"
            className={clsx('btn-icon btn-favorite', { 'btn-favorite--active': entry.isFavorite })}
            onClick={() => {
              markImageUsed();
              onToggleFavorite(entry.id);
            }}
            aria-label={entry.isFavorite ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'}
            aria-pressed={entry.isFavorite}
            title={entry.isFavorite ? '즐겨찾기 제거' : '즐겨찾기 추가'}
          >
            {entry.isFavorite ? '⭐' : '☆'}
          </button>
        </div>
      </div>

      <div className="card-content">
        <p className="headline-text">{entry.headline}</p>
      </div>

      <div className="card-meta">
        <span
          className={clsx('quality-chip', `quality-chip--${qualityLevel(entry.qualityScore)}`)}
          title="카피 품질 점수 (0~100)"
        >
          품질 {entry.qualityScore}
        </span>
        <span className="framework-chip" title="적용된 카피라이팅 프레임워크">
          {entry.formulaFramework}
        </span>
        <span className="seed-chip" title="변형 시드">seed {entry.variationSeed}</span>
      </div>

      <ReactionBar reaction={entry.reaction} onReact={(r) => onReact(entry.id, r)} />

      <div className="card-comment">
        {editingComment ? (
          <div className="comment-editor">
            <textarea
              className="comment-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, COMMENT_MAX))}
              placeholder="이 카피에 대한 메모 (예: 숫자를 더 크게 강조하면 좋을 듯)"
              rows={2}
              maxLength={COMMENT_MAX}
              autoFocus
            />
            <div className="comment-actions">
              <span className="comment-count">
                {draft.length}/{COMMENT_MAX}
              </span>
              <button type="button" className="comment-save" onClick={saveComment}>
                저장
              </button>
              <button
                type="button"
                className="comment-cancel"
                onClick={() => {
                  setDraft(entry.comment || '');
                  setEditingComment(false);
                }}
              >
                취소
              </button>
            </div>
          </div>
        ) : entry.comment ? (
          <button
            type="button"
            className="comment-display"
            onClick={() => setEditingComment(true)}
            title="코멘트 편집"
          >
            💬 {entry.comment}
          </button>
        ) : (
          <button
            type="button"
            className="comment-add"
            onClick={() => setEditingComment(true)}
          >
            💬 코멘트 추가
          </button>
        )}
      </div>

      <div className="card-footer">
        <button
          type="button"
          className="btn-regenerate"
          onClick={() => onRegenerate(entry.formula)}
          aria-label={`${entry.formulaName} 헤드라인 다시 생성`}
          title="같은 공식으로 다시 생성"
        >
          🔄 다시 생성
        </button>
      </div>
    </div>
  );
};
