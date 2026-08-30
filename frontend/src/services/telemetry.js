// src/services/telemetry.js

const SESSIONS_KEY = 'painscape_telemetry_sessions';
const PAINTING_KEY = 'painscape_telemetry_painting';
const QUICK_RECORD_KEY = 'painscape_telemetry_quick_record';
const REPORT_EVENTS_KEY = 'painscape_telemetry_report_events';
// 新增存储键
const DRAFT_ACTIONS_KEY = 'painscape_telemetry_draft_actions';
const HISTORY_ACTIONS_KEY = 'painscape_telemetry_history_actions';


class TelemetryService {
  constructor() {
    this.currentSessionId = null;
    this.currentTab = 'partner';
    this.tabStartTime = Date.now();
  }

  // 生成唯一 Session ID
  generateSessionId() {
    this.currentSessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    return this.currentSessionId;
  }

  getSessionId() {
    if (!this.currentSessionId) {
      this.generateSessionId();
    }
    return this.currentSessionId;
  }

  // 辅助存储方法
  _saveItem(key, record) {
    try {
      const records = JSON.parse(localStorage.getItem(key) || '[]');
      records.push(record);
      localStorage.setItem(key, JSON.stringify(records));
    } catch (e) {
      console.warn(`[Telemetry] Failed to save to ${key}:`, e);
    }
  }

  // ================= 1. sessions（会话主表） =================
  startSession({ userId, mode, entryPoint = 'canvas' }) {
    const sessionId = this.generateSessionId();
    const sessionRecord = {
      session_id: sessionId,
      user_id: userId || 'anonymous',
      start_time: new Date().toISOString(),
      end_time: null,
      mode: mode || 'clinical', // clinical / daily
      entry_point: entryPoint, // canvas / quick_record
      profile_completed: false
    };
    this._saveItem(SESSIONS_KEY, sessionRecord);
    return sessionId;
  }

  updateSession(fields = {}) {
    try {
      const records = JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]');
      const index = records.findIndex(r => r.session_id === this.currentSessionId);
      if (index !== -1) {
        records[index] = { ...records[index], ...fields };
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(records));
      }
    } catch (e) {
      console.warn('[Telemetry] updateSession failed:', e);
    }
  }

  endSession() {
    this.updateSession({ end_time: new Date().toISOString() });
  }

  // ================= 2. painting_data（绘画数据） =================
  logPaintingData({
    startTime,
    endTime = new Date().toISOString(),
    // durationMs,
    brushesUsed,
    totalStrokes,
    avgPressure,
    maxPressure,
    colorsUsed,
    canvasView,
    undoCount,
    clearCount,
    dominantPainType,
    painScore,
    savedOnly = false
  }) {
    // ✅ 从时间戳计算 duration，不单独存储
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = Math.max(0, end - start);

    const record = {
      session_id: this.getSessionId(),
      start_time: startTime,
      end_time: endTime,
      duration_ms: durationMs, 
      brushes_used: brushesUsed || {},
      total_strokes: totalStrokes || 0,
      avg_pressure: parseFloat(avgPressure?.toFixed(2) || 0),
      max_pressure: parseFloat(maxPressure?.toFixed(2) || 0),
      colors_used: colorsUsed || [],
      canvas_view: canvasView || 'front', // front / back / blind
      undo_count: undoCount || 0,
      clear_count: clearCount || 0,
      dominant_pain_type: dominantPainType || 'twist',
      pain_score: painScore || null,
      saved_only: savedOnly
    };
    this._saveItem(PAINTING_KEY, record);
  }

  // ================= 3. quick_record_data（快速记录数据） =================
  logQuickRecordData({
    painTypeSelected,
    pressureValue,
    colorTemperature,
    holdDurationMs
  }) {
    const record = {
      session_id: this.getSessionId(),
      pain_type_selected: painTypeSelected, // twist/pierce/sink/swell/scrape
      pressure_value: pressureValue, // 20-100
      color_temperature: colorTemperature, // 冷/暖
      hold_duration_ms: holdDurationMs
    };
    this._saveItem(QUICK_RECORD_KEY, record);
  }

  // ================= 4. report_events（报告页交互事件） =================
  logReportEvent({
    outputType, // partner / timeoff / medical / selfcare
    eventType,  // tab_viewed / edited / ai_refined / regenerated / rejected / bilingual_toggled / saved / shared / published / entered_selfcare
    fieldName = null,
    timeSpentMs = null,
    originalText = null,
    editedText = null,
    extra = null
  }) {
    const record = {
      session_id: this.getSessionId(),
      timestamp: new Date().toISOString(),
      output_type: outputType || this.currentTab,
      event_type: eventType,
      field_name: fieldName,
      time_spent_ms: timeSpentMs,
      original_text: originalText,
      edited_text: editedText,
      extra: extra || null
    };
    this._saveItem(REPORT_EVENTS_KEY, record);
  }

  // Tab 切换自动计算停留时长打点
  switchTab(newTab) {
    const now = Date.now();
    const timeSpentMs = now - this.tabStartTime;
    // 记录离开上一 Tab 的停留时长及进入新 Tab 事件
    this.logReportEvent({
      outputType: newTab,
      event_type: 'tab_viewed',
      timeSpentMs: timeSpentMs
    });
    this.currentTab = newTab;
    this.tabStartTime = now;
  }

  // ================= 5. draft_actions（草稿箱用户行为） =================
  logDraftAction({
    action,        // save_draft / view_draft_box / open_draft / generate_from_draft / delete_draft
    draftId = null,
    brushCount = 0,
    particleCount = 0,
    fromPage = 'canvas', // canvas / history
  }) {
    const record = {
      session_id: this.getSessionId(),
      timestamp: new Date().toISOString(),
      action: action,
      draft_id: draftId,
      brush_count: brushCount,
      particle_count: particleCount,
      from_page: fromPage,
    };
    this._saveItem(DRAFT_ACTIONS_KEY, record);
  }

  // ================= 6. history_actions（历史记录用户行为） =================
  logHistoryAction({
    action,        // view_history / search / filter_by_pain / clear_search / switch_view / select_date / compare_records / clear_compare / view_record_detail / delete_record / export_records / share_record / publish_record
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
    this._saveItem(HISTORY_ACTIONS_KEY, record);
  }

  // ================= 便捷方法：草稿箱行为 =================
  logDraftSaved({ draftId, brushCount, particleCount, fromPage = 'canvas' }) {
    this.logDraftAction({
      action: 'save_draft',
      draftId,
      brushCount,
      particleCount,
      fromPage
    });
  }

  // 修复 logDraftBoxViewed 方法
  logDraftBoxViewed({ fromPage = 'canvas', draftCount = 0 }) {
    this._saveDraftAction({
      session_id: this.getSessionId(),
      timestamp: new Date().toISOString(),
      action: 'view_draft_box',
      from_page: fromPage,
      extra: { draft_count: draftCount }
    });
  }

  // 修正：支持 extra 字段
  _saveDraftAction(record) {
    this._saveItem(DRAFT_ACTIONS_KEY, record);
  }

  logDraftBoxViewedWithCount({ fromPage = 'canvas', draftCount = 0 }) {
    this._saveDraftAction({
      session_id: this.getSessionId(),
      timestamp: new Date().toISOString(),
      action: 'view_draft_box',
      from_page: fromPage,
      extra: { draft_count: draftCount }
    });
  }

  logDraftOpened({ draftId, brushCount, particleCount }) {
    this.logDraftAction({
      action: 'open_draft',
      draftId,
      brushCount,
      particleCount
    });
  }

  logDraftGenerated({ draftId, brushCount, particleCount }) {
    this.logDraftAction({
      action: 'generate_from_draft',
      draftId,
      brushCount,
      particleCount
    });
  }

  logDraftDeleted({ draftId, brushCount, particleCount }) {
    this.logDraftAction({
      action: 'delete_draft',
      draftId,
      brushCount,
      particleCount
    });
  }

  // ================= 便捷方法：历史记录行为 =================
  logHistoryViewed({ recordCount = 0 }) {
    this.logHistoryAction({
      action: 'view_history',
      recordCount
    });
  }

  logHistorySearched({ query, resultCount = 0 }) {
    this.logHistoryAction({
      action: 'search',
      searchQuery: query,
      recordCount: resultCount
    });
  }

  logHistoryFiltered({ painType, resultCount = 0 }) {
    this.logHistoryAction({
      action: 'filter_by_pain',
      painTypeFilter: painType,
      recordCount: resultCount
    });
  }

  logHistoryClearedSearch() {
    this.logHistoryAction({
      action: 'clear_search'
    });
  }

  logHistoryViewSwitched({ viewMode, recordCount = 0 }) {
    this.logHistoryAction({
      action: 'switch_view',
      viewMode,
      recordCount
    });
  }

  logHistoryDateSelected({ selectedDate, recordCount = 0 }) {
    this.logHistoryAction({
      action: 'select_date',
      selectedDate,
      recordCount
    });
  }

  logHistoryCompared({ sourceId, targetId, sameType = false, sameDay = false, daysDiff = 0 }) {
    this.logHistoryAction({
      action: 'compare_records',
      extra: {
        source_id: sourceId,
        target_id: targetId,
        same_type: sameType,
        same_day: sameDay,
        days_diff: daysDiff
      }
    });
  }

  logHistoryClearedCompare() {
    this.logHistoryAction({
      action: 'clear_compare'
    });
  }

  logHistoryRecordViewed({ recordId, hasReport = false, isQuickLog = false }) {
    this.logHistoryAction({
      action: 'view_record_detail',
      extra: {
        record_id: recordId,
        has_report: hasReport,
        is_quick_log: isQuickLog
      }
    });
  }

  logHistoryRecordDeleted({ recordId }) {
    this.logHistoryAction({
      action: 'delete_record',
      extra: { record_id: recordId }
    });
  }

  logHistoryExported({ count }) {
    this.logHistoryAction({
      action: 'export_records',
      exportCount: count
    });
  }

  logHistoryRecordShared({ recordId }) {
    this.logHistoryAction({
      action: 'share_record',
      extra: { record_id: recordId }
    });
  }

  logHistoryRecordPublished({ recordId, hasCustomText = false }) {
    this.logHistoryAction({
      action: 'publish_record',
      extra: {
        record_id: recordId,
        has_custom_text: hasCustomText
      }
    });
  }

  // ================= CSV & JSON 数据导出工具 =================
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

  exportAllAsCSV() {
    const tables = [
      { name: 'sessions', key: SESSIONS_KEY },
      { name: 'painting_data', key: PAINTING_KEY },
      { name: 'quick_record_data', key: QUICK_RECORD_KEY },
      { name: 'report_events', key: REPORT_EVENTS_KEY },
      { name: 'draft_actions', key: DRAFT_ACTIONS_KEY },      // 新增
      { name: 'history_actions', key: HISTORY_ACTIONS_KEY }   // 新增
    ];

    tables.forEach(t => {
      const data = JSON.parse(localStorage.getItem(t.key) || '[]');
      if (data.length > 0) {
        const csv = this._convertToCSV(data);
        this._downloadFile("\ufeff" + csv, `painscape_telemetry_${t.name}_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
      }
    });
  }

  exportAllAsJSON() {
    const fullData = {
      sessions: JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]'),
      painting_data: JSON.parse(localStorage.getItem(PAINTING_KEY) || '[]'),
      quick_record_data: JSON.parse(localStorage.getItem(QUICK_RECORD_KEY) || '[]'),
      report_events: JSON.parse(localStorage.getItem(REPORT_EVENTS_KEY) || '[]'),
      draft_actions: JSON.parse(localStorage.getItem(DRAFT_ACTIONS_KEY) || '[]'),      // 新增
      history_actions: JSON.parse(localStorage.getItem(HISTORY_ACTIONS_KEY) || '[]')    // 新增
    };
    this._downloadFile(JSON.stringify(fullData, null, 2), `painscape_telemetry_all_${Date.now()}.json`, 'application/json');
  }

  clearTelemetry() {
    localStorage.removeItem(SESSIONS_KEY);
    localStorage.removeItem(PAINTING_KEY);
    localStorage.removeItem(QUICK_RECORD_KEY);
    localStorage.removeItem(REPORT_EVENTS_KEY);
    localStorage.removeItem(DRAFT_ACTIONS_KEY);   // 新增
    localStorage.removeItem(HISTORY_ACTIONS_KEY); // 新增
  }
}

export const telemetry = new TelemetryService();
export default telemetry;