// src/pages/CanvasPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import Sketch from 'react-p5';
import { useI18n } from '../i18n/i18nContext';
import { BRUSHES, PALETTES } from '../i18n/translationsConstants';
import { PainParticle } from '../components/PainParticle';
import { useAudio } from '../hooks/useAudio';

// ============================================================
// 子组件：画笔颜色描述
// ============================================================
const ColorDescription = ({ activeColor, t }) => {
  const descriptions = {
    crimson: t('colorDescriptions.crimson'),
    dark: t('colorDescriptions.dark'),
    purple: t('colorDescriptions.purple'),
    blue: t('colorDescriptions.blue'),
  };
  return descriptions[activeColor] || '';
};

// ============================================================
// 主组件
// ============================================================
export default function CanvasPage({
  // 导航
  onBack,
  onGenerate,

  // 画板状态
  bodyMode,
  setBodyMode,
  activeBrush,
  setActiveBrush,
  activeColor,
  setActiveColor,
  bgScale,
  setBgScale,

  // 音频
  isMuted,
  setIsMuted,

  // p5 引用
  p5Ref,
  pgFrontRef,
  pgBackRef,
  bgFrontRef,
  bgBackRef,

  // 粒子相关
  brushCounts,
  dynamicParticles,
  staticParticles,
  particlePositions,
  speedHistory,
  pressureHistory,

  // 相机
  camRef,

  // 应用模式
  appMode,

  // 工具函数
  calcEmotionLoad,
  handleUndo,
  handleRedo,
  handleClear,
  resetView,

  // 翻译
  t,
}) {
  const { playBrushSound } = useAudio();
  const [tipVisible, setTipVisible] = useState(true);

  // 方向提示自动消失
  useEffect(() => {
    setTipVisible(true);
    const timer = setTimeout(() => setTipVisible(false), 1500);
    return () => clearTimeout(timer);
  }, [bodyMode]);

  // ============================================================
  // p5.js 生命周期函数
  // ============================================================

  const preload = (p5) => {
    bgFrontRef.current = p5.loadImage('body_front.png');
    bgBackRef.current = p5.loadImage('body_back.png');
  };

  const setup = (p5, canvasParentRef) => {
    p5Ref.current = p5;
    p5.createCanvas(window.innerWidth, window.innerHeight).parent(canvasParentRef);

    // 锁定触摸事件
    const canvas = p5.canvas;
    canvas.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length === 1 && activeBrush !== null) {
          e.preventDefault();
        }
      },
      { passive: false }
    );
    canvas.addEventListener(
      'touchmove',
      (e) => {
        if (e.touches.length === 1 && activeBrush !== null) {
          e.preventDefault();
        }
      },
      { passive: false }
    );

    // 创建前后画布
    pgFrontRef.current = p5.createGraphics(window.innerWidth, window.innerHeight);
    pgBackRef.current = p5.createGraphics(window.innerWidth, window.innerHeight);
    pgFrontRef.current.clear();
    pgBackRef.current.clear();

    // 初始化相机
    camRef.current = { x: 0, y: 0, zoom: 1.0 };
  };

  const draw = (p5) => {
    p5.background(0);

    // 检查是否在画布上点击
    let isClickingCanvas = true;
    if (p5.mouseEvent && p5.mouseEvent.target) {
      isClickingCanvas = p5.mouseEvent.target.tagName === 'CANVAS';
    }
    if (p5.touchEvent && p5.touches.length > 0 && p5.touchEvent.target) {
      isClickingCanvas = p5.touchEvent.target.tagName === 'CANVAS';
    }

    const { x, y, zoom } = camRef.current;
    const isInteracting =
      (p5.mouseIsPressed || p5.touches.length > 0) && isClickingCanvas;

    const realX = (p5.mouseX - x) / zoom;
    const realY = (p5.mouseY - y) / zoom;
    const realPx = (p5.pmouseX - x) / zoom;
    const realPy = (p5.pmouseY - y) / zoom;
    const speed = p5.dist(realX, realY, realPx, realPy);
    const heading = speed < 1 ? p5.PI / 2 : p5.atan2(realY - realPy, realX - realPx);

    // 判断是否是平移模式
    let isPanning = false;
    if (activeBrush === null) isPanning = true;
    else if (p5.mouseButton === p5.RIGHT) isPanning = true;
    else if (p5.touches.length >= 2) isPanning = true;

    const currentPg = bodyMode === 'back' ? pgBackRef.current : pgFrontRef.current;

    if (isInteracting) {
      if (isPanning) {
        camRef.current.x += p5.mouseX - p5.pmouseX;
        camRef.current.y += p5.mouseY - p5.pmouseY;
      } else if (activeBrush === 'eraser') {
        currentPg.erase();
        currentPg.ellipse(realX, realY, 40 / zoom, 40 / zoom);
        currentPg.noErase();
        dynamicParticles.current = dynamicParticles.current.filter(
          (p) => p.bodyMode !== bodyMode || p5.dist(p.pos.x, p.pos.y, realX, realY) > 20
        );
      } else if (activeBrush !== null) {
        brushCounts.current[activeBrush] = (brushCounts.current[activeBrush] || 0) + 1;

        // 记录速度
        if (speedHistory.current.length > 200) speedHistory.current.shift();
        speedHistory.current.push(speed);

        const spawnRate = ['wave', 'twist', 'heavy'].includes(activeBrush) ? 6 : 2;
        if (p5.frameCount % spawnRate === 0 || speed > 10) {
          let pressure = 0.5;
          if (p5.touches.length > 0) {
            pressure = p5.touches[0].force ?? 0.5;
          } else if (typeof p5.mouseX === 'number' && p5._curElement) {
            pressure = p5._curElement?.pointer?.pressure ?? 0.5;
          }
          pressure = Math.max(0.2, pressure);

          const pObj = new PainParticle(
            p5,
            realX,
            realY,
            activeBrush,
            PALETTES[activeColor].color,
            heading,
            bodyMode,
            pressure
          );

          particlePositions.current.push({ x: realX, y: realY, bodyMode });
          if (pressureHistory.current.length > 200) pressureHistory.current.shift();
          pressureHistory.current.push(pressure);

          if (pObj.isDynamic) {
            dynamicParticles.current.push(pObj);
            if (dynamicParticles.current.length > 500) dynamicParticles.current.shift();
          } else {
            staticParticles.current.push(pObj);
          }
        }
        playBrushSound(activeBrush);
      }
    }

    // 更新静态粒子
    for (let i = staticParticles.current.length - 1; i >= 0; i--) {
      const p = staticParticles.current[i];
      p.update(p5);
      const targetPg = p.bodyMode === 'back' ? pgBackRef.current : pgFrontRef.current;
      p.show(targetPg);
      if (p.isDead()) staticParticles.current.splice(i, 1);
    }

    // 绘制背景图
    p5.push();
    p5.translate(x, y);
    p5.scale(zoom);
    const activeImg = bodyMode === 'front' ? bgFrontRef.current : bgBackRef.current;
    if (activeImg) {
      p5.imageMode(p5.CENTER);
      p5.tint(255, 40);
      const currentBgScale = bgScale || 1.0;
      const imgScale = ((p5.height * 0.8) / activeImg.height) * currentBgScale;
      p5.image(
        activeImg,
        p5.width / 2,
        p5.height / 2,
        activeImg.width * imgScale,
        activeImg.height * imgScale
      );
    }
    p5.noTint();
    p5.imageMode(p5.CORNER);
    p5.image(currentPg, 0, 0);

    // 更新动态粒子
    for (let i = dynamicParticles.current.length - 1; i >= 0; i--) {
      const dp = dynamicParticles.current[i];
      dp.update(p5);
      if (dp.bodyMode === bodyMode) dp.show(p5);
      if (dp.isDead()) dynamicParticles.current.splice(i, 1);
    }
    p5.pop();
  };

  const mouseWheel = (p5, event) => {
    camRef.current.zoom = Math.max(
      0.5,
      Math.min(camRef.current.zoom + (event.delta > 0 ? -0.1 : 0.1), 3.0)
    );
    return false;
  };

  const mouseReleased = (p5) => {
    // 可用于保存撤销状态
  };

  // ============================================================
  // 渲染
  // ============================================================
  return (
    <div
      className="canvas-screen-wrapper"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 10,
        pointerEvents: 'auto',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* p5.js Sketch */}
      <div style={{ position: 'fixed', top: 0, left: 0, zIndex: 1 }}>
        <Sketch
          setup={setup}
          draw={draw}
          preload={preload}
          mouseWheel={mouseWheel}
          mouseReleased={mouseReleased}
        />
      </div>

      {/* ===== 顶部导航栏 ===== */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '60px',
          background: 'rgba(10, 10, 10, 0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #1a1a1a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          boxSizing: 'border-box',
          zIndex: 100,
        }}
      >
        {/* 左侧 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onBack}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid #333',
              color: '#fff',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ←
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMuted(!isMuted);
            }}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${isMuted ? '#444' : '#4caf50'}`,
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isMuted ? '#666' : '#4caf50',
            }}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
        </div>

        {/* 中间：正反面切换 */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '20px',
            padding: '2px',
            border: '1px solid #222',
          }}
        >
          <button
            style={{
              padding: '6px 14px',
              borderRadius: '16px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              background: bodyMode === 'front' ? '#4caf50' : 'transparent',
              color: bodyMode === 'front' ? '#fff' : '#888',
              transition: 'all 0.2s',
            }}
            onClick={(e) => {
              e.stopPropagation();
              setBodyMode('front');
            }}
          >
            {t('canvas.bodyFront')}
          </button>
          <button
            style={{
              padding: '6px 15px',
              borderRadius: '16px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 'bold',
              background: bodyMode === 'back' ? '#4caf50' : 'transparent',
              color: bodyMode === 'back' ? '#fff' : '#888',
            }}
            onClick={(e) => {
              e.stopPropagation();
              setBodyMode('back');
            }}
          >
            {t('canvas.bodyBack')}
          </button>
          {appMode !== 'general' && (
            <button
              style={{
                padding: '6px 15px',
                borderRadius: '16px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold',
                background: bodyMode === 'none' ? '#d32f2f' : 'transparent',
                color: bodyMode === 'none' ? '#fff' : '#888',
              }}
              onClick={(e) => {
                e.stopPropagation();
                setBodyMode('none');
              }}
            >
              {t('canvas.bodyNone')}
            </button>
          )}
        </div>

        {/* 右侧生成按钮 */}
        <button
          style={{
            background: '#d32f2f',
            color: '#fff',
            border: 'none',
            padding: '6px 16px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '13px',
            boxShadow: '0 4px 12px rgba(211,47,47,0.3)',
          }}
          onClick={onGenerate}
        >
          {t('canvas.generate')}
        </button>
      </div>

      {/* ===== 方向提示 ===== */}
      <div
        style={{
          position: 'absolute',
          top: '90px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.75)',
          padding: '6px 18px',
          borderRadius: '20px',
          fontSize: '11px',
          color: '#fff',
          pointerEvents: 'none',
          zIndex: 5,
          transition: 'opacity 0.4s ease',
          opacity: tipVisible ? 1 : 0,
        }}
      >
        {bodyMode === 'front' && '🔄 正面视图'}
        {bodyMode === 'back' && '🔄 背面视图'}
        {bodyMode === 'none' && '🎨 盲画模式'}
      </div>

      {/* ===== 缩放调节 ===== */}
      {bodyMode !== 'none' && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: '75px',
            left: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(20,20,20,0.85)',
            padding: '6px 12px',
            borderRadius: '12px',
            border: '1px solid #2d2d2d',
            zIndex: 10,
          }}
        >
          <span style={{ color: '#888', fontSize: '11px', whiteSpace: 'nowrap' }}>
            🗺️ {t('canvas.scale') || '比例'}
          </span>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.05"
            value={bgScale}
            onChange={(e) => setBgScale(parseFloat(e.target.value))}
            style={{
              accentColor: '#4caf50',
              width: '60px',
              height: '4px',
              cursor: 'pointer',
            }}
          />
          <span style={{ color: '#aaa', fontSize: '11px', minWidth: '32px' }}>
            {Math.round(bgScale * 100)}%
          </span>
        </div>
      )}

      {/* ===== 右侧工具栏 ===== */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        style={{
          pointerEvents: 'auto',
          position: 'absolute',
          right: '20px',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '15px',
        }}
      >
        {/* 情绪加载指示器 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            height: '180px',
            width: '30px',
            position: 'relative',
            justifyContent: 'flex-end',
          }}
        >
          <div
            style={{
              color: '#888',
              fontSize: '9px',
              marginBottom: '4px',
              writingMode: 'vertical-rl',
            }}
          >
            {t('canvas.emotionLoad')}
          </div>
          <div
            style={{
              width: '6px',
              height: '100%',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '3px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                width: '100%',
                height: `${calcEmotionLoad()}%`,
                background: `linear-gradient(to top, #4caf50, #ff9800, #d32f2f)`,
                borderRadius: '3px',
                transition: 'height 0.3s ease-out',
              }}
            />
          </div>
          <div
            style={{
              color: calcEmotionLoad() > 70 ? '#d32f2f' : '#fff',
              fontSize: '12px',
              fontWeight: 'bold',
              marginTop: '6px',
            }}
          >
            {calcEmotionLoad()}
          </div>
        </div>

        {/* 工具按钮 */}
        <button
          style={{
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(10px)',
            border: '1px solid #444',
            borderRadius: '30px',
            width: '50px',
            height: '50px',
            fontSize: '24px',
            cursor: 'pointer',
          }}
          onClick={(e) => {
            e.stopPropagation();
            handleUndo();
          }}
        >
          ↩️
        </button>
        <button
          style={{
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(10px)',
            border: '1px solid #444',
            borderRadius: '30px',
            width: '50px',
            height: '50px',
            fontSize: '24px',
            cursor: 'pointer',
          }}
          onClick={(e) => {
            e.stopPropagation();
            handleRedo();
          }}
        >
          ↪️
        </button>
        <button
          style={{
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(10px)',
            border: '1px solid #444',
            borderRadius: '30px',
            width: '50px',
            height: '50px',
            fontSize: '24px',
            cursor: 'pointer',
          }}
          onClick={(e) => {
            e.stopPropagation();
            handleClear();
          }}
        >
          🗑️
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            resetView();
          }}
          style={{
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(10px)',
            border: '1px solid #444',
            borderRadius: '30px',
            width: '50px',
            height: '50px',
            fontSize: '20px',
            cursor: 'pointer',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={t('canvas.resetView') || '重置视角'}
        >
          🎯
        </button>
      </div>

      {/* ===== 底部画笔工具栏 ===== */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        style={{
          pointerEvents: 'auto',
          position: 'absolute',
          bottom: 'max(20px, env(safe-area-inset-bottom))',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '92%',
          maxWidth: '380px',
          background: 'rgba(20,20,20,0.95)',
          padding: '12px 16px',
          borderRadius: '24px',
          backdropFilter: 'blur(12px)',
          border: '1px solid #2a2a2a',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {/* 画笔行 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          {Object.keys(BRUSHES).map((k) => (
            <button
              key={k}
              style={{
                flex: 1,
                background: activeBrush === k ? '#444' : 'transparent',
                border: 'none',
                color: activeBrush === k ? '#fff' : '#888',
                padding: '8px 0',
                borderRadius: '10px',
                fontSize: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
              }}
              onClick={() => setActiveBrush(activeBrush === k ? null : k)}
            >
              {BRUSHES[k].isImage ? (
                <img
                  src={BRUSHES[k].icon}
                  alt={BRUSHES[k].label}
                  style={{
                    width: '24px',
                    height: '24px',
                    marginBottom: '4px',
                    opacity: activeBrush === k ? 1 : 0.7,
                  }}
                />
              ) : (
                <span style={{ fontSize: '20px', marginBottom: '4px' }}>{BRUSHES[k].icon}</span>
              )}
              <span>{t(`brushes.${k}.label`)}</span>
            </button>
          ))}
        </div>

        {/* 颜色行 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
            {Object.keys(PALETTES).map((k) => (
              <div
                key={k}
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  border: activeColor === k ? '2px solid #fff' : '2px solid #444',
                  background: `rgb(${PALETTES[k].color.join(',')})`,
                  cursor: 'pointer',
                  transform: activeColor === k ? 'scale(1.2)' : 'none',
                }}
                onClick={() => setActiveColor(k)}
              />
            ))}
          </div>
          <span
            style={{
              color: '#888',
              fontSize: '11px',
              marginTop: '6px',
              textAlign: 'center',
              display: 'block',
            }}
          >
            <ColorDescription activeColor={activeColor} t={t} />
          </span>
        </div>
      </div>
    </div>
  );
}