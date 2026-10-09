// ครอปกลางภาพให้ได้สัดส่วนของช่อง แล้วปรับเป็น w×h → JPEG (ฝั่ง client)
export function cropToSlot(file: File, w: number, h: number, quality = 0.86): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const r = w / h;
      let sw = img.width, sh = img.height;
      if (sw / sh > r) sw = Math.round(sh * r); else sh = Math.round(sw / r);
      const sx = Math.round((img.width - sw) / 2), sy = Math.round((img.height - sh) / 2);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d")!;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? resolve(new File([b], "cover.jpg", { type: "image/jpeg" })) : reject(new Error("encode failed"))), "image/jpeg", quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad image")); };
    img.src = url;
  });
}
