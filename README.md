# 🩸 PainScape
**Beyond the Scale: An Embodied Visual Expression and Semantic Translation System for Menstrual Pain**  
*(超越量表：面向经期疼痛的具身视觉表达与语义转译系统)*

![React](https://img.shields.io/badge/Frontend-React-61DAFB?style=flat-square&logo=react&logoColor=black)
![p5.js](https://img.shields.io/badge/Engine-p5.js-ED225D?style=flat-square&logo=p5.js&logoColor=white)
![Status](https://img.shields.io/badge/Status-Beta_Iterating-4CAF50?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

> *"The pain feels like an unripe fruit being peeled by force, with shreds of real flesh still attached and constantly torn."*  
> *"痛经就像一颗未完全成熟的果实被生生剥皮，皮上还连着丝丝缕缕真实的血肉..."* —— 来自 PainScape 用户访谈

## 📖 About The Project | 项目简介

原发性痛经困扰着全球超半数育龄女性，但在传统的医疗评估与 FemTech（女性健康科技）应用中，复杂的痛觉体验往往被降维成单一的 **“1-10分数字量表”**。这种“量化霸权”与“粉色温馨”的刻板印象，加剧了女性在医患沟通、职场请假与亲密关系中的失语困境（Medical Gaslighting）。

**PainScape** 是一个基于 **女性主义残疾研究（FDS）** 与 **不适感设计（Designing with Discomfort）** 理论开发的生成式交互系统。我们主张：疼痛不应只是需要被隐藏的“私事”，而是一种需要被表达、被看见的生命体验。

本系统通过前端物理引擎，将患者的“痛觉隐喻”转化为极具破坏力的生成式艺术视觉证据；并结合 AI 语义模型，将其动态转译为适用于多社会语境（医疗、职场、伴侣）的结构化文本报告，助力女性夺回身体的叙事权。

---

## ✨ Core Features | 核心创新功能

### 1. 🎨 Embodied Generative Brushes (具身生成式画笔)
彻底抛弃静态贴图与平滑渲染，基于 8000+ 真实 UGC 数据的提取，自主研发了基于 **p5.js 的动态粒子物理引擎**。通过 **手势动能映射（Kinetic Mapping）**，实时捕捉滑动速度与轨迹：
*    🌪️ **绞/拧 (Twist):** 带有向心旋转矩阵与高对比度折线的“打结钢丝”。
*   ⚡️ **荆/刺 (Pierce):** 顺应手指滑动方向，带有随机倒刺的锐利穿透线。
*   🪨 **坠/压 (Heavy):** 施加高重力加速度，模拟沉重泥块/血液的下坠感。
*   〰️ **酸/胀 (Wave):** 突破静态限制，基于时间轴持续“呼吸”的弥散性水肿。
*   🔪 **刮/撕 (Scrape):** 参差不齐的平行错落直线，概率掉落尖锐碎屑。

### 2. 🧠 Multi-Context Semantic Translation (跨语境语义转译)
打破单一的“健康打卡”孤岛，系统自动解析用户的视觉参数与偏好输入，一键生成四大沟通卡片：
*   🫂 **伴侣说明书：** 摒弃鸡汤，生成极度务实的“实操照顾指令”。
*   💼 **职场请假声明：** 生成不卑不亢的“不可见痛苦声明”，助力 DEI（多元公平包容）职场建设。
*   🩺 **医疗辅助报告：** 转译为主诉、放射痛及排查建议，辅助医生门诊分诊。
*   ❤️ **自我关怀日记：** 基于痛觉类型，匹配社群/医学的真实缓解动作（如婴儿蜷缩式）。

### 3. 🛠 Hardcore UX Engineering (极致的前端交互体验)
*   **离屏双缓冲渲染 (Off-screen Buffer):** 彻底剥离底图与笔触图层，实现无损的移动端画布拖拽与 3 倍缩放。
*   **内存级状态栈 (Dual-Stack Undo/Redo):** 在 React 与 Canvas 混合生命周期下，实现包含动态呼吸粒子在内的 O(1) 复杂度单步撤销与重做。
*   **原生分享打通 (Web Share API):** 一键将图文通感卡唤起系统底层的分享面板发送给联系人。

---

## 🔬 Research Background | 研究背景

PainScape 的每一行物理参数与交互设计，均由扎实的混合方法（Mixed-Methods）研究驱动：
1.  **Data Mining:** 使用 Python 爬虫获取小红书/豆瓣 8000+ 语料，利用 **LDA 主题模型** 与设计导向的人工加权，提取出长尾的四大隐喻维度。
2.  **Quantitative Survey:** 回收 140 份定量问卷，证实了“职场请假 (59.7%)”与“医疗沟通 (74.7%)”的强烈刚需，并验证了用户对“暴躁宣泄 / 反粉色税 (40.6%)”的审美偏好。
3.  **Qualitative Interviews:** 通过多轮半结构化深度访谈，驱动系统完成了防误触机制、荆棘画笔重构及动态呼吸粒子等敏捷迭代。

---

## ⚙️ Tech Stack | 技术栈

*   **Frontend:** React, p5.js, react-p5
*   **Data Processing:** Python, Pandas, scikit-learn (LDA Modeling), Jieba
*   **Deployment:** Vercel
*   **Upcoming Backend:** FastAPI, LLM Prompt Engineering (DeepSeek / Qwen API)

---

## 🚀 Quick Start | 快速启动

**1. 克隆仓库到本地：**
```bash
git clone https://github.com/your-username/PainScape.git
```

**2. 进入项目目录并安装依赖：**
```bash
cd PainScape
npm install
```

**3. 启动本地开发服务器：**
```bash
npm run dev
```

**4. 在浏览器中访问：**  
打开 [http://localhost:5137](http://localhost:5137) 即可体验。

> ⚠️ **注意：** 需确保在 `public/` 文件夹下已配置 `body_front.png` 和 `body_back.png` 底图文件，以完整体验人体的正反面翻转功能。

---

## 🎯 Online Demo | 在线演示

目前已完成前端核心交互开发，欢迎直接通过浏览器体验在线 Demo：

👉 **[点击此处访问 PainScape 在线体验版](https://painscape.icu/)** 👈

*(注：当前版本主要展示前端生成式艺术与 UI 交互流转，欢迎大家试用并提出宝贵意见！)*



## 🤝 Authors & Acknowledgments | 致谢

特别感谢所有参与本研究问卷填写与深度访谈的女性。是你们勇敢分享的痛觉记忆，赋予了这些冰冷的代码与图形以真实的血肉与灵魂。

> *"Women oppose war. We share the pain, and we heal together."*
