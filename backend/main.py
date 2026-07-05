# main.py
# ═══════════════════════════════════════════════════════════
# PainScape 后端服务网关 (已对齐防篡改、翻译字典、数值脱敏与温情引导红线)
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
import traceback
from dotenv import load_dotenv
from openai import OpenAI

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
        "model": "Volc-DeepSeek-V3.2",        # 医疗专科大病历使用 DeepSeek V3.2
        "model_quick": "Doubao-Seed-2.0-mini", # 快速录入及非医疗使用 Doubao-mini
        "model_refine": "Doubao-Seed-2.0-mini",
        "max_tokens": 4096,
        "display_name": "Vivo蓝心大模型网关",
    },
}

# 简易多语言映射对照
PAIN_MAP = {
    "zh": {
        "spasmodic": "痉挛性收缩感",
        "dull": "持续性沉闷感",
        "bloating": "坠胀性轻度不适",
        "sharp": "表浅局部酸痛"
    },
    "en": {
        "spasmodic": "spasmodic contraction sensation",
        "dull": "persistent dull sensation",
        "bloating": "mild bloating discomfort",
        "sharp": "localized surface soreness"
    }
}

# ─────────────────────────────────────────────
# 🛡️ 数据隔离字典（彻底阻断代码 Key 泄漏至前端）
# ─────────────────────────────────────────────
LIFESTYLE_DICT = {
    "zh": {
        "sleepShort": "睡眠时长不足/熬夜",
        "sleepIrregular": "作息紊乱/夜班",
        "smoking": "有吸烟习惯",
        "alcohol": "有饮酒习惯",
        "caffeine": "过量咖啡因摄入",
        "coldFood": "喜食生冷冰饮",
        "spicy": "嗜食辛辣刺激食物",
        "weightLoss": "处于极端减重/节食期"
    },
    "en": {
        "sleepShort": "sleep deprivation/insufficient sleep",
        "sleepIrregular": "irregular sleep schedule/night shifts",
        "smoking": "smoking habit",
        "alcohol": "alcohol consumption",
        "caffeine": "excessive caffeine intake",
        "coldFood": "preference for cold/iced drinks",
        "spicy": "preference for spicy food",
        "weightLoss": "currently on extreme diet/weight loss"
    }
}

FAMILY_HISTORY_DICT = {
    "zh": {
        "mother": "母亲有痛经史",
        "sister": "胞姐/胞妹有痛经史",
        "none": "明确无家族史",
        "unknown": "家族痛经史不详"
    },
    "en": {
        "mother": "Maternal history of dysmenorrhea",
        "sister": "Sister with severe dysmenorrhea",
        "none": "No family history of dysmenorrhea",
        "unknown": "Family history unknown"
    }
}

REPRODUCTIVE_DICT = {
    "zh": {
        "nulliparous": "未生育（无怀孕史，无生育史）",
        "pregnant": "已孕未生产",
        "parous": "有分娩史（已生育）",
        "spontaneousAbortion": "既往自然流产史",
        "inducedAbortion": "既往人工终止妊娠/流产史"
    },
    "en": {
        "nulliparous": "Nulliparous (no pregnancy or birth history)",
        "pregnant": "Currently pregnant",
        "parous": "Parous (has given birth)",
        "spontaneousAbortion": "History of spontaneous abortion",
        "inducedAbortion": "History of induced/medical abortion"
    }
}

config = PROVIDER_CONFIG.get(LLM_PROVIDER, PROVIDER_CONFIG["vivo"])
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

# 🌟 全局 Few-Shot 范例模板定义 (统一格式)
FEW_SHOT_EXAMPLE_ZH = """
{
  "chief_complaint": "周期性下腹部痉挛性收缩感。",
  "present_illness": "患者既往月经规律。今日处于生理期第2天，盆腔微循环处于自然生理充血状态。感下腹部持续性收紧痛，痛感中等，伴阵发性收缩，向腰骶部有轻度酸胀感。未自行口服药物调理。病期未诉其余伴随异常指征。患者病来精神尚可，系统状况未详细采集，体能状态一般，体重无异常变化。",
  "past_history": "既往史：平素健康。无特殊慢性病史。手术史：无腹部及盆腔手术史。过敏史：无明确药物过敏史。个人史及家族史详见背景采集。",
  "menstrual_history": "13 (5/28天) LMP: 2026-06-27. 痛经：有。生育史：未婚未育（无怀孕史，无生育史，G0P0）。",
  "clinical_diagnosis": "1. 周期性子宫平滑肌痉挛（生理期功能性痛觉高敏可能）\\n\\n💡 请放心：上述筛查仅为临床常规排除项，器质性病变的概率极低，多为一过性敏感，请勿惊慌。",
  "clinical_suggestions": "【建议就诊时与医生讨论的要点】：\\n1. 结合既往健康档案及痛觉表现，建议请医生在行盆腔超声检查（高性价比、常规无创初筛，多属于医保报销范畴）时评估是否存在局部痉挛或潜在功能性不协调。\\n2. 讨论口服抗炎镇痛药物的针对性调节。\\n\\n【妇科专科检查消除恐惧指南】：\\n妇科超声及妇检检查是极基础的无创初筛排查方法。如果推荐您进行相关检查，请配合医生进行深慢呼吸，主动放松盆底括约肌。医生会提供充分的屏风和隐私防护以保护您的隐私边界与检查尊严。请放心配合医生，尽早明确痛因。",
  "analogy": "子宫内像藏着一个上紧了发条的金属夹子，在不断收缩拧动，冷意带着尖锐的酸麻感直窜后脊，疼得根本站不直身子。",
  "work": "因今天生理期不适/痛经，特申请请假休息一天，望批准。",
  "action": [
    "☑️ 准备一个温热的热水袋，帮她放置在下腹部或后腰处进行物理热敷理疗。",
    "☑️ 帮她倒一杯温热的饮用水，并准备好安全的止痛药[根据患者过敏史推荐的安全止痛药]。"
  ],
  "selfCare": [
    "✨ 采用侧卧婴儿蜷缩式，膝盖之间夹枕头，放松紧绷的盆腔肌肉。",
    "✨ 尽量拉长呼吸，吸气4秒、平稳呼气8秒，能帮过度兴奋的盆底肌肉尽快放松下来。"
  ]
}
"""

# ─────────────────────────────────────────────
# Pydantic 数据模型
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

# ─────────────────────────────────────────────
# 🛡️ 临床级背景格式化安全处理器
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
    # 🌟 使用中英文映射字典防止 Enum 泄漏
    rep_dict = REPRODUCTIVE_DICT.get(lang, REPRODUCTIVE_DICT["zh"])
    desc_list = [rep_dict.get(str(r), str(r)) for r in repo_list if r]
    if lang == "zh":
         return "、".join(desc_list) if desc_list else "未婚未育（无怀孕史，无生育史）"
    else:
         return ", ".join(desc_list) if desc_list else "Nulliparous (no pregnancy or birth history)"

def get_cycle_regular_desc(mb: Optional[MedicalBackgroundModel], lang: str) -> str:
    val = getattr(mb, 'cycleRegular', '') if mb else ''
    if lang == "zh":
        reg_map = {
            "regular": "规律（周期稳定）",
            "irregular": "不规律（周期波动大）",
            "unsure": "不确定"
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
        return "🏥 建议急门诊评估：伴随自主神经反射受损（面色苍白/冷汗），请尽快前往急诊排查继发盆腔急腹症。" if lang == "zh" else "🏥 Urgent Gynecological Visit Recommended."
    return "🏠 居家自愈观察" if lang == "zh" else "🏠 Home Self-Care"

def build_exam_advice(mb: Optional[MedicalBackgroundModel], lang: str) -> Dict:
    exam = {
        "name": "妇科盆腔超声检查（彩色多普勒超声）" if lang == "zh" else "Pelvic Color Doppler Ultrasound",
        "preparation": "经阴道彩超需在检查前排空小便（无性生活史者禁用）；经腹部彩超需提前憋尿，可在检查前1小时内饮水500-800ml。" if lang == "zh" else "Empty bladder for transvaginal; full bladder for abdominal.",
        "note": "💡 临床常规、低成本排除方案（多数可在医保范围内全额报销），检查过程无创无痛，用于排除器质病变让您心里踏实，不用担心有财务负担。",
        "alternative": ""
    }
    return exam

def translate_vectors_to_clinical(data: PainData, lang: str) -> str:
    ip = data.intensityProfile or IntensityProfileModel()
    pressure_val = ip.avgPressure or 0.5
    speed_val = ip.avgSpeed or 5.0
    
    depth = "深层内脏反射（主要对应盆腔深部平滑肌生理性收缩不协调）" if pressure_val > 0.6 else "表浅外周感觉过敏（痛感主要集中于表浅腹壁投影区）"
    rhythm = "发作呈阵发性波动，具有生理性收缩起伏" if speed_val > 12.0 else "呈慢性持续不适，变化相对平缓"
    
    return f"【画笔物理轨迹分析】：痛感深度对应为{depth}；发作节律表现为{rhythm}。"

def get_color_somatic_meaning(color: Optional[str], lang: str) -> str:
    color_key = str(color or "crimson").lower()
    if lang == "zh":
        meanings = {
            "crimson": "局部微循环暂时性温热充盈。属于生理期盆腔血管扩张、血流天然汇聚的正常生理现象，通常伴随微微的温热与饱满感。",
            "dark": "小腹伴随轻微的沉闷与下坠感，提示局部微循环血流流速有所放缓。这种被动性的微循环变化，通过舒缓拉伸或适度走动即可得到温和改善。",
            "blue": "提示局部温度感知稍凉，对外界寒冷刺激较为敏感。生理上属于微血管一过性收缩带来的清凉与紧绷感，通常可通过局部热敷理疗轻松恢复暖意。",
            "purple": "局部痛觉敏感度暂时性有所提升，伴随轻微的酸胀与疲惫感。这属于盆腔神经末梢一过性对应激比较敏感的状态，适合配合深长呼吸来进行全身心交感放松。"
        }
    else:
        meanings = {
            "crimson": "A temporary warm sensation in local microcirculation. This is a natural physiological phenomenon of localized blood pooling during the menstrual phase, usually accompanied by mild warmth.",
            "dark": "A slight heavy or dull sensation in the lower abdomen, indicating a temporary slowing of localized microcirculation. This passive congestion is easily relieved by gentle stretching or slow walking.",
            "blue": "Indicates temporary coolness and sensitivity to environmental cold. Physiologically associated with transient localized vasoconstriction, which can be easily comforted and warmed with local heat therapy.",
            "purple": "A temporary increase in local somatic sensitivity, accompanied by a mild dull ache and tiredness. Suggests transient hypersensitivity of local pelvic nerve endings, ideal for full-body relaxation with deep breathing."
        }
    return meanings.get(color_key, meanings["crimson"])

# ═══════════════════════════════════════════════════════════
# 主力 POST 生成接口
# ═══════════════════════════════════════════════════════════
@app.post("/api/generate")
def generate_pain_report(data: PainData):  # 🌟 同步执行防止假死
    lang = "zh"
    app_mode = "medical"
    painkiller = "布洛芬"

    try:
        lang = str(data.targetLanguage or "zh")
        app_mode = str(data.appMode or "medical").lower()
        mb = data.medicalBackground

        pt_dict = PAIN_MAP.get(lang, PAIN_MAP["zh"])
        vector_analysis = translate_vectors_to_clinical(data, lang)

        # 止痛药红线
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

        # 止痛药名称纠正
        painkiller = "对乙酰氨基酚" if has_nsaid_allergy else "布洛芬"

        pain_location_desc = build_pain_location_desc(data.spatialMap, lang)
        accompanying_symptoms = data.accompanyingSymptoms or []
        accompanying_desc = "、".join(accompanying_symptoms) if accompanying_symptoms else "未诉其余明显伴随异常指征"
        
        risk_warning = build_risk_warning(mb, lang)
        triage_advice = build_triage_advice(data.painScore, accompanying_symptoms, lang)
        exam_advice = build_exam_advice(mb, lang)

        surg_desc = get_surgical_desc(mb, lang)
        repo_desc = get_reproductive_desc(mb, lang)
        cycle_reg_desc = get_cycle_regular_desc(mb, lang)
        period_dur_desc = get_period_duration_desc(mb, lang)

        menarche_val = get_val_from_mb(mb, 'menarcheAge', '未详述')
        menarche_desc = f"{menarche_val} 岁" if menarche_val != "未详述" else "未详述"

        # 周期位置定位
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

        # 🌟 对健康背景数据中的前端原始枚举（Enum）键名进行深度前置翻译，防止生成泄漏
        lifestyle_final = "无特殊不良作息"
        family_history_final = "个人史与家族史详见背景采集"
        reproductive_final = "未生育"

        if mb:
            ls_dict = LIFESTYLE_DICT.get(lang, LIFESTYLE_DICT["zh"])
            ls_list = [ls_dict.get(str(x), str(x)) for x in getattr(mb, 'lifestyleArr', []) or [] if x]
            lifestyle_final = "、".join(ls_list) if ls_list else "无特殊不良作息"

            fam_dict = FAMILY_HISTORY_DICT.get(lang, FAMILY_HISTORY_DICT["zh"])
            fam_list = [fam_dict.get(str(x), str(x)) for x in getattr(mb, 'familyHistoryArr', []) or [] if x]
            family_history_final = "、".join(fam_list) if fam_list else "无明确家族痛经遗传史"

            rep_dict = REPRODUCTIVE_DICT.get(lang, REPRODUCTIVE_DICT["zh"])
            rep_list = [rep_dict.get(str(x), str(x)) for x in getattr(mb, 'reproductiveHistoryArr', []) or [] if x]
            reproductive_final = "、".join(rep_list) if rep_list else "未生育"

        diagnosed_history = "无明确妇科疾病确诊史"
        surgical_history_val = "无盆腔及腹部手术史"
        age_cohort = "成年女性"
        
        if mb:
            if getattr(mb, "age", "") and getattr(mb, "age") not in ["", "none"]:
                age_cohort = f"年龄处于 {getattr(mb, 'age')} 阶段"
            if getattr(mb, "diagnosed", "") and getattr(mb, "diagnosed") not in ["none", "unchecked", ""]:
                diagnosed_history = f"曾确诊患有 {getattr(mb, 'diagnosed')}"
                if getattr(mb, "otherDiagnosis", ""):
                    diagnosed_history += f"、{getattr(mb, 'otherDiagnosis')}"
            
            surg_val = getattr(mb, 'surgicalHistory', '')
            if surg_val and surg_val != "none":
                surgical_history_val = surg_desc

        # 物理标度换算
        raw_score = data.painScore
        vas_score = min(10, max(1, int(raw_score / 80))) if raw_score > 100 else min(10, max(1, int(raw_score / 10)))
        scaled_score = min(100, int(raw_score / 8)) if raw_score > 100 else max(10, raw_score)

        # 🏥 【 System Prompt】：去病理恐慌、杜绝美化痛觉、高雅得体假条约束
        if app_mode == "medical":
            sys_prompt = f"""
You are an expert clinical gynecological intake specialist. You write gynecological admission records (住院/入院记录) for medical consultations.
Your output must be strictly written in the tone, style, and structure of a real Class-A tertiary hospital medical record (参考三甲医院妇科病历书写规范).

【病历书写硬性合规防错指令】
1. 【严禁生造词与软件工具词汇】！病历正文中【绝对不允许】出现“画笔”、“画布行为”、“分值评分”、“痛觉矢量图谱”、“绘图定位”、“前端”等任何软件专有名词。必须将其转译为标准医学词汇。
2. 【严格写入阴性症状进行鉴别诊断】：在‘present_illness’（现病史）中必须清晰写入鉴别指标（如：“无肛门坠胀感，无尿频尿急...起病以来精神可，二便正常，体重无明显变化”）。
3. 【病史公式化对齐】：月经史使用标准月经史公式格式。
4. 【大模型转译硬性指令】
   - 特别限制（防污染隔离）：月经初潮年龄、月经周期规律性、经期持续时间、末次月经（LMP）属于妇科专属史，在既往史中【绝对不允许】出现，必须仅在 `menstrual_history` 中体现。
   - 【痛感病生理机制分析】：科学客观剖析痛感，无需一句话概括。

【🚫 严禁出现数值评分红线】
- **绝对禁止**在 `present_illness`（现病史）和任何病历正文地方，出现如‘26/100’、‘2.6分’、‘痛觉负荷评分’等任何具体的数值或评分名词。
- 痛觉的强弱必须通过生理和医学体征（如‘轻度胀痛’、‘中度一过性痉挛’）来客观转译描述，把数值完全隐藏起来，以免引起误导。

【🚫 去病理恐慌与检查预估红线 - 核心约束】
- **绝对禁止**在没有确凿临床既往史证据的情况下，直接下器质性诊断（如‘子宫内膜异位症’、‘盆腔炎性疾病’）。
- 重点筛查方向（clinical_diagnosis）必须温和、功能性、去病理化。并且**在结尾必须强制附带一段安抚文字**，写明：“请放心：上述筛查方向仅为常规鉴别排除项。根据您的具身体征，病理性器质病变的概率极低，绝大部分情况属于生理期暂时性的平滑肌应激敏感，无需过度担忧。”
- **彻底删除任何“模块一（供接诊医生参考）”**！所有的检查引导均直接面向【患者（用户）】，为其提供心理预判与配合，不得出现任何指点医生该如何看病诊疗的词句。
- 检查预估引导要**减低用户的精神及财务包袱**。明确告知她：盆腔超声检查是性价比极高、极其常规的常规初筛（多属于医保全额可报销范畴），无需担心昂贵的开支，旨在作为排除项让她心里踏实。
- 检查人称纠正：**绝对禁止使用第一人称“我们”**！必须用中立的“医护人员”或“医院检查过程”来描述。例如：“医护人员在操作时会尽量保持动作温和，保护您的体感”、“检查会根据您的即时反馈进行调整”，避免产生AI替医生诊断的合规问题。
- **请完全采用以下提供的温润语气格式模板输出 `clinical_suggestions` (两个块中间用双换行符分隔)**：
  【建议就诊时与医生讨论的要点】：
  1. 结合既往健康档案及痛觉表现，建议请医生在行盆腔超声检查（高性价比、常规无创初筛，多属于医保报销范畴）时评估是否存在局部痉挛或潜在功能性不协调。
  2. 讨论口服抗炎镇痛药物的针对性调节。
  
  【妇科专科检查消除恐惧指南】：
  妇科超声及妇检检查是极基础的无创初筛排查方法。如果推荐您进行相关检查，请配合医生进行深慢呼吸，主动放松盆底括约肌。医护人员会提供充分的屏风和隐私防护以保护您的隐私边界与检查尊严。请放心配合医生，尽早明确痛因。

【🚫 伴侣通感说明拒绝美化红线】
- 你的 `analogy` 字段是写给患者伴侣看的。**绝对禁止任何形式的文学化美化**（严禁出现“海浪轻拍”、“温柔有节奏的低语”、“身体在吟唱”等任何淡化痛苦的诗意词汇）。
- 必须使用真实、raw、具有硬性物理压迫感和高痛觉质感特征的词汇（如“铁手攥紧拧绞”、“细密钢针钻刺”、“冷铅极力沉坠”、“粗糙锉刀刮擦”），让伴侣能够切身感受到真实的肉体折磨，从而予以加倍重视，唤起其紧迫同理心。

【🚫 社交假条日常化红线】
- 你的 `work` 字段是供用户一键复制请假或推约的。**绝对禁止出现“突发严重扭转剧烈绞痛”等过于戏剧化、在现实职场社交中显得尴尬不自然的辞藻**。
- 必须符合中国职场/学校真实生活习惯，直接说“因生理期痛经/经期不适，身体严重不适，请假一天”或“生理期不适推约”即可，字数控制在 40 字以内。

【纯 JSON schema 格式输出】
{{
  "chief_complaint": "主诉（极简，部位+体感，字数严格控制在20字以内）",
  "present_illness": "现病史（学术规范，深度剖析病生理，字数饱满，使用温和不制造恐慌的词汇，绝对不提数值评分）",
  "past_history": "既往史、个人史及家族史风险（严格基于输入，无则写无，禁止泄漏Enum代码。绝对禁止包含月经周期、行经天数等月经史内容！）",
  "menstrual_history": "月经史与婚育史（标准公式，严禁套用范例）",
  "clinical_diagnosis": "重点筛查方向参考（温和去恐慌语气，并附带一句安抚排除概率高、病变可能性极低的说明）",
  "clinical_suggestions": "【建议就诊时与医生讨论的要点】：\\n1. ...\\n\\n【妇科专科检查消除恐惧指南】：\\n...",
  "analogy": "痛觉具身通感隐喻（写给伴侣，拒绝美化，还原真实的硬性物理肉体折磨与痛楚，唤起伴侣重视）",
  "work": "日常请假/推约短信（极其自然、得体、日常化，严禁夸张写微观痛感。40字以内）",
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
1. 绝对禁止使用任何令人焦虑的临床术语。也不要写过于晦涩的生词，以免引起担忧。
2. 严禁使用极端、恐怖化字眼，采用“牵拉、温冷、牵坠、呼吸阻抗”等触觉词。
3. "selfCare" 必须包含至少一个特定的疼痛缓解姿势（如双膝微屈抱枕），必须简单易做，且必须有一句消除病耻感、允许自己今天休息的温暖安慰。
4. "work" 部分必须是严格限制在 40 字以内的社交推辞/推约短文本。
"""

        # 3. 极严苛的 User Prompt
        user_prompt = f"""
【🚨 真实当前患者数据输入 - 绝对禁区！只能使用以下提供的数据进行处理，严禁捏造任何未提供的数据】

1. 基础生物及痛觉矢量特征：
   - 当前患者年龄段：{age_cohort}
   - 主导痛感质感：{pt_dict.get(data.dominantPain, data.dominantPain)}
   - 累积痛觉负荷评分（物理换算百分制）：{scaled_score}/100 （原始粒子点数：{data.painScore}）
   - 痛感空间定位描述：{pain_location_desc}
   - 判定当前生理阶段：{active_phase} (请基于此阶段，融合系统提示词中的“月经周期阶段参考指南”定制你的 selfCare 运动、自愈与生活饮食建议)
   - 伴随躯体症状：{accompanying_desc}
   - 前端绘图物理动力学特征推演：{vector_analysis}
   - 情绪与血管微循环色彩：{get_color_somatic_meaning(data.colorPalette, lang)}

2. 导入的患者真实健康背景（若显示为“无/未提供”，相关病历部分必须输出为无，严禁抄袭 Few-Shot 范例！）：
   - 身高/体重：{f"{getattr(mb, 'height', '')}cm / {getattr(mb, 'weight', '')}kg" if mb and getattr(mb, 'height', '') else "未提供"}
   - 既往诊断病史：{diagnosed_history}
   - 外科手术史：{surgical_history_val}
   - 生育/孕产史：{reproductive_final}
   - 家族遗传/痛经史：{family_history_final}
   - 初潮年龄：{menarche_desc}
   - 月经周期规律性：{cycle_reg_desc}
   - 经期天数：{period_dur_desc}
   - 末次月经第一天（LMP）：{get_val_from_mb(mb, "lastPeriod", "未提供")}
   - 个人生活作息背景：{lifestyle_final}

3. 语气及文案偏好：
   - 沟通偏好语调：{data.tonePreference}

{drug_safety_instruction}

请仅基于上述真实数据，直接输出一个纯 JSON 对象（不要有 markdown 包装）：
"""

        model_name = config["model_quick"] if data.isQuickLog else config["model"]

        print(f"🤖 正在请求服务提供商: {config['display_name']} ({model_name})...")

        # 4. 执行制定的原生 API 负载参数传输
        payload = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "stream": False,
            "max_tokens": config.get("max_tokens", 4096),
            "temperature": 0.1,
            "top_p": 0.7
        }

        if LLM_PROVIDER == "vivo":
            url = f"{config['base_url']}/chat/completions"
            headers = {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": f"Bearer {api_key}",
            }
            params = {"request_id": str(uuid.uuid4())}
            
            if "qwen" in model_name.lower():
                payload["enable_thinking"] = False
            else:
                payload["thinking"] = {"type": "disabled"}
                payload["reasoning_effort"] = "minimal"

            response = requests.post(url, headers=headers, params=params, json=payload, timeout=90)
            response.raise_for_status()
            raw_text = response.json()["choices"][0]["message"]["content"]
        else:
            completion = client.chat.completions.create(
                model=model_name,
                messages=payload["messages"],
                temperature=0.1,
                response_format={"type": "json_object"}
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
        import traceback
        print(f"❌ 运行发生异常，进入安全降级保护: {e}")
        print(traceback.format_exc())
        fallback = _fallback_response(lang, painkiller, app_mode, data)
        fallback.update({
            "is_fallback": True,
            "error_detail": str(e)
        })
        return fallback

# ─────────────────────────────────────────────
# 降级备用模版 (安全动态重构，完全消除硬编码编造数据与恐慌词)
# ─────────────────────────────────────────────
def _fallback_response(lang: str, painkiller: str, app_mode: str, data: PainData) -> dict:
    is_general = app_mode == "general"
    mb = data.medicalBackground
    
    # 局部作用域解析
    surg_desc = get_surgical_desc(mb, lang)
    repo_desc = get_reproductive_desc(mb, lang)
    cycle_reg = get_cycle_regular_desc(mb, lang)

    # 动态构建真实健康历史数据
    diagnosed_history = "无明确妇科疾病确诊史"
    surgical_history = "无盆腔及腹部手术史"
    obstetric_history = "未生育"
    
    lifestyle_final = "无特殊不良作息"
    family_history_final = "无明确家族痛经遗传史"

    if mb:
        if getattr(mb, "diagnosed", "") and getattr(mb, "diagnosed") not in ["none", "unchecked", ""]:
            diagnosed_history = f"曾确诊患有 {getattr(mb, 'diagnosed')}"
            if getattr(mb, "otherDiagnosis", ""):
                diagnosed_history += f"、{getattr(mb, 'otherDiagnosis')}"
        
        surg_val = getattr(mb, 'surgicalHistory', '')
        if surg_val and surg_val != "none":
            surg_map = {"abdominal": "腹部手术史", "pelvic": "盆腔手术史", "other": "其他手术史"}
            surgical_history = surg_map.get(surg_val, "有手术史")

        reprod_arr = getattr(mb, "reproductiveHistoryArr", []) or []
        if reprod_arr:
            reprod_map = {
                "nulliparous": "未生育", "pregnant": "已孕未生产", "parous": "已生育",
                "spontaneousAbortion": "自然流载史", "inducedAbortion": "人工终止妊娠/流产史"
            }
            obstetric_history = "，".join([reprod_map.get(x, x) for x in reprod_arr if x])

        # 降级模块防 enum 泄露
        ls_dict = LIFESTYLE_DICT.get(lang, LIFESTYLE_DICT["zh"])
        ls_list = [ls_dict.get(str(x), str(x)) for x in getattr(mb, 'lifestyleArr', []) or [] if x]
        lifestyle_final = "、".join(ls_list) if ls_list else "无特殊不良作息"

        fam_dict = FAMILY_HISTORY_DICT.get(lang, FAMILY_HISTORY_DICT["zh"])
        fam_list = [fam_dict.get(str(x), str(x)) for x in getattr(mb, 'familyHistoryArr', []) or [] if x]
        family_history_final = "、".join(fam_list) if fam_list else "无明确家族痛经遗传史"

    # 动态同步解析前端上传的真实痛感质地与部位数据
    pt_dict = PAIN_MAP.get(lang, PAIN_MAP["zh"])
    pain_name = pt_dict.get(data.dominantPain, "下腹部不适感")
    
    location_desc = build_pain_location_desc(data.spatialMap, lang)
    accompanying_symptoms = data.accompanyingSymptoms or []
    accompanying_desc = "、".join(accompanying_symptoms) if accompanying_symptoms else "未诉其余明显伴随异常症状"

    menarche = getattr(mb, 'menarcheAge', '14') if mb else '14'
    period_dur = getattr(mb, 'periodDuration', '5') if mb else '5'
    lmp = getattr(mb, 'lastPeriod', '未提供' if lang == "zh" else "Not provided")

    # 物理痛觉描述映射 (针对伴侣，拒绝美化，还原真实的硬性物理肉体折磨与痛楚)
    custom_analogies = {
        "twist": "子宫深处像是被一只无情的铁手攥紧后用力拧绞，酸痛感伴随肌肉收缩，根本无法挺直腰板。",
        "pierce": "感觉腹腔里藏着一根带刺的钢针在毫无规律地钻刺，每一次呼吸都有种突如其来的尖锐刺痛感。",
        "heavy": "小腹仿佛被灌注了沉重的冷铅，极力地向下沉坠，连带腰骶部酸胀欲断，站立或坐着都感到万分疲惫。",
        "wave": "腹部深处像是有个不断充气胀大的金属气球，正持续压迫周围的神经与血管，带来推不开、化不掉的闷痛。",
        "scrape": "痛灶表面像是有粗糙的锉刀在反复来回刮擦扯动，皮肤敏感度极高，连衣服轻轻贴在肚子上都觉得难受。"
    }
    analogy_val = custom_analogies.get(data.dominantPain, "子宫平滑肌高度紧张敏感，带来持续强烈的物理酸痛负荷。")

    if lang == "zh":
        if is_general:
            return {
                "chief_complaint": f"【身体感知】{location_desc}出现{pain_name}。",
                "present_illness": f"患者自诉处于生理期。今日感{location_desc}处出现{pain_name}，并伴随有{accompanying_desc}。根据痛觉特征表现，局部平滑肌存在轻度应激性收缩，建议配合缓慢的深层腹式呼吸及局部热理疗调和肌肉张力。",
                "past_history": f"既往史：身体状况健康度未详述。手术史：{surgical_history}。日常作息背景：{lifestyle_final}。",
                "menstrual_history": f"当前处于生理周期：{data.cycleDay}。",
                "clinical_diagnosis": "【骨盆感知】：交感反射性应激，盆腔微循环轻微受阻。",
                "clinical_suggestions": "【建议自愈静修调节】：\n1. 【抱膝放松】：采用侧卧婴儿姿势并双膝微抱，自然舒缓后部腰骶肌拉扯。\n\n2. ⚠️ 注意：任何自愈体位调节或理疗方法若引起您额外的不适或痛感加剧，请立即停止！回归最舒服的放松姿势并保持静卧休息。",
                "analogy": analogy_val,
                "work": "因今天经期不适状态不佳，特申请请假休息一天，感谢批准。",
                "action": [
                    "☑️ 将手掌合十搓热，平敷于她小腹下方的关元穴，通过体温传导温和舒缓充血坠胀。",
                    f"☑️ 倒一杯温水，协助她备好无过敏禁忌的安全非处方镇痛药物（如{painkiller}）。"
                ],
                "selfCare": [
                    "✨ 允许自己安静静卧。痛楚是真实的生理重塑，今天休息也是有价值的身体调整。",
                    "✨ 配合深长吸气，将氧气送入盆腔深处，温和缓解缺氧痉挛。"
                ]
            }
        else:
            diag_desc = (
                "1. 周期性功能性下腹痛待排（平滑肌张力暂时性升高可能）\n"
                "2. 暂时性盆腔微循环不协调待排\n\n"
                "💡 请放心：上述筛查方向仅为常规临床鉴别排除项。根据您的体征，病理性器质病变的概率极低，绝大情况仅是生理期暂时性的平滑肌敏感收缩，无需过度担忧。"
            )

            suggestions_desc = (
                "【建议就诊时与医生讨论的要点】：\n"
                "1. 结合既往健康档案及痛觉表现，建议请医生在行盆腔超声检查（高性价比、常规无创初筛，多属于医保报销范畴）时评估是否存在局部痉挛或潜在功能性不协调。\n"
                "2. 讨论口服抗炎镇痛药物的针对性调节。\n\n"
                "【妇科专科检查消除恐惧指南】：\n"
                "妇科超声及妇检检查是极基础的无创初筛排查方法。如果推荐您进行相关检查，请配合医生进行深慢呼吸，主动放松盆底括约肌。医护人员会提供充分的屏风和隐私防护以保护您的隐私边界与检查尊严。请放心配合医生，尽早明确痛因。"
            )

            return {
                "chief_complaint": f"下腹部{pain_name}。",
                "present_illness": f"患者既往月经规律。今日（生理期：{data.cycleDay}）出现{location_desc}部{pain_name}，痛感性质符合绘图动力学特征，伴有伴随症状：{accompanying_desc}。无其余异常不适主诉。起病以来，系统状况未详细填报，体能状态一般。",
                "past_history": f"既往史：{diagnosed_history}。手术史：{surgical_history}。过敏史：{build_risk_warning(mb, lang)}。日常生活背景：{lifestyle_final}。",
                "menstrual_history": f"{menarche} ({period_dur}/28天) LMP: {lmp}. 痛经：有。生育史：{obstetric_history}。",
                "clinical_diagnosis": diag_desc,
                "clinical_suggestions": suggestions_desc,
                "analogy": analogy_val,
                "work": "因今天经期不适/痛经，身体严重不适，请假休息一天，望批准。",
                "action": [
                    f"☑️ 准备一个温热的热水袋，帮她放置在下腹部或后腰处进行物理热敷理疗。",
                    f"☑️ 帮她倒一杯温热的饮用水，并准备好安全的止痛药{painkiller}。"
                ],
                "selfCare": [
                    "✨ 采用侧卧婴儿蜷缩式，膝盖之间夹枕头，放松紧绷的盆腔肌肉。",
                    "✨ 尽量拉长呼吸，吸气4秒、平稳呼气8秒，能帮过度兴奋的盆底肌肉尽快放松下来。"
                ]
            }
    else:
        # English Mirror Fallback
        analogy_val_en = {
            "twist": "It feels like an iron hand is clamping tightly inside the deep pelvis, wrenching the muscles with continuous cramps.",
            "pierce": "It feels like a sharp needle is randomly stabbing deep inside the pelvis, causing sudden sharp pain with every breath.",
            "heavy": "The lower abdomen feels as if it were filled with cold lead, dragging downward heavily, making standing exhausting.",
            "wave": "It feels like a balloon is constantly inflating deep inside the pelvis, compressing the nerves with dull, persistent pressure.",
            "scrape": "It feels like an abrasive file is scraping back and forth inside, making the pelvis extremely sensitive and sore."
        }.get(data.dominantPain, "Uterine smooth muscles are tightly contracted, causing physical aching and heavy fatigue.")

        if is_general:
            return {
                "chief_complaint": "Somatic Reflection: Today the lower pelvis feels compressed with continuous heavy waves of bloating.",
                "present_illness": f"Somatic assessment indicates mild spasmodic uterine contractions accompanied by localized pelvic congestion of type {pain_name}. Mindful breathing and warmth may be considered to pacify pelvic floor myofcial tension.",
                "past_history": f"Generally healthy. {surg_desc}. Lifestyle: {lifestyle_final}.",
                "menstrual_history": f"Menarche at {menarche}. Cycle: {cycle_reg}. Duration: {period_dur} days. LMP: {lmp}.",
                "clinical_diagnosis": "Primary dysmenorrhea / Pelvic congestion screening required.",
                "clinical_suggestions": f"Rest, apply local heat therapy. Consult physician for pharmacological intervention. Recommended non-allergenic analgesic: {painkiller}.",
                "analogy": analogy_val_en,
                "work": "I'm unable to join today due to menstrual cramps. Let's catch up another day.",
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
                "chief_complaint": f"Cyclic dysmenorrhea with lower abdominal pain.",
                "present_illness": f"The patient reports cyclic, spasmodic lower abdominal pain associated with menses. Pain intensity is quantified based on visual drawing telemetry. Aggravated during menses with localized pelvic sensation of {pain_name}.",
                "past_history": f"Past History: Generally healthy. Surgery: {surg_desc}. Allergies: {allergies}. Lifestyle: {lifestyle_final}.",
                "menstrual_history": f"Menarche at {menarche} ({period_dur}/28 days) LMP: {lmp}. Dysmenorrhea: Yes. Obstetrical History: {repo_desc}.",
                "clinical_diagnosis": f"1. Primary spasmodic dysmenorrhea\n2. {surg_desc}\n\n💡 Please rest assured: The above screening direction is only a routine clinical exclusion. The probability of pathological organic disease is extremely low. It is highly likely to be functional and temporary.",
                "clinical_suggestions": "【Points to discuss with your doctor】:\n1. Discuss with your gynecologist during your pelvic ultrasound. It is a highly routine, non-invasive, and cost-effective screening to exclude organic issues, so there is no need for financial or mental burden.\n\n🔬 【Pelvic Examination Reassurance Guide】:\nPelvic Doppler ultrasound is a non-invasive screening procedure. The medical staff operates behind private screens to fully respect your physical boundaries. Examiners will maintain gentle movements, and you can breathe deeply and relax your pelvic muscles during the exam.",
                "analogy": analogy_val_en,
                "work": "Requesting sick leave for today due to acute menstrual cramps. Urgent tasks have been delegated.",
                "action": [
                    "☑️ Apply a warm compress or heating pad (40-45°C) to her lower back and lower abdomen.",
                    f"☑️ Prepare warm water and have her safe pain reliever (e.g. {painkiller}) ready, keeping her away from allergens."
                ],
                "selfCare": [
                    "✨ Lie down in a fetal position, placing a soft pillow between your knees to reduce uterine pelvic strain.",
                    "✨ Avoid any cold beverages. Sip warm water slowly to encourage blood perfusion."
                ]
            }