"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import { Field, Modal, Toast } from "@/components/ui";
import { PROVINCES } from "@/lib/categories";
import { DEMO_ME } from "@/lib/demo-data";

export default function EditProfilePage() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [name, setName] = useState(DEMO_ME.name);
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [age, setAge] = useState(String(DEMO_ME.age ?? ""));
  const [province, setProvince] = useState(DEMO_ME.province ?? "กรุงเทพมหานคร");
  const [avatarUrl, setAvatarUrl] = useState(DEMO_ME.avatar);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [saved, setSaved] = useState(false);

  const avatarPool = [
    DEMO_ME.avatar,
    "https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&w=400&q=70&crop=faces",
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=70&crop=faces",
    "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=400&q=70&crop=faces",
  ];

  function save() {
    // demo: บันทึก local (โหมดจริง: PATCH /api/member)
    setSaved(true);
    setTimeout(() => router.push("/profile"), 900);
  }

  return (
    <>
      <TopBar back="/profile" title={`✏️ ${t.profileInfo}`} />
      <div className="px-4 py-4">
        <Field label={lang === "th" ? "รูปโปรไฟล์" : "Avatar"}>
          <div className="flex gap-3 flex-wrap">
            {avatarPool.map((u) => (
              <button key={u} onClick={() => setAvatarUrl(u)}
                className={`w-16 h-16 rounded-full overflow-hidden border-2 transition ${avatarUrl === u ? "border-crimson-500 scale-105" : "border-white/10"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </Field>

        <Field label={lang === "th" ? "ชื่อที่แสดง" : "Display name"}>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input-dark" />
        </Field>

        <Field label={t.gender}>
          <div className="flex gap-2">
            {([["male", lang === "th" ? "ชาย" : "Male"], ["female", lang === "th" ? "หญิง" : "Female"], ["other", lang === "th" ? "อื่นๆ" : "Other"]] as const).map(([v, l]) => (
              <button key={v} onClick={() => setGender(v)} className={`chip flex-1 text-center py-2 ${gender === v ? "chip-red" : ""}`}>{l}</button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label={lang === "th" ? "อายุ" : "Age"}>
            <input type="number" min={18} max={99} value={age} onChange={(e) => setAge(e.target.value)} className="input-dark" />
          </Field>
          <Field label={t.province}>
            <select value={province} onChange={(e) => setProvince(e.target.value)} className="input-dark">
              {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
        </div>

        <button onClick={save} disabled={!name.trim()} className="btn-crimson w-full rounded-xl py-3.5 font-semibold">{t.save}</button>

        <button onClick={() => setDeleteOpen(true)} className="w-full mt-6 text-sm text-crimson-300/80 hover:text-crimson-300 underline underline-offset-4">
          🗑 {t.deleteAccount}
        </button>
      </div>

      {/* delete account */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title={`🗑 ${t.deleteAccount}`}>
        <p className="text-sm text-ink-300">{t.deleteAccountConfirm}</p>
        <p className="text-xs text-ink-500 mt-2">{lang === "th" ? "พิมพ์ DELETE เพื่อยืนยัน" : "Type DELETE to confirm"}</p>
        <input value={deleteText} onChange={(e) => setDeleteText(e.target.value)} className="input-dark mt-2" placeholder="DELETE" />
        <div className="flex gap-2 mt-4">
          <button onClick={() => setDeleteOpen(false)} className="btn-ghost rounded-xl flex-1 py-2.5 text-sm">{t.cancel}</button>
          <button
            disabled={deleteText !== "DELETE"}
            onClick={() => { router.push("/login"); }}
            className="btn-crimson rounded-xl flex-1 py-2.5 text-sm font-semibold disabled:opacity-50"
          >{t.delete}</button>
        </div>
      </Modal>

      <Toast show={saved}>{lang === "th" ? "บันทึกแล้ว ✓" : "Saved ✓"}</Toast>
    </>
  );
}
