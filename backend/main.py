# main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any
import os
import json
import re
import uuid
import requests
from dotenv import load_dotenv
from openai import OpenAI
from datetime import datetime

load_dotenv()

# ═══════════════════════════════════════════════════════════
# LLM Providers 配置保持与您当前一致，优先使用 Vivo 蓝心
# ═══════════════════════════════════════════════════════════
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "vivo").lower()

PROVIDER_CONFIG = {
    "dashscope": {
        "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "api_key_env": "DASHSCOPE_API_KEY",
        "model": "qwen-plus",
        "model_quick": "qwen-turbo",
        "model_refine": "qwen-turbo",
        "max_tokens": 4096,
        "display_name": "通义千问 Qwen-Plus",
    },
    "deepseek": {
        "base_url": "https://api.deepseek.com/v1",
        "api_key_env": "DEEPSEEK_API_KEY",
        "model": "deepseek-chat",
        "model_quick": "deepseek-chat",
        "model_refine": "deepseek-chat",
        "max_tokens": 4096,
        "display_name": "DeepSeek-V3",
    },
    "zhipu": {
        "base_url": "https://open.bigmodel.cn/api/paas/v4",
        "api_key_env": "ZHIPU_API_KEY",
        "model": "glm-4-plus",
        "model_quick": "glm-4-flash",
        "model_refine": "glm-4-flash",
        "max_tokens": 4096,
        "display_name": "智谱 GLM-4-Plus",
    },
    "vivo": {
        "base_url": "https://api-ai.vivo.com.cn/v1",
        "api_key_env": "VIVO_API_KEY",
        "model": "Volc-DeepSeek-V3.2",
        "model_quick": "Doubao-Seed-2.0-mini",
        "model_refine": "Doubao-Seed-2.0-mini",
        "max_tokens": 4096,
        "display_name": "Vivo蓝心大模型",
    },
}

config = PROVIDER_CONFIG[LLM_PROVIDER]
api_key = os.getenv(config["api_key_env"])

client = None
if LLM_PROVIDER != "vivo":
    client = OpenAI(api_key=api_key or "EMPTY", base_url=config["base_url"])

print(f"✅ 当前激活的 LLM 渠道: {config['display_name']} ({config['model']})")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# 💡 强鲁棒性的 Pydantic 宽松数据模型（防止 422 报错）
# ─────────────────────────────────────────────

class SpatialMapModel(BaseModel):
    abdomen: Optional[float] = 0.5
    lowerBack: Optional[float] = 0.5
    upperBody: Optional[float] = 0.0

class IntensityProfileModel(BaseModel):
    avgSpeed: Optional[float] = 5.0
    peakSpeed: Optional[float] = 10.0
    avgPressure: Optional[float] = 0.5

class TimeRhythmModel(BaseModel):
    morning: Optional[float] = 0.33
    afternoon: Optional[float] = 0.33
    night: Optional[float] = 0.34
    dominantPeriod: Optional[str] = "morning"

class MedicalBackgroundModel(BaseModel):
    diagnosed: Optional[Any] = ""
    allergies: Optional[Any] = ""
    age: Optional[Any] = ""
    lifestyle: Optional[Any] = ""
    activityLevel: Optional[Any] = ""
    familyHistory: Optional[Any] = ""
    psychosocial: Optional[Any] = ""
    reproductiveHistory: Optional[Any] = ""
    height: Optional[Any] = ""
    weight: Optional[Any] = ""
    otherDiagnosis: Optional[Any] = ""
    otherAllergies: Optional[Any] = ""
    surgicalHistory: Optional[Any] = ""
    menarcheAge: Optional[Any] = ""
    cycleRegular: Optional[Any] = ""
    periodDuration: Optional[Any] = ""
    lastPeriod: Optional[Any] = ""
    familyHistoryArr: Optional[List[Any]] = Field(default_factory=list)
    lifestyleArr: Optional[List[Any]] = Field(default_factory=list)
    reproductiveHistoryArr: Optional[List[Any]] = Field(default_factory=list)
    accompanyingSymptomsArr: Optional[List[Any]] = Field(default_factory=list)

class PainData(BaseModel):
    appMode: Optional[str] = "medical"  # 'medical' | 'general'
    dominantPain: str
    userPref: str
    painScore: int
    brushCounts: Optional[Dict[str, int]] = None
    spatialMap: Optional[SpatialMapModel] = None
    intensityProfile: Optional[IntensityProfileModel] = None
    timeRhythm: Optional[TimeRhythmModel] = None
    colorPalette: Optional[str] = None
    bodyMode: Optional[str] = None
    medicalBackground: Optional[MedicalBackgroundModel] = None
    tonePreference: Optional[str] = "gentle"
    cycleDay: Optional[str] = "未提供"
    targetLanguage: Optional[str] = "zh"
    isQuickLog: Optional[bool] = False
    accompanyingSymptoms: Optional[List[str]] = Field(default_factory=list)

# ─────────────────────────────────────────────
# 双语痛觉物理映射对照表
# ─────────────────────────────────────────────
PAIN_MAP = {
    "zh": {
        "twist": "绞拧痛（子宫平滑肌痉挛收缩）",
        "pierce": "针刺刺痛（局灶神经敏化痛）",
        "heavy": "重压坠胀感（盆腔静脉淤血）",
        "wave": "酸胀充气痛（内脏弥漫性炎性水肿）",
        "scrape": "撕裂剥脱痛（内膜异位粘连拉扯）"
    },
    "en": {
        "twist": "spasmodic cramping (smooth muscle hyper-contraction)",
        "pierce": "focal stabbing (localized peripheral sensitization)",
        "heavy": "heavy dragging pressure (pelvic venous congestion)",
        "wave": "diffuse dull aching bloating (visceral inflammatory edema)",
        "scrape": "scraping and tearing (endometrial adhesion tension)"
    }
}

# ─────────────────────────────────────────────
# 特征向量 -> 病生理及动力学转换机制（具身解释）
# ─────────────────────────────────────────────
def translate_vectors_to_clinical(data: PainData, lang: str) -> str:
    """
    将前端提取的速度、压力、分布数据动态转换为高度专业的临床/生理特征叙述
    """
    ip = data.intensityProfile or IntensityProfileModel()
    sm = data.spatialMap or SpatialMapModel()
    tr = data.timeRhythm or TimeRhythmModel()
    
    # 压感转换
    pressure_val = ip.avgPressure or 0.5
    if pressure_val > 0.7:
        depth_desc = "深层内脏痛、痛觉传导阈值显著降低，痛灶深在且伴平滑肌缺血硬化" if lang == "zh" else "deep visceral hyperalgesia with microvascular ischemia"
    elif pressure_val < 0.3:
        depth_desc = "浅表性神经感觉敏感、刺痒、局灶性过敏应激" if lang == "zh" else "superficial neurogenic hypersensitivity"
    else:
        depth_desc = "中度肌源性紧张痛" if lang == "zh" else "moderate myogenic tension pain"

    # 绘制速度转换（动态反应）
    speed_val = ip.avgSpeed or 5.0
    if speed_val > 15.0:
        volatility_desc = "痛感呈高度阵发性爆发、闪电样交替，伴强烈焦虑和中枢神经敏化" if lang == "zh" else "highly paroxysmal pain with central autonomic arousal"
    else:
        volatility_desc = "痛感呈持续性低水平钝痛，具有长期病生理惰性" if lang == "zh" else "persistent dull aching with ischemic stasis"

    # 空间分布转化
    distribution_desc = ""
    if sm.abdomen > 0.6:
        distribution_desc = "痛灶高度局限于盆腔前壁与腹膜壁层，符合子宫前倾及圆韧带张力反射" if lang == "zh" else "pain localized in anterior pelvic wall, corresponding to uterine anteversion"
    elif sm.lowerBack > 0.6:
        distribution_desc = "痛觉明显向后骶丛神经（S2-S4）放射，伴直肠压迫及梨状肌交感刺激反射" if lang == "zh" else "pain radiating to sacral plexus (S2-S4) with secondary lumbosacral tension"
    else:
        distribution_desc = "痛灶呈双侧广泛性弥漫，累及前后盆底肌肉群" if lang == "zh" else "diffuse bilateral pelvic floor distribution"

    if lang == "zh":
        return f"【具身绘图动力学分析】：患者画笔压感系数（{pressure_val:.2f}）表明存在{depth_desc}；画笔平均速度（{speed_val:.1f}）指向{volatility_desc}；空间热图显示{distribution_desc}。"
    else:
        return f"[Embodied Dynamics Analysis]: Drawing pressure ({pressure_val:.2f}) indicates {depth_desc}; stroke velocity ({speed_val:.1f}) points to {volatility_desc}; spatial map indicates {distribution_desc}."


# ═══════════════════════════════════════════════════════════
# 核心生成端点（双模式 Few-Shot 模版控制）
# ═══════════════════════════════════════════════════════════
@app.post("/api/generate")
async def generate_pain_report(data: PainData):
    lang = str(data.targetLanguage or "zh")
    app_mode = str(data.appMode or "medical").lower() # medical / general
    mb = data.medicalBackground

    pt_dict = PAIN_MAP.get(lang, PAIN_MAP["zh"])
    vector_analysis = translate_vectors_to_clinical(data, lang)

    # 止痛药敏感性及过敏红线判断
    allergy = getattr(mb, 'allergies', '') if mb else ''
    safe_painkiller = "对乙酰氨基酚" if lang == "zh" else "Acetaminophen"
    default_painkiller = "布洛芬" if lang == "zh" else "Ibuprofen"
    painkiller = safe_painkiller if allergy in ["ibuprofen", "aspirin", "nsaids"] else default_painkiller

    # ─────────────────────────────────────────────
    # System Prompt 定义：区分就诊模式与自愈模式
    # ─────────────────────────────────────────────
    if app_mode == "general":
        # 自愈模式：重点放在“心理舒缓”、“正念身体扫描”、“经期激素节律”与“骨盆力学松弛”，避免医生建议
        sys_prompt = f"""
You are an empathetic, professional mind-body wellness therapist and somatic practitioner specializing in pelvic and menstrual physiology.
You will translate the user's painted pain textures, intensity vectors, and lifestyle habits into a deeply supportive, scientific "Menstrual Somatic & Mind-Body Profile" (for self-care), NOT a clinical medical chart.

【FORMAT RULES】
You MUST output a strictly formatted JSON object with the following fields:
1. "chief_complaint": A tender, gentle description of their current pelvic feeling (e.g., "Somatic Reflection: Today the pelvis feels compressed with heavy waves...").
2. "present_illness": A detailed, scientific, yet deeply soothing psychosomatic analysis of why they feel this pain. Discuss pelvic floor myofascial tension, visceral-somatic reflexes, and how autonomic nervous system activation (stress) amplifies cramping. Avoid clinical jargon like 'patient', 'triage', 'diagnoses'.
3. "past_history": A narrative reflecting on their personal lifestyle (habits, sleep, posture, physical activity level) and how it affects pelvic circulation.
4. "menstrual_history": Standard description of their cycle, written in a warm, somatic self-awareness tone.
5. "clinical_diagnosis": Rename this to "Somatic State Analysis". Provide a synthesis of pelvic muscle contraction level (e.g., "Elevated sympathetic tone and pelvic congestion").
6. "clinical_suggestions": Rename this to "Holistic Pelvic Restoration Rituals". Provide 3 highly detailed somatic rehabilitation exercises (such as specific breathing, pelvic floor drop, or constructive rest positions) tailored to their exact painted location and pressure.
7. "analogy": A poetic, vivid visceral analogy describing the physical state in their chosen language.
8. "work": A balanced, dignified message requesting rest or accommodations, maintaining a healthy boundaries tone.
9. "action": An actionable guide for partners/friends on how to provide practical, emotional, and comforting assistance (e.g., "Warm compress on sacrum", "Gentle physical presence without overwhelming demands").
10. "selfCare": A series of gentle, validating, and scientific self-care tips.

【FEW-SHOT EXAMPLE (Self-care Mode / ZH)】
{{
  "chief_complaint": "【身体感知记录】行经第2天，腹股沟及盆底肌群感到强烈的绞拧式收缩感，并伴有腰骶部温冷下坠。",
  "present_illness": "当你画出深层、不规则的绞拧笔触时，这在生理上对应着子宫内膜前列腺素（PGF2α）的大量释放，引起了子宫平滑肌的阵发性痉挛。由于内脏神经的会聚效应，这种痛觉电信号反射到了你的后背。当我们感到寒冷或焦虑时，交感神经处于高度应激状态，血管紧缩，从而放大了缺血性痛感。这绝非矫情，而是你体内平滑肌纤维在进行着有力的代谢运动，它需要温热与氧气的及时灌溉。",
  "past_history": "由于日常工作存在静态久坐习惯，骨盆处的静脉微循环在经前容易发生淤血积聚，这会加重经期的坠胀感。另外，睡眠不规律会削弱内源性内啡肽（一种天然的止痛神经递质）的分泌，使得你对疼痛的感觉更加敏感。",
  "menstrual_history": "13岁初潮，月经周期较为稳定，末次月经于经期第2天触发本次痛觉图谱。卵巢黄体期后雌孕激素急剧撤退，骨盆各组织正在经历一次轻微的炎性自我重塑与清理。",
  "clinical_diagnosis": "【骨盆状态评估】：交感交泰度增高、子宫平滑肌强烈收缩、盆腔局部微循环受阻。",
  "clinical_suggestions": "【骨盆空间复位释放术】：\\n1. 【构建性放松平躺】：平躺于柔软垫子上，双腿弯曲，双脚平放，将一个枕头垫在臀部下方（抬高约15cm），这可以利用重力让淤积在盆腔的血液迅速回流，降低内脏压迫感。\\n2. 【盆底肌意念沉降】：吸气时，想象你的吸气一直深入到会阴部，让盆底肌（像一张吊网）向外、向下微微放松，如同绽放的花朵，彻底释放因疼痛而习惯性缩紧的肌肉张力。持续做10分钟。",
  "analogy": "仿佛下腹深处有一条紧绷的麻绳被不断地拧紧，带着湿漉漉的冷意，生拉硬拽地牵扯着后腰的肌肉。",
  "work": "由于生理期突发剧烈的盆腔痉挛，导致体能状态严重下滑，今天需要居家远程办公或请假休整，以便通过热敷和静卧让身体平滑肌恢复正常状态。",
  "action": [
    "☑️ 将手掌合十迅速搓热，贴在她肚脐下方三寸（关元穴）进行轻柔的静止热敷，无需揉按，温热即可。",
    "☑️ 帮她关掉刺眼的顶灯，拉上窗帘，备好热水，提供一个不被打扰的绝对安静温和空间。"
  ],
  "selfCare": [
    "✨ 痛楚是真实的。允许自己今天成为一个‘没有产出’的人。躺下休息，是最高效的自愈方式。",
    "✨ 小口慢饮温水或无咖啡因的热果茶，温热刺激食道和胃部可以激活副交感神经，帮助平滑肌舒张。"
  ]
}}
"""
    else:
        # 医疗就诊协助模式：完全按照三甲医院病历标准，生成规范、客观、详实、字数饱满的病历
        sys_prompt = f"""
You are an expert clinical gynecological intake specialist in a Class-A tertiary hospital.
You will translate the user's painted pain parameters, anatomical locations, physical intensities, and complete medical background into a highly formal, precise, and professional gynecological case history.

【CRITICAL COMPLIANCE RULES】
1. NEVER use software terms like "brushes", "canvas", "vectors", "pain score 70" in the clinical section ("chief_complaint", "present_illness", "past_history", "menstrual_history"). Translate them into standard medical metrics (e.g., "Severe spasmodic dysmenorrhea, VAS score: 8/10").
2. Ensure you output standard medical terms. For example, translate 'cramping' to "子宫痉挛性痛", 'stabbing' to "放射性锐痛".
3. Write sufficient negative symptoms in "present_illness" to ensure a comprehensive clinical triage format.
4. Output MUST be a strictly formatted JSON.

【FEW-SHOT EXAMPLE (Medical Mode / ZH)】
{{
  "chief_complaint": "周期性下腹部痉挛性绞痛10年，加重伴腰骶部呈刀刮样撕裂痛2天。",
  "present_illness": "患者既往月经规律。10年前无明显诱因开始出现月经期下腹部痉挛性痛，偶向大腿内侧放射，VAS评分约4-5分，口服非甾体抗炎药可部分缓解。2天前月经行经第1天无明显诱因痛经急性发作，下腹绞痛程度显著呈进行性加剧，VAS评分达8分，疼痛性质呈持续性绞榨样，伴有腰骶部深层刀刮样撕裂感，自行热敷及口服布洛芬后无明显改善。患者伴有明显面色苍白、冷汗及虚脱感。无发热，无恶心呕吐，无肛门坠胀感，无异常阴道流血，大小便无特殊。起病以来，患者精神较差，食欲下降，睡眠受干扰，体重未见异常改变。",
  "past_history": "平素身体状况良好。既往患有轻度盆腔静脉淤血综合征，无高血压、糖尿病及心脏病史。手术史：3年前曾行腹腔镜下双侧卵巢巧克力囊肿剥除术，术后盆腔粘连风险较高。过敏史：否认青霉素及头孢类药物过敏史。生活习惯：因职业关系长期久坐（日均静态超8小时），作息规律，饮食偏生冷。",
  "menstrual_history": "月经初潮14岁，经期5-6天，周期28-30天（5-6/28-30天）。末次月经（LMP）：2026年3月1日。痛经史：有。生育史：G1P0，有过自然流产1次，未生育。",
  "clinical_diagnosis": "1. 继发性痛经（子宫内膜异位症、盆腔粘连可能）\\n2. 慢性盆腔痛",
  "clinical_suggestions": "【建议就诊时与医生讨论的要点】：\\n1. 鉴于患者有卵巢巧克力囊肿剥除手术史，就诊时请重点与医生讨论盆腔组织是否存在粘连，以及是否需要通过核磁共振（MRI）精准测定内膜异位病灶的活动度。\\n2. 明确患者既往有流产病史，需讨论黄体功能不足与内分泌波动是否在痛经中起到推波助澜的作用。\\n\\n🔬 【就诊检查须知与消除恐惧】：\\n1. 经腹部妇科超声检查：检查前1小时需饮水500-800ml，保持膀胱充盈。本项检查无侵入性、无任何物理创伤。\\n2. 消除您的检查耻感与恐惧：妇科专科检查是每位女性守护健康尊严的科学武器。常规内诊（双合诊）或经阴道超声，医生会使用远细于生理期棉条的无菌一次性超声探头，并涂抹充足的温热润滑剂。检查过程中，请您尝试通过深呼吸放松下腹及骨盆底肌肉，检查仅会产生短暂的异物感或轻微顶胀，不会造成剧烈刺痛。接诊医生会在封闭检查室与物理遮挡屏风后操作，对您的身体边界给予100%的安全和隐私保护。请放下顾虑，勇敢配合，科学定位病灶是摆脱长期经期折磨的唯一途径。",
  "analogy": "像是肚子里有一把冰冷的铁钳子，正用力夹住子宫死死拧绞，每拧一下，后腰就跟着一阵发木发胀，连呼吸都觉得被生生拽住。",
  "work": "因今天经期突发急性坠胀严重绞痛且无法站立，申请病假休整一天，特此交接工作。",
  "action": [
    "☑️ 准备一个温热的热水袋，帮她放置在下腹部或后腰处进行物理热敷理疗。",
    "☑️ 帮她倒一杯温热的饮用水，并准备好安全的镇痛药。",
    "☑️ 主动替她分担今日所有的繁杂家务，保持室内环境安静温和。"
  ],
  "selfCare": [
    "✨ 采用侧卧婴儿蜷缩式，膝盖之间夹枕头，放松紧绷的盆腔肌肉。",
    "✨ 尽量拉长呼吸，吸气4秒、平稳呼气8秒，能帮过度兴奋的盆底肌肉尽快放松下来。"
  ]
}}
"""

    # ─────────────────────────────────────────────
    # 用户真实特征注入（严禁胡乱编造，严格利用特征向量）
    # ─────────────────────────────────────────────
    user_prompt = f"""
【前端提交的真实特征向量与基础档案数据（绝对禁止在此范围外编造任何信息）】

- 当前运作模式：{app_mode} (请基于此模式输出对应的Few-Shot格式)
- 痛觉主导模式：{pt_dict.get(data.dominantPain, data.dominantPain)}
- 绘图总痛觉负荷（VAS/评分）：{data.painScore}/100
- 痛觉绘图定位：{pain_location_desc}
{vector_analysis}

【临床/生活方式采集档案】
- 既往已确诊诊断：{get_val_from_mb(mb, "diagnosed")}
- 外科手术史：{get_val_from_mb(mb, "surgicalHistory")}
- 药物过敏史：{get_val_from_mb(mb, "allergies")}
- 初潮年龄：{getattr(mb, 'menarcheAge', '未提供') if mb else '未提供'} 岁
- 月经周期规律性：{getattr(mb, 'cycleRegular', '未提供') if mb else '未提供'}
- 持续行经天数：{getattr(mb, 'periodDuration', '未提供') if mb else '未提供'} 天
- 末次月经第一天（LMP）：{getattr(mb, 'lastPeriod', '未提供') if mb else '未提供'}
- 伴随症状：{accompanying_desc}
- 生活作息习惯：{', '.join(getattr(mb, 'lifestyleArr', [])) if mb else '无'}

【文案偏好与语气风格】：{data.tonePreference}

请根据以上特征，**扩充字数并提供饱满的情理/机制细节**，直接输出一个严格符合规范的 JSON 对象（严禁有多余解释，字段与 Few-Shot 一致）：
"""

    model_name = config["model_quick"] if is_quick else config["model"]

    try:
        print(f"🤖 正在请求服务提供商: {config['display_name']} ({model_name})...")

        if LLM_PROVIDER == "vivo":
            url = f"{config['base_url']}/chat/completions"
            headers = {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": f"Bearer {api_key}",
            }
            params = {"request_id": str(uuid.uuid4())}
            payload = {
                "model": model_name,
                "messages": [
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.2, # 限制随机度
                "max_tokens": config["max_tokens"],
                "stream": False,
            }

            response = requests.post(
                url, headers=headers, params=params, json=payload, timeout=90
            )
            response.raise_for_status()
            response_data = response.json()
            raw_text = response_data["choices"][0]["message"]["content"]
        else:
            completion = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.2,
                response_format={"type": "json_object"},
            )
            raw_text = completion.choices[0].message.content

        # 清洗 Markdown 格式符号
        cleaned_text = re.sub(
            r"^```(?:json)?\s*", "", raw_text, flags=re.MULTILINE | re.IGNORECASE
        )
        cleaned_text = re.sub(r"```\s*$", "", cleaned_text, flags=re.MULTILINE).strip()

        start = cleaned_text.find("{")
        end = cleaned_text.rfind("}")
        if start != -1 and end != -1:
            cleaned_text = cleaned_text[start : end + 1]

        parsed_json = json.loads(cleaned_text, strict=False)
        print("✅ JSON 深度病理转译成功！")

        def get_safe_field(json_data, key, fallback_val):
            if not json_data or not isinstance(json_data, dict):
                return fallback_val
            val = json_data.get(key)
            if not val:
                return fallback_val
            if isinstance(val, list) and len(val) == 0:
                return fallback_val
            if isinstance(val, str) and not val.strip():
                return fallback_val
            return val

        # 基于模式自适应降级兜底方案
        fb = _fallback_response(lang, painkiller, app_mode)

        return {
            "status": "success",
            "language": lang,
            "appMode": app_mode,
            "chief_complaint": get_safe_field(parsed_json, "chief_complaint", fb["chief_complaint"]),
            "present_illness": get_safe_field(parsed_json, "present_illness", fb["present_illness"]),
            "past_history": get_safe_field(parsed_json, "past_history", fb["past_history"]),
            "menstrual_history": get_safe_field(parsed_json, "menstrual_history", fb["menstrual_history"]),
            "clinical_diagnosis": get_safe_field(parsed_json, "clinical_diagnosis", fb["clinical_diagnosis"]),
            "clinical_suggestions": get_safe_field(parsed_json, "clinical_suggestions", fb["clinical_suggestions"]),
            "analogy": get_safe_field(parsed_json, "analogy", fb["analogy"]),
            "work": get_safe_field(parsed_json, "work", fb["work"]),
            "action": get_safe_field(parsed_json, "action", fb["action"]),
            "selfCare": get_safe_field(parsed_json, "selfCare", fb["selfCare"]),
            "pain_location": pain_location_desc,
            "accompanying_symptoms": accompanying_desc,
            "risk_warning": risk_warning,
            "triage_advice": triage_advice if app_mode == "medical" else "居家自愈修整中",
            "exam_advice": exam_advice if app_mode == "medical" else None,
            "health_tips_link": health_tips_link,
        }

    except Exception as e:
        error_msg = str(e)
        print(f"❌ 后端调用链故障，进入安全降级沙箱。错误原因: {error_msg}")
        fallback = _fallback_response(lang, painkiller, app_mode)
        fallback.update({
            "is_fallback": True,
            "error_detail": error_msg,
            "pain_location": pain_location_desc,
            "accompanying_symptoms": accompanying_desc,
            "risk_warning": risk_warning,
            "triage_advice": triage_advice if app_mode == "medical" else "居家自愈修整中",
            "exam_advice": exam_advice if app_mode == "medical" else None,
            "health_tips_link": health_tips_link,
        })
        return fallback


def get_val_from_mb(
    mb: Optional[MedicalBackgroundModel], key: str, fallback: str = "未提供"
) -> str:
    if not mb:
        return fallback
    val = getattr(mb, key, "")
    if not val or val in ["none", "unchecked", "unknown"]:
        return fallback
    return str(val)


# ─────────────────────────────────────────────
# 降级沙箱数据（支持自适应自愈模式与医疗模式）
# ─────────────────────────────────────────────
def _fallback_response(lang: str, painkiller: str = "布洛芬", app_mode: str = "medical") -> dict:
    is_general = app_mode == "general"
    
    if lang == "en":
        if is_general:
            return {
                "status": "success",
                "language": "en",
                "chief_complaint": "Somatic Reflection: Today the pelvis feels highly compressed with waves of tension.",
                "present_illness": "This sensory pain corresponds to prostaglandin fluctuations causing acute uterine smooth muscle contractions. Fatigue can sensitize the nervous system, exacerbating discomfort.",
                "past_history": "Sedentary lifestyle habits might hinder deep pelvic circulation, leading to temporary stasis and heaviness.",
                "menstrual_history": "Cycle is documented, currently in active menstruation.",
                "clinical_diagnosis": "Somatic State: Pelvic myofascial contraction and fatigue overload.",
                "clinical_suggestions": "Holistic Pelvic Restoration:\n1. Constructive Rest: Lie down with knees bent and elevated on a pillow to release pressure.\n2. Diaphragmatic breathing to relax pelvic floor muscles.",
                "analogy": "Like a heavy stone sinking deep into your pelvic floor, radiating stiffness downward.",
                "work": "Hi Manager, I have severe menstrual discomfort today and am working from home to manage recovery.",
                "action": [
                    "☑️ Help prepare a warm drink (herbal tea) to boost visceral relaxation.",
                    "☑️ Dim the lights and allow quiet alone space for rest."
                ],
                "selfCare": [
                    "✨ Slow breathing down; pain decreases as tension releases.",
                    "✨ Focus on local warmth on lower belly."
                ]
            }
        else:
            return {
                "status": "success",
                "language": "en",
                "chief_complaint": "Chief complaint: Severe lower abdominal cramping for 2 days",
                "present_illness": "Patient reports intense spasmodic pain in lower abdomen, aggravated during menstruation.",
                "past_history": "No significant past medical history reported.",
                "menstrual_history": "Menstrual history not provided.",
                "clinical_diagnosis": "Primary dysmenorrhea (suspected)",
                "clinical_suggestions": "Outpatient evaluation recommended. Schedule pelvic ultrasound.",
                "analogy": "Imagine your lower abdomen being twisted into a tight, relentless knot.",
                "work": "Hi Manager, I have a sudden severe medical issue today and can't get out of bed. I need to take a sick leave.",
                "action": [
                    f"☑️ Prepare a heat pad for her lower back or abdomen.",
                    f"☑️ Bring warm water and her safe painkiller ({painkiller}).",
                ],
                "selfCare": [
                    "✨ Try fetal position with a pillow between your knees.",
                    "✨ Practice slow, deep breathing to calm your nervous system."
                ]
            }
    else:
        if is_general:
            return {
                "status": "success",
                "language": "zh",
                "chief_complaint": "【身体感知记录】小腹有隐约的痉挛酸胀，伴有微弱的腰部坠沉感。",
                "present_illness": "由于月经期激素水平的转换，平滑肌进行自主收缩，可能会伴有暂时性的盆腔肌筋膜紧张。静态久坐会减缓小腹局部血流，从而导致轻微坠胀。放松心情与温热理疗有助于打破‘紧张-疼痛’的应激反射圈。",
                "past_history": "平素工作或学习中久坐时间偏长。建议在发作间歇增加轻度骨盆延展拉伸，改善下肢循环。",
                "menstrual_history": "13岁初潮，周期规律。目前处于经期自我净化阶段。",
                "clinical_diagnosis": "【骨盆状态评估】：平滑肌自主收缩期、盆底筋膜轻度紧张。",
                "clinical_suggestions": "【骨盆空间释放复位术】：\\n1. 【双膝护胸式】：侧卧并将双腿膝盖抱向胸口，使后腰微弓，这可以拉伸并放松紧绷的后腰骶肌群。\\n2. 【意念身体扫描】：将双手放在小腹，随着每次呼气，意念引导小腹深处的平滑肌向四周‘舒展、松开’。",
                "analogy": "像是一个小气球在肚子深处慢慢充气，微微发胀、发酸，牵扯着后腰。",
                "work": "因今天经期小腹酸胀明显，无法保持高强度专注，特申请居家办公半天，通过热敷和规律饮水调整身体状态。",
                "action": [
                    "☑️ 帮她准备一个温热的贴身热水袋或暖贴，贴在肚脐以下。",
                    "☑️ 主动替她处理日常烦杂的家务，给予无声的心灵支持与陪伴。"
                ],
                "selfCare": [
                    "✨ 平静的深吸气、长呼气是天然的镇痛良药。允许自己今天安静地躺着休整。",
                    "✨ 避开冷饮，小口饮用温热红枣茶或红糖水，舒缓腹部的紧张感。"
                ]
            }
        else:
            return {
                "status": "success",
                "language": "zh",
                "chief_complaint": "主诉：周期性痛经发作伴下腹部绞痛1天。",
                "present_illness": "患者自述既往月经规律。于行经第2天，因前列腺素水平升高刺激出现下腹持续痉挛绞痛，阵发加剧，伴腰骶部酸沉。自行热敷改善微弱。",
                "past_history": "无特殊既往病史、无明确手术史。",
                "menstrual_history": "月经初潮13岁，周期规律，LMP未填。",
                "clinical_diagnosis": "原发性痛经或盆腔器质性病变筛查",
                "clinical_suggestions": "建议妇科常规超声探查以排除内异症。妇检为常规无创检查，过程医生会使用无菌且充分润滑的软细探头，跟随深呼吸放松肌肉可显著消解异物感，请放心配合就诊。",
                "analogy": "像有人把你的子宫深处拧成一股麻绳，再用粗糙的砂纸反复拉磨打磨。",
                "work": "因今天经期突发急性坠胀严重绞痛且无法站立，申请病假休整一天，特此交接工作。",
                "action": [
                    f"☑️ 准备一个温热的热水袋，帮她放置在下腹部或后腰处进行物理热敷理疗。",
                    f"☑️ 帮她倒一杯温热的饮用水，并准备好安全的止痛药{painkiller}。",
                ],
                "selfCare": [
                    "✨ 采用侧卧婴儿蜷缩式，膝盖之间夹枕头，放松紧绷的盆腔肌肉。",
                    "✨ 尽量拉长呼吸，吸气4秒、平稳呼气8秒，能帮过度兴奋的盆底肌肉尽快放松下来。"
                ]
            }


# ─────────────────────────────────────────────
# /api/refine 等其他 API 保持原样 ...
# ─────────────────────────────────────────────
@app.post("/api/refine")
async def refine_content(data: dict):
    field = data.get("field", "")
    current_text = data.get("currentText", "")
    user_feedback = data.get("userFeedback", "")
    lang = data.get("targetLanguage", "zh")

    if not current_text or not user_feedback:
        return {"refined": current_text}

    request_id = str(uuid.uuid4())

    if lang == "en":
        sys_prompt = "You are an expert clinical copy editor. Rewrite the medical text based on user feedback. Output ONLY the refined text. No explanations."
        user_prompt = f"Original:\n{current_text}\n\nFeedback: {user_feedback}\n\nRewrite directly:"
    else:
        sys_prompt = "你是严谨的妇科医学病历润色助手。根据患者或用户的修改意见对原文文本进行优化。只需输出修改后的最终文本，绝对不要包含任何多余解释！"
        user_prompt = f"原文：\n{current_text}\n\n修改意见：\n{user_feedback}\n\n直接输出修改结果："

    try:
        if LLM_PROVIDER == "vivo":
            url = f"{config['base_url']}/chat/completions"
            headers = {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": f"Bearer {api_key}",
            }
            params = {"request_id": request_id}
            payload = {
                "model": config["model_refine"],
                "messages": [
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.2,
                "max_tokens": 1024,
                "stream": False,
            }

            response = requests.post(
                url, headers=headers, params=params, json=payload, timeout=30
            )
            response.raise_for_status()
            response_data = response.json()
            refined = response_data["choices"][0]["message"]["content"].strip()
        else:
            completion = client.chat.completions.create(
                model=config["model_refine"],
                messages=[
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.2,
            )
            refined = completion.choices[0].message.content.strip()

        refined = re.sub(r"^```[\s\S]*?\n", "", refined)
        refined = re.sub(r"```$", "", refined).strip()
        return {"refined": refined, "language": lang}
    except Exception as e:
        print(f"🚨 优化错误: {e}")
        return {"refined": current_text, "language": lang}


@app.get("/api/posts")
async def get_posts():
    return {"posts": load_posts()}

@app.post("/api/posts")
async def create_post(data: dict):
    posts = load_posts()
    new_post = {
        "id": str(datetime.now().timestamp()),
        "text": data.get("text", ""),
        "img": data.get("img", ""),
        "painTags": data.get("painTags", []),
        "group": data.get("group", "family"),
        "analogy": data.get("analogy", ""),
        "lang": data.get("lang", "zh"),
        "likes": 0,
        "hugs": 0,
        "createdAt": datetime.now().isoformat(),
    }
    posts.insert(0, new_post)
    save_posts(posts)
    return {"status": "success", "post": new_post}


@app.get("/")
def read_root():
    return {
        "message": "PainScape Backend running (Vivo BlueLM SDK Integrated)",
        "model": config["display_name"],
    }