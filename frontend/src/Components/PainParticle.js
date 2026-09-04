// src/Components/PainParticle.js

export class PainParticle {
  constructor(p5, x, y, type, color, speed, heading, bodyMode, pressure = 0.5, customProps = {}) {
    this.p5 = p5;
    this.pos = p5.createVector(x, y);
    this.baseY = y;
    this.type = type;
    this.color = color || [211, 47, 47];
    this.life = 255;
    this.seed = p5.random(1000);
    this.bodyMode = bodyMode;
    this.pressureScale = Number.isFinite(pressure) ? Math.max(0.2, Math.min(1.0, pressure)) : 0.5;
    this.isDynamic = (type === 'wave' || type === 'twist' || type === 'heavy');

    const now = new Date();
    this.drawnAt = now.getTime();
    this.minuteOfDay = now.getHours() * 60 + now.getMinutes();

    // ===== 1. 刺痛 (Pierce) =====
    if (type === 'pierce') {
      const angle = Number.isFinite(heading) ? heading : p5.random(p5.TWO_PI);
      const thrust = p5.random(25, 37) * (0.85 + this.pressureScale * 0.3);
      this.pierceAngle = angle;
      this.thrustLen = thrust;
      this.vel = p5.createVector(0, 0);
      this.size = p5.random(1.8, 3.8);

      this.fissures = [];
      const numFissures = p5.floor(p5.random(3, 5));
      for (let i = 0; i < numFissures; i++) {
        this.fissures.push({
          angle: angle + p5.random(-p5.PI * 0.65, p5.PI * 0.65),
          len: p5.random(3.5, 7.5) * this.pressureScale
        });
      }
    }

    // ===== 2. 坠痛 (Heavy) =====
    else if (type === 'heavy') {
      this.vel = p5.createVector(0, 0);
      this.isDynamic = true;
      this.life = Infinity;
      this.regionSize = customProps?.regionSize || 40;
      this.points = customProps?.points || [];
      this.springStretch = 1.0 / 3.0; // 初始基线 1/3
      this.heavyPhase = 'drop'; // 'drop' | 'recover'
      this.phaseFrame = Math.floor(p5.random(0, 20)); // 错开初始相位
    }

    // ===== 3. 绞痛 (Twist) =====
    else if (type === 'twist') {
      this.vel = p5.createVector(0, 0);
      this.size = p5.random(18, 30) * (0.6 + this.pressureScale * 0.5);
      this.initialSize = this.size;
      this.angle = p5.random(p5.TWO_PI);
    }

    // ===== 4. 酸胀 (Wave) =====
    else if (type === 'wave') {
      this.vel = p5.createVector(0, 0);
      this.size = p5.random(8, 16);
      this.maxSize = p5.random(40, 70) * (0.6 + this.pressureScale * 0.5);
      this.pulseSize = this.size;
    }

    // ===== 5. 撕刮痛 (Scrape) =====
    // 伤口/短横/点均为深色 100% 不透明；纤维均匀细线，长度缩短为与伤口一致 (1:1)，透明度 50% -> 0%
    else if (type === 'scrape') {
      this.vel = p5.createVector(0, 0);
      const moveSpeed = Number.isFinite(speed) ? speed : 6;
      const angle = Number.isFinite(heading) ? heading : p5.random(p5.TWO_PI);
      const woundLen = Math.max(18, Math.min(34, moveSpeed * 1.4)) * (0.7 + this.pressureScale * 0.6);

      this.woundAngle = angle;
      this.woundLen = woundLen;
      // 🌟 纤维长度缩短为与伤口长度完全一致 (1:1)
      this.fiberTargetLen = woundLen;
      // 伤口短横宽度大概为短横的 1/10
      this.woundThickness = Math.max(2.0, woundLen * 0.10);

      // 伤口四周平行的短横（<= 1/2 长度）或点（深色，100% 透明度）
      this.subMarks = [];
      const numMarks = Math.floor(4 + this.pressureScale * 4);
      for (let i = 0; i < numMarks; i++) {
        const isDot = p5.random() < 0.45;
        const maxSubLen = this.woundLen * 0.5;
        const subLen = isDot ? 0 : p5.random(this.woundLen * 0.16, maxSubLen);

        const latOffset = (p5.random() > 0.5 ? 1 : -1) * p5.random(4.0, 13.0 + this.pressureScale * 5);
        const longOffset = (p5.random() - 0.5) * this.woundLen * 0.85;

        this.subMarks.push({
          isDot,
          len: subLen,
          latOffset,
          longOffset,
          weight: isDot ? Math.max(1.3, this.woundThickness * 0.5) : Math.max(1.0, this.woundThickness * 0.4)
        });
      }

      // 纤维骨架：均匀适度线宽，向四周蔓延与伤口等长的距离
      const numFibers = Math.floor(5 + this.pressureScale * 3);
      this.fibers = [];
      this.maxSteps = 14;

      for (let i = 0; i < numFibers; i++) {
        const t = (p5.random() - 0.5) * this.woundLen * 0.85;
        const edgeSide = (p5.random() > 0.5 ? 1 : -1) * (this.woundThickness * 0.45);
        const perpCos = -Math.sin(angle);
        const perpSin = Math.cos(angle);

        const startX = this.pos.x + Math.cos(angle) * t + perpCos * edgeSide;
        const startY = this.pos.y + Math.sin(angle) * t + perpSin * edgeSide;

        let curAngle = p5.random(p5.TWO_PI);
        const totalLen = this.fiberTargetLen * p5.random(0.92, 1.08);
        const stepDist = totalLen / this.maxSteps;

        const points = [{ x: startX, y: startY }];
        let px = startX;
        let py = startY;

        for (let s = 1; s <= this.maxSteps; s++) {
          curAngle += (p5.random() - 0.5) * 0.45;
          px += Math.cos(curAngle) * stepDist;
          py += Math.sin(curAngle) * stepDist;
          points.push({ x: px, y: py });
        }

        this.fibers.push({
          points: points,
          weight: p5.random(1.2, 1.55),
          rootAlpha: 128 // 50% 根部透明度
        });
      }

      this.currentStep = 0;
      this.life = 255;
    }
  }

  update(p5) {
    const p = p5 || this.p5;

    if (!this.isDynamic && this.type !== 'pierce') {
      if (this.vel && this.pos) {
        this.pos.add(this.vel);
      }
    }

    if (this.type === 'twist') {
      const minSize = this.initialSize / 3;
      if (this.size > minSize) {
        this.angle += 0.08;
        this.size *= 0.985;
        if (this.size <= minSize) {
          this.size = minSize;
        }
      }
    } else if (this.type === 'wave') {
      if (p) {
        this.pulseSize = this.size + Math.sin(p.frameCount * 0.05 + this.seed) * (this.maxSize - this.size);
      }
    } else if (this.type === 'scrape') {
      this.currentStep += 1;
      if (this.currentStep > this.maxSteps + 1) {
        this.life = -1;
      }
      if (this.vel) this.vel.mult(0);
    } else if (this.type === 'pierce') {
      this.life -= 25;
      if (this.vel) this.vel.mult(0);
    }

    // ===== heavy - 严密运动学 =====
    else if (this.type === 'heavy') {
      const minStretch = 1.0 / 3.0;          
      const stretchRange = 1.0 - minStretch;

      const dropFrames = 20;
      const recoverFrames = 60;

      if (!this.heavyPhase) {
        this.heavyPhase = 'drop';
        this.phaseFrame = 0;
      }

      this.phaseFrame++;

      let normFactor = 0;
      if (this.heavyPhase === 'drop') {
        this.isDropping = true;
        const u = Math.min(1.0, this.phaseFrame / dropFrames);

        if (u <= 0.5) {
          normFactor = (16.0 / 9.0) * (u * u);
        } else if (u <= 0.75) {
          const w = 4.0 * (u - 0.5);
          normFactor = (4.0 / 9.0) * (1.0 + w - 0.125 * w * w);
        } else {
          const z = 4.0 * (u - 0.75);
          normFactor = 1.0 - (1.0 / 6.0) * Math.pow(1.0 - z, 2.0);
        }

        if (this.phaseFrame >= dropFrames) {
          this.heavyPhase = 'recover';
          this.phaseFrame = 0;
        }
      } else {
        this.isDropping = false;
        const v = Math.min(1.0, this.phaseFrame / recoverFrames);

        let recProgress = 0;
        if (v <= 0.25) {
          const a = 4.0 * v;
          recProgress = (2.0 / 9.0) * (a * a);
        } else if (v <= 0.5) {
          const b = 4.0 * (v - 0.25);
          recProgress = (2.0 / 9.0) + (4.0 / 9.0) * b;
        } else if (v <= 0.75) {
          const c = 4.0 * (v - 0.5);
          recProgress = (6.0 / 9.0) + (4.0 / 9.0) * (c - 0.375 * c * c);
        } else {
          const d = 4.0 * (v - 0.75);
          recProgress = 1.0 - (1.0 / 18.0) * Math.pow(1.0 - d, 2.0);
        }

        normFactor = Math.max(0.0, 1.0 - recProgress);

        if (this.phaseFrame >= recoverFrames) {
          this.heavyPhase = 'drop';
          this.phaseFrame = 0;
        }
      }

      this.springStretch = minStretch + normFactor * stretchRange;
    }
  }

  show(pg) {
    const p = pg || this.p5;
    if (!p) return;

    // ===== 1. 刺痛 =====
    if (this.type === 'pierce') {
      const tipX = this.pos.x;
      const tipY = this.pos.y;
      const angle = this.pierceAngle;
      const thrust = this.thrustLen;

      const tailX = tipX - Math.cos(angle) * thrust;
      const tailY = tipY - Math.sin(angle) * thrust;
      const perpAngle = angle + Math.PI / 2;

      p.push();
      const tailW = 0.9;
      p.noStroke();
      p.fill(
        Math.min(255, this.color[0] + 160),
        Math.min(255, this.color[1] + 140),
        Math.min(255, this.color[2] + 140),
        220
      );
      p.beginShape();
      p.vertex(tailX + Math.cos(perpAngle) * tailW, tailY + Math.sin(perpAngle) * tailW);
      p.vertex(tipX, tipY);
      p.vertex(tailX - Math.cos(perpAngle) * tailW, tailY - Math.sin(perpAngle) * tailW);
      p.endShape(p.CLOSE);

      p.stroke(255, 255, 255, 250);
      p.strokeWeight(0.55);
      p.line(tailX, tailY, tipX, tipY);

      p.stroke(this.color[0], this.color[1] * 0.3, this.color[2] * 0.3, 130);
      p.strokeWeight(1.0);
      p.line(tailX, tailY, tipX, tipY);

      p.fill(this.color[0], this.color[1], this.color[2], 220);
      p.noStroke();
      p.ellipse(tailX, tailY, 1.8, 1.8);
      p.fill(255, 255, 255, 255);
      p.ellipse(tipX, tipY, 1.2, 1.2);

      if (this.fissures) {
        p.stroke(this.color[0], 0, 0, 180);
        p.strokeWeight(0.5);
        this.fissures.forEach(fis => {
          const fEndX = tipX + Math.cos(fis.angle) * fis.len;
          const fEndY = tipY + Math.sin(fis.angle) * fis.len;
          p.line(tipX, tipY, fEndX, fEndY);
        });
      }
      p.pop();
    }

    // ===== 2. 坠痛 (Heavy) =====
    else if (this.type === 'heavy') {
      if (!this.points || this.points.length < 2) return;

      const [r, g, b] = this.color;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      this.points.forEach(pt => {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      });

      const boxW = Math.max(maxX - minX, 24);
      const boxH = Math.max(maxY - minY, 24);
      const cx = this.pos.x;
      const cy = this.pos.y;
      const minStretch = 1.0 / 3.0;
      const S = this.springStretch || minStretch;

      p.push();

      // 1. 骨架与行程
      const layer0W = boxW * 1.25;
      const layer0H = boxH * 1.25;
      const majorAxis = Math.max(layer0W, layer0H);

      const STRETCH_RATIO = 2.4;
      const maxTotalStretch = majorAxis * STRETCH_RATIO;
      const normTension = Math.max(0, (S - minStretch) / (1.0 - minStretch));

      const sizeScales = [1.0, 0.90, 0.74, 0.51, 0.22];
      const baseLayers = sizeScales.map(scale => ({
        w: layer0W * scale,
        h: layer0H * scale
      }));

      const layerYOffsets = [0];
      const stepWeights = [0.18, 0.24, 0.28, 0.30];
      for (let i = 1; i < baseLayers.length; i++) {
        const desiredDeltaY = maxTotalStretch * stepWeights[i - 1] * S;
        layerYOffsets.push(layerYOffsets[i - 1] + desiredDeltaY);
      }

      const bottomPoints = [];
      for (let i = 0; i < baseLayers.length; i++) {
        const h = baseLayers[i].h;
        const ryBottom = (h * 0.5) * (1.0 + normTension * 1.6);
        const bottomY = cy + layerYOffsets[i] + ryBottom;
        bottomPoints.push({ bottomY });
      }

      const deepestY = bottomPoints[bottomPoints.length - 1].bottomY;

      // 2. 最大椭圆：透明且无描边
      const curveAreaAlpha = 46 + S * 30;
      const maxEllipseAlpha = 16 + S * 12;

      p.push();
      p.noStroke();
      p.fill(r, g, b, maxEllipseAlpha);
      p.ellipse(cx, cy, layer0W, layer0H);
      p.pop();

      // 3. 张力曲线与虚化消散
      const leftAnchorX = cx - layer0W * 0.5;
      const rightAnchorX = cx + layer0W * 0.5;
      const anchorY = cy;
      const blurAlphaFactor = 1.0 - normTension * 0.65;

      // (A) 漫反射发散微光
      p.noFill();
      const diffuseWeight = 4.0 + normTension * 8.0;
      p.stroke(r, g, b, (35 + S * 40) * (0.6 + normTension * 0.4));
      p.strokeWeight(diffuseWeight);
      p.beginShape();
      p.vertex(leftAnchorX, anchorY);
      p.bezierVertex(
        cx - layer0W * 0.35, anchorY + (deepestY - anchorY) * 0.75,
        cx - layer0W * 0.15, deepestY,
        cx, deepestY
      );
      p.bezierVertex(
        cx + layer0W * 0.15, deepestY,
        cx + layer0W * 0.35, anchorY + (deepestY - anchorY) * 0.75,
        rightAnchorX, anchorY
      );
      p.endShape();

      // (B) 核心紧绷张力线
      const solidLineAlpha = (180 + S * 75) * blurAlphaFactor;
      p.stroke(r, g, b, solidLineAlpha);
      p.strokeWeight(2.2 + S * 0.8);
      p.beginShape();
      p.vertex(leftAnchorX, anchorY);
      p.bezierVertex(
        cx - layer0W * 0.35, anchorY + (deepestY - anchorY) * 0.72,
        cx - layer0W * 0.12, deepestY,
        cx, deepestY
      );
      p.bezierVertex(
        cx + layer0W * 0.12, deepestY,
        cx + layer0W * 0.35, anchorY + (deepestY - anchorY) * 0.72,
        rightAnchorX, anchorY
      );
      p.endShape();

      // (C) 曲线包围微光区域
      p.noStroke();
      p.fill(r, g, b, curveAreaAlpha * blurAlphaFactor);
      p.beginShape();
      p.vertex(leftAnchorX, anchorY);
      p.bezierVertex(
        cx - layer0W * 0.35, anchorY + (deepestY - anchorY) * 0.72,
        cx - layer0W * 0.12, deepestY,
        cx, deepestY
      );
      p.bezierVertex(
        cx + layer0W * 0.12, deepestY,
        cx + layer0W * 0.35, anchorY + (deepestY - anchorY) * 0.72,
        rightAnchorX, anchorY
      );
      p.bezierVertex(cx + layer0W * 0.3, anchorY + 8, cx - layer0W * 0.3, anchorY + 8, leftAnchorX, anchorY);
      p.endShape(p.CLOSE);

      // (D) 重物实体面
      const isWeightVisible = (this.heavyPhase === 'drop') || 
        (this.heavyPhase === 'recover' && (this.phaseFrame / 60.0) <= (1.0 / 6.0));

      if (isWeightVisible && normTension > 0.02) {
        p.push();
        p.noStroke();
        const solidAlpha = 220 + normTension * 35;
        p.fill(r, g, b, solidAlpha);

        p.beginShape();
        p.vertex(cx - layer0W * 0.5, cy);
        p.bezierVertex(
          cx - layer0W * 0.5, cy - layer0H * 0.5,
          cx + layer0W * 0.5, cy - layer0H * 0.5,
          cx + layer0W * 0.5, cy
        );
        p.bezierVertex(
          cx + baseLayers[1].w * 0.5, cy + layerYOffsets[1] + baseLayers[1].h * 0.3,
          cx + baseLayers[3].w * 0.5, cy + layerYOffsets[3] + baseLayers[3].h * 0.4,
          cx, deepestY
        );
        p.bezierVertex(
          cx - baseLayers[3].w * 0.5, cy + layerYOffsets[3] + baseLayers[3].h * 0.4,
          cx - baseLayers[1].w * 0.5, cy + layerYOffsets[1] + baseLayers[1].h * 0.3,
          cx - layer0W * 0.5, cy
        );
        p.endShape(p.CLOSE);
        p.pop();
      }

      // 4. 底部投影
      p.noStroke();
      const shadowAlpha = 28 + S * 135;
      p.fill(0, 0, 0, shadowAlpha * 0.45);
      p.ellipse(cx, deepestY + 10, baseLayers[4].w * 2.5, 12 + S * 20);

      // 5. 固定手绘笔触点
      const numDots = Math.min(this.points.length, 30);
      for (let k = 0; k < numDots; k++) {
        const idx = Math.floor(k * this.points.length / numDots);
        const pt = this.points[idx];
        if (!pt) continue;

        p.noStroke();
        p.fill(r, g, b, 140);
        p.ellipse(pt.x, pt.y, 2.2, 2.2);
      }

      p.pop();
    }

    // ===== 3. 绞痛 (Twist) =====
    else if (this.type === 'twist') {
      p.push();
      p.translate(this.pos.x, this.pos.y);
      p.rotate(this.angle);

      p.noFill();
      p.stroke(this.color[0], this.color[1], this.color[2], 110);
      p.strokeWeight(1.2);
      p.beginShape();
      for (let a = 0; a < p.TWO_PI * 1.2; a += 0.25) {
        const rad = p.map(a, 0, p.TWO_PI * 1.2, this.size * 1.6, this.size * 0.4);
        p.vertex(rad * Math.cos(a), rad * Math.sin(a));
      }
      p.endShape();

      p.fill(this.color[0] * 0.85, 0, 0, 160 + (65 * this.pressureScale));
      p.stroke(this.color[0] * 0.5, 0, 0, 240);
      p.strokeWeight(1.0);
      p.beginShape();
      for (let i = 0; i < 7; i++) {
        const a = (i * p.TWO_PI) / 7;
        const rad = this.size * (0.35 + (i % 2 === 0 ? 0.08 : -0.08));
        p.vertex(rad * Math.cos(a), rad * Math.sin(a));
      }
      p.endShape(p.CLOSE);
      p.pop();
    }

    // ===== 4. 酸胀 (Wave) =====
    else if (this.type === 'wave') {
      p.noStroke();
      p.fill(this.color[0], this.color[1], this.color[2], 10);
      p.ellipse(this.pos.x, this.pos.y, this.pulseSize, this.pulseSize);

      p.fill(this.color[0], this.color[1], this.color[2], 6 + (14 * this.pressureScale));
      p.ellipse(this.pos.x, this.pos.y, this.pulseSize * 0.7, this.pulseSize * 0.7);
    }

    // ===== 5. 撕刮痛 (Scrape) =====
    // 伤口/短横/点均为深色 100% 不透明；纤维均匀细线，长度缩短为与伤口一致 (1:1)，只保留 50% -> 0% 透明度衰减
    else if (this.type === 'scrape') {
      const [r, g, b] = this.color;

      // 深度暗血色相
      const darkR = Math.max(0, Math.round(r * 0.38));
      const darkG = Math.max(0, Math.round(g * 0.18));
      const darkB = Math.max(0, Math.round(b * 0.18));

      const cosA = Math.cos(this.woundAngle);
      const sinA = Math.sin(this.woundAngle);
      const perpCos = -sinA;
      const perpSin = cosA;

      const halfL = this.woundLen * 0.5;
      const halfT = this.woundThickness * 0.5;

      const tip1X = this.pos.x - cosA * halfL;
      const tip1Y = this.pos.y - sinA * halfL;
      const tip2X = this.pos.x + cosA * halfL;
      const tip2Y = this.pos.y + sinA * halfL;

      const step = this.currentStep;

      // ============================================================
      // 🌟【底层】纤维绘制：长度与伤口等长 (1:1)，50% (128) 递减到 0%
      // ============================================================
      if (step >= 1 && step <= this.maxSteps) {
        p.push();
        p.strokeCap(p.ROUND);

        const t = step / this.maxSteps; // 0.0 -> 1.0

        this.fibers.forEach(f => {
          const pt0 = f.points[step - 1];
          const pt1 = f.points[step];
          if (pt0 && pt1) {
            // 透明度从 50% (128) 线性衰减至 0 完全消隐
            const curAlpha = f.rootAlpha * Math.max(0, 1.0 - t);

            if (curAlpha > 1.0) {
              p.stroke(r, g, b, curAlpha);
              p.strokeWeight(f.weight);
              p.line(pt0.x, pt0.y, pt1.x, pt1.y);
            }
          }
        });
        p.pop();
      }

      // ============================================================
      // 🌟【顶层】伤口短横及平行短横/点：全部为深色 100% 不透明，绝不被纤维覆盖
      // ============================================================
      if (step === 1 || step === this.maxSteps) {
        p.push();

        // [A] 两端尖锐梭形主伤口（深色 100% 完全不透明）
        p.noStroke();
        p.fill(darkR, darkG, darkB, 255);

        p.beginShape();
        p.vertex(tip1X, tip1Y);
        p.bezierVertex(
          this.pos.x - cosA * (halfL * 0.45) + perpCos * halfT,
          this.pos.y - sinA * (halfL * 0.45) + perpSin * halfT,
          this.pos.x + cosA * (halfL * 0.45) + perpCos * halfT,
          this.pos.y + sinA * (halfL * 0.45) + perpSin * halfT,
          tip2X, tip2Y
        );
        p.bezierVertex(
          this.pos.x + cosA * (halfL * 0.45) - perpCos * halfT,
          this.pos.y + sinA * (halfL * 0.45) - perpSin * halfT,
          this.pos.x - cosA * (halfL * 0.45) - perpCos * halfT,
          this.pos.y - sinA * (halfL * 0.45) - perpSin * halfT,
          tip1X, tip1Y
        );
        p.endShape(p.CLOSE);

        // 伤口核心刀划深痕 (100% 不透明)
        p.stroke(Math.round(darkR * 0.6), Math.round(darkG * 0.6), Math.round(darkB * 0.6), 255);
        p.strokeWeight(Math.max(0.8, this.woundThickness * 0.25));
        p.line(tip1X, tip1Y, tip2X, tip2Y);

        // [B] 随机平行短横或散落点：全部为 100% 完全不透明 (alpha = 255)
        if (this.subMarks && step === this.maxSteps) {
          this.subMarks.forEach(sm => {
            const centerX = this.pos.x + cosA * sm.longOffset + perpCos * sm.latOffset;
            const centerY = this.pos.y + sinA * sm.longOffset + perpSin * sm.latOffset;

            if (sm.isDot) {
              p.noStroke();
              p.fill(darkR, darkG, darkB, 255);
              p.ellipse(centerX, centerY, sm.weight * 1.3, sm.weight * 1.3);
            } else {
              const subHalf = sm.len * 0.5;
              const sx1 = centerX - cosA * subHalf;
              const sy1 = centerY - sinA * subHalf;
              const sx2 = centerX + cosA * subHalf;
              const sy2 = centerY + sinA * subHalf;

              p.stroke(darkR, darkG, darkB, 255);
              p.strokeWeight(sm.weight);
              p.line(sx1, sy1, sx2, sy2);
            }
          });
        }

        p.pop();
      }
    }
  }

  isDead() {
    return this.life < 0;
  }
}

export default PainParticle;