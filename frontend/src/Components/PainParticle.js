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

      // === 关闭发光阴影 ===
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
