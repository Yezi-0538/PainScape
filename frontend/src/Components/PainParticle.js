// src/Components/PainParticle.js
// ============================================================
// PainParticle - 痛觉具身画笔粒子系统 (刺痛缩微 & 绞痛1/3定格版)
// ============================================================

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

    // 1. 刺痛 (Pierce - 🌟 尺寸调整为原先的 2/3)
    if (type === 'pierce') {
      const angle = Number.isFinite(heading) ? heading : p5.random(p5.TWO_PI);
      // 针长缩短至 2/3
      const thrust = p5.random(25, 37) * (0.85 + this.pressureScale * 0.3);
      this.pierceAngle = angle;
      this.thrustLen = thrust;
      this.vel = p5.createVector(0, 0);

      this.fissures = [];
      const numFissures = p5.floor(p5.random(3, 5));
      for (let i = 0; i < numFissures; i++) {
        this.fissures.push({
          angle: angle + p5.random(-p5.PI * 0.65, p5.PI * 0.65),
          len: p5.random(3.5, 7.5) * this.pressureScale // 裂纹同步缩短至 2/3
        });
      }
    } 
    // 2. 坠痛 (Heavy - 抛物面平滑布料下凹网)
    else if (type === 'heavy') {
      this.vel = p5.createVector(0, 0);
      this.rx = Math.max(22, customProps.rx || 32);
      this.ry = Math.max(13, customProps.ry || 18);
      const depthRatio = 0.38 + this.pressureScale * 0.1;
      this.maxDepth = Math.max(10, this.rx * depthRatio);
      this.cycleProgress = 0;
    } 
    // 3. 绞痛 (Twist - 🌟 记录初始尺寸，用于 1/3 处暂停)
    else if (type === 'twist') {
      this.vel = p5.createVector(0, 0);
      this.size = p5.random(18, 30) * (0.6 + this.pressureScale * 0.5);
      this.initialSize = this.size; // 记录初始大小
      this.angle = p5.random(p5.TWO_PI);
    } 
    // 4. 酸胀 (Wave)
    else if (type === 'wave') {
      this.vel = p5.createVector(0, 0);
      this.size = p5.random(8, 16);
      this.maxSize = p5.random(40, 70) * (0.6 + this.pressureScale * 0.5);
      this.pulseSize = this.size;
    } 
    // 5. 撕刮 (Scrape - 纯细点碎屑感)
    else if (type === 'scrape') {
      this.vel = p5.createVector(0, 0);
      const moveSpeed = Number.isFinite(speed) ? speed : 6;
      const angle = Number.isFinite(heading) ? heading : p5.random(p5.TWO_PI);

      const strokeLen = Math.max(28, Math.min(65, moveSpeed * 2.4)) * (0.8 + this.pressureScale * 0.4);
      const strokeWidth = Math.max(10, 15 * this.pressureScale);

      this.debris = [];
      const count = Math.floor(32 + this.pressureScale * 18);
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      for (let i = 0; i < count; i++) {
        const longitudinal = (p5.random() - 0.5) * strokeLen;
        const u = (p5.random() - 0.5) * 2;
        const lateral = Math.sign(u) * Math.pow(Math.abs(u), 1.6) * strokeWidth;

        const dx = longitudinal * cosA - lateral * sinA;
        const dy = longitudinal * sinA + lateral * cosA;

        const isTiny = p5.random(1) > 0.15;
        const baseW = isTiny ? p5.random(0.6, 1.3) : p5.random(1.6, 2.4);
        const baseH = isTiny ? baseW : baseW * p5.random(0.6, 1.2);

        this.debris.push({
          x: dx,
          y: dy,
          w: baseW,
          h: baseH,
          rot: p5.random(p5.TWO_PI),
          alpha: isTiny ? p5.random(90, 180) : p5.random(160, 235),
          isTiny: isTiny
        });
      }
    }
  }

  update(p5) {
    if (!this.isDynamic && this.type !== 'pierce') {
      this.pos.add(this.vel);
    }

    if (this.type === 'heavy') {
      this.cycleProgress += 0.009;
      if (this.cycleProgress > 1) {
        this.cycleProgress -= 1;
      }
    } else if (this.type === 'twist') {
      // 🌟 缩小至初始尺寸的 1/3 时，暂停旋转并锁定大小，永不消失
      const minSize = this.initialSize / 3;
      if (this.size > minSize) {
        this.angle += 0.08;
        this.size *= 0.985;
        if (this.size <= minSize) {
          this.size = minSize; // 锁定尺寸，停止旋转
        }
      }
    } else if (this.type === 'wave') {
      this.pulseSize = this.size + p5.sin(p5.frameCount * 0.05 + this.seed) * (this.maxSize - this.size);
    } else if (this.type === 'scrape') {
      this.life -= 15;
      this.vel.mult(0);
    } else if (this.type === 'pierce') {
      this.life -= 25;
      this.vel.mult(0);
    }
  }

  show(pg) {
    const p = pg || this.p5;
    if (!p) return;

    if (this.type === 'pierce') {
      this._drawPierce(p);
    } else if (this.type === 'heavy') {
      this._drawHeavyMesh(p);
    } else if (this.type === 'twist') {
      this._drawTwist(p);
    } else if (this.type === 'wave') {
      this._drawWave(p);
    } else if (this.type === 'scrape') {
      this._drawScrape(p);
    }
  }

  // ========== 1. 刺痛 (Pierce - 🌟 按 2/3 比例渲染) ==========
  _drawPierce(p) {
    const tipX = this.pos.x;
    const tipY = this.pos.y;
    const angle = this.pierceAngle;
    const thrust = this.thrustLen;

    const tailX = tipX - p.cos(angle) * thrust;
    const tailY = tipY - p.sin(angle) * thrust;
    const perpAngle = angle + p.PI / 2;

    p.push();

    // 1. 针身微锥形实体 (原 1.3px -> 0.9px)
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

    // 2. 针身中轴高光丝 (原 0.75px -> 0.55px)
    p.stroke(255, 255, 255, 250);
    p.strokeWeight(0.55);
    p.line(tailX, tailY, tipX, tipY);

    // 3. 针身鞘光 (原 1.4px -> 1.0px)
    p.stroke(this.color[0], this.color[1] * 0.3, this.color[2] * 0.3, 130);
    p.strokeWeight(1.0);
    p.line(tailX, tailY, tipX, tipY);

    // 4. 针尾圆环 (原 2.6px -> 1.8px)
    p.fill(this.color[0], this.color[1], this.color[2], 220);
    p.noStroke();
    p.ellipse(tailX, tailY, 1.8, 1.8);

    // 5. 针尖落点 (原 1.8px -> 1.2px)
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

  // ========== 2. 坠痛 (Heavy) ==========
  _drawHeavyMesh(p) {
    p.push();
    p.translate(this.pos.x, this.pos.y);

    const [r, g, b] = this.color;
    const rx = this.rx;
    const ry = this.ry;

    const t = this.cycleProgress;
    let easeFactor = 0;

    if (t < 0.58) {
      const subT = t / 0.58;
      easeFactor = Math.sin(subT * (Math.PI / 2));
    } else {
      const subT = (t - 0.58) / (1 - 0.58);
      easeFactor = 0.5 * (1 + Math.cos(subT * Math.PI));
    }

    const minDepth = this.maxDepth * 0.35;
    const curDepth = p.lerp(minDepth, this.maxDepth, easeFactor);

    // 顶层椭圆环
    p.noFill();
    p.stroke(r, g, b, 210);
    p.strokeWeight(1.3);
    p.ellipse(0, 0, rx * 2, ry * 2);

    p.fill(r, g, b, 10);
    p.ellipse(0, 0, rx * 2, ry * 2);

    // 经线
    const numRays = 12;
    const samples = 18;
    const rimU = 0.72;
    const rimSlopeDepth = curDepth * 0.08;

    for (let i = 0; i < numRays; i++) {
      const angle = (Math.PI * 2 / numRays) * i;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      p.noFill();
      p.stroke(r, g, b, 150);
      p.strokeWeight(1.0);

      p.beginShape();
      for (let s = 0; s <= samples; s++) {
        const u = 1 - (s / samples);
        let ptY_drop = 0;

        if (u >= rimU) {
          const slopeT = (1 - u) / (1 - rimU);
          ptY_drop = rimSlopeDepth * slopeT;
        } else {
          const innerU = u / rimU;
          const parabola = 1 - innerU * innerU;
          ptY_drop = rimSlopeDepth + (curDepth - rimSlopeDepth) * parabola;
        }

        const ptX = rx * u * cosA;
        const ptY = ry * u * sinA + ptY_drop;
        p.vertex(ptX, ptY);
      }
      p.endShape();
    }

    // 纬线
    p.noFill();
    p.stroke(r, g, b, 130);
    p.strokeWeight(0.9);
    p.ellipse(0, rimSlopeDepth, (rx * rimU) * 2, (ry * rimU) * 2);

    const midParabola = 0.55;
    const midInnerU = Math.sqrt(1 - midParabola);
    const midDepth = rimSlopeDepth + (curDepth - rimSlopeDepth) * midParabola;
    const midRx = rx * rimU * midInnerU;
    const midRy = ry * rimU * midInnerU;

    p.stroke(r, g, b, 110);
    p.strokeWeight(0.8);
    p.ellipse(0, midDepth, midRx * 2, midRy * 2);

    // 底部圆面
    p.fill(r * 0.8 + 40, g * 0.2, b * 0.2, 170);
    p.noStroke();
    p.ellipse(0, curDepth, rx * 0.18, ry * 0.18);

    p.pop();
  }

  // ========== 3. 绞拧 (Twist - 🌟 尺寸定格在 1/3) ==========
  _drawTwist(p) {
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
      const rad = this.size * (0.35 + p.random(-0.08, 0.1));
      p.vertex(rad * p.cos(angle), rad * p.sin(angle));
    }
    p.endShape(p.CLOSE);
    p.pop();
  }

  // ========== 4. 酸胀 (Wave) ==========
  _drawWave(p) {
    p.noStroke();
    p.fill(this.color[0], this.color[1], this.color[2], 10);
    p.ellipse(this.pos.x, this.pos.y, this.pulseSize, this.pulseSize);

    p.fill(this.color[0], this.color[1], this.color[2], 6 + (14 * this.pressureScale));
    p.ellipse(this.pos.x, this.pos.y, this.pulseSize, this.pulseSize);
  }

  // ========== 5. 撕刮 (Scrape - 纯细点碎屑感) ==========
  _drawScrape(p) {
    const [r, g, b] = this.color;

    p.push();
    p.translate(this.pos.x, this.pos.y);
    p.noStroke();

    if (this.debris && this.debris.length > 0) {
      for (let i = 0; i < this.debris.length; i++) {
        const d = this.debris[i];

        if (d.isTiny) {
          p.fill(r, g * 0.28, b * 0.28, d.alpha);
          p.ellipse(d.x, d.y, d.w, d.h);
        } else {
          p.fill(Math.min(255, r * 0.95 + 15), g * 0.2, b * 0.2, d.alpha);
          p.ellipse(d.x, d.y, d.w, d.h);
        }
      }
    }

    p.pop();
  }

  isDead() {
    return this.life < 0;
  }
}

export default PainParticle;