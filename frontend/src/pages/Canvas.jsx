// src/pages/CanvasPage.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sketch from 'react-p5';
import { useI18n } from '../i18n/i18nContext';
import { BRUSHES, PALETTES } from '../i18n/translationsConstants';
import { PainParticle } from '../Components/PainParticle';
import { useAudio } from '../hooks/useAudio';
import OnboardingGuide from '../Components/OnboardingGuide';

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
  onSaveOnly,
  onViewHistory,
  onShareSaved,
  
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

  // 工具
  saveSnapshot,
  handleUndo,
  handleRedo,
  handleClear,
  resetView,
}) {
  const { t, lang, toggleLang } = useI18n();
  const { playBrushSound } = useAudio(isMuted);
  const [tipVisible, setTipVisible] = useState(true);
  const isDrawingStrokeRef = useRef(false);
  // 【修复1】追踪鼠标是否在 canvas 上按下
  const mousePressedOnCanvasRef = useRef(false);
  // 【修复3】追踪上一次的 bodyMode，用于切换时清除离屏画布
  const prevBodyModeRef = useRef(bodyMode);
  // 仅保存绘画图片
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  // 首次进入 canvas 显示引导
  const [showGuide, setShowGuide] = useState(true);
  // const [showGuide, setShowGuide] = useState(() => {
  //   return !localStorage.getItem('paintScape_guide_seen');
  // });
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
    try {
      bgFrontRef.current = p5.loadImage('body_front.png');
      bgBackRef.current = p5.loadImage('body_back.png');
    } catch (e) {
      console.warn('Failed to load body images, using placeholders');
      const createPlaceholder = () => {
        const img = p5.createImage(100, 100);
        img.loadPixels();
        for (let i = 0; i < img.pixels.length; i += 4) {
          img.pixels[i] = 60;
          img.pixels[i + 1] = 60;
          img.pixels[i + 2] = 60;
          img.pixels[i + 3] = 255;
        }
        img.updatePixels();
        return img;
      };
      bgFrontRef.current = createPlaceholder();
      bgBackRef.current = createPlaceholder();
    }
  };

  const setup = (p5, canvasParentRef) => {
    p5Ref.current = p5;
    const canvas = p5.createCanvas(window.innerWidth, window.innerHeight);
    canvas.parent(canvasParentRef);

    // 【修复1】在 canvas 上监听原生事件，精确追踪是否在 canvas 上按下
    canvas.elt.addEventListener('mousedown', (e) => {
      if (e.target === canvas.elt) {
        mousePressedOnCanvasRef.current = true;
      }
    });
    canvas.elt.addEventListener('touchstart', (e) => {
      if (e.target === canvas.elt && e.touches.length === 1) {
        mousePressedOnCanvasRef.current = true;
      }
    }, { passive: false });

    // 全局监听鼠标/手指松开，重置标记
    window.addEventListener('mouseup', () => {
      mousePressedOnCanvasRef.current = false;
    });
    window.addEventListener('touchend', () => {
      mousePressedOnCanvasRef.current = false;
    });

    // 阻止 canvas 上的默认触摸行为（防止滚动）
    canvas.elt.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1 && activeBrush !== null) {
        e.preventDefault();
      }
    }, { passive: false });
    canvas.elt.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && activeBrush !== null) {
        e.preventDefault();
      }
    }, { passive: false });

    pgFrontRef.current = p5.createGraphics(window.innerWidth, window.innerHeight);
    pgBackRef.current = p5.createGraphics(window.innerWidth, window.innerHeight);
    pgFrontRef.current.clear();
    pgBackRef.current.clear();

    camRef.current = { x: 0, y: 0, zoom: 1.0 };
  };

  const mouseReleased = (p5) => {
    // 【修复4】松开鼠标/手指时保存快照用于撤销
    if (isDrawingStrokeRef.current) {
      if (typeof saveSnapshot === 'function') {
        saveSnapshot();
      }
      isDrawingStrokeRef.current = false;
    }
  };

  const mouseWheel = useCallback((p5, event) => {
    camRef.current.zoom = Math.max(
      0.5,
      Math.min(camRef.current.zoom + (event.delta > 0 ? -0.1 : 0.1), 3.0)
    );
    return false;
  }, []);
  // 下载
  const handleDownload = () => {
    // 通过 p5Ref 获取主画布当前画面
    if (p5Ref.current && p5Ref.current.canvas) {
      const link = document.createElement('a');
      link.download = `painscape_${Date.now()}.png`;
      link.href = p5Ref.current.canvas.toDataURL('image/png');
      link.click();
    }
  };
  const draw = (p5) => {
    // 【修复3】切换 bodyMode 时清除对侧离屏画布
    if (prevBodyModeRef.current !== bodyMode) {
      const prevPg = prevBodyModeRef.current === 'back' ? pgBackRef.current : pgFrontRef.current;
      if (prevPg) {
        prevPg.clear();
      }
      prevBodyModeRef.current = bodyMode;
    }

    p5.background(0);

    let isClickingCanvas = mousePressedOnCanvasRef.current;
    if (p5.mouseEvent && p5.mouseEvent.target) {
      isClickingCanvas = isClickingCanvas && (p5.mouseEvent.target.tagName === 'CANVAS');
    }
    if (p5.touches && p5.touches.length > 0 && p5.touchEvent && p5.touchEvent.target) {
      isClickingCanvas = isClickingCanvas && (p5.touchEvent.target.tagName === 'CANVAS');
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

    let isPanning = false;
    if (activeBrush === null) isPanning = true;
    else if (p5.mouseButton === p5.RIGHT) isPanning = true;
    else if (p5.touches.length >= 2) isPanning = true;

    const currentPg = bodyMode === 'back' ? pgBackRef.current : pgFrontRef.current;

    // ===== 交互绘制 =====
    if (isInteracting) {
      if (isPanning) {
        camRef.current.x += p5.mouseX - p5.pmouseX;
        camRef.current.y += p5.mouseY - p5.pmouseY;
      } else if (activeBrush === 'eraser') {
        if (currentPg) {
          currentPg.erase();
          currentPg.ellipse(realX, realY, 40 / zoom, 40 / zoom);
          currentPg.noErase();
        }
        isDrawingStrokeRef.current = true;
        dynamicParticles.current = dynamicParticles.current.filter(
          (p) => p.bodyMode !== bodyMode || p5.dist(p.pos.x, p.pos.y, realX, realY) > 20
        );
      } else if (activeBrush !== null) {
        isDrawingStrokeRef.current = true;
        brushCounts.current[activeBrush] = (brushCounts.current[activeBrush] || 0) + 1;

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
            speed,
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
        try {
          playBrushSound(activeBrush);
        } catch (e) {
          console.warn('Audio play failed:', e);
        }
      }
    }

    // ===== 更新静态粒子到离屏画布 =====
    for (let i = staticParticles.current.length - 1; i >= 0; i--) {
      const p = staticParticles.current[i];
      p.update(p5);
      const targetPg = p.bodyMode === 'back' ? pgBackRef.current : pgFrontRef.current;
      if (targetPg) {
        p.show(targetPg);
      }
      if (p.isDead()) staticParticles.current.splice(i, 1);
    }

    // ===== 【核心修复】动态粒子只更新，不绘制到离屏画布 =====
    for (let i = dynamicParticles.current.length - 1; i >= 0; i--) {
      const dp = dynamicParticles.current[i];
      dp.update(p5);
      if (dp.isDead()) {
        dynamicParticles.current.splice(i, 1);
      }
    }

    // ===== 绘制背景图 =====
    if (bodyMode !== 'none') {
      const activeImg = bodyMode === 'front' ? bgFrontRef.current : bgBackRef.current;
      if (activeImg) {
        p5.push();
        p5.translate(x, y);
        p5.scale(zoom);
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
        p5.pop();
      }
    }

    // ===== 绘制离屏画布（静态粒子）到主画布 =====
    p5.push();
    p5.translate(x, y);
    p5.scale(zoom);
    p5.noTint();
    p5.imageMode(p5.CORNER);
    if (currentPg) {
      p5.image(currentPg, 0, 0);
    }
    p5.pop();

    // ===== 【核心新增】动态粒子直接绘制到主画布 =====
    p5.push();
    p5.translate(x, y);
    p5.scale(zoom);
    for (let i = 0; i < dynamicParticles.current.length; i++) {
      const dp = dynamicParticles.current[i];
      if (dp.bodyMode === bodyMode) {
        dp.show(p5);
      }
    }
    p5.pop();
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
      {/* ===== p5.js Sketch - 底层 ===== */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
        }}
      >
        <Sketch
          setup={setup}
          draw={draw}
          preload={preload}
          mouseReleased={mouseReleased}
          mouseWheel={mouseWheel}
        />
      </div>

      {/* ===== UI 控件 - 顶层 ===== */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 100,
          pointerEvents: 'none',
        }}
      >
        {/* 顶部导航栏 */}
        <div
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
            pointerEvents: 'auto',
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
            
            {/*  一键语言切换 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                 toggleLang();
              }}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid #444',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              {lang === 'zh' ? 'EN' : '中'}
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
            {appMode === 'general' && (
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

          {/* 右侧按钮组 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* 仅保存按钮 - 次要样式 */}
            <button
              style={{
                background: 'rgba(255,255,255,0.08)',
                color: '#aaa',
                border: '1px solid #444',
                padding: '6px 14px',
                borderRadius: '20px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '12px',
                whiteSpace: 'nowrap',
              }}
              onClick={() => {
                setShowSaveConfirm(false);
                onSaveOnly();
                setSaveSuccess(true);
              }}
            >
              {t('canvas.saveOnly')}
            </button>

            {/* 生成按钮 - 主样式 */}
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
                whiteSpace: 'nowrap',
              }}
              onClick={onGenerate}
            >
              {t('canvas.generate')}
            </button>
          </div>
        </div>

        {/* 方向提示 */}
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
            transition: 'opacity 0.4s ease',
            opacity: tipVisible ? 1 : 0,
          }}
        >
          {bodyMode === 'front' && t('canvas.frontTip')}
          {bodyMode === 'back' && t('canvas.backTip')}
          {bodyMode === 'none' && t('canvas.bodyNone')}
        </div>

        {/* 缩放调节 */}
        {bodyMode !== 'none' && (
          <div
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
              pointerEvents: 'auto',
            }}
          >
            <span style={{ color: '#888', fontSize: '11px', whiteSpace: 'nowrap' }}>
              🗺️ {t('canvas.scale')}
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

        {/* 右侧工具栏 */}
        <div
          style={{
            position: 'absolute',
            right: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '15px',
            pointerEvents: 'auto',
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
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
            title={t('canvas.resetView')}
          >
            🎯
          </button>
        </div>

        {/* 底部工具栏 */}
        <div
          style={{
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
            pointerEvents: 'auto',
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
      {/* 确认弹窗 */}
      {showSaveConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.7)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setShowSaveConfirm(false)}
        >
          <div
            style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '320px',
              width: '85%',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ color: '#ccc', fontSize: '15px', margin: '0 0 20px 0', lineHeight: '1.5' }}>
              {t('canvas.saveOnlyConfirm')}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                style={{
                  background: 'transparent',
                  border: '1px solid #444',
                  color: '#888',
                  padding: '8px 24px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
                onClick={() => setShowSaveConfirm(false)}
              >
                {t('common.cancel')}
              </button>
              <button
                style={{
                  background: '#4caf50',
                  border: 'none',
                  color: '#fff',
                  padding: '8px 24px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                }}
                onClick={() => {
                  setShowSaveConfirm(false);
                  onSaveOnly();
                }}
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 保存成功提示 */}
      {saveSuccess && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.7)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setSaveSuccess(false)}
        >
          <div
            style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '300px',
              width: '85%',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>✅</div>
            <p style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
              {t('canvas.saved')}
            </p>
            <p style={{ color: '#888', fontSize: '13px', margin: '0 0 20px 0', lineHeight: '1.5' }}>
              {t('canvas.savedHint')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* 下载到本地 */}
              <button
                style={{
                  background: '#4caf50',
                  border: 'none',
                  color: '#fff',
                  padding: '10px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  width: '100%',
                }}
                onClick={handleDownload}
              >
                💾 {t('canvas.download')}
              </button>
              {/* 🌟 新增：分享 */}
              {onShareSaved && (
                <button
                  style={{
                    background: 'rgba(33,150,243,0.15)',
                    border: '1px solid #2196f3',
                    color: '#2196f3',
                    padding: '10px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    width: '100%',
                  }}
                  onClick={() => {
                    setSaveSuccess(false);
                    onShareSaved();
                  }}
                >
                  📤 {t('canvas.share')}
                </button>
              )}
              {/* 查看历史记录 */}
              {onViewHistory && (
                <button
                  style={{
                    background: 'rgba(76,175,80,0.15)',
                    border: '1px solid #4caf50',
                    color: '#4caf50',
                    padding: '10px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    width: '100%',
                  }}
                  onClick={() => {
                    setSaveSuccess(false);
                    onViewHistory();
                  }}
                >
                  📋 {t('canvas.viewHistory')}
                </button>
              )}
              {/* 继续绘画 */}
              <button
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid #444',
                  color: '#ccc',
                  padding: '10px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  width: '100%',
                }}
                onClick={() => setSaveSuccess(false)}
              >
                {t('canvas.continueDrawing')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 新手引导 */}
      {showGuide && (
        <OnboardingGuide
          onClose={() => {
            setShowGuide(false);
            localStorage.setItem('paintScape_guide_seen', 'true');
          }}
        />
      )}
    </div>
  );
}