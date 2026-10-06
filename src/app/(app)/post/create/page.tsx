"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import { Field, Modal, Toast } from "@/components/ui";
import { PROVINCES } from "@/lib/categories";
import { ActivityInput, BlockPriceInputs, PlacesPicker, SkillsPicker } from "@/components/offer-fields";
import { usePartnerSpas } from "@/lib/spas";
import { DEMO_POSTS } from "@/lib/demo-data";

const DEFAULT_RULES = [
  "นัดเจอเฉพาะสถานที่สาธารณะเท่านั้น",
  "ลูกค้ารับผิดชอบค่าเดินทางและค่าใช้จ่ายทั้งหมด",
  "ลูกค้าชำระเต็มจำนวนผ่านแอปตอนจอง เงินพักไว้กับเราจนจบนัด",
  "ไม่รับงานผิดกฎหมายทุกประเภท / ไม่รับงานเสี่ยงอันตราย",
];

export default function CreatePostPage() {
  return (
    <Suspense>
      <CreatePostForm />
    </Suspense>
  );
}

function CreatePostForm() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const search = useSearchParams();
  const isEdit = search.get("id") === "p7"; // demo: แก้ไขโพสต์ Smart

  const editing = isEdit ? DEMO_POSTS.find((p) => p.id === "p7") : undefined;
  const spas = usePartnerSpas();
  const [acts, setActs] = useState<string[]>(editing?.activities ?? []);
  const [skills, setSkills] = useState<string[]>(editing?.skills ?? []);
  const [places, setPlaces] = useState<string[]>(editing?.places ?? []);
  const [spaIds, setSpaIds] = useState<string[]>([]);
  const [p3, setP3] = useState<number>(editing?.price3h ?? 2400);
  const [p5, setP5] = useState<number>(editing?.price5h ?? 3800);
  const [workStart, setWorkStart] = useState("12:00");
  const [workEnd, setWorkEnd] = useState("23:00");
  const [langs, setLangs] = useState<string[]>(["ไทย"]);
  const [accept, setAccept] = useState<"any" | "male" | "female">("any");
  const [province, setProvince] = useState("กรุงเทพมหานคร");
  const [area, setArea] = useState("");
  const [personality, setPersonality] = useState("");
  const [interests, setInterests] = useState("");
  const [extra, setExtra] = useState("");
  const [rules, setRules] = useState<string[]>(DEFAULT_RULES);
  const [newRule, setNewRule] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [needVerify, setNeedVerify] = useState(false);
  const [done, setDone] = useState(false);

  const valid = acts.length > 0 && places.length > 0 && p3 > 0 && p5 > 0 && images.length > 0;

  function toggleLang(l: string) {
    setLangs((ls) => (ls.includes(l) ? ls.filter((x) => x !== l) : [...ls, l]));
  }

  function addImage() {
    // demo: เพิ่มรูปตัวอย่าง (โหมดจริง: อัปโหลดขึ้น Supabase Storage bucket posts)
    const pool = [
      "photo-1519345182560-3f2917c472ef", "photo-1495474472287-4d71bcdd2085",
      "photo-1517248135467-4c7edcad34c4", "photo-1482049016688-2d3e1b311543",
      "photo-1531973576160-7125cd663d86", "photo-1528181304800-259b08848526",
    ];
    const pick = pool[images.length % pool.length];
    setImages((xs) => (xs.length >= 6 ? xs : [...xs, `https://images.unsplash.com/${pick}?auto=format&fit=crop&w=800&q=70`]));
  }

  function submit() {
    if (!valid) return;
    setNeedVerify(true); // บัญชีเดโมยังไม่ยืนยันตัวตน → gate แบบ Hafriend (เมื่อผ่าน KYC แล้วจะบันทึกจริง)
  }

  return (
    <>
      <TopBar back="/post/manage" title={isEdit ? t.editPost : t.createPost} />
      <div className="px-4 py-4 space-y-1">
        {/* images */}
        <Field label={lang === "th" ? `รูปโพสต์ (${images.length}/6)` : `Photos (${images.length}/6)`}>
          <div className="flex gap-2 flex-wrap">
            {images.map((src, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="w-20 h-20 rounded-xl object-cover border border-ink-600" />
                <button onClick={() => setImages(images.filter((_, x) => x !== i))}
                  aria-label="remove image" className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-crimson-500 text-white text-sm grid place-items-center border-2 border-ink-900">✕</button>
              </div>
            ))}
            {images.length < 6 && (
              <button onClick={addImage} className="w-20 h-20 rounded-xl border border-dashed border-white/20 grid place-items-center text-ink-400 hover:border-gold-500/50 hover:text-gold-300 transition">
                <span className="text-2xl">＋</span>
              </button>
            )}
          </div>
        </Field>

        <div className="flex flex-col gap-5 pb-4">
          <ActivityInput value={acts} onChange={setActs} th={lang === "th"} />
          <SkillsPicker value={skills} onChange={setSkills} th={lang === "th"} />
          <PlacesPicker value={places} onChange={setPlaces} spas={spas} spaIds={spaIds} onSpaIds={setSpaIds} th={lang === "th"} />
          <BlockPriceInputs p3={p3} p5={p5} onP3={setP3} onP5={setP5} th={lang === "th"} />
        </div>

        <Field label={t.workingHours}>
          <div className="flex gap-2 items-center">
            <input type="time" value={workStart} onChange={(e) => setWorkStart(e.target.value)} className="input-dark" />
            <span className="text-ink-400">–</span>
            <input type="time" value={workEnd} onChange={(e) => setWorkEnd(e.target.value)} className="input-dark" />
          </div>
        </Field>

        <Field label={t.languages}>
          <div className="flex gap-2">
            {["ไทย", "English", "中文", "日本語"].map((l) => (
              <button key={l} onClick={() => toggleLang(l)} className={`chip flex-1 text-center ${langs.includes(l) ? "chip-gold" : ""}`}>{l}</button>
            ))}
          </div>
        </Field>

        <Field label={t.acceptGender}>
          <div className="flex gap-2">
            {([["any", lang === "th" ? "ไม่จำกัดเพศ" : "Any"], ["male", lang === "th" ? "รับชาย" : "Male"], ["female", lang === "th" ? "รับหญิง" : "Female"]] as const).map(([v, l]) => (
              <button key={v} onClick={() => setAccept(v)} className={`chip flex-1 text-center ${accept === v ? "chip-red" : ""}`}>{l}</button>
            ))}
          </div>
        </Field>

        <Field label={t.province}>
          <select value={province} onChange={(e) => setProvince(e.target.value)} className="input-dark">
            {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>

        <Field label={t.serviceArea}>
          <input value={area} onChange={(e) => setArea(e.target.value)} className="input-dark" placeholder={lang === "th" ? "เช่น ได้ทั่วกรุงเทพและปริมณฑล" : "e.g. All Bangkok"} />
        </Field>

        <Field label={lang === "th" ? "นิสัย / ความสนใจ / ข้อมูลเพิ่มเติม" : "About you"}>
          <textarea value={personality} onChange={(e) => setPersonality(e.target.value)} rows={2} className="input-dark mb-2" placeholder={lang === "th" ? "นิสัย เช่น เฟรนลี่ ชิลๆ" : "Personality"} />
          <textarea value={interests} onChange={(e) => setInterests(e.target.value)} rows={2} className="input-dark mb-2" placeholder={lang === "th" ? "ความสนใจ เช่น คาเฟ่ ถ่ายรูป" : "Interests"} />
          <textarea value={extra} onChange={(e) => setExtra(e.target.value)} rows={2} className="input-dark" placeholder={lang === "th" ? "ข้อมูลเพิ่มเติม เช่น ส่วนสูง ประสบการณ์" : "More info"} />
        </Field>

        <Field label={`📋 ${t.rules}`}>
          <div className="space-y-2">
            {rules.map((r, i) => (
              <div key={i} className="flex items-center gap-2 glass rounded-xl px-3 py-2">
                <span className="text-gold-600">✓</span>
                <input value={r} onChange={(e) => setRules(rules.map((x, xi) => (xi === i ? e.target.value : x)))} className="flex-1 bg-transparent outline-none text-sm" />
                <button onClick={() => setRules(rules.filter((_, x) => x !== i))} aria-label="remove rule" className="w-9 h-9 -mr-2 shrink-0 grid place-items-center text-ink-300 hover:text-crimson-400">✕</button>
              </div>
            ))}
            <div className="flex gap-2">
              <input value={newRule} onChange={(e) => setNewRule(e.target.value)} className="input-dark" placeholder={lang === "th" ? "เพิ่มกติกา…" : "Add rule…"}
                onKeyDown={(e) => { if (e.key === "Enter" && newRule.trim()) { setRules([...rules, newRule.trim()]); setNewRule(""); } }} />
              <button onClick={() => { if (newRule.trim()) { setRules([...rules, newRule.trim()]); setNewRule(""); } }} className="btn-ghost rounded-xl px-4 text-sm">＋</button>
            </div>
          </div>
        </Field>

        <p className="text-[11px] text-ink-500 text-center">{t.postLimitNote} · {lang === "th" ? "โพสต์อยู่ 30 วัน ต่ออายุได้" : "Post expires in 30 days"}</p>

        <button onClick={submit} disabled={!valid} className="btn-crimson w-full rounded-xl py-3.5 font-semibold mt-2">
          {isEdit ? t.save : t.createPost}
        </button>
      </div>

      <Modal open={needVerify} onClose={() => setNeedVerify(false)} title="🔒">
        <div className="text-center py-2">
          <p className="text-4xl mb-3">🛡️</p>
          <p className="text-sm text-ink-300 mt-1">{t.needVerify}</p>
          <div className="flex gap-2 mt-5">
            <button onClick={() => setNeedVerify(false)} className="btn-ghost rounded-xl flex-1 py-2.5 text-sm">{t.cancel}</button>
            <button onClick={() => { setNeedVerify(false); router.push("/profile/verify"); }} className="btn-crimson rounded-xl flex-1 py-2.5 text-sm font-semibold">{t.verifyNow}</button>
          </div>
        </div>
      </Modal>

      <Toast show={done}>{lang === "th" ? "บันทึกแล้ว ✓" : "Saved ✓"}</Toast>
    </>
  );
}
