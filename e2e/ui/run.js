// รันชุดทดสอบ "กดหน้าจอจริง" ทุกบทบาท บน production build โหมดสาธิต (ไม่แตะฐานจริง)
// ใช้: node e2e/ui/run.js [--dev] [--skip-build] [ชื่อชุด…]   เช่น node e2e/ui/run.js 10 20
//  --dev        ใช้ next dev ที่ :3210 ที่เปิดอยู่แล้ว (เร็ว ใช้ตอนเขียนเทส) — ค่าเริ่มต้น = build แล้วรัน :3300
//  --skip-build ใช้ build เดิม (เมื่อโค้ดไม่เปลี่ยน)
// แต่ละชุดรันบน iPhone (WebKit/Safari) + Android (Chrome) · ภาพหน้าจอ: e2e/ui/out/<ชุด>-<เครื่อง>/ · สรุป: e2e/ui/out/report.json
const http = require("http"), fs = require("fs"), path = require("path");
const { spawn, execFile, execFileSync } = require("child_process");
// รันชุดทดสอบแบบ async — execFileSync จะบล็อก event loop ทำให้พร็อกซีในโปรเซสนี้ไม่ตอบ (หน้าเว็บค้างจน timeout)
const runSuite = (file, dev, env) => new Promise((res, rej) => execFile(process.execPath, [file, dev], { cwd: WEB, encoding: "utf8", timeout: 20 * 60_000, maxBuffer: 64 * 1024 * 1024, env }, (e, stdout) => (e ? rej(Object.assign(e, { stdout })) : res(stdout))));
const WEB = path.join(__dirname, "..", "..");
const args = process.argv.slice(2);
const DEV = args.includes("--dev"), SKIP = args.includes("--skip-build");
const only = args.filter((a) => !a.startsWith("--"));
const UP = DEV ? 3210 : 3300, PROXY = Number(process.env.UI_PROXY) || 3301; // หลายคนรันพร้อมกัน: ตั้ง UI_PROXY คนละพอร์ต
const files = fs.readdirSync(__dirname).filter((f) => /^\d\d-.+\.js$/.test(f) && (!only.length || only.some((o) => f.startsWith(o)))).sort();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const up = (port) => new Promise((res) => { const r = http.get({ host: "127.0.0.1", port, path: "/offline", timeout: 60000 }, (x) => { x.resume(); res(x.statusCode < 500); }); r.on("error", () => res(false)); r.on("timeout", () => { r.destroy(); res(false); }); });

(async () => {
  let srv = null;
  if (!DEV) {
    if (await up(UP)) { console.error(`มีเซิร์ฟเวอร์ที่ :${UP} อยู่แล้ว — ปิดก่อน`); process.exit(2); }
    console.log(SKIP ? "ใช้ build เดิม…" : "build production (โหมดสาธิต) ~3 นาที…");
    srv = spawn(process.execPath, [path.join(WEB, "e2e/demo-prod.js"), String(UP)], { cwd: WEB, stdio: ["ignore", "ignore", "pipe"], env: { ...process.env, SKIP_BUILD: SKIP ? "1" : "" } });
    srv.stderr.on("data", (d) => { if (/error/i.test(d)) process.stderr.write(d); });
    for (let i = 0; i < 180 && !(await up(UP)); i++) await sleep(2000);
  }
  if (!(await up(UP))) { console.error(`เซิร์ฟเวอร์ :${UP} ไม่ขึ้น`); srv?.kill(); process.exit(2); }
  // พร็อกซี: ตัด Secure ออกจากคุกกี้ (WebKit ไม่เก็บคุกกี้ Secure บน http://localhost) + IP สุ่มต่อคำขอ (กันชนเพดานราย IP)
  const proxy = http.createServer((req, res) => {
    const p = http.request({ host: "127.0.0.1", port: UP, path: req.url, method: req.method, headers: { ...req.headers, host: `localhost:${UP}`, "x-forwarded-host": req.headers["x-forwarded-host"] || req.headers.host, "x-forwarded-for": req.headers["x-forwarded-for"] || `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } }, (r) => {
      const h = { ...r.headers }; if (h.location) h.location = String(h.location).replace(`//localhost:${UP}`, `//${req.headers.host}`); if (h["set-cookie"]) h["set-cookie"] = h["set-cookie"].map((c) => c.replace(/;\s*secure/gi, ""));
      res.writeHead(r.statusCode, h); r.pipe(res);
    });
    p.on("error", () => { res.writeHead(502); res.end(); });
    req.pipe(p);
  }).listen(PROXY);
  await fetch(`http://localhost:${PROXY}/`).catch(() => {});

  const report = [];
  for (const f of files) for (const dev of ["iphone", "pixel"]) {
    const t0 = Date.now(); let out = "";
    try { out = await runSuite(path.join(__dirname, f), dev, { ...process.env, UI_BASE: `http://localhost:${PROXY}` }); }
    catch (e) { out = String(e.stdout || "") + "\nERR " + e.message.split("\n")[0]; }
    const pass = (out.match(/^PASS /gm) || []).length, fail = (out.match(/^FAIL /gm) || []).length + (/^ERR /m.test(out) ? 1 : 0);
    const notes = (out.match(/^NOTE .*/gm) || []);
    report.push({ suite: f, dev, pass, fail, secs: Math.round((Date.now() - t0) / 1000), fails: out.split("\n").filter((l) => /^(FAIL|ERR)/.test(l)), notes });
    console.log(`${fail ? "✗" : "✓"} ${f.padEnd(22)} ${dev.padEnd(6)} ${String(pass).padStart(3)} ผ่าน${fail ? ` · ${fail} ไม่ผ่าน` : ""} (${Math.round((Date.now() - t0) / 1000)}s)`);
    for (const l of report.at(-1).fails) console.log("    " + l);
  }
  fs.mkdirSync(path.join(__dirname, "out"), { recursive: true });
  fs.writeFileSync(path.join(__dirname, "out", "report.json"), JSON.stringify({ at: new Date().toISOString(), report }, null, 1));
  const total = report.reduce((s, r) => s + r.pass + r.fail, 0), failed = report.reduce((s, r) => s + r.fail, 0);
  console.log(`\nUI รวม ${total} ข้อ · ${failed ? failed + " ไม่ผ่าน" : "ผ่านทั้งหมด"} · ภาพหน้าจอ e2e/ui/out/`);
  proxy.close();
  if (srv) { try { process.platform === "win32" ? execFileSync("taskkill", ["/pid", String(srv.pid), "/T", "/F"], { stdio: "ignore" }) : srv.kill(); } catch {} }
  process.exit(failed ? 1 : 0);
})();
