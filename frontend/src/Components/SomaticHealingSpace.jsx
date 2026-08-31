// src/Components/SomaticHealingSpace.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useI18n } from '../i18n/i18nContext';

const SomaticHealingSpace = ({
  isOpen,
  activeTab = 'breathing',
  onClose,
  language,
  aiSelfCareTips = [],
  dominantPainName,
  onPublishSharedTip
}) => {
  const { t: tFn, language: currentLang } = useI18n();
  const effectiveLang = language || currentLang;
  const [isPlaying, setIsPlaying] = useState(false);
  const [phase, setPhase] = useState('inhale'); // inhale, hold, exhale
  const [circleSize, setCircleSize] = useState(120);
  const [timerCount, setTimerCount] = useState(0);

  // 1. 呼吸法模式
  const [breathMode, setBreathMode] = useState('slow');

  // 2. 步骤滑动卡索引
  const [activeStep, setActiveStep] = useState(0);

  // 3. 微评估与分享状态
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);

  const audioRef = useRef(null);
  const animationRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const cycleTimeoutRef = useRef(null);

  // 国际化文案
  const t = {
    breathing: tFn('somaticHealing.breathing') || '骨盆释压呼吸调理',
    posture: tFn('somaticHealing.posture') || '骨盆拉伸与体位松弛',
    acupressure: tFn('somaticHealing.acupressure') || '特异穴位物理按揉',
    thermal: tFn('somaticHealing.thermal') || '局部热敷与食疗温补',
    disclaimer: tFn('somaticHealing.disclaimer') || '⚠️ 任何自愈方案或体位调节若引起您额外的不适或强烈痛感，请立即停止！回归您觉得最舒服的姿势并保持静卧。',
    inhale: tFn('somaticHealing.inhale') || '🌬️ 吸气... 感受腹腔扩张',
    hold: tFn('somaticHealing.hold') || '🧘 屏息... 骨盆彻底沉降松弛',
    exhale: tFn('somaticHealing.exhale') || '🍃 呼气... 吐出所有张力与酸楚',
    start: tFn('somaticHealing.start') || '开启体感音频疗愈',
    stop: tFn('somaticHealing.stop') || '暂停静疗',
    close: tFn('somaticHealing.close') || '退出静疗舱',
    somaticTipsTitle: tFn('somaticHealing.somaticTipsTitle') || '💡 本次发作·特调自愈方案',
    evalTitle: tFn('somaticHealing.evalTitle') || '🌸 骨盆释压微评估',
    evalQuestion: tFn('somaticHealing.evalQuestion') || '刚才的调理对你的痛感缓解有帮助吗？',
    evalHelped: tFn('somaticHealing.evalHelped') || '👍 感觉好多了',
    evalNoChange: tFn('somaticHealing.evalNoChange') || '😐 无明显变化',
    sharePrompt: tFn('somaticHealing.sharePrompt') || '太好了！亲历的经验最为珍贵。你愿意将这次非常有用的自愈方法"一键发布"到共鸣广场吗？',
    shareBtn: tFn('somaticHealing.shareBtn') || '✨ 一键分享经验到共鸣广场',
    shareSuccess: tFn('somaticHealing.shareSuccess') || '🌸 你的缓解经验已送达广场，微光已汇聚！',
    stepPrev: tFn('somaticHealing.stepPrev') || '上一步',
    stepNext: tFn('somaticHealing.stepNext') || '下一步',
    holdingTip: tFn('somaticHealing.holdingTip') || '请维持当前拉伸姿势，保持深长均缓呼吸',
    pressingTip: tFn('somaticHealing.pressingTip') || '💆 跟着脉冲闪烁节奏：一下、一下地稳重揉按（1s 一次）',
    thermalTip: tFn('somaticHealing.thermalTip') || '🔥 暖橙色呼吸光晕暗示：热力理疗放松中...',
    breathModes: {
      slow: tFn('somaticHealing.breathModes.slow') || '🌊 4-4-6 盆腔慢调息 (基础释压)',
      deep: tFn('somaticHealing.breathModes.deep') || '🍃 4-7-8 深度镇痛息 (强力镇静)',
      box: tFn('somaticHealing.breathModes.box') || '📦 4-4-4-4 箱式平缓息 (稳定心率)'
    },
    syncTips: tFn('somaticHealing.syncTips') || '正在同步调谐本次痛觉自愈方案...',
    shareDecline: tFn('somaticHealing.shareDecline') || '暂不分享，默默退出',
    offlineTips: tFn('somaticHealing.offlineTips', { returnObjects: true }) || {},
  };

  const SOUND_PATHS = {
    breathing: '/sounds/wave.mp3',
    posture: '/sounds/forest.mp3',
    acupressure: '/sounds/massage.mp3',
    thermal: '/sounds/fireplace.mp3'
  };

  const STEP_DATABASES = {
    posture: tFn('somaticHealing.stepDatabase.posture') || [],
    acupressure: tFn('somaticHealing.stepDatabase.acupressure') || [],
    thermal: tFn('somaticHealing.stepDatabase.thermal') || [],
  };

  // 停止所有音频与动画
  const stopHealing = useCallback(() => {
    setIsPlaying(false);

    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch (e) {
        console.warn('音频停止异常:', e);
      }
      audioRef.current = null;
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (cycleTimeoutRef.current) {
      clearTimeout(cycleTimeoutRef.current);
      cycleTimeoutRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    setPhase('inhale');
    setCircleSize(120);
    setTimerCount(0);
    setActiveStep(0);
  }, []);

  // 平滑启动音频与对应流程
  const startHealing = () => {
    // 1. 如果已有旧音频，先停止
    stopHealing();
    setIsPlaying(true);

    // 2. 创建并加载当前 Tab 对应的音频
    const soundPath = SOUND_PATHS[activeTab];
    if (soundPath) {
      const audio = new Audio(soundPath);
      audio.loop = true;
      audio.preload = 'auto';
      audioRef.current = audio;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn("⚠️ [SomaticHealing] 播放被拦截（需用户手势）或音频文件缺失:", err);
        });
      }
    }

    // 3. 开启呼吸循环或计时器
    if (activeTab === 'breathing') {
      runBreathingLoop();
    } else {
      setTimerCount(0);
      timerIntervalRef.current = setInterval(() => {
        setTimerCount(prev => prev + 1);
      }, 1000);
    }
  };

  // 呼吸动画循环
  const runBreathingLoop = () => {
    const runCycle = () => {
      setPhase('inhale');
      animateCircle(120, 200, 4000);

      const holdDuration = breathMode === 'deep' ? 7000 : (breathMode === 'box' ? 4000 : 4000);
      const exhaleDuration = breathMode === 'deep' ? 8000 : (breathMode === 'box' ? 4000 : 6000);

      cycleTimeoutRef.current = setTimeout(() => {
        setPhase('hold');
        animateCircle(200, 200, holdDuration);

        cycleTimeoutRef.current = setTimeout(() => {
          setPhase('exhale');
          animateCircle(200, 100, exhaleDuration);

          cycleTimeoutRef.current = setTimeout(runCycle, exhaleDuration);
        }, holdDuration);
      }, 4000);
    };
    runCycle();
  };

  const animateCircle = (start, end, duration) => {
    const startTime = Date.now();
    const anim = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      const easeProgress = Math.sin((progress * Math.PI) / 2);
      setCircleSize(start + (end - start) * easeProgress);
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(anim);
      }
    };
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(anim);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleExitRequest = () => {
    if (timerCount > 5 || isPlaying) {
      stopHealing();
      setShowEvaluation(true);
    } else {
      stopHealing();
      onClose();
    }
  };

  const handleShareToSquare = () => {
    if (onPublishSharedTip) {
      const activeTipsText = aiSelfCareTips[0] || (STEP_DATABASES[activeTab]?.[0]?.desc) || "";
      const cleanedTipText = activeTipsText.replace(/✨|•/g, '').trim();
      const shareText = effectiveLang === 'en'
        ? `When experiencing "${dominantPainName}", I did "${t[activeTab]}" somatic healing and found it very helpful! Tip: ${cleanedTipText}`
        : `我在经历"${dominantPainName}"时，进行了"${t[activeTab]}"自愈调理，亲测非常有帮助！提示：${cleanedTipText}`;

      onPublishSharedTip(shareText, activeTab);
    }
    setEvaluationResult('shared');
    setTimeout(() => {
      setShowEvaluation(false);
      setEvaluationResult(null);
      onClose();
    }, 1500);
  };

  // 当关闭弹窗 (isOpen=false) 或切换 Tab 时，100% 自动安全停播并清理
  useEffect(() => {
    if (isOpen) {
      setActiveStep(0);
    } else {
      stopHealing();
    }
    return () => {
      stopHealing();
    };
  }, [isOpen, activeTab, breathMode, stopHealing]);

  if (!isOpen) return null;

  // 滑动步骤卡渲染
  const renderStepCard = (type) => {
    const steps = STEP_DATABASES[type];
    if (!steps || !steps.length) return null;
    const current = steps[activeStep] || steps[0];
    return (
      <div style={{ background: '#1c1c1c', border: '1px solid #2d2d2d', borderRadius: 'var(--radius-md)', padding: '16px 20px', boxSizing: 'border-box' }}>
        <span style={{ fontSize: '10px', background: '#2196f3', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
          {current.step}
        </span>
        <p style={{ color: '#eee', fontSize: '12.5px', lineHeight: '1.65', margin: '12px 0 18px 0', textAlign: 'justify', minHeight: '80px' }}>
          {current.desc}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
          <button
            disabled={activeStep === 0}
            onClick={() => setActiveStep(prev => Math.max(0, prev - 1))}
            style={{ flex: 1, padding: '8px', background: '#2c2c2c', border: 'none', borderRadius: '6px', color: activeStep === 0 ? '#444' : '#888', fontSize: '11px', cursor: activeStep === 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
          >
            {t.stepPrev}
          </button>
          <button
            disabled={activeStep === steps.length - 1}
            onClick={() => setActiveStep(prev => Math.min(steps.length - 1, prev + 1))}
            style={{ flex: 1, padding: '8px', background: '#2c2c2c', border: 'none', borderRadius: '6px', color: activeStep === steps.length - 1 ? '#444' : '#888', fontSize: '11px', cursor: activeStep === steps.length - 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
          >
            {t.stepNext}
          </button>
        </div>
      </div>
    );
  };

  // 多类目视觉面板
  const renderSomaticModule = () => {
    switch (activeTab) {
      case 'breathing':
        return (
          <div style={{ textAlign: 'center', height: '240px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{
              width: `${circleSize}px`, height: `${circleSize}px`,
              borderRadius: '50%', background: 'rgba(76, 175, 80, 0.05)',
              border: '1.5px solid rgba(76, 175, 80, 0.3)',
              boxShadow: '0 0 35px rgba(76, 175, 80, 0.1)',
              transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1), height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%', background: '#4caf50', opacity: 0.2,
                transform: `scale(${phase === 'inhale' ? 1.6 : phase === 'hold' ? 2.0 : 0.8})`,
                transition: 'transform 4s cubic-bezier(0.4, 0, 0.2, 1)'
              }} />
            </div>
            <div style={{ color: '#4caf50', fontSize: 'var(--text-base)', fontWeight: '600', marginTop: '20px', height: '20px' }}>
              {isPlaying ? t[phase] : " "}
            </div>
          </div>
        );

      case 'posture':
        return (
          <div style={{ textAlign: 'center', height: '240px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{
              width: '130px', height: '130px', borderRadius: '50%',
              background: 'rgba(171, 71, 188, 0.05)',
              border: '1.5px solid rgba(171, 71, 188, 0.3)',
              boxShadow: isPlaying ? '0 0 50px rgba(171, 71, 188, 0.15)' : 'none',
              animation: isPlaying ? 'pulse 6s infinite ease-in-out' : 'none',
              margin: '0 auto 20px auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <span style={{ fontSize: '30px' }}>🧘</span>
            </div>
            <div style={{ color: '#ab47bc', fontSize: '26px', fontWeight: 'bold', fontFamily: 'monospace' }}>
              {formatTime(timerCount)}
            </div>
            <p style={{ color: '#aaa', fontSize: '11px', marginTop: '8px', height: '18px' }}>
              {isPlaying ? t.holdingTip : " "}
            </p>
          </div>
        );

      case 'acupressure':
        return (
          <div style={{ textAlign: 'center', height: '240px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{
              width: '120px', height: '120px', borderRadius: '50%',
              background: isPlaying ? 'rgba(33, 150, 243, 0.1)' : 'rgba(255,255,255,0.02)',
              border: isPlaying ? '2.5px solid #2196f3' : '1.5px solid #333',
              boxShadow: isPlaying ? '0 0 40px rgba(33, 150, 243, 0.2)' : 'none',
              animation: isPlaying ? 'pulse 1s infinite steps(2)' : 'none',
              margin: '0 auto 20px auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <span style={{ fontSize: '30px' }}>💆</span>
            </div>
            <p style={{ color: '#2196f3', fontSize: '12.5px', fontWeight: '600', maxWidth: '300px', margin: 0, height: '36px', lineHeight: '1.5' }}>
              {isPlaying ? t.pressingTip : " "}
            </p>
          </div>
        );

      case 'thermal':
        return (
          <div style={{ textAlign: 'center', height: '240px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{
              width: '130px', height: '130px', borderRadius: '50%',
              background: 'rgba(255, 152, 0, 0.08)',
              border: '1.5px solid rgba(255, 152, 0, 0.4)',
              boxShadow: isPlaying ? '0 0 50px rgba(255, 152, 0, 0.25)' : 'none',
              animation: isPlaying ? 'pulse 4s infinite ease-in-out' : 'none',
              margin: '0 auto 20px auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <span style={{ fontSize: '30px' }}>🔥</span>
            </div>
            <p style={{ color: '#ff9800', fontSize: '12.5px', fontWeight: '600', margin: 0, height: '18px' }}>
              {isPlaying ? t.thermalTip : " "}
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{
      position: 'fixed', zIndex: 10000, top: 0, left: 0, width: '100vw', height: '100vh',
      background: '#0d0d0d', overflowY: 'auto', display: 'flex', flexDirection: 'column',
      alignItems: 'center', padding: '24px 16px', boxSizing: 'border-box'
    }}>
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 0.8; }
        }
      `}</style>

      {/* 头部面板 */}
      <div style={{ width: '100%', maxWidth: '400px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ color: '#fff', fontSize: '15px', margin: 0, fontWeight: 'bold' }}>
          {t[activeTab]}
        </h3>
        <button
          onClick={handleExitRequest}
          style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#888', padding: '6px 14px', borderRadius: 'var(--radius-lg)', fontSize: '12px', cursor: 'pointer' }}
        >
          {t.close}
        </button>
      </div>

      {/* 呼吸模态选择 */}
      {activeTab === 'breathing' && (
        <div style={{ width: '100%', maxWidth: 'var(--container-sm)', marginBottom: '20px' }}>
          <select
            value={breathMode}
            onChange={(e) => { stopHealing(); setBreathMode(e.target.value); }}
            style={{ width: '100%', padding: 'var(--space-md)', background: '#1c1c1c', color: '#4caf50', border: '1px solid #333', borderRadius: 'var(--radius-sm)', fontSize: '12.5px', outline: 'none' }}
          >
            <option value="slow">{t.breathModes.slow}</option>
            <option value="deep">{t.breathModes.deep}</option>
            <option value="box">{t.breathModes.box}</option>
          </select>
        </div>
      )}

      {/* 视觉动画模块 */}
      <div style={{ width: '100%', maxWidth: '400px', marginBottom: '10px' }}>
        {renderSomaticModule()}
      </div>

      {/* 步骤卡片 */}
      {activeTab !== 'breathing' && (
        <div style={{ width: '100%', maxWidth: 'var(--container-sm)', marginBottom: '20px' }}>
          {renderStepCard(activeTab)}
        </div>
      )}

      {/* 激活控制按钮 */}
      <div style={{ width: '100%', maxWidth: 'var(--container-sm)', marginBottom: '24px' }}>
        <button
          onClick={isPlaying ? stopHealing : startHealing}
          style={{
            width: '100%', padding: 'var(--space-lg)',
            background: isPlaying ? '#2c2c2c' : '#4caf50',
            border: 'none', borderRadius: '30px', color: '#fff',
            fontWeight: 'bold', fontSize: '15px', cursor: 'pointer',
            boxShadow: isPlaying ? 'none' : '0 4px 15px rgba(76,175,80,0.3)',
            transition: 'all 0.2s'
          }}
        >
          {isPlaying ? t.stop : t.start}
        </button>
      </div>

      {/* 免责警示 */}
      <p style={{ width: '100%', maxWidth: '360px', color: '#ff9800', fontSize: '11px', lineHeight: '1.6', textAlign: 'center', background: 'rgba(255,152,0,0.04)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px dashed rgba(255,152,0,0.15)', margin: '0 0 24px 0', boxSizing: 'border-box' }}>
        {t.disclaimer}
      </p>

      {/* 自愈方案卡片 */}
      <div style={{ width: '100%', maxWidth: 'var(--container-sm)', background: '#141414', border: '1px solid #222', borderRadius: 'var(--radius-lg)', padding: 'var(--space-xl)', boxSizing: 'border-box', marginBottom: '30px' }}>
        <h4 style={{ color: '#ab47bc', fontSize: '13px', margin: '0 0 16px 0', fontWeight: 'bold', borderBottom: '1px solid #222', paddingBottom: '10px' }}>
          {t.somaticTipsTitle}
        </h4>
        {(() => {
          // 痛觉类型映射表
          const PAIN_KEY_MAP = {
            '绞痛': 'twist', 'Cramp': 'twist', 'twist': 'twist',
            '刺痛': 'pierce', 'Pierce': 'pierce', 'pierce': 'pierce',
            '坠胀': 'heavy', '坠胀重压': 'heavy', 'Heavy Dragging': 'heavy', 'heavy': 'heavy',
            '酸胀': 'wave', '弥漫酸胀痛': 'wave', 'Diffuse Ache': 'wave', 'wave': 'wave',
            '刮痛': 'scrape', '撕刮痛': 'scrape', 'Tearing Scrape': 'scrape', 'scrape': 'scrape'
          };
          const currentPainKey = PAIN_KEY_MAP[dominantPainName] || 'twist';

          // 优先使用云端/上级传递的 aiSelfCareTips；若为空，则直接调用 translations.js 中的 offlineTips 本地特调
          const localTips = t.offlineTips?.[currentPainKey] || t.offlineTips?.twist || [];
          const effectiveTips = (aiSelfCareTips && aiSelfCareTips.length > 0)
            ? aiSelfCareTips
            : localTips;

          if (effectiveTips && effectiveTips.length > 0) {
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {effectiveTips.map((tip, idx) => (
                  <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
                    <p style={{ color: '#ccc', fontSize: '12.5px', margin: 0, lineHeight: '1.65', textAlign: 'justify' }}>{tip}</p>
                  </div>
                ))}
              </div>
            );
          }

          return (
            <p style={{ color: '#666', fontSize: '12px', textAlign: 'center', margin: '20px 0' }}>{t.syncTips}</p>
          );
        })()}
      </div>

      {/* 出舱评估弹窗 */}
      {showEvaluation && (
        <div style={{
          position: 'fixed', zIndex: 11000, top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-xl)', boxSizing: 'border-box'
        }}>
          <div style={{ background: '#141414', border: '1px solid #333', borderRadius: '24px', padding: '24px', maxWidth: '360px', width: '100%', textAlign: 'center' }}>
            <h3 style={{ color: '#fff', fontSize: '18px', margin: '0 0 16px 0' }}>{t.evalTitle}</h3>

            {evaluationResult === null && (
              <>
                <p style={{ color: '#aaa', fontSize: 'var(--text-base)', lineHeight: '1.6', marginBottom: '24px' }}>{t.evalQuestion}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button
                    onClick={() => setEvaluationResult('helped')}
                    style={{ padding: '14px', background: 'rgba(76,175,80,0.1)', border: '1px solid #4caf50', borderRadius: '30px', color: '#4caf50', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    {t.evalHelped}
                  </button>
                  <button
                    onClick={() => { setShowEvaluation(false); onClose(); }}
                    style={{ padding: '14px', background: '#2c2c2c', border: 'none', borderRadius: '30px', color: '#888', cursor: 'pointer' }}
                  >
                    {t.evalNoChange}
                  </button>
                </div>
              </>
            )}

            {evaluationResult === 'helped' && (
              <>
                <p style={{ color: '#4caf50', fontSize: '24px', margin: '0 0 12px 0' }}>🤗</p>
                <p style={{ color: '#ccc', fontSize: '13px', lineHeight: '1.6', marginBottom: '24px', textAlign: 'justify' }}>
                  {t.sharePrompt}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    onClick={handleShareToSquare}
                    style={{ padding: '14px', background: 'linear-gradient(135deg, #ab47bc, #4caf50)', border: 'none', borderRadius: '30px', color: '#fff', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(171,71,188,0.3)' }}
                  >
                    {t.shareBtn}
                  </button>
                  <button
                    onClick={() => { setShowEvaluation(false); onClose(); }}
                    style={{ padding: '10px', background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: '12px' }}
                  >
                    {t.shareDecline}
                  </button>
                </div>
              </>
            )}

            {evaluationResult === 'shared' && (
              <div style={{ padding: '20px 0' }}>
                <p style={{ fontSize: '32px', margin: '0 0 16px 0' }}>🌸</p>
                <p style={{ color: '#4caf50', fontSize: 'var(--text-base)', fontWeight: 'bold' }}>{t.shareSuccess}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SomaticHealingSpace;