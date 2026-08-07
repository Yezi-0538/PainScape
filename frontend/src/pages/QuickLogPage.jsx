// src/pages/QuickLogPage.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useI18n } from '../i18n/i18nContext';
import { BRUSHES, PALETTES } from '../i18n/translationsConstants';

const PAIN_TYPES = [
  { key: 'twist', labelKey: 'brushes.twist.label' },
  { key: 'pierce', labelKey: 'brushes.pierce.label' },
  { key: 'heavy', labelKey: 'brushes.heavy.label' },
  { key: 'wave', labelKey: 'brushes.wave.label' },
  { key: 'scrape', labelKey: 'brushes.scrape.label' },
];

const COLOR_TEMP_MAP = ['crimson', 'dark', 'purple', 'blue'];

const MIN_PRESSURE = 20;
const MAX_PRESSURE = 100;
const HOLD_DURATION = 2000;

export default function QuickLogPage({
  onBack,
  onGenerate,
  appMode,
  medicalBackground,
  userPrefs,
  tonePreference,
  cycleDay,
}) {
  const { t } = useI18n();

  // 状态
  const [selectedPain, setSelectedPain] = useState(null);
  const [colorTemp, setColorTemp] = useState(50);
  const [isPressing, setIsPressing] = useState(false);
  const [pressure, setPressure] = useState(0);
  const [holdProgress, setHoldProgress] = useState(0);
  const [stage, setStage] = useState('select'); // select | press | generating

  // Refs
  const ballRef = useRef(null);
  const pressTimerRef = useRef(null);
  const holdStartRef = useRef(null);
  const isGeneratingRef = useRef(false);

  // 根据颜色温度映射到调色板
  const getActiveColor = () => {
    const index = Math.min(
      Math.floor((colorTemp / 100) * COLOR_TEMP_MAP.length),
      COLOR_TEMP_MAP.length - 1
    );
    return COLOR_TEMP_MAP[index];
  };

  // 触发生成
  const triggerGenerate = useCallback(() => {
    if (isGeneratingRef.current) return;
    isGeneratingRef.current = true;
    setStage('generating');

    const activeColor = getActiveColor();
    const painScore = Math.round(pressure);

    const brushNameMap = { heavy: 'sink', wave: 'swell' };
    const mappedDominant = brushNameMap[selectedPain] || selectedPain;

    onGenerate({
      selectedPain: mappedDominant,
      painScore,
      activeColor,
      brushCounts: { [mappedDominant]: Math.round(painScore * 0.8) },
      spatialMap: { abdomen: 0.5, lowerBack: 0.5, upperBody: 0.0 },
      intensityProfile: {
        avgSpeed: painScore * 0.5,
        peakSpeed: painScore * 0.8,
        avgPressure: painScore / 100,
      },
      timeRhythm: { morning: 0.33, afternoon: 0.33, night: 0.34, dominantPeriod: 'morning' },
    });
  }, [selectedPain, pressure, onGenerate]);

  // 按压开始
  const handlePressStart = useCallback(() => {
    if (!selectedPain) return;
    if (stage === 'generating') return;
    if (isGeneratingRef.current) return;

    setIsPressing(true);
    holdStartRef.current = Date.now();
    setHoldProgress(0);
    setPressure(MIN_PRESSURE);

    if (pressTimerRef.current) {
      clearInterval(pressTimerRef.current);
    }

    pressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current;
      const progress = Math.min(elapsed / HOLD_DURATION, 1);

      const basePressure = MIN_PRESSURE + (MAX_PRESSURE - MIN_PRESSURE) * progress;
      const wobble = Math.sin(elapsed * 0.008) * 4;
      const newPressure = Math.min(MAX_PRESSURE, Math.max(MIN_PRESSURE, basePressure + wobble));
      
      setPressure(newPressure);
      setHoldProgress(progress);

      if (progress >= 1) {
        clearInterval(pressTimerRef.current);
        pressTimerRef.current = null;
        triggerGenerate();
      }
    }, 50);
  }, [selectedPain, stage, triggerGenerate]);

  // 按压结束
  const handlePressEnd = useCallback(() => {
    if (!isPressing) return;
    
    if (pressTimerRef.current) {
      clearInterval(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    
    setIsPressing(false);

    if (holdProgress < 1 && !isGeneratingRef.current) {
      setPressure(0);
      setHoldProgress(0);
    }
  }, [isPressing, holdProgress]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (pressTimerRef.current) {
        clearInterval(pressTimerRef.current);
        pressTimerRef.current = null;
      }
    };
  }, []);

  // 绑定原生触摸事件（非 passive）
  useEffect(() => {
    const ball = ballRef.current;
    if (!ball) return;

    const handleTouchStart = (e) => {
      e.preventDefault();
      handlePressStart();
    };
    const handleTouchEnd = (e) => {
      e.preventDefault();
      handlePressEnd();
    };

    ball.addEventListener('touchstart', handleTouchStart, { passive: false });
    ball.addEventListener('touchend', handleTouchEnd, { passive: false });
    ball.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      ball.removeEventListener('touchstart', handleTouchStart);
      ball.removeEventListener('touchend', handleTouchEnd);
      ball.removeEventListener('touchcancel', handleTouchEnd);
      if (pressTimerRef.current) {
        clearInterval(pressTimerRef.current);
        pressTimerRef.current = null;
      }
    };
  }, [handlePressStart, handlePressEnd]);

  // 呼吸球大小
  const ballSize = 100 + pressure * 0.8;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#080808',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes quickLogPulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.03); }
        }
        @keyframes quickLogSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes quickLogProgress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>

      {/* 顶部导航 */}
      <div
        style={{
          width: '100%',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          boxSizing: 'border-box',
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#888',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '8px',
          }}
        >
          ← {t('common.back')}
        </button>
        <span
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '12px',
            letterSpacing: '1px',
          }}
        >
          {t('quickLog.title')}
        </span>
        <div style={{ width: '40px' }} />
      </div>

      {/* 主体内容 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          maxWidth: '360px',
          padding: '0 24px',
          boxSizing: 'border-box',
        }}
      >
        {/* ===== 第一步：选择疼痛类型 ===== */}
        <p
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '12px',
            letterSpacing: '2px',
            marginBottom: '20px',
            textTransform: 'uppercase',
          }}
        >
          {t('quickLog.whatPain')}
        </p>

        <div
          style={{
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginBottom: '40px',
          }}
        >
          {PAIN_TYPES.map((pain) => {
            const isSelected = selectedPain === pain.key;
            const brush = BRUSHES[pain.key];
            return (
              <button
                key={pain.key}
                onClick={() => {
                  setSelectedPain(pain.key);
                  // 重置生成状态
                  if (stage === 'generating') {
                    setStage('select');
                    isGeneratingRef.current = false;
                  }
                }}
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '16px',
                  border: isSelected ? '1px solid rgba(76,175,80,0.6)' : '1px solid rgba(255,255,255,0.08)',
                  background: isSelected ? 'rgba(76,175,80,0.1)' : 'rgba(255,255,255,0.03)',
                  color: isSelected ? '#e0e0e0' : '#666',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  transition: 'all 0.25s ease',
                  userSelect: 'none',
                }}
              >
                {brush?.isImage ? (
                  <img
                    src={brush.icon}
                    alt={brush.label}
                    style={{
                      width: '22px',
                      height: '22px',
                      objectFit: 'contain',
                      opacity: isSelected ? 1 : 0.5,
                    }}
                  />
                ) : (
                  <span style={{ fontSize: '18px', opacity: isSelected ? 1 : 0.5 }}>
                    {brush?.icon || '●'}
                  </span>
                )}
                <span style={{ fontSize: '10px', letterSpacing: '0.5px' }}>
                  {t(pain.labelKey).split(' ').pop() || t(pain.labelKey)}
                </span>
              </button>
            );
          })}
        </div>

        {/* ===== 第二步：呼吸球 ===== */}
        <p
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '12px',
            letterSpacing: '2px',
            marginBottom: '12px',
            textTransform: 'uppercase',
          }}
        >
          {t('quickLog.howIntense')}
        </p>

        {/* 强度标签 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '220px',
            marginBottom: '8px',
          }}
        >
          <span style={{ color: '#555', fontSize: '10px' }}>{t('quickLog.mild')}</span>
          <span style={{ color: '#555', fontSize: '10px' }}>{t('quickLog.moderate')}</span>
          <span style={{ color: '#555', fontSize: '10px' }}>{t('quickLog.severe')}</span>
        </div>

        {/* ===== 呼吸球 ===== */}
        <div
          ref={ballRef}
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          style={{
            position: 'relative',
            width: `${ballSize}px`,
            height: `${ballSize}px`,
            borderRadius: '50%',
            cursor: selectedPain && stage !== 'generating' ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s cubic-bezier(0.22, 0.61, 0.36, 1)',
            opacity: selectedPain ? 1 : 0.35,
            userSelect: 'none',
            WebkitUserSelect: 'none',
            marginBottom: '24px',
            touchAction: 'none',
          }}
        >
          {/* 外层光晕 */}
          <div
            style={{
              position: 'absolute',
              inset: '-20px',
              borderRadius: '50%',
              background: isPressing
                ? `radial-gradient(circle at 50% 50%, rgba(76,175,80,${0.05 + pressure * 0.003}) 0%, transparent 70%)`
                : 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.02) 0%, transparent 70%)',
              transition: 'background 0.3s ease',
            }}
          />

          {/* 中层光环 */}
          <div
            style={{
              position: 'absolute',
              inset: '-8px',
              borderRadius: '50%',
              border: isPressing
                ? `2px solid rgba(76,175,80,${0.15 + pressure * 0.005})`
                : '2px solid rgba(255,255,255,0.06)',
              boxShadow: isPressing
                ? `0 0 ${30 + pressure * 0.5}px rgba(76,175,80,${0.1 + pressure * 0.003})`
                : 'none',
              transition: 'all 0.3s ease',
              animation: !isPressing && selectedPain && stage !== 'generating' ? 'quickLogPulse 2.5s ease-in-out infinite' : 'none',
            }}
          />

          {/* 球体 */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: isPressing
                ? `radial-gradient(circle at 40% 35%, rgba(76,175,80,${0.25 + pressure * 0.005}) 0%, rgba(15,30,15,0.95) 100%)`
                : 'radial-gradient(circle at 40% 35%, rgba(255,255,255,0.06) 0%, rgba(20,20,20,0.8) 100%)',
              border: isPressing
                ? `1px solid rgba(76,175,80,${0.4 + pressure * 0.005})`
                : '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
          >
            {/* 内部呼吸环 */}
            <div
              style={{
                width: `${ballSize * 0.5}px`,
                height: `${ballSize * 0.5}px`,
                borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              {!isPressing && holdProgress === 0 && stage !== 'generating' && (
                <>
                  <span style={{ color: '#666', fontSize: '14px', fontWeight: '300' }}>
                    {selectedPain ? '◉' : '○'}
                  </span>
                  <span style={{ color: '#555', fontSize: '10px', textAlign: 'center', lineHeight: '1.3' }}>
                    {selectedPain ? t('quickLog.holdPrompt') : t('quickLog.selectFirst')}
                  </span>
                </>
              )}
              {isPressing && holdProgress < 1 && (
                <div style={{ textAlign: 'center' }}>
                  <span
                    style={{
                      color: '#e0e0e0',
                      fontSize: `${22 + pressure * 0.2}px`,
                      fontWeight: '200',
                      display: 'block',
                      lineHeight: 1,
                    }}
                  >
                    {Math.round(pressure)}
                  </span>
                  <span style={{ color: '#666', fontSize: '9px' }}>%</span>
                </div>
              )}
              {stage === 'generating' && (
                <div style={{ textAlign: 'center' }}>
                  <span
                    style={{
                      color: '#4caf50',
                      fontSize: '20px',
                      display: 'inline-block',
                      animation: 'quickLogSpin 0.8s linear infinite',
                    }}
                  >
                    ✦
                  </span>
                  <span
                    style={{
                      color: '#4caf50',
                      fontSize: '9px',
                      display: 'block',
                      marginTop: '2px',
                    }}
                  >
                    {t('quickLog.generating')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 按住进度环 */}
        {isPressing && holdProgress < 1 && (
          <div
            style={{
              width: '200px',
              height: '2px',
              background: '#222',
              borderRadius: '1px',
              overflow: 'hidden',
              marginBottom: '30px',
            }}
          >
            <div
              style={{
                width: `${holdProgress * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #4caf50, #81c784)',
                borderRadius: '1px',
                transition: 'width 0.05s linear',
              }}
            />
          </div>
        )}

        {/* 按住释放提示（如果未完成） */}
        {!isPressing && holdProgress > 0 && holdProgress < 1 && stage !== 'generating' && (
          <div
            style={{
              color: '#555',
              fontSize: '10px',
              marginBottom: '30px',
              letterSpacing: '0.5px',
            }}
          >
            {Math.round(holdProgress * 100)}% · 继续按住完成记录
          </div>
        )}

        {/* ===== 第三步：颜色温度 ===== */}
        <p
          style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: '10px',
            letterSpacing: '2px',
            marginBottom: '10px',
            textTransform: 'uppercase',
          }}
        >
          {t('quickLog.colorFeeling')}
        </p>

        <div
          style={{
            width: '220px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <input
            type="range"
            min="0"
            max="100"
            value={colorTemp}
            onChange={(e) => setColorTemp(Number(e.target.value))}
            style={{
              width: '100%',
              height: '4px',
              WebkitAppearance: 'none',
              appearance: 'none',
              background: 'linear-gradient(90deg, #e53935, #7b1fa2, #1e88e5, #00acc1)',
              borderRadius: '2px',
              outline: 'none',
              cursor: 'pointer',
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <span style={{ color: '#e53935', fontSize: '10px' }}>🔥</span>
            <span style={{ color: '#888', fontSize: '10px' }}>
              {COLOR_TEMP_MAP[Math.floor((colorTemp / 100) * COLOR_TEMP_MAP.length)] || COLOR_TEMP_MAP[3]}
            </span>
            <span style={{ color: '#00acc1', fontSize: '10px' }}>❄️</span>
          </div>
        </div>
      </div>
    </div>
  );
}