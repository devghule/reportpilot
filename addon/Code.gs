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

function writeToSheet(payload) {
  // payload: { tabName, headers, rows, dateRange, accountName }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(payload.tabName);
  if (!sheet) sheet = ss.insertSheet(payload.tabName);
  sheet.clearContents();

  // Row 1: metadata
  sheet.getRange(1, 1).setValue(
    payload.accountName + ' | ' + payload.dateRange +
    ' | Imported: ' + new Date().toLocaleString('en-IN')
  );

  // Row 2: headers (bold)
  sheet.getRange(2, 1, 1, payload.headers.length).setValues([payload.headers]);
  sheet.getRange(2, 1, 1, payload.headers.length).setFontWeight('bold');

  // Row 3+: data rows
  if (payload.rows.length > 0) {
    sheet.getRange(3, 1, payload.rows.length, payload.rows[0].length)
      .setValues(payload.rows);
  }

  // Auto-resize columns
  for (let i = 1; i <= payload.headers.length; i++) {
    sheet.autoResizeColumn(i);
  }

  return { success: true, rowsWritten: payload.rows.length };
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

  sheet.getRange(1, 1, rows.length, 1).setValues(rows);
  sheet.getRange(1, 1).setFontWeight('bold').setFontSize(12);

  const headings = [
    'PERFORMANCE SUMMARY',
    'CREATIVE FATIGUE ALERT',
    'BUDGET WASTE ALERT',
    'SCALING OPPORTUNITY'
  ];
  for (let i = 1; i <= rows.length; i++) {
    if (headings.includes(sheet.getRange(i, 1).getValue())) {
      sheet.getRange(i, 1).setFontWeight('bold');
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
