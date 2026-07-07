import { useState, useMemo } from 'react';
import { InputForm } from './components/InputForm';
import { ResultsGrid } from './components/ResultsGrid';
import { FavoritesSection } from './components/FavoritesSection';
import { HistoryPanel } from './components/HistoryPanel';
import { Dashboard } from './components/Dashboard';
import { Tabs } from './components/Tabs';
import { useHistory } from './hooks/useHistory';
import { useHeadlineGenerator } from './hooks/useHeadlineGenerator';
import { computeStyleStats } from './utils/stats';
import { copyToClipboard } from './utils/clipboard';
import './styles/App.css';

function App() {
  const history = useHistory();
  const {
    rolling,
    error,
    lastInputs,
    currentIds,
    generateHeadlines,
    regenerateFormula,
  } = useHeadlineGenerator(history);

  const [activeTab, setActiveTab] = useState('generate');
  const [copyingId, setCopyingId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [formInitial, setFormInitial] = useState(null);
  const [formSeed, setFormSeed] = useState(0);

  const styleStats = useMemo(() => computeStyleStats(history.entries), [history.entries]);

  // 현재 세션에 노출 중인 엔트리 (이력에서 실시간 조회 → 리액션/즐겨찾기 즉시 반영)
  const currentEntries = useMemo(
    () => currentIds.map((id) => history.byId[id]).filter(Boolean),
    [currentIds, history.byId]
  );

  const favorites = useMemo(
    () => history.entries.filter((e) => e.isFavorite),
    [history.entries]
  );

  const handleGenerate = (keyword, target, benefit, tone) => {
    generateHeadlines(keyword, target, benefit, tone);
  };

  // 이미지 "사용" 시 downloadTriggered 영속화 (중복 트리거 방지)
  const handleImageUsed = (id) => {
    const e = history.byId[id];
    if (e?.image && !e.image.downloadTriggered) {
      history.update(id, { image: { ...e.image, downloadTriggered: true } });
    }
  };

  const handleCopy = async (id, text) => {
    setCopyingId(id);
    const result = await copyToClipboard(text);
    if (result.success && id) history.incrementCopy(id);
    setToastMessage(result.message);
    setTimeout(() => {
      setCopyingId(null);
      setToastMessage(null);
    }, 1500);
  };

  // 이력 → "동일조건 재생성": 생성 탭으로 이동 후 같은 입력으로 생성
  const handleRerunSame = (inputs) => {
    setActiveTab('generate');
    generateHeadlines(inputs.keyword, inputs.target, inputs.benefit, inputs.tone);
  };

  // 이력 → "입력 불러오기": 폼을 해당 입력으로 채우고 생성 탭으로
  const handleLoadInputs = (inputs) => {
    setFormInitial(inputs);
    setFormSeed((s) => s + 1);
    setActiveTab('generate');
  };

  const unfavoriteAll = () => {
    favorites.forEach((f) => history.toggleFavorite(f.id));
  };

  // 파괴적 액션: 이력 전체 삭제 전 확인 (PRD §9 삭제 전 안내)
  const handleClearHistory = () => {
    if (window.confirm('모든 생성 이력을 삭제할까요?\n즐겨찾기·리액션·코멘트도 함께 사라지며 되돌릴 수 없어요.')) {
      history.clear();
    }
  };

  const tabs = [
    { id: 'generate', emoji: '🎯', label: '생성' },
    { id: 'history', emoji: '🗂️', label: '이력', badge: history.entries.length },
    { id: 'dashboard', emoji: '📊', label: '지표' },
  ];

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">🎰 Copy Gacha</h1>
          <p className="app-subtitle">
            검증된 6가지 공식으로 마케팅 카피를 뽑고, 추적하고, 학습하세요
          </p>
        </div>
      </header>

      <div className="app-tabs-wrap">
        <div className="container">
          <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
        </div>
      </div>

      <main className="app-main">
        <div className="container">
          {activeTab === 'generate' && (
            <>
              <section className="input-section">
                <InputForm
                  key={formSeed}
                  onGenerate={handleGenerate}
                  loading={rolling}
                  initialValues={formInitial}
                />
                {history.storageError && (
                  <p className="storage-error" role="alert">
                    {history.storageError}
                  </p>
                )}
              </section>

              <section className="results-section">
                <ResultsGrid
                  entries={currentEntries}
                  rolling={rolling}
                  error={error}
                  inputs={lastInputs}
                  styleStats={styleStats}
                  onCopy={handleCopy}
                  onToggleFavorite={history.toggleFavorite}
                  onReact={history.setReaction}
                  onComment={history.setComment}
                  onRegenerate={regenerateFormula}
                  onImageUsed={handleImageUsed}
                  copyingId={copyingId}
                />
              </section>

              <section className="favorites-section-wrapper">
                <FavoritesSection
                  favorites={favorites}
                  onRemove={history.toggleFavorite}
                  onCopy={handleCopy}
                  onClearAll={unfavoriteAll}
                  copyingId={copyingId}
                />
              </section>
            </>
          )}

          {activeTab === 'history' && (
            <HistoryPanel
              entries={history.entries}
              onRerunSame={handleRerunSame}
              onLoadInputs={handleLoadInputs}
              onCopy={handleCopy}
              onToggleFavorite={history.toggleFavorite}
              onReact={history.setReaction}
              onRemove={history.remove}
              onClearAll={handleClearHistory}
              copyingId={copyingId}
            />
          )}

          {activeTab === 'dashboard' && <Dashboard entries={history.entries} />}
        </div>
      </main>

      {toastMessage && <div className="toast">{toastMessage}</div>}
    </div>
  );
}

export default App;
