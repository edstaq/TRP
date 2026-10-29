/**
 * ==============================================================================
 * 🎓 EDSTAQ TRP (Teacher Reporting Portal) - OPTIMIZED UNIFIED BACKEND API
 * ==============================================================================
 * Features:
 *  ✅ 100% COLUMN-INDEPENDENT: Columns in Google Sheets can be in any order,
 *     renamed with different casing/spacing, or moved without breaking anything.
 *  ✅ ALL 7 APIS IN ONE: Teacher, Subject, Availability, Allocation, Session,
 *     Student Log, and Student Details.
 *  ✅ AUTOMATED EMAILS: Automatically notifies parents upon class completion.
 *  ✅ IN-MEMORY & SCRIPT CACHE: Faster reads and minimal quota usage.
 *  ✅ SAFARI / iOS WEB-KIT COMPATIBLE: Handles POST redirect body drops via query fallback.
 *
 * ------------------------------------------------------------------------------
 * 🚀 DEPLOYMENT INSTRUCTIONS:
 * ------------------------------------------------------------------------------
 * 1. Open Google Apps Script: https://script.google.com/
 * 2. Create a "New project" (Name: TRP Unified API).
 * 3. Replace all code in Code.gs with this file and save (Ctrl+S).
 * 4. Click "Deploy" > "New deployment".
 * 5. Choose type: "Web app".
 * 6. Execute as: "Me" | Who has access: "Anyone".
 * 7. Click "Deploy", approve permissions, and copy the Web App URL.
 * ==============================================================================
 */

// ==============================================================================
// ⚙️ GLOBAL CONFIGURATION
// ==============================================================================
const CONFIG = {
  // Master Sheet: Teacher, Teacher Availability, Subjects, Student
  MASTER_SHEET_ID: "1ZgBm9UTj9JIpQ_Iq2V8O8IVPNNXUazntu-KrLpORg_I",

  // Operations Sheet: Class Master (Sessions), Teacher Assign, Student Log, Upload File
  OPERATIONS_SHEET_ID: "16TYFgItwYH8VgNK_Hpn7BeDQ-xMt41pS2ZD8dLeAJLw",

  TIMEZONE: "Asia/Kolkata",
  CACHE_TTL: 300 // 5 minutes cache
};

const VALID_WEEKDAYS = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
];

// ==============================================================================
// 🌐 HTTP ENTRY POINTS (doGet & doPost)
// ==============================================================================

function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    if (params.data) {
      try { return routeAction(JSON.parse(params.data), e); } catch (_) {}
    }
    return routeAction(params, e);
  } catch (err) {
    return jsonResponse(false, err.message);
  }
}

function doPost(e) {
  try {
    let rawContent = (e && e.postData && e.postData.contents) ? e.postData.contents : "";
    if (!rawContent && e && e.parameter && e.parameter.data) {
      rawContent = e.parameter.data;
    }
    const body = rawContent ? JSON.parse(rawContent) : {};
    return routeAction(body, e);
  } catch (err) {
    return jsonResponse(false, err.message);
  }
}

/**
 * Central Router
 */
function routeAction(payload, e) {
  const action = payload.action || (e && e.parameter && e.parameter.action);
  if (!action) return jsonResponse(false, "Action is required");

  switch (action) {
    // 1. Teacher
    case "readByContact":
      return handleReadByContact(payload.contact);
    case "updateByContact":
      return handleUpdateByContact(payload.contact, payload.updateData);

    // 2. Subject
    case "readAllSubjects":
      return handleReadAllSubjects();
    case "readSubjectsByIds":
      return handleReadSubjectsByIds(payload.subjectIds);

    // 3. Availability
    case "read":
    case "readAvailability":
      return handleReadAvailability(payload.teacher_id || payload.teacherId);
    case "add":
    case "addAvailability":
      return handleAddAvailability(payload.data || payload);
    case "update":
    case "updateAvailability":
      return handleUpdateAvailability(payload.available_id || payload.availableId, payload.data || payload.updates);
    case "delete":
    case "deleteAvailability":
      return handleDeleteAvailability(payload.available_id || payload.availableId);

    // 4. Allocation & Session (dual handling of readByTeacherId)
    case "readAllocationsByTeacherId":
      return handleReadAllocationsByTeacherId(payload.teacher_id || payload.teacherId);
    case "readSessionsByTeacherId":
      return handleReadSessionsByTeacherId(payload.teacherId || payload.teacher_id);
    case "readByTeacherId":
      if (payload.module === "session" || payload.type === "session" || (payload.teacherId && !payload.teacher_id)) {
        return handleReadSessionsByTeacherId(payload.teacherId || payload.teacher_id);
      }
      return handleReadAllocationsByTeacherId(payload.teacher_id || payload.teacherId);

    // 5. Session Create & Update
    case "createSession":
    case "addSession":
      return handleCreateSession(payload.sessionData || payload);
    case "updateBySessionId":
      return handleUpdateBySessionId(payload.sessionId, payload.updateData);

    // 6. Student Logs
    case "readBySessionId":
      return handleReadStudentLogsBySessionId(payload.sessionId);
    case "bulkAdd":
    case "bulkAddLogs":
      return handleBulkAddStudentLogs(payload.logs);

    // 7. Student Details
    case "getStudentById":
      return handleGetStudentById(payload.studentId);

    // 8. Checklist Module
    case "readChecklistTemplates":
      return handleReadChecklistTemplates(payload.role || "Teacher");
    case "readChecklistBySessionId":
      return handleReadChecklistBySessionId(payload.sessionId || payload.session_id);
    case "saveSessionChecklist":
      return handleSaveSessionChecklist(payload.sessionId, payload.teacherId, payload.items || payload.data);

    default:
      return jsonResponse(false, "Invalid action: " + action);
  }
}

// ==============================================================================
// 🧠 COLUMN-INDEPENDENT DATA ENGINE
// ==============================================================================

/**
 * Normalizes any header name (removes spaces, symbols, underscores, lowercases)
 * e.g., "Teacher ID", "teacher_id", "TeacherId" all become "teacherid"
 */
function normKey(str) {
  if (str === null || str === undefined) return "";
  return String(str).toLowerCase().replace(/[\s_\-–—]/g, "");
}

/**
 * Opens a sheet and returns its headers, rows, and normalized column index map.
 * This guarantees 100% column independence.
 */
function getTableContext(sheetId, sheetName) {
  const ss = SpreadsheetApp.openById(sheetId);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error(`Sheet '${sheetName}' not found`);

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 1 || lastCol < 1) {
    return { sheet, headers: [], rows: [], normMap: {} };
  }

  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = values[0] || [];
  const rows = values.slice(1);

  const normMap = {};
  headers.forEach((h, i) => {
    if (h) normMap[normKey(h)] = i;
  });

  return { sheet, headers, rows, normMap };
}

/**
 * Converts a table row array into a key-value object using actual headers
 */
function rowToObj(headers, row, formatTypes = false) {
  const obj = {};
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (!h) continue;

    if (formatTypes) {
      if (isDateColumn(h)) {
        obj[h] = formatDateValue(row[i]);
      } else if (isTimeColumn(h)) {
        obj[h] = formatTimeValue(row[i]);
      } else {
        obj[h] = row[i];
      }
    } else {
      obj[h] = row[i];
    }
  }
  return obj;
}

/**
 * Updates row cells dynamically matching by column name anywhere on the sheet
 */
function updateRowByColNames(sheet, sheetRowNumber, normMap, updateObj) {
  const keys = Object.keys(updateObj);
  keys.forEach(k => {
    const colIdx = normMap[normKey(k)];
    if (colIdx !== undefined) {
      sheet.getRange(sheetRowNumber, colIdx + 1).setValue(updateObj[k]);
    }
  });
}

/**
 * Creates a row array filled by matching object keys to sheet columns
 */
function buildRowByColNames(headers, normMap, dataObj) {
  const row = new Array(headers.length).fill("");
  Object.keys(dataObj).forEach(k => {
    const colIdx = normMap[normKey(k)];
    if (colIdx !== undefined) {
      row[colIdx] = dataObj[k];
    }
  });
  return row;
}

// ==============================================================================
// 🧑‍🏫 1. TEACHER MODULE
// ==============================================================================

function handleReadByContact(contact) {
  if (!contact) return jsonResponse(false, "Contact is required");
  const ctx = getTableContext(CONFIG.MASTER_SHEET_ID, "Teacher");
  const contactCol = ctx.normMap["contact"];
  if (contactCol === undefined) return jsonResponse(false, "Contact column not found");

  const target = String(contact).trim();
  for (let i = 0; i < ctx.rows.length; i++) {
    if (String(ctx.rows[i][contactCol]).trim() === target) {
      return jsonResponse(true, "Record found", rowToObj(ctx.headers, ctx.rows[i]));
    }
  }
  return jsonResponse(false, "No record found");
}

function handleUpdateByContact(contact, updateData) {
  if (!contact || !updateData) return jsonResponse(false, "Contact and updateData required");
  const ctx = getTableContext(CONFIG.MASTER_SHEET_ID, "Teacher");
  const contactCol = ctx.normMap["contact"];
  if (contactCol === undefined) return jsonResponse(false, "Contact column not found");

  const target = String(contact).trim();
  for (let i = 0; i < ctx.rows.length; i++) {
    if (String(ctx.rows[i][contactCol]).trim() === target) {
      updateRowByColNames(ctx.sheet, i + 2, ctx.normMap, updateData);
      return jsonResponse(true, "Record updated successfully");
    }
  }
  return jsonResponse(false, "No record found");
}

// ==============================================================================
// 📚 2. SUBJECT MODULE
// ==============================================================================

function handleReadAllSubjects() {
  const ctx = getTableContext(CONFIG.MASTER_SHEET_ID, "Subjects");
  const idCol = ctx.normMap["subjectid"];
  if (idCol === undefined) return jsonResponse(false, "Subject ID column not found");

  const result = [];
  ctx.rows.forEach(r => {
    if (r[idCol]) result.push(rowToObj(ctx.headers, r));
  });
  return jsonResponse(true, "All subjects fetched", result);
}

function handleReadSubjectsByIds(subjectIds) {
  if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
    return jsonResponse(false, "subjectIds must be a non-empty array");
  }

  const cache = CacheService.getScriptCache();
  const cacheKey = "subjects_" + Utilities.base64Encode(
    Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, subjectIds.map(String).sort().join("|"))
  );
  const cached = cache.get(cacheKey);
  if (cached) return jsonResponse(true, "Subjects fetched by IDs (cache)", JSON.parse(cached));

  const ctx = getTableContext(CONFIG.MASTER_SHEET_ID, "Subjects");
  const idCol = ctx.normMap["subjectid"];
  if (idCol === undefined) return jsonResponse(false, "Subject ID column not found");

  const idSet = new Set(subjectIds.map(String));
  const result = [];
  ctx.rows.forEach(r => {
    if (r[idCol] && idSet.has(String(r[idCol]))) {
      result.push(rowToObj(ctx.headers, r));
    }
  });

  cache.put(cacheKey, JSON.stringify(result), CONFIG.CACHE_TTL);
  return jsonResponse(true, "Subjects fetched by IDs", result);
}

// ==============================================================================
// 🗓️ 3. TEACHER AVAILABILITY MODULE
// ==============================================================================

function handleReadAvailability(teacherId) {
  if (!teacherId) return jsonResponse(false, "Teacher ID is required");
  const ctx = getTableContext(CONFIG.MASTER_SHEET_ID, "Teacher Availability");
  const teacherCol = ctx.normMap["teacherid"];
  if (teacherCol === undefined) return jsonResponse(false, "Teacher ID column not found");

  const target = String(teacherId).trim();
  const result = ctx.rows
    .filter(r => String(r[teacherCol]).trim() === target)
    .map(r => rowToObj(ctx.headers, r));

  return jsonResponse(true, "Availability fetched", result);
}

function handleAddAvailability(input) {
  if (!input || typeof input !== "object") return jsonResponse(false, "Invalid availability data");
  const ctx = getTableContext(CONFIG.MASTER_SHEET_ID, "Teacher Availability");

  const availableIdKey = ctx.normMap["availableid"];
  const availableId = input["Available ID"] || input.availableId || Utilities.getUuid().replace(/-/g, "").slice(0, 8);

  const payload = { ...input, "Available ID": availableId };
  const row = buildRowByColNames(ctx.headers, ctx.normMap, payload);

  ctx.sheet.appendRow(row);
  return jsonResponse(true, "Availability added", { message: "Availability added", available_id: availableId });
}

function handleUpdateAvailability(availableId, updates) {
  if (!availableId || !updates) return jsonResponse(false, "Available ID and updates required");
  const ctx = getTableContext(CONFIG.MASTER_SHEET_ID, "Teacher Availability");
  const idCol = ctx.normMap["availableid"];
  if (idCol === undefined) return jsonResponse(false, "Available ID column not found");

  const target = String(availableId).trim();
  for (let i = 0; i < ctx.rows.length; i++) {
    if (String(ctx.rows[i][idCol]).trim() === target) {
      updateRowByColNames(ctx.sheet, i + 2, ctx.normMap, updates);
      return jsonResponse(true, "Availability updated", { message: "Availability updated" });
    }
  }
  return jsonResponse(false, "Available ID not found");
}

function handleDeleteAvailability(availableId) {
  if (!availableId) return jsonResponse(false, "Available ID required");
  const ctx = getTableContext(CONFIG.MASTER_SHEET_ID, "Teacher Availability");
  const idCol = ctx.normMap["availableid"];
  if (idCol === undefined) return jsonResponse(false, "Available ID column not found");

  const target = String(availableId).trim();
  for (let i = 0; i < ctx.rows.length; i++) {
    if (String(ctx.rows[i][idCol]).trim() === target) {
      ctx.sheet.deleteRow(i + 2);
      return jsonResponse(true, "Availability deleted", { message: "Availability deleted" });
    }
  }
  return jsonResponse(false, "Available ID not found");
}

// ==============================================================================
// 📋 4. ALLOCATION MODULE (Teacher Assign)
// ==============================================================================

function handleReadAllocationsByTeacherId(teacherId) {
  if (!teacherId) return jsonResponse(false, "Teacher ID is required");
  const ctx = getTableContext(CONFIG.OPERATIONS_SHEET_ID, "Teacher Assign");

  const teacherCol = ctx.normMap["teacherid"];
  const studentCol = ctx.normMap["studentid"];
  const subjectCol = ctx.normMap["subjectid"];

  if (teacherCol === undefined || studentCol === undefined || subjectCol === undefined) {
    return jsonResponse(false, "Required columns missing in Teacher Assign");
  }

  const studentMap = getStudentLookupMap();
  const subjectMap = getSubjectLookupMap();
  const target = String(teacherId).trim();
  const output = [];

  ctx.rows.forEach(row => {
    if (String(row[teacherCol]).trim() === target) {
      const obj = rowToObj(ctx.headers, row);
      const rawStudentIds = row[studentCol];
      const studentIds = rawStudentIds
        ? String(rawStudentIds).split(",").map(s => s.trim()).filter(Boolean)
        : [];

      obj["Student IDs"] = studentIds;
      obj["Student Names"] = studentIds.map(id => studentMap[id] || ("Student " + id));

      const subjectId = String(row[subjectCol]).trim();
      obj["Subject Label"] = subjectMap[subjectId] || "";

      output.push(obj);
    }
  });

  return jsonResponse(true, "Data fetched successfully", output);
}

function getStudentLookupMap() {
  try {
    const ctx = getTableContext(CONFIG.MASTER_SHEET_ID, "Student");
    const idCol = ctx.normMap["studentid"];
    const nameCol = ctx.normMap["studentname"];
    const map = {};
    if (idCol !== undefined && nameCol !== undefined) {
      ctx.rows.forEach(r => { if (r[idCol]) map[String(r[idCol]).trim()] = r[nameCol]; });
    }
    return map;
  } catch (_) { return {}; }
}

function getSubjectLookupMap() {
  try {
    const ctx = getTableContext(CONFIG.MASTER_SHEET_ID, "Subjects");
    const idCol = ctx.normMap["subjectid"];
    const labelCol = ctx.normMap["label"] || ctx.normMap["subjectname"];
    const map = {};
    if (idCol !== undefined && labelCol !== undefined) {
      ctx.rows.forEach(r => { if (r[idCol]) map[String(r[idCol]).trim()] = r[labelCol]; });
    }
    return map;
  } catch (_) { return {}; }
}

function getSubjectNameLookupMap() {
  try {
    const ctx = getTableContext(CONFIG.MASTER_SHEET_ID, "Subjects");
    const idCol = ctx.normMap["subjectid"];
    const nameCol = ctx.normMap["subjectname"] !== undefined ? ctx.normMap["subjectname"] : ctx.normMap["name"];
    const map = {};
    if (idCol !== undefined && nameCol !== undefined) {
      ctx.rows.forEach(r => {
        if (r[idCol] && r[nameCol]) {
          map[String(r[idCol]).trim()] = String(r[nameCol]).trim();
        }
      });
    }
    return map;
  } catch (_) { return {}; }
}

// ==============================================================================
// 📅 5. SESSION MODULE (Class Master & Files)
// ==============================================================================

function handleReadSessionsByTeacherId(teacherId) {
  if (!teacherId) return jsonResponse(false, "Teacher ID is required");
  const ctx = getTableContext(CONFIG.OPERATIONS_SHEET_ID, "Class Master");

  const teacherCol = ctx.normMap["teacherid"];
  const sessionCol = ctx.normMap["sessionid"];
  if (teacherCol === undefined || sessionCol === undefined) {
    return jsonResponse(false, "Required columns missing in Class Master");
  }

  const target = String(teacherId).trim();
  const fileMap = getFilesGroupedBySession();
  const result = [];

  ctx.rows.forEach(row => {
    if (String(row[teacherCol]).trim() === target) {
      const obj = rowToObj(ctx.headers, row, true);
      const sessId = String(row[sessionCol]).trim();
      obj["Files"] = fileMap[sessId] || [];
      result.push(obj);
    }
  });

  return jsonResponse(true, "Data fetched successfully", result);
}

function handleCreateSession(data) {
  try {
    if (!data) return jsonResponse(false, "Session data is required");

    const ctx = getTableContext(CONFIG.OPERATIONS_SHEET_ID, "Class Master");

    // 1. Session ID: 8 characters of lowercase [a-z0-9] (e.g. ff1f9619)
    let newSessionId = String(data.sessionId || data["Session ID"] || "").trim().toLowerCase();
    if (!newSessionId || newSessionId.length !== 8) {
      newSessionId = Utilities.getUuid().replace(/-/g, "").slice(0, 8).toLowerCase();
    }

    // 2. Format Date: DD/MM/YYYY for the sheet, YYYY-MM-DD for the Temp ID
    let rawDate = String(data.date || data["Date"] || "").trim();
    let formattedDate = rawDate;
    let ymdDate = "";
    if (rawDate.includes("-")) {
      const parts = rawDate.split("-");
      if (parts.length === 3 && parts[0].length === 4) {
        ymdDate = `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
        formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    } else if (rawDate.includes("/")) {
      const parts = rawDate.split("/");
      if (parts.length === 3) {
        ymdDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      }
    }

    // 3. Extract 24-hr HH:mm for Temp ID and 12-hr "hh:mm a" for Start/End Time
    function parseTo24Hour(timeStr) {
      if (!timeStr) return "";
      const t = String(timeStr).trim();
      const m = t.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
      if (m) {
        let h = parseInt(m[1], 10);
        const min = m[2];
        const ampm = m[3] ? m[3].toLowerCase() : null;
        if (ampm === "pm" && h < 12) h += 12;
        if (ampm === "am" && h === 12) h = 0;
        return `${String(h).padStart(2, "0")}:${min}`;
      }
      return t;
    }

    function to12HourFormat(timeStr) {
      if (!timeStr) return "";
      const t = String(timeStr).trim();
      if (/am|pm/i.test(t)) return t;
      const parts = t.split(":");
      if (parts.length >= 2) {
        let h = parseInt(parts[0], 10);
        const m = parts[1].padStart(2, "0");
        const ampm = h >= 12 ? "PM" : "AM";
        h = h % 12 || 12;
        return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
      }
      return t;
    }

    const rawStartTime = data.startTime || data["Start Time"] || "";
    const hhmmTime = parseTo24Hour(rawStartTime);
    const startTime12 = to12HourFormat(rawStartTime);
    const endTime12 = to12HourFormat(data.endTime || data["End Time"] || "");

    // 4. Session Temp Id: ${Teacher Assign ID}_${YYYY-MM-DD}_${HH:mm} (e.g. TAS162_2026-10-28_20:00)
    const assignId = String(data.teacherAssignId || data.assignId || data["Teacher Assign ID"] || "").trim();
    let newSessionTempId = String(data.sessionTempId || data["Session Temp Id"] || "").trim();
    if (!newSessionTempId) {
      if (assignId && ymdDate && hhmmTime) {
        newSessionTempId = `${assignId}_${ymdDate}_${hhmmTime}`;
      } else {
        newSessionTempId = assignId ? `${assignId}_${ymdDate || "SESSION"}` : newSessionId;
      }
    }

    const studentIds = Array.isArray(data.studentIds)
      ? data.studentIds.join(", ")
      : (data.studentId || data["Student ID"] || "");

    const subjectId = String(data.subjectId || data["Subject ID"] || "").trim();
    let resolvedSubjectName = String(data.subjectName || data["Subject name"] || data["Subject Name"] || "").trim();
    let resolvedSubjectLabel = String(data.subjectLabel || data["Subject label"] || data["Subject Label"] || "").trim();

    if (subjectId) {
      const subjectNameMap = getSubjectNameLookupMap();
      if (!resolvedSubjectName && subjectNameMap[subjectId]) {
        resolvedSubjectName = subjectNameMap[subjectId];
      }
      const subjectLabelMap = getSubjectLookupMap();
      if (!resolvedSubjectLabel && subjectLabelMap[subjectId]) {
        resolvedSubjectLabel = subjectLabelMap[subjectId];
      }
    }

    const entry = {
      "Session ID": newSessionId,
      "Session Temp Id": newSessionTempId,
      "Class Room ID": data.classRoomId || data["Class Room ID"] || "",
      "Teacher Assign ID": data.teacherAssignId || data.assignId || data["Teacher Assign ID"] || "",
      "Student ID": studentIds,
      "Subject ID": subjectId,
      "Teacher ID": data.teacherId || data["Teacher ID"] || "",
      "Date": formattedDate,
      "Start Time": startTime12,
      "End Time": endTime12,
      "Status": data.status || data["Status"] || "New Created",
      "Sessions per day": data.sessionsPerDay || data["Sessions per day"] || 1,
      "Student Limit": data.studentLimit || data["Student Limit"] || 1,
      "Subject label": resolvedSubjectLabel || resolvedSubjectName,
      "Subject name": resolvedSubjectName || resolvedSubjectLabel,
      "Class link": data.classLink || data.meetLink || data["Class link"] || "",
      "Topic covered": "",
      "Started Time": "",
      "Ended Time": ""
    };

    const row = buildRowByColNames(ctx.headers, ctx.normMap, entry);
    ctx.sheet.appendRow(row);

    return jsonResponse(true, "Session created successfully", {
      sessionId: newSessionId,
      session: entry
    });
  } catch (err) {
    return jsonResponse(false, "Failed to create session: " + err.message);
  }
}

function handleUpdateBySessionId(sessionId, updateData) {
  if (!sessionId || !updateData) return jsonResponse(false, "sessionId and updateData are required");
  const ctx = getTableContext(CONFIG.OPERATIONS_SHEET_ID, "Class Master");
  const sessionCol = ctx.normMap["sessionid"];
  if (sessionCol === undefined) return jsonResponse(false, "Session ID column not found");

  const target = String(sessionId).trim();
  for (let i = 0; i < ctx.rows.length; i++) {
    if (String(ctx.rows[i][sessionCol]).trim() === target) {
      updateRowByColNames(ctx.sheet, i + 2, ctx.normMap, updateData);

      // Trigger automatic completion email
      const statusKey = Object.keys(updateData).find(k => normKey(k) === "status");
      if (statusKey && String(updateData[statusKey]).trim().toLowerCase() === "completed") {
        try { NotifyCompletedSession(sessionId); } catch (e) { console.error("Mail err:", e); }
      }
      return jsonResponse(true, "Data updated successfully");
    }
  }
  return jsonResponse(false, "Session ID not found");
}

function getFilesGroupedBySession() {
  try {
    const ctx = getTableContext(CONFIG.OPERATIONS_SHEET_ID, "Upload File");
    const sessionCol = ctx.normMap["sessionid"];
    if (sessionCol === undefined) return {};

    const map = {};
    ctx.rows.forEach(r => {
      const sessId = String(r[sessionCol]).trim();
      if (!sessId) return;
      if (!map[sessId]) map[sessId] = [];

      const fileObj = {};
      ctx.headers.forEach((h, i) => {
        fileObj[h] = r[i] !== null && r[i] !== undefined ? String(r[i]) : "";
      });
      map[sessId].push(fileObj);
    });
    return map;
  } catch (_) { return {}; }
}

// ==============================================================================
// 📝 6. STUDENT LOG MODULE (Attendance & Ratings)
// ==============================================================================

function handleReadStudentLogsBySessionId(sessionId) {
  if (!sessionId) return jsonResponse(false, "Session ID is required");
  const ctx = getTableContext(CONFIG.OPERATIONS_SHEET_ID, "Student Log");
  const sessionCol = ctx.normMap["sessionid"];
  if (sessionCol === undefined) return jsonResponse(false, "Session ID column not found in Student Log");

  const target = String(sessionId).trim();
  const result = ctx.rows
    .filter(r => String(r[sessionCol]).trim() === target)
    .map(r => rowToObj(ctx.headers, r));

  return jsonResponse(true, "Data fetched successfully", result);
}

function handleBulkAddStudentLogs(logs) {
  if (!Array.isArray(logs) || logs.length === 0) {
    return jsonResponse(false, "Logs array is required");
  }

  const ctx = getTableContext(CONFIG.OPERATIONS_SHEET_ID, "Student Log");
  const studentMap = getStudentLookupMap();

  const rows = logs.map(log => {
    const logId = Utilities.getUuid().replace(/-/g, "").slice(0, 8);
    const studentName = studentMap[log.studentId] || "";

    const logEntry = {
      "Timestamp": new Date(),
      "Log ID": logId,
      "Session ID": log.sessionId || "",
      "Student ID": log.studentId || "",
      "Student Name": studentName,
      "Status": log.status || "",
      "Rating": log.rating || "",
      "Comment": log.comment || ""
    };

    return buildRowByColNames(ctx.headers, ctx.normMap, logEntry);
  });

  ctx.sheet.getRange(ctx.sheet.getLastRow() + 1, 1, rows.length, ctx.headers.length).setValues(rows);
  return jsonResponse(true, "Logs added successfully", { inserted: rows.length });
}

// ==============================================================================
// 👤 7. STUDENT DETAILS MODULE
// ==============================================================================

function handleGetStudentById(studentId) {
  if (!studentId) return jsonResponse(false, "Student ID is required");
  const ctx = getTableContext(CONFIG.MASTER_SHEET_ID, "Student");
  const idCol = ctx.normMap["studentid"];
  if (idCol === undefined) return jsonResponse(false, "Student ID column not found");

  const target = String(studentId).trim();
  for (let i = 0; i < ctx.rows.length; i++) {
    if (String(ctx.rows[i][idCol]).trim() === target) {
      return jsonResponse(true, "Student details fetched", rowToObj(ctx.headers, ctx.rows[i]));
    }
  }
  return jsonResponse(false, "Student not found");
}

// ==============================================================================
// 📧 AUTOMATED COMPLETION EMAIL NOTIFICATION
// ==============================================================================

function NotifyCompletedSession(sessionId) {
  if (!sessionId) return;
  const ctx = getTableContext(CONFIG.OPERATIONS_SHEET_ID, "Class Master");
  const sessionCol = ctx.normMap["sessionid"];
  if (sessionCol === undefined) return;

  const target = String(sessionId).trim();
  const row = ctx.rows.find(r => String(r[sessionCol]).trim() === target);
  if (!row) return;

  const sessionObj = rowToObj(ctx.headers, row);
  const studentIdCol = ctx.normMap["studentid"];
  if (studentIdCol === undefined || !row[studentIdCol]) return;

  const studentIds = String(row[studentIdCol]).split(",").map(s => s.trim());

  // Lookup students & teacher
  const studentCtx = getTableContext(CONFIG.MASTER_SHEET_ID, "Student");
  const teacherCtx = getTableContext(CONFIG.MASTER_SHEET_ID, "Teacher");

  const sIdCol = studentCtx.normMap["studentid"];
  const sMailCol = studentCtx.normMap["email"];
  const sNameCol = studentCtx.normMap["studentname"];
  const sDashCol = studentCtx.normMap["dashboard"];

  const studentEmails = [];
  let dashboardUrl = "https://edstaq.github.io/progress_dashboard/";

  studentIds.forEach(id => {
    const sRow = studentCtx.rows.find(r => String(r[sIdCol]).trim() === id);
    if (!sRow) return;
    if (sMailCol !== undefined && sRow[sMailCol]) studentEmails.push(sRow[sMailCol]);
    if (sDashCol !== undefined && sRow[sDashCol]) dashboardUrl = sRow[sDashCol];
  });

  if (studentEmails.length === 0) return;

  // Find Teacher Name
  let teacherName = "";
  const tIdCol = ctx.normMap["teacherid"];
  const teacherId = tIdCol !== undefined ? String(row[tIdCol]).trim() : "";
  const tRow = teacherCtx.rows.find(r => String(r[teacherCtx.normMap["teacherid"]]).trim() === teacherId);
  if (tRow) teacherName = tRow[teacherCtx.normMap["name"]] || "";

  const formattedDate = formatDateValue(sessionObj["Date"] || new Date());
  const expectedStart = formatTimeValue(sessionObj["Start Time"]);
  const expectedEnd = formatTimeValue(sessionObj["End Time"]);
  const actualStart = formatTimeValue(sessionObj["Started Time"]);
  const actualEnd = formatTimeValue(sessionObj["Ended Time"]);
  const subjectName = sessionObj["Subject label"] || sessionObj["Subject name"] || "Live Class";

  const whatsappURL = "https://api.whatsapp.com/send/?phone=917510204021&text=" +
    encodeURIComponent(`📌 CONCERN REGARDING SESSION ID: ${sessionId}\nOF ${subjectName}\n\n`);

  const htmlBody = `
    Dear Parent/Student,<br><br>
    The <b>${subjectName}</b> session on <b>${formattedDate}</b> has been successfully completed.<br><br>
    <b>Details:</b><br>
    • Expected Time: ${expectedStart} – ${expectedEnd}<br>
    • Actual Time: ${actualStart} – ${actualEnd}<br>
    • Teacher: ${teacherName}<br>
    • Session ID: ${sessionId}<br><br>
    If any information above is incorrect or you have any concerns, please contact us:<br><br>
    <a href="${whatsappURL}" style="display:inline-block;padding:10px 18px;background-color:#25D366;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">Contact on WhatsApp</a><br><br>
    You can view session reports, attendance, and progress in your student dashboard:<br>
    <a href="${dashboardUrl}" style="display:inline-block;padding:10px 18px;background-color:#007BFF;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">Go to Dashboard</a><br><br>
    Best regards,<br>Team Edstaq
  `;

  MailApp.sendEmail({
    to: studentEmails.join(","),
    cc: "fathimasanaedstaq@gmail.com,hr.edstaq@gmail.com",
    subject: `Session Completed – ${subjectName} (${formattedDate})`,
    htmlBody: htmlBody
  });
}

// ==============================================================================
// ✅ 8. CHECKLIST MODULE (Check List & Checklist Master)
// ==============================================================================

function handleReadChecklistTemplates(role = "Teacher") {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const sheet = ss.getSheetByName("Check List") || ss.getSheetByName("Checklist") || ss.getSheetByName("Check list");
    if (!sheet) return jsonResponse(true, "Checklist sheet not found", []);

    const ctx = getTableContext(CONFIG.MASTER_SHEET_ID, sheet.getName());
    const roleCol = ctx.normMap["role"];
    const targetRole = String(role || "Teacher").trim().toLowerCase();

    const results = [];
    ctx.rows.forEach(row => {
      const rowRole = roleCol !== undefined ? String(row[roleCol]).trim().toLowerCase() : "";
      if (!targetRole || rowRole === targetRole) {
        results.push(rowToObj(ctx.headers, row));
      }
    });

    return jsonResponse(true, "Checklist templates fetched", results);
  } catch (err) {
    return jsonResponse(false, "Failed to read checklist templates: " + err.message);
  }
}

function handleReadChecklistBySessionId(sessionId) {
  try {
    if (!sessionId) return jsonResponse(false, "Session ID is required");
    const ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const sheet = ss.getSheetByName("Checklist Master") || ss.getSheetByName("ChecklistMaster");
    if (!sheet) return jsonResponse(true, "Checklist Master sheet not found", []);

    const ctx = getTableContext(CONFIG.MASTER_SHEET_ID, sheet.getName());
    const sessionCol = ctx.normMap["sessionid"];
    if (sessionCol === undefined) return jsonResponse(true, "No sessionid column found", []);

    const targetSessionId = String(sessionId).trim();
    const results = [];

    ctx.rows.forEach(row => {
      if (String(row[sessionCol]).trim() === targetSessionId) {
        results.push(rowToObj(ctx.headers, row));
      }
    });

    return jsonResponse(true, "Checklist responses fetched", results);
  } catch (err) {
    return jsonResponse(false, "Failed to read session checklist: " + err.message);
  }
}

function handleSaveSessionChecklist(sessionId, teacherId, checklistData) {
  try {
    if (!sessionId) return jsonResponse(false, "Session ID is required");
    if (!Array.isArray(checklistData)) return jsonResponse(false, "checklistData array is required");

    const ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    let sheet = ss.getSheetByName("Checklist Master") || ss.getSheetByName("ChecklistMaster");
    if (!sheet) {
      sheet = ss.insertSheet("Checklist Master");
      const defaultHeaders = ["Check id", "Role", "Mode", "Items", "Values", "Teacher ID", "Session ID", "Item ID"];
      sheet.appendRow(defaultHeaders);
    }

    const ctx = getTableContext(CONFIG.MASTER_SHEET_ID, sheet.getName());
    const sessionCol = ctx.normMap["sessionid"];
    if (sessionCol === undefined) return jsonResponse(false, "Session ID column not found in Checklist Master");

    const targetSessionId = String(sessionId).trim();

    // 1. Remove existing rows for this session in Checklist Master (working from bottom up)
    for (let i = ctx.rows.length - 1; i >= 0; i--) {
      if (String(ctx.rows[i][sessionCol]).trim() === targetSessionId) {
        sheet.deleteRow(i + 2);
      }
    }

    // 2. Append the new checklist rows
    if (checklistData.length > 0) {
      const rowsToAppend = checklistData.map(item => {
        const entry = {
          "Check id": item.checkId || item["Check id"] || "",
          "Role": item.role || item["Role"] || "Teacher",
          "Mode": item.mode || item["Mode"] || "",
          "Items": item.items || item["Items"] || item.item || "",
          "Values": item.values !== undefined ? String(item.values) : (item["Values"] !== undefined ? String(item["Values"]) : ""),
          "Teacher ID": teacherId || item.teacherId || item["Teacher ID"] || "",
          "Session ID": targetSessionId,
          "Item ID": item.itemId || item["Item ID"] || Utilities.getUuid().replace(/-/g, "").slice(0, 8)
        };
        return buildRowByColNames(ctx.headers, ctx.normMap, entry);
      });

      const startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, rowsToAppend.length, ctx.headers.length).setValues(rowsToAppend);
    }

    return jsonResponse(true, "Checklist saved successfully", { count: checklistData.length });
  } catch (err) {
    return jsonResponse(false, "Failed to save session checklist: " + err.message);
  }
}

/**
 * ==============================================================================
 * 🔔 SPREADSHEET ON-EDIT TRIGGER FUNCTION
 * ==============================================================================
 * Use this function name if you want to set up an Apps Script Trigger:
 *  - Function to run: onSheetEditTrigger
 *  - Event source: From spreadsheet
 *  - Event type: On edit
 *
 * This will automatically send the email whenever anyone changes the "Status"
 * to "Completed" directly inside the Google Sheet!
 */
function onSheetEditTrigger(e) {
  try {
    if (!e || !e.range) return;
    const sheet = e.range.getSheet();
    if (sheet.getName() !== "Class Master") return;

    const ctx = getTableContext(CONFIG.OPERATIONS_SHEET_ID, "Class Master");
    const statusCol = ctx.normMap["status"];
    const sessionCol = ctx.normMap["sessionid"];
    if (statusCol === undefined || sessionCol === undefined) return;

    // Check if the edited column is "Status" (1-based index)
    if (e.range.getColumn() !== statusCol + 1) return;

    const newValue = String(e.value || e.range.getValue() || "").trim().toLowerCase();
    if (newValue === "completed") {
      const row = e.range.getRow();
      if (row < 2) return; // Ignore header row
      const sessionId = sheet.getRange(row, sessionCol + 1).getValue();
      if (sessionId) {
        NotifyCompletedSession(String(sessionId).trim());
      }
    }
  } catch (err) {
    console.error("onSheetEditTrigger error:", err);
  }
}

// ==============================================================================
// 🛠️ DATE, TIME & RESPONSE UTILITIES
// ==============================================================================

function isDateColumn(header) {
  const k = normKey(header);
  return k === "date" || k === "timestamp";
}

function isTimeColumn(header) {
  const k = normKey(header);
  return k.includes("time") && !k.includes("timestamp");
}

function formatDateValue(value) {
  if (!value) return "";
  try { return Utilities.formatDate(new Date(value), CONFIG.TIMEZONE, "dd/MM/yyyy"); } catch (_) { return String(value); }
}

function formatTimeValue(value) {
  if (!value) return "";
  try { return Utilities.formatDate(new Date(value), CONFIG.TIMEZONE, "hh:mm a"); } catch (_) { return String(value); }
}

function jsonResponse(success, message, data = null) {
  const payload = {
    success: success,
    status: success ? "success" : "error",
    message: message,
    data: data
  };
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
