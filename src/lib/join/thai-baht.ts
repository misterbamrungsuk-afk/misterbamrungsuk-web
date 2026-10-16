// จำนวนเงินเป็นตัวอักษรไทย (ใช้ในใบเสร็จ)
const DIGITS = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const POS = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];
/** จำนวนเต็มบาท → ตัวอักษรไทย (ไม่เกิน 999,999,999) */
export function thaiBaht(n: number) {
  const read = (x: number): string => {
    if (x >= 1_000_000) return read(Math.floor(x / 1_000_000)) + "ล้าน" + (x % 1_000_000 ? read(x % 1_000_000) : "");
    const s = String(x).split("").reverse();
    return s.map((d, i) => {
      const v = +d;
      if (!v) return "";
      if (i === 0 && v === 1 && s.length > 1) return "เอ็ด";
      if (i === 1 && v === 1) return "สิบ";
      if (i === 1 && v === 2) return "ยี่สิบ";
      return DIGITS[v] + POS[i];
    }).reverse().join("");
  };
  return n === 0 ? "ศูนย์บาทถ้วน" : `${read(Math.round(n))}บาทถ้วน`;
}

