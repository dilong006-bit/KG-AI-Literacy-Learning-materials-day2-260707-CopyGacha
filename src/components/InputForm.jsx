import { useState } from 'react';
import clsx from 'clsx';
import { validateForm } from '../utils/validation';
import { TONES, DEFAULT_TONE } from '../data/lexicon';
import '../styles/InputForm.css';

export const InputForm = ({ onGenerate, loading, initialValues }) => {
  const [keyword, setKeyword] = useState(initialValues?.keyword || '');
  const [target, setTarget] = useState(initialValues?.target || '');
  const [benefit, setBenefit] = useState(initialValues?.benefit || '');
  const [tone, setTone] = useState(initialValues?.tone || DEFAULT_TONE);
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validateForm({ keyword, target, benefit });
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      onGenerate(keyword, target, benefit, tone);
    }
  };

  const handleReset = () => {
    setKeyword('');
    setTarget('');
    setBenefit('');
    setTone(DEFAULT_TONE);
    setErrors({});
  };

  return (
    <form className="input-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="keyword" className="form-label">
          제품/서비스 키워드 <span className="required">*</span>
        </label>
        <input
          id="keyword"
          type="text"
          className={clsx('form-input', { 'form-input--error': errors.keyword })}
          placeholder="예: 무선 이어폰, 온라인 영어 수업"
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
            if (errors.keyword) setErrors({ ...errors, keyword: '' });
          }}
          maxLength="50"
          disabled={loading}
        />
        {errors.keyword && <span className="form-error">{errors.keyword}</span>}
        <span className="form-hint">{keyword.length}/50</span>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="target" className="form-label">
            타깃 고객 <span className="optional">(선택)</span>
          </label>
          <input
            id="target"
            type="text"
            className={clsx('form-input', { 'form-input--error': errors.target })}
            placeholder="예: 직장인, 20대 여성"
            value={target}
            onChange={(e) => {
              setTarget(e.target.value);
              if (errors.target) setErrors({ ...errors, target: '' });
            }}
            maxLength="30"
            disabled={loading}
          />
          {errors.target && <span className="form-error">{errors.target}</span>}
          <span className="form-hint">{target.length}/30</span>
        </div>

        <div className="form-group">
          <label htmlFor="benefit" className="form-label">
            핵심 혜택 <span className="optional">(선택)</span>
          </label>
          <input
            id="benefit"
            type="text"
            className={clsx('form-input', { 'form-input--error': errors.benefit })}
            placeholder="예: 가성비, 편의성"
            value={benefit}
            onChange={(e) => {
              setBenefit(e.target.value);
              if (errors.benefit) setErrors({ ...errors, benefit: '' });
            }}
            maxLength="30"
            disabled={loading}
          />
          {errors.benefit && <span className="form-error">{errors.benefit}</span>}
          <span className="form-hint">{benefit.length}/30</span>
        </div>
      </div>

      <div className="form-group">
        <span className="form-label">톤앤매너 <span className="optional">(선택)</span></span>
        <div className="tone-selector" role="group" aria-label="톤 선택">
          {TONES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={clsx('tone-chip', { 'tone-chip--active': tone === t.id })}
              onClick={() => setTone(t.id)}
              aria-pressed={tone === t.id}
              disabled={loading}
            >
              {t.emoji} {t.name}
            </button>
          ))}
        </div>
      </div>

      <div className="form-actions">
        <button
          type="submit"
          className={clsx('btn btn-primary', { 'btn--loading': loading })}
          disabled={loading}
        >
          {loading ? '생성 중...' : '🎯 헤드라인 생성'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleReset}
          disabled={loading}
        >
          초기화
        </button>
      </div>
    </form>
  );
};
