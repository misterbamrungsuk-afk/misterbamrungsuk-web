// หน้าลูกค้า 3 ภาษา (29 ต.ค. 2569 · เสนอที่สิงคโปร์): ไทย · English · 中文 (จีนตัวย่อ)
// ภาษามาจากคุกกี้ hamoo_lang (ปุ่มสลับภาษา) · ไม่มีคุกกี้ = ไทยเสมอ
const B = 'http://localhost:3210';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
const get = async (u, lang, al) => (await (await fetch(B + u, { headers: { ...(lang ? { cookie: 'hamoo_lang=' + lang } : {}), ...(al ? { 'accept-language': al } : {}) } })).text()).replace(/<!-- -->/g, '');
const htmlLang = (h) => /<html lang="([^"]+)"/.exec(h)?.[1];
const title = (h) => /<title>([^<]*)/.exec(h)?.[1] ?? '';

(async () => {
  // หน้าแรก
  let h = await get('/');
  ok('default = Thai', htmlLang(h) === 'th' && title(h).includes('เลือกเพื่อนของคุณ') && h.includes('data-lang-switch="th"'));
  h = await get('/', 'en');
  ok('home EN: lang + title + labels', htmlLang(h) === 'en' && title(h).includes('Choose your companion') && h.includes('Dining &amp; outings') && h.includes('Gentlemen') && h.includes('data-lang-switch="en"'));
  ok('home EN: offers banner not labelled "Ad/Ads" (ad blockers hide it)', h.includes('aria-label="Featured offers"') && !/aria-label="Ads?[ "]/.test(h));
  ok('home EN: no Thai heading/tabs', !h.includes('>เลือกเพื่อนของคุณ<') && !h.includes('>หนุ่มหล่อ<') && !h.includes('>เพื่อนในระบบ<'));
  h = await get('/', 'zh');
  ok('home 中文: lang zh-Hans + title + labels', htmlLang(h) === 'zh-Hans' && title(h).includes('选择您的社交伙伴') && h.includes('美食出游') && h.includes('帅气男士'));
  ok('home 中文: places translated', h.includes('瓦塔纳') || h.includes('通罗') || h.includes('曼谷'));
  ok('home 中文: footer translated + Gregorian year', h.includes('版权所有') && /© 20\d\d Mister/.test(h));
  h = await get('/', '', 'en-US,en;q=0.9');
  ok('no cookie = Thai even if device is English (Thai market)', htmlLang(h) === 'th');
  h = await get('/', 'xx');
  ok('bad cookie value → Thai', htmlLang(h) === 'th');

  // โปรไฟล์ (คนจริง หรือตัวอย่าง ตามที่หน้าแรกลิงก์ไว้)
  const pid = /href="\/p\/([^"?]+)/.exec(await get('/', 'en'))?.[1];
  ok('home links to a profile', !!pid, pid);
  h = await get('/p/' + pid, 'en');
  ok('profile EN', htmlLang(h) === 'en' && h.includes('Choose a service') && h.includes('Book now') && h.includes('Reviews'));
  h = await get('/p/' + pid, 'zh');
  ok('profile 中文', h.includes('选择服务') && h.includes('立即预约') && h.includes('评价'));
  h = await get('/p/ton?ex=1', 'en');
  ok('sample profile EN: romanised name + translated bio', h.includes('>Ton<') && h.includes('About Ton') && h.includes('certified relaxation'));

  // แผนที่ · ร่วมงาน · เร็ว ๆ นี้
  h = await get('/map', 'en');
  ok('map EN', title(h).startsWith('Map') && h.includes('Search an area') && h.includes('Companions'));
  h = await get('/map', 'zh');
  ok('map 中文', title(h).startsWith('地图') && h.includes('搜索区域'));
  h = await get('/work-with-us', 'en');
  ok('work-with-us EN', h.includes('>Work with us<') && h.includes('Apply for Part-Time') && h.includes('Spas &amp; hotels'));
  h = await get('/work-with-us', 'zh');
  ok('work-with-us 中文', h.includes('与我们合作') && h.includes('报名兼职'));
  h = await get('/soon', 'zh');
  ok('soon 中文', h.includes('即将上线'));
  h = await get('/soon', 'th');
  ok('soon ไทย unchanged', h.includes('เปิดให้บริการเร็ว ๆ นี้'));

  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
