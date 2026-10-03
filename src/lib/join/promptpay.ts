// สร้างข้อความ QR พร้อมเพย์ (มาตรฐาน EMVCo / Thai QR Payment) แบบฝังยอดเงิน
// รองรับหมายเลขพร้อมเพย์ 3 แบบ: เบอร์มือถือ 10 หลัก, เลขบัตรประชาชน/ผู้เสียภาษี 13 หลัก, e-Wallet 15 หลัก

const tlv = (id: string, value: string) => id + String(value.length).padStart(2, "0") + value;

function crc16(data: string) {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    crc &= 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** คืน null ถ้าหมายเลขไม่ถูกรูปแบบ */
export function promptPayPayload(id: string, amount: number): string | null {
  const digits = id.replace(/\D/g, "");
  let target: string;
  let tag: string;
  if (/^0\d{9}$/.test(digits)) {
    tag = "01"; // เบอร์มือถือ → 0066 + ตัด 0 หน้า
    target = ("0000000000000" + "66" + digits.slice(1)).slice(-13);
  } else if (/^\d{13}$/.test(digits)) {
    tag = "02"; // เลขบัตรประชาชน / เลขผู้เสียภาษี
    target = digits;
  } else if (/^\d{15}$/.test(digits)) {
    tag = "03"; // e-Wallet
    target = digits;
  } else return null;

  const merchant = tlv("00", "A000000677010111") + tlv(tag, target);
  const body =
    tlv("00", "01") +
    tlv("01", "12") + // 12 = QR ใช้ครั้งเดียว/มียอดเงิน
    tlv("29", merchant) +
    tlv("58", "TH") +
    tlv("53", "764") + // THB
    tlv("54", amount.toFixed(2)) +
    "6304";
  return body + crc16(body);
}
