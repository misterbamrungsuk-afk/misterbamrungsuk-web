"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-gold-lux no-print h-11 px-6 rounded-full text-[14px]">
      บันทึกเป็น PDF / พิมพ์
    </button>
  );
}
