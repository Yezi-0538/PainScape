import React, { useState, useRef, useEffect } from "react";
import { createPortal } from 'react-dom';
import Sketch from "react-p5";
import { I18nProvider, useI18n } from "./i18n/i18nContext";
import { PAIN_NAME_MAP, BRUSHES, PALETTES, EXAM_DATABASE, QUOTES } from "./i18n/translationsConstants";

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:8000'
  : 'https://painscape-api.onrender.com';


class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return <h1 style={{ color: '#fff', textAlign: 'center' }}>页面出了点小问题，请刷新重试</h1>;
    return this.props.children;
  }
}

// === 粒子引擎 (重构重力悬停、动态呼吸) ===
class PainParticle {
  constructor(p5, x, y, type, color, speed, heading, bodyMode, pressure = 0.5) {
    this.p5 = p5;
    this.pos = p5.createVector(x, y);
    this.baseY = y;
    this.type = type;
    this.color = color;
    this.life = 255;
    this.seed = p5.random(1000);
    this.bodyMode = bodyMode;
    this.pressureScale = pressure;
    this.isDynamic = (type === 'wave' || type === 'twist' || type === 'heavy');

    const now = new Date();
    this.drawnAt = now.getTime();
    this.minuteOfDay = now.getHours() * 60 + now.getMinutes();
    if (type === 'pierce') {
      let angle = heading + p5.random(-0.15, 0.15);
      let thrust = p5.random(18, 36) * (0.6 + pressure); // 适当调整扎入深度，防止在屏幕上显得过大

      this.pierceVec = p5.createVector(p5.cos(angle) * thrust, p5.sin(angle) * thrust);
      this.vel = this.pierceVec.copy();

      // === 【微调】：大幅减小基础宽度，使利刃变为针刺般纤细 ===
      this.size = p5.random(1.8, 3.8);

      // 稍微精简放射裂纹
      this.fissures = [];
      let numFissures = p5.floor(p5.random(3, 5));
      for (let i = 0; i < numFissures; i++) {
        this.fissures.push({
          angle: angle + p5.random(-p5.PI * 0.7, p5.PI * 0.7),
          len: p5.random(6, 16) * pressure // 略微收窄裂纹长度
        });
      }
    }
    else if (type === 'heavy') {
      this.vel = p5.createVector(0, 0);
      this.size = p5.random(8, 15) * (0.5 + pressure);
    } else if (type === 'twist') {
      this.vel = p5.createVector(0, 0);
      this.size = p5.random(15, 30) * (0.5 + pressure);
      this.angle = p5.random(p5.TWO_PI);
    } else if (type === 'wave') {
      this.vel = p5.createVector(0, 0);
      this.size = p5.random(5, 15);
      this.maxSize = p5.random(30, 60) * (0.5 + pressure);
    } else if (type === 'scrape') {
      let angle = p5.PI / 4 + p5.random(-0.15, 0.15);
      this.vel = p5.createVector(p5.cos(angle), p5.sin(angle));
      this.vel.mult(p5.random(15, 30) * (0.5 + pressure));
      this.size = p5.random(2, 6);
      this.scrapeEnd = p5.createVector(this.pos.x + this.vel.x, this.pos.y + this.vel.y);
    }
  }

  update(p5) {
    if (!this.isDynamic) this.pos.add(this.vel);

    if (this.type === 'heavy') {
      // 【重构物理阻尼】：采用柔和的正弦慢动作，模拟肌肉被重物向下拉伸，没有弹跳感
      const drift = (p5.sin(p5.frameCount * 0.05 + this.seed) * 0.5 + 0.5); // 0 ~ 1 平滑过渡
      this.pos.y = this.baseY + drift * this.size * 1.5; // 最大下拉位移更长、更沉重
    }
    else if (this.type === 'twist') {
      this.angle += 0.08; this.size *= 0.98; if (this.size < 3) this.life = 0;
    }
    else if (this.type === 'wave') {
      this.pulseSize = this.size + p5.sin(p5.frameCount * 0.05 + this.seed) * (this.maxSize - this.size);
    }
    else if (this.type === 'scrape') {
      this.life -= 20; this.vel.mult(0); // 瞬间抓取并定格
    }
    else if (this.type === 'pierce') {
      this.life -= 25; this.vel.mult(0);
    }
  }

  show(pg) {
    let p = pg || this.p5;
    if (this.isDynamic) {
      p.drawingContext.shadowBlur = 10 * this.pressureScale;
      p.drawingContext.shadowColor = `rgb(${this.color[0]},${this.color[1]}, ${this.color[2]})`;
    } else {
      p.drawingContext.shadowBlur = 0;
    }

    if (this.type === 'pierce') {
      let endX = this.pos.x + (this.pierceVec ? this.pierceVec.x : this.vel.x);
      let endY = this.pos.y + (this.pierceVec ? this.pierceVec.y : this.vel.y);
      let headingAngle = this.pierceVec ? this.pierceVec.heading() : this.vel.heading();

      // === 【核心修改】：显式彻底关闭发光阴影，还原利刃无摩擦、干脆冷冽的物理切缘 ===
      p.drawingContext.shadowBlur = 0;

      // === 1. 细长针形主体（极度纤细，直击深处的刺穿感） ===
      p.noStroke();
      // 使用更高对比度的亮冷色，边缘带有一丝暗红
      p.fill(Math.min(255, this.color[0] + 160), Math.min(255, this.color[1] + 130), Math.min(255, this.color[2] + 130), 250);
      p.beginShape();
      let perpAngle = headingAngle + p.PI / 2;

      // 宽度大幅压缩，使其更加钢针化
      let bladeW = this.size * (0.25 + this.pressureScale * 0.3);

      p.vertex(this.pos.x - p.cos(headingAngle) * 3, this.pos.y - p.sin(headingAngle) * 3);
      p.vertex(this.pos.x + p.cos(perpAngle) * bladeW, this.pos.y + p.sin(perpAngle) * bladeW);
      p.vertex(endX, endY); // 极其尖锐、冰冷的穿透终点
      p.vertex(this.pos.x - p.cos(perpAngle) * bladeW, this.pos.y - p.sin(perpAngle) * bladeW);
      p.endShape(p.CLOSE);

      // === 2. 局部细密应激裂纹 ===
      p.stroke(this.color[0] * 0.6, 0, 0, 180);
      p.strokeWeight(0.8 * this.pressureScale);
      p.noFill();
      if (this.fissures) {
        this.fissures.forEach(fis => {
          let fEndX = this.pos.x + p.cos(fis.angle) * fis.len;
          let fEndY = this.pos.y + p.sin(fis.angle) * fis.len;
          p.beginShape();
          p.vertex(this.pos.x, this.pos.y);
          p.vertex(p.lerp(this.pos.x, fEndX, 0.5) + p.random(-1.5, 1.5), p.lerp(this.pos.y, fEndY, 0.5) + p.random(-1.5, 1.5));
          p.vertex(fEndX, fEndY);
          p.endShape();
        });
      }

      // === 3. 极细微的组织溅点 ===
      p.noStroke();
      const numSplatters = Math.floor(3 + this.pressureScale * 4);
      for (let sp = 0; sp < numSplatters; sp++) {
        let spT = p.random(0.2, 1.0);
        let baseX = p.lerp(this.pos.x, endX, spT);
        let baseY = p.lerp(this.pos.y, endY, spT);
        let spX = baseX + p.random(-8, 8) * this.pressureScale;
        let spY = baseY + p.random(-8, 8) * this.pressureScale;

        p.fill(this.color[0] * 0.8, 10, 10, 200 + p.random(-30, 30));
        // 缩小血滴尺寸，避免杂乱
        let splatSize = p.random(0.8, 2.2);
        p.ellipse(spX, spY, splatSize, splatSize);
      }
    }

    else if (this.type === 'heavy') {
      p.noStroke();
      const alphaVal = 160 + (90 * this.pressureScale);

      // 1. 软组织横向拉扯背景场 (拉伸阴影)
      p.fill(this.color[0], this.color[1], this.color[2], alphaVal * 0.12);
      p.beginShape();
      p.vertex(this.pos.x - this.size * 1.6, this.pos.y - this.size * 0.5);
      p.bezierVertex(
        this.pos.x - this.size * 0.5, this.pos.y + this.size * 1.5,
        this.pos.x + this.size * 0.5, this.pos.y + this.size * 1.5,
        this.pos.x + this.size * 1.6, this.pos.y - this.size * 0.5
      );
      p.endShape(p.CLOSE);

      // 2. 绘制具有重力垂坠变形、极不规则的铅重块 (向下尖锐拉伸的泪滴状)
      p.fill(this.color[0] * 0.35, this.color[1] * 0.25, this.color[2] * 0.25, alphaVal);
      p.beginShape();
      // 左肩
      p.vertex(this.pos.x - this.size * 0.7, this.pos.y - this.size * 0.4);
      // 向下垂坠变形的极不规则左腹部
      p.bezierVertex(
        this.pos.x - this.size * 0.9, this.pos.y + this.size * 0.4,
        this.pos.x - this.size * 0.4, this.pos.y + this.size * 1.8,
        this.pos.x, this.pos.y + this.size * 2.2 // 向下拉长、沉重探出的尖锐垂坠端
      );
      // 右腹部
      p.bezierVertex(
        this.pos.x + this.size * 0.4, this.pos.y + this.size * 1.8,
        this.pos.x + this.size * 0.9, this.pos.y + this.size * 0.4,
        this.pos.x + this.size * 0.7, this.pos.y - this.size * 0.4
      );
      // 顶部凹陷（模拟被骨盆组织向下生拉拽住的阻力）
      p.bezierVertex(
        this.pos.x + this.size * 0.3, this.pos.y - this.size * 0.8,
        this.pos.x - this.size * 0.3, this.pos.y - this.size * 0.8,
        this.pos.x - this.size * 0.7, this.pos.y - this.size * 0.4
      );
      p.endShape(p.CLOSE);

      // 3. 伴随其下的微型下坠碎屑（加强肌肉向下断裂拉丝的质感）
      p.fill(this.color[0] * 0.4, this.color[1] * 0.2, this.color[2] * 0.2, alphaVal * 0.8);
      p.ellipse(this.pos.x - this.size * 0.2, this.pos.y + this.size * 2.6, this.size * 0.2, this.size * 0.4);
      p.ellipse(this.pos.x + this.size * 0.3, this.pos.y + this.size * 2.9, this.size * 0.15, this.size * 0.3);

      // 4. 金属暗光
      p.fill(255, 255, 255, 45);
      p.ellipse(this.pos.x - this.size * 0.2, this.pos.y + this.size * 0.2, this.size * 0.25, this.size * 0.2);
    }

    else if (this.type === 'twist') {
      p.push(); p.translate(this.pos.x, this.pos.y); p.rotate(this.angle);
      p.noFill(); p.stroke(this.color[0], this.color[1], this.color[2], 100); p.strokeWeight(1.5);

      // 1. 外部绞拧圈
      p.beginShape();
      for (let a = 0; a < p.TWO_PI * 1.2; a += 0.2) {
        let r = p.map(a, 0, p.TWO_PI * 1.2, this.size * 1.8, this.size * 0.5);
        p.vertex(r * p.cos(a), r * p.sin(a));
      }
      p.endShape();

      // 2. 紧绷拧结核心
      p.fill(this.color[0] * 0.85, 0, 0, 160 + (65 * this.pressureScale));
      p.stroke(this.color[0] * 0.5, 0, 0, 240);
      p.strokeWeight(1.2);
      p.beginShape();
      // 尖锐无规则的多边形核心
      for (let i = 0; i < 7; i++) {
        let angle = (i * p.TWO_PI) / 7;
        let rad = this.size * (0.35 + p.random(-0.1, 0.12));
        p.vertex(rad * p.cos(angle), rad * p.sin(angle));
      }
      p.endShape(p.CLOSE);
      p.pop();
    }

    else if (this.type === 'wave') {
      p.noStroke(); p.fill(this.color[0], this.color[1], this.color[2], 10); p.ellipse(this.pos.x, this.pos.y, this.pulseSize, this.pulseSize);
      p.fill(this.color[0], this.color[1], this.color[2], 5 + (15 * this.pressureScale));
      p.ellipse(this.pos.x, this.pos.y, this.pulseSize, this.pulseSize);
    }
    else if (this.type === 'scrape') {
      // 采用构造函数中锁死不退化的终点坐标，彻底解决坍塌缩水问题
      let endX = this.scrapeEnd ? this.scrapeEnd.x : (this.pos.x + this.vel.x);
      let endY = this.scrapeEnd ? this.scrapeEnd.y : (this.pos.y + this.vel.y);

      let dx = endX - this.pos.x;
      let dy = endY - this.pos.y;
      let len = p.sqrt(dx * dx + dy * dy) || 1;
      let normalX = -dy / len;
      let normalY = dx / len;

      // === 优良特性 1 保留：多根平行副线（高逼真纤维拉扯丝） ===
      const numFibers = Math.floor(3 + this.pressureScale * 5);
      for (let f = 0; f < numFibers; f++) {
        const offsetDist = p.random(-10, 10);
        const startX = this.pos.x + normalX * offsetDist + p.random(-3, 3);
        const startY = this.pos.y + normalY * offsetDist + p.random(-3, 3);
        const finalX = endX + normalX * offsetDist * p.random(0.9, 1.1) + p.random(-3, 3);
        const finalY = endY + normalY * offsetDist * p.random(0.9, 1.1) + p.random(-3, 3);

        p.stroke(
          Math.min(255, this.color[0] * 0.8 + 50),
          Math.min(255, this.color[1] * 0.4 + 30),
          Math.min(255, this.color[2] * 0.4 + 30),
          100 + p.random(-30, 30)
        );
        p.strokeWeight(0.5 + p.random(0.6));
        p.line(startX, startY, finalX, finalY);
      }

      // === 优良特性 2 升级：主刮痕多道不规则重叠（强烈的撕扯质感） ===
      p.noFill();
      const numScratches = 3;
      for (let s = 0; s < numScratches; s++) {
        // 颜色深红带暗黑
        p.stroke(this.color[0] * 0.45, this.color[1] * 0.15, this.color[2] * 0.15, 240);
        p.strokeWeight((this.size * (0.6 + this.pressureScale * 0.6)) / numScratches);

        p.beginShape();
        const segments = 5;
        const scratchOffset = p.map(s, 0, numScratches - 1, -this.size * 0.4, this.size * 0.4);

        for (let i = 0; i <= segments; i++) {
          let t = i / segments;
          let currX = p.lerp(this.pos.x, endX, t) + normalX * scratchOffset;
          let currY = p.lerp(this.pos.y, endY, t) + normalY * scratchOffset;

          // 引入微小的犬牙锯齿偏置，使刮痕主干边缘看起来犬牙交错
          let offset = (i % 2 === 0 ? 1 : -1) * p.random(2, 5) * this.pressureScale;
          p.vertex(currX + normalX * offset, currY + normalY * offset);
        }
        p.endShape();
      }

      // === 优良特性 3 保留并增强：血肉碎屑与不规则皮裂三角形（翻卷的创面） ===
      const numDebris = Math.floor(3 + this.pressureScale * 4);
      for (let d = 0; d < numDebris; d++) {
        const debrisT = p.random(0.2, 1.0);
        const basePointX = p.lerp(this.pos.x, endX, debrisT);
        const basePointY = p.lerp(this.pos.y, endY, debrisT);

        const debrisX = basePointX + p.random(-15, 15);
        const debrisY = basePointY + p.random(-15, 15);
        const debrisSize = p.random(1.2, 3.5) * this.pressureScale;

        p.noStroke();
        // 1. 细碎血粒
        p.fill(this.color[0], this.color[1] * 0.3, this.color[2] * 0.3, 180 + p.random(-40, 40));
        p.ellipse(debrisX, debrisY, debrisSize, debrisSize);

        // 2. 不规则皮损碎屑三角形
        if (p.random(1) < 0.45) {
          p.fill(this.color[0] * 0.8, 10, 10, 150 + p.random(-30, 30));
          p.triangle(
            debrisX, debrisY,
            debrisX + p.random(-6, 6), debrisY + p.random(-6, 6),
            debrisX + p.random(-6, 6), debrisY + p.random(-6, 6)
          );
        }
      }
    }

    p.drawingContext.shadowBlur = 0;
  }
  isDead() { return this.life < 0; }
}

const wrapText = (ctx, text, x, y, maxWidth, lineHeight) => {
  if (!text) return y;
  const words = text.split("");
  let line = "";
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    let testLine = line + words[n];
    let metrics = ctx.measureText(testLine);
    let testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, currentY);
      line = words[n];
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
  return currentY + lineHeight;
};

// ========== 可折叠多选下拉框组件 ==========
const CollapsibleMultiSelect = ({ label, options, selectedValues, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef(null);
  const portalRef = useRef(null);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  // === 【核心修复 1】：将开启/折叠逻辑完全自包含，移除对未定义外部函数 handleOpen 的依赖 ===
  const handleToggle = (e) => {
    e.stopPropagation();
    if (isOpen) {
      setIsOpen(false);
    } else {
      updatePosition(); // 打开时实时重新计算绝对定位
      setIsOpen(true);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (triggerRef.current && !triggerRef.current.contains(event.target) &&
        portalRef.current && !portalRef.current.contains(event.target)) {
        handleClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const displayText = selectedValues.length === 0
    ? (placeholder || '请选择')
    : `已选择 ${selectedValues.length} 项`;

  const toggleOption = (value) => {
    let newValues;
    if (selectedValues.includes(value)) {
      newValues = selectedValues.filter(v => v !== value);
    } else {
      newValues = [...selectedValues, value];
    }
    onChange(newValues);
  };

  return (
    <div style={{ position: 'relative', marginBottom: '16px', width: '100%' }}>
      <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>{label}</label>
      <div
        ref={triggerRef}
        onClick={handleToggle}
        style={{
          width: '100%',
          padding: '12px',
          background: '#111',
          color: '#fff',
          border: '1.5px solid #333',
          borderRadius: '12px',
          fontSize: '13px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxSizing: 'border-box',
          minHeight: '46px'
        }}
      >
        <span style={{ color: selectedValues.length === 0 ? '#888' : '#fff', fontSize: '13px' }}>{displayText}</span>
        <span style={{ color: '#888', fontSize: '12px' }}>{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && createPortal(
        <div
          ref={portalRef}
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            background: '#1a1a1a',
            border: '1.5px solid #444',
            borderRadius: '12px',
            padding: '8px 0',
            maxHeight: '220px',
            overflowY: 'auto',
            zIndex: 10000,
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
          }}
        >
          {options.map(option => (
            <label
              key={option.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                cursor: 'pointer',
                transition: 'background 0.2s',
                margin: 0
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#252525'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <input
                type="checkbox"
                checked={selectedValues.includes(option.value)}
                onChange={() => toggleOption(option.value)}
                style={{ width: '16px', height: '16px', cursor: 'pointer', margin: 0 }}
              />
              <span style={{ color: '#ccc', fontSize: '13px' }}>{option.label}</span>
            </label>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

// ========== 可折叠单选下拉框组件 ==========
const CollapsibleSingleSelect = ({ label, options, selectedValue, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef(null);
  const portalRef = useRef(null);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  // === 【核心修复 2】：单选闭环逻辑重构 ===
  const handleToggle = (e) => {
    e.stopPropagation();
    if (isOpen) {
      setIsOpen(false);
    } else {
      updatePosition();
      setIsOpen(true);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (triggerRef.current && !triggerRef.current.contains(event.target) &&
        portalRef.current && !portalRef.current.contains(event.target)) {
        handleClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedLabel = options.find(opt => opt.value === selectedValue)?.label || '';
  const displayText = selectedValue ? selectedLabel : (placeholder || '请选择');

  return (
    <div style={{ position: 'relative', marginBottom: '16px', width: '100%' }}>
      <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>{label}</label>
      <div
        ref={triggerRef}
        onClick={handleToggle}
        style={{
          width: '100%',
          padding: '12px',
          background: '#111',
          color: '#fff',
          border: '1.5px solid #333',
          borderRadius: '12px',
          fontSize: '13px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxSizing: 'border-box',
          minHeight: '46px'
        }}
      >
        <span style={{ color: !selectedValue ? '#888' : '#fff', fontSize: '13px' }}>{displayText}</span>
        <span style={{ color: '#888', fontSize: '12px' }}>{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && createPortal(
        <div
          ref={portalRef}
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            background: '#1a1a1a',
            border: '1.5px solid #444',
            borderRadius: '12px',
            padding: '8px 0',
            maxHeight: '220px',
            overflowY: 'auto',
            zIndex: 10000,
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
          }}
        >
          {options.map(option => (
            <div
              key={option.value}
              onClick={() => {
                onChange(option.value);
                handleClose();
              }}
              style={{
                padding: '10px 12px',
                color: selectedValue === option.value ? '#d32f2f' : '#ccc',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'background 0.2s',
                backgroundColor: selectedValue === option.value ? 'rgba(211,47,47,0.1)' : 'transparent'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#252525'}
              onMouseLeave={e => e.currentTarget.style.background = selectedValue === option.value ? 'rgba(211,47,47,0.1)' : 'transparent'}
            >
              {option.label}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

function AppContent({ targetLanguage, setTargetLanguage }) {
  const isEn = targetLanguage === 'en';
  const { t, texts } = useI18n();

  // JSONBin 配置
  const JSONBIN_BIN_ID = '6a17a2b121f9ee59d2939707';
  const JSONBIN_API_KEY = '$2a$10$tAISFkFwGQjiyJXWHNRTKOTqCND35OcoGtJxUvKYK5vdnxVKdyJqy';
  const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

  const loadCommunityPosts = async () => {
    try {
      const res = await fetch(`${JSONBIN_URL}/latest`, {
        headers: { 'X-Master-Key': JSONBIN_API_KEY }
      });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      return data.record || [];
    } catch (e) {
      console.warn('JSONBin 加载失败，使用本地数据', e);
      return null;
    }
  };

  // === 【动态统计分类】：实时计算真实的帖子分布与周统计，剔除 Mock 数据 ===
  const getDynamicCommunityStats = () => {
    if (!posts || posts.length === 0) return { total: 0, topPainKey: 'twist' };

    // 1. 发帖总数（低于 5 条时，基数设为 5 + 实际数，使广场显得活跃）
    const total = posts.length < 5 ? posts.length + 6 : posts.length;

    // 2. 统计各痛觉出现频次
    const counts = {};
    posts.forEach(p => {
      const tag = p.painTags?.[0] || 'twist';
      counts[tag] = (counts[tag] || 0) + 1;
    });

    // 3. 找出本周最集中的痛感 Key
    const topPainKey = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, 'twist');

    return { total, topPainKey };
  };
  const [showHealingModal, setShowHealingModal] = useState(false);
  const [healingTipType, setHealingTipType] = useState('breathing');
  const publishToCommunity = async (newPost) => {
    try {
      const posts = await loadCommunityPosts();
      const currentPosts = posts || [];
      currentPosts.unshift({
        ...newPost,
        id: Date.now(),
        createdAt: new Date().toISOString()
      });
      const trimmed = currentPosts.slice(0, 100);
      await fetch(JSONBIN_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_API_KEY
        },
        body: JSON.stringify(trimmed)
      });
      return trimmed;
    } catch (e) {
      console.error('JSONBin 发布失败', e);
      return null;
    }
  };
  // === 【自愈/伴侣随机库抽取状态】 ===
  const [randomSelfCareTips, setRandomSelfCareTips] = useState([]);
  const [randomPartnerTips, setRandomPartnerTips] = useState([]);
  // === 【历史日记状态提升】 ===
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDateRecords, setSelectedDateRecords] = useState([]);
  const [showGroupedView, setShowGroupedView] = useState(false);
  const [menstrualDates, setMenstrualDates] = useState([]);

  // 归一化不同操作系统/浏览器生成的本地化日期字符串为标准 "YYYY-MM-DD"
  const normalizeDateStr = (dateStr) => {
    if (!dateStr) return '';
    const cleanStr = dateStr.replace(/\//g, '-').replace(/\./g, '-');
    const parsed = new Date(cleanStr);
    if (isNaN(parsed.getTime())) return '';
    return `${parsed.getFullYear()}-${parsed.getMonth() + 1}-${parsed.getDate()}`;
  };
  const [selectedTempMode, setSelectedTempMode] = useState("medical"); // 'medical' or 'general'
  const updatePostInCloud = async (postId, updates) => {
    try {
      const posts = await loadCommunityPosts();
      if (!posts) return null;

      const updatedPosts = posts.map(p =>
        p.id === postId ? { ...p, ...updates } : p
      );

      await fetch(JSONBIN_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_API_KEY
        },
        body: JSON.stringify(updatedPosts)
      });
      return updatedPosts;
    } catch (e) {
      console.error('更新帖子失败', e);
      return null;
    }
  };

  const handleLikePost = async (postId) => {
    const hasLiked = userLikedPosts.includes(postId);

    if (hasLiked) {
      setUserLikedPosts(prev => prev.filter(id => id !== postId));
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, likes: (p.likes || 0) - 1 } : p
      ));
    } else {
      setUserLikedPosts(prev => [...prev, postId]);
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, likes: (p.likes || 0) + 1 } : p
      ));
    }
    localStorage.setItem('painscape_user_likes', JSON.stringify(
      hasLiked ? userLikedPosts.filter(id => id !== postId) : [...userLikedPosts, postId]
    ));

    const updatedPosts = await updatePostInCloud(postId, {
      likes: (posts.find(p => p.id === postId)?.likes || 0) + (hasLiked ? -1 : 1)
    });
    if (updatedPosts) setPosts(updatedPosts);
  };

  const [page, setPage] = useState("splash");
  const [appMode, setAppMode] = useState("medical"); // 'medical' (就诊协助) | 'general' (日常表达)

  const [quote] = useState(() => {
    const quotes = t('splash.quotes', {});
    if (Array.isArray(quotes) && quotes.length > 0) {
      return quotes[Math.floor(Math.random() * quotes.length)];
    }
    const fallbackQuotes = [
      "慢性疼痛相当于长期的“unmaking”——把人困在身体牢笼里。\n—— Elaine Scarry",
      "疼痛不仅是神经的电冲动，它是对自我边界的侵犯。",
      "语言在痛苦面前总是匮乏的，而视觉是一道划破沉默的闪电。"
    ];
    return fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
  });

  const [splashOpacity, setSplashOpacity] = useState(1);
  const [llmData, setLlmData] = useState(null);
  const [quickPainType, setQuickPainType] = useState('twist');
  const [quickPainScore, setQuickPainScore] = useState(7);
  const [currentReportData, setCurrentReportData] = useState(null);

  const [showGuide, setShowGuide] = useState(false);
  const [showContent, setShowContent] = useState('basicInfo');

  // 从 LocalStorage 初始化和加载常态背景信息
  const [medicalBackground, setMedicalBackground] = useState(() => {
    const cached = localStorage.getItem("painscape_med_bg");
    const parsed = cached ? JSON.parse(cached) : {};
    return {
      diagnosed: parsed.diagnosed || '',
      allergies: parsed.allergies || '',
      age: parsed.age || '',
      lifestyle: parsed.lifestyle || '',
      activityLevel: parsed.activityLevel || '',
      familyHistory: parsed.familyHistory || '',
      psychosocial: parsed.psychosocial || '',
      reproductiveHistory: parsed.reproductiveHistory || '',
      height: parsed.height || '',
      weight: parsed.weight || '',
      otherDiagnosis: parsed.otherDiagnosis || '',
      otherAllergies: parsed.otherAllergies || '',
      surgicalHistory: parsed.surgicalHistory || '',
      menarcheAge: parsed.menarcheAge || '',
      cycleRegular: parsed.cycleRegular || '',
      periodDuration: parsed.periodDuration || '',
      lastPeriod: parsed.lastPeriod || '',
      familyHistoryArr: parsed.familyHistoryArr || [],
      lifestyleArr: parsed.lifestyleArr || [],
      reproductiveHistoryArr: parsed.reproductiveHistoryArr || [],
    };
  });

  // 持久化基础健康数据
  useEffect(() => {
    localStorage.setItem("painscape_med_bg", JSON.stringify(medicalBackground));
  }, [medicalBackground]);


  const captureFullCanvas = (side) => {
    const p5 = p5Ref.current;
    if (!p5) return document.createElement('canvas');

    const pg = side === 'front' ? pgFrontRef.current : pgBackRef.current;
    if (!pg) return document.createElement('canvas');

    // === 【对齐修复】：离屏画布使用与原画板 pg 绝对 1:1 的平铺尺寸 ===
    const captureGraphics = p5.createGraphics(pg.width, pg.height);
    captureGraphics.background(0);

    let activeImg = side === 'front' ? bgFrontRef.current : bgBackRef.current;
    if (activeImg) {
      captureGraphics.imageMode(p5.CENTER);
      captureGraphics.tint(255, 40);
      let currentBgScale = bgScaleRef.current || 1.0;
      // 使用与主 draw 循环中完全等比例的比例尺
      let imgScale = ((pg.height * 0.8) / activeImg.height) * currentBgScale;
      captureGraphics.image(activeImg, pg.width / 2, pg.height / 2, activeImg.width * imgScale, activeImg.height * imgScale);
    }

    captureGraphics.noTint();
    captureGraphics.imageMode(p5.CORNER);
    captureGraphics.image(pg, 0, 0);

    // 绘制该侧的所有动态粒子
    dynamicParticles.current.forEach(dp => {
      if (dp.bodyMode === side) {
        dp.show(captureGraphics);
      }
    });

    return captureGraphics.elt;
  };

  const generateCompositeCanvas = () => {
    const p5 = p5Ref.current;
    if (!p5) return null;

    const hasFront = !isSideEmpty('front');
    const hasBack = !isSideEmpty('back');

    // 如果只有单面绘制，直接截取单面
    if (!hasFront || !hasBack) {
      const activeCanvas = captureFullCanvas(bodyMode === 'none' ? 'front' : bodyMode);
      return activeCanvas.toDataURL("image/jpeg", 0.5);
    }

    // 如果正反面都画了，创建双倍宽度的 Canvas 拼接
    const canvasFront = captureFullCanvas('front');
    const canvasBack = captureFullCanvas('back');

    const composite = document.createElement('canvas');
    composite.width = canvasFront.width * 2;
    composite.height = canvasFront.height;
    const ctx = composite.getContext('2d');

    // 拼接：左正面，右背面
    ctx.drawImage(canvasFront, 0, 0);
    ctx.drawImage(canvasBack, canvasFront.width, 0);

    return composite.toDataURL("image/jpeg", 0.5);
  };
  const [showCompare, setShowCompare] = useState(false);
  const [cycleDay, setCycleDay] = useState('');
  const [tonePreference, setTonePreference] = useState('gentle');
  const [isLoading, setIsLoading] = useState(false);
  const [editedContents, setEditedContents] = useState({});
  const [editingField, setEditingField] = useState(null);
  const [diaryShareIdentity, setDiaryShareIdentity] = useState('partner');
  const [showExpInput, setShowExpInput] = useState(false);

  const [userLikedPosts, setUserLikedPosts] = useState(() => {
    const saved = localStorage.getItem('painscape_user_likes');
    return saved ? JSON.parse(saved) : [];
  });

  const [expText, setExpText] = useState("");
  const [expTags, setExpTags] = useState("");
  const [refineTargetField, setRefineTargetField] = useState('med_complaint');

  const handleSaveExperience = async () => {
    if (!expText.trim()) return alert(t('toast.saveExperienceRequired'));
    const tagsArray = expTags ? expTags.split(/[,，]/).filter(t => t.trim()) : [];
    const updates = {
      userExperience: expText,
      experienceTags: tagsArray
    };

    setPosts(prev => prev.map(p =>
      p.id === viewingPost.id ? { ...p, ...updates } : p
    ));
    setViewingPost(vp => ({ ...vp, ...updates }));
    setShowExpInput(false);
    setExpText("");
    setExpTags("");

    const updatedPosts = await updatePostInCloud(viewingPost.id, updates);
    if (updatedPosts) {
      setPosts(updatedPosts);
    }
  };

  const showToast = (msgKey, vars = {}) => {
    const msg = t(`toast.${msgKey}`, vars);
    const toast = document.createElement('div');
    toast.innerText = msg;
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(20,20,20,0.9)',
      color: '#fff',
      padding: '10px 24px',
      borderRadius: '20px',
      fontSize: '14px',
      zIndex: '9999',
      backdropFilter: 'blur(5px)',
      border: '1px solid #333',
      transition: 'opacity 0.3s'
    });
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 1500);
  };

  const audioCtx = useRef(null);
  const [isMuted, setIsMuted] = useState(false);

  const playBrushSound = (type) => {
    if (isMuted) return;
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.current.state === 'suspended') {
      audioCtx.current.resume();
    }

    const ctx = audioCtx.current;
    const now = ctx.currentTime;

    // 辅助函数：动态生成白噪音 Buffer，用于构建有机的物理摩擦和撞击质感
    const createNoiseBuffer = (duration = 1.0) => {
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1; // 0 ~ 1.0 范围的白噪音
      }
      return buffer;
    };

    // === 通用参数：控制声音的整体柔和度 ===
    const SMOOTH_ATTACK_TIME = 0.15; // 普遍延长起音时间
    const SMOOTH_RELEASE_TIME = 0.8; // 普遍延长衰减时间
    const MAX_VOLUME = 0.1;          // 降低峰值响度，避免突兀
    const LOWPASS_FREQ_GENERAL = 400; // 通用低通滤波器，压制高频

    if (type === 'pierce') {
      // === 针刺 (Pierce): 瞬态有机穿透音 ===
      const osc = ctx.createOscillator();
      const noise = ctx.createBufferSource();
      const oscGain = ctx.createGain();
      const noiseGain = ctx.createGain();
      const noiseFilter = ctx.createBiquadFilter();

      const duration = 0.08;

      // 快速下扫正弦波 (模拟刺入深度)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + duration);

      // 带通滤波噪声 (模拟刺穿纤维时的“嚓”瞬态声)
      noise.buffer = createNoiseBuffer(duration);
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
    }
    else if (type === 'heavy') {
      // === 坠痛 (Heavy): 干脆的重石坠落与持续重压感 ===
      const osc = ctx.createOscillator();
      const noise = ctx.createBufferSource();
      const oscGain = ctx.createGain();
      const noiseGain = ctx.createGain();
      const oscFilter = ctx.createBiquadFilter();
      const noiseFilter = ctx.createBiquadFilter();

      const duration = 0.8; // 整体物理重压释放时值

      // 1. 快速下坠的正弦波 (120Hz 骤降至 60Hz，仅用 0.06 秒完成，展现“干脆的下坠着陆点”)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.06);

      // 2. 压感振荡器低通滤波器 (过滤高频，确保低沉温和)
      oscFilter.type = 'lowpass';
      oscFilter.frequency.setValueAtTime(150, now);

      // 3. 瞬间触发的重石落地白噪音 (低通在 90Hz，模拟石头着地时的闷响和物理重压)
      noise.buffer = createNoiseBuffer(duration);
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(90, now);

      // 4. 音量包络设计
      // - 快速起音 (0.025s 达到峰值，塑造极具实体感的脆重撞击)
      // - 随后缓慢释放，保留低沉的死重余震 (压感)
      oscGain.gain.setValueAtTime(0.001, now);
      oscGain.gain.linearRampToValueAtTime(MAX_VOLUME * 0.95, now + 0.025);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      // 噪声包络：快速衰减 (只在撞击瞬间产生石头着地感，避免嘈杂)
      noiseGain.gain.setValueAtTime(0.001, now);
      noiseGain.gain.linearRampToValueAtTime(MAX_VOLUME * 0.5, now + 0.025);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15); // 0.15s 内迅速消失，保持干脆不拖沓

      // 连接
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
    }
    else if (type === 'twist') {
      // === 绞拧 (Twist): 频率调制 (FM) 的渐进揉拧感 ===
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const mainGain = ctx.createGain();

      const duration = 0.45;

      // 三角波提供温和的、非电子感的肌肉摩擦底色
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(80, now);

      // 13Hz 低频调制器，产生一种拧抹布时的“物理震颤”和持续拧紧质感
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(13, now);
      lfoGain.gain.setValueAtTime(25, now); // 调制深度

      // 挤压式的渐强再渐弱音量包络
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
    }
    else if (type === 'wave') {
      // === 酸胀/胀扩 (Wave): 潮汐般缓和的低频脉动 ===
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const noise = ctx.createBufferSource();
      const filter1 = ctx.createBiquadFilter(); // 过滤 osc1
      const filter2 = ctx.createBiquadFilter(); // 过滤 osc2
      const noiseFilter = ctx.createBiquadFilter(); // 过滤 noise
      const mainGain = ctx.createGain();
      const noiseGain = ctx.createGain();

      const duration = 1.5; // 延长时值，体验完整的波动过程

      // 1. 基频：120Hz 的正弦波 + 121.5Hz 的三角波，产生柔和的自然拍频
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(120, now);
      osc1.frequency.linearRampToValueAtTime(135, now + duration * 0.5);
      osc1.frequency.linearRampToValueAtTime(115, now + duration);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(121.5, now);
      osc2.frequency.linearRampToValueAtTime(136.5, now + duration * 0.5);
      osc2.frequency.linearRampToValueAtTime(116.5, now + duration);

      // 2. 缓慢变化的带通噪声（潮汐般的物理涌动感）
      noise.buffer = createNoiseBuffer(duration);
      filter1.type = 'lowpass'; // 过滤掉噪音的高频部分
      filter1.frequency.setValueAtTime(LOWPASS_FREQ_GENERAL, now);

      noiseFilter.type = 'bandpass'; // 仅保留一个有限的低频带宽
      noiseFilter.frequency.setValueAtTime(140, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(360, now + duration * 0.45); // 模拟潮水涌动
      noiseFilter.frequency.exponentialRampToValueAtTime(120, now + duration);        // 模拟潮水退去

      // 3. 缓和的音量包络，模拟潮水涌来、涨满、退去的波动感
      // 降低峰值响度，以更柔和的方式呈现
      mainGain.gain.setValueAtTime(0.001, now);
      mainGain.gain.linearRampToValueAtTime(MAX_VOLUME * 0.7, now + duration * 0.45); // 缓和涌入
      mainGain.gain.linearRampToValueAtTime(MAX_VOLUME * 0.3, now + duration * 0.75); // 达到峰值后略微回落
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
    }
    else if (type === 'scrape') {
      // === 刮擦 (Scrape): 物理颗粒拉扯阻尼音 ===
      const noise = ctx.createBufferSource();
      const noiseFilter = ctx.createBiquadFilter();
      const mainGain = ctx.createGain();
      const duration = 0.28;

      noise.buffer = createNoiseBuffer(duration);

      // 扫频带通滤波器 (模拟粗糙表面快速摩擦掠过的频域漂移)
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(180, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(480, now + duration);
      noiseFilter.Q.setValueAtTime(1.8, now);

      // 略微抖动的粗糙振幅包络
      mainGain.gain.setValueAtTime(0.05, now);
      mainGain.gain.linearRampToValueAtTime(0.03, now + duration * 0.4);
      mainGain.gain.linearRampToValueAtTime(0.045, now + duration * 0.7);
      mainGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(noiseFilter);
      noiseFilter.connect(mainGain);
      mainGain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + duration);
    }
    else if (type === 'eraser') {
      // === 橡皮擦 (Eraser): 舒缓抚平与放松的上扫正弦波 ===
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const mainGain = ctx.createGain();
      const duration = 0.5;

      // 纯净上扫 (E4 330Hz -> A4 440Hz 协和五度上行，带来听觉上的完结与轻松感)
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
    }
  };

  const [refiningField, setRefiningField] = useState(null);
  const [refineInput, setRefineInput] = useState('');

  const exportHistoryPDF = async () => {
    if (history.length === 0) return showToast("noRecords");
    setIsLoading(true);
    showToast("pdfGenerating");
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPos = 20;

      const checkPageBreak = (heightNeeded) => {
        if (yPos + heightNeeded > pageHeight - 20) {
          doc.addPage();
          yPos = 20;
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(t('pdf.disclaimer1'), pageWidth / 2, pageHeight - 10, { align: 'center' });
        }
      };

      doc.setFontSize(24);
      doc.setTextColor(40);
      doc.text("PainScape", pageWidth / 2, 40, { align: 'center' });

      doc.setFontSize(16);
      doc.text("Patient Pain Profile", pageWidth / 2, 50, { align: 'center' });

      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(`Report Range: ${history[history.length - 1].date} - ${history[0].date}`, pageWidth / 2, 65, { align: 'center' });
      doc.text(`Total Records: ${history.length}`, pageWidth / 2, 73, { align: 'center' });

      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text("This document is generated by AI based on patient's visual drawing.", pageWidth / 2, 90, { align: 'center' });
      doc.text("Please present this to your gynecologist.", pageWidth / 2, 96, { align: 'center' });

      for (let i = 0; i < history.length; i++) {
        const record = history[i];
        doc.addPage();
        yPos = 20;

        doc.setFontSize(14);
        doc.setTextColor(40);
        doc.text(`Record ${i + 1}: ${record.date}`, 15, yPos);

        doc.setFontSize(12);
        doc.setTextColor(211, 47, 47);
        doc.text(`Dominant Pain: ${record.painName || 'Unknown'}`, 15, yPos + 8);
        yPos += 18;

        if (record.img) {
          try {
            doc.addImage(record.img, 'JPEG', 15, yPos, 80, 80);
            yPos += 85;
          } catch (e) {
            console.warn("图片加载失败", e);
          }
        }

        checkPageBreak(40);
        doc.setFontSize(11);
        doc.setTextColor(80);
        doc.text("Medical Complaint:", 15, yPos);
        yPos += 6;

        doc.setFontSize(10);
        doc.setTextColor(120);
        const complaintText = record.content?.med_complaint || "No data";
        const splitComplaint = doc.splitTextToSize(complaintText, pageWidth - 30);
        doc.text(splitComplaint, 15, yPos);
        yPos += splitComplaint.length * 5 + 10;

        checkPageBreak(30);
        doc.setFontSize(11);
        doc.setTextColor(80);
        doc.text("Medical Reference:", 15, yPos);
        yPos += 6;

        doc.setFontSize(10);
        doc.setTextColor(120);
        const refText = (record.content?.med_reference || "No data").substring(0, 300);
        const splitRef = doc.splitTextToSize(refText, pageWidth - 30);
        doc.text(splitRef, 15, yPos);

        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text("PainScape - Generated Report", pageWidth / 2, pageHeight - 10, { align: 'center' });
      }

      doc.save(`PainScape_Report_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`);
      showToast("pdfSuccess");

    } catch (err) {
      console.error("PDF 生成失败:", err);
      showToast("pdfFailed");
    } finally {
      setIsLoading(false);
    }
  };
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const particlePositions = useRef([]);
  const speedHistory = useRef([]);
  const pressureHistory = useRef([]);
  const [activeBrush, setActiveBrush] = useState(null);
  const [activeColor, setActiveColor] = useState("crimson");
  const [identity, setIdentity] = useState("partner");
  const [userPrefs, setUserPrefs] = useState(["care"]);
  const [imgUrl, setImgUrl] = useState(null);
  const [bodyMode, setBodyMode] = useState('front');
  // === 人体背景图独立缩放控制 ===
  const [bgScale, setBgScale] = useState(1.0); // 范围 0.5 - 2.0
  const bgScaleRef = useRef(1.0);

  const [tipVisible, setTipVisible] = useState(false);
  useEffect(() => {
    setTipVisible(true);
    const timer = setTimeout(() => setTipVisible(false), 1500);
    return () => clearTimeout(timer);
  }, [bodyMode]);

  useEffect(() => {
    bgScaleRef.current = bgScale;
  }, [bgScale]);
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem('painscape_history') || '[]'));
  const [posts, setPosts] = useState([]);

  const getPainTagStats = () => {
    const stats = {};
    posts.forEach(p => {
      (p.painTags || []).forEach(tag => {
        stats[tag] = (stats[tag] || 0) + 1;
      });
    });
    return stats;
  };

  const [postText, setPostText] = useState("");
  const [showPostModal, setShowPostModal] = useState(false);
  const [viewingDiary, setViewingDiary] = useState(null);
  const [viewingPost, setViewingPost] = useState(null);
  const [groupFilter, setGroupFilter] = useState("all");
  const [painFilter, setPainFilter] = useState("all");


  const brushCounts = useRef({ twist: 0, pierce: 0, heavy: 0, wave: 0, scrape: 0 });
  const staticParticles = useRef([]);
  const dynamicParticles = useRef([]);

  const p5Ref = useRef(null);
  const bgFrontRef = useRef(null);
  const bgBackRef = useRef(null);
  const pgFrontRef = useRef(null);
  const pgBackRef = useRef(null);

  const camRef = useRef({ x: 0, y: 0, zoom: 1.0 });
  const pressTimer = useRef(0);
  const isLongPressing = useRef(false);
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const hasSavedInitial = useRef(false);

  useEffect(() => {
    if (page === 'splash') {
      const timer1 = setTimeout(() => setSplashOpacity(0), 2000);
      const timer2 = setTimeout(() => {
        setPage('modeSelection'); // 引导前置页面选择模式
      }, 3000);
      return () => { clearTimeout(timer1); clearTimeout(timer2); };
    }
  }, [page]);

  useEffect(() => {
    if (page === 'community') {
      loadCommunityPosts().then(cloudPosts => {
        if (cloudPosts && cloudPosts.length > 0) {
          setPosts(cloudPosts);
        }
      });
    }
  }, [page]);

  useEffect(() => {
    const pd = (e) => e.preventDefault();
    document.addEventListener("contextmenu", pd);
    return () => document.removeEventListener("contextmenu", pd);
  }, []);

  useEffect(() => {
    if (targetLanguage && page === 'result') {
      handleFinish();
    }
  }, [targetLanguage]);

  const preload = (p5) => {
    bgFrontRef.current = p5.loadImage("body_front.png");
    bgBackRef.current = p5.loadImage("body_back.png");
  };

  const captureState = () => {
    if (!pgFrontRef.current || !pgBackRef.current) return null;
    return {
      imgFront: pgFrontRef.current.get(),
      imgBack: pgBackRef.current.get(),
      dynamic: [...dynamicParticles.current]
    };
  };

  const setup = (p5, canvasParentRef) => {
    p5Ref.current = p5;
    p5.createCanvas(window.innerWidth, window.innerHeight).parent(canvasParentRef);

    const canvas = p5.canvas;
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1 && activeBrush !== null) {
        e.preventDefault();
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && activeBrush !== null) {
        e.preventDefault();
      }
    }, { passive: false });

    // === 【对齐修复】：统一设为 1:1 视口坐标系，彻底消除双倍位移差 ===
    pgFrontRef.current = p5.createGraphics(window.innerWidth, window.innerHeight);
    pgBackRef.current = p5.createGraphics(window.innerWidth, window.innerHeight);
    camRef.current.x = 0;
    camRef.current.y = 0;
    if (!hasSavedInitial.current) {
      undoStackRef.current.push(captureState());
      hasSavedInitial.current = true;
    }
  };

  const isSafeToDraw = (p5) => {
    if (page !== 'canvas') return false;
    let currentY = p5.touches.length > 0 ? p5.touches[0].y : p5.mouseY;
    let currentX = p5.touches.length > 0 ? p5.touches[0].x : p5.mouseX;
    if (currentY < 100 || currentY > window.innerHeight - 150 || currentX > window.innerWidth - 80) return false;
    return true;
  };

  const mouseReleased = (p5) => {
    if (!isSafeToDraw(p5) || p5.mouseButton === p5.RIGHT) return;
    let state = captureState();
    if (state) { undoStackRef.current.push(state); if (undoStackRef.current.length > 20) undoStackRef.current.shift(); redoStackRef.current = []; }
  };

  const handleUndo = () => {
    if (undoStackRef.current.length > 1) {
      redoStackRef.current.push(captureState()); undoStackRef.current.pop();
      let prev = undoStackRef.current[undoStackRef.current.length - 1];
      pgFrontRef.current.clear(); pgFrontRef.current.image(prev.imgFront, 0, 0);
      pgBackRef.current.clear(); pgBackRef.current.image(prev.imgBack, 0, 0);
      dynamicParticles.current = [...prev.dynamic]; staticParticles.current = [];
    }
  };

  const handleRedo = () => {
    if (redoStackRef.current.length > 0) {
      undoStackRef.current.push(captureState()); let next = redoStackRef.current.pop();
      pgFrontRef.current.clear(); pgFrontRef.current.image(next.imgFront, 0, 0);
      pgBackRef.current.clear(); pgBackRef.current.image(next.imgBack, 0, 0);
      dynamicParticles.current = [...next.dynamic]; staticParticles.current = [];
    }
  };

  const handleClear = () => { undoStackRef.current.push(captureState()); redoStackRef.current = []; pgFrontRef.current.clear(); pgBackRef.current.clear(); dynamicParticles.current = []; staticParticles.current = []; };

  const mouseWheel = (p5, event) => {
    if (page !== 'canvas') return false;
    camRef.current.zoom = Math.max(0.5, Math.min(camRef.current.zoom + (event.delta > 0 ? -0.1 : 0.1), 3.0));
    return false;
  };

  const getFullShareText = (idty, content) => {
    const safeAction = content.action?.replace(/🛑|🥣|🫂|❤️|复合指令：|偏好指令：/g, '').trim() || '';
    const safeSelfCare = content.selfCare?.replace(/✨/g, '•').trim() || '';

    switch (idty) {
      case 'partner':
        return `${t('shareText.partner.title')}\n${content.analogy || ''}\n\n${t('shareText.partner.action')}\n${safeAction}`;
      case 'work':
        return `${t('shareText.work.title')}\n${content.workText || ''}`;
      case 'doctor':
        return `${t('shareText.doctor.profile')}\n${content.med_profile || ''}\n\n${t('shareText.doctor.complaint')}\n${content.med_complaint || ''}\n\n${t('shareText.doctor.reference')}\n${content.med_reference || ''}`;
      case 'self':
        return `${t('shareText.self.title')}\n${content.analogy || ''}\n\n${t('shareText.self.solution')}\n${safeSelfCare}`;
      default:
        return "";
    }
  };

  const draw = (p5) => {
    p5.background(0);
    if (page !== 'canvas') return;

    // === 检测点击是否来自于 Canvas，拦截 HTML 控件点击 ===
    let isClickingCanvas = true;
    if (p5.mouseEvent && p5.mouseEvent.target) {
      isClickingCanvas = p5.mouseEvent.target.tagName === 'CANVAS';
    }
    if (p5.touchEvent && p5.touches.length > 0 && p5.touchEvent.target) {
      isClickingCanvas = p5.touchEvent.target.tagName === 'CANVAS';
    }

    let { x, y, zoom } = camRef.current;

    let isInteracting = (p5.mouseIsPressed || p5.touches.length > 0) && isSafeToDraw(p5) && isClickingCanvas;

    let realX = (p5.mouseX - x) / zoom, realY = (p5.mouseY - y) / zoom;
    let realPx = (p5.pmouseX - x) / zoom, realPy = (p5.pmouseY - y) / zoom;
    let speed = p5.dist(realX, realY, realPx, realPy);

    let heading = (speed < 1) ? p5.PI / 2 : p5.atan2(realY - realPy, realX - realPx);

    if (!isInteracting) {
      pressTimer.current = 0;
      isLongPressing.current = false;
    } else {
      if (speed < 1) pressTimer.current++; else pressTimer.current = 0;
      if (pressTimer.current > 20) isLongPressing.current = true;
    }

    // === 双指或无画笔状态才可移动底图 ===
    let isPanning = false;
    if (activeBrush === null) {
      isPanning = true;
    } else if (p5.mouseButton === p5.RIGHT) {
      isPanning = true;
    } else if (p5.touches.length >= 2) {
      isPanning = true;
    } else if (isLongPressing.current && p5.touches.length === 0) {
      isPanning = true;
    }

    let currentPg = bodyMode === 'back' ? pgBackRef.current : pgFrontRef.current;

    if (isInteracting) {
      if (isPanning) {
        camRef.current.x += p5.mouseX - p5.pmouseX;
        camRef.current.y += p5.mouseY - p5.pmouseY;
      }
      else if (activeBrush === 'eraser') {
        currentPg.erase();
        currentPg.ellipse(realX, realY, 40 / zoom, 40 / zoom);
        currentPg.noErase();
        dynamicParticles.current = dynamicParticles.current.filter(p =>
          p.bodyMode !== bodyMode || p5.dist(p.pos.x, p.pos.y, realX, realY) > 20
        );
      }
      else if (activeBrush !== null) {
        brushCounts.current[activeBrush] += 1;

        // === 只有非橡皮擦的真实绘图行为才注入速度轨迹 ===
        if (speedHistory.current.length > 200) speedHistory.current.shift();
        speedHistory.current.push(speed);

        let spawnRate = (activeBrush === 'wave' || activeBrush === 'twist' || activeBrush === 'heavy') ? 6 : 2;
        if (p5.frameCount % spawnRate === 0 || speed > 10) {
          let pressure = 0.5;
          if (p5.touches.length > 0) {
            pressure = p5.touches[0].force ?? 0.5;
          } else if (typeof p5.mouseX === 'number' && p5._curElement) {
            pressure = p5._curElement?.pointer?.pressure ?? 0.5;
          }
          pressure = Math.max(0.2, pressure);

          // 此时 heading 已声明，此处不会再抛出引用错误
          let pObj = new PainParticle(p5, realX, realY, activeBrush, PALETTES[activeColor].color, speed, heading, bodyMode, pressure);

          particlePositions.current.push({ x: realX, y: realY, bodyMode });
          speedHistory.current.push(speed);
          pressureHistory.current.push(pressure);

          if (speedHistory.current.length > 200) speedHistory.current.shift();
          if (pressureHistory.current.length > 200) pressureHistory.current.shift();

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

    for (let i = staticParticles.current.length - 1; i >= 0; i--) {
      let p = staticParticles.current[i];
      p.update(p5);
      let targetPg = p.bodyMode === 'back' ? pgBackRef.current : pgFrontRef.current;
      p.show(targetPg);
      if (p.isDead()) staticParticles.current.splice(i, 1);
    }

    p5.push(); p5.translate(x, y); p5.scale(zoom);
    let activeImg = bodyMode === 'front' ? bgFrontRef.current : (bodyMode === 'back' ? bgBackRef.current : null);
    if (activeImg) {
      p5.imageMode(p5.CENTER); p5.tint(255, 40);
      let currentBgScale = bgScaleRef.current || 1.0;
      let imgScale = ((p5.height * 0.8) / activeImg.height) * currentBgScale;
      p5.image(activeImg, p5.width / 2, p5.height / 2, activeImg.width * imgScale, activeImg.height * imgScale);
    }

    p5.noTint(); p5.imageMode(p5.CORNER); p5.image(currentPg, 0, 0);

    for (let i = dynamicParticles.current.length - 1; i >= 0; i--) {
      let dp = dynamicParticles.current[i];
      dp.update(p5);
      if (dp.bodyMode === bodyMode) dp.show(p5);
      if (dp.isDead()) dynamicParticles.current.splice(i, 1);
    }
    p5.pop();
  };
  const [showSharePreview, setShowSharePreview] = useState(false);
  const [shareContent, setShareContent] = useState(null);

  const prepareSharePreview = (content) => {
    setShareContent({
      ...content,
      analogy: getEditedOrDefault('analogy', content.analogy),
      action: getEditedOrDefault('action', content.action),
      workText: getEditedOrDefault('workText', content.workText),
      med_complaint: getEditedOrDefault('med_complaint', content.med_complaint),
      med_reference: getEditedOrDefault('med_reference', content.med_reference),
      selfCare: getEditedOrDefault('selfCare', content.selfCare),
      identity: identity
    });
    setShowSharePreview(true);
  };

  const confirmShare = async () => {
    if (!shareContent) return;
    setIsLoading(true);

    try {
      const cvs = document.createElement('canvas');
      const ctx = cvs.getContext('2d');
      const fullText = getFullShareText(shareContent.identity, shareContent, t);

      const textWidth = 480;
      const charPerLine = 22;
      const estimatedLines = Math.ceil(fullText.length / charPerLine) + (fullText.split('\n').length * 1.5);
      const textHeight = estimatedLines * 28 + 150;

      cvs.width = 600;
      cvs.height = 600 + textHeight;

      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, cvs.width, cvs.height);

      const mainImg = new Image();
      await new Promise((resolve, reject) => {
        mainImg.onload = resolve;
        mainImg.onerror = reject;
        mainImg.src = shareContent.historyImg || imgUrl;
      });

      const maxDim = 520;
      const ratio = Math.min(maxDim / mainImg.width, maxDim / mainImg.height);
      const drawW = mainImg.width * ratio;
      const drawH = mainImg.height * ratio;
      const drawX = 40 + (maxDim - drawW) / 2;
      const drawY = 40 + (maxDim - drawH) / 2;
      ctx.drawImage(mainImg, drawX, drawY, drawW, drawH);

      ctx.fillStyle = '#1c1c1c';
      roundRect(ctx, 30, 580, 540, textHeight - 40, 20);
      ctx.fill();

      ctx.fillStyle = '#ff9800';
      ctx.font = 'bold 26px sans-serif';
      const titleMap = {
        partner: t('shareCard.titles.partner'),
        work: t('shareCard.titles.work'),
        doctor: t('shareCard.titles.doctor'),
        self: t('shareCard.titles.self')
      };
      ctx.fillText(titleMap[shareContent.identity], 60, 630);

      ctx.fillStyle = '#eee';
      ctx.font = '16px "Microsoft YaHei", sans-serif';
      wrapText(ctx, fullText, 60, 680, 480, 30);

      ctx.fillStyle = '#444';
      ctx.font = '12px sans-serif';
      ctx.fillText(t('shareCard.footer'), 60, cvs.height - 40);

      const finalUrl = cvs.toDataURL('image/jpeg', 0.9);
      const blob = await (await fetch(finalUrl)).blob();
      const file = new File([blob], 'painscape_share.jpg', { type: 'image/jpeg' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: t('sharePreview.shareTitle'),
            files: [file]
          });
          setShowSharePreview(false);
        } catch (e) {
          if (e.name === 'AbortError') return;
          const link = document.createElement('a');
          link.href = finalUrl;
          link.download = `PainScape_${Date.now()}.jpg`;
          link.click();
        }
      } else {
        const link = document.createElement('a');
        link.href = finalUrl;
        link.download = `PainScape_${Date.now()}.jpg`;
        link.click();
        alert(t('toast.shareSaved'));
        setShowSharePreview(false);
      }
    } catch (e) {
      console.error("生成分享卡片失败:", e);
      alert(t('toast.shareFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  const isSideEmpty = (side) => {
    const totalCount = Object.values(brushCounts.current).reduce((a, b) => a + b, 0);
    if (totalCount > 10) return false;
    if (dynamicParticles.current && dynamicParticles.current.some(dp => dp.bodyMode === side)) {
      return false;
    }
    return true;
  };

  const handlePublishPost = async () => {
    if (!postText) return alert(t('toast.postRequired'));

    const dominant = getDominantPain();
    const content = generateContent(dominant);

    const newPost = {
      text: postText,
      img: imgUrl,
      painTags: [dominant],
      group: groupFilter === 'all' ? 'family' : groupFilter,
      analogy: content.analogy,
      lang: targetLanguage,
      likes: 0,
      hugs: 0,
      restReminders: 0,
      hasUserHugged: false,
      userExperience: null,
      experienceTags: [],
    };

    const updatedPosts = await publishToCommunity(newPost);
    if (updatedPosts) {
      setPosts(updatedPosts);
    } else {
      const localPost = { ...newPost, id: Date.now() };
      setPosts(prev => [localPost, ...prev]);
    }

    setShowPostModal(false);
    setPostText("");

    setTimeout(() => {
      const tagStats = getPainTagStats();
      const myTag = dominant;
      let sameCount = tagStats[myTag] || 0;
      if (sameCount < 3) {
        sameCount = sameCount + Math.floor(Math.random() * 6) + (3 - sameCount);
      }
      alert(t('toast.publishSuccess', { count: sameCount, pain: t(`painNames.${myTag}`) }));
    }, 300);

    setPage("community");
  };

  const handleCreateGroup = () => {
    const name = prompt(t('community.createGroupPrompt'));
    if (name) {
      const newId = 'group_' + Date.now();
      setCommunityGroups([...communityGroups, { id: newId, name: `💬 ${name}` }]);
      alert(t('community.groupCreated', { name }));
    }
  };

  const togglePref = (pref) => {
    if (pref === 'alone') setUserPrefs(['alone']);
    else {
      let next = userPrefs.filter(p => p !== 'alone');
      next = next.includes(pref) ? next.filter(p => p !== pref) : [...next, pref];
      setUserPrefs(next.length === 0 ? ['care'] : next);
    }
  };

  const generateContent = (overrideType, externalLlm = null, externalReportData = null) => {
    // 1. 自动合并当前状态或外来注入的 AI 响应
    const activeLlm = externalReportData || externalLlm || currentReportData || llmData;
    const hasLlm = activeLlm && (activeLlm.status === 'success' || activeLlm.chief_complaint || activeLlm.present_illness);

    const dominant = overrideType || getDominantPain();

    // 2. 本地模板（当后端离线或未部署时使用）
    let painName = t(`painNames.${dominant}`) || "痛经";
    let defaultAnalogy = t(`painTemplates.${dominant}.analogy`) || "强烈的痛觉。";
    let defaultSelfCare = t(`painTemplates.${dominant}.selfCare`) || "好好休息。";

    // 格式化伴随症状
    const symptomsText = (medicalBackground.accompanyingSymptomsArr || [])
      .map(s => t(`onboarding.accompanyingOptions.${s}`) || s)
      .join('、') || "无明显伴随症状";

    let defaultComplaint = `月经期出现下腹部周期性${painName}，伴${symptomsText}1天。`;
    let defaultPresentIllness = `患者自述既往月经规律。自述于今日（行经第${cycleDay || 'X'}天）突发${painName}。图像特征向量重构显示：痛感评分较高，伴有典型的${defaultAnalogy}，活动受限。`;
    let defaultClinicalDiagnosis = `结合痛觉成像，建议排查子宫内膜异位症、子宫平滑肌痉挛或盆腔器质性充血。建议行妇科超声筛查。`;

    // 伴侣陪伴动作
    let partnerActionsList = [];
    const prefKey = userPrefs[0] || 'care';
    const actionsTemplates = t(`partnerActions.${prefKey}`, { returnObjects: true }) || [];
    const formattedActions = Array.isArray(actionsTemplates)
      ? actionsTemplates.map(act => act.replace('{{med}}', "布洛芬"))
      : ["☑️ 帮她热敷小腹并准备好止痛药。"];
    let defaultAction = formattedActions.join('\n');

    // 请假模板
    let defaultWorkText = t('workTemplate')
      ? t('workTemplate').replace('{{pain}}', painName)
      : `领导您好：本人今日突发严重痛经（${painName}），申请休假一天，望批准。`;

    // 3. 核心映射：如果后端 AI 返回了结构化分析，直接渲染 AI 精准生成的文本
    if (hasLlm) {
      return {
        pain: activeLlm.pain || painName,
        analogy: activeLlm.analogy || defaultAnalogy,
        workText: activeLlm.workText || activeLlm.work || defaultWorkText,
        action: activeLlm.action || defaultAction,
        selfCare: activeLlm.selfCare || defaultSelfCare,
        // 绑定病历字段
        chief_complaint: activeLlm.chief_complaint || activeLlm.med_complaint || defaultComplaint,
        present_illness: activeLlm.present_illness || activeLlm.med_reference || defaultPresentIllness,
        past_history: activeLlm.past_history || "平素健康状况良好。无明确高血压、糖尿病等慢性病史，无外科手术及食物药物过敏记录。",
        menstrual_history: activeLlm.menstrual_history || "月经史：13岁初潮，经期5天，周期28-30天。",
        clinical_diagnosis: activeLlm.clinical_diagnosis || defaultClinicalDiagnosis,
        clinical_suggestions: activeLlm.clinical_suggestions || "建议温敷小腹与腰骶，静卧休养。若症状持续加剧建议常规门诊行超声探查。",
        exam_advice: activeLlm.exam_advice || null
      };
    }

    // 确保所有字段与 UI 排版强对齐
    return {
      pain: painName,
      analogy: defaultAnalogy,
      workText: defaultWorkText,
      action: defaultAction,
      selfCare: defaultSelfCare,
      chief_complaint: defaultComplaint,
      present_illness: defaultPresentIllness,
      past_history: "平素健康状况良好。无明确高血压、糖尿病等慢性病史，无外科手术及食物药物过敏记录。",
      menstrual_history: "月经史：13岁初潮，经期5天，周期28-30天（5/28-30天）。",
      clinical_diagnosis: defaultClinicalDiagnosis,
      clinical_suggestions: "温敷小腹与腰骶，静卧休养。若症状持续加剧建议常规门诊行超声探查。",
      exam_advice: null
    };
  };

  const getEditedOrDefault = (key, defaultVal) =>
    editedContents[key] !== undefined ? editedContents[key] : defaultVal;

  const EditableBlock = ({ fieldKey, defaultValue, color = '#ccc', style = {} }) => {
    const value = getEditedOrDefault(fieldKey, defaultValue);
    const isEditing = editingField === fieldKey;

    if (isEditing) {
      return (
        <textarea
          autoFocus
          value={value}
          onChange={e => setEditedContents(prev => ({ ...prev, [fieldKey]: e.target.value }))}
          onBlur={() => setEditingField(null)}
          style={{
            width: '100%', background: 'rgba(255,255,255,0.05)',
            color: '#fff', border: '1px solid #555', borderRadius: '8px',
            padding: '10px', fontSize: '13px', lineHeight: '1.6',
            resize: 'vertical', minHeight: '80px', boxSizing: 'border-box',
            fontFamily: 'inherit', ...style
          }}
        />
      );
    }

    return (
      <div
        onClick={() => setEditingField(fieldKey)}
        title={t('editable.clickToEdit')}
        style={{
          color, fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap',
          cursor: 'text', padding: '6px 8px', borderRadius: '6px',
          border: '1px dashed transparent',
          transition: 'border-color 0.2s',
          ...style
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#555'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
      >
        {value}
        <span style={{ marginLeft: '6px', fontSize: '10px', color: '#555', verticalAlign: 'middle' }}>✏️</span>
      </div>
    );
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert(t('toast.copySuccess'));
    }).catch(err => {
      console.error('复制失败', err);
      alert(t('toast.copyFailed'));
    });
  };

  const calculateSpatialMap = () => {
    if (bodyMode === 'none') return null;
    const positions = particlePositions.current;
    if (positions.length === 0) return null;

    const canvasHeight = window.innerHeight;
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
      upperBody: parseFloat((upper / total).toFixed(2))
    };
  };

  const calculateTimeRhythm = () => {
    const particles = dynamicParticles.current;
    if (particles.length === 0) return null;

    let morning = 0;
    let afternoon = 0;
    let night = 0;

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
          : 'night'
    };
  };

  const calcEmotionLoad = () => {
    const avgSpeed = speedHistory.current.length > 0
      ? speedHistory.current.reduce((a, b) => a + b, 0) / speedHistory.current.length : 0;
    const colorWeight = { crimson: 1.0, purple: 0.8, dark: 0.6, blue: 0.3 };
    const coverage = Object.values(brushCounts.current).reduce((a, b) => a + b, 0);

    const raw = (avgSpeed / 30) * 40 + (colorWeight[activeColor] || 0.5) * 30 + Math.min(coverage / 200, 1) * 30;
    return Math.min(Math.round(raw), 100);
  };

  const calculateIntensity = () => {
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
      avgPressure: parseFloat(avgPressure.toFixed(2))
    };
  };

  const getDominantPain = () => {
    const counts = brushCounts.current;
    const maxVal = Math.max(...Object.values(counts));
    return maxVal > 0 ? Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b) : 'twist';
  };

  const handleRefine = async (fieldKey) => {
    if (!refineInput.trim() || refiningField) return;
    setRefiningField(fieldKey);

    const fieldToContentKey = {
      'analogy': 'analogy',
      'work': 'workText',
      'workText': 'workText',
      'med_complaint': 'med_complaint',
      'med_reference': 'med_reference',
      'selfCare': 'selfCare',
      'selfcare': 'selfCare',
      'action': 'action',
    };
    const contentKey = fieldToContentKey[fieldKey] || fieldKey;
    const currentText = getEditedOrDefault(contentKey, generateContent()[contentKey]);

    if (!currentText) {
      showToast('refineEmpty');
      setRefiningField(null);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field: fieldKey,
          currentText: currentText,
          userFeedback: refineInput,
          targetLanguage: targetLanguage,
        })
      });

      if (!res.ok) throw new Error(`请求失败: ${res.status}`);
      const data = await res.json();
      const refined = data.refined;

      if (refined && refined.trim()) {
        setEditedContents(prev => ({ ...prev, [contentKey]: refined }));
        setRefineInput('');
        showToast('refineSuccess');
      } else {
        showToast('refineEmpty');
      }
    } catch (err) {
      console.error('优化失败:', err);
      showToast('refineFailed');
    } finally {
      setRefiningField(null);
    }
  };

  const handleQuickLogSubmit = async () => {
    setIsLoading(true);
    try {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 300; tempCanvas.height = 300;
      const ctx = tempCanvas.getContext('2d');
      ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, 300, 300);
      ctx.fillStyle = '#333'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(t('quickLog.title'), 150, 150);
      const url = tempCanvas.toDataURL("image/jpeg", 0.5);
      setImgUrl(url);

      const fakeBrushCounts = { twist: 0, pierce: 0, heavy: 0, wave: 0, scrape: 0 };
      fakeBrushCounts[quickPainType] = quickPainScore * 5;
      brushCounts.current = fakeBrushCounts;

      speedHistory.current = [15];
      pressureHistory.current = [quickPainScore / 10];

      const dominant = quickPainType;
      let aiResult = null;

      const payload = {
        dominantPain: dominant,
        userPref: userPrefs.join(','),
        painScore: quickPainScore * 10,
        spatialMap: { abdomen: 0.8, lowerBack: 0.2, upperBody: 0 },
        intensityProfile: { avgSpeed: 15, peakSpeed: 25, avgPressure: quickPainScore / 10 },
        timeRhythm: calculateTimeRhythm() || { dominantPeriod: 'morning' },
        colorPalette: 'crimson',
        bodyMode: 'front',
        medicalBackground: medicalBackground,
        tonePreference: tonePreference,
        targetLanguage: targetLanguage,
        cycleDay: cycleDay || t('medical.cycleNotProvided'),
        accompanyingSymptoms: medicalBackground.accompanyingSymptomsArr || [],
        isQuickLog: true
      };

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000);
        const response = await fetch(`${API_BASE}/api/generate`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload), signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (response.ok) {
          aiResult = await response.json();
          setLlmData(aiResult);
          setCurrentReportData(aiResult);
        }
      } catch (err) {
        console.warn("快速记录请求后端失败，已进入本地计算模型", err);
      }

      const finalContent = generateContent(dominant, aiResult);
      const newRecord = {
        id: Date.now(),
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        img: url, type: dominant, painName: PAIN_NAME_MAP[dominant],
        content: finalContent,
        meta: { brushCounts: fakeBrushCounts, bodyMode: 'front', colorPalette: 'crimson', painScore: quickPainScore * 10, isQuickLog: true }
      };
      const newHistory = [newRecord, ...history].slice(0, 10);
      setHistory(newHistory);
      localStorage.setItem('painscape_history', JSON.stringify(newHistory));

      setPage("result");
    } catch (e) {
      console.error("快速记录提交出错:", e);
    } finally {
      setIsLoading(false);
    }
  };
  const triggerRandomScience = () => {
    const pickRandomItems = (arr, count) => {
      if (!arr || !Array.isArray(arr)) return [];
      // 随机洗牌算法
      const shuffled = [...arr].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
    };

    // 直接从 i18n 系统中安全读取当前语言版本的科普数据库
    const selfDb = t('result.science.selfCare', { returnObjects: true }) || [];
    const partnerDb = t('result.science.partner', { returnObjects: true }) || [];

    setRandomSelfCareTips(pickRandomItems(selfDb, 3));    // 随机抽 3 条女性科普
    setRandomPartnerTips(pickRandomItems(partnerDb, 3));   // 随机抽 3 条伴侣科普
  };
  const handleFinish = async () => {
    if (!p5Ref.current) return;
    setIsLoading(true);
    try {
      const url = generateCompositeCanvas();
      setImgUrl(url);
      const dominant = getDominantPain();
      let aiResult = null;

      // 1. 组装更具包容性的多维特征向量，确保在未绘画或未填写时不传递 null 导致后端 422
      const payload = {
        appMode: appMode, // ⚠️ 显式传递当前模式：'medical' 或 'general'
        dominantPain: dominant,
        userPref: userPrefs.join(','),
        painScore: Object.values(brushCounts.current).reduce((sum, v) => sum + v, 0) || 10,
        spatialMap: calculateSpatialMap() || { abdomen: 0.5, lowerBack: 0.5, upperBody: 0 },
        intensityProfile: calculateIntensity() || { avgSpeed: 5.0, peakSpeed: 10.0, avgPressure: 0.5 },
        timeRhythm: calculateTimeRhythm() || { morning: 0.33, afternoon: 0.33, night: 0.34, dominantPeriod: 'morning' },
        colorPalette: activeColor || 'crimson',
        bodyMode: bodyMode,
        medicalBackground: {
          diagnosed: medicalBackground.diagnosed || "",
          allergies: medicalBackground.allergies || "",
          age: medicalBackground.age || "",
          lifestyle: medicalBackground.lifestyle || "",
          activityLevel: medicalBackground.activityLevel || "",
          familyHistory: medicalBackground.familyHistory || "",
          psychosocial: medicalBackground.psychosocial || "",
          reproductiveHistory: medicalBackground.reproductiveHistory || "",
          height: medicalBackground.height ? String(medicalBackground.height) : "",
          weight: medicalBackground.weight ? String(medicalBackground.weight) : "",
          otherDiagnosis: medicalBackground.otherDiagnosis || "",
          otherAllergies: medicalBackground.otherAllergies || "",
          surgicalHistory: medicalBackground.surgicalHistory || "",
          menarcheAge: medicalBackground.menarcheAge ? String(medicalBackground.menarcheAge) : "",
          cycleRegular: medicalBackground.cycleRegular || "",
          periodDuration: medicalBackground.periodDuration || "",
          lastPeriod: medicalBackground.lastPeriod || "",
          familyHistoryArr: medicalBackground.familyHistoryArr || [],
          lifestyleArr: medicalBackground.lifestyleArr || [],
          reproductiveHistoryArr: medicalBackground.reproductiveHistoryArr || [],
          accompanyingSymptomsArr: medicalBackground.accompanyingSymptomsArr || []
        },
        targetLanguage: targetLanguage,
        tonePreference: tonePreference,
        cycleDay: cycleDay || "未提供",
        accompanyingSymptoms: medicalBackground.accompanyingSymptomsArr || []
      };

      // 2. 内部网络请求的安全隔离 Try-Catch（仅执行一次请求）
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 95000); // 预留 Render 唤醒时间

        const response = await fetch(`${API_BASE}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          aiResult = await response.json();

          // === 【诊断锁 1】：检测后端是否因大模型报错启动了静默降级 ===
          if (aiResult && aiResult.is_fallback) {
            console.warn("⚠️ 【大模型调用警告】：后端接口访问成功，但大模型引擎报错并启用了降级病历！");
            console.warn("❌ 大模型具体报错原因 (来自 Render 容器):", aiResult.error_detail);
          } else {
            console.log("🎉 【大模型调用成功】：已成功获取大模型转译的深度数据！");
          }

          // 仅在数据确认读取与验证后更新一次状态
          setLlmData(aiResult);
          setCurrentReportData(aiResult);
        } else {
          // === 【诊断锁 2】：检测并打印 FastAPI 的 Pydantic 422/500 校验错误体 ===
          const errBody = await response.json();
          console.error(`❌ 【后端响应错误 (HTTP ${response.status})】：请求被 FastAPI 拒绝。校验失败详情:`, errBody);
          setLlmData(null);
          setCurrentReportData(null);
        }
      } catch (err) {
        console.error("❌ 【网络连接失败】：无法穿透连接至 Render 服务器，转入本地模式", err);
        setLlmData(null);
        setCurrentReportData(null);
      }

      // 3. 整合本地与远端数据，生成最终报告内容
      const finalContent = generateContent(dominant, aiResult);

      const newRecord = {
        id: Date.now(),
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        img: url,
        type: dominant,
        painName: PAIN_NAME_MAP[dominant],
        content: finalContent,
        meta: {
          brushCounts: { ...brushCounts.current },
          bodyMode,
          colorPalette: activeColor,
          painScore: Object.values(brushCounts.current).reduce((a, b) => a + b, 0),
          dominantPeriod: calculateTimeRhythm()?.dominantPeriod || 'morning'
        }
      };

      // 4. 写入本地历史记录
      const newHistory = [newRecord, ...history];
      if (newHistory.length > 100) newHistory.pop();
      setHistory(newHistory);
      localStorage.setItem('painscape_history', JSON.stringify(newHistory));
      triggerRandomScience();
      setPage("result");
    } catch (e) {
      console.error("生成流程发生异常:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const updateRecordInfo = (recordId, field, value) => {
    const updatedHistory = history.map(r =>
      r.id === recordId ? { ...r, [field]: value } : r
    );
    setHistory(updatedHistory);
    localStorage.setItem('painscape_history', JSON.stringify(updatedHistory));

    if (viewingDiary?.id === recordId) {
      setViewingDiary({ ...viewingDiary, [field]: value });
    }
  };

  const TrendSummary = ({ history }) => {
    if (history.length < 2) return null;

    const recent = history.slice(0, 5);
    const typeFreq = recent.reduce((acc, r) => {
      acc[r.painName] = (acc[r.painName] || 0) + 1;
      return acc;
    }, {});
    const sortedTypes = Object.entries(typeFreq).sort((a, b) => b[1] - a[1]);
    const dominant = sortedTypes.length > 0 ? sortedTypes[0] : ['未知', 0];

    const gaps = history.slice(0, -1).map((r, i) => {
      const d1 = new Date(history[i + 1].date.replace(/\//g, '-'));
      const d2 = new Date(r.date.replace(/\//g, '-'));
      return Math.abs((d2 - d1) / (1000 * 60 * 60 * 24));
    }).filter(d => !isNaN(d));

    const avgGap = gaps.length > 0 ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 0;

    return (
      <div style={{ background: '#1a1a1a', borderRadius: '12px', padding: '15px', marginBottom: '20px', border: '1px solid #333' }}>
        <p style={{ color: '#fff', fontWeight: 'bold', margin: '0 0 10px 0', fontSize: '13px' }}>{t('history.trendTitle')}</p>
        <div style={{ display: 'flex', gap: '15px' }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ color: '#ef9a9a', fontSize: '20px', fontWeight: 'bold' }}>{dominant[0]}</div>
            <div style={{ color: '#666', fontSize: '11px', marginTop: '4px' }}>{t('history.trendMostCommon')}</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ color: '#90caf9', fontSize: '20px', fontWeight: 'bold' }}>~{avgGap}{t('history.days')}</div>
            <div style={{ color: '#666', fontSize: '11px', marginTop: '4px' }}>{t('history.trendAvgInterval')}</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ color: '#a5d6a7', fontSize: '20px', fontWeight: 'bold' }}>{history.length}</div>
            <div style={{ color: '#666', fontSize: '11px', marginTop: '4px' }}>{t('history.trendTotal')}</div>
          </div>
        </div>
        {avgGap > 0 && (avgGap < 25 || avgGap > 35) ? (
          <p style={{ color: '#ff9800', fontSize: '11px', margin: '10px 0 0 0', padding: '8px', background: 'rgba(255,152,0,0.08)', borderRadius: '6px' }}>
            {t('history.trendDeviation')}
          </p>
        ) : null}
      </div>
    );
  };

  const [collapsedMonths, setCollapsedMonths] = useState({});
  const toggleMonth = (month) => {
    setCollapsedMonths(prev => ({
      ...prev,
      [month]: !prev[month]
    }));
  };

  return (
    <>
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          25% { transform: scale(1.15); }
          50% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
      `}</style>
      <div style={{ position: 'fixed', top: 0, left: 0, zIndex: 1 }}>
        <Sketch setup={setup} draw={draw} preload={preload} mouseWheel={mouseWheel} mouseReleased={mouseReleased} touchEnded={mouseReleased} />
      </div>

      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 100, pointerEvents: 'auto', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>

        {/* === Splash 开屏页 === */}
        {page === "splash" && (
          <div style={{ pointerEvents: 'auto', background: '#050505', width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', boxSizing: 'border-box', opacity: splashOpacity, transition: 'opacity 1s ease-in-out' }}>
            <h1 style={{ color: '#fff', letterSpacing: '8px', marginBottom: '40px' }}>PainScape</h1>
            <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.8', textAlign: 'center', fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>{quote}</p>
          </div>
        )}

        {/* === 模式选择页面 === */}
        {/* === 模式选择页面 === */}
        {page === "modeSelection" && (() => {
          const isMedical = selectedTempMode === "medical";
          const activeColor = isMedical ? "rgb(211, 47, 47)" : "rgb(76, 175, 80)";
          const activeShadow = isMedical ? "rgba(211, 47, 47, 0.25)" : "rgba(76, 175, 80, 0.25)";

          return (
            <div style={{
              pointerEvents: 'auto',
              width: '100vw',
              height: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#050505',
              padding: '24px',
              boxSizing: 'border-box'
            }}>
              {/* 优化后的卡片物理外框 */}
              <div style={{
                width: '100%',
                maxWidth: '460px',
                background: '#121212',
                border: '1px solid #222',
                borderRadius: '28px',
                padding: '36px 32px',
                boxSizing: 'border-box',
                boxShadow: '0 12px 45px rgba(0,0,0,0.65)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}>
                {/* 标题 */}
                <h2 style={{
                  color: '#fff',
                  marginBottom: '28px',
                  fontSize: '22px',
                  fontWeight: '600',
                  letterSpacing: '1px',
                  textAlign: 'center'
                }}>
                  {t('modeSelection.title')}
                </h2>

                {/* 档位滑块：就诊协助 / 日常自愈 切换 */}
                <div style={{
                  display: 'flex',
                  background: '#1a1a1a',
                  borderRadius: '30px',
                  padding: '5px',
                  width: '100%',
                  marginBottom: '28px',
                  boxSizing: 'border-box',
                  position: 'relative',
                  border: '1px solid #2a2a2a'
                }}>
                  {/* 左档位：就诊协助 */}
                  <button
                    onClick={() => setSelectedTempMode("medical")}
                    style={{
                      flex: 1,
                      padding: '12px 0',
                      borderRadius: '25px',
                      background: isMedical ? 'rgb(211, 47, 47)' : 'transparent',
                      color: isMedical ? '#fff' : '#888',
                      border: 'none',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      zIndex: 2,
                      boxShadow: isMedical ? '0 3px 12px rgba(211, 47, 47, 0.4)' : 'none'
                    }}
                  >
                    {t('modeSelection.medicalTab')}
                  </button>

                  {/* 右档位：日常自愈 */}
                  <button
                    onClick={() => setSelectedTempMode("general")}
                    style={{
                      flex: 1,
                      padding: '12px 0',
                      borderRadius: '25px',
                      background: !isMedical ? 'rgb(76, 175, 80)' : 'transparent',
                      color: !isMedical ? '#fff' : '#888',
                      border: 'none',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      zIndex: 2,
                      boxShadow: !isMedical ? '0 3px 12px rgba(76, 175, 80, 0.4)' : 'none'
                    }}
                  >
                    {t('modeSelection.generalTab')}
                  </button>
                </div>

                {/* 特色功能卡片 */}
                <div style={{
                  width: '100%',
                  background: '#161616',
                  border: `1.5px solid ${activeColor}`,
                  borderRadius: '20px',
                  padding: '28px 24px',
                  boxSizing: 'border-box',
                  boxShadow: `0 0 25px ${activeShadow}`,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  marginBottom: '24px',
                  minHeight: '148px'
                }}>
                  {(isMedical
                    ? t('modeSelection.medicalFeatures', { returnObjects: true })
                    : t('modeSelection.generalFeatures', { returnObjects: true })
                  ).map((featureText, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span style={{ color: activeColor, fontSize: '18px', fontWeight: 'bold' }}>✓</span>
                      <span style={{ color: '#eee', fontSize: '15px', lineHeight: '1.5' }}>{featureText}</span>
                    </div>
                  ))}
                </div>

                {/* 核心基础支持功能 */}
                <div style={{
                  width: '100%',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '10px',
                  justifyContent: 'center',
                  marginBottom: '36px',
                  padding: '0 8px'
                }}>
                  {t('modeSelection.commonFeatures', { returnObjects: true }).map((commonText, idx) => (
                    <span
                      key={idx}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '20px',
                        padding: '6px 14px',
                        fontSize: '13px',
                        color: '#888',
                        whiteSpace: 'nowrap',
                        letterSpacing: '0.5px'
                      }}
                    >
                      {commonText}
                    </span>
                  ))}
                </div>

                {/* 底部真正确认按钮 */}
                <button
                  onClick={() => {
                    setAppMode(selectedTempMode);
                    setPage("onboarding");
                    if (selectedTempMode === "general") {
                      setShowContent("preference");
                    } else {
                      setShowContent("basicInfo");
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '16px 0',
                    background: activeColor,
                    color: '#fff',
                    border: 'none',
                    borderRadius: '30px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.25s',
                    boxShadow: `0 4px 20px ${activeShadow}`,
                    letterSpacing: '1px'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {t('modeSelection.confirmBtn')}
                </button>
              </div>
            </div>
          );
        })()}

        {/* === Onboarding 引导配置页面 === */}
        {page === "onboarding" && (
          <div style={{
            pointerEvents: 'auto',
            background: '#0a0a0a',
            width: '100vw',
            height: '100vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: '20px',
            paddingBottom: '120px',
            boxSizing: 'border-box',
            maxWidth: '500px',
            margin: '0 auto'
          }}>
            <div style={{
              display: 'flex',
              background: '#141414',
              borderRadius: '20px',
              padding: '3px',
              width: '100%',
              maxWidth: '320px',
              border: '1px solid #2d2d2d',
              boxSizing: 'border-box',
              marginTop: '10px',
              marginBottom: '10px'
            }}>
              <button
                onClick={() => setAppMode("medical")}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: '16px', border: 'none', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold',
                  background: appMode === 'medical' ? '#d32f2f' : 'transparent',
                  color: appMode === 'medical' ? '#fff' : '#666',
                  transition: 'all 0.25s'
                }}
              >
                🏥 {t('modeSelection.medicalTab').split(' ')[1] || '就诊协助'}
              </button>
              <button
                onClick={() => {
                  setAppMode("general");
                  // 自动降级底图视图防止盲画数据干扰
                  setBodyMode("front");
                }}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: '16px', border: 'none', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold',
                  background: appMode === 'general' ? '#4caf50' : 'transparent',
                  color: appMode === 'general' ? '#fff' : '#666',
                  transition: 'all 0.25s'
                }}
              >
                🎨 {t('modeSelection.generalTab').split(' ')[1] || '日常表达'}
              </button>
            </div>
            {/* 使用提示控制按钮 */}
            <div style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 10 }}>
              <button onClick={() => setShowGuide(!showGuide)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#888', width: '32px', height: '32px', borderRadius: '50%', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ?
              </button>
              {showGuide && (
                <div style={{
                  position: 'absolute', top: '40px', right: '0',
                  background: 'rgba(20,20,20,0.97)', border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '16px', padding: '20px', width: '260px',
                  backdropFilter: 'blur(20px)', zIndex: 200
                }}>
                  <p style={{ color: '#eee', fontSize: '14px', fontWeight: 'bold', margin: '0 0 12px 0' }}>
                    {t('onboarding.guideTitle')}
                  </p>
                  {t('onboarding.guideItems').map(([title, desc], idx) => (
                    <div key={idx} style={{ marginBottom: '8px' }}>
                      <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>{title}</span>
                      <p style={{ color: '#888', fontSize: '11px', margin: '2px 0 0 0' }}>{desc}</p>
                    </div>
                  ))}
                  <button onClick={() => setShowGuide(false)} style={{ marginTop: '8px', width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#666', padding: '6px', borderRadius: '10px', fontSize: '10px', cursor: 'pointer' }}>
                    {t('onboarding.gotIt')}
                  </button>
                </div>
              )}
            </div>

            <h1 style={{ color: '#fff', marginBottom: '5px', fontSize: '2rem', marginTop: '20px' }}>PainScape</h1>
            <p style={{ color: '#aaa', marginBottom: '20px' }}>{t('app.subtitle')}</p>

            {/* 核心卡片容器：消除了内层滑动卡片，全屏平铺 */}
            <div style={{ width: '100%', boxSizing: 'border-box' }}>

              {/* === STEP 1: 基础常态信息 === */}
              {showContent === 'basicInfo' && appMode !== 'general' && (
                <div style={{ background: '#1c1c1c', borderRadius: '20px', padding: '20px', border: '1px solid #333' }}>
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <span style={{ fontSize: '28px' }}>📋</span>
                    <h3 style={{ color: '#fff', fontSize: '16px', margin: '8px 0 4px 0', fontWeight: '500' }}>基础生理档案</h3>
                    <p style={{ color: '#888', fontSize: '11px', margin: 0 }}>这些常态基础指标将被本地保存，避免重复录入</p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>您的年龄段</label>
                      <select value={medicalBackground.age} onChange={(e) => setMedicalBackground({ ...medicalBackground, age: e.target.value })}
                        style={{ width: '100%', padding: '12px', background: '#111', color: '#fff', border: '1.5px solid #333', borderRadius: '12px', fontSize: '13px' }}>
                        {Object.entries(t('onboarding.ageOptions')).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>{t('onboarding.heightLabel')}</label>
                        <input type="number" placeholder={t('onboarding.heightPlaceholder')} value={medicalBackground.height}
                          onChange={(e) => setMedicalBackground({ ...medicalBackground, height: e.target.value })}
                          style={{ width: '100%', padding: '12px', background: '#111', color: '#fff', border: '1.5px solid #333', borderRadius: '12px', fontSize: '13px', boxSizing: 'border-box' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>{t('onboarding.weightLabel')}</label>
                        <input type="number" placeholder={t('onboarding.weightPlaceholder')} value={medicalBackground.weight}
                          onChange={(e) => setMedicalBackground({ ...medicalBackground, weight: e.target.value })}
                          style={{ width: '100%', padding: '12px', background: '#111', color: '#fff', border: '1.5px solid #333', borderRadius: '12px', fontSize: '13px', boxSizing: 'border-box' }} />
                      </div>
                    </div>

                    <div>
                      <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>日常活动负荷</label>
                      <select value={medicalBackground.activityLevel} onChange={(e) => setMedicalBackground({ ...medicalBackground, activityLevel: e.target.value })}
                        style={{ width: '100%', padding: '12px', background: '#111', color: '#fff', border: '1.5px solid #333', borderRadius: '12px', fontSize: '13px' }}>
                        {Object.entries(t('onboarding.activityOptions')).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <CollapsibleMultiSelect
                        label={t('onboarding.lifestyleTitle') || '日常习惯'}
                        options={[
                          { value: 'sleepShort', label: '睡眠时长不足' },
                          { value: 'sleepIrregular', label: '作息紊乱/夜班' },
                          { value: 'smoking', label: '吸烟' },
                          { value: 'alcohol', label: '习惯饮酒' },
                          { value: 'caffeine', label: '浓茶咖啡过量' },
                          { value: 'coldFood', label: '喜食生冷冰饮' },
                          { value: 'spicy', label: '嗜食辛辣' },
                          { value: 'weightLoss', label: '处于极端减重期' }
                        ]}
                        selectedValues={medicalBackground.lifestyleArr || []}
                        onChange={(newValues) => setMedicalBackground({ ...medicalBackground, lifestyleArr: newValues })}
                        placeholder={t('onboarding.pleaseSelect') || '不详 / 未选择'}
                      />
                      <CollapsibleSingleSelect
                        label={t('onboarding.psychosocialLabel')}
                        options={[
                          { value: 'lowStress', label: '压力适宜' },
                          { value: 'moderateStress', label: '持续中度精神压力' },
                          { value: 'highStress', label: '重度焦虑/高压负荷' },
                          { value: 'trauma', label: '心理应激创伤' }
                        ]}
                        selectedValue={medicalBackground.psychosocial}
                        onChange={(value) => setMedicalBackground({ ...medicalBackground, psychosocial: value })}
                        placeholder={t('onboarding.pleaseSelect') || '不详 / 未选择'}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* === STEP 2: 医疗背景临床参数 (医疗协助模式专属) === */}
              {showContent === 'medical' && appMode !== 'general' && (
                <div style={{ background: '#1c1c1c', borderRadius: '20px', padding: '20px', border: '1px solid #333' }}>
                  {appMode === 'general' ? (
                    <div style={{ textAlign: 'center', padding: '40px 10px' }}>
                      <span style={{ fontSize: '32px' }}>💡</span>
                      <h4 style={{ color: '#fff', marginTop: '10px' }}>临床病史已隐藏</h4>
                      <p style={{ color: '#666', fontSize: '13px', lineHeight: '1.5' }}>您已选择日常表达/社群分享模式。无需搜集月经史等复杂背景，可直接在最后一步设置您的陪伴与自愈偏好。</p>
                    </div>
                  ) : (
                    <>
                      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                        <span style={{ fontSize: '28px' }}>🩺</span>
                        <h3 style={{ color: '#fff', fontSize: '16px', margin: '8px 0 4px 0', fontWeight: '500' }}>临床医学信息调查</h3>
                        <p style={{ color: '#888', fontSize: '11px', margin: 0 }}>以下采集项有助于精准拟合专科门诊所需的现病史及既往主诉</p>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* 临床月经史板块  */}
                        <div style={{ background: '#131313', borderRadius: '16px', padding: '14px', border: '1.5px solid #2d2d2d' }}>
                          <h4 style={{ color: '#eee', margin: '0 0 12px 0', fontSize: '13px', borderBottom: '1px solid #222', paddingBottom: '6px' }}>
                            {t('onboarding.menstrualHistoryTitle')}
                          </h4>

                          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>初潮年龄</label>
                              <input
                                type="number"
                                min="8"
                                max="20"
                                placeholder="例：13"
                                value={medicalBackground.menarcheAge}
                                onChange={(e) => setMedicalBackground({ ...medicalBackground, menarcheAge: e.target.value })}
                                style={{
                                  width: '100%',
                                  padding: '10px',
                                  background: '#111',
                                  color: '#fff',
                                  border: '1.5px solid #333',
                                  borderRadius: '12px',
                                  fontSize: '12px',
                                  boxSizing: 'border-box'
                                }}
                              />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>周期规律性</label>
                              <select
                                value={medicalBackground.cycleRegular}
                                onChange={(e) => setMedicalBackground({ ...medicalBackground, cycleRegular: e.target.value })}
                                style={{
                                  width: '100%',
                                  padding: '10px',
                                  background: '#111',
                                  color: '#fff',
                                  border: '1.5px solid #333',
                                  borderRadius: '12px',
                                  fontSize: '12px',
                                  boxSizing: 'border-box'
                                }}
                              >
                                <option value="">请选择</option>
                                <option value="regular">高度规律 (波动 ≤ 5天)</option>
                                <option value="irregular">不规律 (周期极度紊乱)</option>
                                <option value="unsure">不确定</option>
                              </select>
                            </div>
                          </div>

                          <div style={{ marginBottom: '12px' }}>
                            <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>经期持续天数</label>
                            <select
                              value={medicalBackground.periodDuration || ''}
                              onChange={(e) => setMedicalBackground({ ...medicalBackground, periodDuration: e.target.value })}
                              style={{
                                width: '100%',
                                padding: '10px',
                                background: '#111',
                                color: '#fff',
                                border: '1.5px solid #333',
                                borderRadius: '12px',
                                fontSize: '12px'
                              }}
                            >
                              {Object.entries(t('onboarding.periodDurationOptions')).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                              ))}
                            </select>
                          </div>

                          <div style={{ marginBottom: '12px' }}>
                            <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>
                              末次月经第一天 (LMP)
                            </label>
                            <div style={{ position: 'relative', width: '100%' }}>
                              <style>{`
                              .dark-date-input::-webkit-calendar-picker-indicator {
                              filter: invert(1);
                              cursor: pointer;
                              opacity: 0.8;
                              padding: 4px;
                              }
                              .dark-date-input {
                              color-scheme: dark; /* 告诉浏览器渲染暗色调的原生日期选择面板 */
                            `}</style>
                              <input
                                type="date"
                                className="dark-date-input"
                                value={medicalBackground.lastPeriod || ''}
                                onChange={(e) => setMedicalBackground({ ...medicalBackground, lastPeriod: e.target.value })}
                                // 核心机制：点击输入框任意位置，强制唤起系统原生日期选择器
                                onClick={(e) => {
                                  try {
                                    if (typeof e.target.showPicker === 'function') {
                                      e.target.showPicker();
                                    }
                                  } catch (err) {
                                    console.warn("浏览器暂不支持 showPicker API", err);
                                  }
                                }}
                                style={{
                                  width: '100%',
                                  padding: '12px',
                                  background: '#111',
                                  color: '#fff',
                                  border: '1.5px solid #333',
                                  borderRadius: '12px',
                                  fontSize: '13px',
                                  boxSizing: 'border-box',
                                  cursor: 'pointer',
                                  WebkitAppearance: 'none', // 消除 iOS 下默认的内阴影
                                  appearance: 'none'
                                }}
                              />
                            </div>
                          </div>
                          {/* 周期阶段重构为时期：经前，经期，经后，排卵期 */}
                          <div>
                            <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '8px' }}>
                              当前处于什么时期
                            </label>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              {["经前", "经期", "经后", "排卵期"].map(item => (
                                <button
                                  key={item}
                                  onClick={() => setCycleDay(cycleDay === item ? '' : item)}
                                  style={{
                                    padding: '6px 14px',
                                    borderRadius: '20px',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    background: cycleDay === item ? '#d32f2f' : '#111',
                                    color: cycleDay === item ? '#fff' : '#888',
                                    border: cycleDay === item ? 'none' : '1.5px solid #333'
                                  }}
                                >
                                  {item}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        {/* 在 Onboarding Step 2 的月经史区块之后，追加伴随症状多选 */}
                        <div style={{ marginTop: '16px' }}>
                          <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '8px' }}>
                            {t('onboarding.accompanyingLabel')}
                          </label>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {Object.entries(t('onboarding.accompanyingOptions', { returnObjects: true })).map(([key, label]) => {
                              const isChecked = (medicalBackground.accompanyingSymptomsArr || []).includes(key);
                              return (
                                <label
                                  key={key}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px',
                                    background: isChecked ? 'rgba(211,47,47,0.1)' : '#111',
                                    border: isChecked ? '1px solid #d32f2f' : '1px solid #333',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    color: isChecked ? '#fff' : '#888'
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      const current = medicalBackground.accompanyingSymptomsArr || [];
                                      const next = current.includes(key) ? current.filter(v => v !== key) : [...current, key];
                                      setMedicalBackground({ ...medicalBackground, accompanyingSymptomsArr: next });
                                    }}
                                    style={{ margin: 0, cursor: 'pointer' }}
                                  />
                                  {label}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                        <div>
                          <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>妇科临床既往史诊断</label>
                          <select
                            value={medicalBackground.diagnosed}
                            onChange={(e) => setMedicalBackground({ ...medicalBackground, diagnosed: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '10px',
                              background: '#111',
                              color: '#fff',
                              border: '1.5px solid #333',
                              borderRadius: '12px',
                              fontSize: '12px'
                            }}
                          >
                            {Object.entries(t('onboarding.diagnosisOptions')).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>特异性抗炎药/NSAIDs过敏史</label>
                          <select
                            value={medicalBackground.allergies}
                            onChange={(e) => setMedicalBackground({ ...medicalBackground, allergies: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '10px',
                              background: '#111',
                              color: '#fff',
                              border: '1.5px solid #333',
                              borderRadius: '12px',
                              fontSize: '12px'
                            }}
                          >
                            {Object.entries(t('onboarding.allergyOptions')).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>外科手术史</label>
                            <select
                              value={medicalBackground.surgicalHistory}
                              onChange={(e) => setMedicalBackground({ ...medicalBackground, surgicalHistory: e.target.value })}
                              style={{
                                width: '100%',
                                padding: '10px',
                                background: '#111',
                                color: '#fff',
                                border: '1.5px solid #333',
                                borderRadius: '12px',
                                fontSize: '12px'
                              }}
                            >
                              {Object.entries(t('onboarding.surgicalHistoryOptions')).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                              ))}
                            </select>
                          </div>

                          <CollapsibleMultiSelect
                            label="一级亲属病史"
                            options={[
                              { value: 'mother', label: '母系痛经遗传史' },
                              { value: 'sister', label: '胞姐胞妹严重痛经史' },
                              { value: 'none', label: '明确无家族史' },
                              { value: 'unknown', label: '家族痛经史不详' }
                            ]}
                            selectedValues={medicalBackground.familyHistoryArr || []}
                            onChange={(newValues) => setMedicalBackground({ ...medicalBackground, familyHistoryArr: newValues })}
                            placeholder="请选择"
                          />
                        </div>

                        <CollapsibleMultiSelect
                          label="孕产/生育史"
                          options={[
                            { value: 'nulliparous', label: '从未孕育 (未曾受孕)' },
                            { value: 'pregnant', label: '目前妊娠中' },
                            { value: 'parous', label: '正常足月顺产/剖宫产分娩' },
                            { value: 'spontaneousAbortion', label: '自然流产史' },
                            { value: 'inducedAbortion', label: '人工终止妊娠/药物流产史' }
                          ]}
                          selectedValues={medicalBackground.reproductiveHistoryArr || []}
                          onChange={(newValues) => setMedicalBackground({ ...medicalBackground, reproductiveHistoryArr: newValues })}
                          placeholder="请选择"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* === STEP 3: 自愈与舒缓干预偏好 === */}
              {showContent === 'preference' && (
                <div style={{ background: '#1c1c1c', borderRadius: '20px', padding: '20px', border: '1px solid #333' }}>
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <span style={{ fontSize: '28px' }}>🎯</span>
                    <h3 style={{ color: '#fff', fontSize: '16px', margin: '8px 0 4px 0', fontWeight: '500' }}>舒缓干预偏好设定</h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <p style={{ color: '#888', fontSize: '12px', marginBottom: '12px', textAlign: 'center' }}>发作期间，您希望外界提供什么样的干预援助？</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {['alone', 'care', 'comfort'].map((p, i) => (
                          <button key={p} onClick={() => togglePref(p)} style={{
                            padding: '14px', borderRadius: '14px', textAlign: 'center',
                            background: userPrefs.includes(p) ? 'rgba(211, 47, 47, 0.1)' : '#111',
                            border: userPrefs.includes(p) ? '1.5px solid #d32f2f' : '1.5px solid #333',
                            color: userPrefs.includes(p) ? '#fff' : '#888',
                            cursor: 'pointer', transition: 'all 0.2s',
                            fontSize: '14px', fontWeight: userPrefs.includes(p) ? 'bold' : 'normal'
                          }}>
                            {t(`onboarding.preferences.${i}.title`)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p style={{ color: '#888', fontSize: '12px', marginBottom: '8px', textAlign: 'center' }}>
                        报告的智能转译语言语气
                      </p>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={() => setTonePreference('gentle')} style={{
                          flex: 1, padding: '12px', borderRadius: '12px', fontSize: '14px', cursor: 'pointer',
                          background: tonePreference === 'gentle' ? 'rgba(76, 175, 80, 0.15)' : '#111',
                          color: tonePreference === 'gentle' ? '#fff' : '#888',
                          border: tonePreference === 'gentle' ? '1.5px solid #4caf50' : '1.5px solid #333'
                        }}>
                          {t('onboarding.toneGentle')}
                        </button>
                        <button onClick={() => setTonePreference('direct')} style={{
                          flex: 1, padding: '12px', borderRadius: '12px', fontSize: '14px', cursor: 'pointer',
                          background: tonePreference === 'direct' ? 'rgba(33, 150, 243, 0.15)' : '#111',
                          color: tonePreference === 'direct' ? '#fff' : '#888',
                          border: tonePreference === 'direct' ? '1.5px solid #2196f3' : '1.5px solid #333'
                        }}>
                          {t('onboarding.toneDirect')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* === 控制底部导航条（自愈模式下仅显示干预偏好步骤） === */}
            {appMode !== 'general' && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '16px',
                marginTop: '30px',
                width: '100%',
                borderTop: '1px solid #222',
                paddingTop: '20px'
              }}>
                {[
                  { key: 'basicInfo', label: '1', title: '基础档案' },
                  { key: 'medical', label: '2', title: '医疗背景' },
                  { key: 'preference', label: '3', title: '干预偏好' },
                ].map((step) => (
                  <button
                    key={step.key}
                    onClick={() => setShowContent(step.key)}
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      border: showContent === step.key ? '2px solid #d32f2f' : '1px solid #444',
                      background: showContent === step.key ? 'rgba(211, 47, 47, 0.15)' : 'transparent',
                      color: showContent === step.key ? '#fff' : '#666',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                    title={step.title}
                  >
                    {step.label}
                  </button>
                ))}
              </div>
            )}
            {/* 绘制流程跳转按钮 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '24px', width: '100%' }}>

              {/* 条件 1：如果是医疗模式，且用户还没走到第三页，展示“下一步”引导用户 */}
              {appMode === 'medical' && showContent !== 'preference' ? (
                <button
                  onClick={() => {
                    if (showContent === 'basicInfo') setShowContent('medical');
                    else if (showContent === 'medical') setShowContent('preference');
                  }}
                  style={{
                    width: '200px',
                    padding: '14px',
                    background: '#1f1f1f',
                    color: '#eee',
                    border: '1px solid #333',
                    borderRadius: '30px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '15px',
                    transition: 'all 0.2s'
                  }}
                >
                  {t('onboarding.nextStep') || '下一步'}
                </button>
              ) : (
                /* 条件 2：医疗模式走到最后一页，或日常自愈模式，直接展现红色的“开始绘制”主按钮 */
                <button
                  onClick={() => {
                    if (appMode === 'medical') {
                      setBodyMode('front');
                    }
                    setPage("canvas");
                  }}
                  style={{
                    width: '200px',
                    padding: '14px',
                    background: '#d32f2f',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '30px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '15px',
                    boxShadow: '0 4px 15px rgba(211, 47, 47, 0.3)',
                    transition: 'transform 0.1s'
                  }}
                >
                  {t('onboarding.startDrawing')}
                </button>
              )}

              {/* 在医疗模式且处于前两步时，提供“直接绘制”的半透明跳过选项，关怀急性剧痛用户 */}
              {appMode === 'medical' && showContent !== 'preference' && (
                <button
                  onClick={() => {
                    setBodyMode('front');
                    setPage("canvas");
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#555',
                    fontSize: '12px',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    marginTop: '4px',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#888'}
                  onMouseLeave={e => e.currentTarget.style.color = '#555'}
                >
                  {t('onboarding.skipAndDraw') || '跳过配置，直接绘制'}
                </button>
              )}
            </div>

            <footer style={{
              marginTop: '40px',
              display: 'flex',
              gap: '24px',
              borderTop: '1px solid #222',
              paddingTop: '20px',
              width: '100%',
              justifyContent: 'center'
            }}>
              <button style={{ background: 'none', border: 'none', color: '#555', fontSize: '13px', cursor: 'pointer' }} onClick={() => setPage("community")}>
                {t('onboarding.exploreCommunity')}
              </button>
              <button style={{ background: 'none', border: 'none', color: '#555', fontSize: '13px', cursor: 'pointer' }} onClick={() => setPage("history")}>
                {t('onboarding.painDiary')}
              </button>
              <button style={{ background: 'none', border: 'none', color: '#555', fontSize: '13px', cursor: 'pointer' }} onClick={() => setTargetLanguage(targetLanguage === 'zh' ? 'en' : 'zh')}>
                {targetLanguage === 'zh' ? 'English' : '中文'}
              </button>
            </footer>
          </div>
        )}

        {/* === Canvas 绘画页面 === */}
        {page === "canvas" && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 10, pointerEvents: 'auto', userSelect: 'none', WebkitUserSelect: 'none' }}>

            {/* === 顶部高精简导航栏 === */}
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
                zIndex: 100
              }}
            >
              {/* 左侧控制区 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setPage("onboarding")}
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
                    justifyContent: 'center'
                  }}
                >
                  ←
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${isMuted ? '#444' : '#4caf50'}`,
                    borderRadius: '50%', width: '32px', height: '32px',
                    fontSize: '14px', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    color: isMuted ? '#666' : '#4caf50'
                  }}
                >
                  {isMuted ? '🔇' : '🔊'}
                </button>
              </div>

              {/* 中间：正反面切换 */}
              <div style={{
                display: 'flex',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '20px',
                padding: '2px',
                border: '1px solid #222'
              }}>
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
                    transition: 'all 0.2s'
                  }}
                  onClick={(e) => { e.stopPropagation(); setBodyMode('front'); }}
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
                    color: bodyMode === 'back' ? '#fff' : '#888'
                  }}
                  onClick={(e) => { e.stopPropagation(); setBodyMode('back'); }}
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
                      color: bodyMode === 'none' ? '#fff' : '#888'
                    }}
                    onClick={(e) => { e.stopPropagation(); setBodyMode('none'); }}
                  >
                    {t('canvas.bodyNone')}
                  </button>
                )}
              </div>

              {/* 右侧提交 */}
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
                  boxShadow: '0 4px 12px rgba(211,47,47,0.3)'
                }}
                onClick={handleFinish}
              >
                {t('canvas.generate')}
              </button>
            </div>

            {/* === 正背面方向提示 === */}
            <div style={{
              position: 'absolute',
              top: '90px', // 可以重新放回较靠上的位置
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0, 0, 0, 0.75)',
              padding: '6px 18px',
              borderRadius: '20px',
              fontSize: '11px',
              color: '#fff',
              pointerEvents: 'none',
              zIndex: 5,
              transition: 'opacity 0.4s ease', // 平滑淡出效果
              opacity: tipVisible ? 1 : 0      // 根据状态控制透明度
            }}>
              {bodyMode === 'front' && t('canvas.frontTip')}
              {bodyMode === 'back' && t('canvas.backTip')}
            </div>

            {/* === 悬浮缩放比例调节器 === */}
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
                  zIndex: 10
                }}
              >
                <span style={{ color: '#888', fontSize: '11px', whiteSpace: 'nowrap' }}>🗺️ 比例</span>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={bgScale}
                  onChange={(e) => setBgScale(parseFloat(e.target.value))}
                  style={{ accentColor: '#4caf50', width: '60px', height: '4px', cursor: 'pointer' }}
                />
                <span style={{ color: '#aaa', fontSize: '11px', minWidth: '32px' }}>{Math.round(bgScale * 100)}%</span>
              </div>
            )}

            {/* 右侧工具栏：撤销、恢复、清除、复位 */}
            <div
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              style={{ pointerEvents: 'auto', position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '180px', width: '30px', position: 'relative', justifyContent: 'flex-end' }}>
                <div style={{ color: '#888', fontSize: '9px', marginBottom: '4px', writingMode: 'vertical-rl' }}>
                  {t('canvas.emotionLoad')}
                </div>
                <div style={{ width: '6px', height: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{
                    position: 'absolute', bottom: 0, width: '100%',
                    height: `${calcEmotionLoad()}%`,
                    background: `linear-gradient(to top, #4caf50, #ff9800, #d32f2f)`,
                    borderRadius: '3px',
                    transition: 'height 0.3s ease-out'
                  }} />
                </div>
                <div style={{ color: calcEmotionLoad() > 70 ? '#d32f2f' : '#fff', fontSize: '12px', fontWeight: 'bold', marginTop: '6px' }}>
                  {calcEmotionLoad()}
                </div>
              </div>

              <button style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', border: '1px solid #444', borderRadius: '30px', width: '50px', height: '50px', fontSize: '24px', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); handleUndo(); }}>↩️</button>
              <button style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', border: '1px solid #444', borderRadius: '30px', width: '50px', height: '50px', fontSize: '24px', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); handleRedo(); }}>↪️</button>
              <button style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', border: '1px solid #444', borderRadius: '30px', width: '50px', height: '50px', fontSize: '24px', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); handleClear(); }}>🗑️</button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  camRef.current = { x: 0, y: 0, zoom: 1.0 };
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
                  justifyContent: 'center'
                }}
                title="重置视角"
              >
                🎯
              </button>
            </div>

            {/* 底部画笔控制栏 */}
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
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                {Object.keys(BRUSHES).map(k => (
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
                      cursor: 'pointer'
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
                          opacity: activeBrush === k ? 1 : 0.7
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: '20px', marginBottom: '4px' }}>{BRUSHES[k].icon}</span>
                    )}
                    <span>{t(`brushes.${k}.label`).split(" ")[1] || t(`brushes.${k}.label`)}</span>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
                  {Object.keys(PALETTES).map(k => (
                    <div key={k} style={{ width: '30px', height: '30px', borderRadius: '50%', border: activeColor === k ? '2px solid #fff' : '2px solid #444', background: `rgb(${PALETTES[k].color.join(',')})`, cursor: 'pointer', transform: activeColor === k ? 'scale(1.2)' : 'none' }} onClick={() => setActiveColor(k)} />
                  ))}
                </div>
                <span style={{ color: '#888', fontSize: '11px', marginTop: '6px', textAlign: 'center', display: 'block' }}>
                  {activeColor === 'crimson' ? t('colorDescriptions.crimson') :
                    activeColor === 'dark' ? t('colorDescriptions.dark') :
                      activeColor === 'purple' ? t('colorDescriptions.purple') :
                        t('colorDescriptions.blue')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* === Result 结果页面 === */}
        {page === "result" && (() => {
          try {
            const content = generateContent();
            const getRefinePlaceholder = (tabIdentity) => {
              const isEn = targetLanguage === 'en';
              switch (tabIdentity) {
                case 'partner': return isEn ? "e.g., Make it sound more urgent..." : "例如：语气更强烈一点，让Ta意识到严重性...";
                case 'work': return isEn ? "e.g., Make it brief and extremely professional..." : "例如：语气更委婉客观，只说突发急病...";
                case 'doctor': return isEn ? "e.g., Mention that Ibuprofen doesn't work..." : "例如：补充说明吃布洛芬没有任何缓解...";
                case 'self': return isEn ? "e.g., Comfort me, I feel guilty for not working..." : "例如：给我一点心理安慰，我因为请假很内疚...";
                default: return t('result.refine.placeholder');
              }
            };
            return (
              <div style={{ pointerEvents: 'auto', position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 20, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(8px)', padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                <img src={imgUrl} style={{ width: '60%', maxWidth: '250px', marginTop: '20px', borderRadius: '12px', border: '2px solid #444' }} alt="pain" />

                <div style={{ display: 'flex', gap: '10px', margin: '20px 0', width: '100%', maxWidth: '350px' }}>
                  {/* 若处于日常表达模式，可隐藏临床‘医生’卡片 */}
                  {['partner', 'work', appMode === 'medical' && 'doctor', 'self'].filter(Boolean).map(tab => (
                    <button key={tab} style={{ flex: 1, padding: '10px 0', background: identity === tab ? '#444' : 'rgba(30,30,30,0.8)', color: identity === tab ? '#fff' : '#888', border: '1px solid #444', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }} onClick={() => setIdentity(tab)}>
                      {t(`result.tabs.${tab}`)}
                    </button>
                  ))}
                </div>

                <div className="info-card" style={{ background: 'rgba(28,28,28,0.9)', padding: '20px', borderRadius: '12px', width: '100%', maxWidth: '350px', border: '1px solid #444', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                  {identity === 'partner' && (
                    <>
                      <h3 style={{ color: '#fff', margin: '0 0 15px 0' }}>{t('result.partner.title')}</h3>
                      <div style={{ background: 'rgba(211,47,47,0.1)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #d32f2f' }}>
                        <p style={{ color: '#ffcdd2', fontSize: '13px', margin: '0 0 6px 0', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}> {t('result.partner.experiencing')}<strong>{content.pain}</strong>。 </p>
                        <EditableBlock fieldKey="analogy" defaultValue={content.analogy} color="#ffcdd2" />
                      </div>
                      <div style={{ marginTop: '20px' }}>
                        <strong style={{ color: '#fff', fontSize: '14px' }}>{t('result.partner.actionPrompt')}</strong>
                        <EditableBlock
                          fieldKey="action"
                          defaultValue={content.action}
                          color="#ccc"
                          style={{ marginTop: '10px', whiteSpace: 'pre-wrap' }}
                        />
                      </div>
                      <button
                        onClick={() => handleCopy(getEditedOrDefault('action', content.action))}
                        style={{ marginTop: '15px', width: '100%', padding: '10px', background: 'transparent', border: '1px dashed #d32f2f', color: '#ffcdd2', borderRadius: '8px', cursor: 'pointer' }}
                      >
                        {t('result.partner.copyAction')}
                      </button>

                      <div style={{ marginTop: '25px', paddingTop: '15px', borderTop: '1px solid #333' }}>
                        <p style={{ color: '#888', fontSize: '12px', margin: '0 0 10px 0' }}>{t('result.refine.prompt')}</p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            placeholder={getRefinePlaceholder('partner')}
                            value={refineInput}
                            onChange={(e) => setRefineInput(e.target.value)}
                            style={{ flex: 1, background: '#111', border: '1px solid #333', color: '#fff', borderRadius: '8px', padding: '10px', fontSize: '12px' }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRefine('analogy');
                            }}
                          />
                          <button
                            onClick={() => handleRefine('analogy')}
                            disabled={refiningField === 'analogy'}
                            style={{
                              background: refiningField === 'analogy' ? '#555' : '#d32f2f',
                              color: '#fff', border: 'none', borderRadius: '8px', padding: '0 15px',
                              cursor: refiningField === 'analogy' ? 'not-allowed' : 'pointer',
                              fontSize: '12px', whiteSpace: 'nowrap'
                            }}>
                            {refiningField === 'analogy' ? t('result.refine.optimizing') : t('result.refine.optimize')}
                          </button>
                        </div>
                      </div>
                      <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #2d2d2d' }}>
                        <h4 style={{
                          color: '#ef5350',
                          fontSize: '14px',
                          fontWeight: '600',
                          margin: '0 0 16px 0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          letterSpacing: '0.5px'
                        }}>
                          🔴 经期小科普
                        </h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {randomPartnerTips.map((tip, idx) => {
                            const isWarning = tip.title && tip.title.includes('警告');
                            return (
                              <div key={idx} style={{
                                background: isWarning ? 'linear-gradient(145deg, #241414, #1a0f0f)' : 'linear-gradient(145deg, #1c1c1c, #141414)',
                                borderRadius: '16px',
                                padding: '18px',
                                border: isWarning ? '1px solid rgba(211,47,47,0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                                borderLeft: isWarning ? '4px solid #d32f2f' : '4px solid rgba(211, 47, 47, 0.6)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                transition: 'transform 0.2s ease'
                              }}>
                                <div style={{
                                  color: '#ffffff',
                                  fontSize: '15px',
                                  fontWeight: '600',
                                  marginBottom: '10px',
                                  lineHeight: '1.4',
                                  letterSpacing: '0.3px'
                                }}>
                                  {tip.title}
                                </div>
                                <div style={{
                                  color: '#b0b0b0',
                                  fontSize: '13px',
                                  margin: 0,
                                  lineHeight: '1.65',
                                  textAlign: 'justify'
                                }}>
                                  {tip.desc}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}

                  {identity === 'work' && (
                    <>
                      <h3 style={{ color: '#ff9800', margin: '0 0 15px 0' }}>{t('result.work.title')}</h3>
                      <p style={{ color: '#888', fontSize: '12px', marginBottom: '10px', whiteSpace: 'pre-wrap' }}>{t('result.work.description')}</p>
                      <div style={{ background: 'rgba(255,152,0,0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,152,0,0.3)' }}>
                        <EditableBlock fieldKey="workText" defaultValue={content.workText} color="#ccc" />
                      </div>
                      <button
                        onClick={() => handleCopy(getEditedOrDefault('workText', content.workText))}
                        style={{ marginTop: '15px', width: '100%', padding: '10px', background: 'transparent', border: '1px dashed #ff9800', color: '#ffcc80', borderRadius: '8px', cursor: 'pointer' }}
                      >
                        {t('result.work.copyTemplate')}
                      </button>
                      <div style={{ marginTop: '25px', paddingTop: '15px', borderTop: '1px solid #333' }}>
                        <p style={{ color: '#888', fontSize: '12px', margin: '0 0 10px 0' }}>{t('result.refine.prompt')}</p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            placeholder={getRefinePlaceholder('work')}
                            value={refineInput}
                            onChange={(e) => setRefineInput(e.target.value)}
                            style={{ flex: 1, background: '#111', border: '1px solid #333', color: '#fff', borderRadius: '8px', padding: '10px', fontSize: '12px' }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRefine('work');
                            }}
                          />
                          <button
                            onClick={() => handleRefine('work')}
                            disabled={refiningField === 'work'}
                            style={{
                              background: refiningField === 'work' ? '#555' : '#d32f2f',
                              color: '#fff', border: 'none', borderRadius: '8px', padding: '0 15px',
                              cursor: refiningField === 'work' ? 'not-allowed' : 'pointer',
                              fontSize: '12px', whiteSpace: 'nowrap'
                            }}>
                            {refiningField === 'work' ? t('result.refine.optimizing') : t('result.refine.optimize')}
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* === 医疗就诊沟通辅助单 (三甲医院标准病历排版 - 带有动态收起空卡片保护) === */}

                  {identity === 'doctor' && (
                    <>
                      {/* 头部合责声明 */}
                      <div style={{ borderBottom: '1px solid #2d2d2d', marginBottom: '20px', paddingBottom: '12px' }}>
                        <h3 style={{ color: '#2196f3', margin: '0 0 6px 0', fontSize: '18px', fontWeight: 'bold' }}>
                          {t('result.doctor.title')}
                        </h3>
                        <p style={{ color: '#ff9800', fontSize: '11px', lineHeight: '1.5', margin: 0, fontWeight: '500', background: 'rgba(255,152,0,0.05)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,152,0,0.15)' }}>
                          {t('result.doctor.disclaimer')}
                        </p>
                      </div>

                      {/* 1. 📋 主诉 (空值安全展现) */}
                      {content.chief_complaint && content.chief_complaint.trim() && (
                        <div style={{ marginBottom: '18px', background: '#151515', padding: '14px', borderRadius: '12px', border: '1px solid #2a2a2a' }}>
                          <h4 style={{ color: '#90caf9', fontSize: '13px', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                            <span>📋</span> 主诉 (Chief Complaint)
                          </h4>
                          <EditableBlock fieldKey="chief_complaint" defaultValue={content.chief_complaint} color="#fff" style={{ fontSize: '14px', lineHeight: '1.6' }} />
                        </div>
                      )}

                      {/* 2. 📝 现病史 */}
                      {content.present_illness && content.present_illness.trim() && (
                        <div style={{ marginBottom: '18px', background: '#151515', padding: '14px', borderRadius: '12px', border: '1px solid #2a2a2a' }}>
                          <h4 style={{ color: '#90caf9', fontSize: '13px', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                            <span>📝</span> 现病史及痛感机制分析 (History of Present Illness)
                          </h4>
                          <EditableBlock fieldKey="present_illness" defaultValue={content.present_illness} color="#eee" style={{ fontSize: '13.5px', lineHeight: '1.6' }} />
                        </div>
                      )}

                      {/* 3. 📂 既往史 */}
                      {content.past_history && content.past_history.trim() && (
                        <div style={{ marginBottom: '18px', background: '#151515', padding: '14px', borderRadius: '12px', border: '1px solid #2a2a2a' }}>
                          <h4 style={{ color: '#90caf9', fontSize: '13px', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                            <span>📂</span> 既往史及个人习惯风险 (Past History)
                          </h4>
                          <EditableBlock fieldKey="past_history" defaultValue={content.past_history} color="#ccc" style={{ fontSize: '13px', lineHeight: '1.6' }} />
                        </div>
                      )}

                      {/* 4. 🌸 月经及孕产史 */}
                      {content.menstrual_history && content.menstrual_history.trim() && (
                        <div style={{ marginBottom: '18px', background: '#151515', padding: '14px', borderRadius: '12px', border: '1px solid #2a2a2a' }}>
                          <h4 style={{ color: '#90caf9', fontSize: '13px', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                            <span>🌸</span> 月经及孕产史 (Menstrual History)
                          </h4>
                          <EditableBlock fieldKey="menstrual_history" defaultValue={content.menstrual_history} color="#ccc" style={{ fontSize: '13px', lineHeight: '1.6' }} />
                        </div>
                      )}

                      {/* 5. 🩺 潜在临床指征排查方向 */}
                      {content.clinical_diagnosis && content.clinical_diagnosis.trim() && (
                        <div style={{ marginBottom: '18px', background: 'rgba(33,150,243,0.04)', padding: '14px', borderRadius: '12px', borderLeft: '4px solid #2196f3', borderTop: '1px solid #222', borderRight: '1px solid #222', borderBottom: '1px solid #222' }}>
                          <h4 style={{ color: '#90caf9', fontSize: '13px', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                            <span>🩺</span> {t('result.doctor.clinicalAdvice')}
                          </h4>
                          <EditableBlock fieldKey="clinical_diagnosis" defaultValue={content.clinical_diagnosis} color="#ffcdd2" style={{ fontSize: '13.5px', lineHeight: '1.6', fontWeight: '500' }} />
                        </div>
                      )}

                      {/* 6. 🔬 建议就诊讨论要点 */}
                      {content.exam_advice && (
                        <div style={{ marginBottom: '18px', padding: '14px', background: 'rgba(33,150,243,0.06)', borderRadius: '12px', border: '1px solid rgba(33,150,243,0.15)' }}>
                          <h4 style={{ color: '#90caf9', fontSize: '13.5px', margin: '0 0 10px 0', fontWeight: '600' }}>
                            <span>🔬</span> {t('result.doctor.discussReference')}
                          </h4>
                          <p style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold', margin: '0 0 8px 0' }}>{content.exam_advice.name}</p>
                          <p style={{ color: '#aaa', fontSize: '12.5px', marginTop: '6px', lineHeight: '1.5' }}>📋 准备：{content.exam_advice.preparation}</p>
                          <p style={{ color: '#4caf50', fontSize: '12px', marginTop: '6px', lineHeight: '1.5' }}>{content.exam_advice.note}</p>
                          {content.exam_advice.alternative && (
                            <p style={{ color: '#ffb74d', fontSize: '12px', marginTop: '10px', whiteSpace: 'pre-wrap', lineHeight: '1.6', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '8px' }}>
                              {content.exam_advice.alternative}
                            </p>
                          )}
                        </div>
                      )}

                      {/* 7. 💊 临床干预调理方向 */}
                      {content.clinical_suggestions && content.clinical_suggestions.trim() && (
                        <div style={{ marginBottom: '18px', background: '#151515', padding: '14px', borderRadius: '12px', border: '1px solid #2a2a2a' }}>
                          <h4 style={{ color: '#90caf9', fontSize: '13px', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                            <span>💊</span> 临床干预调理方向 (Clinical Recommendations)
                          </h4>
                          <EditableBlock fieldKey="clinical_suggestions" defaultValue={content.clinical_suggestions} color="#ccc" style={{ fontSize: '13px', lineHeight: '1.6' }} />
                        </div>
                      )}

                      {/* 临床科普宣教链接 */}
                      {content.health_tips_link && (
                        <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(33,150,243,0.05)', borderRadius: '8px', border: '1px solid rgba(33,150,243,0.1)' }}>
                          <p style={{ color: '#90caf9', fontSize: '11px', margin: 0, wordBreak: 'break-all', lineHeight: '1.4' }}>{content.health_tips_link}</p>
                        </div>
                      )}

                      {/* AI 医生报告深度优化区 */}
                      <div style={{ marginTop: '25px', paddingTop: '15px', borderTop: '1px solid #333' }}>
                        <p style={{ color: '#888', fontSize: '12px', margin: '0 0 10px 0' }}>{t('result.refine.prompt')}</p>

                        {/* 选择优化目标字段 */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                          {[
                            { key: 'chief_complaint', label: '优化主诉' },
                            { key: 'present_illness', label: '优化机制分析' },
                            { key: 'clinical_suggestions', label: '优化就诊建议' }
                          ].map(item => (
                            <button
                              key={item.key}
                              onClick={(e) => {
                                e.stopPropagation();
                                setRefineTargetField(item.key);
                              }}
                              style={{
                                flex: 1, padding: '6px 0', fontSize: '11px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                                background: refineTargetField === item.key ? '#2196f3' : '#222',
                                color: refineTargetField === item.key ? '#fff' : '#888',
                                transition: 'all 0.2s'
                              }}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            placeholder={getRefinePlaceholder('doctor')}
                            value={refineInput}
                            onChange={(e) => setRefineInput(e.target.value)}
                            style={{ flex: 1, background: '#111', border: '1px solid #333', color: '#fff', borderRadius: '8px', padding: '10px', fontSize: '12px' }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRefine(refineTargetField);
                            }}
                          />
                          <button
                            onClick={() => handleRefine(refineTargetField)}
                            disabled={refiningField === refineTargetField}
                            style={{
                              background: refiningField === refineTargetField ? '#555' : '#2196f3',
                              color: '#fff', border: 'none', borderRadius: '8px', padding: '0 15px',
                              cursor: refiningField === refineTargetField ? 'not-allowed' : 'pointer',
                              fontSize: '12px', whiteSpace: 'nowrap'
                            }}
                          >
                            {refiningField === refineTargetField ? t('result.refine.optimizing') : t('result.refine.optimize')}
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {identity === 'self' && (
                    <>
                      <h3 style={{ color: '#9c27b0', margin: '0 0 15px 0' }}>{t('result.self.title')}</h3>
                      <p style={{ color: '#ccc', fontSize: '13px', lineHeight: '1.6', marginBottom: '15px' }}>
                        {t('result.self.comfort')}
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {[
                          { key: 'breathing', icon: '🌬️', title: '疗愈呼吸法', subtitle: '4-7-8呼吸法，缓解紧张', color: '#4caf50' },
                          { key: 'heatPack', icon: '🔥', title: '热敷疗法', subtitle: '温暖小腹，缓解痉挛', color: '#ff9800' },
                          { key: 'meditation', icon: '🧘', title: '正念冥想', subtitle: '接纳疼痛，平静内心', color: '#9c27b0' },
                          { key: 'warmDrink', icon: '🍵', title: '温暖饮品', subtitle: '红糖姜茶，温暖身心', color: '#f44336' }
                        ].map((tip, index) => (
                          <div
                            key={index}
                            onClick={() => {
                              setHealingTipType(tip.key);
                              setShowHealingModal(true);
                            }}
                            style={{
                              background: 'rgba(156,39,176,0.1)',
                              padding: '14px 16px',
                              borderRadius: '12px',
                              borderLeft: `3px solid ${tip.color}`,
                              cursor: 'pointer',
                              transition: 'transform 0.2s, background 0.2s'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ fontSize: '24px' }}>{tip.icon}</span>
                              <div>
                                <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>{tip.title}</div>
                                <div style={{ color: '#ccc', fontSize: '12px', marginTop: '4px' }}>{tip.subtitle}</div>
                              </div>
                              <span style={{ marginLeft: 'auto', color: '#666' }}>›</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => handleCopy(getEditedOrDefault('selfCare', content.selfCare))}
                        style={{ marginTop: '20px', width: '100%', padding: '10px', background: 'transparent', border: '1px dashed #9c27b0', color: '#e1bee7', borderRadius: '8px', cursor: 'pointer' }}
                      >
                        {t('result.self.copyAdvice')}
                      </button>
                      <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #2d2d2d' }}>
                        <h4 style={{
                          color: '#ab47bc',
                          fontSize: '14px',
                          fontWeight: '600',
                          margin: '0 0 16px 0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          letterSpacing: '0.5px'
                        }}>
                          🌿 健康小百科
                        </h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {randomSelfCareTips.map((tip, idx) => (
                            <div key={idx} style={{
                              background: 'linear-gradient(145deg, #1c1c1c, #141414)',
                              borderRadius: '16px',
                              padding: '18px',
                              border: '1px solid rgba(255, 255, 255, 0.05)',
                              borderLeft: '4px solid #ab47bc',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                              transition: 'transform 0.2s ease'
                            }}>
                              <div style={{
                                color: '#ffffff',
                                fontSize: '15px',
                                fontWeight: '600',
                                marginBottom: '10px',
                                lineHeight: '1.4',
                                letterSpacing: '0.3px'
                              }}>
                                {tip.title}
                              </div>
                              <div style={{
                                color: '#b0b0b0',
                                fontSize: '13px',
                                margin: 0,
                                lineHeight: '1.65',
                                textAlign: 'justify'
                              }}>
                                {tip.desc}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  {showHealingModal && (() => {
                    const healingContentMap = {
                      breathing: {
                        title: "🌬️ 疗愈呼吸法",
                        description: "通过深长的腹式呼吸，帮助身体放松，缓解疼痛带来的紧张感。",
                        steps: "① 找一个安静舒适的地方坐下或躺下\n② 将一只手放在腹部，感受呼吸时腹部的起伏\n③ 吸气4秒，感受腹部像气球一样鼓起\n④ 屏息4秒，让氧气充分进入血液\n⑤ 呼气6秒，感受腹部回落\n⑥ 重复10-15次，感受身体的放松"
                      },
                      heatPack: {
                        title: "🔥 热敷疗法",
                        description: "温热能够促进局部血液循环，缓解肌肉痉挛，是缓解痛经最有效的方法之一。",
                        steps: "① 准备热水袋或电热宝（40-45°C为宜）\n② 用毛巾包裹，避免直接接触皮肤烫伤\n③ 敷在小腹或后腰部位\n④ 每次15-20分钟\n⑤ 每天可敷3-4次\n⑥ 注意多喝水，避免脱水"
                      },
                      meditation: {
                        title: "🧘 正念冥想",
                        description: "将注意力从疼痛中转移，接受当下的感受而不加评判，减轻疼痛带来的心理负担。",
                        steps: "① 找个安静的地方，舒适地坐下\n② 闭上眼睛，专注于呼吸\n③ 当注意力飘走时，温柔地带回呼吸\n④ 感受疼痛但不评判它\n⑤ 想象疼痛像云一样飘过\n⑥ 每次5-10分钟，慢慢增加时间"
                      },
                      warmDrink: {
                        title: "🍵 温暖饮品",
                        description: "温热的饮品不仅能温暖身体，还能安抚情绪，是自愈的重要一环。",
                        steps: "① 红糖姜茶：生姜3片+红糖1勺+热水\n② 桂圆红枣茶：桂圆5颗+红枣3颗\n③ 温牛奶加蜂蜜\n④ 避免冷饮和咖啡因\n⑤ 小口慢饮，感受温暖\n⑥ 每天喝2-3杯"
                      }
                    };
                    const healingContent = healingContentMap[healingTipType];
                    if (!healingContent) return null;

                    return (
                      <div style={{
                        position: 'fixed',
                        zIndex: 1001,
                        top: 0, left: 0,
                        width: '100vw', height: '100vh',
                        background: 'rgba(0,0,0,0.95)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px',
                        boxSizing: 'border-box'
                      }} onClick={() => setShowHealingModal(false)}>
                        <div style={{
                          background: '#1a1a1a',
                          borderRadius: '24px',
                          maxWidth: '400px',
                          width: '100%',
                          maxHeight: '80vh',
                          overflowY: 'auto',
                          padding: '24px',
                          boxSizing: 'border-box'
                        }} onClick={e => e.stopPropagation()}>
                          <h3 style={{ color: '#fff', marginBottom: '16px', fontSize: '20px' }}>{healingContent.title}</h3>
                          <p style={{ color: '#ccc', lineHeight: '1.6', fontSize: '14px' }}>{healingContent.description}</p>

                          <div style={{ marginTop: '20px' }}>
                            <h4 style={{ color: '#4caf50', marginBottom: '12px', fontSize: '14px' }}>📋 详细步骤</h4>
                            <div style={{ color: '#aaa', lineHeight: '1.8', fontSize: '13px' }}>
                              {healingContent.steps.split('\n').map((step, i) => (
                                <div key={i} style={{ marginBottom: '10px' }}>{step}</div>
                              ))}
                            </div>
                          </div>

                          <button
                            onClick={() => setShowHealingModal(false)}
                            style={{
                              width: '100%',
                              padding: '12px',
                              marginTop: '12px',
                              background: 'transparent',
                              border: '1px solid #444',
                              borderRadius: '30px',
                              color: '#888',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                          >
                            关闭
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '350px', marginTop: '30px', marginBottom: '40px' }}>
                  <button style={{ flex: 2, padding: '14px', borderRadius: '20px', background: '#4caf50', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => prepareSharePreview(content)}>
                    {t('result.shareCard')}
                  </button>
                  <button style={{ flex: 1.5, padding: '14px', borderRadius: '20px', background: '#2196f3', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => setShowPostModal(true)}>
                    {t('result.publish')}
                  </button>
                  <button style={{ flex: 1, padding: '14px', borderRadius: '20px', background: 'rgba(255,255,255,0.1)', border: '1px solid #555', color: '#fff', cursor: 'pointer' }} onClick={() => { setPage("onboarding"); }}>
                    {t('result.backHome')}
                  </button>
                </div>
              </div>
            );
          } catch (e) {
            console.error("Result 渲染出错:", e);
            return (
              <div style={{ pointerEvents: 'auto', position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 20, background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <p>{t('result.reportError')}</p>
                <button onClick={() => setPage("onboarding")} style={{ marginTop: '20px', padding: '12px 24px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '20px', cursor: 'pointer' }}>
                  {t('result.backToHome')}
                </button>
              </div>
            );
          }
        })()}

        {/* === Community 广场页面 === */}
        {page === "community" && (() => {
          const { total, topPainKey } = getDynamicCommunityStats();
          const displayPainName = t(`painNames.${topPainKey}`);

          // === 动态提取：按当前分类，过滤并推荐有用赞数排行前 5 的缓解经验 ===
          const getTopReliefTips = (currentFilter) => {
            let eligible = posts.filter(p => p.userExperience && p.userExperience.trim());
            if (currentFilter !== 'all') {
              eligible = eligible.filter(p => (p.painTags || []).includes(currentFilter));
            }
            // 降序排序，提取前5
            return eligible.sort((a, b) => (b.helpfulVotes || 0) - (a.helpfulVotes || 0)).slice(0, 5);
          };

          const topTips = getTopReliefTips(painFilter);

          return (
            <div style={{ pointerEvents: 'auto', background: '#0a0a0a', width: '100vw', minHeight: '100vh', padding: '20px', paddingBottom: '100px', boxSizing: 'border-box' }}>
              {/* 头部固定 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', position: 'sticky', top: 0, background: '#0a0a0a', zIndex: 10, paddingBottom: '10px' }}>
                <h2 style={{ color: '#fff', margin: 0, fontSize: '1.2rem' }}>{t('community.title')}</h2>
                <button className="retry-btn" style={{ margin: 0, padding: '6px 15px', width: 'auto' }} onClick={() => setPage('onboarding')}>{t('community.back')}</button>
              </div>

              {/* 优化后的温情治愈周统计横幅 */}
              <div style={{
                background: 'rgba(211,47,47,0.06)',
                border: '1px solid rgba(211,47,47,0.15)',
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '20px',
                textAlign: 'center'
              }}>
                <p style={{ color: '#ffcdd2', fontSize: '13.5px', margin: 0, fontWeight: '500', lineHeight: '1.5' }}>
                  {t('community.weeklyStats', { count: posts.length, pain: displayPainName })}
                </p>
              </div>

              {/* 痛感分类标签筛选 */}
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '20px', borderBottom: '1px solid #1a1a1a' }}>
                <button
                  onClick={() => setPainFilter('all')}
                  style={{
                    padding: '6px 16px', borderRadius: '20px', border: 'none', whiteSpace: 'nowrap',
                    background: painFilter === 'all' ? '#d32f2f' : '#1e1e1e',
                    color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: '500'
                  }}
                >
                  {t('community.filterAll')}
                </button>
                {Object.entries(PAIN_NAME_MAP).map(([key, name]) => (
                  <button
                    key={key}
                    onClick={() => setPainFilter(key)}
                    style={{
                      padding: '6px 16px', borderRadius: '20px', border: 'none', whiteSpace: 'nowrap',
                      background: painFilter === key ? '#d32f2f' : '#1e1e1e',
                      color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: '500'
                    }}
                  >
                    {t(`painNames.${key}`)} ({posts.filter(p => (p.painTags || []).includes(key)).length})
                  </button>
                ))}
              </div>

              {/* === 【核心新增】：自愈锦囊横向滑动搁板 (Featured Tips Shelf) === */}
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ color: '#4caf50', fontSize: '14px', margin: '0 0 12px 0', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {t('community.topTipsTitle')}
                </h3>

                {topTips.length === 0 ? (
                  <div style={{ background: '#121212', border: '1px dashed #333', borderRadius: '14px', padding: '24px', textAlign: 'center', color: '#666', fontSize: '12.5px' }}>
                    {t('community.topTipsEmpty')}
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
                    {topTips.map(tip => (
                      <div
                        key={tip.id}
                        style={{
                          flexShrink: 0,
                          width: '260px',
                          background: 'linear-gradient(135deg, #161a16, #121212)',
                          border: '1.5px solid rgba(76, 175, 80, 0.25)',
                          borderRadius: '16px',
                          padding: '16px',
                          boxSizing: 'border-box',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '10px', color: '#4caf50', background: 'rgba(76,175,80,0.1)', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                              {t(`painNames.${tip.painTags?.[0] || 'twist'}`)}
                            </span>
                            <span style={{ fontSize: '11px', color: '#666' }}>👍 {tip.helpfulVotes || 0}</span>
                          </div>
                          <p style={{ color: '#ddd', fontSize: '13px', margin: 0, lineHeight: '1.5', height: '60px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                            “{tip.userExperience}”
                          </p>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid #222', paddingTop: '8px' }}>
                          <button
                            onClick={() => setViewingPost(tip)}
                            style={{ background: 'none', border: 'none', color: '#888', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            查看详情
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              const hasVoted = tip.hasUserVotedHelpful || false;
                              const nextVotes = (tip.helpfulVotes || 0) + (hasVoted ? -1 : 1);
                              const updates = { helpfulVotes: nextVotes, hasUserVotedHelpful: !hasVoted };

                              // 1. 更新本地状态
                              setPosts(prev => prev.map(p => p.id === tip.id ? { ...p, ...updates } : p));
                              // === 【关键修复 2】：改用翻译键名，解决 toast undefined 报错问题 ===
                              showToast(hasVoted ? "helpfulRemoved" : "helpfulAdded");

                              // 2. 同步云端
                              await updatePostInCloud(tip.id, updates);
                            }}
                            style={{
                              background: tip.hasUserVotedHelpful ? 'rgba(76,175,80,0.15)' : 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(76,175,80,0.3)',
                              borderRadius: '12px',
                              color: '#4caf50',
                              padding: '3px 8px',
                              fontSize: '10.5px',
                              cursor: 'pointer',
                              fontWeight: 'bold'
                            }}
                          >
                            {tip.hasUserVotedHelpful ? '已认可' : '+ 亲测有用'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 原本的图片网格展示 */}
              <h3 style={{ color: '#fff', fontSize: '14px', margin: '0 0 12px 0', fontWeight: '600' }}>
                🖼️ 具身痛觉图谱
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {posts.filter(p => painFilter === 'all' || (p.painTags || []).includes(painFilter)).map((post) => (
                  <div key={post.id} style={{ background: '#121212', borderRadius: '16px', overflow: 'hidden', border: '1px solid #222', display: 'flex', flexDirection: 'column' }}>
                    <img
                      src={post.img}
                      onClick={() => setViewingPost({
                        ...post,
                        hugs: post.hugs || 0,
                        hasUserHugged: post.hasUserHugged || false,
                        userExperience: post.userExperience || null,
                        experienceTags: post.experienceTags || [],
                      })}
                      style={{ width: '100%', height: '120px', objectFit: 'cover', cursor: 'pointer', background: '#000' }}
                    />
                    <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <p style={{ color: '#eee', fontSize: '12.5px', margin: '0 0 10px 0', lineHeight: '1.4', fontWeight: '500' }}>
                        {post.text}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#d32f2f', fontSize: '10px', background: 'rgba(211,47,47,0.1)', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                          {t(`painNames.${post.painTags?.[0] || 'twist'}`)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLikePost(post.id);
                          }}
                          style={{ background: 'none', border: 'none', color: '#888', fontSize: '12.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          ❤️ {post.likes || 0}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* === History (疼痛日记：分类折叠) === */}
        {page === "history" && (() => {
          // 归一化格式：YYYY-MM-DD
          const formatDateKey = (year, month, day) => {
            return `${year}-${month + 1}-${day}`;
          };

          // 检查某天是否有记录 (采用归一化比对)
          const hasRecordOnDate = (year, month, day) => {
            const targetStr = formatDateKey(year, month, day);
            return history.some(h => normalizeDateStr(h.date) === targetStr);
          };

          // 获取某天的记录 (采用归一化比对)
          const getRecordsOnDate = (year, month, day) => {
            const targetStr = formatDateKey(year, month, day);
            return history.filter(h => normalizeDateStr(h.date) === targetStr);
          };

          // 渲染日历网格
          const renderCalendar = () => {
            const year = calendarDate.getFullYear();
            const month = calendarDate.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const firstDay = new Date(year, month, 1).getDay();
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

            const days = [];

            // 填充第一周前的空白
            for (let i = 0; i < firstDay; i++) {
              days.push(
                <div key={`empty-${i}`} style={{ width: '14.28%', padding: '8px', boxSizing: 'border-box' }} />
              );
            }

            // 填充真实的日期格子
            for (let d = 1; d <= daysInMonth; d++) {
              const dateKey = formatDateKey(year, month, d);
              const hasRecord = hasRecordOnDate(year, month, d);
              const isSelected = selectedDate === dateKey;
              const isToday = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate()) === dateKey;
              const isMenstrual = menstrualDates.includes(dateKey);

              days.push(
                <div
                  key={d}
                  onClick={() => {
                    setSelectedDate(dateKey);
                    const records = getRecordsOnDate(year, month, d);
                    setSelectedDateRecords(records);
                  }}
                  style={{
                    width: '14.28%',
                    padding: '8px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    boxSizing: 'border-box'
                  }}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    margin: '0 auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    background: isSelected ? '#d32f2f' : (isToday ? 'rgba(211, 47, 47, 0.3)' : 'transparent'),
                    color: isSelected ? '#fff' : (isMenstrual ? '#ffcdd2' : (isToday ? '#d32f2f' : '#888')),
                    fontWeight: isSelected ? 'bold' : (isToday ? 'bold' : 'normal'),
                    fontSize: '14px'
                  }}>
                    {d}
                  </div>
                  {hasRecord && !isSelected && (
                    <div style={{
                      position: 'absolute',
                      bottom: '4px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      background: '#d32f2f'
                    }} />
                  )}
                </div>
              );
            }

            return days;
          };

          // 按年月份对历史记录进行归类分组
          const groupedHistory = history.reduce((acc, item) => {
            if (!item.date) return acc;
            const parts = normalizeDateStr(item.date).split('-');
            if (parts.length < 2) return acc;
            const monthKey = `${parts[0]}年${parts[1]}月`;
            if (!acc[monthKey]) acc[monthKey] = [];
            acc[monthKey].push(item);
            return acc;
          }, {});

          return (
            <div style={{
              pointerEvents: 'auto',
              background: '#0a0a0a',
              width: '100vw',
              minHeight: '100vh',
              overflowY: 'auto',
              padding: '20px',
              paddingBottom: '100px',
              boxSizing: 'border-box'
            }}>
              {/* 头部导航与导出区域 */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                position: 'sticky',
                top: 0,
                background: '#0a0a0a',
                zIndex: 10,
                paddingBottom: '10px'
              }}>
                <h2 style={{ color: '#fff', margin: 0, fontSize: '1.2rem' }}>{t('history.title')}</h2>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={exportHistoryPDF}
                    style={{
                      padding: '6px 12px',
                      background: '#d32f2f',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '20px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    {t('history.export')}
                  </button>
                  <button
                    onClick={() => setPage('onboarding')}
                    style={{
                      padding: '6px 12px',
                      background: '#333',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '20px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    {t('history.back')}
                  </button>
                </div>
              </div>

              {/* 趋势概览趋势组件 */}
              <TrendSummary history={history} />

              {/* 日历面板 */}
              <div style={{
                background: '#1a1a1a',
                borderRadius: '20px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px'
                }}>
                  <button
                    onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                    style={{ background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', padding: '0 12px' }}
                  >
                    ‹
                  </button>
                  <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '16px' }}>
                    {calendarDate.getFullYear()}年 {calendarDate.getMonth() + 1}月
                  </span>
                  <button
                    onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                    style={{ background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', padding: '0 12px' }}
                  >
                    ›
                  </button>
                </div>

                <div style={{ display: 'flex', marginBottom: '12px' }}>
                  {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                    <div key={day} style={{
                      width: '14.28%',
                      textAlign: 'center',
                      color: day === '日' || day === '六' ? '#d32f2f' : '#666',
                      fontSize: '12px',
                      fontWeight: day === '日' || day === '六' ? 'bold' : 'normal'
                    }}>
                      {day}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                  {renderCalendar()}
                </div>
              </div>

              {/* 选中日期下的记录细单 */}
              {selectedDate && (
                <div style={{ marginTop: '20px' }}>
                  <h3 style={{ color: '#fff', fontSize: '14px', marginBottom: '12px' }}>
                    📅 {selectedDate} 的记录
                  </h3>
                  {selectedDateRecords.length === 0 ? (
                    <div style={{
                      background: '#1c1c1c',
                      padding: '30px 20px',
                      borderRadius: '12px',
                      textAlign: 'center',
                      color: '#666',
                      fontSize: '13px'
                    }}>
                      🌱 {t('history.noRecordThisDay')}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {selectedDateRecords.map(record => (
                        <div
                          key={record.id}
                          onClick={() => setViewingDiary(record)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: '#1c1c1c',
                            padding: '12px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'transform 0.1s, background 0.2s',
                            border: '1px solid #333'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#252525'}
                          onMouseLeave={e => e.currentTarget.style.background = '#1c1c1c'}
                        >
                          <img
                            src={record.img}
                            style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover', background: '#000' }}
                            alt="pain map"
                          />
                          <div style={{ marginLeft: '12px', flex: 1 }}>
                            <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>
                              {record.painName}
                            </div>
                            <div style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>
                              {record.time}
                            </div>
                          </div>
                          <span style={{ color: '#666', fontSize: '18px' }}>›</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 汇总分组折叠视图 */}
              {history.length > 0 && (
                <div style={{ marginTop: '30px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                    borderTop: '1px solid #222',
                    paddingTop: '20px'
                  }}>
                    <h3 style={{ color: '#fff', fontSize: '14px', margin: 0 }}>
                      📋 {t('history.allRecords')}
                    </h3>
                    <button
                      onClick={() => setShowGroupedView(!showGroupedView)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#4caf50',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {showGroupedView ? '▲ 收起' : '▼ 展开'}
                    </button>
                  </div>

                  {showGroupedView && Object.entries(groupedHistory).map(([month, records]) => (
                    <div key={month} style={{ marginBottom: '16px' }}>
                      <div
                        onClick={() => toggleMonth(month)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 12px',
                          background: '#151515',
                          borderRadius: '10px',
                          borderLeft: `3px solid ${collapsedMonths[month] ? '#666' : '#d32f2f'}`,
                          cursor: 'pointer',
                          marginBottom: '8px'
                        }}
                      >
                        <span style={{ color: '#fff', fontSize: '13px', fontWeight: '500' }}>{month}</span>
                        <span style={{ color: '#888', fontSize: '11px' }}>
                          {records.length}条 {collapsedMonths[month] ? '▶' : '▼'}
                        </span>
                      </div>

                      {!collapsedMonths[month] && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '8px' }}>
                          {records.map(record => (
                            <div
                              key={record.id}
                              onClick={() => setViewingDiary(record)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                background: '#1c1c1c',
                                padding: '10px',
                                borderRadius: '10px',
                                cursor: 'pointer'
                              }}
                            >
                              <img
                                src={record.img}
                                style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', background: '#000' }}
                                alt=""
                              />
                              <div style={{ marginLeft: '12px', flex: 1 }}>
                                <div style={{ color: '#fff', fontSize: '13px', fontWeight: '500' }}>{record.date}</div>
                                <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                                  {record.painName} · {record.time}
                                </div>
                              </div>
                              <span style={{ color: '#555' }}>›</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
        {/* === 日记详情 Modal === */}
        {viewingDiary && (
          <div
            style={{
              position: 'fixed',
              zIndex: 500,
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0,0,0,0.95)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              boxSizing: 'border-box',
              overflow: 'hidden'
            }}
            onClick={() => setViewingDiary(null)}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '400px',
                maxHeight: '90vh',
                overflowY: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <img src={viewingDiary.img} style={{ width: '100%', borderRadius: '12px', border: '1px solid #444' }} alt="diary" />

              {viewingDiary.meta && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                  {viewingDiary.meta.colorPalette && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      background: 'rgba(255,255,255,0.07)', borderRadius: '12px',
                      padding: '3px 10px', fontSize: '11px', color: '#ccc'
                    }}>
                      <span style={{
                        width: '10px', height: '10px', borderRadius: '50%',
                        background: `rgb(${(PALETTES[viewingDiary.meta.colorPalette]?.color || [200, 50, 50]).join(',')})`,
                        display: 'inline-block'
                      }} />
                      {viewingDiary.meta.colorPalette === 'crimson' ? t('colorDescriptions.crimson').split('：')[0] :
                        viewingDiary.meta.colorPalette === 'dark' ? t('colorDescriptions.dark').split('：')[0] :
                          viewingDiary.meta.colorPalette === 'purple' ? t('colorDescriptions.purple').split('：')[0] :
                            t('colorDescriptions.blue').split('：')[0]}
                    </span>
                  )}
                  {viewingDiary.meta.painScore > 0 && (
                    <span style={{ background: 'rgba(211,47,47,0.15)', borderRadius: '12px', padding: '3px 10px', fontSize: '11px', color: '#ffcdd2' }}>
                      {t('diary.brushCount', { count: viewingDiary.meta.painScore })}
                    </span>
                  )}
                  {viewingDiary.meta.bodyMode && viewingDiary.meta.bodyMode !== 'none' && (
                    <span style={{ background: 'rgba(76,175,80,0.12)', borderRadius: '12px', padding: '3px 10px', fontSize: '11px', color: '#a5d6a7' }}>
                      {viewingDiary.meta.bodyMode === 'front' ? t('diary.bodyFront') :
                        viewingDiary.meta.bodyMode === 'back' ? t('diary.bodyBack') : t('diary.bodyBoth')}
                    </span>
                  )}
                </div>
              )}

              <h3 style={{ color: '#fff', marginTop: '20px', marginBottom: '10px' }}>
                {viewingDiary.date} {viewingDiary.time}
                <span style={{ marginLeft: '12px', color: '#d32f2f', fontSize: '16px', background: 'rgba(211, 47, 47, 0.15)', padding: '4px 12px', borderRadius: '12px' }}>
                  {viewingDiary.painName}
                </span>
              </h3>

              <div style={{ background: 'rgba(28,28,28,0.9)', padding: '18px', borderRadius: '12px', marginTop: '10px', border: '1px solid #444' }}>
                <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.6', margin: '0 0 12px 0' }}>
                  {viewingDiary.content?.analogy}
                </p>
                <p style={{ color: '#4caf50', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
                  {viewingDiary.content?.selfCare}
                </p>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', marginTop: '20px', border: '1px solid #333', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: '#888', fontSize: '12px', marginBottom: '12px' }}>{t('diary.shareContext')}</p>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    {['partner', 'work', appMode === 'medical' && 'doctor', 'self'].filter(Boolean).map(tab => (
                      <button
                        key={tab}
                        onClick={(e) => { e.stopPropagation(); setDiaryShareIdentity(tab); }}
                        style={{
                          flex: 1, padding: '10px 0', fontSize: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                          background: diaryShareIdentity === tab ? '#d32f2f' : '#222',
                          color: diaryShareIdentity === tab ? '#fff' : '#888',
                          minWidth: '60px'
                        }}
                      >
                        {t(`result.tabs.${tab}`)}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    style={{ flex: 1, padding: '14px', borderRadius: '25px', background: '#4caf50', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShareContent({
                        ...viewingDiary.content,
                        identity: diaryShareIdentity,
                        historyImg: viewingDiary.img,
                        pain: viewingDiary.painName
                      });
                      setShowSharePreview(true);
                      setViewingDiary(null);
                    }}
                  >
                    {t('diary.share')}
                  </button>

                  <button
                    style={{ flex: 1, padding: '14px', borderRadius: '25px', background: 'rgba(167, 119, 224, 0.99)', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
                    onClick={() => {
                      setImgUrl(viewingDiary.img);
                      setShowPostModal(true);
                      setViewingDiary(null);
                    }}
                  >
                    {t('diary.publish')}
                  </button>
                </div>

                {/* === 删除与关闭 1:1  === */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  width: '100%',
                  marginTop: '15px'
                }}>
                  {/* 🗑️ */}
                  <button
                    style={{
                      flex: 1, // 确保 1:1 等宽
                      padding: '14px 0',
                      borderRadius: '25px',
                      background: 'rgba(211,47,47,0.08)',
                      border: '1px solid rgba(211,47,47,0.3)',
                      color: '#ef5350',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm("⚠️ 警告：确定要永久删除本条具身痛感档案吗？此操作将无法撤销。")) {
                        // 1. 从全局状态及 LocalStorage 中彻底抹除
                        const updatedHistory = history.filter(h => h.id !== viewingDiary.id);
                        setHistory(updatedHistory);
                        localStorage.setItem('painscape_history', JSON.stringify(updatedHistory));

                        // 2. === 【关键修复】：同步过滤当前日历选中日期的局部缓存，彻底消除残影 ===
                        setSelectedDateRecords(prev => prev.filter(h => h.id !== viewingDiary.id));

                        // 3. 清除弹窗状态，回到日记页
                        setViewingDiary(null);
                        showToast("recordDeleted");
                      }
                    }}
                  >
                    🗑️ {'删除'}
                  </button>

                  {/* 🔒 确认关闭按钮 */}
                  <button
                    style={{
                      flex: 1, // 确保 1:1 等宽
                      padding: '14px 0',
                      borderRadius: '25px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid #333',
                      color: '#fff',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewingDiary(null);
                    }}
                  >
                    {t('diary.close') || '关闭'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* === 社区帖子 Modal === */}
        {viewingPost && (
          <div
            style={{
              position: 'fixed',
              zIndex: 11000,
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(10,10,10,0.98)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start', // 允许从上往下流动滚动，解决底部裁剪问题
              overflowY: 'auto', // 仅让主背景滚动
              padding: '24px 16px',
              boxSizing: 'border-box'
            }}
            onClick={() => setViewingPost(null)}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '420px',
                background: '#141414',
                border: '1px solid #2a2a2a',
                borderRadius: '24px',
                padding: '20px',
                boxSizing: 'border-box',
                boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                marginBottom: '40px'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 头部标题与关闭按钮 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ color: '#ef5350', fontWeight: 'bold', fontSize: '14px', letterSpacing: '0.5px' }}>
                  {t('post.title')}
                </span>
                <button
                  onClick={() => setViewingPost(null)}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: 'none',
                    color: '#888',
                    fontSize: '18px',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ✕
                </button>
              </div>

              {/* 主痛觉图谱展示 */}
              <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #222', background: '#000', marginBottom: '16px' }}>
                <img src={viewingPost.img} style={{ width: '100%', display: 'block', objectFit: 'contain' }} alt="Embodied Pain Map" />
              </div>

              {/* 描述与痛觉性质 */}
              <div style={{ marginBottom: '18px' }}>
                <p style={{ color: '#fff', fontSize: '16px', fontWeight: '600', lineHeight: '1.5', margin: '0 0 10px 0' }}>
                  “ {viewingPost.text} ”
                </p>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ color: '#d32f2f', fontSize: '11px', background: 'rgba(211,47,47,0.1)', padding: '3px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
                    {t(`painNames.${viewingPost.painTags?.[0] || 'twist'}`)}
                  </span>
                  <span style={{ color: '#666', fontSize: '11px' }}>
                    ID: #{viewingPost.id ? String(viewingPost.id).slice(-6) : 'unknown'}
                  </span>
                </div>
              </div>

              {/* 模块1：AI 痛觉重构分析 */}
              <div style={{
                background: 'linear-gradient(145deg, #181818, #111111)',
                padding: '16px',
                borderRadius: '16px',
                marginBottom: '14px',
                border: '1px solid rgba(255,255,255,0.03)',
                borderLeft: '4px solid #d32f2f'
              }}>
                <h4 style={{ color: '#ef5350', margin: '0 0 8px 0', fontSize: '13px', fontWeight: 'bold' }}>
                  {t('post.aiAnalysis')}
                </h4>
                <p style={{ color: '#b0b0b0', fontSize: '12.5px', lineHeight: '1.6', margin: 0 }}>
                  {viewingPost.analogy || t('post.aiDefault')}
                </p>
              </div>

              {/* 模块2：她的亲历自愈经验 */}
              <div style={{
                background: 'linear-gradient(145deg, #181a18, #111311)',
                padding: '16px',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.03)',
                borderLeft: '4px solid #4caf50',
                marginBottom: '20px'
              }}>
                <h4 style={{ color: '#4caf50', margin: '0 0 8px 0', fontSize: '13px', fontWeight: 'bold' }}>
                  {t('post.selfExperience')}
                </h4>

                {viewingPost.userExperience ? (
                  <div>
                    <p style={{ color: '#b0b0b0', fontSize: '12.5px', margin: '0 0 12px 0', lineHeight: '1.6' }}>
                      {viewingPost.userExperience}
                    </p>

                    {/* 标签列表 */}
                    {viewingPost.experienceTags && viewingPost.experienceTags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                        {viewingPost.experienceTags.map(tag => (
                          <span key={tag} style={{ background: 'rgba(76,175,80,0.12)', color: '#4caf50', padding: '3px 8px', borderRadius: '10px', fontSize: '10.5px' }}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 经验投票区域 */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const currentHelpful = viewingPost.helpfulVotes || 0;
                          const hasVoted = viewingPost.hasUserVotedHelpful || false;
                          const nextVotes = currentHelpful + (hasVoted ? -1 : 1);
                          const updates = { helpfulVotes: nextVotes, hasUserVotedHelpful: !hasVoted };

                          setPosts(prev => prev.map(p => p.id === viewingPost.id ? { ...p, ...updates } : p));
                          setViewingPost(vp => ({ ...vp, ...updates }));
                          showToast(hasVoted ? "helpfulRemoved" : "helpfulAdded");

                          await updatePostInCloud(viewingPost.id, updates);
                        }}
                        style={{
                          background: viewingPost.hasUserVotedHelpful ? 'rgba(76,175,80,0.15)' : 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(76,175,80,0.3)',
                          borderRadius: '20px',
                          color: '#4caf50',
                          padding: '6px 14px',
                          fontSize: '11px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s'
                        }}
                      >
                        👍 {viewingPost.hasUserVotedHelpful ? '已赞同有用' : '亲测有用'} · {viewingPost.helpfulVotes || 0}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{ color: '#888', fontSize: '12px', lineHeight: '1.5', margin: '0 0 10px 0' }}>
                      {t('post.noExperience')}
                    </p>
                    <button
                      style={{
                        width: '100%',
                        padding: '10px',
                        background: 'transparent',
                        border: '1px dashed #4caf50',
                        color: '#4caf50',
                        borderRadius: '12px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                      onClick={() => setShowExpInput(true)}
                    >
                      {t('post.addExperience')}
                    </button>
                  </div>
                )}
              </div>

              {/* 输入经验表单 */}
              {showExpInput && (
                <div style={{ background: '#1c1c1c', padding: '16px', borderRadius: '16px', border: '1px solid #333', marginBottom: '20px' }}>
                  <textarea
                    placeholder={t('post.experiencePlaceholder')}
                    style={{ width: '100%', background: '#111', color: '#fff', border: '1px solid #444', borderRadius: '8px', padding: '10px', fontSize: '13px', minHeight: '80px', resize: 'none', boxSizing: 'border-box' }}
                    value={expText}
                    onChange={e => setExpText(e.target.value)}
                  />
                  <input
                    placeholder={t('post.tagsPlaceholder')}
                    style={{ width: '100%', background: '#111', color: '#fff', border: '1px solid #444', borderRadius: '8px', padding: '10px', fontSize: '13px', marginTop: '8px', boxSizing: 'border-box' }}
                    value={expTags}
                    onChange={e => setExpTags(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                    <button
                      style={{ flex: 1, padding: '8px', background: '#333', color: '#aaa', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}
                      onClick={() => setShowExpInput(false)}
                    >
                      {t('post.cancel')}
                    </button>
                    <button
                      style={{ flex: 1, padding: '8px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                      onClick={() => handleSaveExperience(viewingPost)}
                    >
                      {t('post.publishExperience')}
                    </button>
                  </div>
                </div>
              )}

              {/* 底部按钮交互排版 */}
              <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid #2a2a2a', paddingTop: '16px' }}>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const isHugged = viewingPost.hasUserHugged;
                    const updates = {
                      hugs: viewingPost.hugs + (isHugged ? -1 : 1),
                      hasUserHugged: !isHugged
                    };

                    setPosts(prev => prev.map(p => p.id === viewingPost.id ? { ...p, ...updates } : p));
                    setViewingPost(vp => ({ ...vp, ...updates }));
                    showToast(isHugged ? "hugRetracted" : "hugSent");

                    const updatedPosts = await updatePostInCloud(viewingPost.id, updates);
                    if (updatedPosts) setPosts(updatedPosts);
                  }}
                  style={{
                    flex: 1.3,
                    padding: '12px',
                    borderRadius: '24px',
                    border: viewingPost.hasUserHugged ? '1px solid #ef5350' : '1px solid #333',
                    background: viewingPost.hasUserHugged ? 'rgba(239,83,80,0.1)' : 'rgba(255,255,255,0.02)',
                    color: viewingPost.hasUserHugged ? '#ef5350' : '#888',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '13px'
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{viewingPost.hasUserHugged ? '❤️' : '🤍'}</span>
                  <span>{viewingPost.hasUserHugged ? t('post.hugged') : t('post.giveHug')}</span>
                  <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '8px' }}>
                    {viewingPost.hugs}
                  </span>
                </button>

                <button
                  onClick={() => setViewingPost(null)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '24px',
                    border: 'none',
                    background: '#333',
                    color: '#eee',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '13px'
                  }}
                >
                  {t('diary.close')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* === 社区发布 Modal === */}
        {showPostModal && (
          <div style={{
            position: 'fixed', zIndex: 500, top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box'
          }}>
            <div style={{
              background: '#1c1c1c', padding: '24px', borderRadius: '20px', width: '100%',
              maxWidth: '380px', border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
              overflow: 'hidden',
              wordBreak: 'break-all',
            }}>
              <h3 style={{ color: '#fff', marginTop: 0, fontSize: '18px', fontWeight: 'bold', textAlign: 'center' }}>
                {t('publishModal.title')}
              </h3>

              <div style={{ background: 'rgba(255, 152, 0, 0.06)', border: '1px solid rgba(255, 152, 0, 0.15)', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px' }}>
                <p style={{ color: '#ffcc80', fontSize: '12px', margin: 0, lineHeight: '1.6' }}>
                  {t('publishModal.hint')}
                </p>
              </div>

              {imgUrl && (
                <div style={{ marginBottom: '15px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #333' }}>
                  <img src={imgUrl} style={{ width: '100%', display: 'block' }} alt="preview" />
                </div>
              )}

              <textarea
                value={postText}
                onChange={e => setPostText(e.target.value)}
                placeholder={t('publishModal.placeholder')}
                style={{
                  width: '100%', height: '100px', background: '#111', color: '#fff',
                  border: '1px solid #333', borderRadius: '12px', padding: '14px',
                  boxSizing: 'border-box', marginBottom: '20px', fontSize: '14px',
                  lineHeight: '1.5', resize: 'none', outline: 'none'
                }}
              />

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  style={{ flex: 1, padding: '12px', background: '#2a2a2a', color: '#999', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
                  onClick={() => setShowPostModal(false)}
                >
                  {t('publishModal.cancel')}
                </button>
                <button
                  style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #ff9800, #f44336)', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(244, 67, 54, 0.3)' }}
                  onClick={handlePublishPost}
                >
                  {t('publishModal.submit')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* === 分享预览 Modal === */}
        {showSharePreview && shareContent && (
          <div style={{
            position: 'fixed', zIndex: 600, top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box'
          }}>
            <div style={{ width: '100%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto', background: '#1c1c1c', borderRadius: '20px', padding: '20px', border: '1px solid #444' }}>
              <h3 style={{ color: '#fff', margin: '0 0 15px 0', textAlign: 'center' }}>
                {t('sharePreview.title')}
              </h3>

              <p style={{ color: '#888', fontSize: '13px', textAlign: 'center', marginBottom: '15px' }}>
                {shareContent.historyImg ? t('sharePreview.archiveReview') : (
                  (!pgFrontRef.current) ? t('sharePreview.loading') :
                    (isSideEmpty('front') && isSideEmpty('back') ? t('sharePreview.noContent') : t('sharePreview.livePreview'))
                )}
              </p>

              <div style={{ background: '#0a0a0a', borderRadius: '12px', padding: '15px', marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
                <img src={shareContent.historyImg || imgUrl} style={{ width: '100%', maxWidth: '300px', borderRadius: '8px', border: '1px solid #444' }} alt="preview" />
              </div>

              {(() => {
                const getPreviewText = () => {
                  switch (shareContent.identity) {
                    case 'partner':
                      return { title: t('shareCard.titles.partner'), content: shareContent.analogy?.slice(0, 80) + '...' };
                    case 'work':
                      return { title: t('shareCard.titles.work'), content: shareContent.workText?.slice(0, 80) + '...' };
                    case 'doctor':
                      return { title: t('shareCard.titles.doctor'), content: (shareContent.med_complaint || t('sharePreview.defaultDoctorContent'))?.slice(0, 80) + '...' };
                    case 'self':
                      return { title: t('shareCard.titles.self'), content: shareContent.selfCare?.slice(0, 80) + '...' };
                    default:
                      return { title: t('sharePreview.defaultTitle'), content: t('sharePreview.defaultContent', { pain: shareContent.pain || '' }) };
                  }
                };

                const previewText = getPreviewText();
                return (
                  <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '15px', marginBottom: '20px' }}>
                    <p style={{ color: '#ff9800', fontSize: '14px', fontWeight: 'bold', margin: '0 0 10px 0' }}>
                      {previewText.title}
                    </p>
                    <p style={{ color: '#ccc', fontSize: '13px', margin: 0 }}>
                      {previewText.content}
                    </p>
                  </div>
                );
              })()}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button style={{ flex: 1, padding: '14px', borderRadius: '25px', background: 'rgba(255,255,255,0.1)', border: '1px solid #555', color: '#fff', cursor: 'pointer', fontSize: '14px' }} onClick={() => setShowSharePreview(false)}>
                  {t('sharePreview.cancel')}
                </button>
                <button style={{ flex: 1, padding: '14px', borderRadius: '25px', background: '#4caf50', border: 'none', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }} onClick={confirmShare}>
                  {t('sharePreview.confirm')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* === 全局 Loading 遮罩层 === */}
        {isLoading && (
          <div style={{
            position: 'fixed', zIndex: 9999, top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{
              width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.3)',
              borderTop: '3px solid #d32f2f', borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            <p style={{ color: '#fff', marginTop: '20px', letterSpacing: '2px' }}>{t('app.loading')}</p>
            <p style={{ color: '#666', fontSize: '12px' }}>{t('app.loadingSub')}</p>
            <p style={{ color: '#666', fontSize: '12px' }}>
              {t('app.loadingHint')}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
export default function App() {
  const [targetLanguage, setTargetLanguage] = useState("zh");

  return (
    <ErrorBoundary>
      <I18nProvider lang={targetLanguage}>
        <AppContent
          targetLanguage={targetLanguage}
          setTargetLanguage={setTargetLanguage}
        />
      </I18nProvider>
    </ErrorBoundary>
  );
}