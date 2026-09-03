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
      this.cyclePhase = p5.random(p5.TWO_PI);
      this.pullProgress = 0;
      this.springStretch = 1.0 / 3.0; // 初始为 1/3 最低基线
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
    else if (type === 'scrape') {
      this.vel = p5.createVector(0, 0);
      const moveSpeed = Number.isFinite(speed) ? speed : 6;
      const angle = Number.isFinite(heading) ? heading : p5.random(p5.TWO_PI);
      const tearLen = Math.max(12, Math.min(35, moveSpeed * 1.3)) * (0.5 + this.pressureScale * 0.8);

      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      this.fibers = [];
      const fiberCount = Math.floor(3 + this.pressureScale * 6);
      for (let i = 0; i < fiberCount; i++) {
        const t = (i / fiberCount) * 2 - 1;
        const longPos = t * tearLen * 0.5;
        const latOffset = (p5.random() - 0.5) * 8 * this.pressureScale;
        const fx = longPos * cosA - latOffset * sinA;
        const fy = longPos * sinA + latOffset * cosA;
        const fiberLen = p5.random(2, 8) * (0.3 + this.pressureScale * 0.7);
        const angleOffset = (p5.random() - 0.5) * 0.8;
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

      this.chunks = [];
      const chunkCount = Math.floor(2 + this.pressureScale * 4);
      for (let i = 0; i < chunkCount; i++) {
        const t = (i / chunkCount) * 2 - 1;
        const longPos = t * tearLen * 0.35;
        const latOffset = (p5.random() - 0.5) * 10 * this.pressureScale;

        this.chunks.push({
          x: longPos * cosA - latOffset * sinA,
          y: longPos * sinA + latOffset * cosA,
          size: p5.random(1, 3.5) * (0.3 + this.pressureScale * 0.6),
          alpha: p5.random(180, 255),
          driftX: (p5.random() - 0.5) * 0.8,
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
    // 安全兜底：只允许使用 p5 实例，绝无对 pg 的非法引用
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
      this.life -= 0.8 + this.pressureScale * 0.3;
      if (this.vel) this.vel.mult(0);

      if (this.chunks) {
        this.chunks.forEach(c => {
          c.x += c.driftX * 0.3;
          c.y += c.driftY * 0.3;
          c.rotation += c.rotSpeed;
          c.life -= 0.8;
          c.alpha = Math.max(0, c.alpha - 2);
        });
      }
    } else if (this.type === 'pierce') {
      this.life -= 25;
      if (this.vel) this.vel.mult(0);
    }

    // ===== heavy - 极速下拉 + 最小拉伸 1/3 + 梯形速度回收 =====
    else if (this.type === 'heavy') {
      const speed = 0.0045; 
      this.pullProgress = (this.pullProgress || 0) + speed;
      if (this.pullProgress > 1.0) {
        this.pullProgress = 0;
      }

      const t = this.pullProgress;
      // 🌟 最小拉伸程度精确设为最大拉伸程度的 1/3
      const minStretch = 1.0 / 3.0;          
      const stretchRange = 1.0 - minStretch; // 2/3 活动行程
      let normFactor = 0; // 0.0 (基线 1/3) ~ 1.0 (最大拉伸)

      // 🌟 加快拉伸速度：将下拉时间深度压缩至 13%（速度极大提升，瞬时向下猛扯）
      const dropDuration = 0.13; 
      this.isDropping = (t <= dropDuration);

      if (this.isDropping) {
        // ============================================================
        // 1. 下落拉伸阶段（极速爆发）：前 3/4 加速，后 1/4 减速到 0
        // ============================================================
        const u = t / dropDuration; // 0.0 -> 1.0

        if (u <= 0.75) {
          const p = u / 0.75;
          normFactor = 0.75 * (p * p);
        } else {
          const q = (u - 0.75) / 0.25;
          normFactor = 1.0 - 0.25 * Math.pow(1.0 - q, 2.0);
        }
      } else {
        // ============================================================
        // 2. 回收阶段：加速 -> 匀速 -> 减速到 0 (稳稳停在 1/3 基线)
        // ============================================================
        const v = (t - dropDuration) / (1.0 - dropDuration); // 0.0 -> 1.0
        let retDist = 0;

        if (v <= 0.20) {
          // 前 20% 加速
          retDist = (10.0 / 3.0) * (v * v);
        } else if (v <= 0.70) {
          // 20% ~ 70% 匀速
          retDist = (2.0 / 15.0) + (4.0 / 3.0) * (v - 0.20);
        } else {
          // 70% ~ 100% 减速到 0
          const progress = (v - 0.70) / 0.30;
          retDist = 0.80 + 0.20 * (1.0 - Math.pow(1.0 - progress, 2.0));
        }

        normFactor = Math.max(0.0, Math.min(1.0, 1.0 - retDist));
      }

      // 映射到 [1/3, 1.0]
      this.springStretch = minStretch + normFactor * stretchRange;
    }
  }

  show(pg) {
    // show 方法中正常使用 pg 绘制
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
    // ===== heavy - 重物颜色绑定用户画笔颜色 (无边线纯实体) =====
    else if (this.type === 'heavy') {
      if (!this.points || this.points.length < 2) return;

      const p = pg || this.p5;
      if (!p) return;

      // 用户当前画笔选中的原始色彩
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
      const S = this.springStretch || minStretch; // 1/3 ~ 1.0
      const isDropping = this.isDropping !== undefined ? this.isDropping : false;

      p.push();

      // ============================================================
      // 1. 骨架计算：最大椭圆长轴正比行程 (Layer 0 绝不位移变形)
      // ============================================================
      const layer0W = boxW * 1.25;
      const layer0H = boxH * 1.25;
      const majorAxis = Math.max(layer0W, layer0H);

      const STRETCH_RATIO = 1.05;
      const maxTotalStretch = majorAxis * STRETCH_RATIO;

      const normTension = Math.max(0, (S - minStretch) / (1.0 - minStretch));

      // 5 级比例骨架
      const sizeScales = [1.0, 0.90, 0.74, 0.51, 0.22];
      const baseLayers = sizeScales.map(scale => ({
        w: layer0W * scale,
        h: layer0H * scale
      }));

      // ============================================================
      // 2. 长轴限制与形变补偿位移计算
      // ============================================================
      const layerYOffsets = [0];
      const compensationStretches = [0];
      const stepWeights = [0.20, 0.25, 0.27, 0.28];
      let accumulatedExcess = 0;

      for (let i = 1; i < baseLayers.length; i++) {
        const prevH = baseLayers[i - 1].h;
        const ratio = sizeScales[i] / sizeScales[i - 1];

        const desiredDeltaY = (maxTotalStretch * stepWeights[i - 1] * S) + accumulatedExcess;
        const limitDeltaY = (prevH * 0.5) * Math.sqrt(Math.max(0.0, 1.0 - (ratio * ratio)));

        if (desiredDeltaY <= limitDeltaY) {
          layerYOffsets.push(layerYOffsets[i - 1] + desiredDeltaY);
          compensationStretches.push(0);
          accumulatedExcess = 0;
        } else {
          layerYOffsets.push(layerYOffsets[i - 1] + limitDeltaY);
          const excess = desiredDeltaY - limitDeltaY;
          compensationStretches.push(excess);
          accumulatedExcess = excess * 0.45;
        }
      }

      // 计算各层最下端探出坐标
      const bottomPoints = [];
      for (let i = 0; i < baseLayers.length; i++) {
        const h = baseLayers[i].h;
        const extraComp = compensationStretches[i] || 0;
        const ryBottom = (h * 0.5) * (1.0 + normTension * 0.75) + extraComp;
        const bottomY = cy + layerYOffsets[i] + ryBottom;
        bottomPoints.push({ bottomY });
      }

      const deepestY = bottomPoints[bottomPoints.length - 1].bottomY;

      // ============================================================
      // 3. 沿图形下边沿绘制光滑张力曲线
      // ============================================================
      const leftAnchorX = cx - layer0W * 0.5;
      const rightAnchorX = cx + layer0W * 0.5;
      const anchorY = cy;

      // (A) 浅色漫反射外光晕
      p.noFill();
      p.stroke(r, g, b, 45 + S * 55);
      p.strokeWeight(4.5);
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

      // (B) 核心光滑紧绷线
      p.stroke(r, g, b, 175 + S * 80);
      p.strokeWeight(2.0 + S * 0.8);
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

      // (C) 弧线内侧轻度弥散微光
      p.noStroke();
      p.fill(r, g, b, 25 + S * 40);
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

      // ============================================================
      // 4. 🌟 重物：纯正画笔颜色填充 + 无边线 (回收时消失)
      // ============================================================
      if (isDropping && normTension > 0.02) {
        const weightTopY = cy + layerYOffsets[1];
        const weightTopW = baseLayers[1].w * 0.50 * (1.0 - normTension * 0.12);

        const weightBottomY = deepestY;
        const weightBottomW = baseLayers[4].w * 0.85;

        p.push();
        p.noStroke(); // 保持无边线

        // 🌟 纯正用户画笔色彩填充（高饱和实体重感）
        const solidAlpha = 220 + normTension * 35;
        p.fill(r, g, b, solidAlpha);

        // 绘制无边线重物实体面
        p.beginShape();
        p.vertex(cx - weightTopW * 0.5, weightTopY);
        p.vertex(cx + weightTopW * 0.5, weightTopY);

        p.bezierVertex(
          cx + weightTopW * 0.65, weightTopY + (weightBottomY - weightTopY) * 0.38,
          cx + weightBottomW * 0.75, weightBottomY - 6,
          cx, weightBottomY
        );

        p.bezierVertex(
          cx - weightBottomW * 0.75, weightBottomY - 6,
          cx - weightTopW * 0.65, weightTopY + (weightBottomY - weightTopY) * 0.38,
          cx - weightTopW * 0.5, weightTopY
        );
        p.endShape(p.CLOSE);
        p.pop();
      }

      // ============================================================
      // 5. 底部投影
      // ============================================================
      p.noStroke();
      const shadowAlpha = 25 + S * 140;
      p.fill(0, 0, 0, shadowAlpha * 0.42);
      p.ellipse(cx, deepestY + 8, baseLayers[4].w * 2.3, 12 + S * 18);

      // ============================================================
      // 6. 手绘笔触点轻移跟随（色彩同样与画笔协同）
      // ============================================================
      const numDots = Math.min(this.points.length, 25);
      for (let k = 0; k < numDots; k++) {
        const idx = Math.floor(k * this.points.length / numDots);
        const pt = this.points[idx];
        if (!pt) continue;

        const normDistX = Math.abs(pt.x - cx) / (layer0W * 0.5);
        const ptDrop = (deepestY - anchorY) * Math.max(0, 1 - normDistX * normDistX) * 0.28;

        p.noStroke();
        p.fill(r, g, b, 120);
        p.ellipse(pt.x, pt.y + ptDrop, 2.2, 1.8);
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
    else if (this.type === 'scrape') {
      const [r, g, b] = this.color;
      const alpha = Math.max(0, this.life / 255);

      const isReddish = r > g && r > b;
      const rCol = isReddish ? Math.min(255, r * 0.8 + 30) : Math.min(255, r * 0.8 + 30);
      const gCol = isReddish ? Math.min(255, g * 0.4 + 20) : Math.min(255, g * 0.8 + 30);
      const bCol = isReddish ? Math.min(255, b * 0.4 + 20) : Math.min(255, b * 0.8 + 30);

      p.push();
      p.translate(this.pos.x, this.pos.y);

      if (this.fibers) {
        this.fibers.forEach(f => {
          const fAlpha = f.alpha * alpha * 0.3;
          const len = f.len;

          p.stroke(
            Math.min(255, rCol * 0.5 + 30),
            Math.min(255, gCol * 0.5 + 30),
            Math.min(255, bCol * 0.5 + 30),
            fAlpha
          );
          p.strokeWeight(f.width * 0.5);

          const fiberAngle = (this.angle || 0) + f.angleOffset;
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
      }

      if (this.chunks) {
        this.chunks.forEach(c => {
          if (c.life <= 0 || c.alpha <= 0) return;
          const cAlpha = c.alpha * alpha * 0.3;
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
      }

      p.pop();
    }
  }

  isDead() {
    return this.life < 0;
  }
}

export default PainParticle;