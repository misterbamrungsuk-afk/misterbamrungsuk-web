import Link from "next/link";
import { baht, imageUrl, type Product } from "@/lib/market/config";
import { AddToCart } from "./market-ui";
import { sized } from "@/lib/thumb-url";

export function FdaBadge() {
  return <span className="inline-flex items-center h-6 px-2.5 rounded-full border border-emerald-500/70 text-emerald-300 text-[11px] font-semibold">✓ อย. ถูกต้อง</span>;
}

export function ProductImage({ p, className = "" }: { p: Product; className?: string }) {
  const src = imageUrl(p.images[0]) && sized(imageUrl(p.images[0])!, 480); // การ์ดสินค้าใช้รูปย่อ
  return src
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={src} alt={p.name} className={`object-cover ${className}`} />
    : <div className={`grid place-items-center bg-[radial-gradient(circle_at_30%_20%,rgba(212,175,55,0.25),transparent_60%),linear-gradient(135deg,#2a1414,#120c0c)] text-gold-400 font-display text-2xl ${className}`}>{p.name.slice(0, 1)}</div>;
}

export function ProductCard({ p, vendor }: { p: Product; vendor?: string }) {
  return (
    <article className="glass glass-hover rounded-3xl overflow-hidden flex flex-col">
      <Link href={`/products/${p.id}`} className="block"><ProductImage p={p} className="w-full aspect-[4/3]" /></Link>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex flex-wrap gap-1.5"><FdaBadge />{p.age_restricted && <span className="inline-flex items-center h-6 px-2.5 rounded-full border border-ink-600 text-ink-300 text-[11px]">20+</span>}</div>
        <Link href={`/products/${p.id}`} className="font-semibold leading-snug hover:text-gold-300">{p.name}</Link>
        {vendor && <p className="text-xs text-ink-300">โดย {vendor}</p>}
        <div className="mt-auto flex items-center gap-3 pt-2">
          <span className="font-display text-xl font-bold text-gold-300">฿{baht(p.price)}</span>
          <AddToCart id={p.id} stock={p.stock} className="ml-auto h-10 px-4 text-sm" />
        </div>
      </div>
    </article>
  );
}
