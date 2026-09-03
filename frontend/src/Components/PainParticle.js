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

    else if (type === 'heavy') {
      this.vel = p5.createVector(0, 0);
      this.isDynamic = true;
      this.life = Infinity;
      this.regionSize = customProps?.regionSize || 40;
      this.points = customProps?.points || [];
      // 下拉循环参数
      this.cyclePhase = p5.random(p5.TWO_PI);
      this.pullProgress = 0;
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

    // ===== 5. 撕刮痛 (Scrape) - 修复版 =====
    else if (type === 'scrape') {
      this.vel = p5.createVector(0, 0);
      const moveSpeed = Number.isFinite(speed) ? speed : 6;
      const angle = Number.isFinite(heading) ? heading : p5.random(p5.TWO_PI);

      // 撕扯长度
      const tearLen = Math.max(12, Math.min(35, moveSpeed * 1.3)) * (0.5 + this.pressureScale * 0.8);

      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      // ===== 1. 主纤维（丝丝缕缕）- 修复方向 =====
      this.fibers = [];
      const fiberCount = Math.floor(3 + this.pressureScale * 6);
      for (let i = 0; i < fiberCount; i++) {
        // 让纤维在撕扯方向两侧均匀分布，而不是固定朝上
        const t = (i / fiberCount) * 2 - 1; // -1 到 1 均匀分布
        const longPos = t * tearLen * 0.5;
        const latOffset = (p5.random() - 0.5) * 8 * this.pressureScale;

        // 沿着撕扯方向分布
        const fx = longPos * cosA - latOffset * sinA;
        const fy = longPos * sinA + latOffset * cosA;

        const fiberLen = p5.random(2, 8) * (0.3 + this.pressureScale * 0.7);
        // 纤维角度应该与撕扯方向相关，而不是完全随机
        const angleOffset = (p5.random() - 0.5) * 0.8; // 在撕扯方向附近小幅波动
        const width = p5.random(0.3, 0.7);

        const curlAmount = p5.random(0, 0.5) * this.pressureScale;
        const curlAngle = angle + angleOffset + (p5.random() - 0.5) * 0.5;

        this.fibers.push({
          x: fx, y: fy,
          len: fiberLen,
          width: width,
          angleOffset: angleOffset,
          curlAmount: curlAmount,
          curlAngle: curlAngle,
          alpha: p5.random(150, 230),
          isBroken: p5.random() < 0.3,
          phase: p5.random(p5.TWO_PI)
        });
      }

      // ===== 2. 撕裂碎屑 =====
      this.chunks = [];
      const chunkCount = Math.floor(2 + this.pressureScale * 4);
      for (let i = 0; i < chunkCount; i++) {
        const t = (i / chunkCount) * 2 - 1; // -1 到 1 均匀分布
        const longPos = t * tearLen * 0.35;
        const latOffset = (p5.random() - 0.5) * 10 * this.pressureScale;

        this.chunks.push({
          x: longPos * cosA - latOffset * sinA,
          y: longPos * sinA + latOffset * cosA,
          size: p5.random(1, 3.5) * (0.3 + this.pressureScale * 0.6),
          alpha: p5.random(180, 255),
          driftX: (p5.random() - 0.5) * 0.8, // 更随机的飘散
          driftY: (p5.random() - 0.5) * 0.8,
          rotation: p5.random(p5.TWO_PI),
          rotSpeed: p5.random(-0.02, 0.02),
          life: 30 + p5.random(40)
        });
      }

      this.life = 150 + this.pressureScale * 80;
    }
  }

  update(p5) {
    if (!this.isDynamic && this.type !== 'pierce') {
      this.pos.add(this.vel);
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
      this.pulseSize = this.size + p5.sin(p5.frameCount * 0.05 + this.seed) * (this.maxSize - this.size);
    } else if (this.type === 'scrape') {
      this.life -= 0.8 + this.pressureScale * 0.3;
      this.vel.mult(0);

      // ✅ 碎屑飘散
      this.chunks.forEach(c => {
        c.x += c.driftX * 0.3;
        c.y += c.driftY * 0.3;
        c.rotation += c.rotSpeed;
        c.life -= 0.8;
        c.alpha = Math.max(0, c.alpha - 2);
        // 慢慢变淡消失
      });
    } else if (this.type === 'pierce') {
      this.life -= 25;
      this.vel.mult(0);
    }
    // =====  heavy  =====
    else if (this.type === 'heavy') {
      const speed = 0.004;
      this.pullProgress += speed;

      if (this.pullProgress > 1) {
        this.pullProgress = 0;
      }

      const t = this.pullProgress;

      // ===== 1. 整体位移 - 下坠快(15%时间)、回弹慢(85%时间) =====
      let yOffsetRatio;
      if (t < 0.15) {
        // 下坠阶段 (15% 时间) - 快速砸下去
        const fallT = t / 0.15;
        // easeIn: 先慢后快，模拟重力加速
        yOffsetRatio = 0.5 - fallT * fallT * 0.4; // 0.5 -> 0.1
        yOffsetRatio = Math.max(0.1, yOffsetRatio);
      } else {
        // 回弹阶段 (85% 时间) - 极其缓慢回升，像被黏在地上
        const riseT = (t - 0.15) / 0.85;
        // easeOut: 先快后慢，但整体速度极慢
        yOffsetRatio = 0.1 + riseT * 0.35; // 0.1 -> 0.45
        yOffsetRatio = Math.min(0.45, yOffsetRatio);
      }

      // 映射到位移
      const displacementRange = this.regionSize * 0.8;
      this.yOffset = (0.5 - yOffsetRatio) / 0.4 * displacementRange;

      // ===== 2. 拉伸 - 下坠时猛烈拉长，回弹时慢慢恢复 =====
      const stretchFactor = 1 + (0.5 - yOffsetRatio) / 0.4 * 0.9;
      this.stretchY = stretchFactor;
      this.squashX = 1 / Math.sqrt(stretchFactor);

      // ===== 3. 下坠力度 - 下坠时猛，回弹时弱 =====
      let pullForce;
      if (t < 0.15) {
        const fallT = t / 0.15;
        pullForce = 0.3 + fallT * 0.7; // 0.3 -> 1.0
      } else {
        const riseT = (t - 0.15) / 0.85;
        pullForce = 1.0 - riseT * 0.6; // 1.0 -> 0.4
        pullForce = Math.max(0.4, pullForce);
      }
      this.pullForce = pullForce;
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

      const tailX = tipX - p.cos(angle) * thrust;
      const tailY = tipY - p.sin(angle) * thrust;
      const perpAngle = angle + p.PI / 2;

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
      p.vertex(tailX + p.cos(perpAngle) * tailW, tailY + p.sin(perpAngle) * tailW);
      p.vertex(tipX, tipY);
      p.vertex(tailX - p.cos(perpAngle) * tailW, tailY - p.sin(perpAngle) * tailW);
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
          const fEndX = tipX + p.cos(fis.angle) * fis.len;
          const fEndY = tipY + p.sin(fis.angle) * fis.len;
          p.line(tipX, tipY, fEndX, fEndY);
        });
      }

      p.pop();
    }

    // ===== heavy - 实色版本，去掉蓝色 =====
    else if (this.type === 'heavy') {
      if (!this.points || this.points.length < 2) return;

      const [r, g, b] = this.color;
      const regionSize = this.regionSize || 40;

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      this.points.forEach(pt => {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      });
      const width = Math.max(maxX - minX, 10);
      const height = Math.max(maxY - minY, 10);
      const cx = this.pos.x;
      const cy = this.pos.y;

      const yOffset = this.yOffset || 0;
      const stretchY = this.stretchY || 1;
      const squashX = this.squashX || 1;
      const pullForce = this.pullForce || 0.5;

      // 实色 - 颜色随下坠力度加深
      const depthFactor = 0.3 + pullForce * 0.7;
      const baseAlpha = Math.min(255, 200 + this.points.length * 0.2);

      // 颜色：保持原始色相，下坠时加深
      const rCol = Math.min(255, r * (0.5 + depthFactor * 0.5));
      const gCol = Math.min(255, g * (0.3 + depthFactor * 0.4));
      const bCol = Math.min(255, b * (0.3 + depthFactor * 0.4));

      p.push();
      p.translate(cx, cy + yOffset);

      // ===== 1. 底部阴影 =====
      p.noStroke();
      const shadowAlpha = Math.min(200, 40 + pullForce * 160);
      p.fill(0, 0, 0, shadowAlpha * 0.10);
      p.ellipse(0, height * 0.3 + 5, width * 2.2 * squashX, height * 0.25);
      p.fill(0, 0, 0, shadowAlpha * 0.15);
      p.ellipse(0, height * 0.5 + 10, width * 1.8 * squashX, height * 0.18);
      p.fill(0, 0, 0, shadowAlpha * 0.22);
      p.ellipse(0, height * 0.7 + 15, width * 1.4 * squashX, height * 0.12);

      // ===== 2. 外层羽化 =====
      p.noStroke();
      p.fill(rCol * 0.5, gCol * 0.3, bCol * 0.3, baseAlpha * 0.05);
      p.ellipse(0, 0, width * 2.8 * squashX, height * 2.8 * stretchY);

      p.fill(rCol * 0.6, gCol * 0.35, bCol * 0.35, baseAlpha * 0.10);
      p.ellipse(0, 0, width * 2.2 * squashX, height * 2.2 * stretchY);

      p.fill(rCol * 0.7, gCol * 0.4, bCol * 0.4, baseAlpha * 0.18);
      p.ellipse(0, 0, width * 1.8 * squashX, height * 1.8 * stretchY);

      // ===== 3. 砂锅主体 - 厚实 =====
      p.fill(rCol * 0.85, gCol * 0.5, bCol * 0.5, baseAlpha * 0.35);
      p.ellipse(-width * 0.03, height * 0.03, width * 1.5 * squashX, height * 1.5 * stretchY);

      p.fill(rCol * 0.85, gCol * 0.5, bCol * 0.5, baseAlpha * 0.30);
      p.ellipse(width * 0.03, -height * 0.02, width * 1.4 * squashX, height * 1.4 * stretchY);

      // ===== 4. 核心 =====
      p.fill(rCol * 0.6, gCol * 0.3, bCol * 0.3, baseAlpha * 0.65);
      p.ellipse(0, height * 0.01, width * 0.85 * squashX, height * 0.85 * stretchY);

      p.fill(rCol * 0.4, gCol * 0.2, bCol * 0.2, baseAlpha * 0.85);
      p.ellipse(width * 0.02, -height * 0.01, width * 0.55 * squashX, height * 0.55 * stretchY);

      // ===== 5. 最深核心 - 几乎黑色 =====
      p.fill(rCol * 0.15, gCol * 0.08, bCol * 0.08, Math.min(255, baseAlpha * 0.95));
      p.ellipse(0, 0, width * 0.25 * squashX, height * 0.25 * stretchY);

      // ===== 6. 底部拖影 - 石头拉扯感 =====
      const dragAlpha = Math.min(180, 30 + pullForce * 150);
      for (let i = 1; i <= 4; i++) {
        const offset = 8 + i * 6 + pullForce * 12;
        p.fill(0, 0, 0, dragAlpha * 0.06 * (1 - i * 0.15));
        p.ellipse(
          0,
          height * 0.3 + offset,
          width * (1.0 - i * 0.06) * squashX,
          height * 0.08 * (1 + i * 0.15)
        );
      }

      // ===== 7. 底部石头感 - 硬质重物 =====
      p.fill(
        rCol * 0.15,
        gCol * 0.08,
        bCol * 0.08,
        Math.min(160, 30 + pullForce * 130)
      );
      p.ellipse(
        0,
        height * 0.45 + 15 + pullForce * 20,
        width * 0.35 * squashX,
        height * 0.06 + pullForce * 0.05
      );

      p.fill(
        rCol * 0.08,
        gCol * 0.04,
        bCol * 0.04,
        Math.min(130, 20 + pullForce * 110)
      );
      p.ellipse(
        0,
        height * 0.55 + 25 + pullForce * 25,
        width * 0.2 * squashX,
        height * 0.04 + pullForce * 0.03
      );

      // ===== 8. 不规则噪点 =====
      const numNoise = Math.floor(12 + pullForce * 20);
      for (let i = 0; i < numNoise; i++) {
        const angle = p.random(p.TWO_PI);
        const dist = p.random(0.2, 1.0) * width * 0.5 * squashX;
        const nx = Math.cos(angle) * dist;
        const ny = Math.sin(angle) * dist * 0.7 * stretchY;
        const size = p.random(2, 5) * (0.3 + pullForce * 0.5);
        const noiseAlpha = p.random(8, 25) * (0.3 + pullForce * 0.5);
        p.fill(rCol * 0.4, gCol * 0.2, bCol * 0.2, noiseAlpha);
        p.ellipse(nx, ny, size, size * 0.6);
      }

      // ===== 9. 重力垂线 - 下坠方向 =====
      if (pullForce > 0.3) {
        const lineAlpha = Math.min(140, 15 + pullForce * 125);
        p.stroke(rCol * 0.15, gCol * 0.08, bCol * 0.08, lineAlpha * 0.3);
        p.strokeWeight(0.5 + pullForce * 0.8);
        const numLines = Math.floor(3 + pullForce * 5);
        for (let i = 0; i < numLines; i++) {
          const xOff = (i / (numLines - 1) - 0.5) * width * 0.5;
          const yStart = -height * 0.2 + i * 0.2;
          const yEnd = height * 0.4 + i * 0.15;
          const curveOff = Math.sin(i * 0.7 + this.seed) * 2;
          p.beginShape();
          for (let t = 0; t <= 1; t += 0.05) {
            const y = yStart + (yEnd - yStart) * t;
            const x = xOff + curveOff * t * t;
            p.vertex(x, y);
          }
          p.endShape();
        }
      }

      // ===== 10. 底部触地波纹 - 砸到底时出现 =====
      if (pullForce > 0.7) {
        const rippleStrength = (pullForce - 0.7) / 0.3;
        p.noFill();
        const rippleAlpha = Math.min(120, 20 + rippleStrength * 100);
        p.stroke(rCol * 0.2, gCol * 0.1, bCol * 0.1, rippleAlpha * 0.4);
        p.strokeWeight(0.5 + rippleStrength * 1.2);
        for (let i = 0; i < 3; i++) {
          const radius = width * (0.3 + i * 0.12 + rippleStrength * 0.15);
          const alphaMul = 1 - i * 0.25;
          p.stroke(rCol * 0.2, gCol * 0.1, bCol * 0.1, rippleAlpha * 0.4 * alphaMul);
          p.ellipse(0, height * 0.35 + i * 2, radius * squashX, radius * 0.3 * stretchY);
        }
      }

      // ===== 11. 用户笔触点 =====
      const numDots = Math.min(this.points.length, 60);
      for (let i = 0; i < numDots; i++) {
        const idx = Math.floor(i * this.points.length / numDots);
        const pt = this.points[idx];
        if (!pt) continue;
        const dotIntensity = pt.intensity || 0.5;
        const dotSizeX = (2 + dotIntensity * 7) * squashX;
        const dotSizeY = (2 + dotIntensity * 7) * stretchY * 0.5;
        const dotAlpha = Math.min(220, 100 + dotIntensity * 120);
        p.noStroke();
        p.fill(rCol * 0.4, gCol * 0.2, bCol * 0.2, dotAlpha * 0.6);
        p.ellipse(
          pt.x - cx,
          pt.y - cy,
          dotSizeX * 0.5,
          dotSizeY * 0.4
        );
      }

      p.pop();
    }

    // ===== 3. 绞痛 =====
    else if (this.type === 'twist') {
      p.push();
      p.translate(this.pos.x, this.pos.y);
      p.rotate(this.angle);

      p.noFill();
      p.stroke(this.color[0], this.color[1], this.color[2], 110);
      p.strokeWeight(1.2);
      p.beginShape();
      for (let a = 0; a < p.TWO_PI * 1.2; a += 0.25) {
        const r = p.map(a, 0, p.TWO_PI * 1.2, this.size * 1.6, this.size * 0.4);
        p.vertex(r * p.cos(a), r * p.sin(a));
      }
      p.endShape();

      p.fill(this.color[0] * 0.85, 0, 0, 160 + (65 * this.pressureScale));
      p.stroke(this.color[0] * 0.5, 0, 0, 240);
      p.strokeWeight(1.0);
      p.beginShape();
      for (let i = 0; i < 7; i++) {
        const angle = (i * p.TWO_PI) / 7;
        const rad = this.size * (0.35 + (i % 2 === 0 ? 0.08 : -0.08));
        p.vertex(rad * p.cos(angle), rad * p.sin(angle));
      }
      p.endShape(p.CLOSE);
      p.pop();
    }

    // ===== 4. 酸胀 =====
    else if (this.type === 'wave') {
      p.noStroke();
      p.fill(this.color[0], this.color[1], this.color[2], 10);
      p.ellipse(this.pos.x, this.pos.y, this.pulseSize, this.pulseSize);

      p.fill(this.color[0], this.color[1], this.color[2], 6 + (14 * this.pressureScale));
      p.ellipse(this.pos.x, this.pos.y, this.pulseSize * 0.7, this.pulseSize * 0.7);
    }

    // ===== 修复 show 方法中的 scrape - 纤维更透明 =====
    else if (this.type === 'scrape') {
      const [r, g, b] = this.color;
      const alpha = Math.max(0, this.life / 255);

      const isReddish = r > g && r > b;
      let rCol, gCol, bCol;
      if (isReddish) {
        rCol = Math.min(255, r * 0.8 + 30);
        gCol = Math.min(255, g * 0.4 + 20);
        bCol = Math.min(255, b * 0.4 + 20);
      } else {
        rCol = Math.min(255, r * 0.8 + 30);
        gCol = Math.min(255, g * 0.8 + 30);
        bCol = Math.min(255, b * 0.8 + 30);
      }

      p.push();
      p.translate(this.pos.x, this.pos.y);

      // ===== 1. 主纤维 - 更透明更细 =====
      this.fibers.forEach(f => {
        // 大幅降低透明度
        const fAlpha = f.alpha * alpha * 0.3; // 从 0.8 降到 0.3
        const len = f.len;

        // 颜色更淡
        p.stroke(
          Math.min(255, rCol * 0.5 + 30),
          Math.min(255, gCol * 0.5 + 30),
          Math.min(255, bCol * 0.5 + 30),
          fAlpha
        );
        // 纤维更细
        p.strokeWeight(f.width * 0.5);

        const fiberAngle = this.angle + f.angleOffset;
        const startX = f.x - len * 0.5 * Math.cos(fiberAngle);
        const startY = f.y - len * 0.5 * Math.sin(fiberAngle);
        const midX = f.x;
        const midY = f.y;
        const endX = f.x + len * 0.5 * Math.cos(fiberAngle);
        const endY = f.y + len * 0.5 * Math.sin(fiberAngle);
        const curlEndX = endX + Math.cos(f.curlAngle) * f.curlAmount * 2;
        const curlEndY = endY + Math.sin(f.curlAngle) * f.curlAmount * 2;

        if (f.isBroken) {
          p.line(startX, startY, midX, midY);
          p.stroke(
            Math.min(255, rCol * 0.4 + 20),
            Math.min(255, gCol * 0.4 + 20),
            Math.min(255, bCol * 0.4 + 20),
            fAlpha * 0.3
          );
          p.strokeWeight(f.width * 0.3);
          const scatterX = Math.sin(f.phase + this.life * 0.02) * 2;
          const scatterY = Math.cos(f.phase * 1.3) * 2;
          p.line(midX, midY, midX + scatterX, midY + scatterY);
        } else {
          p.line(startX, startY, midX, midY);
          p.line(midX, midY, endX, endY);
          if (f.curlAmount > 0.1) {
            p.stroke(
              Math.min(255, rCol * 0.4 + 20),
              Math.min(255, gCol * 0.4 + 20),
              Math.min(255, bCol * 0.4 + 20),
              fAlpha * 0.4
            );
            p.strokeWeight(f.width * 0.4);
            p.line(endX, endY, curlEndX, curlEndY);
          }
        }
      });

      // ===== 2. 撕裂碎屑 - 更透明 =====
      this.chunks.forEach(c => {
        if (c.life <= 0 || c.alpha <= 0) return;
        const cAlpha = c.alpha * alpha * 0.3; // 从 0.6 降到 0.3
        p.noStroke();
        p.fill(
          Math.min(255, rCol * 0.5 + 20),
          Math.min(255, gCol * 0.5 + 20),
          Math.min(255, bCol * 0.5 + 20),
          cAlpha
        );
        p.push();
        p.translate(c.x, c.y);
        p.rotate(c.rotation);
        const size = c.size * (0.8 + 0.4 * Math.sin(c.life * 0.05));
        p.ellipse(0, 0, size * 0.6, size * 0.6 * (0.5 + 0.5 * Math.sin(c.life * 0.07 + 1)));
        p.pop();
      });

      // ===== 3. 浅色撕裂边缘 - 更淡 =====
      p.noFill();
      p.stroke(
        Math.min(255, rCol * 0.3 + 20),
        Math.min(255, gCol * 0.3 + 20),
        Math.min(255, bCol * 0.3 + 20),
        20 * alpha
      );
      p.strokeWeight(0.3);
      for (let i = -1; i <= 1; i++) {
        if (i === 0) continue;
        p.beginShape();
        for (let t = -0.6; t <= 0.6; t += 0.1) {
          const x = t * 20 + Math.sin(t * 5 + i * 2) * 2;
          const y = i * 2 + Math.cos(t * 4 + i * 1.5) * 1.5;
          p.vertex(x, y);
        }
        p.endShape();
      }

      p.pop();
    }
  }


  isDead() {
    return this.life < 0;
  }
}

export default PainParticle;