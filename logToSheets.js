// logToSheets.js
import { google } from 'googleapis';

const SPREADSHEET_ID = '1c7e7fzsJVwVBi1hliThVXF2daC2XmR3_qWA1YYo7VTU';
const SHEET_NAME = 'Sheet1'; // Ganti jika kamu ubah nama sheet

export async function logPlayerData({ name, phone, mode, startTime, endTime }) {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS); // 👈 Ambil dari env
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  const duration = ((endTime - startTime) / 60000).toFixed(2);
  const values = [[
    name,
    phone,
    mode,
    new Date(startTime).toISOString(),
    new Date(endTime).toISOString(),
    duration
  ]];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:F`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values,
    },
  });
}
