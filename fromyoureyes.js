'use strict'; // işe yaramaz insanlar için işe yaramaz bir kod :D

const https = require('node:https');
const fs = require('node:fs');

const AYAR = {
  hedefler: ['istegim_ad'],
  token: 'yataksensiz',
  sifre: 'iphonesessiz',
  webhook: '@erencan1337',

  host: 'discord.com',
  kontrolYolu: '/api/v9/unique-username/username-attempt-unauthed',
  claimYolu: '/api/v9/users/@me',

  kota: 20,
  pencereSn: 1800,
  checkAraligiMs: 0,
  claimBeklemeMs: 0,
  zamanAsimiMs: 10000,
  hataBeklemeMs: 15000,
  maxUzArdisikHata: 5,

  durumDosyasi: 'sniper-durum.json',
  gunlukDosyasi: 'sniper.log',
  sonucDosyasi: 'sniper-sonuc.txt',
  maxLogBoyut: 5 * 1024 * 1024,

  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
};

const agent = new https.Agent({ keepAlive: true, maxSockets: 4, maxFreeSockets: 4 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const damga = () => new Date().toISOString().replace('T', ' ').slice(0, 19);
const sure = (sn) => {
  if (!isFinite(sn) || sn < 0) return '?';
  const g = Math.floor(sn / 3600), k = Math.floor((sn % 3600) / 60), s = Math.floor(sn % 60);
  return g > 0 ? `${g}s${k}dk` : k > 0 ? `${k}dk${s}sn` : `${s}sn`;
};
const webhookKuruluMu = () => !!AYAR.webhook && !/BURAYA|WEBHOOK_GELECEK|ornek/i.test(AYAR.webhook);

function logSatir(mesaj) {
  const satir = `[${damga()}] ${mesaj}`;
  console.log(satir);
  try {
    if (fs.existsSync(AYAR.gunlukDosyasi) && fs.statSync(AYAR.gunlukDosyasi).size > AYAR.maxLogBoyut) {
      fs.copyFileSync(AYAR.gunlukDosyasi, AYAR.gunlukDosyasi + '.eski');
      fs.writeFileSync(AYAR.gunlukDosyasi, '');
    }
    fs.appendFileSync(AYAR.gunlukDosyasi, satir + '\n');
  } catch { }
}

const durum = { baslangic: Date.now(), gonderilen: 0, toplamKontrol: 0, toplam429: 0 };

function durumYukle() {
  try {
    const j = JSON.parse(fs.readFileSync(AYAR.durumDosyasi, 'utf8'));
    if (typeof j.baslangic === 'number' && typeof j.gonderilen === 'number') {
      if (Date.now() - j.baslangic < AYAR.pencereSn * 1000) {
        durum.baslangic = j.baslangic;
        durum.gonderilen = Math.max(0, Math.min(AYAR.kota, j.gonderilen));
        logSatir(`[durum] Kota durumu geri yuklendi: ${durum.gonderilen}/${AYAR.kota} kullanildi`);
      }
    }
    if (typeof j.toplamKontrol === 'number') durum.toplamKontrol = j.toplamKontrol;
    if (typeof j.toplam429 === 'number') durum.toplam429 = j.toplam429;
  } catch { }
}

function durumKaydet() {
  try { fs.writeFileSync(AYAR.durumDosyasi, JSON.stringify(durum)); } catch { }
}

function pencereTazele() {
  const simdi = Date.now();
  if (simdi - durum.baslangic >= AYAR.pencereSn * 1000) {
    durum.baslangic = simdi;
    durum.gonderilen = 0;
    durumKaydet();
  }
}

function kotaBeklemeMs() {
  pencereTazele();
  const simdi = Date.now();
  if (durum.baslangic > simdi) {
    return durum.baslangic - simdi + 500;
  }
  if (durum.gonderilen >= AYAR.kota) {
    return Math.max(0, durum.baslangic + AYAR.pencereSn * 1000 - simdi + 500);
  }
  return 0;
}

async function kotaBekle(kimlik) {
  let ms = kotaBeklemeMs();
  if (ms > 0) {
