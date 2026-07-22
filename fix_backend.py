# -*- coding: utf-8 -*-
"""Fix backend main.py - bilingual error messages and Supabase routes"""
import os

filepath = os.path.join(os.path.dirname(__file__), 'backend', 'main.py')
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

changes = []

# Fix 1: get_supabase_user - add lang parameter support
old = "def get_supabase_user(authorization: str = Header(None)):"
new = "def get_supabase_user(authorization: str = Header(None), lang: str = 'zh'):"
if old in content:
    content = content.replace(old, new)
    changes.append("Added lang param to get_supabase_user")

# Fix 2: Make unauthorized error bilingual
old = '''        raise HTTPException(status_code=401, detail="Unauthorized / Supabase not configured")
    try:
        token = authorization.replace("Bearer ", "")
        user = supabase_client.auth.get_user(token)
        return user.user.id
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")'''

new = '''    if lang == "en":
        raise HTTPException(status_code=401, detail="Unauthorized / Supabase not configured")
    else:
        raise HTTPException(status_code=401, detail="未授权 / Supabase 未配置")
    try:
        token = authorization.replace("Bearer ", "")
        user = supabase_client.auth.get_user(token)
        return user.user.id
    except Exception as e:
        if lang == "en":
            raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
        else:
            raise HTTPException(status_code=401, detail=f"无效的令牌: {str(e)}")'''

if old in content:
    content = content.replace(old, new)
    changes.append("Made auth error messages bilingual")

# Fix 3: GET /api/profile - add accept_language
old = '''@app.get("/api/profile")
def get_profile(authorization: str = Header(None)):
    """获取用户档案"""
    if not supabase_client:
        return {"error": "Supabase not configured"}
    try:
        user_id = get_supabase_user(authorization)
    except HTTPException:
        # 允许匿名访问时返回空
        return {"error": "Authentication required"}
    
    result = supabase_client.table("profiles").select("*").eq("id", user_id).execute()
    if result.data and len(result.data) > 0:
        return {"status": "success", "profile": result.data[0]}
    return {"status": "success", "profile": None}'''

new = '''@app.get("/api/profile")
def get_profile(authorization: str = Header(None), accept_language: str = "zh"):
    """获取用户档案"""
    lang = "en" if accept_language and accept_language.startswith("en") else "zh"
    if not supabase_client:
        err = "Supabase not configured" if lang == "en" else "Supabase 未配置"
        return {"error": err}
    try:
        user_id = get_supabase_user(authorization, lang)
    except HTTPException:
        err = "Authentication required" if lang == "en" else "需要身份验证"
        return {"error": err}
    
    result = supabase_client.table("profiles").select("*").eq("id", user_id).execute()
    if result.data and len(result.data) > 0:
        return {"status": "success", "profile": result.data[0]}
    return {"status": "success", "profile": None}'''

if old in content:
    content = content.replace(old, new)
    changes.append("Added bilingual support to GET /api/profile")

# Fix 4: PUT /api/profile
old = '''@app.put("/api/profile")
def update_profile(profile: ProfileUpdate, authorization: str = Header(None)):
    """更新用户档案"""
    if not supabase_client:
        return {"error": "Supabase not configured"}
    try:
        user_id = get_supabase_user(authorization)
    except HTTPException:
        return {"error": "Authentication required"}'''

new = '''@app.put("/api/profile")
def update_profile(profile: ProfileUpdate, authorization: str = Header(None), accept_language: str = "zh"):
    """更新用户档案"""
    lang = "en" if accept_language and accept_language.startswith("en") else "zh"
    if not supabase_client:
        err = "Supabase not configured" if lang == "en" else "Supabase 未配置"
        return {"error": err}
    try:
        user_id = get_supabase_user(authorization, lang)
    except HTTPException:
        err = "Authentication required" if lang == "en" else "需要身份验证"
        return {"error": err}'''

if old in content:
    content = content.replace(old, new)
    changes.append("Added bilingual support to PUT /api/profile")

# Fix 5: POST /api/pain-records
old = '''@app.post("/api/pain-records")
def create_pain_record(record: PainRecordCreate, authorization: str = Header(None)):
    """保存疼痛记录"""
    if not supabase_client:
        return {"error": "Supabase not configured"}
    try:
        user_id = get_supabase_user(authorization)
    except HTTPException:
        return {"error": "Authentication required"}'''

new = '''@app.post("/api/pain-records")
def create_pain_record(record: PainRecordCreate, authorization: str = Header(None), accept_language: str = "zh"):
    """保存疼痛记录"""
    lang = "en" if accept_language and accept_language.startswith("en") else "zh"
    if not supabase_client:
        err = "Supabase not configured" if lang == "en" else "Supabase 未配置"
        return {"error": err}
    try:
        user_id = get_supabase_user(authorization, lang)
    except HTTPException:
        err = "Authentication required" if lang == "en" else "需要身份验证"
        return {"error": err}'''

if old in content:
    content = content.replace(old, new)
    changes.append("Added bilingual support to POST /api/pain-records")

# Fix 6: GET /api/pain-records
old = '''@app.get("/api/pain-records")
def list_pain_records(limit: int = 50, authorization: str = Header(None)):
    """获取用户的疼痛记录历史"""
    if not supabase_client:
        return {"error": "Supabase not configured"}
    try:
        user_id = get_supabase_user(authorization)
    except HTTPException:
        return {"error": "Authentication required"}'''

new = '''@app.get("/api/pain-records")
def list_pain_records(limit: int = 50, authorization: str = Header(None), accept_language: str = "zh"):
    """获取用户的疼痛记录历史"""
    lang = "en" if accept_language and accept_language.startswith("en") else "zh"
    if not supabase_client:
        err = "Supabase not configured" if lang == "en" else "Supabase 未配置"
        return {"error": err}
    try:
        user_id = get_supabase_user(authorization, lang)
    except HTTPException:
        err = "Authentication required" if lang == "en" else "需要身份验证"
        return {"error": err}'''

if old in content:
    content = content.replace(old, new)
    changes.append("Added bilingual support to GET /api/pain-records")

# Fix 7: Fix undefined variables in en fallback
old = 'allergies: {allergies}. Lifestyle:'
new = 'allergies: {risk_warning}. Lifestyle:'
if old in content:
    content = content.replace(old, new)
    changes.append("Fixed undefined 'allergies' variable in en fallback")

old = 'Obstetrical History: {repo_desc}.'
new = 'Obstetrical History: {obstetric_history}.'
if old in content:
    content = content.replace(old, new)
    changes.append("Fixed undefined 'repo_desc' variable in en fallback")

# Fix 8: Add risk_warning variable in en fallback section
old = '''        else:
            return {
                "status": "success",
                "language": "en",
                "chief_complaint": f"Cyclic dysmenorrhea with lower abdominal pain.",
                "present_illness": f"The patient reports cyclic, spasmodic lower abdominal pain associated with menses. Pain intensity is quantified based on visual drawing telemetry. Aggravated during menses with localized pelvic sensation of {pain_name}.",
                "past_history": f"Past History: Generally healthy. Surgery: {surg_desc}. Allergies: {risk_warning}. Lifestyle: {lifestyle_final}.",'''

if old in content:
    content = content.replace(old, new)
    changes.append("Fixed risk_warning variable reference in en fallback")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Backend fixes ({len(changes)}):")
for c in changes:
    print(f"  - {c}")
