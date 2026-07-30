// src/i18n/translationsConstants.js

export const PAIN_NAME_MAP = {
  twist: "绞痛",
  pierce: "刺痛",
  heavy: "坠痛",
  wave: "酸胀痛",
  scrape: "撕裂痛"
};

export const BRUSHES = {
  twist: {
    label: "绞/拧",
    icon: " 🌪️",           // 保持 emoji
    isImage: false
  },
  pierce: {
    label: "荆/刺",
    icon: "pierce.png",
    isImage: true
  },
  heavy: {
    label: "坠/压",
    icon: "🪨",
    isImage: false
  },
  wave: {
    label: "酸/胀",
    icon: "/wave.png",
    isImage: true
  },
  scrape: {
    label: "刮/撕",
    icon: "/scrape.png",
    isImage: true
  },
  eraser: {
    label: "橡皮",
    icon: "🧽",
    isImage: false
  },
};

export const PALETTES = {
  crimson: { color: [211, 47, 47] },
  dark: { color: [80, 80, 80] },
  purple: { color: [156, 39, 176] },
  blue: { color: [33, 150, 243] }
};

export const EXAM_DATABASE = {
  "盆腔超声": {
    prep: "需在检查前 1 小时饮水 500-800ml，保持充盈膀胱（憋尿）。",
    purpose: "观察子宫形态、内膜厚度，排除肌瘤、腺肌症或卵巢囊肿。"
  },
  "经阴道超声": {
    prep: "检查前需排空尿液。如无性生活史请务必告知医生，改为经腹超声。",
    purpose: "更清晰地观察内膜异位病灶及盆腔粘连。建议在月经干净后 3-7 天复查。"
  },
  "激素六项": {
    prep: "建议在月经周期的第 2-3 天清晨空腹抽血，检查前静坐 10 分钟。",
    purpose: "评估内分泌状态，排查由于激素失调（如多囊）引起的疼痛。"
  },
  "腹腔镜": {
    prep: "这属于微创手术，需住院进行。术前需禁食禁饮。",
    purpose: "子宫内膜异位症诊断的'金标准'，可同时进行病灶剥离。"
  }
};

export const QUOTES = [
  "慢性疼痛相当于长期的“unmaking”——把人困在身体牢笼里。\n—— Elaine Scarry",
  "疼痛不仅是神经的电冲动，它是对自我边界的侵犯。",
  "语言在痛苦面前总是匮乏的，而视觉是一道划破沉默的闪电。",
  "不被看见的痛楚，往往需要承受双倍的煎熬。",
  "拒绝隐忍，让不可言说之痛成为公共的视觉证据。",
  "你的身体是一座战场，允许它留下风暴的痕迹。",
  "这不是矫情，这是一场真切的生理型灾难。"
];