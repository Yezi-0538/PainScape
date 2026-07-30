// src/hooks/useParticle.js
import { useRef, useCallback } from 'react';
import { PainParticle } from '../components/PainParticle';

export const useParticle = () => {
  const particlePositions = useRef([]);
  const speedHistory = useRef([]);
  const pressureHistory = useRef([]);
  const brushCounts = useRef({ twist: 0, pierce: 0, heavy: 0, wave: 0, scrape: 0 });
  const staticParticles = useRef([]);
  const dynamicParticles = useRef([]);

  /**
   * 添加粒子
   */
  const addParticle = useCallback((p5, x, y, type, color, heading, bodyMode, pressure = 0.5) => {
    brushCounts.current[type] = (brushCounts.current[type] || 0) + 1;

    const pObj = new PainParticle(p5, x, y, type, color, heading, bodyMode, pressure);

    particlePositions.current.push({ x, y, bodyMode });

    if (pObj.isDynamic) {
      dynamicParticles.current.push(pObj);
      if (dynamicParticles.current.length > 500) dynamicParticles.current.shift();
    } else {
      staticParticles.current.push(pObj);
    }

    return pObj;
  }, []);

  /**
   * 更新所有粒子
   */
  const updateParticles = useCallback((p5) => {
    // 更新静态粒子
    for (let i = staticParticles.current.length - 1; i >= 0; i--) {
      const p = staticParticles.current[i];
      p.update(p5);
      if (p.isDead()) staticParticles.current.splice(i, 1);
    }

    // 更新动态粒子
    for (let i = dynamicParticles.current.length - 1; i >= 0; i--) {
      const p = dynamicParticles.current[i];
      p.update(p5);
      if (p.isDead()) dynamicParticles.current.splice(i, 1);
    }
  }, []);

  /**
   * 清空所有粒子
   */
  const clearParticles = useCallback(() => {
    staticParticles.current = [];
    dynamicParticles.current = [];
    particlePositions.current = [];
    speedHistory.current = [];
    pressureHistory.current = [];
    brushCounts.current = { twist: 0, pierce: 0, heavy: 0, wave: 0, scrape: 0 };
  }, []);

  /**
   * 获取主导痛感
   */
  const getDominantPain = useCallback(() => {
    const counts = brushCounts.current;
    const maxVal = Math.max(...Object.values(counts));
    return maxVal > 0 ? Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b) : 'twist';
  }, []);

  /**
   * 计算痛感强度
   */
  const calculateIntensity = useCallback(() => {
    const speeds = speedHistory.current;
    const pressures = pressureHistory.current;
    if (speeds.length === 0 && pressures.length === 0) return null;
    const avg = speeds.length > 0 ? speeds.reduce((s, v) => s + v, 0) / speeds.length : 0;
    const peak = speeds.length > 0 ? Math.max(...speeds) : 0;
    const avgPressure = pressures.length > 0
      ? pressures.reduce((s, v) => s + v, 0) / pressures.length
      : 0.5;
    return {
      avgSpeed: parseFloat(avg.toFixed(1)),
      peakSpeed: parseFloat(peak.toFixed(1)),
      avgPressure: parseFloat(avgPressure.toFixed(2)),
    };
  }, []);

  /**
   * 计算空间分布
   */
  const calculateSpatialMap = useCallback((bodyMode, canvasHeight) => {
    if (bodyMode === 'none') return null;
    const positions = particlePositions.current;
    if (positions.length === 0) return null;

    let upper = 0, middle = 0, lower = 0;
    positions.forEach(p => {
      if (p.bodyMode !== bodyMode) return;
      const ratio = p.y / canvasHeight;
      if (ratio < 0.35) upper++;
      else if (ratio < 0.65) middle++;
      else lower++;
    });

    const total = upper + middle + lower;
    if (total === 0) return null;

    return {
      abdomen: parseFloat((middle / total).toFixed(2)),
      lowerBack: parseFloat((lower / total).toFixed(2)),
      upperBody: parseFloat((upper / total).toFixed(2)),
    };
  }, []);

  /**
   * 计算时间节律
   */
  const calculateTimeRhythm = useCallback(() => {
    const particles = dynamicParticles.current;
    if (particles.length === 0) return null;

    let morning = 0, afternoon = 0, night = 0;
    particles.forEach(p => {
      if (p.minuteOfDay < 720) morning++;
      else if (p.minuteOfDay < 1080) afternoon++;
      else night++;
    });

    const total = morning + afternoon + night;
    if (total === 0) return null;

    return {
      morning: parseFloat((morning / total).toFixed(2)),
      afternoon: parseFloat((afternoon / total).toFixed(2)),
      night: parseFloat((night / total).toFixed(2)),
      dominantPeriod: morning >= afternoon && morning >= night ? 'morning'
        : afternoon >= morning && afternoon >= night ? 'afternoon'
        : 'night',
    };
  }, []);

  /**
   * 获取速度历史（用于计算）
   */
  const getSpeedHistory = useCallback(() => speedHistory.current, []);
  
  const addSpeed = useCallback((speed) => {
    if (speedHistory.current.length > 200) speedHistory.current.shift();
    speedHistory.current.push(speed);
  }, []);

  const addPressure = useCallback((pressure) => {
    if (pressureHistory.current.length > 200) pressureHistory.current.shift();
    pressureHistory.current.push(pressure);
  }, []);

  const getParticlePositions = useCallback(() => particlePositions.current, []);

  const getDynamicParticles = useCallback(() => dynamicParticles.current, []);

  const getStaticParticles = useCallback(() => staticParticles.current, []);

  const getBrushCounts = useCallback(() => brushCounts.current, []);

  return {
    // 数据
    particlePositions,
    speedHistory,
    pressureHistory,
    brushCounts,
    staticParticles,
    dynamicParticles,

    // 操作方法
    addParticle,
    updateParticles,
    clearParticles,
    addSpeed,
    addPressure,

    // 计算函数
    getDominantPain,
    calculateIntensity,
    calculateSpatialMap,
    calculateTimeRhythm,
    getSpeedHistory,
    getParticlePositions,
    getDynamicParticles,
    getStaticParticles,
    getBrushCounts,
  };
};