// SomaticHealingSpace.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useI18n } from '../i18n/i18nContext';

const SomaticHealingSpace = ({
  isOpen,
  activeTab = 'breathing',
  onClose,
  language,
  aiSelfCareTips = [],
  dominantPainName,
  onPublishSharedTip // 🌟 闭环：一键分享至共鸣广场的回调函数
}) => {
  const { t: tFn, language: currentLang } = useI18n();
  const effectiveLang = language || currentLang;
  const [isPlaying, setIsPlaying] = useState(false);
  const [phase, setPhase] = useState('inhale'); // inhale, hold, exhale
  const [circleSize, setCircleSize] = useState(120);
  const [timerCount, setTimerCount] = useState(0);

  // 1. 呼吸法多模态切换（4-4-6, 4-7-8, 4-4-4-4）
  const [breathMode, setBreathMode] = useState('slow');

  // 2. 步骤滑动卡索引
  const [activeStep, setActiveStep] = useState(0);

  // 3. 出舱自我微评估与分享状态机
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null); // null | 'helped' | 'shared'

  const audioRef = useRef(null);
  const animationRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const cycleTimeoutRef = useRef(null);



  // 使用 i18n 系统的翻译
  const t = {
    breathing: tFn('somaticHealing.breathing'),
    posture: tFn('somaticHealing.posture'),
    acupressure: tFn('somaticHealing.acupressure'),
    thermal: tFn('somaticHealing.thermal'),
    disclaimer: tFn('somaticHealing.disclaimer'),
    inhale: tFn('somaticHealing.inhale'),
    hold: tFn('somaticHealing.hold'),
    exhale: tFn('somaticHealing.exhale'),
    start: tFn('somaticHealing.start'),
    stop: tFn('somaticHealing.stop'),
    close: tFn('somaticHealing.close'),
    somaticTipsTitle: tFn('somaticHealing.somaticTipsTitle'),
    evalTitle: tFn('somaticHealing.evalTitle'),
    evalQuestion: tFn('somaticHealing.evalQuestion'),
    evalHelped: tFn('somaticHealing.evalHelped'),
    evalNoChange: tFn('somaticHealing.evalNoChange'),
    sharePrompt: tFn('somaticHealing.sharePrompt'),
    shareBtn: tFn('somaticHealing.shareBtn'),
    shareSuccess: tFn('somaticHealing.shareSuccess'),
    stepPrev: tFn('somaticHealing.stepPrev'),
    stepNext: tFn('somaticHealing.stepNext'),
    holdingTip: tFn('somaticHealing.holdingTip'),
    pressingTip: tFn('somaticHealing.pressingTip'),
    thermalTip: tFn('somaticHealing.thermalTip'),
    breathModes: {
      slow: tFn('somaticHealing.breathModes.slow'),
      deep: tFn('somaticHealing.breathModes.deep'),
      box: tFn('somaticHealing.breathModes.box')
    },
    syncTips: tFn('somaticHealing.syncTips'),
    shareDecline: tFn('somaticHealing.shareDecline'),
  };

  // 几十秒高保真循环声音资源词典（指向 /public/ 静态资源路径）
  const SOUND_PATHS = {
    breathing: '/sounds/wave.mp3',
    posture: '/sounds/forest.mp3',
    acupressure: '/sounds/massage.mp3',
    thermal: '/sounds/fireplace.mp3'
  };

  // 使用 i18n 系统的步骤数据库
  const STEP_DATABASES = {
    posture: tFn('somaticHealing.stepDatabase.posture') || [],
    acupressure: tFn('somaticHealing.stepDatabase.acupressure') || [],
    thermal: tFn('somaticHealing.stepDatabase.thermal') || [],
  };

  const startHealing = () => {
    setIsPlaying(true);
    if (!audioRef.current) {
      audioRef.current = new Audio(SOUND_PATHS[activeTab]);
      audioRef.current.loop = true;
    }
    audioRef.current.play().catch(e => console.warn("移动端音频拦截触发，需点击按钮播放:", e));

    if (activeTab === 'breathing') {
      runBreathingLoop();
    } else {
      setTimerCount(0);
      timerIntervalRef.current = setInterval(() => {
        setTimerCount(prev => prev + 1);
      }, 1000);
    }
  };

  const stopHealing = () => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (cycleTimeoutRef.current) clearTimeout(cycleTimeoutRef.current);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setPhase('inhale');
    setCircleSize(120);
    setTimerCount(0);
  };

  // 基于选择的呼吸法模式，动态跑 4-4-6、4-7-8、4-4-4-4 循环
  const runBreathingLoop = () => {
    const runCycle = () => {
      setPhase('inhale');
      animateCircle(120, 200, 4000); // 吸气（4s）

      const holdDuration = breathMode === 'deep' ? 7000 : (breathMode === 'box' ? 4000 : 4000);
      const exhaleDuration = breathMode === 'deep' ? 8000 : (breathMode === 'box' ? 4000 : 6000);

      cycleTimeoutRef.current = setTimeout(() => {
        setPhase('hold');
        animateCircle(200, 200, holdDuration); // 屏息

        cycleTimeoutRef.current = setTimeout(() => {
          setPhase('exhale');
          animateCircle(200, 100, exhaleDuration); // 呼气

          cycleTimeoutRef.current = setTimeout(runCycle, exhaleDuration);
        }, holdDuration);
      }, 4000);
    };
    runCycle();
  };

  // 🌟 保留并升华您最喜欢的流畅正弦呼吸律动曲线
  const animateCircle = (start, end, duration) => {
    const startTime = Date.now();
    const anim = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      // 正弦平滑曲线：呈现极其有弹性和气场支撑感的动态呼吸律动
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
    // 只有调理时间较长的用户在退出时才会启动微评估，避免误触直接关闭
    if (timerCount > 5 || isPlaying) {
      stopHealing();
      setShowEvaluation(true);
    } else {
      onClose();
    }
  };

  // 🌟 闭环：一键分享成功的经验发布到共鸣广场
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

  useEffect(() => {
    return () => {
      stopHealing();
    };
  }, [activeTab, breathMode]);

  if (!isOpen) return null;

  // 滑动步骤卡渲染器
  const renderStepCard = (type) => {
    const steps = STEP_DATABASES[type];
    if (!steps) return null;
    const current = steps[activeStep];
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
            onClick={() => setActiveStep(prev => prev - 1)}
            style={{ flex: 1, padding: '8px', background: '#2c2c2c', border: 'none', borderRadius: '6px', color: activeStep === 0 ? '#444' : '#888', fontSize: '11px', cursor: activeStep === 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
          >
            {t.stepPrev}
          </button>
          <button
            disabled={activeStep === steps.length - 1}
            onClick={() => setActiveStep(prev => prev + 1)}
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

      {/* 1. 呼吸大类特殊阀门：提供多套呼吸模态选择 */}
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

      {/* 多感官自适应视图 */}
      <div style={{ width: '100%', maxWidth: '400px', marginBottom: '10px' }}>
        {renderSomaticModule()}
      </div>

      {/* 如果是体位、穴位、热敷大类，在圆环下方渲染具体的操作指导步骤卡 */}
      {activeTab !== 'breathing' && (
        <div style={{ width: '100%', maxWidth: 'var(--container-sm)', marginBottom: '20px' }}>
          {renderStepCard(activeTab)}
        </div>
      )}

      {/* 激活控制条 */}
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

      {/* 物理安全底线免责警示 */}
      <p style={{ width: '100%', maxWidth: '360px', color: '#ff9800', fontSize: '11px', lineHeight: '1.6', textAlign: 'center', background: 'rgba(255,152,0,0.04)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px dashed rgba(255,152,0,0.15)', margin: '0 0 24px 0', boxSizing: 'border-box' }}>
        {t.disclaimer}
      </p>

      {/* 医生端/自愈特调方案板块 */}
      <div style={{ width: '100%', maxWidth: 'var(--container-sm)', background: '#141414', border: '1px solid #222', borderRadius: 'var(--radius-lg)', padding: 'var(--space-xl)', boxSizing: 'border-box', marginBottom: '30px' }}>
        <h4 style={{ color: '#ab47bc', fontSize: '13px', margin: '0 0 16px 0', fontWeight: 'bold', borderBottom: '1px solid #222', paddingBottom: '10px' }}>
          {t.somaticTipsTitle}
        </h4>
        {aiSelfCareTips && aiSelfCareTips.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {aiSelfCareTips.map((tip, idx) => (
              <div key={idx} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
                <p style={{ color: '#ccc', fontSize: '12.5px', margin: 0, lineHeight: '1.65', textAlign: 'justify' }}>{tip}</p>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#666', fontSize: '12px', textAlign: 'center', margin: '20px 0' }}>{t.syncTips}</p>
        )}
      </div>

      {/* 闭环反馈自愈微评估 */}
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