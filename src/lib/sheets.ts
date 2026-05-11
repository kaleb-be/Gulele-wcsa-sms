import { google, sheets_v4 } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

let sheetsClient: sheets_v4.Resource$Spreadsheets | null = null;

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n')
  ;
  if (!email || !key) {
    throw new Error("Missing Google service account credentials in environment variables");
  }
  const auth = new google.auth.JWT({
    email,
    key: key,
    scopes: SCOPES,
  });
  return auth;
}

function getSheetsClient(): sheets_v4.Resource$Spreadsheets {
  if (!sheetsClient) {
    const auth = getAuth();
    sheetsClient = google.sheets({ version: "v4", auth }).spreadsheets;
  }
  return sheetsClient;
}

function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SPREADSHEET_ID;
  if (!id) throw new Error("Missing GOOGLE_SPREADSHEET_ID environment variable");
  return id;
}

const SHEET_NAMES: Record<string, string> = {
  ngos: "NGOs",
  beneficiaries: "Beneficiaries",
  services: "Services",
  ngo_services: "NGO_Services",
  support_records: "Support_Records",
};

export async function getSheetData(sheetKey: string): Promise<string[][]> {
  const sheets = getSheetsClient();
  const sheetName = SHEET_NAMES[sheetKey];
  if (!sheetName) throw new Error(`Unknown sheet key: ${sheetKey}`);
  const res = await sheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: sheetName,
  });
  return res.data.values ?? [];
}

export async function appendRow(sheetKey: string, values: string[]): Promise<void> {
  const sheets = getSheetsClient();
  const sheetName = SHEET_NAMES[sheetKey];
  if (!sheetName) throw new Error(`Unknown sheet key: ${sheetKey}`);
  await sheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range: sheetName,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] },
  });
}

export async function updateRow(sheetKey: string, rowIndex: number, values: string[]): Promise<void> {
  const sheets = getSheetsClient();
  const sheetName = SHEET_NAMES[sheetKey];
  if (!sheetName) throw new Error(`Unknown sheet key: ${sheetKey}`);
  await sheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: `${sheetName}!A${rowIndex}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] },
  });
}

export async function deleteRow(sheetKey: string, rowIndex: number): Promise<void> {
  const sheets = getSheetsClient();
  const sheetName = SHEET_NAMES[sheetKey];
  if (!sheetName) throw new Error(`Unknown sheet key: ${sheetKey}`);
  const spreadsheetId = getSpreadsheetId();
  const res = await sheets.get({ spreadsheetId, ranges: [sheetName], includeGridData: false });
  const sheet = res.data.sheets?.[0];
  const sheetId = sheet?.properties?.sheetId;
  if (sheetId === undefined || sheetId === null) throw new Error("Could not find sheet ID");
  await sheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowIndex - 1,
              endIndex: rowIndex,
            },
          },
        },
      ],
    },
  });
}

export async function generateId(prefix: string, sheetKey: string): Promise<string> {
  const rows = await getSheetData(sheetKey);
  let maxNum = 0;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[0] && row[0].startsWith(prefix)) {
      const num = parseInt(row[0].replace(prefix, ""), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  }
  const nextNum = maxNum + 1;
  return `${prefix}-${String(nextNum).padStart(3, "0")}`;
}

export async function findRowIndex(sheetKey: string, columnIndex: number, value: string): Promise<number | null> {
  const rows = await getSheetData(sheetKey);
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][columnIndex] === value) return i + 1;
  }
  return null;
}
