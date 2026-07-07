import { buildImageUrl } from '../utils/imageQuery';
import '../styles/CardMedia.css';

/** devicePixelRatio 상한 2 (경량화) */
const dpr = () =>
  typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;

/**
 * [NEW] 카드 상단 중심 이미지 밴드 (F22, 기술명세서 §6.1).
 * - ready: color 배경 → thumb 블러(blur-up) → 원본 img → 스크림 → 어트리뷰션
 * - loading: 스켈레톤
 * - none/failed: 아무것도 렌더하지 않음(= v3 글래스 카드 그대로, 무손실 폴백)
 *
 * blur-up은 무의존 방식: 배경 blur(thumb) 위로 원본 img가 로드되며 자연스럽게 덮는다.
 */
export const CardMedia = ({ image, status, query }) => {
  if (status === 'ready' && image) {
    return (
      <div className="card-media" style={{ backgroundColor: image.color || 'var(--surface-2)' }}>
        {image.urls?.thumb && (
          <div
            className="card-media__blur"
            style={{ backgroundImage: `url(${image.urls.thumb})` }}
            aria-hidden="true"
          />
        )}
        <img
          className="card-media__img"
          src={buildImageUrl(image.urls.regular, { w: 800, dpr: dpr() })}
          srcSet={`${buildImageUrl(image.urls.small, { w: 400 })} 400w, ${buildImageUrl(
            image.urls.regular,
            { w: 800 }
          )} 800w`}
          sizes="(max-width: 600px) 100vw, 400px"
          alt={image.altText || query || ''}
          loading="lazy"
          decoding="async"
        />
        <div className="card-media__scrim" aria-hidden="true" />
        {image.photographer && (
          <span className="card-media__credit">
            Photo by{' '}
            <a href={image.photographer.profileUrl} target="_blank" rel="noreferrer noopener">
              {image.photographer.name}
            </a>{' '}
            on{' '}
            <a
              href="https://unsplash.com/?utm_source=copy_gacha&utm_medium=referral"
              target="_blank"
              rel="noreferrer noopener"
            >
              Unsplash
            </a>
          </span>
        )}
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="card-media card-media--loading">
        <div className="card-media__skeleton" aria-hidden="true" />
      </div>
    );
  }

  return null; // none | failed → 글래스 폴백
};
