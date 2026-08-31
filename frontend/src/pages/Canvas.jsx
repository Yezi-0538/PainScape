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
  // 导航
  onBack,
  onGenerate,
  onSaveOnly,
  onViewHistory,
  onShareSaved,

  // spatialMap 回调
  onSpatialMapUpdate,

  // 画板状态
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
  contactAreaHistory,      // ✅ 新增
  intensitySourceRef,      // ✅ 新增

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
  showToast,
  draftCount = 0,
}) {

  const { t, lang, toggleLang } = useI18n();
  const { playBrushSound } = useAudio(isMuted);
  const [tipVisible, setTipVisible] = useState(true);

  const isDrawingStrokeRef = useRef(false);
  const mousePressedOnCanvasRef = useRef(false);
  const prevBodyModeRef = useRef(bodyMode);

  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const { userId, userInfo, setUserInfo } = useUser();

  // ===== 新手引导（OnboardingGuide）状态 =====
  const [showGuide, setShowGuide] = useState(false);
  const [guideLoading, setGuideLoading] = useState(true);

  // ===== 画布功能引导（CanvasGuide）状态 =====
  const [showCanvasGuide, setShowCanvasGuide] = useState(false);
  const [canvasGuideLoading, setCanvasGuideLoading] = useState(true);

  // ===== 保存草稿状态 =====
  const [showDraftSuccess, setShowDraftSuccess] = useState(false);

  // ===== ✅ 响应式：检测小屏设备 =====
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 480);

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 480);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ✅ 新增：追踪粒子驻留时间（用于模拟压感）
  const particleDwellTimeRef = useRef({});
  // ============================================================
  // 检查新手引导状态
  // ============================================================
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

  // ============================================================
  // 检查画布功能引导状态
  // ============================================================
  useEffect(() => {
    const hasSeen = localStorage.getItem('paintScape_canvas_guide_shown') === 'true';
    // 只在首次访问且新手引导已关闭或不存在时显示
    if (!hasSeen && !showGuide) {
      setShowCanvasGuide(true);
    }
    setCanvasGuideLoading(false);
  }, [showGuide]);

  // ============================================================
  // 新手引导完成
  // ============================================================
  const handleGuideClose = async () => {
    setShowGuide(false);
    localStorage.setItem('paintScape_guide_seen', 'true');

    if (userId) {
      try {
        await setUserInfo({ hasSeenGuide: true });
        console.log('✅ 引导状态已同步到云端');
      } catch (err) {
        console.warn('更新引导状态失败:', err);
      }
    }
  };

  // ============================================================
  // 画布功能引导完成
  // ============================================================
  const handleCanvasGuideComplete = () => {
    setShowCanvasGuide(false);
    localStorage.setItem('paintScape_canvas_guide_shown', 'true');
  };

  // ============================================================
  // 方向提示自动消失
  // ============================================================
  useEffect(() => {
    setTipVisible(true);
    const timer = setTimeout(() => setTipVisible(false), 1500);
    return () => clearTimeout(timer);
  }, [bodyMode]);

  // ============================================================
  // 保存草稿处理函数
  // ============================================================
  const handleSaveDraftOnly = useCallback(async () => {
    const draftData = {
      brushCounts: { ...(brushCounts?.current || {}) },
      particlePositions: [...(particlePositions?.current || [])],
      speedHistory: [...(speedHistory?.current || [])],
      pressureHistory: [...(pressureHistory?.current || [])],
      contactAreaHistory: [...(contactAreaHistory?.current || [])],  // ✅ 新增
      intensitySource: intensitySourceRef?.current || 'unknown',      // ✅ 新增
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

  // ============================================================
  // 查看草稿箱
  // ============================================================
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
      onViewDraftBox();  // ✅ 不传参，由父组件管理页面栈
    }
  }, [onViewDraftBox]);

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
  const bgScaleRef = useRef(null);
  const setup = (p5, canvasParentRef) => {
    p5Ref.current = p5;

    // ✅ 设置像素密度为 1，防止高 DPI 屏幕缩放问题
    p5.pixelDensity(1);

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

    // ✅ 添加窗口大小变化响应
    p5.windowResized = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      p5.resizeCanvas(w, h);

      // 重建离屏画布以匹配新尺寸，并保留旧内容
      const oldFront = pgFrontRef.current;
      const oldBack = pgBackRef.current;

      pgFrontRef.current = p5.createGraphics(w, h);
      pgBackRef.current = p5.createGraphics(w, h);
      pgFrontRef.current.clear();
      pgBackRef.current.clear();

      if (oldFront) {
        pgFrontRef.current.image(oldFront, 0, 0);
      }
      if (oldBack) {
        pgBackRef.current.image(oldBack, 0, 0);
      }

      // 重置相机位置，避免偏移
      camRef.current = { x: 0, y: 0, zoom: 1.0 };
    };
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
    if (!camRef.current) return false;
    camRef.current.zoom = Math.max(
      0.5,
      Math.min(camRef.current.zoom + (event.delta > 0 ? -0.1 : 0.1), 3.0)
    );
    return false;
  }, [camRef]);
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
  // ============================================================
  // spatialMap 计算函数
  // ============================================================
  const calculateSpatialMap = useCallback((positions, bodyMode, canvasWidth, canvasHeight) => {
    // 身体分区定义（基于身体图像的比例）
    const regions = {
      // 正面
      front: {
        head: { x: 0.5, y: 0.12, w: 0.3, h: 0.15 },
        upperAbdomen: { x: 0.5, y: 0.32, w: 0.4, h: 0.18 },
        lowerAbdomen: { x: 0.5, y: 0.52, w: 0.38, h: 0.2 },
        legs: { x: 0.5, y: 0.78, w: 0.3, h: 0.2 },
      },
      // 背面
      back: {
        head: { x: 0.5, y: 0.12, w: 0.3, h: 0.15 },
        upperBack: { x: 0.5, y: 0.32, w: 0.42, h: 0.18 },
        waist: { x: 0.5, y: 0.52, w: 0.4, h: 0.18 },
        sacrum: { x: 0.5, y: 0.72, w: 0.3, h: 0.15 },
        legs: { x: 0.5, y: 0.88, w: 0.3, h: 0.1 },
      }
    };

    // 如果 positions 为空，返回空对象
    if (!positions || positions.length === 0) {
      return { abdomen: 0, lowerBack: 0, upperBody: 0 };
    }

    const regionMap = regions[bodyMode] || regions.front;
    const canvasCenterX = canvasWidth / 2;
    const canvasCenterY = canvasHeight / 2;

    // 归一化位置
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

    // 转换为前端需要的格式（兼容旧字段）
    return {
      head: result.head || 0,
      upperAbdomen: result.upperAbdomen || 0,
      lowerAbdomen: result.lowerAbdomen || 0,
      legs: result.legs || 0,
      upperBack: result.upperBack || 0,
      waist: result.waist || 0,
      sacrum: result.sacrum || 0,
      // 兼容旧字段
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
        // 如果超过 5 秒没有更新，清除该网格数据
        if (now - data.lastTime > 5000) {
          delete particleDwellTimeRef.current[key];
        }
      }
    }, 10000);

    return () => clearInterval(cleanupInterval);
  }, []);

  // ============================================================
  // 用 ref 追踪粒子数量变化，避免每帧都触发更新
  // ============================================================
  const prevParticleCountRef = useRef(0);
  const draw = (p5) => {
    try {
      // 【修复3】切换 bodyMode 时清除对侧离屏画布
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

      // ✅ 严格防 NaN 坐标系保障
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
      const heading = speed < 1 ? p5.PI / 2 : p5.atan2(realY - realPy, realX - realPx);
      let isPanning = false;
      if (activeBrush === null) isPanning = true;
      else if (p5.mouseButton === p5.RIGHT) isPanning = true;
      else if (p5.touches && p5.touches.length >= 2) isPanning = true;

      const currentPg = bodyMode === 'back' ? pgBackRef.current : pgFrontRef.current;

      // ===== 交互绘制 =====
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
              (p) => p.bodyMode !== bodyMode || p5.dist(p.pos.x, p.pos.y, realX, realY) > 20
            );
          }
        } else if (activeBrush !== null && activeBrush !== undefined) {
          isDrawingStrokeRef.current = true;
          if (brushCounts.current) {
            brushCounts.current[activeBrush] = (brushCounts.current[activeBrush] || 0) + 1;
          }

          if (speedHistory.current) {
            if (speedHistory.current.length > 200) speedHistory.current.shift();
            speedHistory.current.push(Number.isFinite(speed) ? speed : 5.0);
          }

          const spawnRate = ['wave', 'twist', 'heavy'].includes(activeBrush) ? 6 : 2;
          if (p5.frameCount % spawnRate === 0 || speed > 10) {

            let intensity = 0.5;
            let source = 'unknown';

            // 获取原生 PointerEvent（如果有）
            const pointerEvent = p5._curElement?.pointer || p5.touches?.[0];

            if (pointerEvent) {
              // 优先级1：手写笔 - 真实压感
              if (pointerEvent.pointerType === 'pen' && pointerEvent.pressure > 0 && pointerEvent.pressure !== 0.5) {
                intensity = pointerEvent.pressure;
                source = 'stylus_pressure';
              }
              // 优先级2：手指 - 接触面积
              else if (pointerEvent.width && pointerEvent.height && (pointerEvent.width > 0 || pointerEvent.height > 0)) {
                const diam = Math.max(pointerEvent.width, pointerEvent.height);
                // 参考直径 12px → 0.2，40px 封顶 → 1.0
                intensity = Math.min(1.0, Math.max(0.2, 0.2 + (diam - 12) / (40 - 12) * 0.8));
                if (contactAreaHistory && contactAreaHistory.current) {
                  contactAreaHistory.current.push(diam);
                }
                source = 'contact_area';
              }
            }

            // 优先级3：兜底 - 速度 + 驻留时间模拟
            if (source === 'unknown' || intensity === 0.5) {
              // 2a. 速度因素：速度越慢，压力越大
              let speedFactor = 0.3 + (1 - Math.min(1, (Number.isFinite(speed) ? speed : 5) / 30)) * 0.5;

              // 2b. 驻留时间因素：在同一区域停留越久，压力越大
              const gridSize = 20;
              const gridX = Math.floor(realX / gridSize);
              const gridY = Math.floor(realY / gridSize);
              const gridKey = `${gridX},${gridY}`;

              if (!particleDwellTimeRef.current[gridKey]) {
                particleDwellTimeRef.current[gridKey] = {
                  startTime: Date.now(),
                  lastTime: Date.now(),
                  count: 0
                };
              }

              const dwellData = particleDwellTimeRef.current[gridKey];
              dwellData.count += 1;
              dwellData.lastTime = Date.now();

              let dwellFactor = 0;
              if (dwellData.count > 5) {
                dwellFactor = Math.min(0.3, (dwellData.count - 5) * 0.005);
              }

              if (speed > 40) {
                intensity = 0.3;
              } else {
                intensity = Math.min(1.0, Math.max(0.2, speedFactor + dwellFactor));
              }

              // 笔触数量加成
              const totalStrokes = Object.values(brushCounts.current || {}).reduce((a, b) => a + b, 0);
              if (totalStrokes > 20) {
                const strokeBonus = Math.min(0.15, totalStrokes * 0.001);
                intensity = Math.min(1.0, intensity + strokeBonus);
              }

              // 如果 intensity 仍为 0.5，用速度简单推算
              if (intensity === 0.5 && speed > 0) {
                intensity = Math.min(1.0, 0.3 + speed / 100);
              }

              source = 'velocity_proxy';
            }

            // 确保在合理范围内
            intensity = Math.max(0.2, Math.min(1.0, intensity));

            // 记录来源
            if (intensitySourceRef) intensitySourceRef.current = source;

            // 继续 push 到 pressureHistory
            if (pressureHistory.current) {
              if (pressureHistory.current.length > 200) pressureHistory.current.shift();
              pressureHistory.current.push(intensity);
            }

            // ✅ 严格色彩兜底
            const paletteColor = PALETTES[activeColor]?.color || [211, 47, 47];

            if (Number.isFinite(realX) && Number.isFinite(realY)) {
              const pObj = new PainParticle(
                p5,
                realX,
                realY,
                activeBrush,
                paletteColor,
                Number.isFinite(speed) ? speed : 5.0,
                Number.isFinite(heading) ? heading : p5.PI / 2,
                bodyMode,
                intensity,
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
          try {
            playBrushSound(activeBrush);
          } catch (e) {
            // ignore audio play errors
          }
        }
      }

      // ===== 更新静态粒子到离屏画布 =====
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

      // ===== 计算 spatialMap（粒子更新后） =====
      if (particlePositions.current) {
        const currentCount = particlePositions.current.length;
        // 只在粒子数量变化时更新（避免每帧都触发）
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
        // 如果粒子被清空（数量变为0），也要更新
        if (currentCount === 0 && prevParticleCountRef.current !== 0) {
          prevParticleCountRef.current = 0;
          if (onSpatialMapUpdate) {
            onSpatialMapUpdate({ abdomen: 0, lowerBack: 0, upperBody: 0 });
          }
        }
      }

      // ===== 【核心修复】动态粒子只更新，不绘制到离屏画布 =====
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

      // ===== 绘制背景图（✅ 防除以 0 / Infinity 异常） =====
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
        className="canvas-area"  // ✅ 添加 class 供 CanvasGuide 定位
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

        {/* ===== 顶部导航栏 - 两行排列 ===== */}
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
          {/* ===== 第一行：返回 + 静音 + 语言 | 操作按钮 ===== */}
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
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.color = '#aaa';
                }}
                title={t('canvas.backToOnboarding') || '返回'}
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
                title={isMuted ? t('canvas.unmute') || '取消静音' : t('canvas.mute') || '静音'}
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
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.color = '#aaa';
                }}
                title={t('canvas.switchLang') || '切换语言'}
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
              {/* 草稿箱 - 只显示图标 */}
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
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.color = '#888';
                }}
                title={t('canvas.draftBox') || '草稿箱'}
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
                      boxShadow: '0 2px 6px rgba(255,152,0,0.3)',
                    }}
                  >
                    {draftCount > 9 ? '9+' : draftCount}
                  </span>
                )}
              </button>

              {/* 保存草稿 - 小屏只显示图标 */}
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
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,152,0,0.16)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,152,0,0.08)';
                }}
                title={t('canvas.saveDraftHint') || '保存草稿，稍后继续编辑'}
              >
                📝 {!isSmallScreen && (t('canvas.saveDraft') || '保存草稿')}
              </button>

              {/* 仅保存 - 小屏隐藏 */}
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
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(76,175,80,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(76,175,80,0.06)';
                  }}
                  title={t('canvas.saveOnlyHint') || '仅保存绘画图片'}
                >
                  💾 {t('canvas.saveOnly') || '仅保存'}
                </button>
              )}

              {/* 生成按钮 */}
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
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(211,47,47,0.35)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 10px rgba(211,47,47,0.25)';
                }}
                title={t('canvas.generateHint') || '生成疼痛报告'}
              >
                ✨ {isSmallScreen ? '生成' : t('canvas.generate') || '生成报告'}
              </button>
            </div>
          </div>

          {/* ===== 第二行：身体模式切换 - 紧凑型 + 滑动动画 ===== */}
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
              {/* 滑动背景指示器 */}
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
                  boxShadow: '0 0 20px rgba(255,255,255,0.03)',
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
                      transition: 'color 0.3s ease',
                      minHeight: isSmallScreen ? '28px' : '32px',
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                      letterSpacing: '0.3px',
                      flex: `0 0 calc(100% / ${totalModes})`,
                    }}
                    onClick={(e) => { e.stopPropagation(); setBodyMode(key); }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = '#ccc';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = '#888';
                      }
                    }}
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
              boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
            }}
          >
            <span style={{ color: '#666', fontSize: '10px', fontWeight: '400' }}>
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
          className="side-tools"  // ✅ 添加 class 供 CanvasGuide 定位
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
              transition: 'all 0.2s',
            }}
            onClick={(e) => { e.stopPropagation(); handleUndo(); }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(20,20,20,0.8)'; e.currentTarget.style.color = '#aaa'; }}
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
              transition: 'all 0.2s',
            }}
            onClick={(e) => { e.stopPropagation(); handleRedo(); }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(20,20,20,0.8)'; e.currentTarget.style.color = '#aaa'; }}
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
              transition: 'all 0.2s',
            }}
            onClick={(e) => { e.stopPropagation(); handleClear(); }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(20,20,20,0.8)'; e.currentTarget.style.color = '#aaa'; }}
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
              transition: 'all 0.2s',
            }}
            onClick={(e) => { e.stopPropagation(); resetView(); }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(20,20,20,0.8)'; e.currentTarget.style.color = '#aaa'; }}
            title={t('canvas.resetView') || '重置视角'}
          >
            🎯
          </button>
        </div>

        {/* 底部工具栏 */}
        <div
          className="brush-section"  // ✅ 添加 class 供 CanvasGuide 定位
          style={{
            position: 'absolute',
            bottom: 'max(20px, env(safe-area-inset-bottom))',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '92%',
            background: 'rgba(20,20,20,0.95)',
            maxWidth: 'var(--container-sm)',
            padding: 'var(--space-md) var(--space-lg)',
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
          <div
            className="brush-section-inner"  // ✅ 添加 class
            style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}
          >
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
          <div
            className="color-section"  // ✅ 添加 class 供 CanvasGuide 定位
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
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
                fontSize: 'var(--text-xs)',
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

      {/* ===== 确认弹窗 ===== */}
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
              {/* 下载到本地 */}
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
              {/* 分享 */}
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
              {/* 查看历史记录 */}
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
              {/* 继续绘画 */}
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

      {/* ===== 新手引导（OnboardingGuide） ===== */}
      {!guideLoading && showGuide && (
        <OnboardingGuide onClose={handleGuideClose} />
      )}

      {/* ===== 画布功能引导（CanvasGuide） ===== */}
      {!canvasGuideLoading && showCanvasGuide && !showGuide && (
        <CanvasGuide onComplete={handleCanvasGuideComplete} />
      )}
    </div>
  );
}