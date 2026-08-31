// src/pages/CanvasPage.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sketch from 'react-p5';
import { useI18n } from '../i18n/i18nContext';
import { BRUSHES, PALETTES } from '../i18n/translationsConstants';
import { PainParticle } from '../Components/PainParticle';
import { useAudio } from '../hooks/useAudio';
import OnboardingGuide from '../Components/OnboardingGuide';
import { useUser } from '../contexts/UserContext';
import { telemetry } from '../services/telemetry';
import CanvasGuide from '../Components/CanvasGuide';

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
  onBack,
  onGenerate,
  onSaveOnly,
  onViewHistory,
  onShareSaved,
  onSpatialMapUpdate,
  bodyMode,
  setBodyMode,
  activeBrush,
  setActiveBrush,
  activeColor,
  setActiveColor,
  bgScale,
  setBgScale,
  onSaveDraft,
  onViewDraftBox,
  isMuted,
  setIsMuted,
  p5Ref,
  pgFrontRef,
  pgBackRef,
  bgFrontRef,
  bgBackRef,
  brushCounts,
  dynamicParticles,
  staticParticles,
  particlePositions,
  speedHistory,
  pressureHistory,
  contactAreaHistory,
  intensitySourceRef,
  camRef,
  appMode,
  saveSnapshot,
  handleUndo,
  handleRedo,
  handleClear,
  resetView,
  showToast,
  draftCount = 0,
}) {

  const { t, lang, toggleLang } = useI18n();
  const { playBrushSound } = useAudio(isMuted);
  const [tipVisible, setTipVisible] = useState(true);

  const isDrawingStrokeRef = useRef(false);
  const mousePressedOnCanvasRef = useRef(false);
  const prevBodyModeRef = useRef(bodyMode);

  // 🌟 坠痛画笔单笔点迹收集器（长按静默收集，松手生成单个抛物面网）
  const heavyStrokePointsRef = useRef([]);

  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const { userId, userInfo, setUserInfo } = useUser();

  const [showGuide, setShowGuide] = useState(false);
  const [guideLoading, setGuideLoading] = useState(true);
  const [showCanvasGuide, setShowCanvasGuide] = useState(false);
  const [canvasGuideLoading, setCanvasGuideLoading] = useState(true);
  const [showDraftSuccess, setShowDraftSuccess] = useState(false);

  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 480);

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 480);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const particleDwellTimeRef = useRef({});

  useEffect(() => {
    const checkUserGuideStatus = async () => {
      if (userId && userInfo) {
        const hasSeen = userInfo.hasSeenGuide || false;
        setShowGuide(!hasSeen);
        setGuideLoading(false);
        return;
      }
      const hasSeen = localStorage.getItem('paintScape_guide_seen') === 'true';
      setShowGuide(!hasSeen);
      setGuideLoading(false);
    };
    checkUserGuideStatus();
  }, [userId, userInfo]);

  useEffect(() => {
    const hasSeen = localStorage.getItem('paintScape_canvas_guide_shown') === 'true';
    if (!hasSeen && !showGuide) {
      setShowCanvasGuide(true);
    }
    setCanvasGuideLoading(false);
  }, [showGuide]);

  const handleGuideClose = async () => {
    setShowGuide(false);
    localStorage.setItem('paintScape_guide_seen', 'true');
    if (userId) {
      try {
        await setUserInfo({ hasSeenGuide: true });
      } catch (err) {
        console.warn('更新引导状态失败:', err);
      }
    }
  };

  const handleCanvasGuideComplete = () => {
    setShowCanvasGuide(false);
    localStorage.setItem('paintScape_canvas_guide_shown', 'true');
  };

  useEffect(() => {
    setTipVisible(true);
    const timer = setTimeout(() => setTipVisible(false), 1500);
    return () => clearTimeout(timer);
  }, [bodyMode]);

  const handleSaveDraftOnly = useCallback(async () => {
    const draftData = {
      brushCounts: { ...(brushCounts?.current || {}) },
      particlePositions: [...(particlePositions?.current || [])],
      speedHistory: [...(speedHistory?.current || [])],
      pressureHistory: [...(pressureHistory?.current || [])],
      contactAreaHistory: [...(contactAreaHistory?.current || [])],
      intensitySource: intensitySourceRef?.current || 'unknown',
      activeColor: activeColor || 'crimson',
      bodyMode: bodyMode || 'front',
      bgScale: bgScale || 1.0,
      timestamp: new Date().toISOString(),
    };

    const canvas = p5Ref.current?.canvas;
    if (canvas) {
      draftData.canvasImage = canvas.toDataURL('image/png');
    }
    if (pgFrontRef.current) {
      const frontImg = pgFrontRef.current.get();
      draftData.frontImage = frontImg.canvas.toDataURL('image/png');
    }
    if (pgBackRef.current) {
      const backImg = pgBackRef.current.get();
      draftData.backImage = backImg.canvas.toDataURL('image/png');
    }

    const brushCount = Object.values(brushCounts?.current || {}).reduce((a, b) => a + b, 0);
    const particleCount = particlePositions?.current?.length || 0;

    const result = await onSaveDraft(draftData);
    if (result) {
      telemetry.logDraftSaved({
        draftId: result,
        brushCount,
        particleCount,
        fromPage: 'canvas'
      });
      setShowDraftSuccess(true);
    }
  }, [onSaveDraft, brushCounts, particlePositions, speedHistory, pressureHistory, activeColor, bodyMode, bgScale, p5Ref, pgFrontRef, pgBackRef, contactAreaHistory, intensitySourceRef]);

  const handleViewDraftBox = useCallback(() => {
    let count = 0;
    try {
      const localDrafts = JSON.parse(localStorage.getItem('paintScape_drafts') || '[]');
      count = localDrafts.length;
    } catch (e) {
      count = 0;
    }

    telemetry.logDraftBoxViewedWithCount({
      fromPage: 'canvas',
      draftCount: count
    });

    if (onViewDraftBox) {
      onViewDraftBox();
    }
  }, [onViewDraftBox]);

  const preload = (p5) => {
    try {
      bgFrontRef.current = p5.loadImage('body_front.png');
      bgBackRef.current = p5.loadImage('body_back.png');
    } catch (e) {
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
    p5.pixelDensity(1);

    const canvas = p5.createCanvas(window.innerWidth, window.innerHeight);
    canvas.parent(canvasParentRef);

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

    window.addEventListener('mouseup', () => {
      mousePressedOnCanvasRef.current = false;
    });
    window.addEventListener('touchend', () => {
      mousePressedOnCanvasRef.current = false;
    });

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

    p5.windowResized = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      p5.resizeCanvas(w, h);

      const oldFront = pgFrontRef.current;
      const oldBack = pgBackRef.current;
      pgFrontRef.current = p5.createGraphics(w, h);
      pgBackRef.current = p5.createGraphics(w, h);
      pgFrontRef.current.clear();
      pgBackRef.current.clear();

      if (oldFront) pgFrontRef.current.image(oldFront, 0, 0);
      if (oldBack) pgBackRef.current.image(oldBack, 0, 0);
      camRef.current = { x: 0, y: 0, zoom: 1.0 };
    };
  };

  // 🌟 松手结算
  const mouseReleased = (p5) => {
    if (isDrawingStrokeRef.current) {
      if (activeBrush === 'heavy' && heavyStrokePointsRef.current.length > 0) {
        const pts = heavyStrokePointsRef.current;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        let sumIntensity = 0;

        pts.forEach(pt => {
          if (pt.x < minX) minX = pt.x;
          if (pt.x > maxX) maxX = pt.x;
          if (pt.y < minY) minY = pt.y;
          if (pt.y > maxY) maxY = pt.y;
          sumIntensity += (pt.intensity || 0.5);
        });

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const spreadX = (maxX - minX) / 2;
        const spreadY = (maxY - minY) / 2;
        const rx = Math.max(26, spreadX + 14);
        const ry = Math.max(15, spreadY + 10);
        const avgIntensity = sumIntensity / pts.length;
        const paletteColor = PALETTES[activeColor]?.color || [211, 47, 47];

        const heavyParticle = new PainParticle(
          p5,
          centerX,
          centerY,
          'heavy',
          paletteColor,
          0,
          0,
          bodyMode,
          avgIntensity,
          { rx, ry }
        );

        if (dynamicParticles.current) {
          dynamicParticles.current.push(heavyParticle);
        }
        if (particlePositions.current) {
          particlePositions.current.push({ x: centerX, y: centerY, bodyMode });
        }

        if (brushCounts.current) {
          brushCounts.current['heavy'] = (brushCounts.current['heavy'] || 0) + 1;
        }

        heavyStrokePointsRef.current = [];
      }

      if (typeof saveSnapshot === 'function') {
        saveSnapshot();
      }
      isDrawingStrokeRef.current = false;
    }
  };

  const mouseWheel = useCallback((p5, event) => {
    if (!camRef.current) return false;
    camRef.current.zoom = Math.max(
      0.5,
      Math.min(camRef.current.zoom + (event.delta > 0 ? -0.1 : 0.1), 3.0)
    );
    return false;
  }, [camRef]);

  const handleDownload = () => {
    if (p5Ref.current && p5Ref.current.canvas) {
      const link = document.createElement('a');
      link.download = `painscape_${Date.now()}.png`;
      link.href = p5Ref.current.canvas.toDataURL('image/png');
      link.click();
    }
  };

  const calculateSpatialMap = useCallback((positions, bodyMode, canvasWidth, canvasHeight) => {
    const regions = {
      front: {
        head: { x: 0.5, y: 0.12, w: 0.3, h: 0.15 },
        upperAbdomen: { x: 0.5, y: 0.32, w: 0.4, h: 0.18 },
        lowerAbdomen: { x: 0.5, y: 0.52, w: 0.38, h: 0.2 },
        legs: { x: 0.5, y: 0.78, w: 0.3, h: 0.2 },
      },
      back: {
        head: { x: 0.5, y: 0.12, w: 0.3, h: 0.15 },
        upperBack: { x: 0.5, y: 0.32, w: 0.42, h: 0.18 },
        waist: { x: 0.5, y: 0.52, w: 0.4, h: 0.18 },
        sacrum: { x: 0.5, y: 0.72, w: 0.3, h: 0.15 },
        legs: { x: 0.5, y: 0.88, w: 0.3, h: 0.1 },
      }
    };

    if (!positions || positions.length === 0) {
      return { abdomen: 0, lowerBack: 0, upperBody: 0 };
    }

    const regionMap = regions[bodyMode] || regions.front;
    const canvasCenterX = canvasWidth / 2;
    const canvasCenterY = canvasHeight / 2;

    const normalizedPositions = positions.map(p => ({
      x: (p.x - canvasCenterX) / canvasWidth + 0.5,
      y: (p.y - canvasCenterY) / canvasHeight + 0.5,
    }));

    const counts = {};
    Object.keys(regionMap).forEach(key => { counts[key] = 0; });

    normalizedPositions.forEach(pos => {
      if (pos.x < 0 || pos.x > 1 || pos.y < 0 || pos.y > 1) return;
      for (const [key, region] of Object.entries(regionMap)) {
        const halfW = region.w / 2;
        const halfH = region.h / 2;
        if (pos.x >= region.x - halfW && pos.x <= region.x + halfW &&
          pos.y >= region.y - halfH && pos.y <= region.y + halfH) {
          counts[key] = (counts[key] || 0) + 1;
          break;
        }
      }
    });

    const total = positions.length || 1;
    const result = {};
    Object.keys(counts).forEach(key => {
      result[key] = counts[key] / total;
    });

    return {
      head: result.head || 0,
      upperAbdomen: result.upperAbdomen || 0,
      lowerAbdomen: result.lowerAbdomen || 0,
      legs: result.legs || 0,
      upperBack: result.upperBack || 0,
      waist: result.waist || 0,
      sacrum: result.sacrum || 0,
      abdomen: (result.upperAbdomen || 0) + (result.lowerAbdomen || 0),
      lowerBack: (result.waist || 0) + (result.sacrum || 0),
      upperBody: (result.upperBack || 0) + (result.head || 0),
    };
  }, []);

  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const keys = Object.keys(particleDwellTimeRef.current);
      for (const key of keys) {
        const data = particleDwellTimeRef.current[key];
        if (now - data.lastTime > 5000) {
          delete particleDwellTimeRef.current[key];
        }
      }
    }, 10000);
    return () => clearInterval(cleanupInterval);
  }, []);

  const prevParticleCountRef = useRef(0);

  const draw = (p5) => {
    try {
      if (prevBodyModeRef.current !== bodyMode) {
        const prevPg = prevBodyModeRef.current === 'back' ? pgBackRef.current : pgFrontRef.current;
        if (prevPg && typeof prevPg.clear === 'function') {
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

      const cam = camRef.current || { x: 0, y: 0, zoom: 1.0 };
      const zoom = Number.isFinite(cam.zoom) && cam.zoom > 0.1 ? cam.zoom : 1.0;
      const x = Number.isFinite(cam.x) ? cam.x : 0;
      const y = Number.isFinite(cam.y) ? cam.y : 0;

      const mouseX = Number.isFinite(p5.mouseX) ? p5.mouseX : 0;
      const mouseY = Number.isFinite(p5.mouseY) ? p5.mouseY : 0;
      const pmouseX = Number.isFinite(p5.pmouseX) ? p5.pmouseX : mouseX;
      const pmouseY = Number.isFinite(p5.pmouseY) ? p5.pmouseY : mouseY;

      const isInteracting =
        (p5.mouseIsPressed || (p5.touches && p5.touches.length > 0)) && isClickingCanvas;

      const realX = (mouseX - x) / zoom;
      const realY = (mouseY - y) / zoom;
      const realPx = (pmouseX - x) / zoom;
      const realPy = (pmouseY - y) / zoom;
      const speed = p5.dist(realX, realY, realPx, realPy);
      const heading = speed < 0.5 ? p5.PI / 2 : p5.atan2(realY - realPy, realX - realPx);
      
      let isPanning = false;
      if (activeBrush === null) isPanning = true;
      else if (p5.mouseButton === p5.RIGHT) isPanning = true;
      else if (p5.touches && p5.touches.length >= 2) isPanning = true;

      const currentPg = bodyMode === 'back' ? pgBackRef.current : pgFrontRef.current;

      if (isInteracting) {
        if (isPanning) {
          camRef.current.x += mouseX - pmouseX;
          camRef.current.y += mouseY - pmouseY;
        } else if (activeBrush === 'eraser') {
          if (currentPg && typeof currentPg.erase === 'function') {
            currentPg.erase();
            currentPg.ellipse(realX, realY, 40 / zoom, 40 / zoom);
            currentPg.noErase();
          }
          isDrawingStrokeRef.current = true;
          if (dynamicParticles.current) {
            dynamicParticles.current = dynamicParticles.current.filter(
              (p) => p.bodyMode !== bodyMode || p5.dist(p.pos.x, p.pos.y, realX, realY) > 25
            );
          }
        } else if (activeBrush !== null && activeBrush !== undefined) {
          isDrawingStrokeRef.current = true;

          let intensity = 0.5;
          let source = 'unknown';

          const pointerEvent = p5._curElement?.pointer || p5.touches?.[0];
          if (pointerEvent) {
            if (pointerEvent.pointerType === 'pen' && pointerEvent.pressure > 0 && pointerEvent.pressure !== 0.5) {
              intensity = pointerEvent.pressure;
              source = 'stylus_pressure';
            } else if (pointerEvent.width && pointerEvent.height && (pointerEvent.width > 0 || pointerEvent.height > 0)) {
              const diam = Math.max(pointerEvent.width, pointerEvent.height);
              intensity = Math.min(1.0, Math.max(0.2, 0.2 + (diam - 12) / (40 - 12) * 0.8));
              if (contactAreaHistory && contactAreaHistory.current) {
                contactAreaHistory.current.push(diam);
              }
              source = 'contact_area';
            }
          }

          if (source === 'unknown' || intensity === 0.5) {
            let speedFactor = 0.3 + (1 - Math.min(1, (Number.isFinite(speed) ? speed : 5) / 30)) * 0.5;
            intensity = Math.min(1.0, Math.max(0.2, speedFactor));
            source = 'velocity_proxy';
          }

          intensity = Math.max(0.2, Math.min(1.0, intensity));
          if (intensitySourceRef) intensitySourceRef.current = source;
          if (pressureHistory.current) {
            if (pressureHistory.current.length > 200) pressureHistory.current.shift();
            pressureHistory.current.push(intensity);
          }

          // 🌟 坠痛画笔：长按涂抹期间仅记录点迹，画面保持完全隐形
          if (activeBrush === 'heavy') {
            if (Number.isFinite(realX) && Number.isFinite(realY)) {
              heavyStrokePointsRef.current.push({ x: realX, y: realY, intensity });
            }
          } 
          // 其他画笔：正常生成粒子
          else {
            if (brushCounts.current) {
              brushCounts.current[activeBrush] = (brushCounts.current[activeBrush] || 0) + 1;
            }

            if (speedHistory.current) {
              if (speedHistory.current.length > 200) speedHistory.current.shift();
              speedHistory.current.push(Number.isFinite(speed) ? speed : 5.0);
            }

            const spawnRate = ['wave', 'twist'].includes(activeBrush) ? 6 : 2;
            if (p5.frameCount % spawnRate === 0 || speed > 10) {
              const paletteColor = PALETTES[activeColor]?.color || [211, 47, 47];

              if (Number.isFinite(realX) && Number.isFinite(realY)) {
                const pObj = new PainParticle(
                  p5,
                  realX,
                  realY,
                  activeBrush,
                  paletteColor,
                  Number.isFinite(speed) ? speed : 5.0,
                  heading,
                  bodyMode,
                  intensity
                );

                if (particlePositions.current) {
                  particlePositions.current.push({ x: realX, y: realY, bodyMode });
                }

                if (pObj.isDynamic) {
                  if (dynamicParticles.current) {
                    dynamicParticles.current.push(pObj);
                    if (dynamicParticles.current.length > 500) dynamicParticles.current.shift();
                  }
                } else {
                  if (staticParticles.current) {
                    staticParticles.current.push(pObj);
                  }
                }
              }
            }
          }

          try {
            playBrushSound(activeBrush);
          } catch (e) {
            // ignore
          }
        }
      }

      // 更新静态粒子
      if (staticParticles.current) {
        for (let i = staticParticles.current.length - 1; i >= 0; i--) {
          const p = staticParticles.current[i];
          if (p) {
            p.update(p5);
            const targetPg = p.bodyMode === 'back' ? pgBackRef.current : pgFrontRef.current;
            if (targetPg) {
              p.show(targetPg);
            }
            if (p.isDead()) staticParticles.current.splice(i, 1);
          }
        }
      }

      // 计算 spatialMap
      if (particlePositions.current) {
        const currentCount = particlePositions.current.length;
        if (currentCount > 0 && currentCount !== prevParticleCountRef.current) {
          prevParticleCountRef.current = currentCount;
          if (onSpatialMapUpdate) {
            const map = calculateSpatialMap(
              particlePositions.current,
              bodyMode,
              p5.width,
              p5.height
            );
            onSpatialMapUpdate(map);
          }
        }
        if (currentCount === 0 && prevParticleCountRef.current !== 0) {
          prevParticleCountRef.current = 0;
          if (onSpatialMapUpdate) {
            onSpatialMapUpdate({ abdomen: 0, lowerBack: 0, upperBody: 0 });
          }
        }
      }

      // 更新动态粒子
      if (dynamicParticles.current) {
        for (let i = dynamicParticles.current.length - 1; i >= 0; i--) {
          const dp = dynamicParticles.current[i];
          if (dp) {
            dp.update(p5);
            if (dp.isDead()) {
              dynamicParticles.current.splice(i, 1);
            }
          }
        }
      }

      // 绘制背景人体图
      if (bodyMode !== 'none') {
        const activeImg = bodyMode === 'front' ? bgFrontRef.current : bgBackRef.current;
        if (activeImg && activeImg.width > 0 && activeImg.height > 0 && Number.isFinite(activeImg.height)) {
          p5.push();
          p5.translate(x, y);
          p5.scale(zoom);
          p5.imageMode(p5.CENTER);
          p5.tint(255, 40);
          const currentBgScale = Number.isFinite(bgScale) && bgScale > 0 ? bgScale : 1.0;
          const imgScale = ((p5.height * 0.8) / activeImg.height) * currentBgScale;
          if (Number.isFinite(imgScale) && imgScale > 0) {
            p5.image(
              activeImg,
              p5.width / 2,
              p5.height / 2,
              activeImg.width * imgScale,
              activeImg.height * imgScale
            );
          }
          p5.pop();
        }
      }

      // 绘制离屏画布
      p5.push();
      p5.translate(x, y);
      p5.scale(zoom);
      p5.noTint();
      p5.imageMode(p5.CORNER);
      if (currentPg) {
        p5.image(currentPg, 0, 0);
      }
      p5.pop();

      // 绘制动态粒子（坠痛只在这里随其他动态粒子一起呈现）
      if (dynamicParticles.current && dynamicParticles.current.length > 0) {
        p5.push();
        p5.translate(x, y);
        p5.scale(zoom);
        for (let i = 0; i < dynamicParticles.current.length; i++) {
          const dp = dynamicParticles.current[i];
          if (dp && dp.bodyMode === bodyMode) {
            dp.show(p5);
          }
        }
        p5.pop();
      }
    } catch (renderError) {
      console.warn("⚠️ Canvas render loop recovered from exception:", renderError);
    }
  };

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
      {/* ===== p5.js Sketch ===== */}
      <div
        className="canvas-area"
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

      {/* ===== UI 控件 ===== */}
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
        {/* ===== 顶部导航栏 ===== */}
        <div
          className="top-bar-actions"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            background: 'rgba(10, 10, 10, 0.82)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            display: 'flex',
            flexDirection: 'column',
            padding: isSmallScreen ? '6px 10px' : '8px 14px',
            boxSizing: 'border-box',
            pointerEvents: 'auto',
            zIndex: 100,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              gap: isSmallScreen ? '6px' : '12px',
            }}
          >
            {/* 左侧：返回 + 静音 + 语言 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: isSmallScreen ? '4px' : '8px',
                flexShrink: 0,
              }}
            >
              <button
                onClick={onBack}
                style={{
                  height: isSmallScreen ? '30px' : '34px',
                  padding: isSmallScreen ? '0 8px' : '0 14px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: '#aaa',
                  fontSize: isSmallScreen ? '11px' : '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  transition: 'all 0.2s',
                  letterSpacing: '0.3px',
                  whiteSpace: 'nowrap',
                }}
              >
                ← {isSmallScreen ? '' : t('canvas.back') || '返回'}
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                style={{
                  width: isSmallScreen ? '30px' : '34px',
                  height: isSmallScreen ? '30px' : '34px',
                  minWidth: isSmallScreen ? '30px' : '34px',
                  minHeight: isSmallScreen ? '30px' : '34px',
                  borderRadius: '8px',
                  background: isMuted ? 'rgba(255,255,255,0.03)' : 'rgba(76,175,80,0.08)',
                  border: isMuted
                    ? '1px solid rgba(255,255,255,0.04)'
                    : '1px solid rgba(76,175,80,0.15)',
                  color: isMuted ? '#666' : '#81c784',
                  fontSize: isSmallScreen ? '14px' : '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
              >
                {isMuted ? '🔇' : '🔊'}
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); toggleLang(); }}
                style={{
                  height: isSmallScreen ? '28px' : '34px',
                  padding: isSmallScreen ? '0 6px' : '0 12px',
                  borderRadius: '6px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: '#aaa',
                  fontSize: isSmallScreen ? '10px' : '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.2s',
                  letterSpacing: '0.3px',
                  whiteSpace: 'nowrap',
                }}
              >
                {lang === 'zh' ? (isSmallScreen ? 'EN' : 'English') : (isSmallScreen ? '中' : '中文')}
              </button>
            </div>

            {/* 右侧：操作按钮 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: isSmallScreen ? '4px' : '8px',
                flexShrink: 0,
              }}
            >
              <button
                onClick={handleViewDraftBox}
                style={{
                  width: isSmallScreen ? '30px' : '34px',
                  height: isSmallScreen ? '30px' : '34px',
                  minWidth: isSmallScreen ? '30px' : '34px',
                  minHeight: isSmallScreen ? '30px' : '34px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: '#888',
                  fontSize: isSmallScreen ? '14px' : '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  transition: 'all 0.2s',
                }}
              >
                📋
                {draftCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-2px',
                      right: '-2px',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: '#ff9800',
                      color: '#000',
                      fontSize: '8px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {draftCount > 9 ? '9+' : draftCount}
                  </span>
                )}
              </button>

              <button
                onClick={handleSaveDraftOnly}
                style={{
                  height: isSmallScreen ? '28px' : '34px',
                  padding: isSmallScreen ? '0 6px' : '0 12px',
                  borderRadius: '6px',
                  background: 'rgba(255,152,0,0.08)',
                  border: '1px solid rgba(255,152,0,0.12)',
                  color: '#ffb74d',
                  fontSize: isSmallScreen ? '10px' : '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: isSmallScreen ? '0px' : '4px',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                }}
              >
                📝 {!isSmallScreen && (t('canvas.saveDraft') || '保存草稿')}
              </button>

              {!isSmallScreen && (
                <button
                  onClick={() => {
                    onSaveOnly();
                    setSaveSuccess(true);
                  }}
                  style={{
                    height: '34px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    background: 'rgba(76,175,80,0.06)',
                    border: '1px solid rgba(76,175,80,0.08)',
                    color: '#81c784',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s',
                  }}
                >
                  💾 {t('canvas.saveOnly') || '仅保存'}
                </button>
              )}

              <button
                onClick={onGenerate}
                style={{
                  height: isSmallScreen ? '32px' : '36px',
                  padding: isSmallScreen ? '0 12px' : '0 18px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #d32f2f, #c62828)',
                  border: 'none',
                  color: '#fff',
                  fontSize: isSmallScreen ? '12px' : '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: isSmallScreen ? '4px' : '6px',
                  boxShadow: '0 2px 10px rgba(211,47,47,0.25)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  letterSpacing: '0.3px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                ✨ {isSmallScreen ? '生成' : t('canvas.generate') || '生成报告'}
              </button>
            </div>
          </div>

          {/* 第二行：身体模式切换 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              marginTop: isSmallScreen ? '2px' : '4px',
              paddingTop: isSmallScreen ? '2px' : '4px',
              borderTop: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            <div
              style={{
                position: 'relative',
                display: 'flex',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: '8px',
                padding: '3px',
                border: '1px solid rgba(255,255,255,0.05)',
                width: '100%',
                maxWidth: '400px',
                height: isSmallScreen ? '34px' : '40px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '3px',
                  bottom: '3px',
                  left: `calc(${['front', 'back', 'none'].indexOf(bodyMode)} * (100% / ${appMode === 'general' ? 3 : 2}))`,
                  width: `calc(100% / ${appMode === 'general' ? 3 : 2} - 4px)`,
                  marginLeft: '2px',
                  borderRadius: '6px',
                  background: 'rgba(255,255,255,0.10)',
                  transition: 'left 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              />

              {[
                { key: 'front', label: t('canvas.bodyFront') || '正面' },
                { key: 'back', label: t('canvas.bodyBack') || '背面' },
                ...(appMode === 'general' ? [{ key: 'none', label: t('canvas.bodyNone') || '盲画' }] : [])
              ].map(({ key, label }) => {
                const isActive = bodyMode === key;
                const totalModes = appMode === 'general' ? 3 : 2;

                return (
                  <button
                    key={key}
                    style={{
                      flex: 1,
                      position: 'relative',
                      zIndex: 1,
                      padding: isSmallScreen ? '2px 0' : '4px 0',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: isSmallScreen ? '12px' : '13px',
                      fontWeight: isActive ? '600' : '400',
                      background: 'transparent',
                      color: isActive ? '#fff' : '#888',
                      minHeight: isSmallScreen ? '28px' : '32px',
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                      flex: `0 0 calc(100% / ${totalModes})`,
                    }}
                    onClick={(e) => { e.stopPropagation(); setBodyMode(key); }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 缩放调节 */}
        {bodyMode !== 'none' && (
          <div
            style={{
              position: 'absolute',
              top: isSmallScreen ? '100px' : '110px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(20,20,20,0.8)',
              backdropFilter: 'blur(8px)',
              padding: '4px 14px',
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.06)',
              pointerEvents: 'auto',
              zIndex: 50,
            }}
          >
            <span style={{ color: '#666', fontSize: '10px' }}>
              {t('canvas.scale') || '缩放'}
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
                width: '80px',
                height: '3px',
                cursor: 'pointer',
                margin: '0 4px',
              }}
            />
            <span style={{ color: '#aaa', fontSize: '10px', minWidth: '32px', textAlign: 'center' }}>
              {Math.round(bgScale * 100)}%
            </span>
          </div>
        )}

        {/* 方向提示 */}
        <div
          style={{
            position: 'absolute',
            top: '90px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.75)',
            padding: '6px 18px',
            borderRadius: 'var(--radius-lg)',
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

        {/* 右侧工具栏 */}
        <div
          className="side-tools"
          style={{
            position: 'absolute',
            right: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            pointerEvents: 'auto',
            zIndex: 50,
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <button
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(20,20,20,0.8)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#aaa',
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={(e) => { e.stopPropagation(); handleUndo(); }}
            title={t('canvas.undo') || '撤销'}
          >
            ↩️
          </button>
          <button
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(20,20,20,0.8)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#aaa',
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={(e) => { e.stopPropagation(); handleRedo(); }}
            title={t('canvas.redo') || '重做'}
          >
            ↪️
          </button>
          <button
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(20,20,20,0.8)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#aaa',
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={(e) => { e.stopPropagation(); handleClear(); }}
            title={t('canvas.clear') || '清除'}
          >
            🗑️
          </button>
          <button
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(20,20,20,0.8)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#aaa',
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={(e) => { e.stopPropagation(); resetView(); }}
            title={t('canvas.resetView') || '重置视角'}
          >
            🎯
          </button>
        </div>

        {/* ===== 底部居中工具栏（画笔 + 颜色） ===== */}
        <div
          className="brush-section"
          style={{
            position: 'absolute',
            bottom: 'max(20px, env(safe-area-inset-bottom))',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '92%',
            maxWidth: 'var(--container-sm)',
            background: 'rgba(20,20,20,0.92)',
            padding: '8px 14px',
            borderRadius: '24px',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            pointerEvents: 'auto',
            zIndex: 50,
          }}
        >
          <div
            className="brush-section-inner"
            style={{ display: 'flex', justifyContent: 'space-between', gap: '4px' }}
          >
            {Object.keys(BRUSHES).map((k) => (
              <button
                key={k}
                style={{
                  flex: 1,
                  background: activeBrush === k ? 'rgba(255,255,255,0.12)' : 'transparent',
                  border: activeBrush === k ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
                  color: activeBrush === k ? '#fff' : '#888',
                  padding: '6px 0',
                  borderRadius: '10px',
                  fontSize: '11px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => setActiveBrush(activeBrush === k ? null : k)}
              >
                {BRUSHES[k].isImage ? (
                  <img
                    src={BRUSHES[k].icon}
                    alt={BRUSHES[k].label}
                    style={{
                      width: '20px',
                      height: '20px',
                      marginBottom: '2px',
                      opacity: activeBrush === k ? 1 : 0.7,
                    }}
                  />
                ) : (
                  <span style={{ fontSize: '18px', marginBottom: '2px' }}>{BRUSHES[k].icon}</span>
                )}
                <span style={{ fontSize: '11px' }}>{t(`brushes.${k}.label`)}</span>
              </button>
            ))}
          </div>

          <div
            className="color-section"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', gap: '18px' }}>
              {Object.keys(PALETTES).map((k) => (
                <div
                  key={k}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: activeColor === k ? '2px solid #fff' : '1.5px solid #444',
                    background: `rgb(${PALETTES[k].color.join(',')})`,
                    cursor: 'pointer',
                    transform: activeColor === k ? 'scale(1.18)' : 'none',
                    transition: 'transform 0.15s ease',
                  }}
                  onClick={() => setActiveColor(k)}
                />
              ))}
            </div>
            <span
              style={{
                color: '#888',
                fontSize: 'var(--text-xs)',
                marginTop: '4px',
                textAlign: 'center',
                display: 'block',
              }}
            >
              <ColorDescription activeColor={activeColor} t={t} />
            </span>
          </div>
        </div>
      </div>

      {/* ===== 保存确认弹窗 ===== */}
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
              borderRadius: 'var(--radius-md)',
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
                  borderRadius: 'var(--radius-lg)',
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
                  borderRadius: 'var(--radius-lg)',
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

      {/* ===== 保存成功提示 ===== */}
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
              borderRadius: 'var(--radius-md)',
              padding: '24px',
              maxWidth: '300px',
              width: '85%',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>✅</div>
            <p style={{ color: '#fff', fontSize: 'var(--text-md)', fontWeight: 'bold', margin: '0 0 8px 0' }}>
              {t('canvas.saved')}
            </p>
            <p style={{ color: '#888', fontSize: '13px', margin: '0 0 20px 0', lineHeight: '1.5' }}>
              {t('canvas.savedHint')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                style={{
                  background: '#4caf50',
                  border: 'none',
                  color: '#fff',
                  padding: '10px',
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  width: '100%',
                }}
                onClick={handleDownload}
              >
                💾 {t('canvas.download')}
              </button>
              {onShareSaved && (
                <button
                  style={{
                    background: 'rgba(33,150,243,0.15)',
                    border: '1px solid #2196f3',
                    color: '#2196f3',
                    padding: '10px',
                    borderRadius: 'var(--radius-lg)',
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
              {onViewHistory && (
                <button
                  style={{
                    background: 'rgba(76,175,80,0.15)',
                    border: '1px solid #4caf50',
                    color: '#4caf50',
                    padding: '10px',
                    borderRadius: 'var(--radius-lg)',
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
              <button
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid #444',
                  color: '#ccc',
                  padding: '10px',
                  borderRadius: 'var(--radius-lg)',
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

      {/* ===== 草稿保存成功提示 ===== */}
      {showDraftSuccess && (
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
          onClick={() => setShowDraftSuccess(false)}
        >
          <div
            style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
              maxWidth: '320px',
              width: '85%',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>📝</div>
            <p style={{ color: '#fff', fontSize: 'var(--text-md)', fontWeight: 'bold', margin: '0 0 8px 0' }}>
              {t('canvas.draftSaved')}
            </p>
            <p style={{ color: '#888', fontSize: '13px', margin: '0 0 20px 0', lineHeight: '1.5' }}>
              {t('canvas.draftSavedHint')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                style={{
                  background: '#ff9800',
                  border: 'none',
                  color: '#fff',
                  padding: '10px',
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  width: '100%',
                }}
                onClick={() => {
                  setShowDraftSuccess(false);
                  if (onViewDraftBox) onViewDraftBox();
                }}
              >
                📋 {t('canvas.viewDraftBox')}
              </button>
              <button
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid #444',
                  color: '#ccc',
                  padding: '10px',
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  width: '100%',
                }}
                onClick={() => setShowDraftSuccess(false)}
              >
                {t('canvas.continueDrawing')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新手引导 */}
      {!guideLoading && showGuide && (
        <OnboardingGuide onClose={handleGuideClose} />
      )}

      {/* 画布功能引导 */}
      {!canvasGuideLoading && showCanvasGuide && !showGuide && (
        <CanvasGuide onComplete={handleCanvasGuideComplete} />
      )}
    </div>
  );
}