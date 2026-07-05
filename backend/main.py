# main.py
# ═══════════════════════════════════════════════════════════
# PainScape 后端服务网关 (防错避责红线、体感共鸣与周期指南终极融合版)
# ═══════════════════════════════════════════════════════════

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

client = OpenAI(api_key=api_key or "EMPTY", base_url=config["base_url"])

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# Pydantic 宽松数据校验模型（防止 422 异常阻断）
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
    appMode: Optional[str] = "medical"
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

PAIN_MAP = {
    "zh": {
        "twist": "下腹部痉挛性收缩绞痛",
        "pierce": "局部阵发性放射刺痛",
        "heavy": "下腹坠胀重压钝痛",
        "wave": "弥漫酸胀痛",
        "scrape": "撕裂样剥脱拉扯痛"
      },
    "en": {
        "twist": "spasmodic lower abdominal cramping",
        "pierce": "localized radiating sharp stabbing pain",
        "heavy": "lower abdominal dragging heaviness",
        "wave": "diffuse lower pelvic bloating",
        "scrape": "tearing and localized scraping tension"
    }
}

# ─────────────────────────────────────────────
# 🛡️ 临床级背景格式化安全处理器（前置拦截幻觉）
# ─────────────────────────────────────────────
def get_val_from_mb(mb: Optional[MedicalBackgroundModel], key: str, fallback: str = "未详述") -> str:
    if not mb:
        return fallback
    val = getattr(mb, key, "")
    if not val or val in ["none", "unchecked", "unknown", ""]:
        return fallback
    return str(val)

def get_surgical_desc(mb: Optional[MedicalBackgroundModel], lang: str) -> str:
    surg_val = getattr(mb, 'surgicalHistory', '') if mb else ''
    if lang == "zh":
        surgical_map = {
            "none": "无明确大型外科手术史",
            "abdominal": "有腹部手术史（如阑尾切除术等）",
            "pelvic": "有盆腔手术史（如卵巢囊肿切除术等）",
            "other": "有其他手术史"
        }
        return surgical_map.get(str(surg_val).lower(), "无明确大型外科手术史")
    else:
        surgical_map = {
            "none": "No significant surgical history",
            "abdominal": "History of abdominal surgery",
            "pelvic": "History of pelvic surgery",
            "other": "History of other surgery"
        }
        return surgical_map.get(str(surg_val).lower(), "No significant surgical history")

def get_reproductive_desc(mb: Optional[MedicalBackgroundModel], lang: str) -> str:
    repo_list = getattr(mb, 'reproductiveHistoryArr', []) if mb else []
    if lang == "zh":
        repo_map = {
            "nulliparous": "未婚未育（无怀孕史，无生育史，G0P0）",
            "pregnant": "有妊娠史（孕中未生产）",
            "parous": "有分娩史（已生育）",
            "spontaneousAbortion": "既往自然流产史",
            "inducedAbortion": "既往人工/药物流产史",
            "multiple": "多次分娩史"
        }
        desc_list = [repo_map.get(str(r), str(r)) for r in repo_list if r]
        return "、".join(desc_list) if desc_list else "未婚未育（G0P0，无孕产史）"
    else:
        repo_map = {
            "nulliparous": "Nulliparous (G0P0, no pregnancy or birth history)",
            "pregnant": "Pregnant (currently pregnant, not yet delivered)",
            "parous": "Parous (has given birth)",
            "spontaneousAbortion": "History of spontaneous abortion",
            "inducedAbortion": "History of induced abortion",
            "multiple": "History of multiple births"
        }
        desc_list = [repo_map.get(str(r), str(r)) for r in repo_list if r]
        return ", ".join(desc_list) if desc_list else "Nulliparous (G0P0, no pregnancy or birth history)"

def get_cycle_regular_desc(mb: Optional[MedicalBackgroundModel], lang: str) -> str:
    val = getattr(mb, 'cycleRegular', '') if mb else ''
    if lang == "zh":
        reg_map = {
            "regular": "规律（周期稳定）",
            "irregular": "不规律（周期波动大）",
            "unsure": "不太确定"
        }
        return reg_map.get(str(val).lower(), "未详述")
    else:
        reg_map = {
            "regular": "Regular",
            "irregular": "Irregular",
            "unsure": "Unsure"
        }
        return reg_map.get(str(val).lower(), "Unspecified")

def get_period_duration_desc(mb: Optional[MedicalBackgroundModel], lang: str) -> str:
    val = getattr(mb, 'periodDuration', '') if mb else ''
    if not val or str(val).lower() in ["none", "unchecked", "unknown", ""]:
        return "未详述" if lang == "zh" else "Unspecified"
    if str(val) == "over7":
        return "超过7天" if lang == "zh" else "Over 7 days"
    return f"{val}天" if lang == "zh" else f"{val} days"

def build_pain_location_desc(spatial_map: Optional[SpatialMapModel], lang: str) -> str:
    if not spatial_map:
        return "下腹部" if lang == "zh" else "lower pelvis"
    parts = []
    abd = getattr(spatial_map, 'abdomen', 0.0) or 0.0
    lb = getattr(spatial_map, 'lowerBack', 0.0) or 0.0
    if abd > 0.1:
        parts.append(f"下腹部({int(abd*100)}%)" if lang == "zh" else f"Abdomen ({int(abd*100)}%)")
    if lb > 0.1:
        parts.append(f"腰骶部({int(lb*100)}%)" if lang == "zh" else f"Lower Back ({int(lb*100)}%)")
    return "、".join(parts) if parts else ("下腹部" if lang == "zh" else "lower pelvis")

def build_risk_warning(mb: Optional[MedicalBackgroundModel], lang: str) -> str:
    if not mb:
        return "目前未见特异性药物过敏风险提示" if lang == "zh" else "No specific medication risks"
    allergy = getattr(mb, "allergies", "") or ""
    if "ibuprofen" in str(allergy).lower():
        return "⚠️ 明确非甾体抗炎药（NSAIDs/布洛芬）过敏史。请勿推荐处方布洛芬，建议遵医嘱替换为对乙酰氨基酚。" if lang == "zh" else "⚠️ Documented Ibuprofen (NSAIDs) allergy. Avoid prescribing Ibuprofen; consider Acetaminophen."
    return "无已知药物过敏" if lang == "zh" else "No known drug allergies"

def build_triage_advice(pain_score: int, symptoms: Optional[List[str]], lang: str) -> str:
    s_list = symptoms or []
    if pain_score > 70 or any(s in ["呕吐", "晕倒", "faint", "vomit"] for s in s_list):
        return "🏥 建议急门诊评估：伴随自主神经反射受损（面色苍白/冷汗），请尽快前往急诊排查盆腔急腹症。" if lang == "zh" else "🏥 Urgent Gynecological Visit Recommended."
    return "🏠 居家自愈观察" if lang == "zh" else "🏠 Home Self-Care"

def build_exam_advice(mb: Optional[MedicalBackgroundModel], lang: str) -> Dict:
    exam = {
        "name": "妇科盆腔超声检查（彩色多普勒超声）" if lang == "zh" else "Pelvic Color Doppler Ultrasound",
        "preparation": "经阴道彩超需在检查前排空小便（无性生活史者禁用）；经腹部彩超需提前憋尿，可在检查前1小时内饮水500-800ml。" if lang == "zh" else "Empty bladder for transvaginal; full bladder for abdominal.",
        "note": "💡 临床首选无创初筛方案，具体检查组合需由接诊医生评估决定。",
        "alternative": ""
    }
    return exam

def translate_vectors_to_clinical(data: PainData, lang: str) -> str:
    ip = data.intensityProfile or IntensityProfileModel()
    pressure_val = ip.avgPressure or 0.5
    speed_val = ip.avgSpeed or 5.0
    
    depth = "深层内脏痛（带有一种深沉、缓慢且推不开的压榨质感）" if pressure_val > 0.6 else "浅表外周感觉敏化（带有一过性、游走性的局部刺痒）"
    speed_desc = "发作呈高度阵发突发性，极易引起全身防御性肌肉紧绷" if speed_val > 12.0 else "呈慢性低频潮汐式波动，具有较强的痛觉物理惰性"
    return f"【画笔物理轨迹分析】：绘图重压强度（{pressure_val:.2f}）指向{depth}；绘图游走速度（{speed_val:.1f}）指向{speed_desc}。"

def get_color_somatic_meaning(color: Optional[str], lang: str) -> str:
    color_key = str(color or "crimson").lower()
    if lang == "zh":
        meanings = {
            "crimson": "有一种热热的、胀胀的涌动感，与体内经血的流注直接关联。这在生理上对应盆腔局部小血管高度扩张、主动充血引起的物理胀满感与搏动张力。",
            "dark": "一种闷闷的、抑郁的坠落不适感。痛楚中伴随着心下一沉的严重无力与深度疲惫，小腹局部痛感深重却又发麻，仿佛那块组织失去了原有的代谢温度与生命活性。",
            "blue": "伴随明显的寒冷、眩晕以及冰凉感。四肢末梢逐渐发凉，小腹无论如何也无法暖热。感觉有一种不属于自己身体的、异质的冷缩力量在干扰盆腔，在生理上对应着重度局部缺血、血管骤紧以及机体失温应激。",
            "purple": "一种难以形容的黏滞性酸楚与不适，非尖锐剧痛但绵延不绝。伴随全身酸胀、绵软无力，直击内心，具有深层盆腔神经敏化特征，极易引发想哭、情绪崩溃等交感神经高度脆弱状态。"
        }
    else:
        meanings = {
            "crimson": "A warm, surging, and bloated sensation, directly associated with active blood flow. Physiologically corresponds to active pelvic congestion, hyper-perfusion, and throbbing vascular tension.",
            "dark": "A heavy, depressed, and sinking discomfort. Accompanied by profound weakness and deep fatigue, where the painful area feels numb, stagnant, and temporarily lacks vital metabolic temperature.",
            "blue": "Chills, vertigo, and a freezing sensation. Extremities cool down and the abdomen cannot be warmed, feeling as if an alien, non-biological freezing force is interfering with the pelvis. Physiologically corresponds to acute localized ischemia and severe vascular constriction.",
            "purple": "An indescribable, faint yet persistent ache; not a sharp peak pain, but a deep, sticky discomfort accompanied by profound weakness, exhaustion, and intense emotional vulnerability (a weeping state, highly linked to neuropathic pelvic sensitivities)."
        }
    return meanings.get(color_key, meanings["crimson"])

# ═══════════════════════════════════════════════════════════
# 主力 POST 生成接口（完美融合安全性与体感指南）
# ═══════════════════════════════════════════════════════════
@app.post("/api/generate")
async def generate_pain_report(data: PainData):
    try:
        lang = str(data.targetLanguage or "zh")
        app_mode = str(data.appMode or "medical").lower()
        mb = data.medicalBackground

        pt_dict = PAIN_MAP.get(lang, PAIN_MAP["zh"])
        vector_analysis = translate_vectors_to_clinical(data, lang)

        # 1. 止痛药过敏前置 Python 匹配
        raw_allergies = ""
        if mb:
            raw_allergies = f"{getattr(mb, 'allergies', '')} {getattr(mb, 'otherAllergies', '')}"
        allergy_text = raw_allergies.lower()
        allergy_list = ["布洛芬", "阿司匹林", "双氯芬酸", "酮洛芬", "萘普生", "ibuprofen", "aspirin", "diclofenac", "naproxen", "nsaids"]
        has_nsaid_allergy = any(term in allergy_text for term in allergy_list)

        forbidden_drugs = "布洛芬 (Ibuprofen)、阿司匹林 (Aspirin)、双氯芬酸钠等所有非甾体抗炎药(NSAIDs)" if has_nsaid_allergy else "无"
        safe_recommendation = "对乙酰氨基酚 (Acetaminophen)" if has_nsaid_allergy else "布洛芬 (Ibuprofen) 或 萘普生 (Naproxen)"
        
        if lang == "en":
            drug_safety_instruction = f"""
[CRITICAL DRUG SAFETY CONSTRAINT]:
- The patient HAS an allergy to NSAIDs/Ibuprofen: {has_nsaid_allergy}
- Recommended painkiller: {safe_recommendation}
- STRICTLY FORBIDDEN painkillers (DO NOT suggest): {forbidden_drugs}
"""
        else:
            drug_safety_instruction = f"""
【用药安全红线硬约束】：
- 检测到患者对布洛芬/NSAIDs类药物过敏：{"是（已激活红线）" if has_nsaid_allergy else "否"}
- 允许推荐的口服止痛药：{safe_recommendation}
- 绝对禁止推荐/出现的止痛药：{forbidden_drugs}
"""

        # 2. 生理周期阶段自动判定定位
        cycle_day_str = str(data.cycleDay or "").lower()
        active_phase_zh = "月经期 (Day 1-7)"
        active_phase_en = "Menstrual Phase (Day 1-7)"
        
        if any(x in cycle_day_str for x in ["前", "pre"]):
            active_phase_zh = "黄体期 (Day 22-28)"
            active_phase_en = "Luteal Phase (Day 22-28)"
        elif any(x in cycle_day_str for x in ["后", "after"]):
            active_phase_zh = "卵泡期 (Day 8-14)"
            active_phase_en = "Follicular Phase (Day 8-14)"
        elif any(x in cycle_day_str for x in ["排卵", "ovulat"]):
            active_phase_zh = "排卵期 (Day 15-21)"
            active_phase_en = "Ovulation Phase (Day 15-21)"
            
        active_phase = active_phase_zh if lang == "zh" else active_phase_en

        # 3. 解析与提取真实的健康背景（杜绝抄写范例、无中生有）
        pain_location_desc = build_pain_location_desc(data.spatialMap, lang)
        accompanying_symptoms = data.accompanyingSymptoms or []
        accompanying_desc = "、".join(accompanying_symptoms) if accompanying_symptoms else "未诉其余异常伴随指征"
        
        diagnosed_history = "无明确妇科疾病确诊史"
        surgical_history = "无盆腔及腹部手术史"
        obstetric_history = "未生育"
        family_history = "个人史与家族史详见背景采集"
        age_cohort = "成年女性"
        
        if mb:
            if getattr(mb, "age", "") and getattr(mb, "age") not in ["", "none"]:
                age_cohort = f"年龄处于 {getattr(mb, 'age')} 阶段"
            
            if getattr(mb, "diagnosed", "") and getattr(mb, "diagnosed") not in ["none", "unchecked", ""]:
                diagnosed_history = f"曾确诊患有 {getattr(mb, 'diagnosed')}"
                if getattr(mb, "otherDiagnosis", ""):
                    diagnosed_history += f"、{getattr(mb, 'otherDiagnosis')}"
            
            if getattr(mb, "surgicalHistory", "") and getattr(mb, "surgicalHistory") not in ["none", ""]:
                surg_map = {"abdominal": "腹部手术史", "pelvic": "盆腔手术史", "other": "其他手术史"}
                surgical_history = surg_map.get(getattr(mb, "surgicalHistory"), "有手术史")

            reprod_arr = getattr(mb, "reproductiveHistoryArr", []) or []
            if reprod_arr:
                reprod_map = {
                    "nulliparous": "未生育", "pregnant": "已孕未生产", "parous": "已生育",
                    "spontaneousAbortion": "自然流产史", "inducedAbortion": "人工终止妊娠/人流史"
                }
                obstetric_history = "，".join([reprod_map.get(x, x) for x in reprod_arr])

            fam_arr = getattr(mb, "familyHistoryArr", []) or []
            if fam_arr and "none" not in fam_arr:
                fam_map = {"mother": "母亲有痛经史", "sister": "姐妹有痛经史", "unknown": "家族史不详"}
                family_history = "，".join([fam_map.get(x, x) for x in fam_arr])

        surg_desc = get_surgical_desc(mb, lang)
        repo_desc = get_reproductive_desc(mb, lang)
        cycle_reg_desc = get_cycle_regular_desc(mb, lang)
        period_dur_desc = get_period_duration_desc(mb, lang)

        menarche_val = get_val_from_mb(mb, 'menarcheAge', '未详述')
        menarche_desc = f"{menarche_val} 岁" if menarche_val != "未详述" else "未详述"

        # ─────────────────────────────────────────────
        # 🏥 【 System Prompt】：临床避责与防幻觉最高约束
        # ─────────────────────────────────────────────
        if app_mode == "medical":
            sys_prompt = f"""
You are an expert clinical gynecological intake specialist. You write gynecological admission records (住院/入院记录) for medical consultations.
Your output must be strictly written in the tone, style, and structure of a real Class-A tertiary hospital medical record (参考三甲医院妇科病历书写规范).

【病历书写硬性合规防错指令】
1. 【严禁生造词与软件工具词汇】！病历正文（chief_complaint, present_illness, past_history, menstrual_history, clinical_diagnosis）中【绝对不允许】出现“画笔”、“画布行为”、“分值评分”、“痛觉矢量图谱”、“绘图定位”、“前端”等任何软件专有名词。
   - 必须将其翻译为标准医学词汇。例如：将“重按/大面积重压画笔”翻译为“持续性下腹重度胀痛”；将“锯齿/刺钻画笔”翻译为“局部阵发性痉挛性绞痛”。
2. 【严格写入阴性症状进行鉴别诊断】：仿照参考病历，在‘present_illness’（现病史）中必须清晰写入鉴别指标（如：“无肛门坠胀感，无尿频尿急...起病以来精神可，二便正常，体重无明显变化”）。如果输入未提及，必须格式化表述为“未诉其余伴随异常指征”，严禁臆测。
3. 【病史公式化对齐】：月经史（menstrual_history）必须使用标准月经史公式格式：初潮年龄 (经期天数/周期天数) LMP: yyyy-mm-dd 格式。并标明末次月经（LMP）。
4. 【大模型转译硬性指令 - 严禁偷懒缩水】
   - 【患者基础信息重构 (past_history)】：将患者真实的年龄段、身高体重、既往确诊史、手术史、过敏药物以及生活习惯完美融合。
   - 【痛感病生理机制分析 (present_illness)】：不要一句话概括！请深度剖析患者真实的“痛觉质感特征”和“绘图矢量”，分析前列腺素水平波动、子宫平滑肌痉挛、盆腔充血、内脏神经会聚反射导致的内在医学逻辑。
   - 【就诊检查须知与消除恐惧 (clinical_suggestions)】：请用极为温柔、中立、尊重身体边界的科学语言，向患者详细解释妇科阴道检查和医生操作的专业规范，告诉她探头的规格（非常细小）和润滑、如何通过呼吸配合放松肌肉以彻底打消她的检查恐惧与耻感，给予她强大的心理支持，字数不得少于300字。
5. 【绝对禁止无中生有与主观揣测】：
   - 绝对禁止编造任何用户未提供的信息！
   - 如果年龄未提供：绝对禁止写“患者X岁”，可写“成年女性”。
   - 如果家族史为“无”或未提供：绝对禁止在病历正文中出现“母亲/姐妹有痛经史”！
   - 字段为空或“未提供”：完全跳过，病历中绝不要提及。
   - 严禁抄袭 Few-Shot 范例：范例中提到的具体既往手术（如剖宫产2次、G10P2等）仅供排版和语气参考，绝对不能代入到当前患者病历中！
6. 【末次月经与当前发作时序红线】：
   - LMP（末次月经）是上一次行经的第一天，属于过去时（通常在20-30+天前）。
   - 当前的痛经是“本次行经/临近行经”开始的急性发作，绝不能写成“自末次月经起下腹痛至今”，必须准确纠正时序。
7. 【临床建议模糊化/避责红线】：
   - 所有的临床判断、筛查建议、用药和自愈建议（除绝对止痛药过敏限制外），必须使用“可能”、“可以考虑”、“建议排查”、“待排”、“评估”、“探讨”等非确定性、概率性的缓和词汇，规避医疗纠纷法律风险。
8. 【就诊检查建议与准备红线】：
   - 必须推荐符合患者年龄及性生活史的物理排查。若患者未成年或无性生活史，绝对禁止推荐“经阴道彩超”！必须改为推荐“经腹部盆腔超声”，并清晰注明其需提前憋尿充盈膀胱的检查准备。

【月经周期阶段自愈参考指南（必须依据当前判定生理阶段融入 selfCare 建议）】
- 月经期 (Day 1-7): 重点在于休息、充足保暖、避免剧烈运动。自愈推荐：局部热敷、恢复性抱膝拉伸、温热补铁补血饮品。
- 卵泡期 (Day 8-14): 身体与代谢能量回升，适合开展高效高强度工作和高专注度脑力活动。
- 排卵期 (Day 15-21): 社交与日常精力的高能量顶峰阶段，后期能量逐渐平缓下降。
- 黄体期 (Day 22-28): PMS（经前综合征）高发时段，情绪易波动或伴盆腔坠沉。自愈推荐：轻柔拉伸、散步、限制高糖高碳欲望。

【核心原则：具身共鸣 vs 术语堆砌】
1. 你的分析要让用户觉得“你精准抓住了我的体感”。不要只说“患者痛觉评分较高”，要说“你绘制的轨迹反映出一种深沉、缓慢的重压，这说明你的子宫深处在经期正承受着一种‘推不开、化不掉’的持续性坠胀”。
2. 【🚫 语言红线】：严禁使用“恐怖化”词汇！绝对禁止使用“剧烈撕裂”、“摧毁性剧痛”、“身体像被绞碎”等易引发患者恐慌的极端表达。
   - 替代方案：将“撕裂痛”描述为“明显的组织张力拉扯与微创面紧绷感”；将“绞痛”描述为“平滑肌的周期性收缩与阵发性挤压负荷”。
3. 你的任务是平衡“专业性”与“共鸣感”。"present_illness"部分要像一位耐心的医生在解读化验单一样解释她的痛，而不是冷冰冰地列术语。

【输出各字段硬性指标要求】
- "chief_complaint": 极简，核心体感+部位+时间，字数严格控制在 20 字以内。
- "clinical_suggestions": 重点在“心理防护”。
- "analogy": 极具画面感的通感比喻，必须与画笔痛感性质（如酸胀、痉挛绞榨等）高度吻合。
- "work": 高度接地气的假条文本。字数必须严格限制在 40 字以内（包含标点符号），确保用户能直接一键复制到微信/Slack。
- "selfCare": 提供 4-5 条温和且简单的自愈建议。必须包含至少一个特定的疼痛缓解姿势（如“侧卧婴儿式蜷缩，双膝间夹枕头”），必须简单可行，且必须包含一句旨在消除经期病耻感或请假内疚心理的共情安慰话语。
- "action": 提供 3-4 条具体的伴侣/照护者实操动作，必须与患者当前主导痛感类型强关联。严禁推荐任何过敏药物。

【纯 JSON schema 格式输出】
{{
  "chief_complaint": "主诉",
  "present_illness": "现病史（学术规范，深度剖析病生理，字数饱满）",
  "past_history": "既往史、个人史及家族史风险（严格基于输入，无则写无，严禁捏造）",
  "menstrual_history": "月经史与婚育史（标准公式，严禁套用范例）",
  "clinical_diagnosis": "临床重点筛查及鉴别诊断方向（使用待排、建议筛查语气）",
  "clinical_suggestions": "复查建议与温柔妇检防护引导（字数饱满，不少于300字）",
  "analogy": "痛觉具身通感隐喻（去恐慌化，高共鸣度）",
  "work": "请假或社交推约文本（严格控制在40字以内）",
  "action": ["实操建议1", "实操建议2", "实操建议3"],
  "selfCare": ["温和自愈建议1", "温和自愈建议2", "消除病耻感安慰"]
}}
"""
        else:
            # 🎨 日常自愈模式 System Prompt
            sys_prompt = f"""
You are a warm, empathetic period self-care companion and somatic guide (经期身体自愈与通感疗愈导师).
Your output must be comforting, highly gentle, and focused on self-healing, emotional breathing, and companion guidance.
The terminology must be easy to read, eliminating any clinical distress or complex medical nomenclature.

【🚫 语言红线与自愈硬约束】
1. 绝对禁止使用任何令人焦虑的临床术语。将临床诊断替换为“骨盆力学与交感放松状态评估”。
2. 严禁使用极端、恐怖化字眼，采用“牵拉、温冷、牵坠、呼吸阻抗”等触觉词。
3. "selfCare" 必须包含至少一个特定的疼痛缓解姿势（如双膝微屈抱枕），简单易做，且必须有一句消除病耻感、允许自己今天休息的温暖安慰。
4. "work" 部分必须是严格限制在 40 字以内的社交推推辞/推约短文本。
5. 提示：任何自愈方案若引起额外不适，请立即停止。
"""

        # 3. 极严苛的 User Prompt
        user_prompt = f"""
【🚨 真实当前患者数据输入 - 绝对禁区！只能使用以下提供的数据进行处理】

1. 基础生物及痛觉矢量特征：
   - 当前患者年龄段：{age_cohort}
   - 主导痛感质感：{pt_dict.get(data.dominantPain, data.dominantPain)}
   - 累积痛觉负荷（评分）：{data.painScore}/100
   - 痛感空间定位描述：{pain_location_desc}
   - 判定当前生理阶段：{active_phase} (请基于此阶段，融合系统提示词中的“月经周期阶段参考指南”定制你的 selfCare 运动、自愈与生活饮食建议)
   - 伴随躯体症状：{accompanying_desc}
   - 前端绘图物理动力学特征推演：{vector_analysis}
   - 情绪与血管微循环色彩：{get_color_somatic_meaning(data.colorPalette, lang)}

2. 导入的患者真实健康背景（若显示为“无/未提供”，相关病历部分必须输出为无，严禁抄袭 Few-Shot 范例！）：
   - 身高/体重：{f"{getattr(mb, 'height', '')}cm / {getattr(mb, 'weight', '')}kg" if mb and getattr(mb, 'height', '') else "未提供"}
   - 既往诊断病史：{diagnosed_history}
   - 外科手术史：{surg_desc}
   - 生育/孕产史：{repo_desc} (警告：若显示为“未生育”，月经孕产史中绝不能出现 G10P2 或剖宫产2次)
   - 家族遗传/痛经史：{family_history}
   - 初潮年龄：{menarche_desc}
   - 月经周期规律性：{cycle_reg_desc}
   - 经期天数：{period_dur_desc}
   - 末次月经第一天（LMP）：{get_val_from_mb(mb, "lastPeriod", "未提供")}
   - 个人生活作息背景：{', '.join(getattr(mb, 'lifestyleArr', [])) if mb and getattr(mb, 'lifestyleArr', None) else '无'}

3. 语气及文案偏好：
   - 沟通偏好语调：{data.tonePreference}

{drug_safety_instruction}

请仅基于上述真实数据，直接输出一个纯 JSON 对象（不要有 markdown 包装）：
"""

        model_name = config["model_quick"] if data.isQuickLog else config["model"]

        print(f"🤖 正在请求服务提供商: {config['display_name']} ({model_name})...")

        # 4. 执行零温调用（彻底锁死大模型随机性，消灭套模模板幻觉）
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
                "temperature": 0.0,  # 🌟 零温
                "max_tokens": config["max_tokens"],
                "stream": False,
            }
            response = requests.post(url, headers=headers, params=params, json=payload, timeout=90)
            response.raise_for_status()
            raw_text = response.json()["choices"][0]["message"]["content"]
        else:
            completion = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.0,  # 🌟 零温
                response_format={"type": "json_object"},
            )
            raw_text = completion.choices[0].message.content

        # 5. 安全清理 Markdown
        cleaned_text = re.sub(r"^```(?:json)?\s*", "", raw_text, flags=re.MULTILINE | re.IGNORECASE)
        cleaned_text = re.sub(r"```\s*$", "", cleaned_text, flags=re.MULTILINE).strip()
        start, end = cleaned_text.find("{"), cleaned_text.rfind("}")
        if start != -1 and end != -1:
            cleaned_text = cleaned_text[start : end + 1]

        parsed_json = json.loads(cleaned_text, strict=False)
        fb = _fallback_response(lang, painkiller, app_mode, data)

        def get_safe_field(json_data, key, fallback_val):
            val = json_data.get(key) if isinstance(json_data, dict) else None
            return val if val and str(val).strip() else fallback_val

        # 6. 返回前端数据字典
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
            "health_tips_link": f"https://health-edu.org/dysmenorrhea/{data.dominantPain}"
        }

    except Exception as e:
        print(f"❌ 运行发生异常，进入安全降级保护: {e}")
        fallback = _fallback_response(lang, painkiller, app_mode, data)
        fallback.update({
            "is_fallback": True,
            "error_detail": str(e),
            "pain_location": pain_location_desc,
            "accompanying_symptoms": accompanying_desc,
            "risk_warning": risk_warning,
            "triage_advice": triage_advice if app_mode == "medical" else "居家自愈修整中",
            "exam_advice": exam_advice if app_mode == "medical" else None,
            "health_tips_link": f"https://health-edu.org/dysmenorrhea/{data.dominantPain}"
        })
        return fallback

# ─────────────────────────────────────────────
# 降级备用模版 (完全同步)
# ─────────────────────────────────────────────
def _fallback_response(lang: str, painkiller: str, app_mode: str, data: PainData) -> dict:
    is_general = app_mode == "general"
    mb = data.medicalBackground
    
    allergies = get_val_from_mb(mb, "allergies", "无明确药物过敏史" if lang == "zh" else "No known drug allergies")
    menarche = getattr(mb, 'menarcheAge', '13') if mb else '13'
    
    cycle_reg_map = {"regular": "规律", "irregular": "不规律", "unsure": "不确定"} if lang == "zh" else {"regular": "regular", "irregular": "irregular", "unsure": "unsure"}
    cycle_reg = cycle_reg_map.get(getattr(mb, 'cycleRegular', ''), '规律' if lang == "zh" else "regular")
    
    period_dur = getattr(mb, 'periodDuration', '5') if mb else '5'
    lmp = getattr(mb, 'lastPeriod', '未提供' if lang == "zh" else "Not provided")
    
    surg_desc = get_surgical_desc(mb, lang)
    repo_desc = get_reproductive_desc(mb, lang)

    if lang == "zh":
        if is_general:
            return {
                "chief_complaint": "【身体感知】小腹酸胀不适伴腰部酸痛感。",
                "present_illness": "平滑肌轻度痉挛收缩，伴骨盆局部血管微滞与坠重。建议配合温热热敷与舒缓长呼吸，松弛盆底肌肉阻抗。",
                "past_history": f"既往健康状况一般。{surg_desc}。习惯性久坐少动。",
                "menstrual_history": f"月经周期{cycle_reg}，目前处于月经行经期第1-2天。",
                "clinical_diagnosis": "【骨盆感知】：交感神经紧张度增高、盆腔静脉微淤。",
                "clinical_suggestions": "【自愈释压指南】：\n1. 【抱膝放松法】：侧卧婴儿式，用手微抱双膝，使后部腰骶自然弯曲伸展，缓解腰椎后群肌压力。\n2. 【意念身体扫描】：将手覆在关元穴（腹部中线脐下三寸），吸气4秒，深长呼气8秒，释放盆腔内压。⚠️注意：任何自愈方案或体位调节若引起您额外的不适或痛感，请立即停止，回归最舒服的姿势并保持静卧休养。",
                "analogy": "小腹内像藏着一个不断微弱充气的酸热气球，发胀发酸。",
                "work": "因今天经期不适状态不佳，特申请本周聚会改天再聚。",
                "action": [
                    "☑️ 将手掌合十搓热，平敷于她小腹下方的关元穴，通过体温传导温和舒缓充血坠胀。",
                    "☑️ 备好42℃左右温热水，尽量保持卧室光线柔和避光，减少感官刺激。"
                ],
                "selfCare": [
                    "✨ 允许自己安静静卧。身体的痛楚是真实的生理重塑，今天休息也是有价值的治疗。",
                    "✨ 配合深长吸气，将氧气送入盆腔深处，温和缓解缺氧痉挛。"
                ]
            }
        else:
            diag_list = ["1. 原发性痉挛性痛经（子宫内膜平滑肌痉挛可能）"]
            surg_val = getattr(mb, 'surgicalHistory', '') if mb else ''
            if surg_val in ["pelvic", "abdominal", "other"]:
                diag_list.append(f"2. {surg_desc}")
            diag_desc = "\n".join(diag_list)

            return {
                "chief_complaint": "下腹部阵发性痉挛性绞痛1天，加重伴下腹坠痛1小时。",
                "present_illness": "患者既往月经规律。今日突发月经期下腹部痉挛性绞痛，阵发加剧，痛感深在，向腰骶部及左大腿放射。无肛门坠胀感，无发热，无尿频尿急。自行口服布洛芬后痛感缓解有限。现为求进一步诊治求诊。患者病来精神一般，大小便无特殊，体重无异常变化。",
                "past_history": f"既往史：健康状况良好。无胃溃疡及其他慢性躯体疾病史。手术史：{surg_desc}。过敏史：{allergies}。",
                "menstrual_history": f"{menarche} ({period_dur}/28天) LMP: {lmp}. 痛经：有。生育史：{repo_desc}。",
                "clinical_diagnosis": diag_desc,
                "clinical_suggestions": "【建议就诊时与医生讨论的要点】：\n1. 结合既往健康档案及痛觉表现，建议请医生在行盆腔超声检查时评估是否存在局部痉挛或潜在病灶。\n2. 讨论口服镇痛抗炎药物的针对性调节。\n\n🔬 【妇科专科检查消除恐惧指南】：\n妇科超声及妇检检查是极基础的无创排查方法。如果推荐您进行相关检查，请配合医生进行深慢呼吸，主动放松盆底括约肌。医生会提供充分的屏风和隐私防护以保护您的隐私边界与检查尊严。请放心配合医生，尽早明确病灶原因。",
                "analogy": "小腹内像藏着一个上紧了发条的金属夹子，在不断收缩拧动，冷意带着尖锐的酸麻感直窜后脊。",
                "work": "因今日突发重度生理期绞痛及全身虚脱，无法支持工作，特申请病假休息一天，紧急事务已妥善交接。",
                "action": [
                    f"☑️ 准备好温热热水袋或暖贴，敷于其下腹关元穴或后腰骶区进行温和理疗。",
                    f"☑️ 倒一杯温热开水，备好安全类镇痛药（如{painkiller}），避开已知药物过敏原。"
                ],
                "selfCare": [
                    "✨ 采用侧卧婴儿蜷缩式躺下，在双膝间夹小靠枕，释放盆腔微血管压力。",
                    "✨ 禁食生冷冰冻饮品，小口慢饮热水或热红枣姜茶促进盆腔血液灌注。"
                ]
            }
    else:
        # English Mirror Fallback
        if is_general:
            return {
                "chief_complaint": "Somatic Reflection: Today the lower pelvis feels compressed with continuous heavy waves of bloating.",
                "present_illness": "Somatic assessment indicates mild spasmodic uterine contractions accompanied by localized pelvic congestion. Mindful breathing and warmth may be considered to pacify pelvic floor myofcial tension.",
                "past_history": f"Generally healthy. {surg_desc}. Irregular schedule/night shifts.",
                "menstrual_history": f"Menarche at {menarche}. Cycle: {cycle_reg}. Duration: {period_dur} days. LMP: {lmp}.",
                "clinical_diagnosis": "Primary dysmenorrhea / Pelvic congestion screening required.",
                "clinical_suggestions": f"Rest, apply local heat therapy. Consult physician for pharmacological intervention. Recommended non-allergenic analgesic: {painkiller}.",
                "analogy": "Like a heavy stone sinking deep into your lower pelvis, radiating continuous stiffness to your lower back.",
                "work": "Sorry, I won't be able to make it to the party today due to severe pain.",
                "action": [
                    "☑️ Rub your palms warm and place them flat on her lower abdomen to gently encourage circulation.",
                    "☑️ Ensure a quiet, dark environment to reduce autonomic over-sensitivity."
                ],
                "selfCare": [
                    "✨ You are allowed to rest. Pain is a real physical state. Resting is active recovery.",
                    "✨ Practice diaphragmatic breathing to pacify the hyperactive pelvic floor muscle group."
                ]
            }
        else:
            return {
                "status": "success",
                "language": "en",
                "chief_complaint": f"Chief complaint: Cyclic dysmenorrhea with lower abdominal pain on menses day {data.cycleDay}.",
                "present_illness": f"The patient reports cyclic, spasmodic lower abdominal pain associated with menses. Pain intensity is quantified at {data.painScore}/100 based on visual drawing telemetry. Aggravated during menses with localized pelvic sensation.",
                "past_history": f"Past History: Generally healthy. Surgery: {surg_desc}. Allergies: {allergies}.",
                "menstrual_history": f"Menarche at {menarche} ({period_dur}/28 days) LMP: {lmp}. Dysmenorrhea: Yes. Obstetrical History: {repo_desc}.",
                "clinical_diagnosis": f"1. Primary spasmodic dysmenorrhea\n2. {surg_desc}",
                "clinical_suggestions": "【Points to discuss with your doctor】:\n1. Discuss the risk of pelvic tissue adhesions and localized lesions with your gynecologist during your pelvic ultrasound.\n2. Ask whether pelvic ultrasound screening is appropriate.\n\n🔬 【Pelvic Examination Reassurance Guide】:\nPelvic examinations and Doppler ultrasounds are routine non-invasive screening procedures. The physician operates behind private screens to fully respect your physical boundaries and preserve patient dignity. Please stay relaxed during the exam.",
                "analogy": "Like an iron clamp twisting tightly inside the deep pelvis, sending paroxysms of acute stiffness straight up the spine.",
                "work": "Dear Manager/HR,\nI am writing to request sick leave for today due to acute lower abdominal cramping. Urgent tasks have been delegated. Thank you for your support and understanding.",
                "action": [
                    "☑️ Apply a warm compress or heating pad (40-45°C) to her lower back and lower abdomen.",
                    f"☑️ Prepare warm water and have her safe pain reliever (e.g. {painkiller}) ready, keeping her away from allergens."
                ],
                "selfCare": [
                    "✨ Lie down in a fetal position, placing a soft pillow between your knees to reduce uterine pelvic strain.",
                    "✨ Avoid any cold beverages. Sip warm water slowly to encourage blood perfusion."
                ]
            }