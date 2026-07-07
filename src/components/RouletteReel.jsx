import { useState, useEffect, useRef } from 'react';
import { formulas } from '../data/formulas';
import { randomSpinText } from '../utils/generator';
import '../styles/RouletteReel.css';

/**
 * 룰렛 애니메이션(F5). 생성 대기 시간 동안 6개 카드가 무작위 문장을 빠르게 굴린다.
 * 각 카드는 시간차를 두고 하나씩 멈춰 슬롯머신 같은 느낌을 준다.
 */
export const RouletteReel = ({ inputs }) => {
  const safeInputs = inputs || { keyword: '키워드', target: '', benefit: '' };

  const [texts, setTexts] = useState(() =>
    formulas.map(() => randomSpinText(safeInputs))
  );
  const [stopped, setStopped] = useState(() => formulas.map(() => false));
  const intervalRef = useRef(null);
  const timersRef = useRef([]);

  useEffect(() => {
    // 아직 멈추지 않은 카드만 계속 굴린다
    intervalRef.current = setInterval(() => {
      setTexts((prev) =>
        prev.map((text, i) => (stopped[i] ? text : randomSpinText(safeInputs)))
      );
    }, 85);

    // 카드를 순차적으로 멈춘다 (마지막 카드는 훅의 ROLL_DURATION 직전에 멈춤)
    timersRef.current = formulas.map((_, i) =>
      setTimeout(() => {
        setStopped((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, 700 + i * 140)
    );

    return () => {
      clearInterval(intervalRef.current);
      timersRef.current.forEach(clearTimeout);
    };
    // inputs가 바뀔 때만 재시작 (stopped는 내부에서 갱신)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs]);

  return (
    <div className="results-container">
      <div className="results-header">
        <h2>헤드라인을 뽑는 중...</h2>
        <p className="results-count">🎰 6가지 공식이 돌아가고 있어요</p>
      </div>

      <div className="results-grid">
        {formulas.map((formula, i) => (
          <div
            className={`headline-card roulette-card${stopped[i] ? ' roulette-card--stopped' : ''}`}
            key={formula.id}
          >
            <div className="card-header">
              <span className={`formula-badge formula-badge--${formula.id}`}>
                {formula.emoji} {formula.name}
              </span>
            </div>
            <div className="card-content">
              <p className={`headline-text roulette-text${stopped[i] ? '' : ' roulette-text--spinning'}`}>
                {texts[i]}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
