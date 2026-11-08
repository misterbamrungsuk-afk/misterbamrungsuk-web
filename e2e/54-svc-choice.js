// หน้าแรก: เลือกบริการ "เพื่อนกินเพื่อนเที่ยว" / "หมอนวด" (บอส 6 พ.ย. 2569)
// หมอนวดเป็นหน้าแยก /massage (MDG 8 พ.ย. 2569) · ?svc=massage เดิม → พาไป /massage · ?svc=eat = ไม่มีคนสายนวด · 3 ภาษา
const B = 'http://localhost:3210';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
const get = async (u, lang) => (await (await fetch(B + u, { headers: lang ? { cookie: 'hamoo_lang=' + lang } : {} })).text()).replace(/<!-- -->/g, '');
// การ์ดเพื่อน = <a href="/p/..."> ... </a> · บรรทัดกิจกรรมอยู่ในการ์ด
const cards = (h) => h.split('href="/p/').slice(1).map((x) => x.slice(0, x.indexOf('</a>')));
const pressed = (h, k) => new RegExp(`data-svc="${k}"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*data-svc="${k}"`).test(h);

(async () => {
  let h = await get('/');
  ok('home shows both service buttons (TH)', h.includes('data-svc="eat"') && h.includes('data-svc="massage"') && h.includes('เพื่อนกินเพื่อนเที่ยว') && h.includes('>หมอนวดน้ำมันชาย<'));
  ok('nothing pre-selected → all cards', !pressed(h, 'eat') && !pressed(h, 'massage') && cards(h).length > 0, cards(h).length + ' cards');
  const all = cards(h).length;

  const r = await fetch(B + '/?svc=massage', { redirect: 'manual' });
  ok('?svc=massage → redirect to /massage', r.status >= 300 && r.status < 400 && (r.headers.get('location') || '').endsWith('/massage'), r.status + ' ' + r.headers.get('location'));

  h = await get('/massage');
  const m = cards(h);
  ok('/massage: hero + no service chooser', h.includes('id="mz-title"') && h.includes('>หมอนวดน้ำมันชาย<') && !h.includes('data-svc="eat"'));
  ok('/massage lists only massage people (or empty state)', (m.length > 0 && m.every((c) => c.includes('นวดผ่อนคลาย'))) || (m.length === 0 && h.includes('data-mz-empty')), m.length + ' cards');

  h = await get('/?svc=eat');
  const e = cards(h);
  ok('?svc=eat lists no massage people', e.length > 0 && e.every((c) => !c.includes('นวดผ่อนคลาย')), e.length + ' cards');
  ok('eat + massage = all (same group tab)', m.length + e.length === all, `${m.length}+${e.length} vs ${all}`);

  h = await get('/?svc=bogus');
  ok('bad ?svc ignored', !pressed(h, 'eat') && !pressed(h, 'massage') && cards(h).length === all);

  h = await get('/massage', 'en');
  ok('EN labels', h.includes('Male oil massage') && h.includes('Certified therapists'));
  h = await get('/', 'zh');
  ok('中文 labels', h.includes('美食出游伙伴') && h.includes('放松按摩（持证）'));

  console.log(fails ? `\n${fails} FAILED` : '\nALL PASS');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('FAIL crash', e.message); process.exit(1); });
