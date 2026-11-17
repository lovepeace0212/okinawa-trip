import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin, Navigation, Clock, Ticket, Info, CloudSun,
  Utensils, Bed, Plane, Phone, Wallet,
  AlertCircle, FileText, Coffee, Plus, Trash2, Receipt, Car, X, Tag,
  Home, List, CheckSquare, Sun, CloudRain, Users, FileCheck2, ChevronRight, CheckCircle2,
  ShieldAlert, ArrowRightLeft, Copy, Check, Camera, PieChart as PieChartIcon, BarChart3,
  Umbrella, Compass, LogOut, Lock, Shield, BookOpen, CreditCard, Cloud, CloudOff, UserCheck
} from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc } from 'firebase/firestore';

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyCYKrk0bq0F2DzBebKQAB5WnZZlOXWoDkI",
  authDomain: "okinawa-trip-2027.firebaseapp.com",
  projectId: "okinawa-trip-2027",
  storageBucket: "okinawa-trip-2027.firebasestorage.app",
  messagingSenderId: "596681914834",
  appId: "1:596681914834:web:fd8274fc197710f1f1300b",
  measurementId: "G-4ZVN2KJYZN"
};

// 安全初始化 Firebase
let app = null;
let auth = null;
let db = null;
try {
  app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (err) {
  console.warn("Firebase 初始化略過，將使用本機模式:", err);
}

// --- 4 位家人 Email 白名單與預設稱呼對照 ---
const ALLOWED_EMAILS = [
  "lovepeace0212@gmail.com",
  "amanda0091@gmail.com",
  "joe.lom122@gmail.com",
  "hsunuan@gmail.com"
];

const EMAIL_TO_DEFAULT_MEMBER = {
  "lovepeace0212@gmail.com": "本人",
  "amanda0091@gmail.com": "老婆",
  "joe.lom122@gmail.com": "爸爸",
  "hsunuan@gmail.com": "媽媽"
};

const FAMILY_MEMBERS = ['本人', '老婆', '爸爸', '媽媽'];

// 每位家人的專屬標籤配色
const MEMBER_BADGE_STYLE = {
  '本人': 'bg-[#EAF3FA] text-[#316999] border-[#D3E5F4]',
  '老婆': 'bg-[#FCECEE] text-[#B93A49] border-[#F2D7D9]',
  '爸爸': 'bg-[#EBF5EE] text-[#2F6B4A] border-[#D4E8DC]',
  '媽媽': 'bg-[#FDF2E9] text-[#C75A22] border-[#F4E0D1]'
};

// 取得項目目前已打勾的家人清單 (相容舊版單人字串與新版陣列)
const getCheckedMembers = (item) => {
  if (!item) return [];
  if (Array.isArray(item.checkedByList)) {
    return item.checkedByList;
  }
  if (item.checked && item.checkedBy) {
    return [item.checkedBy];
  }
  return [];
};

// 判斷是否為開發/預覽沙盒環境（在正式部署的 Vercel / Firebase 網址上必定為 false，確保 100% 門禁安全）
const isSandboxPreview = (() => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname || '';
  const proto = window.location.protocol || '';
  if (host.endsWith('.vercel.app') || host.endsWith('.web.app') || host.endsWith('.firebaseapp.com')) {
    return false;
  }
  return (
    !host ||
    host === 'localhost' ||
    host.includes('usercontent.goog') ||
    host.includes('google') ||
    host.includes('webcontainer') ||
    proto === 'about:' ||
    proto === 'blob:' ||
    proto === 'data:'
  );
})();

// --- TRIP DATA ---
const tripData = {
  overview: [
    {
      day: 1,
      date: "2/8 (一)",
      title: "抵達沖繩・恩納海岸線巡禮",
      area: "那霸 ➔ 中部 ➔ 恩納",
      region: "mid",
      routeUrl: "https://www.google.com/maps/dir/那霸機場/ORIX+Rent-a-car+Naha+Airport/殘波岬/萬座毛/沖繩蒙特利水療度假酒店"
    },
    {
      day: 2,
      date: "2/9 (二)",
      title: "北部海洋深度探索",
      area: "恩納 ➔ 本部半島 ➔ 古宇利島",
      region: "north",
      routeUrl: "https://www.google.com/maps/dir/沖繩蒙特利水療度假酒店/沖繩美麗海水族館/古宇利大橋/今歸仁城遺址/沖繩蒙特利水療度假酒店"
    },
    {
      day: 3,
      date: "2/10 (三)",
      title: "中部商圈血拼與絕美夕陽",
      area: "恩納 ➔ 北谷美國村 ➔ 瀨長島",
      region: "mid",
      routeUrl: "https://www.google.com/maps/dir/沖繩蒙特利水療度假酒店/永旺夢樂城沖繩來客夢/美國村/琉球溫泉瀨長島酒店"
    },
    {
      day: 4,
      date: "2/11 (四)",
      title: "南部神聖秘境與海景咖啡",
      area: "瀨長島 ➔ 南城 ➔ 那霸市區",
      region: "south",
      routeUrl: "https://www.google.com/maps/dir/琉球溫泉瀨長島酒店/玉泉洞/齋場御嶽/知念岬公園/ORIX+美榮橋站前店"
    },
    {
      day: 5,
      date: "2/12 (五)",
      title: "那霸市區歷史與市場漫步",
      area: "那霸市區全日 (單軌/步行)",
      region: "naha",
      routeUrl: "https://www.google.com/maps/dir/JR九州Blossom那霸/第一牧志公設市場/首里城/波上宮/國際通"
    },
    {
      day: 6,
      date: "2/13 (六)",
      title: "滿載而歸",
      area: "那霸市區 ➔ 那霸機場",
      region: "naha",
      routeUrl: "https://www.google.com/maps/dir/JR九州Blossom那霸/美榮橋站/那霸機場"
    },
  ],
  daily: [
    {
      day: 1,
      date: "2/8 (一)",
      weather: { temp: "18°C / 15°C", desc: "多雲時晴" },
      spots: [
        {
          type: "transport",
          title: "抵達那霸 ✈️ & ORIX 租車",
          intro: "12:15 抵達那霸機場。預計 14:00 前往 ORIX 那霸機場店辦理 8 人座大型廂型車 (WA Class) 取車手續。",
          time: "14:00 取車",
          stay: "約 1.5 小時 (含接駁與手續)",
          gmap: "https://www.google.com/maps/place/ORIX+Rent-a-car+Naha+Airport/@26.1581966,127.6548383,19.27z",
          docLinks: [{ link: "https://drive.google.com/file/d/1eH6V4Bki5zAJUcp9z-AGRnEWszpP0BFi/view?usp=drive_link", name: "開啟 ORIX 租車預約單" }],
          tags: ["重要預約代號: W8310820", "準備: 台灣駕照正本 與 日文譯本"]
        },
        {
          type: "attraction",
          title: "殘波岬 (視行程時間)",
          intro: "沖繩本島最西端海角。💡 備註：如果能順利在 15:30 前抵達，則改為先去殘波岬，去完再去萬座毛！",
          mapcode: "1005 685 416*05",
          gmap: "https://www.google.com/maps/search/?api=1&query=殘波岬",
          tickets: "免費 (登塔 ¥300)",
          hours: "24小時開放 (燈塔 09:30-16:30)",
          stay: "40分鐘",
          tags: ["必拍: 白色燈塔", "提醒: 注意時間，15:30前抵達優先前往"]
        },
        {
          type: "attraction",
          title: "萬座毛",
          intro: "沖繩西海岸的代表性奇岩絕景，形如象鼻的珊瑚礁懸崖，海流湛藍清澈。",
          mapcode: "206 282 820*20",
          gmap: "https://www.google.com/maps/search/?api=1&query=萬座毛",
          tickets: "門票 ¥100/人",
          hours: "08:00 - 19:00",
          stay: "45分鐘",
          tags: ["必拍: 象鼻岩夕陽", "注意: 海風較大需備薄外套"]
        },
        {
          type: "food",
          title: "晚餐選擇 (恩納村周邊)",
          intro: "入住飯店後於周邊享用沖繩在地特色晚餐。",
          mapcode: "請參考清單",
          gmap: "https://www.google.com/maps/search/?api=1&query=琉球的牛恩納店",
          stay: "1.5 小時",
          tags: ["必吃美食: 琉球的牛 (頂級和牛)", "必點菜單: 元祖海葡萄蓋飯"]
        },
        {
          type: "hotel",
          title: "沖繩蒙特利水療度假酒店",
          intro: "坐擁老虎海灘的英式殖民風格全海景度假酒店。(連住兩晚)",
          checkIn: "15:00",
          checkOut: "11:00",
          phone: "+81(0)98-993-7111",
          breakfast: "含早餐 / 5F (06:30 - 10:30)",
          mapcode: "206 096 896*52",
          gmap: "https://www.google.com/maps/search/?api=1&query=沖繩蒙特利水療度假酒店",
          docLinks: [{ link: "https://drive.google.com/file/d/1du8DvKQyLmYou1SK5Yi8QOmiBn7df4CY/view?usp=drive_link", name: "開啟飯店訂房憑證" }],
          tags: ["提醒: 1/25前免費修改取消"]
        }
      ],
      rainySpots: [
        {
          type: "transport",
          title: "抵達那霸 ✈️ & ORIX 租車",
          intro: "12:15 抵達那霸機場，前往 ORIX 辦理取車手續（雨天行車請保持安全車距）。",
          time: "14:00 取車",
          stay: "約 1.5 小時",
          gmap: "https://www.google.com/maps/place/ORIX+Rent-a-car+Naha+Airport/@26.1581966,127.6548383,19.27z",
          docLinks: [{ link: "https://drive.google.com/file/d/1eH6V4Bki5zAJUcp9z-AGRnEWszpP0BFi/view?usp=drive_link", name: "開啟 ORIX 租車預約單" }],
          tags: ["重要預約代號: W8310820", "雨天備案: 優先轉往室內景點"]
        },
        {
          type: "attraction",
          title: "☔ 浦添 PARCO CITY 大型購物中心",
          intro: "全室內大型臨海百貨，擁有超過 250 家店鋪與海景美食街，完全不受風雨影響，適合輕鬆逛街採買。",
          mapcode: "33 308 838*82",
          gmap: "https://www.google.com/maps/search/?api=1&query=SAN-A浦添西海岸PARCO+CITY",
          tickets: "免費停車",
          hours: "10:00 - 22:00",
          stay: "2 - 3 小時",
          tags: ["雨天首選: 全室內免淋雨", "必買伴手禮: 藥妝與沖繩特產"]
        },
        {
          type: "hotel",
          title: "沖繩蒙特利水療度假酒店 (提早入住泡湯)",
          intro: "雨天提早入住享受飯店室內溫水泳池、天然溫泉「Blue Reef」與海景下午茶。",
          checkIn: "15:00",
          checkOut: "11:00",
          phone: "+81(0)98-993-7111",
          mapcode: "206 096 896*52",
          gmap: "https://www.google.com/maps/search/?api=1&query=沖繩蒙特利水療度假酒店",
          tags: ["攻略: 飯店內設施豐富"]
        }
      ]
    },
    {
      day: 2,
      date: "2/9 (二)",
      weather: { temp: "19°C / 16°C", desc: "晴天" },
      spots: [
        {
          type: "attraction",
          title: "沖繩美麗海水族館",
          intro: "世界最大級的巨大水槽「黑潮之海」，可觀賞鯨鯊與鬼蝠魟的壯觀優游。",
          mapcode: "553 075 592*40",
          gmap: "https://www.google.com/maps/search/?api=1&query=沖繩美麗海水族館",
          tickets: "¥2,180/大人",
          hours: "08:30 - 18:30",
          stay: "3 - 4 小時",
          tags: ["必買伴手禮: 鯨鯊周邊商品", "攻略: 戶外海豚劇場免門票 (場次: 10:30, 11:30, 13:00)"]
        },
        {
          type: "attraction",
          title: "古宇利大橋 & 古宇利島",
          intro: "全長近2公里的跨海大橋，連接擁有「神之島」美譽的古宇利島，海水呈絕美漸層藍。",
          mapcode: "485 693 423*71",
          gmap: "https://www.google.com/maps/search/?api=1&query=古宇利大橋",
          tickets: "免費",
          hours: "24小時開放",
          stay: "2 小時",
          tags: ["必拍: 橋頭絕景", "必吃美食: 蝦餐車 Shrimp Wagon 蒜蓉奶油蝦飯"]
        },
        {
          type: "attraction",
          title: "今歸仁城遺址",
          intro: "世界遺產，沖繩北部歷史名城。2月份正值寒緋櫻花季，若有夜間點燈建議傍晚前往。",
          mapcode: "553 081 557",
          gmap: "https://www.google.com/maps/search/?api=1&query=今歸仁城遺址",
          tickets: "¥1,000/人",
          hours: "08:00 - 18:00",
          stay: "1.5 小時",
          tags: ["攻略: 沿著城牆的櫻花道最美"]
        }
      ],
      rainySpots: [
        {
          type: "attraction",
          title: "☔ 沖繩美麗海水族館 (全室內館區)",
          intro: "水族館主體皆為室內空間，雨天參觀依然精彩！建議停在 P7 立體停車場（有遮雨棚）步行最近。",
          mapcode: "553 075 592*40",
          gmap: "https://www.google.com/maps/search/?api=1&query=沖繩美麗海水族館",
          tickets: "¥2,180/大人",
          hours: "08:30 - 18:30",
          stay: "3.5 小時",
          tags: ["雨天攻略: 停 P7 立體停車場免淋雨"]
        },
        {
          type: "attraction",
          title: "☔ 名護鳳梨園 / Orion 啤酒名護工廠",
          intro: "搭乘有屋頂的自動鳳梨車遊園與室內品酒，或是預約參觀 Orion 啤酒工廠見學並免費試飲生啤酒（駕駛請喝無酒精）。",
          mapcode: "206 716 467*82",
          gmap: "https://www.google.com/maps/search/?api=1&query=名護鳳梨園",
          tickets: "¥1,200/大人",
          hours: "10:00 - 18:00",
          stay: "2 小時",
          tags: ["雨天首選: 全程室內與遮雨棚", "必買伴手禮: 鳳梨蛋糕"]
        }
      ]
    },
    {
      day: 3,
      date: "2/10 (三)",
      weather: { temp: "20°C / 17°C", desc: "晴時多雲" },
      spots: [
        {
          type: "attraction",
          title: "永旺夢樂城沖繩來客夢 (AEON)",
          intro: "沖繩最大規模的購物中心，進駐超過200家國內外品牌。",
          mapcode: "33 530 234*37",
          gmap: "https://www.google.com/maps/search/?api=1&query=永旺夢樂城沖繩來客夢",
          tickets: "免門票",
          hours: "10:00 - 22:00",
          stay: "3 - 4 小時",
          tags: ["必買伴手禮: 藥妝、日本服飾品牌"]
        },
        {
          type: "attraction",
          title: "美國村 (American Village)",
          intro: "充滿異國風情的休閒商圈，日落聞名，打卡小店林立。",
          mapcode: "33 525 381*36",
          gmap: "https://www.google.com/maps/search/?api=1&query=美國村",
          tickets: "免門票",
          hours: "11:00 - 21:00",
          stay: "3 小時",
          tags: ["必吃美食: 歐姆蛋塔可飯", "必吃美食: Seaside Cafe 鬆餅"]
        },
        {
          type: "hotel",
          title: "琉球溫泉瀨長島酒店",
          intro: "那霸機場旁的度假勝地，擁有絕景天然溫泉「龍神之湯」。",
          checkIn: "15:00",
          checkOut: "11:00",
          phone: "+81(0)98-851-7077",
          breakfast: "含早餐 / 1F (07:00 - 10:30)",
          mapcode: "33 002 605*15",
          gmap: "https://www.google.com/maps/search/?api=1&query=琉球溫泉瀨長島酒店",
          docLinks: [{ link: "https://drive.google.com/file/d/1ihgn6L2EsPlr2IfLbFCrjQverKoF7HZG/view?usp=drive_link", name: "開啟飯店訂房憑證" }],
          tags: ["攻略: 傍晚泡溫泉看夕陽與飛機起降", "提醒: 2/2前可免費取消"]
        }
      ],
      rainySpots: [
        {
          type: "attraction",
          title: "☔ 永旺夢樂城沖繩來客夢 (深度購物)",
          intro: "全館室內冷暖氣與超大立體停車場，雨天可直接延長停留時間，連同午餐與採買一次搞定。",
          mapcode: "33 530 234*37",
          gmap: "https://www.google.com/maps/search/?api=1&query=永旺夢樂城沖繩來客夢",
          tickets: "免門票",
          hours: "10:00 - 22:00",
          stay: "4 - 5 小時",
          tags: ["雨天首選: 大型室內商場"]
        },
        {
          type: "hotel",
          title: "琉球溫泉瀨長島酒店 (享受龍神之湯)",
          intro: "提早前往飯店入住，在室內外半露天溫泉享受療癒的泡湯時光。",
          checkIn: "15:00",
          checkOut: "11:00",
          phone: "+81(0)98-851-7077",
          mapcode: "33 002 605*15",
          gmap: "https://www.google.com/maps/search/?api=1&query=琉球溫泉瀨長島酒店",
          tags: ["攻略: 房客免費使用龍神之湯"]
        }
      ]
    },
    {
      day: 4,
      date: "2/11 (四)",
      weather: { temp: "19°C / 15°C", desc: "多雲" },
      spots: [
        {
          type: "attraction",
          title: "玉泉洞 (沖繩世界文化王國)",
          intro: "歷經30萬年形成的日本國內最大級鐘乳石洞。",
          mapcode: "232 495 392*45",
          gmap: "https://www.google.com/maps/search/?api=1&query=玉泉洞",
          tickets: "¥2,000 (套票)",
          hours: "09:00 - 17:30",
          stay: "2.5 小時",
          tags: ["必拍: 青泉地底湖", "攻略: 洞內濕滑請穿好走的鞋"]
        },
        {
          type: "attraction",
          title: "齋場御嶽",
          intro: "琉球王國最高聖地(世界遺產)。請先至「南城市地域物產館」購買門票。",
          mapcode: "33 024 253*22",
          gmap: "https://www.google.com/maps/search/?api=1&query=齋場御嶽",
          tickets: "¥600 (南城市地域物產館購票)",
          hours: "09:00 - 17:30",
          stay: "1 小時",
          tags: ["注意: 聖地請保持肅靜"]
        },
        {
          type: "attraction",
          title: "知念岬公園 (視行程時間)",
          intro: "擁有270度無死角太平洋海景的秘境海岬。💡 因最晚需18:00前還車，建議 16:00 前從南部離開。若時間不足可取消此景點。",
          mapcode: "232 594 531*20",
          gmap: "https://www.google.com/maps/search/?api=1&query=知念岬公園",
          tickets: "免費",
          hours: "24小時開放",
          stay: "30 分鐘",
          tags: ["必吃美食: 浜邊的茶屋", "提醒: 視時間決定是否前往"]
        },
        {
          type: "transport",
          title: "ORIX 美榮橋站前店 (外語櫃檯還車)",
          intro: "前往指定的租車公司市區營業所還車，結算ETC與油資。強烈建議 16:00 從南部出發。",
          time: "最晚 18:00 前還車",
          phone: "098-869-0543",
          stay: "30 分鐘 (含手續)",
          gmap: "https://www.google.com/maps/search/?api=1&query=ORIX+美榮橋站前店",
          tags: ["注意: 還車前記得加滿油 (滿油還車)"]
        },
        {
          type: "hotel",
          title: "JR九州Blossom那霸",
          intro: "位於國際通周邊的高質感現代和風飯店，交通極佳。(連住兩晚)",
          checkIn: "15:00",
          checkOut: "11:00",
          phone: "+81(0)98-861-8700",
          breakfast: "無含早餐",
          mapcode: "33 157 534*82",
          gmap: "https://www.google.com/maps/search/?api=1&query=JR九州Blossom那霸",
          docLinks: [
            { link: "https://drive.google.com/file/d/1ArS9aZWlBwDQhxbwti_qudp2NMdnCYkR/view?usp=drive_link", name: "開啟飯店訂房憑證 (1)" },
            { link: "https://drive.google.com/file/d/1km6gOt1_58rZsE6dv8r3zXGSZ8ITRqW8/view?usp=drive_link", name: "開啟飯店訂房憑證 (2)" }
          ],
          tags: ["提醒: 2/11當日極限取消", "必吃美食: 國際通 暖暮拉麵"]
        }
      ],
      rainySpots: [
        {
          type: "attraction",
          title: "☔ 玉泉洞 (地底鐘乳石洞)",
          intro: "地底鐘乳石洞完全不受下雨影響，加上室內太鼓秀與工藝村，是南部最佳雨天景點。",
          mapcode: "232 495 392*45",
          gmap: "https://www.google.com/maps/search/?api=1&query=玉泉洞",
          tickets: "¥2,000 (套票)",
          hours: "09:00 - 17:30",
          stay: "2.5 小時",
          tags: ["雨天首選: 地底完全不淋雨"]
        },
        {
          type: "attraction",
          title: "☔ DMM Kariyushi 水族館 & iias 沖繩豐崎",
          intro: "距離瀨長島僅 10 分鐘車程的新型態室內水族館與大型商場，取代戶外齋場御嶽與知念岬。",
          mapcode: "232 543 400*25",
          gmap: "https://www.google.com/maps/search/?api=1&query=iias沖繩豐崎",
          tickets: "商場免費 / 水族館 ¥2,400",
          hours: "10:00 - 21:00",
          stay: "2.5 小時",
          tags: ["雨天攻略: 室內好逛又好停車"]
        },
        {
          type: "transport",
          title: "ORIX 美榮橋站前店 (還車)",
          intro: "18:00 前加滿油還車，步行或搭計程車前往 JR九州Blossom那霸飯店。",
          time: "最晚 18:00 前還車",
          phone: "098-869-0543",
          gmap: "https://www.google.com/maps/search/?api=1&query=ORIX+美榮橋站前店",
          tags: ["注意: 滿油還車"]
        }
      ]
    },
    {
      day: 5,
      date: "2/12 (五)",
      weather: { temp: "21°C / 17°C", desc: "晴天" },
      spots: [
        {
          type: "attraction",
          title: "第一牧志公設市場",
          intro: "「沖繩的廚房」，重新整修後明亮乾淨。一樓買海鮮，二樓代客料理。",
          mapcode: "33 157 264*54",
          gmap: "https://www.google.com/maps/search/?api=1&query=第一牧志公設市場",
          tickets: "免門票",
          hours: "08:00 - 21:00",
          stay: "1.5 小時",
          tags: ["必吃美食: 珀塔瑪豬肉蛋飯糰 (牧志本店)"]
        },
        {
          type: "attraction",
          title: "首里城公園 (搭乘單軌)",
          intro: "琉球王國的政治與文化中心 (正殿重建工程見學中)。單軌首里站下車後，步行約 15 分鐘即可抵達守禮門。",
          mapcode: "33 161 526*66",
          gmap: "https://www.google.com/maps/search/?api=1&query=首里城",
          tickets: "¥1,000 (收費區域)",
          hours: "08:30 - 18:00",
          stay: "2 小時",
          tags: ["必吃美食: 首里麵 (手打麵)"]
        },
        {
          type: "attraction",
          title: "波上宮 & 國際通",
          intro: "波上宮建於珊瑚礁斷崖上。傍晚回到國際通做最後的大採購。",
          mapcode: "33 186 220*06",
          gmap: "https://www.google.com/maps/search/?api=1&query=波上宮",
          tickets: "免門票",
          hours: "神社 09:00 - 17:00",
          stay: "3 - 4 小時",
          tags: ["必買伴手禮: 波上宮書包御守"]
        }
      ],
      rainySpots: [
        {
          type: "attraction",
          title: "☔ 平和通商店街 & 第一牧志公設市場",
          intro: "整條平和通與市場本通都有大型遮雨棚！輕鬆品嚐海鮮料理、買伴手禮完全免撐傘。",
          gmap: "https://www.google.com/maps/search/?api=1&query=第一牧志公設市場",
          tickets: "免門票",
          hours: "09:00 - 20:00",
          stay: "2.5 小時",
          tags: ["雨天首選: 全程有遮雨棚"]
        },
        {
          type: "attraction",
          title: "☔ 沖繩縣立博物館・美術館 / T Galleria 免稅店",
          intro: "搭乘單軌電車至「歌町站 (Omoromachi)」即可直達大型免稅店與博物館，室內行程優雅又舒適。",
          gmap: "https://www.google.com/maps/search/?api=1&query=沖繩縣立博物館美術館",
          tickets: "博物館 ¥530 / 免稅店免費",
          hours: "09:00 - 18:00",
          stay: "3 小時",
          tags: ["攻略: 單軌直達免淋雨"]
        }
      ]
    },
    {
      day: 6,
      date: "2/13 (六)",
      weather: { temp: "22°C / 18°C", desc: "晴天" },
      spots: [
        {
          type: "transport",
          title: "那霸 ✈️ 台中",
          intro: "最晚 09:30 從飯店出發，步行約 10 分鐘至單軌電車美榮橋站。搭乘 09:43 的班次，車程 14 分鐘，預計 10:00 抵達機場。",
          time: "13:15 班機起飛",
          tickets: "單軌電車費用 ¥320",
          stay: "起飛前 2.5 小時抵達機場",
          gmap: "https://www.google.com/maps/search/?api=1&query=那霸機場",
          tags: ["必吃美食: 空港食堂 (沖繩麵)", "必買伴手禮: Royce 巧克力"]
        }
      ],
      rainySpots: [
        {
          type: "transport",
          title: "☔ 搭計程車直達那霸機場",
          intro: "若回程日下大雨且行李較多，建議請飯店櫃檯直接叫計程車前往機場（車程約 15 分鐘，4人分攤約 ¥1,500-2,000），輕鬆又省力。",
          time: "13:15 班機起飛",
          stay: "建議 10:00 前抵達機場",
          gmap: "https://www.google.com/maps/search/?api=1&query=那霸機場",
          tags: ["雨天攻略: 飯店直接叫車最舒適"]
        }
      ]
    }
  ],
  emergency: [
    { name: "日本警察局 (報案 / 交通事故)", phone: "110", desc: "24小時緊急報案" },
    { name: "日本救護車 / 消防車", phone: "119", desc: "緊急醫療與火警" },
    { name: "台北駐日經濟文化代表處 (那霸分處)", phone: "+81-98-862-7008", desc: "護照遺失或急難救助" },
    { name: "ORIX 租車 (那霸美榮橋站前店)", phone: "+81-98-869-0543", desc: "還車與車輛狀況諮詢" },
    { name: "沖繩蒙特利水療度假酒店", phone: "+81-98-993-7111", desc: "Day 1-2 住宿 (恩納)" },
    { name: "琉球溫泉瀨長島酒店", phone: "+81-98-851-7077", desc: "Day 3 住宿 (瀨長島)" },
    { name: "JR九州Blossom那霸", phone: "+81-98-861-8700", desc: "Day 4-5 住宿 (國際通)" }
  ]
};

const dayToDate = { 1: '2/8', 2: '2/9', 3: '2/10', 4: '2/11', 5: '2/12', 6: '2/13' };
const CATEGORY_COLORS = {
  '飲食': '#E3956F',
  '交通': '#587B8E',
  '住宿': '#A297AC',
  '門票': '#4A5D54',
  '購物': '#C75A22',
  '其他': '#8A857B'
};

// --- CHECKLIST INITIAL DATA ---
const initialDepartureList = {
  "機票": [{ text: "訂機票", checked: false, checkedByList: [] }, { text: "確認護照效期 6 個月以上", checked: false, checkedByList: [] }, { text: "預約機場接送", checked: false, checkedByList: [] }, { text: "截圖機票與飯店訂位單", checked: false, checkedByList: [] }, { text: "線上報到與劃位", checked: false, checkedByList: [] }],
  "住宿": [{ text: "訂住宿", checked: false, checkedByList: [] }, { text: "填寫入住資料", checked: false, checkedByList: [] }],
  "行程": [{ text: "熱門餐廳訂位", checked: false, checkedByList: [] }, { text: "門票預購", checked: false, checkedByList: [] }],
  "保險": [{ text: "旅平險", checked: false, checkedByList: [] }, { text: "不便險", checked: false, checkedByList: [] }, { text: "海外醫療險", checked: false, checkedByList: [] }],
  "網路": [{ text: "確認手機支援eSIM", checked: false, checkedByList: [] }, { text: "買eSIM或網卡", checked: false, checkedByList: [] }],
  "付款換匯": [{ text: "選定海外回饋高的信用卡", checked: false, checkedByList: [] }, { text: "開通信用卡海外刷卡", checked: false, checkedByList: [] }, { text: "開通金融卡海外提款", checked: false, checkedByList: [] }, { text: "換匯", checked: false, checkedByList: [] }, { text: "了解退稅規定", checked: false, checkedByList: [] }, { text: "買當地交通卡", checked: false, checkedByList: [] }],
  "入境文件": [{ text: "填寫 Visit Japan Web", checked: false, checkedByList: [] }],
  "當地實用APP": [{ text: "地圖 (先下載離線地圖)", checked: false, checkedByList: [] }, { text: "翻譯", checked: false, checkedByList: [] }, { text: "叫車", checked: false, checkedByList: [] }, { text: "大眾運輸 / 火車", checked: false, checkedByList: [] }, { text: "手機設定 (旅遊App放首頁、清出容量)", checked: false, checkedByList: [] }]
};

const initialLuggageList = {
  "隨身與託運規定": [{ text: "確認航空行李限重", checked: false, checkedByList: [] }, { text: "液體100ml以內放夾鏈袋(隨身)", checked: false, checkedByList: [] }, { text: "行動電源不可託運", checked: false, checkedByList: [] }],
  "隨身物品": [{ text: "行動電源 (必帶隨身)", checked: false, checkedByList: [] }, { text: "晴雨傘", checked: false, checkedByList: [] }, { text: "濕紙巾", checked: false, checkedByList: [] }, { text: "環保袋", checked: false, checkedByList: [] }, { text: "頸枕", checked: false, checkedByList: [] }],
  "錢包與證件": [{ text: "護照 (必備)", checked: false, checkedByList: [] }, { text: "日幣現金", checked: false, checkedByList: [] }, { text: "信用卡 (推薦JCB)", checked: false, checkedByList: [] }, { text: "駕照正本 與 日文譯本", checked: false, checkedByList: [] }],
  "電器與工具": [{ text: "手機充電線", checked: false, checkedByList: [] }, { text: "轉接頭 (日本雙扁平)", checked: false, checkedByList: [] }, { text: "備用耳機", checked: false, checkedByList: [] }],
  "生活用品": [{ text: "衛生紙", checked: false, checkedByList: [] }, { text: "口罩", checked: false, checkedByList: [] }, { text: "生理用品", checked: false, checkedByList: [] }],
  "衣物與飾品": [{ text: "薄長袖/薄外套", checked: false, checkedByList: [] }, { text: "防風保暖外套 (冬季)", checked: false, checkedByList: [] }, { text: "好走的鞋", checked: false, checkedByList: [] }, { text: "墨鏡 / 帽子", checked: false, checkedByList: [] }, { text: "泳裝", checked: false, checkedByList: [] }],
  "洗漱包": [{ text: "牙膏 / 牙刷", checked: false, checkedByList: [] }, { text: "洗髮沐浴旅行組", checked: false, checkedByList: [] }, { text: "常備毛巾", checked: false, checkedByList: [] }],
  "化妝包": [{ text: "保養品", checked: false, checkedByList: [] }, { text: "海洋友善防曬乳", checked: false, checkedByList: [] }, { text: "卸妝用品", checked: false, checkedByList: [] }],
  "醫藥包": [{ text: "腸胃藥", checked: false, checkedByList: [] }, { text: "止痛藥", checked: false, checkedByList: [] }, { text: "暈車藥", checked: false, checkedByList: [] }, { text: "OK繃", checked: false, checkedByList: [] }]
};

const DEPARTURE_CATEGORIES = Object.keys(initialDepartureList);
const LUGGAGE_CATEGORIES = Object.keys(initialLuggageList);

const initialShoppingList = [
  { id: 1, text: "Royce 巧克力", checked: false, addedBy: "本人", checkedBy: "" },
  { id: 2, text: "波上宮小書包御守", checked: false, addedBy: "本人", checkedBy: "" }
];

const getSavedState = (key, initialValue) => {
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : initialValue;
  } catch (error) {
    return initialValue;
  }
};

// --- HELPER COMPONENTS ---
const MemberBadge = ({ name, prefix = "" }) => {
  if (!name) return null;
  const style = MEMBER_BADGE_STYLE[name] || 'bg-[#ECE9E0] text-[#6B6554] border-[#DCD6CA]';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-bold rounded-full border shrink-0 whitespace-nowrap ${style}`}>
      {prefix}{name}
    </span>
  );
};

const TagBadge = ({ tag }) => {
  let colorClass = "bg-[#ECE9E0] text-[#6B6554] border-[#DCD6CA]";
  if (tag.includes("必吃") || tag.includes("必點")) colorClass = "bg-[#FDF2E9] text-[#C75A22] border-[#F4E0D1]";
  if (tag.includes("必買")) colorClass = "bg-[#EBF5EE] text-[#2F6B4A] border-[#D4E8DC]";
  if (tag.includes("重要") || tag.includes("注意") || tag.includes("提醒") || tag.includes("準備")) colorClass = "bg-[#FCECEE] text-[#B93A49] border-[#F2D7D9]";
  if (tag.includes("必拍") || tag.includes("攻略") || tag.includes("雨天")) colorClass = "bg-[#EAF3FA] text-[#316999] border-[#D3E5F4]";
  const isBold = tag.includes("必吃") || tag.includes("必買") || tag.includes("重要") || tag.includes("準備") || tag.includes("雨天");

  return (
    <span className={`inline-block px-2.5 py-1 text-xs rounded-md border ${colorClass} ${isBold ? 'font-bold' : 'font-medium'} shadow-sm`}>
      {tag}
    </span>
  );
};

const MapButton = ({ link }) => (
  <a href={link} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 bg-[#4A5D54] active:bg-[#3B4A43] text-white px-3 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm w-full mt-2">
    <Navigation className="w-4 h-4" /> 開始導航
  </a>
);

const DocButton = ({ link, label }) => (
  <a href={link} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 bg-[#B93A49] active:bg-[#8F2C37] text-white px-3 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm w-full mt-2">
    <FileText className="w-4 h-4" /> {label}
  </a>
);

const OkinawaRegionMap = ({ activeRegion }) => (
  <div className="bg-gradient-to-br from-[#EAF3FA] to-[#F5F9FC] rounded-2xl p-4 border border-[#D3E5F4] shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm font-bold text-[#316999] flex items-center gap-1.5">
        <Compass className="w-4 h-4" /> 沖繩本島移動方位圖
      </span>
      <span className="text-xs text-[#6B7A80] font-medium">由北至南一覽</span>
    </div>
    <div className="grid grid-cols-4 gap-2 text-center">
      {[
        { id: 'north', label: '北部', sub: '水族館・古宇利', days: 'D2' },
        { id: 'mid', label: '中部', sub: '恩納・美國村', days: 'D1, D3' },
        { id: 'naha', label: '那霸', sub: '國際通・機場', days: 'D5, D6' },
        { id: 'south', label: '南部', sub: '瀨長島・玉泉洞', days: 'D3, D4' }
      ].map(r => (
        <div
          key={r.id}
          className={`p-2 rounded-xl border transition-all ${
            activeRegion === r.id
              ? 'bg-[#316999] text-white border-[#316999] shadow-md scale-105'
              : 'bg-white text-[#2D2A26] border-[#D3E5F4]'
          }`}
        >
          <div className="text-xs font-bold">{r.label}</div>
          <div className={`text-[10px] mt-0.5 leading-tight ${activeRegion === r.id ? 'text-white/90' : 'text-[#8A857B]'}`}>{r.sub}</div>
          <div className={`text-[10px] font-bold mt-1 px-1.5 py-0.5 rounded-full inline-block ${activeRegion === r.id ? 'bg-white/20 text-white' : 'bg-[#EAF3FA] text-[#316999]'}`}>
            {r.days}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// --- MAIN APP COMPONENT ---
export default function App() {
  // --- AUTH & SYNC STATE ---
  const [user, setUser] = useState(() => (isSandboxPreview ? { email: 'preview@local', isPreview: true } : null));
  const [authLoading, setAuthLoading] = useState(() => !isSandboxPreview);
  const [authError, setAuthError] = useState('');
  const [cloudConnected, setCloudConnected] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // --- 目前操作者身分 (本人/老婆/爸爸/媽媽) ---
  const [currentMember, setCurrentMember] = useState(() => getSavedState('okinawa_current_member', '本人'));

  const handleSelectMember = (memberName) => {
    setCurrentMember(memberName);
    try {
      window.localStorage.setItem('okinawa_current_member', JSON.stringify(memberName));
    } catch (e) {
      console.warn(e);
    }
  };

  const cycleMember = () => {
    const idx = FAMILY_MEMBERS.indexOf(currentMember);
    const next = FAMILY_MEMBERS[(idx + 1) % FAMILY_MEMBERS.length];
    handleSelectMember(next);
  };

  const isInAppBrowser = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /Line|FBAN|FBAV|Instagram|MicroMessenger/i.test(navigator.userAgent);
  }, []);

  // --- NAVIGATION & UI STATE ---
  const [activeTab, setActiveTab] = useState('overview');
  const [itinerarySubTab, setItinerarySubTab] = useState('overview');
  const [selectedDay, setSelectedDay] = useState(1);
  const [isRainyMode, setIsRainyMode] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);

  // --- EXPENSES STATE ---
  const [expenses, setExpenses] = useState(() => getSavedState('okinawa_expenses', []));
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({ amount: '', category: '飲食', desc: '', day: 1, payer: '本人', receiptImg: '' });
  const [exchangeRate, setExchangeRate] = useState(0.215);
  const [calcJpy, setCalcJpy] = useState('1000');
  const [chartType, setChartType] = useState('trend');
  const [copiedSettlement, setCopiedSettlement] = useState(false);
  const [previewReceipt, setPreviewReceipt] = useState(null);

  // --- CHECKLIST STATE ---
  const [checklistTab, setChecklistTab] = useState('departure');
  const [departureList, setDepartureList] = useState(() => getSavedState('okinawa_departure', initialDepartureList));
  const [luggageList, setLuggageList] = useState(() => getSavedState('okinawa_luggage', initialLuggageList));
  const [shoppingList, setShoppingList] = useState(() => getSavedState('okinawa_shopping', initialShoppingList));
  const [newShoppingItem, setNewShoppingItem] = useState('');

  const daysLeft = useMemo(() => {
    const tripDate = new Date('2027-02-08T00:00:00');
    const today = new Date();
    const diffTime = tripDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }, []);

  useEffect(() => {
    if (isSandboxPreview) {
      setAuthLoading(false);
      return;
    }
    if (!auth) {
      setAuthLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        const normalizedAllowed = ALLOWED_EMAILS.map(e => e.trim().toLowerCase());
        const userEmail = (currentUser.email || '').trim().toLowerCase();
        const isDefaultPlaceholder = normalizedAllowed[0] === "family1@gmail.com";

        if (isDefaultPlaceholder || normalizedAllowed.includes(userEmail)) {
          setUser(currentUser);
          setAuthError('');
          const savedMember = window.localStorage.getItem('okinawa_current_member');
          if (!savedMember && EMAIL_TO_DEFAULT_MEMBER[userEmail]) {
            handleSelectMember(EMAIL_TO_DEFAULT_MEMBER[userEmail]);
          }
        } else {
          setAuthError(`此帳號 (${currentUser.email}) 不在授權家人名單中`);
          signOut(auth);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!db || !user || user.isPreview) {
      setCloudConnected(false);
      return;
    }
    try {
      const tripDocRef = doc(db, "trips", "okinawa-2027");
      const unsubscribe = onSnapshot(
        tripDocRef,
        (docSnap) => {
          setCloudConnected(true);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (Array.isArray(data.expenses)) setExpenses(data.expenses);
            if (data.departureList) setDepartureList(data.departureList);
            if (data.luggageList) setLuggageList(data.luggageList);
            if (Array.isArray(data.shoppingList)) setShoppingList(data.shoppingList);
          }
        },
        (error) => {
          console.warn("Firestore 同步權限不足或離線，改用本機自動記憶:", error.message);
          setCloudConnected(false);
        }
      );
      return () => unsubscribe();
    } catch (err) {
      setCloudConnected(false);
    }
  }, [user]);

  const saveData = async (field, value, localKey) => {
    try {
      window.localStorage.setItem(localKey, JSON.stringify(value));
    } catch (e) {
      console.warn("LocalStorage 寫入失敗:", e);
    }
    if (db && user && !user.isPreview && cloudConnected) {
      try {
        const tripDocRef = doc(db, "trips", "okinawa-2027");
        await setDoc(tripDocRef, { [field]: value }, { merge: true });
      } catch (e) {
        console.warn("雲端寫入失敗，已保存於本機:", e);
      }
    }
  };

  const handleCopyUrl = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch (e) {
      console.warn("複製網址失敗", e);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError('');
    if (!auth) {
      setAuthError('系統尚未連線成功，請稍後再試。');
      return;
    }
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err) {
      if (err.code === 'auth/popup-blocked') {
        setAuthError('瀏覽器阻擋了登入視窗，請允許彈出視窗，或改用 Safari / Chrome 開啟。');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setAuthError('您取消了登入，請再試一次。');
      } else {
        setAuthError('登入失敗，請改用手機內建的 Safari 或 Chrome 瀏覽器開啟此網頁再登入。');
      }
    }
  };

  const handleLogout = async () => {
    if (user?.isPreview) return;
    if (auth) {
      try {
        await signOut(auth);
      } catch (e) {
        console.warn(e);
      }
    }
    setUser(null);
  };

  const totalExpense = useMemo(() => expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0), [expenses]);
  const perPersonAvg = Math.round(totalExpense / 4);

  const chartData = useMemo(() => {
    let cumulative = 0;
    return [1, 2, 3, 4, 5, 6].map(day => {
      const dailyTotal = expenses.filter(e => e.day === day).reduce((sum, e) => sum + Number(e.amount || 0), 0);
      cumulative += dailyTotal;
      return { day, name: dayToDate[day], daily: dailyTotal, cumulative };
    });
  }, [expenses]);

  const pieData = useMemo(() => {
    const map = {};
    expenses.forEach(e => {
      const cat = e.category || '其他';
      map[cat] = (map[cat] || 0) + Number(e.amount || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
  }, [expenses]);

  const payerTotals = useMemo(() => {
    const map = {};
    expenses.forEach(e => {
      const p = e.payer || '本人';
      map[p] = (map[p] || 0) + Number(e.amount || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const copySettlementReport = () => {
    const lines = [
      `🌴 沖繩 6天5夜 旅遊帳本結算`,
      `總花費：¥ ${totalExpense.toLocaleString()} (約 NT$ ${Math.round(totalExpense * exchangeRate).toLocaleString()})`,
      `4人平均：每人 ¥ ${perPersonAvg.toLocaleString()} (約 NT$ ${Math.round(perPersonAvg * exchangeRate).toLocaleString()})`,
      `--- 各人代墊統計 ---`,
      ...payerTotals.map(([payer, amt]) => `• ${payer}：¥ ${amt.toLocaleString()} (約 NT$ ${Math.round(amt * exchangeRate).toLocaleString()})`)
    ];
    try {
      navigator.clipboard.writeText(lines.join('\n'));
      setCopiedSettlement(true);
      setTimeout(() => setCopiedSettlement(false), 2500);
    } catch (e) {
      console.warn("複製失敗", e);
    }
  };

  const handleReceiptUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 600;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', 0.65);
        setNewExpense(prev => ({ ...prev, receiptImg: compressed }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const openAddExpenseModal = () => {
    setNewExpense({ amount: '', category: '飲食', desc: '', day: selectedDay, payer: currentMember, receiptImg: '' });
    setIsAddingExpense(true);
  };

  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!newExpense.amount) return;
    const updated = [
      {
        ...newExpense,
        id: Date.now(),
        amount: Number(newExpense.amount),
        addedBy: currentMember
      },
      ...expenses
    ];
    setExpenses(updated);
    saveData('expenses', updated, 'okinawa_expenses');
    setIsAddingExpense(false);
    setNewExpense({ amount: '', category: '飲食', desc: '', day: selectedDay, payer: currentMember, receiptImg: '' });
  };

  const deleteExpense = (id) => {
    const updated = expenses.filter(e => e.id !== id);
    setExpenses(updated);
    saveData('expenses', updated, 'okinawa_expenses');
  };

  // --- 多人獨立勾選累積邏輯 (支援 4 位家人各自打勾/取消，不覆蓋他人紀錄) ---
  const toggleChecklist = (type, category, idx) => {
    const updateCategoryItems = (items) =>
      items.map((item, i) => {
        if (i !== idx) return item;
        const currentList = getCheckedMembers(item);
        const alreadyCheckedByMe = currentList.includes(currentMember);
        const nextList = alreadyCheckedByMe
          ? currentList.filter(m => m !== currentMember)
          : [...currentList, currentMember];
        // 依 FAMILY_MEMBERS 順序排列標籤，畫面更整齊
        const orderedList = FAMILY_MEMBERS.filter(m => nextList.includes(m));
        return {
          ...item,
          checked: orderedList.length > 0,
          checkedByList: orderedList,
          checkedBy: orderedList[orderedList.length - 1] || ''
        };
      });

    if (type === 'departure') {
      const updated = {
        ...departureList,
        [category]: updateCategoryItems(departureList[category] || [])
      };
      setDepartureList(updated);
      saveData('departureList', updated, 'okinawa_departure');
    } else {
      const updated = {
        ...luggageList,
        [category]: updateCategoryItems(luggageList[category] || [])
      };
      setLuggageList(updated);
      saveData('luggageList', updated, 'okinawa_luggage');
    }
  };

  const toggleShopping = (id) => {
    const updated = shoppingList.map(item => {
      if (item.id !== id) return item;
      const nextChecked = !item.checked;
      return {
        ...item,
        checked: nextChecked,
        checkedBy: nextChecked ? currentMember : ''
      };
    });
    setShoppingList(updated);
    saveData('shoppingList', updated, 'okinawa_shopping');
  };

  const addShoppingItem = (e) => {
    e.preventDefault();
    if (!newShoppingItem.trim()) return;
    const updated = [
      ...shoppingList,
      {
        id: Date.now(),
        text: newShoppingItem.trim(),
        checked: false,
        addedBy: currentMember,
        checkedBy: ''
      }
    ];
    setShoppingList(updated);
    saveData('shoppingList', updated, 'okinawa_shopping');
    setNewShoppingItem('');
  };

  const deleteShoppingItem = (id) => {
    const updated = shoppingList.filter(item => item.id !== id);
    setShoppingList(updated);
    saveData('shoppingList', updated, 'okinawa_shopping');
  };

  let totalDeparture = 0;
  let completedDeparture = 0;
  Object.values(departureList).forEach(cat => {
    totalDeparture += cat.length;
    completedDeparture += cat.filter(item => getCheckedMembers(item).length > 0 || item.checked).length;
  });

  const currentDayData = tripData.daily.find(d => d.day === selectedDay) || tripData.daily[0];
  const currentOverviewData = tripData.overview.find(d => d.day === selectedDay) || tripData.overview[0];
  const displayedSpots = isRainyMode && currentDayData.rainySpots ? currentDayData.rainySpots : currentDayData.spots;

  if (authLoading) {
    return (
      <div className="w-full max-w-md mx-auto h-screen bg-[#F9F8F5] flex items-center justify-center">
        <div className="text-center text-[#4A5D54] font-bold text-lg animate-pulse">正在載入沖繩之旅...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen bg-[#F9F8F5] flex flex-col justify-center items-center p-6 shadow-2xl">
        <div className="w-full bg-white rounded-3xl p-8 border border-[#EAE6DF] shadow-lg text-center">
          <div className="w-16 h-16 bg-[#EBF5EE] border border-[#D4E8DC] rounded-full flex items-center justify-center mx-auto mb-5">
            <Lock className="w-8 h-8 text-[#4A5D54]" />
          </div>
          <h1 className="text-2xl font-bold text-[#2D2A26] tracking-wider">沖繩之旅</h1>
          <p className="text-sm text-[#8A857B] font-bold mt-1">Winter 2027 • 6天5夜 家人專屬</p>

          {isInAppBrowser ? (
            <div className="mt-5 bg-[#FDF2E9] border-2 border-[#F4E0D1] rounded-2xl p-4 text-left space-y-2.5">
              <div className="flex items-center gap-2 text-[#C75A22] font-bold text-base">
                <AlertCircle className="w-5 h-5 shrink-0" />
                請改用 Safari 或 Chrome 開啟
              </div>
              <p className="text-sm text-[#6B6554] leading-relaxed">
                您目前正使用 <strong>LINE 內建瀏覽器</strong>，Google 安全機制會阻擋登入。
              </p>
              <div className="bg-white rounded-xl p-3 text-sm text-[#2D2A26] font-bold space-y-1.5 border border-[#F4E0D1]">
                <p>1. 點擊右下角「分享圖示」或「三個點 (⋮)」</p>
                <p>2. 選擇「使用預設瀏覽器開啟 (Safari / Chrome)」</p>
              </div>
              <button
                onClick={handleCopyUrl}
                className="w-full mt-2 bg-[#C75A22] text-white font-bold py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-1.5 active:bg-[#A64818]"
              >
                {copiedUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedUrl ? '已複製網址！請貼到 Safari / Chrome' : '複製網址貼到瀏覽器'}
              </button>
            </div>
          ) : (
            <p className="text-sm text-[#6B6554] mt-5 leading-relaxed">
              為了保護家人的行程、記帳與重要證件連結，請使用授權的 Google 帳號登入。
            </p>
          )}

          {authError && (
            <div className="mt-4 bg-[#FCECEE] text-[#B93A49] text-xs font-bold p-3 rounded-xl border border-[#F2D7D9] leading-relaxed">
              {authError}
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            className="w-full mt-6 bg-[#4A5D54] active:bg-[#3B4A43] text-white font-bold py-4 px-5 rounded-2xl shadow-md flex items-center justify-center gap-2 text-base transition-colors"
          >
            <Shield className="w-5 h-5" /> 使用 Google 帳號登入
          </button>

          {!isInAppBrowser && (
            <p className="text-xs text-[#8A857B] mt-4">
              💡 若無法登入，請確認使用 Safari 或 Chrome 開啟
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto h-screen h-[100dvh] font-sans flex flex-col overflow-hidden shadow-2xl relative bg-[#F9F8F5]">
      {/* HEADER */}
      <header className="py-3.5 px-5 bg-white border-b border-[#EAE6DF] shadow-sm z-10 flex-shrink-0 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-wider text-[#2D2A26] leading-tight">沖繩之旅</h1>
          <p className="text-sm text-[#8A857B] mt-0.5 font-bold tracking-widest">Winter 2027 • 6天5夜</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={cycleMember}
            title="點擊切換目前操作者身分"
            className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 border active:scale-95 transition-transform ${MEMBER_BADGE_STYLE[currentMember] || 'bg-[#EAF3FA] text-[#316999] border-[#D3E5F4]'}`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            {currentMember}
          </button>

          <span
            title={user?.isPreview ? "預覽模式" : cloudConnected ? "雲端同步中" : "本機記憶模式"}
            className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 border ${
              cloudConnected
                ? 'bg-[#EBF5EE] text-[#2F6B4A] border-[#D4E8DC]'
                : 'bg-[#FAF9F7] text-[#8A857B] border-[#EAE6DF]'
            }`}
          >
            {cloudConnected ? <Cloud className="w-3.5 h-3.5" /> : <CloudOff className="w-3.5 h-3.5" />}
            {user?.isPreview ? '預覽' : cloudConnected ? '同步' : '本機'}
          </span>
          {!user?.isPreview && (
            <button
              onClick={handleLogout}
              title="登出"
              className="p-2 rounded-full bg-[#FAF9F7] border border-[#EAE6DF] text-[#8A857B] active:bg-[#F2EFE9]"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* ================= OVERVIEW TAB ================= */}
        {activeTab === 'overview' && (
          <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar animate-fade-in flex flex-col pb-10">
            <div className="relative w-full h-44 bg-gradient-to-b from-[#A1C9F2] to-[#E3F2FA] overflow-hidden flex flex-col justify-center items-center pb-6 flex-shrink-0">
              <div className="bg-white/95 px-6 py-3 rounded-full text-[#2D2A26] font-bold text-base shadow-sm z-10 flex items-center gap-2 mt-2">
                🐶 帶著好心情準備出發！
              </div>
              <div className="absolute -bottom-10 w-[150%] h-24 bg-[#F9F8F5]" style={{ borderRadius: '50% 50% 0 0' }} />
            </div>

            <div className="text-center text-[#2D2A26] relative z-10 -mt-3">
              <div className="text-[4.2rem] font-bold tracking-tight leading-none">
                {daysLeft}
                <span className="text-2xl ml-1.5 font-bold text-[#8A857B]">天</span>
              </div>
              <div className="text-[#8A857B] text-base mt-2 tracking-widest font-bold">後出發</div>
            </div>

            <div className="mx-5 mt-6 pt-5 border-t border-[#EAE6DF] flex justify-between items-center text-[#2D2A26]">
              <div className="flex gap-2.5 items-center">
                <Sun className="w-7 h-7 text-[#F9A825] shrink-0" />
                <div>
                  <div className="text-xs text-[#8A857B] font-bold">出發</div>
                  <div className="text-base font-bold">2/8 (一)</div>
                </div>
              </div>
              <div className="w-[1px] h-10 bg-[#EAE6DF]" />
              <div className="flex gap-2.5 items-center">
                <CloudRain className="w-7 h-7 text-[#4FC3F7] shrink-0" />
                <div>
                  <div className="text-xs text-[#8A857B] font-bold">回程</div>
                  <div className="text-base font-bold">2/13 (六)</div>
                </div>
              </div>
              <a
                href="https://www.data.jma.go.jp/multi/yoho/okinawa.html?forecast=weather0&lang=cn_zt"
                target="_blank"
                rel="noreferrer"
                className="text-sm text-[#4A5D54] bg-white border border-[#DCD6CA] px-3.5 py-2.5 rounded-full flex items-center gap-1 font-bold shadow-sm active:bg-[#F2EFE9]"
              >
                <CloudSun className="w-4 h-4" /> 天氣 <ChevronRight className="w-4 h-4 opacity-60" />
              </a>
            </div>

            <div className="flex justify-center gap-7 mt-5 text-[#6B6554] text-base font-bold">
              <span className="flex items-center gap-1.5"><MapPin className="w-5 h-5 text-[#B93A49]" /> 沖繩</span>
              <span className="flex items-center gap-1.5"><Users className="w-5 h-5 text-[#8A857B]" /> 4 人</span>
              <span className="flex items-center gap-1.5"><Wallet className="w-5 h-5 text-[#4A5D54]" /> JPY</span>
            </div>

            <div className="px-4 mt-7 space-y-4">
              <button
                onClick={() => setShowSOSModal(true)}
                className="w-full bg-[#FCECEE] rounded-2xl p-4 border-2 border-[#F2D7D9] flex justify-between items-center shadow-sm active:scale-95 transition-transform text-left"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="bg-[#B93A49] rounded-full p-2.5 text-white shadow-sm shrink-0">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-base text-[#B93A49] font-bold tracking-wide whitespace-nowrap">SOS 緊急聯絡資訊</div>
                    <div className="text-xs text-[#8F2C37] mt-0.5 font-medium truncate">日本報警 110 • 救護 119 • 駐日處 • 飯店</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#B93A49] shrink-0" />
              </button>

              <a
                href="https://services.digital.go.jp/zh-cmn-hant/visit-japan-web/"
                target="_blank"
                rel="noreferrer"
                className="bg-white rounded-2xl p-4 border border-[#EAE6DF] flex justify-between items-center shadow-sm active:scale-95 transition-transform"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="bg-[#FCECEE] border border-[#F2D7D9] rounded-full p-2.5 shrink-0">
                    <FileCheck2 className="w-6 h-6 text-[#B93A49]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-base text-[#2D2A26] font-bold tracking-wide whitespace-nowrap">入境文件</div>
                    <div className="text-xs text-[#8A857B] mt-0.5 font-medium truncate">免簽 90 天 • Visit Japan Web</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#DCD6CA] shrink-0" />
              </a>

              <div className="grid grid-cols-2 gap-3">
                <a
                  href="https://drive.google.com/drive/folders/1gaZ12YAiPA6u4uUJw8lNPyC3Ek76_bxI?usp=drive_link"
                  target="_blank"
                  rel="noreferrer"
                  className="bg-white rounded-2xl p-3.5 border border-[#EAE6DF] shadow-sm active:scale-95 transition-transform flex flex-col justify-between overflow-hidden"
                >
                  <div className="flex items-center gap-2 mb-2.5 min-w-0">
                    <div className="bg-[#FCECEE] p-2 rounded-full shrink-0">
                      <BookOpen className="w-4 h-4 text-[#B93A49]" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-[#B93A49] font-bold tracking-wide whitespace-nowrap">PASSPORT</div>
                      <div className="text-[15px] text-[#2D2A26] font-bold whitespace-nowrap leading-tight">護照資訊</div>
                    </div>
                  </div>
                  <div className="text-xs text-[#6B6554] font-bold my-2 text-center whitespace-nowrap">4 位家人護照影本</div>
                  <div className="text-[11px] text-[#8A857B] pt-2.5 border-t border-dashed border-[#EAE6DF] font-bold text-center whitespace-nowrap">
                    點擊開啟雲端
                  </div>
                </a>

                <a
                  href="https://drive.google.com/drive/folders/1sqjviwF7gt85Ajwfi1USIeBGLnwXV_J4?usp=drive_link"
                  target="_blank"
                  rel="noreferrer"
                  className="bg-white rounded-2xl p-3.5 border border-[#EAE6DF] shadow-sm active:scale-95 transition-transform flex flex-col justify-between overflow-hidden"
                >
                  <div className="flex items-center gap-2 mb-2.5 min-w-0">
                    <div className="bg-[#EAF3FA] p-2 rounded-full shrink-0">
                      <Plane className="w-4 h-4 text-[#316999]" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-[#316999] font-bold tracking-wide whitespace-nowrap">BOARDING</div>
                      <div className="text-[15px] text-[#2D2A26] font-bold whitespace-nowrap leading-tight">機票資訊</div>
                    </div>
                  </div>
                  <div className="flex justify-center items-center gap-2 text-[#2D2A26] font-bold text-sm my-2 whitespace-nowrap">
                    <span>台灣</span>
                    <Plane className="w-3.5 h-3.5 text-[#8A857B] shrink-0" />
                    <span>沖繩</span>
                  </div>
                  <div className="text-[11px] text-[#8A857B] pt-2.5 border-t border-dashed border-[#EAE6DF] font-bold text-center whitespace-nowrap">
                    點擊開啟雲端
                  </div>
                </a>

                <a
                  href="https://drive.google.com/drive/folders/1o-sro3vPaht7UM415UNes-T_SATU_fGI?usp=drive_link"
                  target="_blank"
                  rel="noreferrer"
                  className="bg-white rounded-2xl p-3.5 border border-[#EAE6DF] shadow-sm active:scale-95 transition-transform flex flex-col justify-between overflow-hidden"
                >
                  <div className="flex items-center gap-2 mb-2.5 min-w-0">
                    <div className="bg-[#EBF5EE] p-2 rounded-full shrink-0">
                      <Shield className="w-4 h-4 text-[#2F6B4A]" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-[#2F6B4A] font-bold tracking-wide whitespace-nowrap">INSURANCE</div>
                      <div className="text-[15px] text-[#2D2A26] font-bold whitespace-nowrap leading-tight">保險單據</div>
                    </div>
                  </div>
                  <div className="text-xs text-[#6B6554] font-bold my-2 text-center whitespace-nowrap">旅平險與不便險</div>
                  <div className="text-[11px] text-[#8A857B] pt-2.5 border-t border-dashed border-[#EAE6DF] font-bold text-center whitespace-nowrap">
                    點擊開啟雲端
                  </div>
                </a>

                <a
                  href="https://drive.google.com/drive/folders/1xweNEY4e6jgzwSF3Bma4-VOaQjlbhyXa?usp=drive_link"
                  target="_blank"
                  rel="noreferrer"
                  className="bg-white rounded-2xl p-3.5 border border-[#EAE6DF] shadow-sm active:scale-95 transition-transform flex flex-col justify-between overflow-hidden"
                >
                  <div className="flex items-center gap-2 mb-2.5 min-w-0">
                    <div className="bg-[#FDF2E9] p-2 rounded-full shrink-0">
                      <Car className="w-4 h-4 text-[#C75A22]" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-[#C75A22] font-bold tracking-wide whitespace-nowrap">LICENSE</div>
                      <div className="text-[15px] text-[#2D2A26] font-bold whitespace-nowrap leading-tight">駕照譯本</div>
                    </div>
                  </div>
                  <div className="text-xs text-[#6B6554] font-bold my-2 text-center whitespace-nowrap">駕照與日文譯本</div>
                  <div className="text-[11px] text-[#8A857B] pt-2.5 border-t border-dashed border-[#EAE6DF] font-bold text-center whitespace-nowrap">
                    點擊開啟雲端
                  </div>
                </a>

                <div
                  onClick={() => { setActiveTab('tools'); setChecklistTab('departure'); }}
                  className="bg-[#FAF9F7] rounded-2xl p-3.5 border border-[#DCD6CA] shadow-sm cursor-pointer active:scale-95 transition-transform flex flex-col justify-between overflow-hidden"
                >
                  <div className="flex items-center gap-2 mb-2 min-w-0">
                    <div className="border-[1.5px] border-[#4A5D54] rounded-full p-1.5 bg-[#EBF5EE] shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-[#4A5D54]" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-[#4A5D54] font-bold tracking-wide whitespace-nowrap">TO DO</div>
                      <div className="text-[15px] text-[#2D2A26] font-bold whitespace-nowrap leading-tight">出發清單</div>
                    </div>
                  </div>
                  <div className="text-xl text-[#4A5D54] font-bold my-1 text-center whitespace-nowrap">
                    {completedDeparture}
                    <span className="text-xs text-[#8A857B] font-bold ml-1">/ {totalDeparture} 項</span>
                  </div>
                  <div className="text-[11px] text-[#4A5D54] pt-2.5 border-t border-dashed border-[#DCD6CA] font-bold text-center whitespace-nowrap">
                    點擊檢查進度
                  </div>
                </div>

                <a
                  href="https://drive.google.com/drive/folders/1yuvcuEuMwgZKcPUSmu6pGMqx9Pwh97uV?usp=drive_link"
                  target="_blank"
                  rel="noreferrer"
                  className="bg-white rounded-2xl p-3.5 border border-[#EAE6DF] shadow-sm active:scale-95 transition-transform flex flex-col justify-between overflow-hidden"
                >
                  <div className="flex items-center gap-2 mb-2.5 min-w-0">
                    <div className="bg-[#F3EEF8] p-2 rounded-full shrink-0">
                      <CreditCard className="w-4 h-4 text-[#625170]" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-[#625170] font-bold tracking-wide whitespace-nowrap">JAPANESE</div>
                      <div className="text-[15px] text-[#2D2A26] font-bold whitespace-nowrap leading-tight">日語手冊</div>
                    </div>
                  </div>
                  <div className="text-xs text-[#6B6554] font-bold my-2 text-center whitespace-nowrap">實用旅遊日語</div>
                  <div className="text-[11px] text-[#8A857B] pt-2.5 border-t border-dashed border-[#EAE6DF] font-bold text-center whitespace-nowrap">
                    點擊開啟雲端
                  </div>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ================= DAILY / ITINERARY TAB ================= */}
        {activeTab === 'daily' && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex-shrink-0 flex bg-white border-b border-[#EAE6DF] px-5 pt-2 z-10">
              <button
                onClick={() => setItinerarySubTab('overview')}
                className={`flex-1 pb-3 text-base font-bold border-b-2 transition-colors ${
                  itinerarySubTab === 'overview' ? 'border-[#4A5D54] text-[#4A5D54]' : 'border-transparent text-[#8A857B]'
                }`}
              >
                行程總覽
              </button>
              <button
                onClick={() => setItinerarySubTab('detail')}
                className={`flex-1 pb-3 text-base font-bold border-b-2 transition-colors ${
                  itinerarySubTab === 'detail' ? 'border-[#4A5D54] text-[#4A5D54]' : 'border-transparent text-[#8A857B]'
                }`}
              >
                行程細節
              </button>
            </div>

            {itinerarySubTab === 'overview' && (
              <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar p-5 pb-10 space-y-5 animate-fade-in">
                <OkinawaRegionMap activeRegion={currentOverviewData.region} />

                <div className="relative pl-4 space-y-4 before:content-[''] before:absolute before:left-[19px] before:top-4 before:bottom-4 before:w-0.5 before:bg-[#DCD6CA]">
                  {tripData.overview.map((item) => (
                    <div key={item.day} className="relative pl-6">
                      <div className="absolute left-0 top-5 w-4 h-4 rounded-full bg-[#4A5D54] border-4 border-[#F9F8F5]" />
                      <div
                        onClick={() => {
                          setSelectedDay(item.day);
                          setItinerarySubTab('detail');
                        }}
                        className="bg-white rounded-2xl p-4 border border-[#EAE6DF] shadow-sm active:scale-95 transition-transform cursor-pointer"
                      >
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#EBF5EE] text-[#4A5D54]">
                            Day {item.day} • {item.date}
                          </span>
                          <ChevronRight className="w-5 h-5 text-[#A09C94]" />
                        </div>
                        <h3 className="text-base font-bold text-[#2D2A26] mt-1">{item.title}</h3>
                        <p className="text-sm text-[#8A857B] font-medium mt-1 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#C75A22]" /> {item.area}
                        </p>
                        <div className="mt-3 pt-3 border-t border-dashed border-[#EAE6DF] flex justify-end">
                          <a
                            href={item.routeUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#316999] bg-[#EAF3FA] px-3 py-1.5 rounded-lg"
                          >
                            <Navigation className="w-3.5 h-3.5" /> 開啟當日全程路線
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {itinerarySubTab === 'detail' && (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="flex-shrink-0 flex overflow-x-auto gap-2.5 px-5 py-3 hide-scrollbar border-b border-[#EAE6DF] bg-[#FAF9F7]">
                  {tripData.daily.map(d => (
                    <button
                      key={d.day}
                      onClick={() => setSelectedDay(d.day)}
                      className={`flex-shrink-0 flex flex-col items-center justify-center w-[64px] h-[62px] rounded-2xl transition-all border ${
                        selectedDay === d.day
                          ? 'bg-[#4A5D54] border-[#4A5D54] text-white shadow-md scale-105'
                          : 'bg-white border-[#EAE6DF] text-[#6B6554]'
                      }`}
                    >
                      <span className="text-[11px] font-bold opacity-80">Day {d.day}</span>
                      <span className="text-sm font-bold">{d.date.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar p-5 pb-10 space-y-5 animate-fade-in">
                  <div className="bg-gradient-to-r from-[#EBF2F3] to-[#F5F7F7] p-4 rounded-2xl border border-[#D9E3E6] shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-xl shadow-sm">
                          {isRainyMode ? <Umbrella className="w-5 h-5 text-[#316999]" /> : <CloudSun className="w-5 h-5 text-[#6B7A80]" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#6B7A80]">
                            {isRainyMode ? '☔ 雨天室內備案模式' : '天氣預報 (晴天行程)'}
                          </p>
                          <p className="text-sm font-bold text-[#2D2A26] mt-0.5">{currentDayData.weather.desc}</p>
                        </div>
                      </div>
                      <p className="text-lg font-bold text-[#3D494D]">{currentDayData.weather.temp}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsRainyMode(!isRainyMode)}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-colors ${
                          isRainyMode
                            ? 'bg-[#316999] text-white border-[#316999]'
                            : 'bg-white text-[#316999] border-[#D3E5F4]'
                        }`}
                      >
                        <Umbrella className="w-4 h-4" />
                        {isRainyMode ? '切回原定行程' : '切換雨天備案'}
                      </button>
                      <a
                        href={currentOverviewData.routeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-[#4A5D54] text-white flex items-center justify-center gap-1.5"
                      >
                        <Navigation className="w-4 h-4" /> 當日多點導航
                      </a>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {displayedSpots.map((spot, idx) => {
                      let TypeIcon = MapPin;
                      let typeColor = "text-[#8A857B]";
                      if (spot.type === 'transport') { TypeIcon = Plane; typeColor = "text-[#587B8E]"; }
                      if (spot.type === 'food') { TypeIcon = Utensils; typeColor = "text-[#C75A22]"; }
                      if (spot.type === 'hotel') { TypeIcon = Bed; typeColor = "text-[#625170]"; }

                      return (
                        <div key={idx} className="bg-white rounded-2xl p-5 border border-[#EAE6DF] shadow-sm relative overflow-hidden">
                          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                            spot.type === 'attraction' ? 'bg-[#98B097]' : spot.type === 'food' ? 'bg-[#E3956F]' : spot.type === 'hotel' ? 'bg-[#A297AC]' : 'bg-[#92AAB8]'
                          }`} />

                          <div className="flex items-start gap-3">
                            <div className={`mt-1 ${typeColor}`}><TypeIcon className="w-5 h-5" /></div>
                            <div className="flex-1">
                              <h3 className="font-bold text-lg text-[#2D2A26] leading-snug">{spot.title}</h3>
                              <p className="text-sm text-[#6B6554] mt-2 leading-relaxed">{spot.intro}</p>

                              <div className="mt-3.5 grid grid-cols-1 gap-2 bg-[#FAF9F7] p-3.5 rounded-xl border border-[#F0EBE1]">
                                {spot.time && <div className="flex items-start gap-2 text-xs text-[#5C574B]"><Clock className="w-3.5 h-3.5 mt-0.5 text-[#8A857B] shrink-0" /><span><strong>時間：</strong>{spot.time}</span></div>}
                                {spot.hours && <div className="flex items-start gap-2 text-xs text-[#5C574B]"><Clock className="w-3.5 h-3.5 mt-0.5 text-[#8A857B] shrink-0" /><span><strong>營業：</strong>{spot.hours}</span></div>}
                                {spot.tickets && <div className="flex items-start gap-2 text-xs text-[#5C574B]"><Ticket className="w-3.5 h-3.5 mt-0.5 text-[#8A857B] shrink-0" /><span><strong>門票/費用：</strong>{spot.tickets}</span></div>}
                                {spot.stay && <div className="flex items-start gap-2 text-xs text-[#5C574B]"><Info className="w-3.5 h-3.5 mt-0.5 text-[#8A857B] shrink-0" /><span><strong>建議停留：</strong>{spot.stay}</span></div>}
                                {spot.phone && <div className="flex items-start gap-2 text-xs text-[#5C574B]"><Phone className="w-3.5 h-3.5 mt-0.5 text-[#8A857B] shrink-0" /><span><strong>電話：</strong><a href={`tel:${spot.phone}`} className="text-[#316999] underline font-bold">{spot.phone}</a></span></div>}
                                {spot.type === 'hotel' && (
                                  <>
                                    <div className="flex items-start gap-2 text-xs text-[#5C574B]"><Clock className="w-3.5 h-3.5 mt-0.5 text-[#8A857B] shrink-0" /><span><strong>入住 / 退房：</strong>{spot.checkIn} / {spot.checkOut}</span></div>
                                    {spot.breakfast && <div className="flex items-start gap-2 text-xs text-[#5C574B]"><Coffee className="w-3.5 h-3.5 mt-0.5 text-[#8A857B] shrink-0" /><span><strong>早餐：</strong>{spot.breakfast}</span></div>}
                                  </>
                                )}
                                {spot.mapcode && (
                                  <div className="flex items-start gap-2 text-xs text-[#5C574B]">
                                    <MapPin className="w-3.5 h-3.5 mt-0.5 text-[#8A857B] shrink-0" />
                                    <span><strong>MAPCODE：</strong><span className="font-mono bg-white px-1.5 py-0.5 rounded border border-[#EAE6DF] select-all font-bold">{spot.mapcode}</span></span>
                                  </div>
                                )}
                              </div>

                              {spot.tags && spot.tags.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                  {spot.tags.map((tag, i) => <TagBadge key={i} tag={tag} />)}
                                </div>
                              )}

                              <div className="mt-2 flex flex-col gap-1">
                                {spot.gmap && <MapButton link={spot.gmap} />}
                                {spot.docLinks && spot.docLinks.map((docItem, i) => (
                                  <DocButton key={i} link={docItem.link} label={docItem.name} />
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= EXPENSES / WALLET TAB ================= */}
        {activeTab === 'expenses' && (
          <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar p-5 pb-10 space-y-5 animate-fade-in">
            <div className="bg-white p-4 rounded-2xl border border-[#EAE6DF] shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-bold text-[#2D2A26] flex items-center gap-1.5">
                  <ArrowRightLeft className="w-4 h-4 text-[#4A5D54]" /> 即時日幣換算台幣
                </span>
                <div className="flex items-center gap-1 text-xs text-[#8A857B]">
                  <span>匯率</span>
                  <input
                    type="number"
                    step="0.001"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(Number(e.target.value) || 0.215)}
                    className="w-16 bg-[#FAF9F7] border border-[#EAE6DF] rounded px-1.5 py-0.5 text-center font-bold text-[#2D2A26]"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-[#FAF9F7] border border-[#EAE6DF] rounded-xl px-3 py-2 flex items-center">
                  <span className="text-sm font-bold text-[#8A857B] mr-1.5">¥</span>
                  <input
                    type="number"
                    value={calcJpy}
                    onChange={(e) => setCalcJpy(e.target.value)}
                    className="w-full bg-transparent text-lg font-bold text-[#2D2A26] focus:outline-none"
                    placeholder="輸入日幣"
                  />
                </div>
                <span className="text-[#8A857B] font-bold">≈</span>
                <div className="flex-1 bg-[#EBF5EE] border border-[#D4E8DC] rounded-xl px-3 py-2 text-right">
                  <span className="text-xs font-bold text-[#2F6B4A] mr-1">NT$</span>
                  <span className="text-lg font-bold text-[#2F6B4A]">
                    {Math.round((Number(calcJpy) || 0) * exchangeRate).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#4A5D54] to-[#3B4A43] p-5 rounded-2xl shadow-md text-white flex justify-between items-center">
              <div>
                <p className="text-xs opacity-80 font-bold tracking-wider">目前總花費 (4人平均 ¥{perPersonAvg.toLocaleString()})</p>
                <p className="text-3xl font-bold mt-1">¥ {totalExpense.toLocaleString()}</p>
                <p className="text-sm opacity-90 font-medium mt-0.5">
                  約台幣 NT$ {Math.round(totalExpense * exchangeRate).toLocaleString()}
                </p>
              </div>
              <Receipt className="w-10 h-10 opacity-30" />
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#EAE6DF] shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-[#8A857B]">
                  {chartType === 'trend' ? '每日與累計消費趨勢 (¥)' : '分類消費佔比 (¥)'}
                </h3>
                <div className="flex bg-[#FAF9F7] p-1 rounded-lg border border-[#EAE6DF]">
                  <button
                    onClick={() => setChartType('trend')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1 ${chartType === 'trend' ? 'bg-white text-[#4A5D54] shadow-sm' : 'text-[#8A857B]'}`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" /> 趨勢
                  </button>
                  <button
                    onClick={() => setChartType('pie')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1 ${chartType === 'pie' ? 'bg-white text-[#4A5D54] shadow-sm' : 'text-[#8A857B]'}`}
                  >
                    <PieChartIcon className="w-3.5 h-3.5" /> 圓餅
                  </button>
                </div>
              </div>

              <div className="h-56">
                {chartType === 'trend' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EBE1" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8A857B' }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#8A857B' }} axisLine={false} tickLine={false} tickFormatter={(val) => val >= 1000 ? `${val / 1000}k` : val} />
                      <YAxis yAxisId="right" orientation="right" tick={false} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                        labelStyle={{ color: '#8A857B', fontWeight: 'bold', marginBottom: '4px' }}
                        formatter={(value) => `¥ ${Number(value).toLocaleString()}`}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <Bar yAxisId="left" dataKey="daily" name="當日消費" fill="#A297AC" radius={[4, 4, 0, 0]} barSize={20} />
                      <Line yAxisId="right" type="monotone" dataKey="cumulative" name="累計消費" stroke="#C75A22" strokeWidth={2} dot={{ r: 3, fill: '#C75A22' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={75} paddingAngle={3}>
                        {pieData.map((entry, idx) => (
                          <Cell key={idx} fill={CATEGORY_COLORS[entry.name] || '#8A857B'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `¥ ${Number(value).toLocaleString()}`} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-[#8A857B]">尚無消費資料可繪製圓餅圖</div>
                )}
              </div>
            </div>

            {expenses.length > 0 && (
              <div className="bg-white p-4 rounded-2xl border border-[#EAE6DF] shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-[#2D2A26]">4 人代墊與分帳結算</h3>
                  <button
                    onClick={copySettlementReport}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#EBF5EE] text-[#2F6B4A] flex items-center gap-1 active:bg-[#D4E8DC]"
                  >
                    {copiedSettlement ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedSettlement ? '已複製！' : '複製傳 LINE'}
                  </button>
                </div>
                <div className="divide-y divide-[#F0EBE1]">
                  {payerTotals.map(([payer, amt]) => (
                    <div key={payer} className="py-2 flex justify-between items-center text-sm">
                      <span className="font-bold text-[#2D2A26]">{payer}</span>
                      <span className="font-bold text-[#4A5D54]">
                        ¥ {amt.toLocaleString()}
                        <span className="text-xs text-[#8A857B] font-normal ml-1.5">
                          (NT$ {Math.round(amt * exchangeRate).toLocaleString()})
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={openAddExpenseModal}
              className="w-full bg-white border-2 border-[#4A5D54] text-[#4A5D54] font-bold py-3.5 rounded-2xl shadow-sm flex justify-center items-center gap-2 text-base active:bg-[#EBF5EE]"
            >
              <Plus className="w-5 h-5" /> 新增一筆花費 (由 {currentMember} 紀錄)
            </button>

            {isAddingExpense && (
              <div className="bg-white p-5 rounded-2xl border border-[#EAE6DF] shadow-lg animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-base text-[#2D2A26]">新增花費</h3>
                  <button onClick={() => setIsAddingExpense(false)} className="text-[#A09C94] p-1"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleAddExpense} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#8A857B] mb-1">金額 (日圓)</label>
                      <input type="number" required value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} className="w-full bg-[#FAF9F7] border border-[#EAE6DF] rounded-xl p-2.5 text-[#2D2A26] font-bold focus:outline-none focus:border-[#4A5D54]" placeholder="¥ 0" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#8A857B] mb-1">分類</label>
                      <select value={newExpense.category} onChange={e => setNewExpense({ ...newExpense, category: e.target.value })} className="w-full bg-[#FAF9F7] border border-[#EAE6DF] rounded-xl p-2.5 text-[#2D2A26] font-bold focus:outline-none">
                        <option>飲食</option><option>交通</option><option>住宿</option><option>門票</option><option>購物</option><option>其他</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#8A857B] mb-1">日期</label>
                      <select value={newExpense.day} onChange={e => setNewExpense({ ...newExpense, day: Number(e.target.value) })} className="w-full bg-[#FAF9F7] border border-[#EAE6DF] rounded-xl p-2.5 text-[#2D2A26] font-bold focus:outline-none">
                        {[1, 2, 3, 4, 5, 6].map(d => <option key={d} value={d}>{dayToDate[d]}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#8A857B] mb-1">付款人</label>
                      <select value={newExpense.payer} onChange={e => setNewExpense({ ...newExpense, payer: e.target.value })} className="w-full bg-[#FAF9F7] border border-[#EAE6DF] rounded-xl p-2.5 text-[#2D2A26] font-bold focus:outline-none">
                        {FAMILY_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#8A857B] mb-1">項目說明</label>
                    <input type="text" required value={newExpense.desc} onChange={e => setNewExpense({ ...newExpense, desc: e.target.value })} className="w-full bg-[#FAF9F7] border border-[#EAE6DF] rounded-xl p-2.5 text-[#2D2A26] focus:outline-none focus:border-[#4A5D54]" placeholder="例如：暖暮拉麵" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#8A857B] mb-1">收據照片 (選填)</label>
                    <label className="flex items-center justify-center gap-2 w-full bg-[#FAF9F7] border border-dashed border-[#DCD6CA] rounded-xl p-3 text-sm text-[#6B6554] font-bold cursor-pointer">
                      <Camera className="w-4 h-4" />
                      {newExpense.receiptImg ? '已附收據照片 (點擊更換)' : '拍照或上傳收據'}
                      <input type="file" accept="image/*" capture="environment" onChange={handleReceiptUpload} className="hidden" />
                    </label>
                  </div>
                  <button type="submit" className="w-full bg-[#4A5D54] text-white font-bold py-3.5 rounded-xl shadow-sm active:bg-[#3B4A43]">
                    儲存花費
                  </button>
                </form>
              </div>
            )}

            <div className="space-y-3 pb-4">
              {expenses.map((expense) => (
                <div key={expense.id} className="bg-white p-4 rounded-2xl border border-[#EAE6DF] shadow-sm flex justify-between items-center">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-[#FAF9F7] p-2.5 rounded-xl border border-[#F0EBE1] shrink-0">
                      <Tag className="w-4 h-4 text-[#8A857B]" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-base text-[#2D2A26] truncate">{expense.desc}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="text-xs text-[#8A857B] font-medium">
                          {dayToDate[expense.day]} • {expense.category} • {expense.payer}付款
                        </span>
                        {expense.addedBy && (
                          <MemberBadge name={expense.addedBy} prefix="✎ " />
                        )}
                      </div>
                      {expense.receiptImg && (
                        <button
                          onClick={() => setPreviewReceipt(expense.receiptImg)}
                          className="mt-1.5 text-xs text-[#316999] font-bold underline flex items-center gap-1"
                        >
                          <Camera className="w-3 h-3" /> 查看收據照片
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right">
                      <div className="font-bold text-base text-[#C75A22]">¥ {Number(expense.amount).toLocaleString()}</div>
                      <div className="text-[11px] text-[#8A857B]">NT$ {Math.round(Number(expense.amount) * exchangeRate).toLocaleString()}</div>
                    </div>
                    <button onClick={() => deleteExpense(expense.id)} className="text-[#DCD6CA] hover:text-[#B93A49] p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {expenses.length === 0 && (
                <div className="text-center text-[#8A857B] py-8 text-sm font-medium">
                  目前還沒有花費紀錄喔！
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TOOLS / CHECKLIST TAB ================= */}
        {activeTab === 'tools' && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[#F9F8F5]">
            <div className="flex-shrink-0 flex bg-white border-b border-[#EAE6DF] px-4 pt-2 z-10">
              <button onClick={() => setChecklistTab('departure')} className={`flex-1 pb-3 text-base font-bold border-b-2 transition-colors ${checklistTab === 'departure' ? 'border-[#4A5D54] text-[#4A5D54]' : 'border-transparent text-[#8A857B]'}`}>出發清單</button>
              <button onClick={() => setChecklistTab('luggage')} className={`flex-1 pb-3 text-base font-bold border-b-2 transition-colors ${checklistTab === 'luggage' ? 'border-[#4A5D54] text-[#4A5D54]' : 'border-transparent text-[#8A857B]'}`}>行李打包</button>
              <button onClick={() => setChecklistTab('shopping')} className={`flex-1 pb-3 text-base font-bold border-b-2 transition-colors ${checklistTab === 'shopping' ? 'border-[#4A5D54] text-[#4A5D54]' : 'border-transparent text-[#8A857B]'}`}>購物清單</button>
            </div>

            <div className="flex-shrink-0 bg-[#FAF9F7] border-b border-[#EAE6DF] px-5 py-2 flex items-center justify-between">
              <span className="text-xs font-bold text-[#8A857B]">點選切換目前操作者：</span>
              <div className="flex gap-1.5">
                {FAMILY_MEMBERS.map(m => (
                  <button
                    key={m}
                    onClick={() => handleSelectMember(m)}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
                      currentMember === m
                        ? `${MEMBER_BADGE_STYLE[m]} shadow-sm scale-105`
                        : 'bg-white text-[#8A857B] border-[#EAE6DF]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar p-5 pb-10">
              {checklistTab === 'departure' && (
                <div className="space-y-5 animate-fade-in">
                  <div className="bg-[#EBF5EE] text-[#2F6B4A] p-3.5 rounded-xl text-sm font-bold text-center border border-[#D4E8DC]">
                    已完成 {completedDeparture} / {totalDeparture} 項 (可以多位家人各自打勾確認)
                  </div>
                  {DEPARTURE_CATEGORIES.map((category) => {
                    const items = departureList[category] || [];
                    return (
                      <div key={category} className="bg-white rounded-2xl border border-[#EAE6DF] overflow-hidden shadow-sm">
                        <div className="bg-[#FAF9F7] px-4 py-2.5 border-b border-[#EAE6DF] font-bold text-[#6B6554] text-sm">{category}</div>
                        <div className="divide-y divide-[#F0EBE1]">
                          {items.map((item, idx) => {
                            const checkedMembers = getCheckedMembers(item);
                            const isCheckedByCurrent = checkedMembers.includes(currentMember);
                            const hasAnyChecked = checkedMembers.length > 0;
                            return (
                              <label key={`${category}-${idx}`} className="flex items-start justify-between px-4 py-3.5 gap-3 cursor-pointer active:bg-[#FAF9F7]">
                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                  <input
                                    type="checkbox"
                                    checked={isCheckedByCurrent}
                                    onChange={() => toggleChecklist('departure', category, idx)}
                                    className="w-5 h-5 mt-0.5 accent-[#4A5D54] rounded shrink-0"
                                  />
                                  <span className={`text-base leading-snug ${hasAnyChecked ? 'text-[#A09C94] line-through' : 'text-[#2D2A26] font-medium'}`}>
                                    {item.text}
                                  </span>
                                </div>
                                {hasAnyChecked && (
                                  <div className="flex flex-wrap justify-end gap-1 max-w-[48%] shrink-0">
                                    {checkedMembers.map(member => (
                                      <MemberBadge key={member} name={member} prefix="✓ " />
                                    ))}
                                  </div>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {checklistTab === 'luggage' && (
                <div className="space-y-5 animate-fade-in">
                  <div className="bg-[#EAF3FA] text-[#316999] p-3 rounded-xl text-xs font-bold text-center border border-[#D3E5F4]">
                    💡 每位家人可各自打勾確認自己的隨身與行李物品（標籤會並排保留）
                  </div>
                  {LUGGAGE_CATEGORIES.map((category) => {
                    const items = luggageList[category] || [];
                    return (
                      <div key={category} className="bg-white rounded-2xl border border-[#EAE6DF] overflow-hidden shadow-sm">
                        <div className="bg-[#FAF9F7] px-4 py-2.5 border-b border-[#EAE6DF] font-bold text-[#6B6554] text-sm">{category}</div>
                        <div className="divide-y divide-[#F0EBE1]">
                          {items.map((item, idx) => {
                            const checkedMembers = getCheckedMembers(item);
                            const isCheckedByCurrent = checkedMembers.includes(currentMember);
                            const hasAnyChecked = checkedMembers.length > 0;
                            return (
                              <label key={`${category}-${idx}`} className="flex items-start justify-between px-4 py-3.5 gap-3 cursor-pointer active:bg-[#FAF9F7]">
                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                  <input
                                    type="checkbox"
                                    checked={isCheckedByCurrent}
                                    onChange={() => toggleChecklist('luggage', category, idx)}
                                    className="w-5 h-5 mt-0.5 accent-[#4A5D54] rounded shrink-0"
                                  />
                                  <span className={`text-base leading-snug ${hasAnyChecked ? 'text-[#A09C94] line-through' : 'text-[#2D2A26] font-medium'}`}>
                                    {item.text}
                                  </span>
                                </div>
                                {hasAnyChecked && (
                                  <div className="flex flex-wrap justify-end gap-1 max-w-[48%] shrink-0">
                                    {checkedMembers.map(member => (
                                      <MemberBadge key={member} name={member} prefix="✓ " />
                                    ))}
                                  </div>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {checklistTab === 'shopping' && (
                <div className="space-y-4 animate-fade-in">
                  <form onSubmit={addShoppingItem} className="flex gap-2">
                    <input
                      type="text"
                      value={newShoppingItem}
                      onChange={e => setNewShoppingItem(e.target.value)}
                      placeholder={`以「${currentMember}」身分新增想買的東西...`}
                      className="flex-1 bg-white border border-[#EAE6DF] rounded-xl p-3 text-base text-[#2D2A26] focus:outline-none focus:border-[#4A5D54] shadow-sm"
                    />
                    <button type="submit" className="bg-[#4A5D54] text-white px-5 rounded-xl font-bold active:bg-[#3B4A43] shadow-sm shrink-0">
                      新增
                    </button>
                  </form>

                  <div className="bg-white rounded-2xl border border-[#EAE6DF] shadow-sm overflow-hidden divide-y divide-[#F0EBE1]">
                    {shoppingList.map(item => (
                      <div key={item.id} className="flex items-center px-4 py-3.5 justify-between gap-2">
                        <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                          <input type="checkbox" checked={item.checked} onChange={() => toggleShopping(item.id)} className="w-5 h-5 accent-[#4A5D54] rounded shrink-0" />
                          <div className="min-w-0">
                            <span className={`text-base block truncate ${item.checked ? 'text-[#A09C94] line-through' : 'text-[#2D2A26] font-bold'}`}>
                              {item.text}
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {item.addedBy && (
                                <span className="text-[11px] text-[#8A857B] font-medium">
                                  {item.addedBy}新增
                                </span>
                              )}
                              {item.checked && item.checkedBy && (
                                <MemberBadge name={item.checkedBy} prefix="✓ " />
                              )}
                            </div>
                          </div>
                        </label>
                        <button onClick={() => deleteShoppingItem(item.id)} className="text-[#DCD6CA] hover:text-[#B93A49] p-1 shrink-0">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                    {shoppingList.length === 0 && (
                      <div className="text-center text-[#8A857B] py-8 text-sm font-medium">
                        目前清單是空的，新增一些想買的東西吧！
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* SOS 緊急聯絡視窗 */}
      {showSOSModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col">
            <div className="bg-[#B93A49] p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-6 h-6" />
                <h2 className="text-lg font-bold">SOS 緊急聯絡電話</h2>
              </div>
              <button onClick={() => setShowSOSModal(false)} className="p-1 bg-white/20 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-3">
              {tripData.emergency.map((item, idx) => (
                <a
                  key={idx}
                  href={`tel:${item.phone}`}
                  className="flex items-center justify-between bg-[#FAF9F7] border border-[#EAE6DF] p-4 rounded-2xl active:bg-[#FCECEE] transition-colors"
                >
                  <div>
                    <div className="font-bold text-base text-[#2D2A26]">{item.name}</div>
                    <div className="text-xs text-[#8A857B] mt-0.5">{item.desc}</div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-[#B93A49] text-white px-3 py-2 rounded-xl font-bold text-sm shrink-0">
                    <Phone className="w-4 h-4" /> 撥打
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 收據圖片放大檢視視窗 */}
      {previewReceipt && (
        <div onClick={() => setPreviewReceipt(null)} className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-sm w-full">
            <button onClick={() => setPreviewReceipt(null)} className="absolute -top-10 right-0 text-white p-2">
              <X className="w-7 h-7" />
            </button>
            <img src={previewReceipt} alt="收據照片" className="w-full rounded-2xl shadow-2xl" />
          </div>
        </div>
      )}

      {/* BOTTOM TAB BAR */}
      <nav className="flex-shrink-0 bg-white border-t border-[#EAE6DF] pt-2.5 px-4 pb-5 flex justify-around items-center z-20 w-full shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
        <button onClick={() => setActiveTab('overview')} className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${activeTab === 'overview' ? 'text-[#4A5D54]' : 'text-[#A09C94]'}`}>
          <Home className="w-6 h-6 mb-1" />
          <span className="text-sm font-bold tracking-wider">總覽</span>
        </button>
        <button onClick={() => setActiveTab('daily')} className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${activeTab === 'daily' ? 'text-[#4A5D54]' : 'text-[#A09C94]'}`}>
          <List className="w-6 h-6 mb-1" />
          <span className="text-sm font-bold tracking-wider">行程</span>
        </button>
        <button onClick={() => setActiveTab('expenses')} className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${activeTab === 'expenses' ? 'text-[#4A5D54]' : 'text-[#A09C94]'}`}>
          <Wallet className="w-6 h-6 mb-1" />
          <span className="text-sm font-bold tracking-wider">錢包</span>
        </button>
        <button onClick={() => setActiveTab('tools')} className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${activeTab === 'tools' ? 'text-[#4A5D54]' : 'text-[#A09C94]'}`}>
          <CheckSquare className="w-6 h-6 mb-1" />
          <span className="text-sm font-bold tracking-wider">清單</span>
        </button>
      </nav>

      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.25s ease-out forwards; }
      `}} />
    </div>
  );
}
