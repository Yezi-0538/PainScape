// ============================================================
// PainParticle - 体感画笔粒子引擎 (修复版)
// 完整保留原版的动态呼吸感、颜色透明度和尺寸参数
// ============================================================
export class PainParticle {
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
      const angle = heading + p5.random(-0.15, 0.15);
      const thrust = p5.random(18, 36) * (0.6 + pressure);
      this.pierceVec = p5.createVector(p5.cos(angle) * thrust, p5.sin(angle) * thrust);
      this.vel = this.pierceVec.copy();
      this.size = p5.random(1.8, 3.8);

      this.fissures = [];
      const numFissures = p5.floor(p5.random(3, 5));
      for (let i = 0; i < numFissures; i++) {
        this.fissures.push({
          angle: angle + p5.random(-p5.PI * 0.7, p5.PI * 0.7),
          len: p5.random(6, 16) * pressure
        });
      }
    } else if (type === 'heavy') {
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
      this.pulseSize = this.size; // 初始化脉冲尺寸
    } else if (type === 'scrape') {
      const angle = p5.PI / 4 + p5.random(-0.15, 0.15);
      this.vel = p5.createVector(p5.cos(angle), p5.sin(angle));
      this.vel.mult(p5.random(15, 30) * (0.5 + pressure));
      this.size = p5.random(2, 6);
      this.scrapeEnd = p5.createVector(this.pos.x + this.vel.x, this.pos.y + this.vel.y);
    }
  }

  update(p5) {
    if (!this.isDynamic) {
      this.pos.add(this.vel);
    }

    if (this.type === 'heavy') {
      const drift = (p5.sin(p5.frameCount * 0.05 + this.seed) * 0.5 + 0.5);
      this.pos.y = this.baseY + drift * this.size * 1.5;
    } else if (this.type === 'twist') {
      this.angle += 0.08;
      this.size *= 0.98;
      if (this.size < 3) this.life = 0;
    } else if (this.type === 'wave') {
      // 【关键修复】保持原版的呼吸脉动计算方式
      this.pulseSize = this.size + p5.sin(p5.frameCount * 0.05 + this.seed) * (this.maxSize - this.size);
    } else if (this.type === 'scrape') {
      this.life -= 20;
      this.vel.mult(0);
    } else if (this.type === 'pierce') {
      this.life -= 25;
      this.vel.mult(0);
    }
  }

  show(pg) {
    const p = pg || this.p5;

    // 【关键修复】动态粒子的发光阴影必须正确设置
    if (this.isDynamic) {
      p.drawingContext.shadowBlur = 10 * this.pressureScale;
      p.drawingContext.shadowColor = `rgb(${this.color[0]},${this.color[1]},${this.color[2]})`;
    } else {
      p.drawingContext.shadowBlur = 0;
    }

    if (this.type === 'pierce') {
      this._drawPierce(p);
    } else if (this.type === 'heavy') {
      this._drawHeavy(p);
    } else if (this.type === 'twist') {
      this._drawTwist(p);
    } else if (this.type === 'wave') {
      this._drawWave(p);
    } else if (this.type === 'scrape') {
      this._drawScrape(p);
    }

    p.drawingContext.shadowBlur = 0;
  }

  // ========== 1. 针刺 (Pierce) ==========
  _drawPierce(p) {
    const endX = this.pos.x + (this.pierceVec ? this.pierceVec.x : this.vel.x);
    const endY = this.pos.y + (this.pierceVec ? this.pierceVec.y : this.vel.y);
    const headingAngle = this.pierceVec ? this.pierceVec.heading() : this.vel.heading();

    p.drawingContext.shadowBlur = 0;

    p.noStroke();
    p.fill(
      Math.min(255, this.color[0] + 160),
      Math.min(255, this.color[1] + 130),
      Math.min(255, this.color[2] + 130),
      250
    );

    const perpAngle = headingAngle + p.PI / 2;
    const bladeW = this.size * (0.25 + this.pressureScale * 0.3);

    p.beginShape();
    p.vertex(this.pos.x - p.cos(headingAngle) * 3, this.pos.y - p.sin(headingAngle) * 3);
    p.vertex(this.pos.x + p.cos(perpAngle) * bladeW, this.pos.y + p.sin(perpAngle) * bladeW);
    p.vertex(endX, endY);
    p.vertex(this.pos.x - p.cos(perpAngle) * bladeW, this.pos.y - p.sin(perpAngle) * bladeW);
    p.endShape(p.CLOSE);

    p.stroke(this.color[0] * 0.6, 0, 0, 180);
    p.strokeWeight(0.8 * this.pressureScale);
    p.noFill();
    if (this.fissures) {
      this.fissures.forEach(fis => {
        const fEndX = this.pos.x + p.cos(fis.angle) * fis.len;
        const fEndY = this.pos.y + p.sin(fis.angle) * fis.len;
        p.beginShape();
        p.vertex(this.pos.x, this.pos.y);
        p.vertex(
          p.lerp(this.pos.x, fEndX, 0.5) + p.random(-1.5, 1.5),
          p.lerp(this.pos.y, fEndY, 0.5) + p.random(-1.5, 1.5)
        );
        p.vertex(fEndX, fEndY);
        p.endShape();
      });
    }

    p.noStroke();
    const numSplatters = Math.floor(3 + this.pressureScale * 4);
    for (let sp = 0; sp < numSplatters; sp++) {
      const spT = p.random(0.2, 1.0);
      const baseX = p.lerp(this.pos.x, endX, spT);
      const baseY = p.lerp(this.pos.y, endY, spT);
      const spX = baseX + p.random(-8, 8) * this.pressureScale;
      const spY = baseY + p.random(-8, 8) * this.pressureScale;
      p.fill(this.color[0] * 0.8, 10, 10, 200 + p.random(-30, 30));
      p.ellipse(spX, spY, p.random(0.8, 2.2), p.random(0.8, 2.2));
    }
  }

  // ========== 2. 坠痛 (Heavy) ==========
  _drawHeavy(p) {
    p.noStroke();
    const alphaVal = 160 + (90 * this.pressureScale);

    // 【关键修复】原版使用极低透明度 0.12
    p.fill(this.color[0], this.color[1], this.color[2], alphaVal * 0.12);
    p.beginShape();
    p.vertex(this.pos.x - this.size * 1.6, this.pos.y - this.size * 0.5);
    p.bezierVertex(
      this.pos.x - this.size * 0.5, this.pos.y + this.size * 1.5,
      this.pos.x + this.size * 0.5, this.pos.y + this.size * 1.5,
      this.pos.x + this.size * 1.6, this.pos.y - this.size * 0.5
    );
    p.endShape(p.CLOSE);

    // 主体 - 使用 0.35/0.25/0.25 的系数保持暗色调
    p.fill(this.color[0] * 0.35, this.color[1] * 0.25, this.color[2] * 0.25, alphaVal);
    p.beginShape();
    p.vertex(this.pos.x - this.size * 0.7, this.pos.y - this.size * 0.4);
    p.bezierVertex(
      this.pos.x - this.size * 0.9, this.pos.y + this.size * 0.4,
      this.pos.x - this.size * 0.4, this.pos.y + this.size * 1.8,
      this.pos.x, this.pos.y + this.size * 2.2
    );
    p.bezierVertex(
      this.pos.x + this.size * 0.4, this.pos.y + this.size * 1.8,
      this.pos.x + this.size * 0.9, this.pos.y + this.size * 0.4,
      this.pos.x + this.size * 0.7, this.pos.y - this.size * 0.4
    );
    p.bezierVertex(
      this.pos.x + this.size * 0.3, this.pos.y - this.size * 0.8,
      this.pos.x - this.size * 0.3, this.pos.y - this.size * 0.8,
      this.pos.x - this.size * 0.7, this.pos.y - this.size * 0.4
    );
    p.endShape(p.CLOSE);

    // 碎屑
    p.fill(this.color[0] * 0.4, this.color[1] * 0.2, this.color[2] * 0.2, alphaVal * 0.8);
    p.ellipse(this.pos.x - this.size * 0.2, this.pos.y + this.size * 2.6, this.size * 0.2, this.size * 0.4);
    p.ellipse(this.pos.x + this.size * 0.3, this.pos.y + this.size * 2.9, this.size * 0.15, this.size * 0.3);

    // 高光
    p.fill(255, 255, 255, 45);
    p.ellipse(this.pos.x - this.size * 0.2, this.pos.y + this.size * 0.2, this.size * 0.25, this.size * 0.2);
  }

  // ========== 3. 绞拧 (Twist) ==========
  _drawTwist(p) {
    p.push();
    p.translate(this.pos.x, this.pos.y);
    p.rotate(this.angle);

    p.noFill();
    p.stroke(this.color[0], this.color[1], this.color[2], 100);
    p.strokeWeight(1.5);
    p.beginShape();
    for (let a = 0; a < p.TWO_PI * 1.2; a += 0.2) {
      const r = p.map(a, 0, p.TWO_PI * 1.2, this.size * 1.8, this.size * 0.5);
      p.vertex(r * p.cos(a), r * p.sin(a));
    }
    p.endShape();

    // 核心 - 使用 0.85 系数保持红色调
    p.fill(this.color[0] * 0.85, 0, 0, 160 + (65 * this.pressureScale));
    p.stroke(this.color[0] * 0.5, 0, 0, 240);
    p.strokeWeight(1.2);
    p.beginShape();
    for (let i = 0; i < 7; i++) {
      const angle = (i * p.TWO_PI) / 7;
      const rad = this.size * (0.35 + p.random(-0.1, 0.12));
      p.vertex(rad * p.cos(angle), rad * p.sin(angle));
    }
    p.endShape(p.CLOSE);

    p.pop();
  }

  // ========== 4. 酸胀/胀扩 (Wave) - 【关键修复】呼吸感 ==========
  _drawWave(p) {
    // 【关键修复1】第一层：极低透明度 10，产生柔和的辉光
    p.noStroke();
    p.fill(this.color[0], this.color[1], this.color[2], 10);
    p.ellipse(this.pos.x, this.pos.y, this.pulseSize, this.pulseSize);

    // 【关键修复2】第二层：透明度 5 + 15*pressureScale，动态呼吸变化
    p.fill(this.color[0], this.color[1], this.color[2], 5 + (15 * this.pressureScale));
    p.ellipse(this.pos.x, this.pos.y, this.pulseSize, this.pulseSize);

    // 【关键修复3】确保 pulseSize 在 update 中持续更新
    // 注：pulseSize 在 update() 的 wave 分支中更新
  }

  // ========== 5. 刮擦 (Scrape) ==========
  _drawScrape(p) {
    const endX = this.scrapeEnd ? this.scrapeEnd.x : (this.pos.x + this.vel.x);
    const endY = this.scrapeEnd ? this.scrapeEnd.y : (this.pos.y + this.vel.y);

    const dx = endX - this.pos.x;
    const dy = endY - this.pos.y;
    const len = p.sqrt(dx * dx + dy * dy) || 1;
    const normalX = -dy / len;
    const normalY = dx / len;

    // 纤维丝
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

    // 主刮痕
    p.noFill();
    const numScratches = 3;
    for (let s = 0; s < numScratches; s++) {
      p.stroke(this.color[0] * 0.45, this.color[1] * 0.15, this.color[2] * 0.15, 240);
      p.strokeWeight((this.size * (0.6 + this.pressureScale * 0.6)) / numScratches);

      p.beginShape();
      const segments = 5;
      const scratchOffset = p.map(s, 0, numScratches - 1, -this.size * 0.4, this.size * 0.4);

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        let currX = p.lerp(this.pos.x, endX, t) + normalX * scratchOffset;
        let currY = p.lerp(this.pos.y, endY, t) + normalY * scratchOffset;
        const offset = (i % 2 === 0 ? 1 : -1) * p.random(2, 5) * this.pressureScale;
        p.vertex(currX + normalX * offset, currY + normalY * offset);
      }
      p.endShape();
    }

    // 血肉碎屑
    const numDebris = Math.floor(3 + this.pressureScale * 4);
    for (let d = 0; d < numDebris; d++) {
      const debrisT = p.random(0.2, 1.0);
      const basePointX = p.lerp(this.pos.x, endX, debrisT);
      const basePointY = p.lerp(this.pos.y, endY, debrisT);
      const debrisX = basePointX + p.random(-15, 15);
      const debrisY = basePointY + p.random(-15, 15);
      const debrisSize = p.random(1.2, 3.5) * this.pressureScale;

      p.noStroke();
      p.fill(this.color[0], this.color[1] * 0.3, this.color[2] * 0.3, 180 + p.random(-40, 40));
      p.ellipse(debrisX, debrisY, debrisSize, debrisSize);

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

  isDead() {
    return this.life < 0;
  }
}

export default PainParticle;