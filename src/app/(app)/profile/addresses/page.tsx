"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import { Sheet, Field, Toast } from "@/components/ui";
import { ADDRESSES } from "@/lib/booking";

interface Addr { id: string; label: string; detail: string; note: string }

export default function AddressesPage() {
  const { lang } = useI18n();
  const th = lang === "th";
  const [list, setList] = useState<Addr[]>(() => ADDRESSES.map((a) => ({ id: a.id, label: th ? a.th : a.en, detail: a.detail, note: "" })));
  const [def, setDef] = useState<string>(ADDRESSES[0].id);
  const [edit, setEdit] = useState<Addr | null>(null);
  const [toast, setToast] = useState("");
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 1600); };

  const save = () => {
    if (!edit || !edit.label.trim() || !edit.detail.trim()) return;
    setList((l) => l.some((a) => a.id === edit.id) ? l.map((a) => (a.id === edit.id ? edit : a)) : [...l, edit]);
    setEdit(null);
    flash(th ? "บันทึกที่อยู่แล้ว" : "Address saved");
  };
  const remove = (id: string) => {
    const next = list.filter((a) => a.id !== id);
    setList(next);
    if (def === id && next[0]) setDef(next[0].id);
    setEdit(null);
    flash(th ? "ลบที่อยู่แล้ว" : "Address deleted");
  };
  const isNew = edit && !list.some((a) => a.id === edit.id);

  return (
    <>
      <TopBar back="/profile" title={th ? "ที่อยู่ที่บันทึก" : "Saved addresses"} right={<span />} />
      <main className="px-4 pt-5 pb-28 flex flex-col gap-3">
        {list.length === 0 && <p className="glass rounded-3xl p-6 text-center text-sm text-ink-300">{th ? "ยังไม่มีที่อยู่" : "No saved addresses yet"}</p>}
        {list.map((a) => (
          <div key={a.id} className={`glass rounded-3xl p-4 flex items-center gap-3 ${def === a.id ? "border-gold-500/60" : ""}`}>
            <span className="w-11 h-11 rounded-2xl bg-gold-500/10 text-gold-300 grid place-items-center text-xl shrink-0">📍</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{a.label} {def === a.id && <span className="chip chip-gold ml-1">{th ? "หลัก" : "Default"}</span>}</p>
              <p className="text-xs text-ink-300 truncate">{a.detail}{a.note ? ` · ${a.note}` : ""}</p>
              {def !== a.id && <button onClick={() => { setDef(a.id); flash(th ? "ตั้งเป็นที่อยู่หลักแล้ว" : "Set as default"); }} className="text-xs text-gold-500 min-h-9">{th ? "ตั้งเป็นหลัก" : "Set default"}</button>}
            </div>
            <button onClick={() => setEdit(a)} className="btn-ghost rounded-full h-9 px-3.5 text-xs shrink-0">{th ? "แก้ไข" : "Edit"}</button>
          </div>
        ))}
        <button onClick={() => setEdit({ id: `a${Date.now()}`, label: "", detail: "", note: "" })} className="btn-crimson h-14 rounded-full font-display font-semibold mt-2">+ {th ? "เพิ่มที่อยู่ใหม่" : "Add new address"}</button>
      </main>

      <Sheet open={!!edit} onClose={() => setEdit(null)} title={isNew ? (th ? "ที่อยู่ใหม่" : "New address") : (th ? "แก้ไขที่อยู่" : "Edit address")}>
        {edit && (
          <>
            <Field label={th ? "ชื่อที่อยู่ (เช่น บ้าน, ออฟฟิศ)" : "Label (e.g. Home, Office)"}>
              <input value={edit.label} onChange={(e) => setEdit({ ...edit, label: e.target.value })} className="input-dark w-full min-w-0 h-12" />
            </Field>
            <Field label={th ? "ที่อยู่" : "Address"}>
              <input value={edit.detail} onChange={(e) => setEdit({ ...edit, detail: e.target.value })} className="input-dark w-full min-w-0 h-12" />
            </Field>
            <Field label={th ? "หมายเหตุ (ห้อง, ชั้น, จุดสังเกต)" : "Note (room, floor, landmark)"}>
              <input value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} className="input-dark w-full min-w-0 h-12" />
            </Field>
            <div className="flex gap-2">
              {!isNew && <button onClick={() => remove(edit.id)} className="btn-ghost h-12 rounded-full px-5 text-crimson-300">{th ? "ลบ" : "Delete"}</button>}
              <button onClick={save} disabled={!edit.label.trim() || !edit.detail.trim()} className="btn-crimson h-12 rounded-full flex-1 font-display font-semibold">{th ? "บันทึก" : "Save"}</button>
            </div>
          </>
        )}
      </Sheet>
      <Toast show={!!toast}>{toast}</Toast>
    </>
  );
}
