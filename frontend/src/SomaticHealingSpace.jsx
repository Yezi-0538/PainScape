// SomaticHealingSpace.jsx
import React, { useState, useRef, useEffect } from 'react';

const SomaticHealingSpace = ({ isOpen, activeTab = 'breathing', onClose, language = 'zh', aiSelfCareTips = [] }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [phase, setPhase] = useState('inhale'); // inhale, hold, exhale (仅呼吸类别用)
  const [circleSize, setCircleSize] = useState(120);
  const [timer, setTimer] = useState(0); // 计时器（仅体位拉伸用）
  
  const audioRef = useRef(null);
  const animationRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const cycleTimeoutRef = useRef(null);

  const isEn = language === 'en';

  const t = {
    zh: {
      breathing: "🌬️ 骨盆释压呼吸调理",
      posture: "🧘 骨盆拉伸与体位松弛",
      acupressure: "💆 特异穴位物理按揉",
      thermal: "🔥 局部热敷与食疗温补",
      disclaimer: "⚠️ 任何自愈调节若引起额外不适，请立即停止并保持原位静卧。",
      inhale: '🌬️ 吸气... 感受腹腔扩张',
      hold: '🧘 屏息... 骨盆彻底沉降松弛',
      exhale: '🍃 呼气... 吐出所有张力与酸楚',
      start: '开启体感音频疗愈',
      stop: '暂停静疗',
      close: '退出静疗舱',
      somaticTipsTitle: "💡 本次发作·特调自愈方案",
      holdingTip: "请维持当前拉伸姿势，保持平稳呼吸",
      pressingTip: "💆 跟着闪烁节奏：一下、一下地稳重按揉（60 BPM）",
      thermalTip: "🔥 暖橙色升温暗示：局部热敷放松中..."
    },
    en: {
      breathing: "🌬️ Pelvic Breathing Regulation",
      posture: "🧘 Pelvic Stretch & Somatic Pose",
      acupressure: "💆 Specific Acupressure Guide",
      thermal: "🔥 Thermotherapy & Warm Nutrition",
      disclaimer: "⚠️ Discontinue any adjustment immediately if discomfort occurs. Rest still.",
      inhale: 'Inhale... Expand your abdomen',
      hold: 'Hold... Release all pelvic tension',
      exhale: 'Exhale... Let go of the ache',
      start: 'Start Somatic Audio Guide',
      stop: 'Pause Session',
      close: 'Exit Quiet Space',
      somaticTipsTitle: "💡 Custom Somatic Recipes",
      holdingTip: "Maintain this pose, breathe naturally",
      pressingTip: "💆 Follow the pulse: press and release rhythmically (60 BPM)",
      thermalTip: "🔥 Warming light pulsing: heat compress active..."
    }
  }[language];

  // 音频文件地址字典（指向 /public/ 静态资源文件夹）
  const SOUND_PATHS = {
    breathing: '/sounds/wave.mp3',
    posture: '/sounds/forest.mp3',
    acupressure: '/sounds/massage.mp3',
    thermal: '/sounds/fireplace.mp3'
  };

  // 1. 播放/控制多感官疗愈引擎
  const startHealing = () => {
    setIsPlaying(true);

    // 播放对应的 looped 疗愈音乐（用户交互后触发，绕过 Safari 限制）
    if (!audioRef.current) {
      audioRef.current = new Audio(SOUND_PATHS[activeTab]);
      audioRef.current.loop = true; // 🌟 几十秒的音频会自动无缝循环播放
    }
    audioRef.current.play().catch(e => console.warn("音频播发受限:", e));

    // 根据不同的自愈大类，启动特异化的物理反馈
    if (activeTab === 'breathing') {
      runBreathingLoop();
    } else if (activeTab === 'posture') {
      setTimer(0);
      timerIntervalRef.current = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
  };

  const stopHealing = () => {
    setIsPlaying(false);
    
    // 停止音频
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    // 停止倒计时
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // 停止呼吸环动画
    if (cycleTimeoutRef.current) clearTimeout(cycleTimeoutRef.current);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    
    setPhase('inhale');
    setCircleSize(120);
    setTimer(0);
  };

  // 4-4-6 物理起伏圆环动画
  const runBreathingLoop = () => {
    const runCycle = () => {
      setPhase('inhale');
      animateCircle(120, 200, 4000); // 吸气：圆环放大

      cycleTimeoutRef.current = setTimeout(() => {
        setPhase('hold');
        animateCircle(200, 200, 4000); // 屏息：保持尺寸

        cycleTimeoutRef.current = setTimeout(() => {
          setPhase('exhale');
          animateCircle(200, 100, 6000); // 呼气：缓缓收缩

          cycleTimeoutRef.current = setTimeout(runCycle, 6000);
        }, 4000);
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

  useEffect(() => {
    return () => {
      stopHealing();
    };
  }, [activeTab]);

  if (!isOpen) return null;

  // 2. 多感官模块自适应视图切换器
  const renderSomaticModule = () => {
    switch (activeTab) {
      case 'breathing':
        return (
          <div style={{ textAlign: 'center', height: '280px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{
              width: `${circleSize}px`, height: `${circleSize}px`,
              borderRadius: '50%', background: 'rgba(76, 175, 80, 0.08)',
              border: '1.5px solid rgba(76, 175, 80, 0.4)',
              boxShadow: '0 0 40px rgba(76, 175, 80, 0.15)',
              transition: 'width 0.1s ease, height 0.1s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%', background: '#4caf50', opacity: 0.3,
                transform: `scale(${phase === 'inhale' ? 1.5 : phase === 'hold' ? 1.8 : 0.8})`,
                transition: 'transform 4s ease-in-out'
              }} />
            </div>
            <div style={{ color: '#4caf50', fontSize: '15px', fontWeight: '600', height: '24px' }}>
              {isPlaying ? t[phase] : " "}
            </div>
          </div>
        );

      case 'posture':
        return (
          <div style={{ textAlign: 'center', height: '280px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{
              width: '140px', height: '140px', borderRadius: '50%',
              background: 'rgba(171, 71, 188, 0.05)',
              border: '1.5px solid rgba(171, 71, 188, 0.3)',
              boxShadow: '0 0 50px rgba(171, 71, 188, 0.1)',
              animation: isPlaying ? 'pulse 6s infinite ease-in-out' : 'none',
              margin: '0 auto 24px auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <span style={{ fontSize: '32px' }}>🧘</span>
            </div>
            <div style={{ color: '#ab47bc', fontSize: '26px', fontWeight: 'bold', fontFamily: 'monospace' }}>
              {formatTime(timer)}
            </div>
            <p style={{ color: '#aaa', fontSize: '12px', marginTop: '8px', height: '18px' }}>
              {isPlaying ? t.holdingTip : " "}
            </p>
          </div>
        );

      case 'acupressure':
        return (
          <div style={{ textAlign: 'center', height: '280px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            {/* 60 BPM 按压节拍律动视觉 */}
            <div style={{
              width: '130px', height: '130px', borderRadius: '50%',
              background: isPlaying ? 'rgba(33, 150, 243, 0.1)' : 'rgba(255,255,255,0.02)',
              border: isPlaying ? '2.5px solid #2196f3' : '1.5px solid #333',
              boxShadow: isPlaying ? '0 0 45px rgba(33, 150, 243, 0.2)' : 'none',
              animation: isPlaying ? 'pulse 1s infinite steps(2)' : 'none', // 1秒1闪
              margin: '0 auto 24px auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <span style={{ fontSize: '32px' }}>💆</span>
            </div>
            <p style={{ color: '#2196f3', fontSize: '13px', fontWeight: '600', maxWidth: '300px', margin: 0, height: '36px', lineHeight: '1.5' }}>
              {isPlaying ? t.pressingTip : " "}
            </p>
          </div>
        );

      case 'thermal':
        return (
          <div style={{ textAlign: 'center', height: '280px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            {/* 暖橙色热敷光晕 */}
            <div style={{
              width: '140px', height: '140px', borderRadius: '50%',
              background: 'rgba(255, 152, 0, 0.08)',
              border: '1.5px solid rgba(255, 152, 0, 0.4)',
              boxShadow: isPlaying ? '0 0 60px rgba(255, 152, 0, 0.25)' : 'none',
              animation: isPlaying ? 'pulse 4s infinite ease-in-out' : 'none',
              margin: '0 auto 24px auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <span style={{ fontSize: '32px' }}>🔥</span>
            </div>
            <p style={{ color: '#ff9800', fontSize: '13px', fontWeight: '600', margin: 0, height: '18px' }}>
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
      position: 'fixed',
      zIndex: 10000,
      top: 0, left: 0,
      width: '100vw', height: '100vh',
      background: '#0d0d0d',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px 16px',
      boxSizing: 'border-box'
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
        <h3 style={{ color: '#fff', fontSize: '16px', margin: 0, fontWeight: 'bold' }}>
          {t[activeTab]}
        </h3>
        <button 
          onClick={() => { stopHealing(); onClose(); }}
          style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#888', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer' }}
        >
          {t.close}
        </button>
      </div>

      {/* 自适应反馈舱 */}
      <div style={{ width: '100%', maxWidth: '400px', marginBottom: '10px' }}>
        {renderSomaticModule()}
      </div>

      {/* 控制激活按钮 */}
      <div style={{ width: '100%', maxWidth: '380px', marginBottom: '24px' }}>
        <button
          onClick={isPlaying ? stopHealing : startHealing}
          style={{
            width: '100%',
            padding: '16px',
            background: isPlaying ? '#2c2c2c' : '#4caf50',
            border: 'none',
            borderRadius: '30px',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '15px',
            cursor: 'pointer',
            boxShadow: isPlaying ? 'none' : '0 4px 15px rgba(76,175,80,0.3)',
            transition: 'all 0.2s',
            letterSpacing: '1px'
          }}
        >
          {isPlaying ? t.stop : t.start}
        </button>
      </div>

      {/* 安全底线警示 */}
      <p style={{
        width: '100%',
        maxWidth: '360px',
        color: '#ff9800',
        fontSize: '11px',
        lineHeight: '1.6',
        textAlign: 'center',
        background: 'rgba(255,152,0,0.04)',
        padding: '10px 14px',
        borderRadius: '12px',
        border: '1px dashed rgba(255,152,0,0.15)',
        margin: '0 0 24px 0',
        boxSizing: 'border-box'
      }}>
        {t.disclaimer}
      </p>

      {/* 特调自愈文案库 */}
      <div style={{ width: '100%', maxWidth: '380px', background: '#141414', border: '1px solid #222', borderRadius: '20px', padding: '20px', boxSizing: 'border-box', marginBottom: '30px' }}>
        <h4 style={{ color: '#ab47bc', fontSize: '13px', margin: '0 0 16px 0', fontWeight: 'bold', borderBottom: '1px solid #222', paddingBottom: '10px' }}>
          {t.somaticTipsTitle}
        </h4>

        {aiSelfCareTips && aiSelfCareTips.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {aiSelfCareTips.map((tip, idx) => (
              <div key={idx} style={{
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid rgba(255,255,255,0.03)',
                borderRadius: '12px',
                padding: '12px 14px',
              }}>
                <p style={{
                  color: '#ccc',
                  fontSize: '12.5px',
                  margin: 0,
                  lineHeight: '1.65',
                  textAlign: 'justify'
                }}>
                  {tip}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#666', fontSize: '12px', textAlign: 'center', margin: '20px 0' }}>
            正在同步调谐本次痛觉自愈方案...
          </p>
        )}
      </div>
    </div>
  );
};

export default SomaticHealingSpace;