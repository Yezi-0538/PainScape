// src/hooks/useAudio.js
import { useRef, useState, useCallback, useEffect } from 'react';

// ============================================================
// 1. 全局单例 AudioContext 与 预生成白噪音缓冲池
// ============================================================
let globalAudioCtx = null;
let globalNoiseBuffer = null;

const getAudioContext = () => {
  if (!globalAudioCtx && typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      globalAudioCtx = new AudioContextClass();
    }
  }
  return globalAudioCtx;
};

// 预先生成一个 2 秒的白噪音 Buffer，全局复用，杜绝每帧生成几万个随机数的卡顿
const getNoiseBuffer = (ctx) => {
  if (!globalNoiseBuffer && ctx) {
    const bufferSize = ctx.sampleRate * 2.0; // 2秒
    globalNoiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = globalNoiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }
  return globalNoiseBuffer;
};

// 🌟 全局手势预解锁：在用户首次点击/触摸屏幕时，立即唤醒 AudioContext
if (typeof window !== 'undefined') {
  const unlockAudioContext = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => {
        console.log('🔊 [WebAudio] 上下文已成功被手势激活解锁');
      }).catch((err) => {
        console.warn('⚠️ [WebAudio] 激活失败:', err);
      });
    }
    // 解锁后移除监听器
    window.removeEventListener('pointerdown', unlockAudioContext);
    window.removeEventListener('touchstart', unlockAudioContext);
    window.removeEventListener('mousedown', unlockAudioContext);
  };

  window.addEventListener('pointerdown', unlockAudioContext, { passive: true });
  window.addEventListener('touchstart', unlockAudioContext, { passive: true });
  window.addEventListener('mousedown', unlockAudioContext, { passive: true });
}

// ============================================================
// 2. 主 Hook
// ============================================================
export const useAudio = (externalIsMuted) => {
  const [internalIsMuted, setInternalIsMuted] = useState(false);
  const isMuted = externalIsMuted !== undefined ? externalIsMuted : internalIsMuted;
  
  const isMutedRef = useRef(isMuted);
  const lastPlayTimeRef = useRef(0); // 节流控制

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  /**
   * 播放画笔音效
   * @param {string} type - 画笔类型: 'pierce' | 'heavy' | 'twist' | 'wave' | 'scrape' | 'eraser'
   */
  const playBrushSound = useCallback((type) => {
    if (isMutedRef.current) return;

    // 🌟 节流机制：两次画笔音效触发间隔至少 75ms，防止 60fps 爆音与通道耗尽
    const nowTimestamp = Date.now();
    if (nowTimestamp - lastPlayTimeRef.current < 75) {
      return;
    }
    lastPlayTimeRef.current = nowTimestamp;

    const ctx = getAudioContext();
    if (!ctx) return;

    // 如果状态仍为挂起，尝试唤醒
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;
      const noiseBuf = getNoiseBuffer(ctx);
      const SMOOTH_RELEASE_TIME = 0.8;
      const MAX_VOLUME = 0.1;

      switch (type) {
        // ===== 1. 刺痛 (pierce) =====
        case 'pierce': {
          const osc = ctx.createOscillator();
          const noise = ctx.createBufferSource();
          const oscGain = ctx.createGain();
          const noiseGain = ctx.createGain();
          const noiseFilter = ctx.createBiquadFilter();

          const duration = 0.08;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(260, now);
          osc.frequency.exponentialRampToValueAtTime(60, now + duration);

          noise.buffer = noiseBuf;
          noiseFilter.type = 'bandpass';
          noiseFilter.frequency.setValueAtTime(500, now);
          noiseFilter.Q.setValueAtTime(3.0, now);

          oscGain.gain.setValueAtTime(0.07, now);
          oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

          noiseGain.gain.setValueAtTime(0.04, now);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.5);

          osc.connect(oscGain);
          noise.connect(noiseFilter);
          noiseFilter.connect(noiseGain);
          oscGain.connect(ctx.destination);
          noiseGain.connect(ctx.destination);

          osc.start(now);
          noise.start(now);
          osc.stop(now + duration);
          noise.stop(now + duration);
          break;
        }

        // ===== 2. 坠胀重压 (heavy) =====
        case 'heavy': {
          const osc = ctx.createOscillator();
          const noise = ctx.createBufferSource();
          const oscGain = ctx.createGain();
          const noiseGain = ctx.createGain();
          const oscFilter = ctx.createBiquadFilter();
          const noiseFilter = ctx.createBiquadFilter();

          const duration = 0.8;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(120, now);
          osc.frequency.exponentialRampToValueAtTime(60, now + 0.06);

          oscFilter.type = 'lowpass';
          oscFilter.frequency.setValueAtTime(150, now);

          noise.buffer = noiseBuf;
          noiseFilter.type = 'lowpass';
          noiseFilter.frequency.setValueAtTime(90, now);

          oscGain.gain.setValueAtTime(0.001, now);
          oscGain.gain.linearRampToValueAtTime(MAX_VOLUME * 0.95, now + 0.025);
          oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

          noiseGain.gain.setValueAtTime(0.001, now);
          noiseGain.gain.linearRampToValueAtTime(MAX_VOLUME * 0.5, now + 0.025);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

          osc.connect(oscFilter);
          oscFilter.connect(oscGain);
          noise.connect(noiseFilter);
          noiseFilter.connect(noiseGain);
          oscGain.connect(ctx.destination);
          noiseGain.connect(ctx.destination);

          osc.start(now);
          noise.start(now);
          osc.stop(now + duration);
          noise.stop(now + duration);
          break;
        }

        // ===== 3. 绞痛 (twist) =====
        case 'twist': {
          const osc = ctx.createOscillator();
          const lfo = ctx.createOscillator();
          const lfoGain = ctx.createGain();
          const mainGain = ctx.createGain();

          const duration = 0.45;

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(80, now);

          lfo.type = 'sine';
          lfo.frequency.setValueAtTime(13, now);
          lfoGain.gain.setValueAtTime(25, now);

          mainGain.gain.setValueAtTime(0.001, now);
          mainGain.gain.linearRampToValueAtTime(0.05, now + duration * 0.35);
          mainGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

          lfo.connect(lfoGain);
          lfoGain.connect(osc.frequency);
          osc.connect(mainGain);
          mainGain.connect(ctx.destination);

          lfo.start(now);
          osc.start(now);
          lfo.stop(now + duration);
          osc.stop(now + duration);
          break;
        }

        // ===== 4. 弥漫酸胀痛 (wave) =====
        case 'wave': {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const noise = ctx.createBufferSource();
          const filter1 = ctx.createBiquadFilter();
          const filter2 = ctx.createBiquadFilter();
          const noiseFilter = ctx.createBiquadFilter();
          const mainGain = ctx.createGain();
          const noiseGain = ctx.createGain();

          const duration = 1.5;

          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(120, now);
          osc1.frequency.linearRampToValueAtTime(135, now + duration * 0.5);
          osc1.frequency.linearRampToValueAtTime(115, now + duration);

          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(121.5, now);
          osc2.frequency.linearRampToValueAtTime(136.5, now + duration * 0.5);
          osc2.frequency.linearRampToValueAtTime(116.5, now + duration);

          noise.buffer = noiseBuf;
          filter1.type = 'lowpass';
          filter1.frequency.setValueAtTime(400, now);

          noiseFilter.type = 'bandpass';
          noiseFilter.frequency.setValueAtTime(140, now);
          noiseFilter.frequency.exponentialRampToValueAtTime(360, now + duration * 0.45);
          noiseFilter.frequency.exponentialRampToValueAtTime(120, now + duration);

          mainGain.gain.setValueAtTime(0.001, now);
          mainGain.gain.linearRampToValueAtTime(MAX_VOLUME * 0.7, now + duration * 0.45);
          mainGain.gain.linearRampToValueAtTime(MAX_VOLUME * 0.3, now + duration * 0.75);
          mainGain.gain.exponentialRampToValueAtTime(0.001, now + SMOOTH_RELEASE_TIME);

          noiseGain.gain.setValueAtTime(0.001, now);
          noiseGain.gain.linearRampToValueAtTime(MAX_VOLUME * 0.4, now + duration * 0.45);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, now + SMOOTH_RELEASE_TIME);

          osc1.connect(filter1);
          osc2.connect(filter2);
          filter1.connect(mainGain);
          filter2.connect(mainGain);
          noise.connect(noiseFilter);
          noiseFilter.connect(noiseGain);
          mainGain.connect(ctx.destination);
          noiseGain.connect(ctx.destination);

          osc1.start(now);
          osc2.start(now);
          noise.start(now);
          osc1.stop(now + duration);
          osc2.stop(now + duration);
          noise.stop(now + duration);
          break;
        }

        // ===== 5. 撕裂刮痛 (scrape) =====
        case 'scrape': {
          const noise = ctx.createBufferSource();
          const noiseFilter = ctx.createBiquadFilter();
          const mainGain = ctx.createGain();
          const duration = 0.28;

          noise.buffer = noiseBuf;
          noiseFilter.type = 'bandpass';
          noiseFilter.frequency.setValueAtTime(180, now);
          noiseFilter.frequency.exponentialRampToValueAtTime(480, now + duration);
          noiseFilter.Q.setValueAtTime(1.8, now);

          mainGain.gain.setValueAtTime(0.05, now);
          mainGain.gain.linearRampToValueAtTime(0.03, now + duration * 0.4);
          mainGain.gain.linearRampToValueAtTime(0.045, now + duration * 0.7);
          mainGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

          noise.connect(noiseFilter);
          noiseFilter.connect(mainGain);
          mainGain.connect(ctx.destination);

          noise.start(now);
          noise.stop(now + duration);
          break;
        }

        // ===== 6. 橡皮擦 (eraser) =====
        case 'eraser': {
          const osc = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const mainGain = ctx.createGain();
          const duration = 0.5;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(330, now);
          osc.frequency.exponentialRampToValueAtTime(440, now + duration);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(600, now);
          filter.frequency.exponentialRampToValueAtTime(200, now + duration);

          mainGain.gain.setValueAtTime(0.04, now);
          mainGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

          osc.connect(filter);
          filter.connect(mainGain);
          mainGain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + duration);
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.warn('⚠️ [useAudio] 音频合成播放异常:', err);
    }
  }, []);

  const toggleMute = useCallback(() => {
    setInternalIsMuted((prev) => !prev);
  }, []);

  return {
    playBrushSound,
    isMuted,
    toggleMute,
  };
};