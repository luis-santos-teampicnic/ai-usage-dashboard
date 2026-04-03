/**
 * Google Apps Script to export 3 sheets from the spreadsheet as CSV files
 * to the GitHub repository via the GitHub API.
 *
 * Setup:
 *   1. Open the Google Sheet
 *   2. Extensions → Apps Script
 *   3. Paste this code
 *   4. Set the GITHUB_TOKEN in Script Properties (File → Project settings → Script properties)
 *      Key: GITHUB_TOKEN, Value: your personal access token (with repo scope)
 *   5. Set REPO_OWNER and REPO_NAME below
 *   6. Run exportAllData() manually or set a trigger (e.g., hourly)
 *
 * Sheet name → file mapping:
 *   "AI Usage"       → data/ai_usage_data.csv   (special format: timestamp comment + no header)
 *   "PRs Week"       → data/prs_data_week.csv   (standard CSV with header)
 *   "PRs 14 Days"    → data/prs_data_14days.csv (standard CSV with header)
 */

const REPO_OWNER = 'PicnicSupermarket';
const REPO_NAME = 'claude-token-leaderboard';
const BRANCH = 'main';

const SHEET_CONFIG = [
  {
    sheetName: 'Ai Usage (Export)',
    filePath: 'data/ai_usage_data.csv',
    format: 'ai_usage' // special: prepend timestamp comment, no header row in output
  },
  {
    sheetName: 'PRs Activity - this weeks (Export)',
    filePath: 'data/prs_data_week.csv',
    format: 'standard' // standard CSV with header
  },
  {
    sheetName: 'PRs Activity - 2 weeks (Export)',
    filePath: 'data/prs_data_14days.csv',
    format: 'standard'
  }
];

/**
 * Main entry point — exports all 3 sheets to GitHub.
 */
function exportAllData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let token = PropertiesService.getUserProperties().getProperty('GITHUB_TOKEN');

  if (!token) {
    const ui = SpreadsheetApp.getUi();
    const response = ui.prompt(
      '🔑 GitHub Token Required',
      'Enter your GitHub Personal Access Token (repo scope).\nThis is stored privately in your account only — other editors cannot see it.',
      ui.ButtonSet.OK_CANCEL
    );
    if (response.getSelectedButton() !== ui.Button.OK || !response.getResponseText().trim()) {
      ui.alert('Export cancelled — no token provided.');
      return;
    }
    token = response.getResponseText().trim();
    PropertiesService.getUserProperties().setProperty('GITHUB_TOKEN', token);
  }

  const results = [];
  for (const config of SHEET_CONFIG) {
    const sheet = ss.getSheetByName(config.sheetName);
    if (!sheet) {
      results.push(`⚠️ Sheet "${config.sheetName}" not found — skipped`);
      continue;
    }

    const csv = sheetToCSV(sheet, config.format);
    const result = pushToGitHub(token, config.filePath, csv);
    results.push(`✅ ${config.filePath} — ${result}`);
  }

  Logger.log(results.join('\n'));
  SpreadsheetApp.getUi().alert(results.join('\n'));
}

/**
 * Convert a sheet to CSV string.
 */
function sheetToCSV(sheet, format) {
  const data = sheet.getDataRange().getValues();
  if (data.length === 0) return '';

  const lines = [];

  if (format === 'ai_usage') {
    // Prepend timestamp comment
    const now = new Date();
    const timestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ssXXX");
    lines.push(`# ${timestamp}`);

    // Skip header row (row 0), export data rows only
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === '' || data[i][0] == null) continue; // skip empty rows
      lines.push(data[i].map(cell => escapeCSV(cell)).join(','));
    }
  } else {
    // Standard: include header + all data rows
    for (let i = 0; i < data.length; i++) {
      if (i > 0 && (data[i][0] === '' || data[i][0] == null)) continue; // skip empty data rows
      lines.push(data[i].map(cell => escapeCSV(cell)).join(','));
    }
  }

  return lines.join('\n') + '\n';
}

/**
 * Escape a cell value for CSV.
 */
function escapeCSV(value) {
  if (value == null) return '';
  const str = String(value);
  // Quote if contains comma, newline, or double quote
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Push a file to GitHub using the Contents API.
 */
function pushToGitHub(token, filePath, content) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`;

  // Get existing file SHA (needed for updates)
  let sha = null;
  const getResp = UrlFetchApp.fetch(url + `?ref=${BRANCH}`, {
    method: 'get',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    },
    muteHttpExceptions: true
  });

  if (getResp.getResponseCode() === 200) {
    sha = JSON.parse(getResp.getContentText()).sha;
  }

  // Push the file
  const payload = {
    message: 'Data update',
    content: Utilities.base64Encode(content, Utilities.Charset.UTF_8),
    branch: BRANCH
  };
  if (sha) payload.sha = sha;

  const putResp = UrlFetchApp.fetch(url, {
    method: 'put',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    },
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const code = putResp.getResponseCode();
  if (code === 200) return 'updated';
  if (code === 201) return 'created';
  throw new Error(`GitHub API error ${code}: ${putResp.getContentText()}`);
}

/**
 * Add a menu item to the spreadsheet.
 */
/**
 * Reset the stored GitHub token (prompts again on next export).
 */
function resetToken() {
  PropertiesService.getUserProperties().deleteProperty('GITHUB_TOKEN');
  SpreadsheetApp.getUi().alert('GitHub token removed. You will be prompted on the next export.');
}

/**
 * Add menu items to the spreadsheet.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🚀 Export')
    .addItem('Export all data to GitHub', 'exportAllData')
    .addSeparator()
    .addItem('Reset GitHub token', 'resetToken')
    .addToUi();
}
