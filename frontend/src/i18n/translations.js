// src/i18n/translations.js

const translations = {
  zh: {
    // ============ 通用 ============
    app: {
      name: "PainScape",
      subtitle: "让说不出的痛，换一种方式抵达",
      loading: "AI 助理转译中...",
      loadingSub: "正在基于您的痛觉参数生成多语境报告",
      loadingHint: "首次请求可能需要 30-60 秒唤醒服务器，请耐心等待",
      errorBoundary: "页面出了点小问题，请刷新重试",
    },
    painAdjectives: {
      faint: "隐隐约约的",
      persistent: "持续性的",
      intense: "强烈的",
      extremelyIntense: "极其剧烈的",
    },
    painNames: {
      twist: "绞痛",
      pierce: "刺痛",
      heavy: "坠胀重压",
      wave: "弥漫酸胀痛",
      scrape: "撕裂刮痛",
    },
    // ============ 开屏页 ============
    splash: {
      quotes: [
        "慢性疼痛相当于长期的“unmaking”——把人困在身体牢笼里。\n—— Elaine Scarry",
        "疼痛不仅是神经的电冲动，它是对自我边界的侵犯。",
        "语言在痛苦面前总是匮乏的，而视觉是一道划破沉默的闪电。",
        "不被看见的痛楚，往往需要承受双倍的煎熬。",
        "拒绝隐忍，让不可言说之痛成为公共的视觉证据。",
        "你的身体是一座战场，允许它留下风暴的痕迹。",
        "这不是矫情，这是一场真切的生理型灾难。",
      ],
    },
    modeSelection: {
      title: "选择您的记录目的",
      medicalTab: "🏥 就诊协助",
      generalTab: "日常自愈",
      confirmBtn: "确认并进入画布",
      // 只展示画勾的特有功能
      medicalFeatures: [
        "📋 标准妇科门诊病理采集",
        "🔬 智能生成现病史与报告",
        "📍 人体腹部/腰骶精准解剖定位"
      ],
      generalFeatures: [
        "👁️ 沉浸式盲画情绪发泄",
        "🌿 经期自愈与呼吸干预指导",
        "✉️ 伴侣通感说明书与请假模板"
      ],
      // 共同包含的底层支撑功能
      commonFeatures: [
        "📓 疼痛记录",
        "📊 日历趋势",
        "🌍 社群分享",
        "💬 多语境转译"
      ]
    },
    // ============ Onboarding 页 ============
    onboarding: {
      languageLabel: "🌐 目标语言：",
      chinese: "简体中文",
      english: "English",
      guideTitle: "使用指南",
      guideItems: [
        ["🎨 选择画笔", "每种画笔对应一种痛感质地，可混合使用"],
        ["🩸 选择颜色", "不同颜色代表疼痛的情绪与温度"],
        ["✏️ 开始绘制", "在身体图上点击或滑动，画出你的疼痛范围"],
        ["📐 调整视角", "长按 0.3 秒可拖拽移动；双指缩放细节"],
        ["↩️ 撤销/重做", "右侧按钮随时修改，清除重新开始"],
        ["⚡ 生成报告", "右上角【生成】，AI 将转译你的痛觉图谱"],
      ],
      preferenceTitle: "当痛经发作时，你最需要什么？",
      preferences: [
        { key: "alone", title: "🛑 别管我，让我一个人待着" },
        { key: "care", title: "🥣 我没力气，需要实际照顾" },
        { key: "comfort", title: "🫂 我很脆弱，需要情绪陪伴" },
      ],
      medicalTitle: "填写健康信息（可选）",
      step1: "基础信息",
      step2: "健康背景",
      step3: "偏好设置",
      basicInfoTitle: "基础信息",
      basicInfoHint: "以下信息用于生成更准确的医疗参考，均为选填",
      preferenceHint: "选择你在疼痛时最需要的支持方式",
      toneTitle: "自愈建议的语气偏好",
      medicalHint: "以下信息帮助系统理解你的健康背景，均为选填",
      optional: "选填",
      reproductiveHistoryHint: "仅用于医疗参考，不会公开。可跳过。",
      cycleLabel: "📅 今天是月经第几天？（可选）",
      cycleOptions: ["经前", "第1天", "第2天", "第3-5天", "经后一周内"],
      diagnosisLabel: "既往诊断（可选）",
      diagnosisOptions: {
        "": "既往诊断（可选）",
        none: "无确诊",
        endometriosis: "子宫内膜异位症",
        adenomyosis: "子宫腺肌症",
        fibroids: "子宫肌瘤",
        pcos: "多囊卵巢综合征",
        pid: "盆腔炎性疾病（PID）",
        ovariancyst: "卵巢囊肿",
        cervicalstenosis: "宫颈管狭窄",
        other: "其他疾病（可自行填写）",  // ← 新增
        unchecked: "未做过相关检查",
      },
      allergyLabel: "药物过敏史（可选）",
      allergyOptions: {
        "": "药物过敏史（可选）",
        none: "无已知过敏",
        penicillin: "青霉素",           // ← 新增
        sulfonamides: "磺胺类",         // ← 新增
        ibuprofen: "布洛芬（NSAIDs类）",
        aspirin: "阿司匹林（NSAIDs类）",
        other_nsaids: "其他NSAIDs（如萘普生、双氯芬酸等）",
        acetaminophen: "对乙酰氨基酚",
        other: "其他",                  // ← 新增
        unknown: "未留意过",
      },
      ageLabel: "年龄范围（选填）",
      ageOptions: {
        "": "请选择（可选）",
        under18: "18岁以下",
        "18-25": "18-25岁",
        "26-35": "26-35岁",
        "36-45": "36-45岁",
        over45: "45岁以上",
      },
      basicInfo: "基本信息（选填）",
      heightLabel: "身高（cm）",
      heightPlaceholder: "如：175",
      weightLabel: "体重（kg）",
      weightPlaceholder: "如：75",
      pastHistory: "既往史（选填）",
      surgicalHistoryLabel: "手术史",
      surgicalHistoryOptions: {
        "": "请选择（可选）",
        none: "无",
        abdominal: "腹部手术（如阑尾切除）",
        pelvic: "盆腔手术（如卵巢囊肿切除）",
        other: "其他手术",
      },
      otherAllergiesLabel: "其他过敏药物（自由填写）",
      otherAllergiesPlaceholder: "如：头孢类、左氧氟沙星等",
      currentHistory: "现病史（选填）",
      menarcheAgeLabel: "初次月经年龄",
      menarcheAgePlaceholder: "如：13",
      periodDurationLabel: "月经一般持续几天",
      periodDurationOptions: {
        "": "请选择",
        "3": "3天",
        "4": "4天",
        "5": "5天",
        "6": "6天",
        "7": "7天",
        "over7": "超过7天"
      },
      cycleRegularOptions: {
        "": "请选择",
        regular: "规律（21-35天，周期稳定）",
        irregular: "不规律（周期波动大）",
        unsure: "不太确定"
      },
      lastPeriodLabel: "上一次月经开始是哪一天",
      lastPeriodPlaceholder: "例如：2026-06-01",
      cycleRegularDefinition: "规律：每次月经间隔天数相差不超过3-5天",
      familyHistoryMulti: "家族史（可多选）",
      motherHistory: "母亲有痛经史",
      sisterHistory: "姐妹有痛经史",
      reproductiveHistoryMulti: "生育史（可多选）",
      nulliparous: "未生育",
      pregnant: "已孕（未生产）",
      parous: "已生育",
      spontaneousAbortion: "有过自然流产",
      inducedAbortion: "有过人工/药物终止妊娠",
      multiple: "多次生育",
      menstrualHistoryTitle: "月经史",

      activityLabel: "体力活动量（选填）",
      activityOptions: {
        "": "请选择（可选）",
        sedentary: "久坐少动",
        light: "轻度活动（偶尔散步）",
        moderate: "中等强度（规律运动）",
        active: "高强度（频繁运动）",
      },
      lifestyleTitle: "生活习惯（可多选）",
      lifestyleOptions: {
        "": "请选择",
        sleepDuration: "睡眠时长不足（少于7小时）",
        sleepIrregular: "作息不规律（熬夜/倒班）",
        smoking: "吸烟",
        alcohol: "饮酒",
        caffeine: "常喝咖啡/浓茶",
        diet: "饮食偏好（可多选）",
      },
      dietOptions: {
        "": "请选择",
        cold: "喜食生冷/冰饮",
        spicy: "喜食辛辣",
        meat: "偏肉食",
        vegetarian: "素食",
        weightLoss: "正在减重期",
      },
      familyHistoryLabel: "家族史（可多选）",
      "": "请选择",
      familyHistoryOptions: {
        mother: "母亲有痛经史",
        sister: "姐妹有痛经史",
        none: "无",
        unknown: "不清楚",
      },
      psychosocialLabel: "心理社会因素（选填）",
      psychosocialOptions: {
        "": "请选择（可选）",
        lowStress: "压力较小",
        moderateStress: "适度压力",
        highStress: "压力大/焦虑",
      },
      accompanyingLabel: "伴随症状（可多选）",
      accompanyingOptions: {
        headache: "头痛",
        breast: "乳房酸胀痛",
        lumbosacral: "腰骶酸痛",
        nausea: "恶心呕吐",
        diarrhea: "经期腹泻",
        fatigue: "疲惫乏力"
      },
      toneDescription: "生成结果将采用此语气",
      toneGentle: "🌿 温和",
      toneDirect: "💬 直接",
      toneHint: "温和：安抚为主 / 直接：只说方法",
      switchToMedical: "填写健康信息（可选）",
      switchToPreference: "回到陪伴偏好",
      cycleNotProvided: "未提供",
      startDrawing: "开始绘制",
      quickLog: "⚡ 来不及画，快速记录",
      exploreCommunity: "🌍 探索广场",
      painDiary: "📅 疼痛日记",
      feedbackPrompt: "你的反馈将帮助我们改善产品（可留空提交匿名反馈）：",
      feedbackThanks: "感谢你的反馈！每一条都会被认真阅读。",
      submitFeedback: "📮 提交使用反馈",
      gotIt: "知道了",
    },

    // ============ 画笔与颜色 ============
    brushes: {
      twist: { label: "绞/拧" },
      pierce: { label: "荆/刺" },
      heavy: { label: "坠/压" },
      wave: { label: "酸/胀" },
      scrape: { label: "刮/撕" },
      eraser: { label: "橡皮" },
    },
    painNames: {
      twist: "绞痛",
      pierce: "刺痛",
      heavy: "坠痛",
      wave: "酸胀痛",
      scrape: "撕裂痛",
    },
    colors: {
      crimson: { label: "🩸" },
      dark: { label: "🌑" },
      purple: { label: "🔮" },
      blue: { label: "❄️" },
    },
    colorDescriptions: {
      crimson: "深红：急性锐痛/充血",
      dark: "暗灰：沉重钝痛/抑郁",
      purple: "紫：神经性放射痛",
      blue: "冰蓝：发冷/发僵",
    },

    // ============ 画板页 ============
    canvas: {
      bodyFront: "正面",
      bodyBack: "背面",
      bodyNone: "沉浸盲画",
      emotionLoad: "负荷",
      generate: "生成",
      frontTip: "正面：绘制胸腹腿等部位不适感",
      backTip: "背面：绘制腰骶臀等部位不适感",
    },

    // ============ 结果页 ============
    result: {
      tabs: {
        partner: "伴侣",
        work: "请假",
        doctor: "医生",
        self: "自愈",
      },
      partner: {
        title: "通感说明书",
        experiencing: "她正在经历强烈的",
        actionPrompt: "💡 请立刻执行以下操作：",
        copyAction: "📋 复制实操指令",
      },
      work: {
        title: "请假模板",
        description: "客观描述生理状况，不卑不亢，并留出交接空间。",
        copyTemplate: "📋 复制请假模板",
      },
      doctor: {
        title: "医疗就诊沟通辅助单",
        disclaimer: "⚠️ 声明：本报告由 AI 基于您的主诉与具身绘图生成，不能代替执业医生的诊断。具体病症及治疗方案必须由妇科医生进行专业临床检查后确诊。",
        clinicalAdvice: "🩺 患者主诉参考",
        examNotice: "💡 患者检查须知：",
        preparation: "准备：",
        purpose: "目的：",
        attachedMap: "本次多维痛觉图谱已附在报告后方，可向接诊医生展示。",
        discussReference: "📋 供您与医生讨论参考：",
        copyReport: "📋 复制完整报告",
      },
      self: {
        title: "自愈与社群互助",
        comfort: "亲爱的，你画出了你的风暴。痛不是你的错，允许自己今天做一个废物，好好休息吧。",
        copyAdvice: "📋 复制建议保存",
      },
      science: {
        selfCare: [
          { title: "🌸 辟谣：没有性生活不能用棉条吗？", desc: "完全可以。处女膜并不是一整片封闭的薄膜，而是一个富有弹性的环状肌肉组织（天然孔径约 2-3 厘米）。普通规格棉条直径仅约 1 厘米，只要使用得当、动作轻柔，完全不会造成任何物理性损伤。" },
          { title: "🍵 辟谣：痛经喝红糖水包治百病？", desc: "红糖中 99% 的成分都是蔗糖，多喝不仅无法缓解前列腺素引起的子宫收缩，高糖分摄入反而会加速体内的炎性反应。温热的水分摄入和保暖才是舒缓盆腔平滑肌血管紧张度的关键。" },
          { title: "📊 周期生活指南：如何根据周期排期？", desc: "卵泡期（月经后一周）是身体雌激素上升的黄金期，适合高强度运动和重要汇报；而黄体期（经前一周）孕酮升高，应降低运动强度，多进行保暖、拉伸与平静冥想。" },
          { title: "🔬 痛经级别健康自测", desc: "若经期血量超过 80ml（每两小时更换一次满溢卫生巾）、伴随有大量大硬血块、或常规口服止痛药（布洛芬）完全无效，可能是继发性病理痛经的警报，建议去医院做妇科超声排查子宫内膜异位症。" },
          { title: "🍍 饮食指南：经期适合吃什么？", desc: "推荐多补充富含抗炎类营养素的食物，如镁元素（坚果、深绿蔬菜）和 omega-3（深海鱼、亚麻籽），这能有效减缓子宫平滑肌过度收缩，达到自然舒缓阵痛的效果。" }
        ],
        partner: [
          { title: "月经不是憋出来的", desc: "月经是子宫内膜自发脱落流出体外的生理现象。它不受任何盆腔括约肌的控制，无法像尿液一样“憋住”。这是不受主观控制的自发流出，请给予她无条件的接纳与关怀。" },
          { title: "避忌寒性食物", desc: "痛经发作期应尽量避免让她食用生冷瓜果（西瓜、哈密瓜、螃蟹等）。冷刺激会导致盆腔及子宫血管骤然收缩，加重子宫缺血，引发更剧烈的绞痛。" },
          { title: "🔴 红色急诊警告指征", desc: "若她出现面色煞白、浑身冷汗、剧烈呕吐无法服药，甚至痛到晕厥休克，千万不要盲目等待，这极有可能是卵巢囊肿扭转或破裂等急腹症，必须立刻送医急诊。" },
          { title: "痛经不仅是‘情绪化’", desc: "严重痛经发作时，体内前列腺素水平甚至是常人的数倍，其引起的肌肉痉挛感等同于轻度分娩痛。这并非矫情，而是货真切实的生理型灾难，此时最需要您的陪伴与分担。" }
        ]
      },
      refine: {
        prompt: "🤖 对当前内容不满意？让 AI 帮你调调语气：",
        placeholder: "如：太正式了 / 想要更温柔 / 加一条热敷建议",
        optimizing: "优化中...",
        optimize: "优化",
        optimizeComplaint: "优化主诉",
        optimizeReference: "优化参考清单",
      },
      shareCard: "一键分享卡片",
      publish: "发布到广场",
      backHome: "返回主页",
      reportError: "报告生成遇到问题",
      backToHome: "返回首页",
    },

    // ============ 社区广场 ============
    community: {
      title: "🌍 共鸣广场",
      back: "返回",
      filterAll: "全部",
      filterFamily: "🏠 家庭群",
      filterFriend: "👥 好友群",
      createGroup: "+ 创建群组",
      createGroupPrompt: "请输入新群组名称（如：家庭群）：",
      joinGroupPrompt: "请输入群组邀请码（演示模式任意输入）：",
      groupCreated: '群组"{{name}}"创建成功！',
      joinedGroup: "已加入群组！",
      newGroup: "新群组",
      emptyState: "🌱 这里还有些安静，数据正在悄悄生长。",
      emptyStateSub: "成为第一个留下足迹的人吧，你的分享就是照亮同路人的微光 ↓",
      emptyStateHint: "—— 或许，这也是大家的痛感正在慢慢变好的信号呢 🍀",
      weeklyStats: '🌸 本周共 {{count}} 位 女性分享了她们的 {{pain}} 经历',
      statsSub: "她们中的许多人,也在这里留下了自己的缓解方法 ↓",
      sentResonance: "共鸣已发送",
      weeklyStats: "🌸 治愈广场共有 {{count}} 个具身痛觉档案正在守望互助，最集中的痛感是「{{pain}}」",
      topTipsTitle: "💡 自愈锦囊 · 亲测有用 Top 5",
      topTipsEmpty: "还没有同伴在这个分类下留下经验，去发布画卷，做第一个分享者吧 🍀",
    },

    // ============ 快速记录 ============
    quickLog: {
      title: "⚡ 快速记录模式",
      subtitle: "不需要绘画，3秒捕捉此刻的真实痛感",
      painSlider1: "隐隐作痛",
      painSlider2: "痛不欲生",
      generate: "生成报告",
      back: "返回详细记录",
    },

    // ============ 疼痛日记 ============
    history: {
      title: "📋 我的疼痛档案",
      export: "📄 导出PDF",
      back: "返回",
      empty: "还没有记录，去画下第一张痛感图吧。",
      records: "{{count}} 条记录",
      trendTitle: "📊 近期规律",
      trendMostCommon: "最常见痛感",
      trendAvgInterval: "平均发作间隔",
      trendTotal: "总记录次数",
      trendDeviation:
        "你的发作间隔与常见周期（28天）有偏差，建议在就诊时向医生提及。",
    },

    // ============ 日记详情 ============
    diary: {
      close: "关闭",
      recordsOfDate: "{{date}} 的记录",
      noRecordThisDay: "这一天没有疼痛记录",
      allRecords: "全部记录",
      showGrouped: "显示分组",
      hideGrouped: "隐藏分组",
      recordFeelings: "📝 记录你的感受",
      feelingHint: "「语言在痛苦面前总是匮乏的，但每一种描述都是真实的。」",
      brushCount: "涂抹 {{count}} 次",
      bodyFront: "腹部正面",
      bodyBack: "腰骶背面",
      bodyBoth: "正背双侧",
      dominantBrush: "主导",
      durationLabel: "⏱️ 这种感觉持续了...",
      durationPlaceholder: "例如：整个下午 / 断断续续几个小时 / 到晚上才缓解",
      reliefLabel: "🌿 什么让你感觉好一些？",
      reliefPlaceholder: "例如：蜷缩起来 / 热敷 / 安静独处...",
      notesLabel: "📓 想记录的其他感受",
      notesPlaceholder: "任何你想说的话...疼痛是真实存在的，不需要被证明。",
      shareContext: "选择分享语境：",
      share: "📤 分享",
      publish: "🌐 发布",
      compareToggle: "📊 与上次发作对比",
      compareHide: "收起对比",
      compareThis: "本次",
      compareLast: "上次",
      compareNoData: "没有更早的记录可对比",
      durationOptions: [
        "蜷缩侧卧，抱紧膝盖",
        "热敷小腹或后腰",
        "安静独处，不被打扰",
        "有人陪伴，握着我的手",
        "听白噪音或轻音乐",
        "喝热水或热饮",
        "垫高臀部平躺",
        "轻轻按摩腹部",
      ],
      periodMorning: "晨间痛",
      periodAfternoon: "午后痛",
      periodNight: "夜间痛",
    },

    // ============ 帖子详情 ============
    post: {
      title: "PainScape 具身证据",
      aiAnalysis: "🤖 AI 痛觉分析：",
      aiDefault:
        "根据图像特征，该痛感呈现典型的机械性收缩特征，伴随局部组织的深度压迫感。",
      selfExperience: "🌿 她的自愈经验：",
      experienceTitle: "💬 她的亲历经验",
      noExperience: "暂无自愈经验，等待过来人分享...",
      addExperience: "+ 补充我的缓解经验（帮助后来者少走弯路）",
      experiencePlaceholder: "分享你的缓解经验（她们在等你的答案）",
      tagsPlaceholder: "针对的症状（如：绞痛，坠痛，用逗号分隔）",
      cancel: "取消",
      publishExperience: "发布经验",
      hugged: "已拥抱",
      giveHug: "给她抱抱",
    },

    // ============ 发布弹窗 ============
    publishModal: {
      title: "💌 留下你的印记",
      hint: "💡 你此刻的感受，也许正是她人在长夜里寻找的共鸣。\n发布后，还可以补充一条缓解经验，告诉姐妹们你是怎么撑过来的。",
      placeholder: "写点什么吧，吐槽也好，倾诉也好，这里懂你……",
      cancel: "再想想",
      submit: "发送共鸣",
    },

    // ============ 分享预览 ============
    sharePreview: {
      shareTitle: "我的痛觉声明卡",
      title: "📤 分享预览",
      loading: "加载中...",
      noContent: "暂无绘画内容",
      livePreview: "实时绘画预览",
      archiveReview: "疼痛档案回顾",
      cancel: "取消",
      confirm: "确认分享",
      defaultTitle: "状态声明",
      defaultDoctorContent: "已记录具身痛觉图谱",
      defaultContent: "正在经历 {{pain}}",
    },

    // ============ Toast 消息 ============
    toast: {
      copySuccess: "文案已复制到剪贴板，可直接粘贴至微信！",
      copyFailed: "复制失败，请重试",
      pdfGenerating: "正在生成 PDF，请稍候...",
      pdfSuccess: "✅ PDF 已生成并下载",
      pdfFailed: "❌ PDF 生成失败，请重试",
      noRecords: "暂无记录可导出",
      saveExperienceRequired: "请写下你的经验",
      postRequired: "写下你的感受吧~",
      recordDeleted: "🗑️ 该痛感档案已从本地永久物理删除",
      refineSuccess: "✨ 内容已优化",
      refineEmpty: "AI 返回了空内容，请重试",
      refineFailed: "❌ AI 优化失败，可能接口未部署或网络异常",
      hugSent: "🤗 抱抱已送达",
      hugRetracted: "收回抱抱",
      shareSaved: "已为您保存分享卡片！",
      shareFailed: "生成分享卡片失败，可能是图片加载超时。请尝试直接截图分享。",
      reportError: "报告生成遇到问题",
      helpfulAdded: "感谢您的认可！这将帮助更多同路人",
      helpfulRemoved: "已取消对该经验的认可",
      publishSuccess: "你的经历已发布 🌸\n\n目前有 {{count}} 位和你一样经历着\"{{pain}}\"的人。\n\n你的分享,可能正是她们一直在找的答案。",
    },

    // ============ AI 模板 - 痛觉描述 ============
    painTemplates: {
      twist: {
        analogy:
          "想象把一条湿毛巾用力拧干，一圈一圈绞紧，从肚脐一直拧到后腰——那种闷痛从里面往外钻。",
        med: "患者自述下腹部持续性绞痛，呈阵发性加重，伴腰骶部放射痛，月经第1-2天为甚，影响日常功能。建议排查子宫痉挛及盆腔充血。",
        selfCare:
          "✨ 尝试【婴儿蜷缩式】侧卧，双膝抱向胸口，放松盆底肌\n✨ 热水袋敷于小腹和后腰，温度40-45°C，每次20分钟\n✨ 缓慢腹式呼吸：吸气4秒-屏住4秒-呼气6秒\n✨ 补充镁元素（坚果/深绿蔬菜）助肌肉放松\n✨ 允许自己蜷缩在被子里，痛经不是你的错",
      },
      pierce: {
        analogy:
          "想象不打麻药进行根管治疗——那种电钻般的锐痛突然扎进下腹，又麻又刺，像有人拿针在盆腔里搅动。",
        med: "患者自述下腹部锐利刺痛，呈一过性钻痛，可放射至大腿内侧，疼痛突发突止，伴冷汗。建议排查神经性疼痛及子宫内膜异位症。",
        selfCare:
          "✨ 刺痛发作时立即侧卧，避免压迫疼痛点\n✨ 用温热毛巾轻敷（不要太烫，刺痛区域更敏感）\n✨ 听白噪音或轻音乐转移注意力\n✨ 备好温水，小口慢饮保持体温\n✨ 发作间隙可轻微活动脚踝促进循环",
      },
      heavy: {
        analogy:
          "像在腹部绑了5公斤沙袋往下坠，站着就想蹲下，坐下又想躺平——那种沉重感从子宫一直拖到膝盖。",
        med: "患者自述下腹部严重坠胀感，站立时加重，平卧可稍缓解，伴腰骶部酸沉。建议排查盆腔充血、子宫腺肌症可能。",
        selfCare:
          "✨ 尝试【臀部垫高平躺】：用枕头垫高臀部15-20cm\n✨ 减少站立和行走，避免提重物\n✨ 穿着高腰宽松内裤，减少腹部束缚\n✨ 温补饮食：桂圆红枣茶、红糖姜水\n✨ 告诉自己：今天辛苦了，躺着不叫懒",
      },
      wave: {
        analogy:
          "像肚子里有个气球在不断充气又放气，一阵一阵地胀，有时蔓延到整个腹部，连呼吸都觉得憋闷。",
        med: "患者自述腹部弥漫性酸胀痛，呈阵发性加重，伴肠胀气感，疼痛范围不固定。建议排查水肿、肠胀气及盆腔炎症。",
        selfCare:
          "✨ 穿着极宽松的衣物，解开所有束缚\n✨ 顺时针轻揉腹部（力度要轻，感觉到皮肉即可）\n✨ 避免产气食物：豆类、碳酸饮料、生冷瓜果\n✨ 温敷整个腹部，用毯子营造温暖环境\n✨ 放慢节奏，节奏慢下来，疼痛也会缓下来",
      },
      scrape: {
        analogy:
          "像一颗未成熟的果实被强行剥皮，那种撕裂感从子宫内部向外刮——每动一下都像被砂纸打磨。",
        med: "患者自述下腹部强烈撕裂样锐痛，活动时加剧，伴里急后重感。建议紧急排查组织粘连、子宫内膜异位囊肿破裂可能。",
        selfCare:
          "✨ 这是最耗费体力的痛感，优先静卧休息\n✨ 绝对避免腹部按摩，减少任何体位变化\n✨ 口服温蜂蜜水补充能量（勿空腹服药）\n✨ 用温和声音和自己对话：'我听见了，我在陪你'\n✨ 疼痛稍缓后，记录下这次发作的细节",
      },
    },
    healing: {
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
      },
      steps: "详细步骤",
      close: "关闭",
    },
    hearing: {
      playing: "播放中...",
      startGuide: "开始语音引导",
      stopGuide: "停止引导"
    },

    // ============ AI 模板 - 伴侣行动 ============
    partnerActions: {
      alone: [
        "☑️ 帮她倒杯温水，备好{{med}}。",
        "☑️ 调暗灯光，关门出去，不要频繁询问。",
      ],
      care: ["☑️ 搓热手掌捂在她小腹或后腰。主动承担家务。"],
      comfort: ["☑️ 坐在旁边握着她的手，不用说话，给予安全感。"],
    },

    // ============ AI 模板 - 请假 ============
    workTemplate: "领导/HR 您好：本人今日突发严重原发性痛经（{{pain}}），伴随体力透支与冷汗。目前状态已无法维持正常专注度，特申请今日居家休息。紧急事务已交接。感谢批准。",

    // ============ 医疗检查数据库 ============
    examDatabase: {
      盆腔超声: {
        prep: "需在检查前 1 小时饮水 500-800ml，保持充盈膀胱（憋尿）。",
        purpose: "观察子宫形态、内膜厚度，排除肌瘤、腺肌症或卵巢囊肿。",
      },
      经阴道超声: {
        prep: "检查前需排空尿液。如无性生活史请务必告知医生，改为经腹超声。",
        purpose: "更清晰地观察内膜异位病灶及盆腔粘连。建议在月经干净后 3-7 天复查。",
      },
      激素六项: {
        prep: "建议在月经周期的第 2-3 天清晨空腹抽血，检查前静坐 10 分钟。",
        purpose: "评估内分泌状态，排查由于激素失调（如多囊）引起的疼痛。",
      },
      腹腔镜: {
        prep: "这属于微创手术，需住院进行。术前需禁食禁饮。",
        purpose: "子宫内膜异位症诊断的'金标准'，可同时进行病灶剥离。",
      },
    },

    // ============ 分享卡片 ============
    shareCard: {
      titles: {
        partner: "通感说明书",
        work: "不可见痛苦声明",
        doctor: "医疗辅助报告",
        self: "自愈建议",
      },
      footer: "PainScape - 让不可见的痛苦被看见",
    },

    // ============ PDF 导出 ============
    pdf: {
      title: "PainScape",
      subtitle: "患者疼痛档案",
      reportRange: "报告范围：{{start}} - {{end}}",
      totalRecords: "总记录数：{{count}}",
      disclaimer1: "本文档由 AI 基于患者的视觉绘画生成，仅供参考。",
      disclaimer2: "请将此报告出示给您的医生。",
      recordLabel: "记录 {{index}}:{{date}}",
      dominantPain: "主导痛感：{{pain}}",
      medicalComplaint: "医疗主诉：",
      medicalReference: "诊疗参考：",
      footer: "PainScape 生成",
    },
  },

  // ==================== 英文 ====================
  en: {
    app: {
      name: "PainScape",
      subtitle: "Let the unspeakable pain find another way to be heard",
      loading: "AI Assistant translating...",
      loadingSub: "Generating multi-context report based on your pain parameters",
      loadingHint:
        "First request may take 30-60 seconds to wake the server, please be patient",
      errorBoundary:
        "Something went wrong with the page, please refresh and try again",
    },
    painAdjectives: {
      faint: "faint",
      persistent: "persistent",
      intense: "intense",
      extremelyIntense: "extremely intense",
    },

    painNames: {
      twist: "cramping",
      pierce: "stabbing",
      heavy: "heavy dragging",
      wave: "diffuse bloating",
      scrape: "tearing",
    },
    splash: {
      quotes: [
        'Chronic pain is a prolonged "unmaking"—trapping a person in a body prison.\n— Elaine Scarry',
        "Pain is not just electrical impulses in nerves; it's an invasion of self-boundaries.",
        "Language always falls short in the face of suffering, but vision is a lightning bolt that cuts through silence.",
        "Pain that goes unseen often demands double the endurance.",
        "Refuse to suffer in silence. Let the unspeakable become public visual evidence.",
        "Your body is a battlefield—allow it to leave traces of the storm.",
        "This is not melodrama; this is a genuine physiological catastrophe.",
      ],
    },
    modeSelection: {
      title: "Select Your Purpose",
      medicalTab: "🏥 Medical Assist",
      generalTab: "🎨 Self-Care",
      confirmBtn: "Confirm & Enter Canvas",
      medicalFeatures: [
        "📋 Standard Gynecology History Intake",
        "🔬 Auto Structured Case Reports",
        "📍 Accurate Anatomical Mapping"
      ],
      generalFeatures: [
        "👁️ Immersive Blind Draw Mode",
        "🌿 Period Self-Care Coaching",
        "✉️ Leave Request & Partner Guides"
      ],
      commonFeatures: [
        "📓 Pain Log",
        "📊 Calendar Trends",
        "🌍 Community Share",
        "💬 Translation Cards"
      ]
    },
    onboarding: {
      languageLabel: "🌐 Target Language:",
      chinese: "简体中文",
      english: "English",
      guideTitle: "User Guide",
      guideItems: [
        ["🎨 Choose Brush", "Each brush corresponds to a pain texture, mix freely"],
        ["🩸 Choose Color", "Colors represent pain emotion and temperature"],
        ["✏️ Start Drawing", "Tap or swipe on the body map to draw your pain range"],
        ["📐 Adjust View", "Long press 0.3s to drag; pinch to zoom details"],
        ["↩️ Undo/Redo", "Right-side buttons to modify anytime, clear to restart"],
        ["⚡ Generate Report", 'Top right "Generate", AI will translate your pain map'],
      ],
      preferenceTitle: "What do you need most during a dysmenorrhea episode?",
      preferences: [
        { key: "alone", title: "🛑 Leave me alone, let me be" },
        { key: "care", title: "🥣 I'm exhausted, need practical care" },
        { key: "comfort", title: "🫂 I'm fragile, need emotional support" },
      ],
      medicalTitle: "Health Information (Optional)",
      step1: "Basic Info",
      step2: "Health Background",
      step3: "Preferences",
      basicInfoTitle: "Basic Information",
      basicInfoHint: "Used for more accurate medical references. All optional.",
      preferenceHint: "Choose the support you need most during pain episodes",
      toneTitle: "Self-care Tone Preference",
      medicalHint: "Helps the system understand your health background. All optional.",
      optional: "Optional",
      reproductiveHistoryHint: "For medical reference only. Will not be shared. You may skip.",
      cycleLabel: "📅 What day of your period? (Optional)",
      cycleOptions: ["Premenstrual", "Day 1", "Day 2", "Day 3-5", "Ovulation Pain", "Aftermenstrual"],
      diagnosisLabel: "Previous Diagnosis (Optional)",
      diagnosisOptions: {
        "": "Previous Diagnosis (Optional)",
        none: "No diagnosis",
        endometriosis: "Endometriosis",
        adenomyosis: "Adenomyosis",
        fibroids: "Uterine Fibroids",
        pcos: "PCOS",
        pid: "Pelvic Inflammatory Disease (PID)",
        ovariancyst: "Ovarian Cyst",
        cervicalstenosis: "Cervical Stenosis",
        other: "Other conditions (please specify)",
        unchecked: "No exam performed",
      },
      allergyLabel: "Drug Allergies (Optional)",
      allergyOptions: {
        "": "Drug Allergies (Optional)",
        none: "No known allergies",
        penicillin: "Penicillin",
        sulfonamides: "Sulfonamides",
        ibuprofen: "Ibuprofen (NSAIDs)",
        aspirin: "Aspirin (NSAIDs)",
        other_nsaids: "Other NSAIDs (e.g., Naproxen, Diclofenac)",
        acetaminophen: "Acetaminophen",
        other: "Other",
        unknown: "Unsure",
      },
      ageLabel: "Age Range (Optional)",
      ageOptions: {
        "": "Select...",
        under18: "Under 18",
        "18-25": "18-25",
        "26-35": "26-35",
        "36-45": "36-45",
        over45: "Over 45",
      },
      basicInfo: "Basic Information (Optional)",
      heightLabel: "Height (cm)",
      heightPlaceholder: "e.g., 170",
      weightLabel: "Weight (kg)",
      weightPlaceholder: "e.g., 75",
      pastHistory: "Past Medical History (Optional)",
      surgicalHistoryLabel: "Surgical History",
      surgicalHistoryOptions: {
        "": "Select...",
        none: "None",
        abdominal: "Abdominal surgery",
        pelvic: "Pelvic surgery",
        other: "Other",
      },
      otherAllergiesLabel: "Other Drug Allergies (Free text)",
      otherAllergiesPlaceholder: "e.g., cephalosporins, levofloxacin",
      currentHistory: "History of Present Illness (Optional)",
      menarcheAgeLabel: "Age at First Period",
      menarcheAgePlaceholder: "e.g., 13",
      cycleRegularLabel: "Menstrual Cycle Regularity",
      cycleRegularOptions: {
        "": "Select...",
        regular: "Regular (21-35 days)",
        irregular: "Irregular",
        unknown: "Unsure",
      },
      activityLabel: "Physical Activity Level (Optional)",
      activityOptions: {
        "": "Select...",
        sedentary: "Sedentary",
        light: "Light activity",
        moderate: "Moderate",
        active: "Very active",
      },
      lifestyleLabel: "Lifestyle & Habits (Optional)",
      lifestyleOptions: {
        sleepDuration: "Insufficient sleep (less than 7 hours)",
        sleepIrregular: "Irregular sleep schedule",
        smoking: "Smoking",
        alcohol: "Alcohol consumption",
        caffeine: "Regular coffee/tea consumption",
        diet: "Dietary Preferences",
      },
      familyHistoryLabel: "Family History (Optional)",
      familyHistoryOptions: {
        "": "Select...",
        none: "No family history",
        mother: "Mother has severe dysmenorrhea",
        sister: "Sister has severe dysmenorrhea",
        both: "Multiple family members",
        unknown: "Unknown",
      },
      periodDurationLabel: "How many days does your period usually last?",
      periodDurationOptions: {
        "": "Select",
        "3": "3 days",
        "4": "4 days",
        "5": "5 days",
        "6": "6 days",
        "7": "7 days",
        "over7": "Over 7 days"
      },
      lastPeriodLabel: "When was your last period?",
      lastPeriodPlaceholder: "e.g., 2026-06-01",
      cycleRegularDefinition: "Regular: cycle length varies by ≤5 days",
      familyHistoryMulti: "Family History (select all that apply)",
      motherHistory: "Mother has history of dysmenorrhea",
      sisterHistory: "Sister has history of dysmenorrhea",
      grandmotherHistory: "Grandmother has history of dysmenorrhea",
      reproductiveHistoryMulti: "Reproductive History (select all that apply)",
      nulliparous: "Never given birth",
      pregnant: "Pregnant (not yet given birth)",
      parous: "Has given birth",
      spontaneousAbortion: "History of spontaneous abortion/miscarriage",
      inducedAbortion: "History of induced abortion/termination",
      multiple: "Multiple births",
      menstrualHistoryTitle: "🌸 Menstrual History",
      psychosocialLabel: "Psychosocial Factors (Optional)",
      psychosocialOptions: {
        "": "Select...",
        lowStress: "Low stress",
        moderateStress: "Moderate stress",
        highStress: "High stress/anxiety",
        trauma: "Trauma/abuse history",
      },
      reproductiveHistoryLabel: "Reproductive History (Optional)",
      reproductiveHistoryOptions: {
        "": "Select...",
        nulliparous: "Never given birth",
        parous: "Has given birth",
        miscarriage: "History of miscarriage",
        multiple: "Multiple births",
      },
      accompanyingLabel: "Accompanying symptoms (multiple selections allowed)",
      accompanyingOptions: {
        headache: "Headache",
        breast: "Breast tenderness",
        lumbosacral: "Lumbosacral pain",
        nausea: "Nausea and vomiting",
        diarrhoea: "Menstrual diarrhoea",
        fatigue: "Fatigue"
      },
      toneDescription: "Generated content will use this tone",
      toneGentle: "🌿 Gentle",
      toneDirect: "💬 Direct",
      toneHint: "Gentle: soothing / Direct: just the methods",
      switchToMedical: "Health Information (Optional)",
      switchToPreference: "Back to Preferences",
      cycleNotProvided: "Not provided",
      startDrawing: "Start Drawing",
      quickLog: "⚡ No time to draw, quick log",
      exploreCommunity: "🌍 Community",
      painDiary: "📅 Pain Diary",
      feedbackPrompt:
        "Your feedback helps us improve (leave blank for anonymous):",
      feedbackThanks:
        "Thank you for your feedback! Every message is read carefully.",
      submitFeedback: "📮 Submit Feedback",
      gotIt: "Got it",
    },

    brushes: {
      twist: { label: "� Cramp", icon: "�" },
      pierce: { label: "⚡️ Stab", icon: "⚡️" },
      heavy: { label: "🪨 Sink", icon: "🪨" },
      wave: { label: "〰️ Fullness", icon: "〰️" },
      scrape: { label: "🔪 Scrape", icon: "🔪" },
      eraser: { label: "🧽 Eraser", icon: "🧽" },
    },
    painNames: {
      twist: "Cramping",
      pierce: "Stabbing",
      heavy: "Dragging Sinking",// 下坠坠痛
      wave: "Bloating Fullness",// 酸胀痛/胀满闷胀
      scrape: "Scraping Tearing"// 撕扯/刮坠裂痛
    },
    colors: {
      crimson: { label: "🩸" },
      dark: { label: "🌑" },
      purple: { label: "🔮" },
      blue: { label: "❄️" },
    },
    colorDescriptions: {
      crimson: "Crimson: Acute sharp pain/congestion",
      dark: "Dark Gray: Heavy dull pain/depression",
      purple: "Purple: Neuropathic radiating pain",
      blue: "Ice Blue: Cold/Stiffness",
    },

    canvas: {
      bodyFront: "Front",
      bodyBack: "Back",
      bodyNone: "Blind Mode",
      emotionLoad: "Load",
      generate: "Generate",
    },

    result: {
      tabs: {
        partner: "Partner",
        work: "Leave",
        doctor: "Doctor",
        self: "Self-care",
      },
      partner: {
        title: "Synesthesia Guide",
        experiencing: "She is experiencing intense",
        actionPrompt: "💡 Please do the following actions:",
        copyAction: "📋 Copy Action List",
      },
      work: {
        title: "Smart Leave Request Template",
        description:
          "Objectively describes physical condition, dignified, with transition space.",
        copyTemplate: "📋 Copy Leave Request",
      },
      doctor: {
        title: "Medical Aid Report",
        disclaimer: "AI-generated · For reference only",
        clinicalAdvice: "🩺 Clinical Recommendation",
        examNotice: "💡 Patient Exam Notice: ",
        preparation: "Preparation: ",
        purpose: "Purpose: ",
        attachedMap:
          "The multidimensional pain map is included in this report for your doctor's reference.",
        discussReference: "📋 For discussion with your doctor:",
        copyReport: "📋 Copy Full Report",
      },
      self: {
        title: "Self-care & Community Support",
        comfort:
          "Dear one, you've drawn your storm. Pain is not your fault. You're allowed to be unproductive today—rest well.",
        copyAdvice: "📋 Copy Self-care Tips",
      },
      science: {
        selfCare: [
          { title: "🌸 Misconception: Can I use tampons without sexual experience?", desc: "Absolutely. The hymen is a flexible, ring-like muscular tissue, not a sealed barrier. Standard tampons are much narrower (approx. 1cm) and will not cause damage if used gently with proper instructions." },
          { title: "🍵 Misconception: Does brown sugar cure cramps?", desc: "Brown sugar is 99% sucrose. High sugar intake can actually promote inflammatory responses and exacerbate cramps. Warm hydration and physical heat are the true keys to relaxing pelvic smooth muscles." },
          { title: "📊 Menstrual Phase Living Guide", desc: "The follicular phase (week after period) is your high-energy gold mine, perfect for strenuous workouts and major presentations. The luteal phase (premenstrual week) requires low-intensity exercises, warmth, and mindfulness." },
          { title: "🔬 Secondary Dysmenorrhea Self-Assessment", desc: "If menstrual flow exceeds 80ml (soaking through a pad every 2 hours), includes massive blood clots, or regular pain relievers (ibuprofen) fail entirely, please schedule a pelvic ultrasound to rule out conditions like endometriosis." }
        ],
        partner: [
          { title: "A period cannot be 'held'", desc: "Menstrual flow is an involuntary shedding of the uterine lining. Unlike urination, it cannot be controlled by sphincters. Please give her unconditional support and compassion." },
          { title: "Avoid Cold Foods", desc: "During cramping episodes, ensure she avoids extremely cold beverages or cooling foods (like watermelon or crab). Cold stimuli cause sudden vascular contraction in the pelvis, worsening ischemic pain." },
          { title: "🔴 Red Flag Emergency Signs", desc: "If she exhibits cold sweats, paleness, fainting, vomiting, or acute persistent pain, do not wait. These are potential indicators of acute gynecological emergencies like cyst torsion, and require immediate transport to an ER." }
        ]
      },
      refine: {
        prompt: "🤖 Not satisfied? Let AI adjust the tone:",
        placeholder: "e.g.: too formal / make it gentler / add heat pad advice",
        optimizing: "Optimizing...",
        optimize: "Optimize",
        optimizeComplaint: "Optimize Complaint",
        optimizeReference: "Optimize Reference",
      },
      shareCard: "Share",
      publish: "Post",
      backHome: "Home",
      reportError: "Report generation encountered an issue",
      backToHome: "Home",
    },

    community: {
      title: "🌍 Community",
      back: "Back",
      filterAll: "All",
      filterFamily: "🏠 Family Group",
      filterFriend: "👥 Friends Group",
      createGroup: "+ Create Group",
      createGroupPrompt: "Enter new group name (e.g., Family Group):",
      joinGroupPrompt:
        "Enter group invitation code (enter anything in demo mode):",
      groupCreated: 'Group "{{name}}" created successfully!',
      joinedGroup: "Successfully joined the group!",
      newGroup: "New Group",
      emptyState: "🌱 It's still quiet here, data is quietly growing.",
      emptyStateSub:
        "Be the first to leave a mark—your sharing is a glimmer of light for fellow travelers ↓",
      emptyStateHint:
        "—— Perhaps this also means everyone's pain is slowly getting better 🍀",
      weeklyStats:
        "🌸 This week {{count}} women shared their {{pain}} experience",
      statsSub: "Many of them also left their relief methods here ↓",
      sentResonance: "Resonance sent",
      weeklyStats: "🌸 {{count}} embodied pain profiles in this sanctuary supporting each other. The most prominent pain is {{pain}}.",
      topTipsTitle: "💡 Wisdom Shelf · Top 5 Relief Tips",
      topTipsEmpty: "No tips left under this category yet. Be the first to share your comfort recipe 🍀",
    },

    quickLog: {
      title: "⚡ Quick Log Mode",
      subtitle: "No drawing needed, capture your real pain in 3 seconds",
      painSlider1: "Mild Discomfort",
      painSlider2: "Unbearable",
      generate: "Generate Report",
      back: "Back to Detailed Log",
    },

    history: {
      title: "📋 My Pain Archive",
      export: "📄 Export PDF",
      back: "Back",
      empty: "No records yet. Go draw your first pain map.",
      records: "{{count}} records",
      trendTitle: "📊 Recent Patterns",
      trendMostCommon: "Most Common Pain",
      trendAvgInterval: "Average Interval",
      trendTotal: "Total Records",
      trendDeviation:
        "Your episode interval deviates from the typical cycle (28 days). Consider mentioning this to your doctor.",
    },

    diary: {
      close: "Close",
      recordsOfDate: "Records for {{date}}",
      noRecordThisDay: "No pain records for this day",
      allRecords: "All Records",
      showGrouped: "Show Grouped",
      hideGrouped: "Hide Grouped",
      brushCount: "{{count}} brush strokes",
      bodyFront: "Abdomen (Front)",
      bodyBack: "Lower Back",
      bodyBoth: "Both Sides",
      dominantBrush: "Dominant",
      recordFeelings: "📝 Record Your Feelings",
      feelingHint:
        '"Language always falls short before pain, but every description is real."',
      durationLabel: "⏱️ This feeling lasted...",
      durationPlaceholder: "e.g.: all afternoon / on and off for hours / eased by evening",
      reliefLabel: "🌿 What made you feel better?",
      reliefPlaceholder: "e.g.: curled up / heat pad / quiet alone time...",
      notesLabel: "📓 Other feelings you want to record",
      notesPlaceholder:
        "Anything you want to say... Pain is real, it doesn't need to be proven.",
      shareContext: "Choose sharing context:",
      share: "📤 Share",
      publish: "🌐 Post",
      compareToggle: "📊 Compare with Last Episode",
      compareHide: "Hide Comparison",
      compareThis: "This Time",
      compareLast: "Last Time",
      compareNoData: "No earlier records to compare",
      durationOptions: [
        "Curled on side, knees to chest",
        "Heat pad on belly or lower back",
        "Quiet solitude, undisturbed",
        "Someone beside me, holding my hand",
        "White noise or soft music",
        "Hot water or warm drink",
        "Hips elevated, lying flat",
        "Gentle abdominal massage",
      ],
      periodMorning: "Morning Pain",
      periodAfternoon: "Afternoon Pain",
      periodNight: "Night Pain",
    },

    post: {
      title: "PainScape Embodied Evidence",
      aiAnalysis: "🤖 AI Pain Analysis:",
      aiDefault:
        "Based on image characteristics, this pain exhibits typical mechanical contraction features with deep localized tissue pressure.",
      selfExperience: "🌿 Her Relief Experience:",
      experienceTitle: "💬 Her Personal Experience",
      noExperience: "No relief experience yet, waiting for someone to share...",
      addExperience: "+ Share my relief tips (help those who come after)",
      experiencePlaceholder:
        "Share your relief experience (they're waiting for your answer)",
      tagsPlaceholder: "Target symptoms (e.g.: cramping, heavy pain, comma-separated)",
      cancel: "Cancel",
      publishExperience: "Share Experience",
      hugged: "Hugged",
      giveHug: "Give a Hug",
    },

    publishModal: {
      title: "💌 Leave Your Mark",
      hint: "💡 Your current feelings might be exactly the resonance someone else is searching for in the long night.\nAfter posting, you can also add a 'relief tip' to tell others how you got through it.",
      placeholder:
        "Write something—vent, confide, here we understand...",
      cancel: "Think Again",
      submit: "Send Resonance",
    },

    sharePreview: {
      shareTitle: "My Pain Statement Card",
      title: "📤 Share Preview",
      loading: "Loading...",
      noContent: "No drawing content",
      livePreview: "Live Drawing Preview",
      archiveReview: "Pain Archive Review",
      cancel: "Cancel",
      confirm: "Confirm Share",
      defaultTitle: "Status Statement",
      defaultDoctorContent: "Embodied pain map recorded",
      defaultContent: "Currently experiencing {{pain}}",
    },

    toast: {
      copySuccess: "Text copied to clipboard!",
      copyFailed: "Copy failed, please try again",
      pdfGenerating: "Generating PDF, please wait...",
      pdfSuccess: "✅ PDF generated and downloaded",
      pdfFailed: "❌ PDF generation failed, please try again",
      noRecords: "No records to export",
      saveExperienceRequired: "Please write down your experience",
      postRequired: "Share your feelings~",
      recordDeleted: "🗑️ Record has been permanently deleted from local storage",
      refineSuccess: "✨ Content optimized",
      refineEmpty: "AI returned empty content, please try again",
      refineFailed:
        "❌ AI optimization failed, API may not be deployed or network error",
      hugSent: "🤗 Hug delivered",
      hugRetracted: "Hug retracted",
      shareSaved: "Share card saved!",
      shareFailed:
        "Failed to generate share card. Please try taking a screenshot instead.",
      reportError: "Report generation encountered an issue",
      helpfulAdded: "Thank you! Your upvote helps fellow sisters find comfort",
      helpfulRemoved: "Upvote removed",
      publishSuccess: "Your experience has been shared 🌸\n\nThere are currently {{count}} others also experiencing \"{{pain}}\".\n\nYour sharing may be exactly the answer they've been searching for.",
    },

    painTemplates: {
      twist: {
        analogy:
          "Imagine wringing out a thick, soaking wet towel—twisting tighter and tighter from your navel all the way to your lower back. That dull, deep ache that radiates outward from within.",
        med: "Patient reports persistent cramping pain in the lower abdomen, episodic exacerbation with lumbosacral radiation, most severe on days 1-2 of menstruation, affecting daily function. Recommend evaluation for uterine spasms and pelvic congestion.",
        selfCare:
          "✨ Try fetal position: lie on your side, knees to chest, relax pelvic floor\n✨ Heating pad on lower belly and back, 40-45°C, 20 min each session\n✨ Slow belly breathing: inhale 4s - hold 4s - exhale 6s\n✨ Magnesium-rich foods (nuts, dark greens) to ease muscle tension\n✨ You're allowed to curl up in bed. Pain is not your fault",
      },
      pierce: {
        analogy:
          "Imagine getting a root canal without anesthesia—that electric, drilling sharp pain suddenly jabs into your lower abdomen, numb and stinging, like someone stirring a needle inside your pelvis.",
        med: "Patient reports sharp, stabbing pain in lower abdomen, transient drilling sensation radiating to inner thighs, sudden onset and offset, accompanied by cold sweats. Recommend evaluation for neuropathic pain and endometriosis.",
        selfCare:
          "✨ Lie on your side immediately when pain strikes, avoid pressure points\n✨ Apply warm (not hot) compress—stabbing areas are more sensitive\n✨ White noise or soft music to redirect attention\n✨ Keep warm water nearby, sip slowly to maintain body heat\n✨ Between episodes, gently move ankles to improve circulation",
      },
      heavy: {
        analogy:
          "Like tying a 5kg sandbag to your abdomen—standing makes you want to crouch, sitting makes you want to lie flat. That heavy, dragging sensation from your uterus all the way down to your knees.",
        med: "Patient reports severe heavy, dragging sensation in lower abdomen, worsens when standing, slightly relieved lying down, with lumbosacral soreness. Recommend evaluation for pelvic congestion and possible adenomyosis.",
        selfCare:
          "✨ Try elevated hip position: prop hips 15-20cm with pillows, lie flat\n✨ Minimize standing/walking, avoid lifting anything heavy\n✨ Wear high-waist loose underwear, reduce abdominal pressure\n✨ Warm nourishing drinks: red date tea, ginger brown sugar water\n✨ Tell yourself: today was hard, resting isn't laziness",
      },
      wave: {
        analogy:
          "Like a balloon inside your belly constantly inflating and deflating—waves of bloating that spread across your entire abdomen, making even breathing feel suffocating.",
        med: "Patient reports diffuse bloating pain in abdomen, episodic exacerbation with intestinal gas sensation, pain location not fixed. Recommend evaluation for edema, intestinal bloating, and pelvic inflammation.",
        selfCare:
          "✨ Wear the loosest clothes you own, undo all waistbands\n✨ Gentle clockwise abdominal massage (very light pressure only)\n✨ Avoid gas-producing foods: beans, carbonated drinks, raw cold foods\n✨ Heat pad over entire belly, create a warm cocoon with blankets\n✨ Slow everything down—when you slow down, pain slows too",
      },
      scrape: {
        analogy:
          "Like an unripe fruit being forcefully peeled—that tearing sensation scraping from inside your uterus outward. Every movement feels like sandpaper grinding against raw flesh.",
        med: "Patient reports intense tearing sharp pain in lower abdomen, worsens with movement, accompanied by tenesmus. Recommend urgent evaluation for tissue adhesions and possible ruptured endometriotic cyst.",
        selfCare:
          "✨ This is the most draining type of pain—prioritize absolute rest\n✨ Absolutely no abdominal massage, minimize any position changes\n✨ Sip warm honey water for energy (don't take meds on empty stomach)\n✨ Talk to yourself gently: 'I hear you, I'm here with you'\n✨ Once pain eases, jot down details of this episode",
      },
    },
    healing: {
      breathing: {
        title: "🌬️ Breathing Therapy",
        description: "Deep abdominal breathing helps the body relax and relieves tension caused by pain.",
        steps: "① Find a quiet, comfortable place to sit or lie down\n② Place one hand on your abdomen to feel its movement\n③ Inhale for 4 seconds, feeling your abdomen rise like a balloon\n④ Hold for 4 seconds to allow oxygen into your bloodstream\n⑤ Exhale for 6 seconds, feeling your abdomen fall\n⑥ Repeat 10-15 times, feeling your body relax"
      },
      heatPack: {
        title: "🔥 Heat Therapy",
        description: "Warmth promotes local circulation and relieves muscle spasms, one of the most effective remedies for dysmenorrhea.",
        steps: "① Prepare a hot water bottle or heating pad (40-45°C)\n② Wrap with a towel to avoid direct skin contact\n③ Apply to lower abdomen or lower back\n④ 15-20 minutes per session\n⑤ Can be applied 3-4 times daily\n⑥ Stay hydrated, drink water"
      },
      meditation: {
        title: "🧘 Mindfulness Meditation",
        description: "Shift attention away from pain, accept present feelings without judgment, reducing the psychological burden of pain.",
        steps: "① Find a quiet place and sit comfortably\n② Close your eyes and focus on breathing\n③ When mind wanders, gently bring it back to breath\n④ Feel the pain without judging it\n⑤ Imagine pain passing like clouds\n⑥ Start with 5-10 minutes, gradually increase"
      },
      warmDrink: {
        title: "🍵 Warm Beverages",
        description: "Warm drinks not only warm the body but also soothe the mind, an important part of self-care.",
        steps: "① Ginger brown sugar tea: 3 slices ginger + 1 spoon brown sugar + hot water\n② Longan red date tea: 5 longans + 3 red dates\n③ Warm milk with honey\n④ Avoid cold drinks and caffeine\n⑤ Sip slowly, feel the warmth\n⑥ Drink 2-3 cups daily"
      },
      steps: "Steps",
      close: "Close",
    },

    partnerActions: {
      alone: [
        "☑️ Bring her warm water and prepare {{med}}.",
        "☑️ Dim the lights, close the door, don't check on her too often.",
      ],
      care: [
        "☑️ Rub your palms warm and place on her lower belly or back. Take over household chores.",
      ],
      comfort: [
        "☑️ Sit beside her, hold her hand without speaking—just be there with a sense of safety.",
      ],
    },

    workTemplate: "Dear Manager/HR: I am experiencing a severe primary dysmenorrhea episode today ({{pain}}), accompanied by physical exhaustion and cold sweats. I'm unable to maintain normal focus and am requesting to work from home/rest today. Urgent matters have been delegated. Thank you for your understanding.",

    examDatabase: {
      "pelvic ultrasound": {
        prep: "Requires full bladder: drink 500-800ml water 1 hour before exam.",
        purpose:
          "Evaluates uterine morphology, endometrial thickness, rules out fibroids, adenomyosis, or ovarian cysts.",
      },
      "transvaginal ultrasound": {
        prep: "Empty bladder before exam. If no history of sexual activity, inform doctor to switch to abdominal ultrasound.",
        purpose:
          "Clearer visualization of endometriotic lesions and pelvic adhesions. Best performed 3-7 days after period ends.",
      },
      "hormone panel": {
        prep: "Blood draw on day 2-3 of cycle, fasting in early morning. Sit quietly for 10 minutes before draw.",
        purpose:
          "Evaluates endocrine status, rules out hormone-related pain (e.g., PCOS).",
      },
      laparoscopy: {
        prep: "Minimally invasive surgery requiring hospitalization. Fasting required before procedure.",
        purpose:
          "Gold standard for endometriosis diagnosis, allows simultaneous lesion removal.",
      },
    },

    shareCard: {
      titles: {
        partner: "Synesthesia Guide",
        work: "Invisible Pain Statement",
        doctor: "Medical Aid Report",
        self: "Self-care Suggestions",
      },
      footer: "PainScape - Making invisible pain visible",
    },

    pdf: {
      title: "PainScape",
      subtitle: "Patient Pain Profile",
      reportRange: "Report Range: {{start}} - {{end}}",
      totalRecords: "Total Records: {{count}}",
      disclaimer1:
        "This document is generated by AI based on patient's visual drawing, for reference only",
      disclaimer2: "Please present this to your gynecologist.",
      recordLabel: "Record {{index}}: {{date}}",
      dominantPain: "Dominant Pain: {{pain}}",
      medicalComplaint: "Medical Complaint:",
      medicalReference: "Medical Reference:",
      footer: "PainScape - Generated Report",
    },
  },
};

export default translations;