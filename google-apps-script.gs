/**
 * Mister Bamrungsuk → Google Sheet
 * รับแถวผู้สมัครจากเว็บแล้วเพิ่มลงแท็บ "applicants"
 *
 * วิธีติดตั้ง:
 * 1. เปิด Google Sheet ที่จะใช้ → เมนู ส่วนขยาย (Extensions) → Apps Script
 * 2. ลบโค้ดเดิม วางไฟล์นี้ทั้งหมด แล้วแก้ TOKEN ให้ตรงกับ GOOGLE_SHEETS_WEBHOOK_TOKEN ใน env และใส่ SPREADSHEET_ID
 * 3. กด ทำให้ใช้งานได้ (Deploy) → การทำให้ใช้งานได้รายการใหม่ (New deployment)
 *    - ประเภท: เว็บแอป (Web app)
 *    - เรียกใช้ในฐานะ (Execute as): ฉัน (Me)
 *    - ผู้มีสิทธิ์เข้าถึง (Who has access): ทุกคน (Anyone)
 * 4. กดอนุญาตสิทธิ์ แล้วคัดลอก URL ของเว็บแอป (ลงท้ายด้วย /exec) ไปใส่ GOOGLE_SHEETS_WEBHOOK_URL
 *
 * ความปลอดภัย: URL นี้ใครก็เรียกได้ สคริปต์จึงรับเฉพาะคำขอที่มี TOKEN ถูกต้อง — อย่าเผยแพร่ TOKEN
 */
const TOKEN = 'ใส่ค่าเดียวกับ GOOGLE_SHEETS_WEBHOOK_TOKEN';
const SHEET_NAME = 'applicants';
// ID ของสเปรดชีต (ส่วนระหว่าง /d/ กับ /edit ใน URL ของชีต)
const SPREADSHEET_ID = 'ใส่ ID ของชีต';

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.token !== TOKEN) return json({ ok: false, error: 'unauthorized' });
    if (body.action === 'backup') return saveBackup(body.filename, body.json);

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(body.columns);
      sheet.getRange(1, 1, 1, body.columns.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    // กันสูตรถูกฉีดเข้าชีต (ข้อความที่ขึ้นต้นด้วย = + - @)
    const row = body.row.map(function (v) {
      return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v;
    });
    sheet.appendRow(row);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

// สำรองข้อมูลรายวัน: เก็บไฟล์ JSON ในโฟลเดอร์ "MB Backups" ของ Drive (สร้างให้ถ้ายังไม่มี) เก็บไว้ 30 ไฟล์ล่าสุด
// หมายเหตุ: ครั้งแรกต้องกดอนุญาตสิทธิ์ Google Drive ใหม่ แล้ว Deploy เวอร์ชันใหม่
const BACKUP_FOLDER = 'MB Backups';
const BACKUP_KEEP = 30;

function saveBackup(filename, content) {
  const name = String(filename || 'mb-backup.json').replace(/[^\w.\-]/g, '_');
  const it = DriveApp.getFoldersByName(BACKUP_FOLDER);
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder(BACKUP_FOLDER);
  folder.createFile(name, String(content || '{}'), MimeType.PLAIN_TEXT);

  const files = [];
  const all = folder.getFiles();
  while (all.hasNext()) files.push(all.next());
  files.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
  files.slice(BACKUP_KEEP).forEach(function (f) { f.setTrashed(true); });
  return json({ ok: true, file: name });
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
