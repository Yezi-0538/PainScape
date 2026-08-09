// src/pages/QuickLogPage.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useI18n } from '../i18n/i18nContext';
import { BRUSHES } from '../i18n/translationsConstants';

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
const HOLD_DURATION = 2500;

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

  const [selectedPain, setSelectedPain] = useState(null);
  const [colorTemp, setColorTemp] = useState(50);
  const [isPressing, setIsPressing] = useState(false);
  const [pressure, setPressure] = useState(0);
  const [holdProgress, setHoldProgress] = useState(0);
  const [stage, setStage] = useState('idle'); // idle | pressing | holding | generating
  const [displayText, setDisplayText] = useState('');

  const ballRef = useRef(null);
  const pressTimerRef = useRef(null);
  const holdStartRef = useRef(null);
  const isGeneratingRef = useRef(false);

  // ✅ 根据 colorTemp 获取色系
  const getColorPalette = (temp) => {
    if (temp < 33) {
      const t = temp / 33;
      return { r: 200 - t * 60, g: 60 + t * 40, b: 60 + t * 60 };
    } else if (temp < 66) {
      const t = (temp - 33) / 33;
      return { r: 140 - t * 60, g: 100 + t * 60, b: 120 + t * 60 };
    } else {
      const t = (temp - 66) / 34;
      return { r: 80 - t * 40, g: 160 - t * 80, b: 180 + t * 40 };
    }
  };

  const getIntensityFactor = (p) => Math.min(1, p / 100);

  // ✅ 根据 colorTemp + pressure 计算球体颜色
  const getBallColor = () => {
    const intensity = getIntensityFactor(pressure);
    const base = getColorPalette(colorTemp);
    const r = Math.round(base.r + (255 - base.r) * intensity * 0.2);
    const g = Math.round(base.g + (255 - base.g) * intensity * 0.2);
    const b = Math.round(base.b + (255 - base.b) * intensity * 0.2);
    const alpha = 0.25 + intensity * 0.6;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const getBorderColor = () => {
    const intensity = getIntensityFactor(pressure);
    const base = getColorPalette(colorTemp);
    const r = Math.round(base.r + (255 - base.r) * intensity * 0.3);
    const g = Math.round(base.g + (255 - base.g) * intensity * 0.3);
    const b = Math.round(base.b + (255 - base.b) * intensity * 0.3);
    return `rgba(${r}, ${g}, ${b}, ${0.2 + intensity * 0.6})`;
  };

  const getGlowColor = () => {
    const intensity = getIntensityFactor(pressure);
    const base = getColorPalette(colorTemp);
    const r = Math.round(base.r + (255 - base.r) * intensity * 0.15);
    const g = Math.round(base.g + (255 - base.g) * intensity * 0.15);
    const b = Math.round(base.b + (255 - base.b) * intensity * 0.15);
    return `rgba(${r}, ${g}, ${b}, ${0.04 + intensity * 0.12})`;
  };

  // ✅ 根据 pressure 返回阶段文字
  const getFeelingText = (p) => {
    const val = p || pressure;
    if (val < 30) return t('quickLog.feelingMild') || '轻微';
    if (val < 55) return t('quickLog.feelingModerate') || '中度';
    if (val < 80) return t('quickLog.feelingStrong') || '强烈';
    return t('quickLog.feelingSevere') || '剧烈';
  };

  const getActiveColor = () => {
    const index = Math.min(
      Math.floor((colorTemp / 100) * COLOR_TEMP_MAP.length),
      COLOR_TEMP_MAP.length - 1
    );
    return COLOR_TEMP_MAP[index];
  };

  const triggerGenerate = useCallback(() => {
    if (isGeneratingRef.current) return;
    isGeneratingRef.current = true;
    setStage('generating');

    const activeColor = getActiveColor();
    const painScore = Math.round(pressure);

    const brushNameMap = { heavy: 'sink', wave: 'swell' };
    const mappedDominant = brushNameMap[selectedPain] || selectedPain;

    setTimeout(() => {
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
    }, 600);
  }, [selectedPain, pressure, onGenerate]);

  const handlePressStart = useCallback(() => {
    if (!selectedPain) return;
    if (stage === 'generating') return;
    if (isGeneratingRef.current) return;
    if (isPressing) return;

    setIsPressing(true);
    setStage('pressing');
    holdStartRef.current = Date.now();
    setHoldProgress(0);
    setPressure(MIN_PRESSURE);
    setDisplayText(getFeelingText(MIN_PRESSURE));

    if (pressTimerRef.current) {
      clearInterval(pressTimerRef.current);
    }

    pressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current;
      const progress = Math.min(elapsed / HOLD_DURATION, 1);
      const base = MIN_PRESSURE + (MAX_PRESSURE - MIN_PRESSURE) * progress;
      const wobble = Math.sin(elapsed * 0.006) * 4;
      const newPressure = Math.min(MAX_PRESSURE, Math.max(MIN_PRESSURE, base + wobble));

      setPressure(newPressure);
      setHoldProgress(progress);
      setDisplayText(getFeelingText(newPressure));

      if (progress >= 1) {
        clearInterval(pressTimerRef.current);
        pressTimerRef.current = null;
        // ✅ 达到阈值后保持状态，让用户点击生成
        setIsPressing(false);
        setStage('holding');
        // 不自动触发生成
      }
    }, 50);
  }, [selectedPain, stage, isPressing]);

  const handlePressEnd = useCallback(() => {
    if (!isPressing) return;

    if (pressTimerRef.current) {
      clearInterval(pressTimerRef.current);
      pressTimerRef.current = null;
    }

    setIsPressing(false);

    // ✅ 关键修复：松开手后保持当前状态，不重置
    // 如果 pressure > 20，进入 holding 状态，等待用户决定
    if (pressure >= 20) {
      setStage('holding');
    } else {
      // 如果压力太小，重置到 idle
      setStage('idle');
      setPressure(0);
      setHoldProgress(0);
      setDisplayText('');
    }
  }, [isPressing, pressure]);

  // ✅ 重置状态（用户点击"重新按压"）
  const handleReset = useCallback(() => {
    setStage('idle');
    setPressure(0);
    setHoldProgress(0);
    setDisplayText('');
    isGeneratingRef.current = false;
  }, []);

  // ✅ 手动生成
  const handleManualGenerate = useCallback(() => {
    if (!selectedPain) return;
    if (pressure < 20) return;
    if (stage === 'generating') return;
    triggerGenerate();
  }, [selectedPain, pressure, stage, triggerGenerate]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (pressTimerRef.current) clearInterval(pressTimerRef.current);
    };
  }, []);

  // ✅ 使用 pointer 事件
  useEffect(() => {
    const ball = ballRef.current;
    if (!ball) return;

    const handlePointerDown = (e) => {
      e.preventDefault();
      handlePressStart();
    };

    const handlePointerUp = (e) => {
      e.preventDefault();
      handlePressEnd();
    };

    const handlePointerCancel = (e) => {
      e.preventDefault();
      handlePressEnd();
    };

    ball.addEventListener('pointerdown', handlePointerDown);
    ball.addEventListener('pointerup', handlePointerUp);
    ball.addEventListener('pointercancel', handlePointerCancel);

    return () => {
      ball.removeEventListener('pointerdown', handlePointerDown);
      ball.removeEventListener('pointerup', handlePointerUp);
      ball.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [handlePressStart, handlePressEnd]);

  const ballSize = 120 + pressure * 0.8;
  const isInteractive = selectedPain && (stage === 'idle' || stage === 'holding');
  const canGenerate = selectedPain && pressure >= 20 && stage !== 'generating';
  const showHoldingState = stage === 'holding' && pressure >= 20;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'radial-gradient(ellipse at 50% 55%, #0d1117 0%, #060809 100%)',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes qlPulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.04); }
        }
        @keyframes qlSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes qlRipple {
          0% { transform: scale(0.8); opacity: 0.4; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes qlBallFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>

      {/* 顶部导航 */}
      <div style={{
        width: '100%',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        boxSizing: 'border-box',
        position: 'relative',
        zIndex: 5,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.4)',
            fontSize: '13px',
            cursor: 'pointer',
            padding: '6px 14px',
            borderRadius: '20px',
            backdropFilter: 'blur(8px)',
          }}
        >
          ← {t('common.back')}
        </button>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', letterSpacing: '2px' }}>
          {t('quickLog.title')}
        </span>
        <div style={{ width: '60px' }} />
      </div>

      {/* 主体 */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        maxWidth: '360px',
        padding: '0 24px',
        boxSizing: 'border-box',
        position: 'relative',
        zIndex: 2,
      }}>
        {/* 疼痛类型选择 */}
        <div style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginBottom: '28px',
        }}>
          {PAIN_TYPES.map((pain) => {
            const isSelected = selectedPain === pain.key;
            const brush = BRUSHES[pain.key];
            return (
              <button
                key={pain.key}
                onClick={() => {
                  setSelectedPain(pain.key);
                  if (stage === 'generating') {
                    setStage('idle');
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
                {/* ✅ 修复：使用完整版渲染逻辑 */}
                {brush?.isImage ? (
                  <img
                    src={brush.icon}
                    alt={brush.label}
                    style={{
                      width: '22px',
                      height: '22px',
                      objectFit: 'contain',
                      opacity: isSelected ? 1 : 0.5
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

        {/* 强度提示 */}
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', letterSpacing: '2px', marginBottom: '8px', textTransform: 'uppercase' }}>
          {t('quickLog.howIntense')}
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', width: '200px', marginBottom: '16px' }}>
          <span style={{ color: '#555', fontSize: '9px' }}>{t('quickLog.mild')}</span>
          <span style={{ color: '#555', fontSize: '9px' }}>{t('quickLog.moderate')}</span>
          <span style={{ color: '#555', fontSize: '9px' }}>{t('quickLog.severe')}</span>
        </div>

        {/* ===== 呼吸球 ===== */}
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          {/* 涟漪 - 按压时显示 */}
          {isPressing && (
            <>
              <div style={{
                position: 'absolute',
                width: `${ballSize + 20}px`,
                height: `${ballSize + 20}px`,
                borderRadius: '50%',
                border: `1px solid ${getGlowColor()}`,
                animation: 'qlRipple 2s ease-out infinite',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
              }} />
              <div style={{
                position: 'absolute',
                width: `${ballSize + 20}px`,
                height: `${ballSize + 20}px`,
                borderRadius: '50%',
                border: `1px solid ${getGlowColor()}`,
                animation: 'qlRipple 2s ease-out 0.7s infinite',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
              }} />
            </>
          )}

          {/* ✅ 呼吸球主体 */}
          <div
            ref={ballRef}
            style={{
              position: 'relative',
              width: `${ballSize}px`,
              height: `${ballSize}px`,
              borderRadius: '50%',
              cursor: isInteractive ? 'pointer' : 'default',
              transition: 'all 0.3s cubic-bezier(0.22, 0.61, 0.36, 1)',
              opacity: selectedPain ? 1 : 0.4,
              userSelect: 'none',
              WebkitUserSelect: 'none',
              touchAction: 'none',
              zIndex: 2,
              animation: !isPressing && selectedPain && stage === 'idle'
                ? 'qlBallFloat 3s ease-in-out infinite'
                : 'none',
            }}
          >
            {/* 外层光晕 */}
            <div style={{
              position: 'absolute',
              inset: '-30px',
              borderRadius: '50%',
              background: (isPressing || pressure >= 20)
                ? `radial-gradient(circle at center, ${getGlowColor()} 0%, transparent 60%)`
                : 'radial-gradient(circle at center, rgba(255,255,255,0.01) 0%, transparent 60%)',
              transition: 'all 0.5s ease',
            }} />

            {/* 中层光环 */}
            <div style={{
              position: 'absolute',
              inset: '-8px',
              borderRadius: '50%',
              border: (isPressing || pressure >= 20)
                ? `2px solid ${getBorderColor()}`
                : '2px solid rgba(255,255,255,0.04)',
              boxShadow: (isPressing || pressure >= 20)
                ? `0 0 ${40 + pressure * 0.5}px ${getGlowColor()}`
                : 'none',
              transition: 'all 0.4s ease',
              animation: !isPressing && selectedPain && stage === 'idle' ? 'qlPulse 3s ease-in-out infinite' : 'none',
            }} />

            {/* 球体 */}
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: (isPressing || pressure >= 20)
                ? `radial-gradient(circle at 45% 40%, ${getBallColor()} 0%, rgba(12,25,14,0.95) 100%)`
                : selectedPain
                  ? 'radial-gradient(circle at 45% 40%, rgba(76,175,80,0.08) 0%, rgba(18,18,20,0.85) 100%)'
                  : 'radial-gradient(circle at 45% 40%, rgba(255,255,255,0.02) 0%, rgba(18,18,20,0.85) 100%)',
              border: (isPressing || pressure >= 20)
                ? `1px solid ${getBorderColor()}`
                : selectedPain
                  ? '1px solid rgba(76,175,80,0.12)'
                  : '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.4s ease',
            }}>
              {/* 内部高光 */}
              <div style={{
                position: 'absolute',
                top: '10%',
                left: '20%',
                width: '30%',
                height: '15%',
                borderRadius: '50%',
                background: (isPressing || pressure >= 20)
                  ? `radial-gradient(ellipse, rgba(255,255,255,${0.15 + pressure * 0.003}) 0%, transparent 70%)`
                  : 'radial-gradient(ellipse, rgba(255,255,255,0.04) 0%, transparent 70%)',
                transition: 'all 0.3s ease',
              }} />

              {/* 内部内容 */}
              <div style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
                {stage === 'idle' && (
                  <>
                    <div style={{
                      color: selectedPain ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
                      fontSize: '28px',
                      fontWeight: '200',
                      marginBottom: '4px',
                    }}>
                      ◌
                    </div>
                    <div style={{
                      color: selectedPain ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                      fontSize: '9px',
                      letterSpacing: '0.5px',
                      lineHeight: '1.4',
                    }}>
                      {selectedPain ? t('quickLog.holdPrompt') : t('quickLog.selectFirst')}
                    </div>
                  </>
                )}
                {(stage === 'pressing' || stage === 'holding') && (
                  <div style={{
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: '16px',
                    fontWeight: '300',
                    letterSpacing: '1px',
                    transition: 'all 0.3s ease',
                  }}>
                    {displayText || getFeelingText(pressure)}
                  </div>
                )}
                {stage === 'generating' && (
                  <>
                    <div style={{
                      color: '#4caf50',
                      fontSize: '28px',
                      display: 'inline-block',
                      animation: 'qlSpin 0.8s linear infinite',
                    }}>✦</div>
                    <div style={{ color: 'rgba(76,175,80,0.4)', fontSize: '9px', marginTop: '4px', letterSpacing: '1px' }}>
                      {t('quickLog.generating')}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 进度环 */}
            {isPressing && holdProgress < 1 && (
              <svg
                style={{
                  position: 'absolute',
                  inset: '-8px',
                  width: `calc(100% + 16px)`,
                  height: `calc(100% + 16px)`,
                  transform: 'rotate(-90deg)',
                }}
              >
                <circle
                  cx="50%"
                  cy="50%"
                  r="50%"
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="3"
                />
                <circle
                  cx="50%"
                  cy="50%"
                  r="50%"
                  fill="none"
                  stroke={getBorderColor()}
                  strokeWidth="3"
                  strokeDasharray={`${holdProgress * 314} 314`}
                  strokeLinecap="round"
                  style={{
                    transition: 'stroke-dasharray 0.08s linear',
                    filter: `drop-shadow(0 0 12px ${getGlowColor()})`,
                  }}
                />
              </svg>
            )}
          </div>
        </div>

        {/* 进度提示 - 按压时显示 */}
        {isPressing && holdProgress < 1 && (
          <div style={{
            width: '180px',
            height: '3px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '2px',
            overflow: 'hidden',
            marginBottom: '6px',
          }}>
            <div style={{
              width: `${holdProgress * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #4caf50, #81c784)',
              borderRadius: '2px',
              transition: 'width 0.08s linear',
            }} />
          </div>
        )}

        {isPressing && holdProgress < 1 && (
          <div style={{
            color: 'rgba(255,255,255,0.1)',
            fontSize: '9px',
            letterSpacing: '2px',
            height: '14px',
          }}>
            {displayText || getFeelingText(pressure)}
          </div>
        )}

        {/* ✅ Holding 状态提示 - 松开后显示 */}
        {stage === 'holding' && pressure >= 20 && (
          <div style={{
            color: 'rgba(76,175,80,0.2)',
            fontSize: '9px',
            letterSpacing: '2px',
            height: '14px',
          }}>
            ✦ {t('quickLog.readyToGenerate') || '已记录，点击下方生成'}
          </div>
        )}

        {stage === 'generating' && (
          <div style={{
            color: 'rgba(76,175,80,0.15)',
            fontSize: '9px',
            letterSpacing: '2px',
            height: '14px',
          }}>
            ✦ {t('quickLog.generating')}
          </div>
        )}

        {/* ✅ 底部按钮组 */}
        <div style={{
          display: 'flex',
          gap: '10px',
          marginTop: '16px',
          alignItems: 'center',
        }}>
          {/* 生成按钮 - 只要有 pressure >= 20 就显示 */}
          {canGenerate && (
            <button
              onClick={handleManualGenerate}
              style={{
                padding: '10px 28px',
                borderRadius: '24px',
                border: `1px solid ${getBorderColor()}`,
                background: `rgba(76,175,80,0.12)`,
                color: 'rgba(255,255,255,0.7)',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                letterSpacing: '1px',
              }}
            >
              {t('quickLog.generateNow') || '生成记录 ✦'}
            </button>
          )}

          {/* 重置/重新按压按钮 - holding 或 pressing 状态显示 */}
          {(stage === 'holding' || stage === 'pressing') && (
            <button
              onClick={handleReset}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.02)',
                color: 'rgba(255,255,255,0.3)',
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            >
              {t('quickLog.reset') || '重新按压 ↺'}
            </button>
          )}
        </div>

        {/* ===== 颜色温度 ===== */}
        <div style={{
          position: 'absolute',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          opacity: stage === 'generating' ? 0.2 : 0.5,
          transition: 'opacity 0.3s ease',
          width: '140px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '9px' }}>
              {t('quickLog.colorFeeling')}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.08)', fontSize: '8px', textTransform: 'capitalize' }}>
              {COLOR_TEMP_MAP[Math.floor((colorTemp / 100) * COLOR_TEMP_MAP.length)] || COLOR_TEMP_MAP[3]}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={colorTemp}
            onChange={(e) => setColorTemp(Number(e.target.value))}
            style={{
              width: '100%',
              height: '2px',
              WebkitAppearance: 'none',
              appearance: 'none',
              background: 'linear-gradient(90deg, #e53935, #7b1fa2, #1e88e5, #00acc1)',
              borderRadius: '1px',
              outline: 'none',
              cursor: 'pointer',
            }}
          />
        </div>
      </div>
    </div>
  );
}