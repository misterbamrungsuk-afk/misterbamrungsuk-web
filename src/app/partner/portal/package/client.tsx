"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { lineAddUrl } from "@/lib/join/config";
import { PACKAGE_KEYS, PARTNER_PACKAGES, baht, type PartnerPackageKey } from "@/lib/partner/config";
import { PartnerPayBox } from "../../pay-box";

export function RenewBox({ current }: { current: PartnerPackageKey }) {
  const router = useRouter();
  const [pkg, setPkg] = useState<PartnerPackageKey>(current);
  const [paying, setPaying] = useState(false);
  const [invoice, setInvoice] = useState("");
  const price = PARTNER_PACKAGES[pkg].price;

  if (invoice) return <p className="mt-3 text-sm rounded-2xl border border-gold-500/40 px-4 py-3">ส่งสลิปแล้ว ({invoice}) — ทีมงานจะตรวจภายใน 24 ชม.</p>;

  return (
    <>
      <div className="mt-3 space-y-2" role="radiogroup" aria-label="แพ็กเกจ">
        {PACKAGE_KEYS.map((k) => {
          const x = PARTNER_PACKAGES[k];
          return (
            <button key={k} type="button" role="radio" aria-checked={pkg === k} onClick={() => { setPkg(k); setPaying(false); }}
              className={`w-full flex justify-between items-center gap-3 rounded-2xl border px-4 py-3 text-left ${pkg === k ? "border-gold-500 bg-gold-500/10" : "border-ink-600 bg-ink-800/60"}`}>
              <span><span className="font-display font-semibold">{x.label}</span>{x.badge && <span className="ml-2 text-[11px] text-gold-300">{x.badge}</span>}<span className="block text-xs text-ink-400">{x.desc}</span></span>
              <span className="font-display text-gold-300 shrink-0">{x.price == null ? "ติดต่อทีมงาน" : `฿${baht(x.price)}`}</span>
            </button>
          );
        })}
      </div>
      {price == null ? (
        <a href={lineAddUrl()} target="_blank" rel="noopener noreferrer" className="btn-crimson min-h-12 rounded-full w-full grid place-items-center mt-4 font-semibold">ติดต่อทีมงานเพื่อเสนอราคา</a>
      ) : paying ? (
        <div className="glass rounded-3xl p-5 mt-4">
          <PartnerPayBox key={pkg} pkg={pkg} onDone={(inv) => { setInvoice(inv); router.refresh(); }} />
        </div>
      ) : (
        <button type="button" onClick={() => setPaying(true)} className="btn-crimson min-h-12 rounded-full w-full mt-4 font-semibold">
          {pkg === current ? "ต่ออายุ" : "อัปเกรด"} {PARTNER_PACKAGES[pkg].label} · ฿{baht(price)}
        </button>
      )}
    </>
  );
}
