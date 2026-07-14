// Centralised so the report's look can be tweaked in one place without
// touching the write logic itself — future themes/settings (Phase 8) can
// build on top of this rather than needing another rewrite.
const REPORT_STYLE = {
  fontFamily: 'Arial',
  headerBackground: '#1a73e8',
  headerFontColor: '#ffffff',
  headerFontSize: 10,
  bodyFontSize: 10,
  metadataFontColor: '#5f6368',
  metadataFontSize: 9,
  totalBackground: '#f1f3f4',
  totalFontColor: '#202124',
  borderColor: '#dadce0',
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('ReportPilot')
    .addItem('Open ReportPilot', 'openSidebar')
    .addToUi();
}

function openSidebar() {
  const html = HtmlService
    .createHtmlOutputFromFile('sidebar')
    .setTitle('ReportPilot')
    .setWidth(320);
  SpreadsheetApp.getUi().showSidebar(html);
}

// Parses a cell reference like "A1" or "D5" into { col, row } (1-indexed).
// Falls back to A1 for anything that doesn't match.
function parseCellRef_(cellRef) {
  const match = /^([A-Za-z]+)(\d+)$/.exec((cellRef || 'A1').trim());
  if (!match) return { col: 1, row: 1 };
  const letters = match[1].toUpperCase();
  let col = 0;
  for (let i = 0; i < letters.length; i++) {
    col = col * 26 + (letters.charCodeAt(i) - 64);
  }
  return { col: col, row: parseInt(match[2], 10) };
}

// A column gets a Total only if every non-empty cell in it parses as a
// plain number — text columns (names, "12%", "N/A") are correctly skipped
// rather than producing a nonsense sum.
function computeTotalsRow_(rows, colCount) {
  const totals = new Array(colCount).fill('');
  for (let col = 0; col < colCount; col++) {
    let sum = 0;
    let numericCount = 0;
    let sawNonEmpty = false;
    for (const row of rows) {
      const raw = row[col];
      if (raw === '' || raw === undefined || raw === null) continue;
      sawNonEmpty = true;
      const num = Number(raw);
      if (Number.isFinite(num)) {
        sum += num;
        numericCount++;
      } else {
        numericCount = -1;
        break;
      }
    }
    if (sawNonEmpty && numericCount === rows.length) {
      totals[col] = Math.round(sum * 100) / 100;
    }
  }
  return totals;
}

function writeToSheet(payload) {
  // payload: { destination: 'active'|'existing'|'new', tabName, startCell,
  //            headers, rows, dateRange, accountName }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet;
  if (payload.destination === 'active') {
    sheet = ss.getActiveSheet();
  } else {
    sheet = ss.getSheetByName(payload.tabName);
    if (!sheet) sheet = ss.insertSheet(payload.tabName);
  }

  // Only the exact range being written is touched — never the whole sheet.
  // Blindly clearing the entire sheet (the old behavior) is destructive and
  // specifically wrong for "Active Sheet", which may hold unrelated data.
  const start = parseCellRef_(payload.startCell);
  const metadataRow = start.row;
  const headerRow = start.row + 1;
  const dataStartRow = start.row + 2;
  const colCount = payload.headers.length;
  const rowCount = payload.rows.length;
  const totalRow = dataStartRow + rowCount;

  sheet.getRange(metadataRow, start.col).setValue(
    payload.accountName + ' | ' + payload.dateRange +
    ' | Imported: ' + new Date().toLocaleString('en-IN')
  );
  sheet.getRange(metadataRow, start.col)
    .setFontFamily(REPORT_STYLE.fontFamily)
    .setFontStyle('italic')
    .setFontSize(REPORT_STYLE.metadataFontSize)
    .setFontColor(REPORT_STYLE.metadataFontColor);

  const headerRange = sheet.getRange(headerRow, start.col, 1, colCount);
  headerRange.setValues([payload.headers]);
  headerRange
    .setFontWeight('bold')
    .setFontFamily(REPORT_STYLE.fontFamily)
    .setFontSize(REPORT_STYLE.headerFontSize)
    .setBackground(REPORT_STYLE.headerBackground)
    .setFontColor(REPORT_STYLE.headerFontColor)
    .setVerticalAlignment('middle');

  if (rowCount > 0) {
    const dataRange = sheet.getRange(dataStartRow, start.col, rowCount, payload.rows[0].length);
    dataRange.setValues(payload.rows);
    dataRange.setFontFamily(REPORT_STYLE.fontFamily).setFontSize(REPORT_STYLE.bodyFontSize);

    const totals = computeTotalsRow_(payload.rows, colCount);
    if (totals[0] === '') totals[0] = 'Total';
    const totalRange = sheet.getRange(totalRow, start.col, 1, colCount);
    totalRange.setValues([totals]);
    totalRange
      .setFontWeight('bold')
      .setFontFamily(REPORT_STYLE.fontFamily)
      .setFontSize(REPORT_STYLE.bodyFontSize)
      .setBackground(REPORT_STYLE.totalBackground)
      .setFontColor(REPORT_STYLE.totalFontColor);
  }

  // Borders around the whole header + data + total block.
  const tableRowCount = 1 + rowCount + (rowCount > 0 ? 1 : 0);
  sheet.getRange(headerRow, start.col, tableRowCount, colCount)
    .setBorder(true, true, true, true, true, true, REPORT_STYLE.borderColor, SpreadsheetApp.BorderStyle.SOLID);

  for (let i = 0; i < colCount; i++) {
    sheet.autoResizeColumn(start.col + i);
  }

  // Freezing only makes sense when writing from the sheet's actual top —
  // freezing rows above a mid-sheet start (e.g. starting at D5) would just
  // freeze blank space, which is more confusing than helpful.
  if (start.row === 1) {
    sheet.setFrozenRows(headerRow);
  }

  return { success: true, rowsWritten: rowCount, sheetName: sheet.getName() };
}

function writeAiInsights(payload) {
  // payload: { tabName, accountName, dateRange, timestamp, content }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(payload.tabName);
  if (!sheet) sheet = ss.insertSheet(payload.tabName);
  sheet.clearContents();

  const rows = [
    [payload.accountName + ' — AI Insights'],
    ['Period: ' + payload.dateRange + ' | Generated: ' + payload.timestamp],
    [''],
    ...payload.content.map(line => [line]),
    [''],
    ['-- Your notes (add below before sending to client) --'],
    [''], [''], [''],
  ];

  const fullRange = sheet.getRange(1, 1, rows.length, 1);
  fullRange.setValues(rows);
  fullRange.setFontFamily(REPORT_STYLE.fontFamily).setFontSize(REPORT_STYLE.bodyFontSize);
  sheet.getRange(1, 1).setFontWeight('bold').setFontSize(12);

  const headings = [
    'PERFORMANCE SUMMARY',
    'CREATIVE FATIGUE ALERT',
    'BUDGET WASTE ALERT',
    'SCALING OPPORTUNITY'
  ];
  for (let i = 1; i <= rows.length; i++) {
    if (headings.includes(sheet.getRange(i, 1).getValue())) {
      sheet.getRange(i, 1).setFontWeight('bold').setFontColor(REPORT_STYLE.headerBackground);
    }
  }

  sheet.autoResizeColumn(1);
  return { success: true };
}

function getSheetData(payload) {
  // payload: { accountName }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const levels = ['Campaigns', 'Ad Sets', 'Ads'];
  const result = {};
  for (const level of levels) {
    const tabName = payload.accountName + ' — ' + level;
    const sheet = ss.getSheetByName(tabName);
    if (sheet) {
      const data = sheet.getDataRange().getValues();
      result[level.toLowerCase().replace(' ', '_')] = {
        headers: data[1] || [],   // row 2 is headers
        rows: data.slice(2) || [] // data starts at row 3
      };
    }
  }
  return result;
}

function getSpreadsheetId() {
  return SpreadsheetApp.getActiveSpreadsheet().getId();
}

function getSheetInfo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return {
    id: ss.getId(),
    name: ss.getName(),
    url: ss.getUrl(),
    sheets: ss.getSheets().map(s => s.getName()),
  };
}

function storeToken(token) {
  PropertiesService.getUserProperties().setProperty('rp_jwt', token);
}

function getToken() {
  return PropertiesService.getUserProperties().getProperty('rp_jwt');
}

function clearToken() {
  PropertiesService.getUserProperties().deleteProperty('rp_jwt');
}

// Same PropertiesService-backed pattern already used for the JWT above —
// no new persistence mechanism, just a second key for user preferences
// (default import destination/cell, default schedule timezone, theme).
function getPreferences() {
  const raw = PropertiesService.getUserProperties().getProperty('rp_prefs');
  return raw ? JSON.parse(raw) : null;
}

function setPreferences(prefs) {
  PropertiesService.getUserProperties().setProperty('rp_prefs', JSON.stringify(prefs));
  return { success: true };
}
