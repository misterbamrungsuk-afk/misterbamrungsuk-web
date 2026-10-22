// สมัคร Part-Time ครบเส้นทาง: สาย A · สาย B (นวด) · สายคำเชิญ (ไม่มีค่าการันตี) — แต่ละเครื่องรัน 3 แบบ
const { execFileSync } = require("child_process");
const path = require("path");
const dev = process.argv[2] || "pixel";
for (const args of [["A"], ["B"], [dev === "iphone" ? "B" : "A", "invite"]]) {
  try { process.stdout.write(execFileSync(process.execPath, [path.join(__dirname, "_pt-walk.js"), dev, ...args], { encoding: "utf8", env: process.env, timeout: 15 * 60_000 })); }
  catch (e) { process.stdout.write(String(e.stdout || "") + "\nERR " + e.message.split("\n")[0] + "\n"); }
}
