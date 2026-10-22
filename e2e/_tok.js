// โทเคนแอดมิน + resume ของ MBM-2610001 สำหรับชุดทดสอบ (โหมดเดโมเท่านั้น)
const fs=require('fs');const crypto=require('crypto');const b64=(b)=>Buffer.from(b).toString('base64url');
const env=fs.readFileSync(require('path').join(__dirname, '..', '.env.local'),'utf8');let key=(/^ADMIN_SESSION_SECRET=(.*)$/m.exec(env)?.[1]||'').trim().replace(/^["']|["']$/g,'');if(key.length<32)key='mord-demo-only-admin-session-secret-not-for-production';
const p=b64(JSON.stringify({email:'qa-demo@local.test',role:'ceo',exp:Date.now()+3600e3}));
const ps=b64(JSON.stringify({email:'qa-super@local.test',role:'super',exp:Date.now()+3600e3}));
const sup=ps+'.'+b64(crypto.createHmac('sha256',key).update(ps).digest());
const adm=p+'.'+b64(crypto.createHmac('sha256',key).update(p).digest());
const body=b64(JSON.stringify({mb:'MBM-2610001',exp:Date.now()+86400e3}));
const t=body+'.'+crypto.createHmac('sha256','hamoo-demo-secret').update('resume:'+body).digest('base64url');
module.exports = { adm, sup, t };
