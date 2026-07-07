import { useMemo } from 'react';
import { computeKpis } from '../utils/stats';
import { REACTIONS } from './ReactionBar';
import '../styles/Dashboard.css';

const StatCard = ({ label, value, suffix }) => (
  <div className="stat-card">
    <span className="stat-value">
      {value}
      {suffix && <span className="stat-suffix">{suffix}</span>}
    </span>
    <span className="stat-label">{label}</span>
  </div>
);

// 가로 막대 (분포)
const BarRow = ({ label, count, max }) => {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="bar-row">
      <span className="bar-label">{label}</span>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="bar-count">{count}</span>
    </div>
  );
};

export const Dashboard = ({ entries }) => {
  const kpi = useMemo(() => computeKpis(entries), [entries]);

  if (entries.length === 0) {
    return (
      <div className="dashboard">
        <div className="empty-state">
          <p className="empty-state-icon">📊</p>
          <p className="empty-state-text">
            표시할 데이터가 아직 없어요.
            <br />
            헤드라인을 생성하면 지표가 채워집니다!
          </p>
        </div>
      </div>
    );
  }

  const formulaRows = Object.values(kpi.formulaDistribution);
  const maxFormula = Math.max(1, ...formulaRows.map((r) => r.count));
  const toneRows = Object.values(kpi.toneDistribution).filter((r) => r.count > 0);
  const maxTone = Math.max(1, ...toneRows.map((r) => r.count));
  const maxTrend = Math.max(1, ...kpi.qualityTrend, 100);
  const totalReactions = Object.values(kpi.reactionComposition).reduce((a, b) => a + b, 0);

  return (
    <div className="dashboard">
      <div className="stat-grid">
        <StatCard label="총 생성" value={kpi.total} suffix="건" />
        <StatCard label="채택(복사·즐겨찾기)" value={kpi.adopted} suffix="건" />
        <StatCard label="채택률" value={kpi.adoptRate} suffix="%" />
        <StatCard label="평균 품질점수" value={kpi.avgQuality} suffix="점" />
      </div>

      <div className="dashboard-section">
        <h3 className="dashboard-title">공식별 생성 분포</h3>
        <div className="bar-chart">
          {formulaRows.map((r) => (
            <BarRow key={r.name} label={`${r.emoji} ${r.name}`} count={r.count} max={maxFormula} />
          ))}
        </div>
      </div>

      <div className="dashboard-two-col">
        <div className="dashboard-section">
          <h3 className="dashboard-title">톤별 사용 분포</h3>
          {toneRows.length ? (
            <div className="bar-chart">
              {toneRows.map((r) => (
                <BarRow key={r.name} label={`${r.emoji} ${r.name}`} count={r.count} max={maxTone} />
              ))}
            </div>
          ) : (
            <p className="dashboard-empty">데이터 없음</p>
          )}
        </div>

        <div className="dashboard-section">
          <h3 className="dashboard-title">리액션 구성</h3>
          {totalReactions ? (
            <div className="reaction-summary">
              {REACTIONS.map((r) => (
                <div key={r.id} className="reaction-stat">
                  <span className="reaction-stat-emoji">{r.emoji}</span>
                  <span className="reaction-stat-count">{kpi.reactionComposition[r.id]}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="dashboard-empty">아직 리액션이 없어요</p>
          )}
        </div>
      </div>

      <div className="dashboard-section">
        <h3 className="dashboard-title">품질 점수 추이 (최근 {kpi.qualityTrend.length}건)</h3>
        <div className="sparkline">
          {kpi.qualityTrend.map((score, i) => (
            <div
              key={i}
              className="spark-bar"
              style={{ height: `${(score / maxTrend) * 100}%` }}
              title={`${score}점`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
