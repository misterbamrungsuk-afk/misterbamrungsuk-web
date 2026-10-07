"use client";

import { useRouter } from "next/navigation";
import { savePlace, type PickedPlace } from "@/lib/market/place-pick";

// "นัดเพื่อนที่นี่" → เก็บสถานที่ไว้ แล้วไปหน้าหาเพื่อน (/home?place=…)
export function MeetHere({ place }: { place: PickedPlace }) {
  const router = useRouter();
  return (
    <button type="button" onClick={() => { savePlace(place); router.push(`/home?place=${encodeURIComponent(place.id)}`); }}
      className="btn-crimson h-12 px-6 rounded-full font-semibold inline-flex items-center justify-center">
      นัดเพื่อนที่นี่
    </button>
  );
}
