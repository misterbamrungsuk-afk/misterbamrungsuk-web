// รันชุดทดสอบ e2e ทั้งหมดตามลำดับบนเซิร์ฟเวอร์โหมดสาธิต (ข้อมูลในหน่วยความจำ · ไม่แตะฐานจริง)
//   npm run e2e            → เปิดเซิร์ฟเวอร์สาธิตใหม่ที่ :3210 รันครบแล้วปิด
//   npm run e2e -- --reuse → ใช้เซิร์ฟเวอร์ที่เปิดอยู่แล้ว (สถานะต้องสดใหม่ ชุดทดสอบพึ่งลำดับกัน)
//   npm run e2e -- 04 05   → รันเฉพาะไฟล์ที่ขึ้นต้นด้วยเลขนั้น
const { spawn, execFileSync } = require("child_process");
const fs = require("fs"), path = require("path");
const DIR = __dirname, B = "http://localhost:3210";
const args = process.argv.slice(2);
const reuse = args.includes("--reuse");
const only = args.filter((a) => /^\d+$/.test(a));
const files = fs.readdirSync(DIR).filter((f) => /^\d\d-.+\.js$/.test(f) && (!only.length || only.some((o) => f.startsWith(o.padStart(2, "0"))))).sort();
const up = () => fetch(B + "/offline", { signal: AbortSignal.timeout(60000) }).then((r) => r.status < 500).catch(() => false);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  let srv = null;
  if (await up()) {
    if (!reuse) { console.error("มีเซิร์ฟเวอร์ที่ :3210 อยู่แล้ว — ปิดก่อน หรือใช้ --reuse (ต้องเป็นโหมดสาธิตที่เพิ่งเปิด)"); process.exit(2); }
  } else {
    console.log("เปิดเซิร์ฟเวอร์สาธิต :3210 …");
    srv = spawn(process.execPath, [path.join(DIR, "demo-server.js")], { stdio: ["ignore", "ignore", "pipe"], cwd: path.join(DIR, "..") }); // stdout ไม่อ่าน = ห้ามเป็น pipe (บัฟเฟอร์เต็มแล้วเซิร์ฟเวอร์ค้าง)
    srv.stderr.on("data", (d) => { if (/error/i.test(d)) process.stderr.write(d); });
    for (let i = 0; i < 90 && !(await up()); i++) await sleep(2000);
    if (!(await up())) { console.error("เซิร์ฟเวอร์ไม่ขึ้น"); srv.kill(); process.exit(2); }
  }
  // อุ่นหน้าหลักก่อน (dev compile ครั้งแรกช้า)
  await fetch(B + "/").catch(() => {});
  let total = 0, failed = 0;
  const summary = [];
  for (const f of files) {
    const t0 = Date.now();
    let out = "";
    try { out = execFileSync(process.execPath, [path.join(DIR, f)], { encoding: "utf8", timeout: 10 * 60_000 }); }
    catch (e) { out = String(e.stdout || "") + "\nERR " + e.message; }
    const pass = (out.match(/^PASS /gm) || []).length, fail = (out.match(/^FAIL /gm) || []).length + (/^ERR /m.test(out) ? 1 : 0);
    total += pass + fail; failed += fail;
    summary.push(`${fail ? "✗" : "✓"} ${f.padEnd(16)} ${String(pass).padStart(3)} ผ่าน ${fail ? `· ${fail} ไม่ผ่าน` : ""} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    if (fail) out.split("\n").filter((l) => /^(FAIL|ERR)/.test(l)).forEach((l) => summary.push("    " + l));
  }
  console.log("\n" + summary.join("\n"));
  console.log(`\nรวม ${total} ข้อ · ${failed ? failed + " ไม่ผ่าน" : "ผ่านทั้งหมด"}`);
  if (srv) { try { process.platform === "win32" ? execFileSync("taskkill", ["/pid", String(srv.pid), "/T", "/F"], { stdio: "ignore" }) : srv.kill(); } catch {} }
  process.exit(failed ? 1 : 0);
})();
