import "server-only";
import { cookies } from "next/headers";
import { SITE, type SiteDict } from "./site";
import { LANG_COOKIE, isLang, type Lang } from "./lang";

/** ภาษาของผู้ชม: คุกกี้ hamoo_lang (กดปุ่มสลับภาษา ไทย · EN · 中文) · ไม่มีคุกกี้ = ไทยเสมอ
 *  (ไม่เดาจากภาษาเครื่อง — คนไทยจำนวนมากตั้งมือถือ/LINE เป็นภาษาอังกฤษ จะเปิดมาเจอเว็บอังกฤษ) */
export async function getLang(): Promise<Lang> {
  const c = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(c) ? c : "th";
}
export async function getSite(): Promise<SiteDict> {
  return SITE[await getLang()];
}
export const htmlLang = (l: Lang) => (l === "zh" ? "zh-Hans" : l);
