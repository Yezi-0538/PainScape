// src/services/telemetry.js
//心跳式会话存活、字段枚举统一、事件时间戳、去重、导出包含事件类型

const SESSIONS_KEY = 'painscape_telemetry_sessions';
const PAINTING_KEY = 'painscape_telemetry_painting';
const QUICK_RECORD_KEY = 'painscape_telemetry_quick_record';
const REPORT_EVENTS_KEY = 'painscape_telemetry_report_events';
const DRAFT_ACTIONS_KEY = 'painscape_telemetry_draft_actions';
const HISTORY_ACTIONS_KEY = 'painscape_telemetry_history_actions';

// 画笔内部名 twist/pierce/sink/swell/scrape
const BRUSH_NAME_MAP = { heavy: 'sink', wave: 'swell' };
const CANONICAL_BRUSHES = ['twist', 'pierce', 'sink', 'swell', 'scrape'];
// 输出类型内部名 
const OUTPUT_TYPE_MAP = { self: 'selfcare', work: 'timeoff', doctor: 'medical' };
// 会话模式内部名 
const MODE_MAP = { medical: 'clinical', general: 'daily' };

class TelemetryService {
  constructor() {
    this.currentSessionId = null;
    this.currentTab = 'partner';
    this.tabStartTime = Date.now();
    this._lastHeartbeatAt = 0;
  }

  // ============ 通用辅助 ============
  _uid(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  _readAll(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (e) {
      return [];
    }
  }

  // 追加写入 + 精确去重（同一 session 同一秒内相同记录只保留一条）
  _saveItem(key, record, { dedupeWindowMs = 2000 } = {}) {
    try {
      const records = this._readAll(key);
      const now = Date.now();
      if (dedupeWindowMs > 0) {
        const dup = records.some(r => {
          if (r.session_id !== record.session_id) return false;
          if (r.action !== record.action || r.event_type !== record.event_type) return false;
          const t = r.timestamp ? new Date(r.timestamp).getTime() : now;
          return Math.abs(t - now) < dedupeWindowMs;
        });
        if (dup) return;
      }
      records.push(record);
      localStorage.setItem(key, JSON.stringify(records));
    } catch (e) {
      console.warn(`[Telemetry] Failed to save to ${key}:`, e);
    }
  }

  _canonicalBrushes(brushes) {
    const out = {};
    CANONICAL_BRUSHES.forEach(b => { out[b] = 0; });
    Object.entries(brushes || {}).forEach(([k, v]) => {
      const name = BRUSH_NAME_MAP[k] || k;
      out[name] = (out[name] || 0) + (v || 0);
    });
    return out;
  }

  _canonicalOutputType(t) {
    return OUTPUT_TYPE_MAP[t] || t || this.currentTab;
  }

  _canonicalMode(m) {
    return MODE_MAP[m] || m || 'clinical';
  }

  // ============ 1. sessions（会话主表） ============
  startSession({ userId, mode, entryPoint = 'canvas' }) {
    const sessionId = this._uid('sess');
    this.currentSessionId = sessionId;
    const now = new Date().toISOString();
    const sessionRecord = {
      session_id: sessionId,
      user_id: userId || 'anonymous',
      start_time: now,
      end_time: now, // 心跳更新：移动端 beforeunload 不可靠，靠后续事件持续刷新
      mode: this._canonicalMode(mode), // clinical / daily
      entry_point: entryPoint,         // canvas / quick_record
      profile_completed: false
    };
    this._saveItem(SESSIONS_KEY, sessionRecord, { dedupeWindowMs: 0 });
    this._lastHeartbeatAt = Date.now();
    return sessionId;
  }

  // 每次打点顺带刷新会话 end_time（移动端关闭/切后台事件不可靠，心跳兜底）
  _heartbeat() {
    if (!this.currentSessionId) return;
    const now = Date.now();
    if (now - this._lastHeartbeatAt < 5000) return; // 最多 5 秒刷一次
    this._lastHeartbeatAt = now;
    try {
      const records = this._readAll(SESSIONS_KEY);
      const index = records.findIndex(r => r.session_id === this.currentSessionId);
      if (index !== -1) {
        records[index].end_time = new Date(now).toISOString();
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(records));
      }
    } catch (e) {
      console.warn('[Telemetry] heartbeat failed:', e);
    }
  }

  getSessionId() {
    if (!this.currentSessionId) {
      // 修复：使用 _uid 方法生成
      const id = this._uid('sess');
      try {
        const sessions = JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]');
        if (!sessions.some(s => s.session_id === id)) {
          this._saveItem(SESSIONS_KEY, {
            session_id: id,
            user_id: 'unknown',
            start_time: new Date().toISOString(),
            end_time: null,
            mode: 'unknown',
            entry_point: 'canvas',
            profile_completed: false,
          });
        }
      } catch (e) {
        console.warn('[Telemetry] lazy session failed:', e);
      }
      this.currentSessionId = id;
    }
    return this.currentSessionId;
  }

  updateSession(fields = {}) {
    try {
      const records = this._readAll(SESSIONS_KEY);
      const index = records.findIndex(r => r.session_id === this.currentSessionId);
      if (index !== -1) {
        const patch = { ...fields };
        if (patch.mode) patch.mode = this._canonicalMode(patch.mode);
        records[index] = { ...records[index], ...patch };
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(records));
      }
    } catch (e) {
      console.warn('[Telemetry] updateSession failed:', e);
    }
  }

  endSession() {
    this.updateSession({ end_time: new Date().toISOString() });
  }

  // ============ 2. painting_data（绘画数据） ============
  // 注意：绘画结束瞬间必须立即调用（点完成/存草稿/生成翻译时），不要等页面关闭。
  logPaintingData({
    paintingId = null,
    draftId = null,
    startTime,
    endTime = new Date().toISOString(),
    brushesUsed,
    totalStrokes,
    avgPressure,
    maxPressure,
    avgContactArea = null,   // 手指接触面积强度（0-1），手指场景的强度代理
    intensitySource = null,  // 'stylus_pressure' | 'contact_area' | 'velocity_proxy'
    colorsUsed,
    canvasView,
    undoCount,
    clearCount,
    dominantPainType,
    painScore,
    blindMode = false,
    savedOnly = false
  }) {
    const durationMs = Math.max(0, new Date(endTime) - new Date(startTime));
    const canonicalBrushes = this._canonicalBrushes(brushesUsed);
    const record = {
      painting_id: paintingId || this._uid('paint'),
      draft_id: draftId,
      session_id: this.getSessionId(),
      start_time: startTime,
      end_time: endTime,
      duration_ms: durationMs,
      brushes_used: canonicalBrushes,
      total_strokes: totalStrokes || Object.values(canonicalBrushes).reduce((a, b) => a + b, 0),
      avg_pressure: avgPressure != null ? parseFloat(avgPressure.toFixed(2)) : null,
      max_pressure: maxPressure != null ? parseFloat(maxPressure.toFixed(2)) : null,
      avg_contact_area: avgContactArea != null ? parseFloat(avgContactArea.toFixed(3)) : null,
      intensity_source: intensitySource,
      colors_used: colorsUsed || [],
      canvas_view: blindMode ? 'blind' : (canvasView || 'front'), // front / back / blind
      blind_mode: !!blindMode,
      undo_count: undoCount || 0,
      clear_count: clearCount || 0,
      dominant_pain_type: BRUSH_NAME_MAP[dominantPainType] || dominantPainType || 'twist',
      pain_score: painScore ?? null,
      saved_only: !!savedOnly
    };
    this._saveItem(PAINTING_KEY, record, { dedupeWindowMs: 0 });
    this._heartbeat();
  }

  // ============ 3. quick_record_data（快速记录数据） ============
  logQuickRecordData({
    painTypeSelected,
    pressureValue,
    colorTemperature,
    holdDurationMs
  }) {
    const record = {
      session_id: this.getSessionId(),
      timestamp: new Date().toISOString(),
      pain_type_selected: BRUSH_NAME_MAP[painTypeSelected] || painTypeSelected,
      pressure_value: pressureValue,      // 0-100（呼吸球）
      color_temperature: colorTemperature, // 冷/暖
      hold_duration_ms: holdDurationMs
    };
    this._saveItem(QUICK_RECORD_KEY, record, { dedupeWindowMs: 0 });
    this._heartbeat();
  }

  // ============ 4. report_events（报告页交互事件） ============
  // event_type: tab_viewed / generated / regenerated / manual_edit / ai_refined /
  //             bilingual_toggled / shared / entered_selfcare
  logReportEvent({
    outputType,
    eventType = 'tab_viewed',
    fieldName = null,
    timeSpentMs = null,
    originalText = null,
    editedText = null,
    provenance = null,      // 被编辑段的来源标注：'user' / 'ai' / 'ai_then_edited'
    generationSource = null, // 'immediate' / 'draft_box'
    extra = null
  }) {
    const record = {
      session_id: this.getSessionId(),
      timestamp: new Date().toISOString(),
      output_type: this._canonicalOutputType(outputType),
      event_type: eventType,
      field_name: fieldName,
      time_spent_ms: timeSpentMs,
      generation_source: generationSource,
      provenance: provenance,
      original_text: originalText,
      edited_text: editedText,
      extra: extra || null
    };
    // tab_viewed 去重（同 tab 2 秒内重复进入只记一次）
    const dedupe = eventType === 'tab_viewed' ? 2000 : 0;
    this._saveItem(REPORT_EVENTS_KEY, record, { dedupeWindowMs: dedupe });
    this._heartbeat();
  }

  // Tab 切换：记录进入新 tab 事件（停留时长供分析端用时间戳差计算）
  switchTab(newTab) {
    const now = Date.now();
    const timeSpentMs = now - this.tabStartTime;
    this.logReportEvent({
      outputType: newTab,
      eventType: 'tab_viewed',
      timeSpentMs
    });
    this.currentTab = this._canonicalOutputType(newTab);
    this.tabStartTime = now;
  }

  // 首次生成 / 重新生成（把生成与 tab 浏览区分开）
  logTranslationGenerated({ outputType, generationSource = 'immediate', regenerated = false, extra = null }) {
    this.logReportEvent({
      outputType,
      eventType: regenerated ? 'regenerated' : 'generated',
      generationSource,
      extra
    });
  }

  // ============ 5. draft_actions（草稿箱用户行为） ============
  logDraftAction({
    action,        // save_draft / view_draft_box / open_draft / generate_from_draft / delete_draft
    draftId = null,
    brushCount = 0,
    particleCount = 0,
    draftCount = null,
    fromPage = 'canvas', // canvas / draft_box / history
    generationSource = null
  }) {
    const record = {
      session_id: this.getSessionId(),
      timestamp: new Date().toISOString(),
      action: action,
      draft_id: draftId,
      brush_count: brushCount,
      particle_count: particleCount,
      from_page: fromPage,
      extra: draftCount != null ? { draft_count: draftCount } : null
    };
    if (action === 'generate_from_draft') {
      record.generation_source = 'draft_box';
    } else if (generationSource) {
      record.generation_source = generationSource;
    }
    // view_draft_box 去重（2 秒内重复进入）
    const dedupe = action === 'view_draft_box' ? 2000 : 0;
    this._saveItem(DRAFT_ACTIONS_KEY, record, { dedupeWindowMs: dedupe });
    this._heartbeat();
  }

  logDraftSaved({ draftId, brushCount, particleCount, fromPage = 'canvas' }) {
    this.logDraftAction({ action: 'save_draft', draftId, brushCount, particleCount, fromPage });
  }

  logDraftBoxViewed({ fromPage = 'canvas', draftCount = 0 }) {
    this.logDraftAction({ action: 'view_draft_box', fromPage, draftCount });
  }

  logDraftOpened({ draftId, brushCount, particleCount, fromPage = 'canvas' }) {
    this.logDraftAction({ action: 'open_draft', draftId, brushCount, particleCount, fromPage });
  }

  logDraftGenerated({ draftId, brushCount, particleCount, fromPage = 'draft_box' }) {
    this.logDraftAction({ action: 'generate_from_draft', draftId, brushCount, particleCount, fromPage });
  }

  logDraftDeleted({ draftId, brushCount, particleCount }) {
    this.logDraftAction({ action: 'delete_draft', draftId, brushCount, particleCount });
  }

  // ============ 6. history_actions（历史记录用户行为） ============
  logHistoryAction({
    action,        // view_history / search / filter_by_pain / clear_search / switch_view /
    // select_date / compare_records / clear_compare / view_record_detail /
    // delete_record / export_records / share_record / publish_record
    searchQuery = null,
    painTypeFilter = null,
    viewMode = null, // calendar / timeline
    selectedDate = null,
    recordCount = 0,
    extra = null
  }) {
    const record = {
      session_id: this.getSessionId(),
      timestamp: new Date().toISOString(),
      action: action,
      search_query: searchQuery,
      pain_type_filter: painTypeFilter,
      view_mode: viewMode,
      selected_date: selectedDate,
      record_count: recordCount,
      extra: extra || null
    };
    // view_history 2 秒内去重（修双发问题）
    const dedupe = action === 'view_history' ? 2000 : 0;
    this._saveItem(HISTORY_ACTIONS_KEY, record, { dedupeWindowMs: dedupe });
    this._heartbeat();
  }

  logHistoryViewed({ recordCount = 0 }) {
    this.logHistoryAction({ action: 'view_history', recordCount });
  }

  logHistorySearched({ query, resultCount = 0 }) {
    this.logHistoryAction({ action: 'search', searchQuery: query, recordCount: resultCount });
  }

  logHistoryFiltered({ painType, resultCount = 0 }) {
    this.logHistoryAction({ action: 'filter_by_pain', painTypeFilter: painType, recordCount: resultCount });
  }

  logHistoryClearedSearch() {
    this.logHistoryAction({ action: 'clear_search' });
  }

  logHistoryViewSwitched({ viewMode, recordCount = 0 }) {
    this.logHistoryAction({ action: 'switch_view', viewMode, recordCount });
  }

  logHistoryDateSelected({ selectedDate, recordCount = 0 }) {
    this.logHistoryAction({ action: 'select_date', selectedDate, recordCount });
  }

  logHistoryCompared({ sourceId, targetId, sameType = false, sameDay = false, daysDiff = 0 }) {
    this.logHistoryAction({
      action: 'compare_records',
      extra: { source_id: sourceId, target_id: targetId, same_type: sameType, same_day: sameDay, days_diff: daysDiff }
    });
  }

  logHistoryClearedCompare() {
    this.logHistoryAction({ action: 'clear_compare' });
  }

  logHistoryRecordViewed({ recordId, hasReport = false, isQuickLog = false }) {
    this.logHistoryAction({
      action: 'view_record_detail',
      extra: { record_id: recordId, has_report: hasReport, is_quick_log: isQuickLog }
    });
  }

  logHistoryRecordDeleted({ recordId }) {
    this.logHistoryAction({ action: 'delete_record', extra: { record_id: recordId } });
  }

  logHistoryExported({ count = 0 }) {
    this.logHistoryAction({ action: 'export_records', extra: { export_count: count } });
  }

  logHistoryRecordShared({ recordId, destination = null }) {
    this.logHistoryAction({ action: 'share_record', extra: { record_id: recordId, destination } });
  }

  logHistoryRecordPublished({ recordId, hasCustomText = false, anonymous = null, blurLevel = null }) {
    this.logHistoryAction({
      action: 'publish_record',
      extra: { record_id: recordId, has_custom_text: hasCustomText, anonymous, blur_level: blurLevel }
    });
  }

  // ============ CSV & JSON 导出 ============
  _convertToCSV(objArray) {
    if (!objArray || !objArray.length) return '';
    const headers = Object.keys(objArray[0]);
    const rows = objArray.map(obj =>
      headers.map(field => {
        let val = obj[field];
        if (typeof val === 'object' && val !== null) {
          val = JSON.stringify(val).replace(/"/g, '""');
        } else if (typeof val === 'string') {
          val = val.replace(/"/g, '""').replace(/\n/g, ' ');
        }
        return `"${val ?? ''}"`;
      }).join(',')
    );
    return [headers.join(','), ...rows].join('\r\n');
  }

  _downloadFile(content, fileName, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  _tables() {
    return [
      { name: 'sessions', key: SESSIONS_KEY },
      { name: 'painting_data', key: PAINTING_KEY },
      { name: 'quick_record_data', key: QUICK_RECORD_KEY },
      { name: 'report_events', key: REPORT_EVENTS_KEY },
      { name: 'draft_actions', key: DRAFT_ACTIONS_KEY },
      { name: 'history_actions', key: HISTORY_ACTIONS_KEY }
    ];
  }

  exportAllAsCSV() {
    this._tables().forEach(t => {
      const data = this._readAll(t.key);
      if (data.length > 0) {
        const csv = this._convertToCSV(data);
        this._downloadFile("﻿" + csv, `painscape_telemetry_${t.name}_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
      }
    });
  }

  exportAllAsJSON() {
    const fullData = {};
    this._tables().forEach(t => { fullData[t.name] = this._readAll(t.key); });
    this._downloadFile(JSON.stringify(fullData, null, 2), `painscape_telemetry_all_${Date.now()}.json`, 'application/json');
  }

  clearTelemetry() {
    this._tables().forEach(t => localStorage.removeItem(t.key));
  }
}

export const telemetry = new TelemetryService();
export default telemetry;
