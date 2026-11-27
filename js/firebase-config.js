/* ==========================================================================
   FIREBASE + MEDIA RESOLVER (CATBOX / GOFILE / DIRECT) + AUDIO SYNC
   ========================================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyCbHlLAuQ5SX9L4MgfbLRoXGIO7FYxvdLw",
  authDomain: "lamduonq-9a629.firebaseapp.com",
  databaseURL: "https://lamduonq-9a629-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "lamduonq-9a629",
  storageBucket: "lamduonq-9a629.firebasestorage.app",
  messagingSenderId: "678141613884",
  appId: "1:678141613884:web:e4603b801bb3b871233039",
  measurementId: "G-J1WBQSW7MZ"
};

let db = null;

try {
  if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    console.log('[Firebase] Connected');
  }
} catch (e) {
  console.warn('[Firebase] Init error:', e);
}

/* ---------- Gofile guest token ---------- */
async function getGofileToken() {
  let token = localStorage.getItem('gofile_token');
  if (token) return token;
  try {
    const r = await fetch('https://api.gofile.io/accounts', { method: 'POST' });
    const j = await r.json();
    if (j.status === 'ok' && j.data && j.data.token) {
      token = j.data.token;
      localStorage.setItem('gofile_token', token);
      return token;
    }
  } catch (e) {
    console.warn('[Gofile] Could not create guest account:', e);
  }
  return null;
}

/* ---------- Resolve any media URL ---------- */
async function resolveMediaUrl(raw) {
  if (!raw || typeof raw !== 'string') return '';
  raw = raw.trim();

  // Google Drive link  →  drive.google.com/file/d/<id> hoặc ?id=<id>
  const gDriveMatch = raw.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:.*&)?id=)([a-zA-Z0-9_-]+)/i);
  if (gDriveMatch) {
    const id = gDriveMatch[1];
    // Chuyển sang link direct CDN của Google (hỗ trợ ảnh làm background / avatar / bìa nhạc)
    return `https://lh3.googleusercontent.com/d/${id}`;
  }

  // GitHub blob link  →  github.com/user/repo/blob/branch/file -> raw.githubusercontent.com
  const ghMatch = raw.match(/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)/i);
  if (ghMatch) {
    const [, user, repo, branch, path] = ghMatch;
    return `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${path}`;
  }

  // Gofile share link  →  gofile.io/d/<id>
  const goMatch = raw.match(/gofile\.io\/d\/([a-zA-Z0-9_-]+)/i);
  if (goMatch) {
    const id = goMatch[1];
    try {
      const token = await getGofileToken();
      const headers = {};
      if (token) headers['Authorization'] = 'Bearer ' + token;

      const r = await fetch('https://api.gofile.io/contents/' + id, { headers });
      const j = await r.json();

      if (j.status === 'ok' && j.data) {
        const contents = j.data.contents || j.data.children;
        if (contents) {
          const keys = Object.keys(contents);
          for (const k of keys) {
            const child = contents[k];
            if (child.directLink) { console.log('[Gofile] Resolved directLink'); return child.directLink; }
            if (child.link) { console.log('[Gofile] Resolved link'); return child.link; }
          }
        }
      }

      if (j.status === 'error-notPremium') {
        console.warn('[Gofile] Contents API requires Premium. Using direct URL instead.');
      }
    } catch (e) {
      console.warn('[Gofile] Resolve failed:', e);
    }
  }

  return raw; // Catbox, Imgur, Discord CDN, or any direct URL
}
window.resolveMediaUrl = resolveMediaUrl;

function isVideoUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url) || url.includes('type=video') || url.includes('/video/');
}
window.isVideoUrl = isVideoUrl;

/* ---------- Default Playlist (Tối ưu hóa, tham khảo từ backup) ---------- */
const defaultPlaylist = [
  { src: "_backup_media/daobuochongkong.mp3", cover: "_backup_media/daobuochongkong.jpg", name: "漫步香港1999", lrc: "_backup_media/daobuochongkong.lrc" },
  { src: "_backup_media/daobuochongkong2.mp3", cover: "_backup_media/daobuochongkong2.jpg", name: "Dao Buoc Hong Kong 2", lrc: "_backup_media/daobuochongkong2.lrc" },
  { src: "_backup_media/butchibac.mp3", cover: "_backup_media/s4.jpg", name: "But Chi Bac", lrc: "_backup_media/butchibac.lrc" },
  { src: "_backup_media/ngannamanhsang.mp3", cover: "_backup_media/what.jpg", name: "Ngan Nam Anh Sang", lrc: "_backup_media/ngannamanhsang.lrc" },
  { src: "_backup_media/cocongmaisac.mp3", cover: "_backup_media/svt8.jpg", name: "Co Cong Mai Sac", lrc: "_backup_media/cocongmaisac.lrc" },
  { src: "_backup_media/leluuly.mp3", cover: "_backup_media/s1.jpg", name: "Le Luu Ly", lrc: "_backup_media/leluuly.lrc" },
  { src: "_backup_media/ngaynaynamay.mp3", cover: "_backup_media/s2.jpg", name: "Ngay Nay Nam Ay", lrc: "_backup_media/ngaynaynamay.lrc" },
  { src: "_backup_media/duoinhungconmua.mp3", cover: "_backup_media/s3.jpg", name: "Duoi Nhung Con Mua", lrc: "_backup_media/duoinhungconmua.lrc" },
  { src: "_backup_media/ngayxuaemden.mp3", cover: "_backup_media/svt81.jpg", name: "Ngay Xua Em Den", lrc: "_backup_media/ngayxuaemden.lrc" },
  { src: "_backup_media/kemduyen.mp3", cover: "_backup_media/s5.jpg", name: "Kem Duyen", lrc: "_backup_media/kemduyen.lrc" },
  { src: "_backup_media/emthuonganhma.mp3", cover: "_backup_media/s6.jpg", name: "23:41", lrc: "_backup_media/emthuonganhma.lrc" },
  { src: "_backup_media/daloyeuemnhieu.mp3", cover: "_backup_media/s7.jpg", name: "Da Lo Yeu Em Nhieu", lrc: "_backup_media/daloyeuemnhieu.lrc" },
  { src: "_backup_media/mongyu.mp3", cover: "_backup_media/s8.jpg", name: "Mong Yu", lrc: "_backup_media/mongyu.lrc" },
  { src: "_backup_media/phong.mp3", cover: "_backup_media/s9.jpg", name: "Phong", lrc: "_backup_media/phong.lrc" },
  { src: "_backup_media/conmobanggia.mp3", cover: "_backup_media/s10.jpg", name: "Con Mo Bang Gia", lrc: "_backup_media/conmobanggia.lrc" },
  { src: "_backup_media/83.mp3", cover: "_backup_media/s11.jpg", name: "83", lrc: "_backup_media/83.lrc" },
  { src: "_backup_media/khongbuong.mp3", cover: "_backup_media/p2.jpg", name: "Khong Buong", lrc: "_backup_media/khongbuong.lrc" },
  { src: "_backup_media/tancung.mp3", cover: "_backup_media/p7.jpg", name: "Tan Cung Cua Noi Nho", lrc: "_backup_media/tancung.lrc" },
  { src: "_backup_media/changaihieu.mp3", cover: "_backup_media/p1.jpg", name: "Chang Ai Hieu Ve Tinh Yeu", lrc: "_backup_media/changaihieu.lrc" },
  { src: "_backup_media/01.mp3", cover: "_backup_media/p3.png", name: "0.1 in the end", lrc: "_backup_media/01.lrc" },
  { src: "_backup_media/888.mp3", cover: "_backup_media/p4.png", name: "888", lrc: "_backup_media/888.lrc" },
  { src: "_backup_media/caphe.mp3", cover: "_backup_media/p5.jpg", name: "Ca phe - Min", lrc: "_backup_media/caphe.lrc" },
  { src: "_backup_media/quangaymai.mp3", cover: "_backup_media/p6.png", name: "Qua Ngay Mai", lrc: "_backup_media/quangaymai.lrc" },
  { src: "_backup_media/thuykieu.mp3", cover: "_backup_media/p8.png", name: "Em Day Chang Phai Thuy Kieu", lrc: "_backup_media/thuykieu.lrc" },
  { src: "_backup_media/truockhiemtontai.mp3", cover: "_backup_media/p9.jpg", name: "Truoc Khi Em Ton Tai", lrc: "_backup_media/truockhiemtontai.lrc" },
  { src: "_backup_media/uma.mp3", cover: "_backup_media/uma.jpg", name: "Low Cortisol", bg: "_backup_media/uma.mp4", lrc: "_backup_media/uma.lrc" }
];

function normalizeTrack(t) {
  let defaultLrc = '';
  if (!t.lrc && t.src) {
    const m = t.src.match(/([^/\\]+)\.mp3$/i);
    if (m) defaultLrc = '_backup_media/' + m[1] + '.lrc';
  }
  return {
    src: (t.src && (t.src.startsWith('http') || t.src.startsWith('_backup_media'))) ? t.src : ('_backup_media/' + (t.src || 'daobuochongkong.mp3')),
    cover: (t.cover && (t.cover.startsWith('http') || t.cover.startsWith('_backup_media'))) ? t.cover : (t.cover ? '_backup_media/' + t.cover : '_backup_media/s4.jpg'),
    name: t.name || 'Bài hát',
    bg: t.bg || '',
    lrc: t.lrc || defaultLrc
  };
}

/* ---------- App state hub ---------- */
window.LazerApp = {
  db,
  defaultPlaylist,
  state: {
    username: 'DLam Uwa Uwa',
    avatarUrl: 'https://files.catbox.moe/6797h4.png',
    backgroundUrl: '',
    notifications: 3,
    audioEnabled: false,
    audioVolume: 80,
    bgmUrl: '',
    adminPassword: 'dtl792k7',
    playlist: defaultPlaylist,
    albums: [
      {
        id: 'default',
        name: 'Album Mặc Định',
        playlist: defaultPlaylist
      }
    ],
    currentAlbumId: 'default'
  },

  getCurrentAlbum() {
    if (!this.state.albums || this.state.albums.length === 0) {
      this.state.albums = [{ id: 'default', name: 'Album Mặc Định', playlist: defaultPlaylist }];
    }
    let cur = this.state.albums.find(a => a.id === this.state.currentAlbumId);
    if (!cur) {
      cur = this.state.albums[0];
      this.state.currentAlbumId = cur.id;
    }
    return cur;
  },

  syncActiveAlbum(shouldAutoPlay = false) {
    const cur = this.getCurrentAlbum();
    this.state.playlist = cur.playlist || [];

    if (window.renderAlbumSelect) window.renderAlbumSelect();
    if (window.renderMusicPlaylist) window.renderMusicPlaylist();
    if (window.renderOverlayAlbums) window.renderOverlayAlbums();
    if (window.renderOverlayPlaylist) window.renderOverlayPlaylist();

    if (shouldAutoPlay && window.loadTrack) {
      window.loadTrack(0, true);
    }
  },

  selectAlbum(albumId, autoPlay = true) {
    const found = this.state.albums.find(a => a.id === albumId);
    if (found) {
      this.state.currentAlbumId = albumId;
      this.state.playlist = found.playlist || [];
      if (window.renderAlbumSelect) window.renderAlbumSelect();
      if (window.renderMusicPlaylist) window.renderMusicPlaylist();
      if (window.renderOverlayAlbums) window.renderOverlayAlbums();
      if (window.loadTrack) {
        window.loadTrack(0, autoPlay);
      }
    }
  },

  init() {
    if (!db) { this.updateUI(); return; }

    // Albums & Playlist sync from Firebase
    let firstFirebasePlaylistLoad = true;
    db.ref('settings/albums').on('value', snap => {
      if (snap.exists() && Array.isArray(snap.val()) && snap.val().length > 0) {
        this.state.albums = snap.val().map((alb, aIdx) => {
          const rawList = Array.isArray(alb.playlist) ? alb.playlist : [];
          return {
            id: alb.id || ('album_' + aIdx),
            name: alb.name || ('Album ' + (aIdx + 1)),
            playlist: rawList.map(normalizeTrack)
          };
        });
        this.syncActiveAlbum(firstFirebasePlaylistLoad);
        if (firstFirebasePlaylistLoad) firstFirebasePlaylistLoad = false;
      } else {
        // Fallback: check legacy customPlaylist
        db.ref('settings/customPlaylist').once('value', pSnap => {
          let list = defaultPlaylist;
          if (pSnap.exists() && Array.isArray(pSnap.val()) && pSnap.val().length > 0) {
            list = pSnap.val().map(normalizeTrack);
          }
          this.state.albums = [
            {
              id: 'default',
              name: 'Album Mặc Định',
              playlist: list
            }
          ];
          this.syncActiveAlbum(firstFirebasePlaylistLoad);
          if (firstFirebasePlaylistLoad) firstFirebasePlaylistLoad = false;
        });
      }
    });

    db.ref('settings/currentAlbumId').on('value', snap => {
      if (snap.exists() && snap.val()) {
        const id = snap.val();
        if (this.state.currentAlbumId !== id) {
          this.state.currentAlbumId = id;
          this.syncActiveAlbum(false);
        }
      }
    });

    // Connection status
    db.ref('.info/connected').on('value', snap => {
      const on = !!snap.val();
      const dot = document.getElementById('fp-status-dot');
      const txt = document.getElementById('fp-status-text');
      if (dot) {
        dot.style.background = on ? 'var(--lazer-green)' : 'var(--lazer-yellow)';
        dot.style.boxShadow = on ? '0 0 8px var(--lazer-green)' : 'none';
      }
      if (txt) {
        txt.textContent = on ? 'Online' : 'Connecting…';
        txt.style.color = on ? 'var(--lazer-green)' : 'var(--lazer-yellow)';
      }
    });

    // Views
    const vRef = db.ref('stats/views');
    vRef.transaction(v => (v || 103) + 1);

    // Likes → notification badge
    db.ref('stats/likes').on('value', snap => {
      if (!snap.exists()) return;
      this.state.notifications = snap.val();
      const b = document.getElementById('notif-badge');
      if (b) b.textContent = snap.val();
    });

    // Profile
    db.ref('profile').on('value', async snap => {
      const d = snap.val();
      if (!d) return;
      if (d.name) this.state.username = d.name;
      if (d.avatar) this.state.avatarUrl = await resolveMediaUrl(d.avatar);
      this.updateUI();
    });

    // Background
    db.ref('settings/backgroundUrl').on('value', async snap => {
      const url = snap.val() || '';
      this.state.backgroundUrl = url;
      this.applyBackground(await resolveMediaUrl(url));
    });

    // Audio enabled
    db.ref('settings/audioEnabled').on('value', snap => {
      if (snap.exists()) {
        const val = !!snap.val();
        if (this.state.audioEnabled !== val) {
          this.state.audioEnabled = val;
          this.applyAudio();
          this.updateAudioUI();
        }
      }
    });

    // Audio volume
    db.ref('settings/audioVolume').on('value', snap => {
      if (snap.exists()) {
        this.state.audioVolume = Number(snap.val()) || 80;
        this.applyAudio();
        this.updateAudioUI();
      }
    });

    // Admin password listener from Firebase
    db.ref('settings/adminPassword').on('value', snap => {
      if (snap.exists() && snap.val()) {
        this.state.adminPassword = snap.val();
      }
    });

    // Lượt truy cập web (Mắt xem - tính 1 lượt mỗi phiên trình duyệt)
    try {
      if (!sessionStorage.getItem('lazer_view_counted')) {
        sessionStorage.setItem('lazer_view_counted', '1');
        db.ref('analytics/views').transaction(current => (current || 0) + 1);
      }
      db.ref('analytics/views').on('value', snap => {
        const count = snap.val() || 0;
        const el = document.getElementById('sb-views-count');
        if (el) el.textContent = Number(count).toLocaleString('vi-VN');
      });

      // Lượt để lại dấu chân (Footprints)
      db.ref('analytics/footprints').on('value', snap => {
        const count = snap.val() || 0;
        const el = document.getElementById('sb-footprint-count');
        if (el) el.textContent = Number(count).toLocaleString('vi-VN');
      });

      // Tự động ghi nhận IP & Vị trí khách truy cập để khảo sát thị trường
      this.trackVisitor();
    } catch (e) {
      console.warn('[Analytics] Views counter error:', e);
    }
  },

  getClientDeviceInfo() {
    const ua = navigator.userAgent || '';
    let os = 'Khác';
    let deviceType = 'PC';
    let icon = '💻';

    if (/iPhone/i.test(ua)) {
      os = 'iPhone (iOS)';
      deviceType = 'Mobile';
      icon = '📱';
    } else if (/iPad/i.test(ua)) {
      os = 'iPad';
      deviceType = 'Tablet';
      icon = '📱';
    } else if (/Android/i.test(ua)) {
      os = 'Android';
      deviceType = 'Mobile';
      icon = '📱';
    } else if (/Windows NT 10.0/i.test(ua) || /Windows NT 11.0/i.test(ua)) {
      os = 'Windows 10/11';
      deviceType = 'PC';
      icon = '💻';
    } else if (/Windows/i.test(ua)) {
      os = 'Windows PC';
      deviceType = 'PC';
      icon = '💻';
    } else if (/Macintosh|Mac OS X/i.test(ua)) {
      os = 'macOS';
      deviceType = 'PC';
      icon = '💻';
    } else if (/Linux/i.test(ua)) {
      os = 'Linux';
      deviceType = 'PC';
      icon = '💻';
    }

    // Trình duyệt web
    let browser = 'Web Browser';
    if (/Edg\//i.test(ua)) browser = 'Edge';
    else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = 'Chrome';
    else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';
    else if (/Firefox\//i.test(ua)) browser = 'Firefox';
    else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = 'Opera';
    else if (/FBAN|FBAV/i.test(ua)) browser = 'Facebook App';
    else if (/Zalo/i.test(ua)) browser = 'Zalo App';

    // Độ phân giải màn hình máy người dùng
    const screenRes = (window.screen ? `${window.screen.width}x${window.screen.height}` : '');

    // Mã máy người dùng riêng biệt (lưu persistent trong localStorage)
    let deviceId = localStorage.getItem('lazer_client_device_id');
    if (!deviceId) {
      deviceId = 'dev_' + Math.random().toString(36).substring(2, 7) + Date.now().toString(36).slice(-4);
      localStorage.setItem('lazer_client_device_id', deviceId);
    }

    return {
      deviceId,
      shortId: deviceId.replace('dev_', '').slice(0, 6).toUpperCase(),
      os,
      browser,
      screen: screenRes,
      deviceType,
      icon
    };
  },

  async trackVisitor() {
    if (!db) return;
    try {
      const dev = this.getClientDeviceInfo();

      // ===== BƯỚC 1: Lấy IP Công khai + ISP (luôn chạy, không cần hỏi phép) =====
      let geo = null;

      try {
        const res = await fetch('https://ipwho.is/');
        const data = await res.json();
        if (data && data.success !== false && data.ip) {
          geo = {
            ip: data.ip,
            isp: data.connection?.isp || data.connection?.org || 'Không rõ',
            ipCity: data.city || '',
            ipRegion: data.region || '',
            ipCountry: data.country || 'Việt Nam',
            countryCode: data.country_code || 'VN',
            flag: data.flag?.emoji || '🇻🇳',
            ipLat: data.latitude || null,
            ipLon: data.longitude || null
          };
        }
      } catch (e1) {}

      if (!geo) {
        try {
          const res = await fetch('https://freeipapi.com/api/json');
          const data = await res.json();
          if (data && data.ipAddress) {
            geo = {
              ip: data.ipAddress,
              isp: 'Không rõ',
              ipCity: data.cityName || '',
              ipRegion: data.regionName || '',
              ipCountry: data.countryName || 'Việt Nam',
              countryCode: data.countryCode || 'VN',
              flag: '🌐',
              ipLat: data.latitude || null,
              ipLon: data.longitude || null
            };
          }
        } catch (e2) {}
      }

      if (!geo) {
        try {
          const res = await fetch('https://api.ipify.org?format=json');
          const data = await res.json();
          if (data && data.ip) {
            geo = {
              ip: data.ip,
              isp: 'Không rõ',
              ipCity: '', ipRegion: '', ipCountry: 'Việt Nam',
              countryCode: 'VN', flag: '🌐',
              ipLat: null, ipLon: null
            };
          }
        } catch (e3) {}
      }

      if (!geo || !geo.ip) return;

      const now = Date.now();
      const timeFormatted = new Date().toLocaleString('vi-VN', { hour12: false });

      // Ghi nhận ngay lập tức với thông tin IP (không bắt người dùng phải đợi)
      const vRef = db.ref('analytics/visitors/' + dev.deviceId);
      await vRef.transaction(current => {
        if (!current) {
          return {
            deviceId: dev.deviceId,
            shortId: dev.shortId,
            deviceOs: dev.os,
            deviceType: dev.deviceType,
            deviceIcon: dev.icon,
            browser: dev.browser,
            screen: dev.screen,
            ip: geo.ip,
            isp: geo.isp || 'Không rõ',
            locationSource: 'IP',
            city: geo.ipCity || 'Không rõ',
            district: '',
            address: '',
            region: geo.ipRegion || '',
            country: geo.ipCountry || 'Việt Nam',
            countryCode: geo.countryCode || 'VN',
            flag: geo.flag || '🇻🇳',
            latitude: geo.ipLat,
            longitude: geo.ipLon,
            gpsAccuracy: null,
            firstVisit: now,
            lastVisit: now,
            lastVisitTime: timeFormatted,
            visitCount: 1
          };
        } else {
          const keepGps = current.locationSource === 'GPS';
          return {
            ...current,
            deviceOs: dev.os,
            deviceType: dev.deviceType,
            deviceIcon: dev.icon,
            browser: dev.browser,
            screen: dev.screen,
            ip: geo.ip,
            isp: (geo.isp && geo.isp !== 'Không rõ') ? geo.isp : (current.isp || 'Không rõ'),
            city: keepGps ? current.city : (geo.ipCity || current.city || 'Không rõ'),
            region: keepGps ? (current.region || '') : (geo.ipRegion || current.region || ''),
            country: geo.ipCountry || current.country || 'Việt Nam',
            latitude: keepGps ? current.latitude : (geo.ipLat || current.latitude),
            longitude: keepGps ? current.longitude : (geo.ipLon || current.longitude),
            lastVisit: now,
            lastVisitTime: timeFormatted,
            visitCount: (current.visitCount || 1) + 1
          };
        }
      });

      // ===== BƯỚC 2: Quản lý quyền truy cập GPS =====
      let hasGpsPerm = localStorage.getItem('lazer_gps_allowed') === 'true';
      if (!hasGpsPerm && navigator.permissions && navigator.permissions.query) {
        try {
          const p = await navigator.permissions.query({ name: 'geolocation' });
          if (p.state === 'granted') {
            hasGpsPerm = true;
            localStorage.setItem('lazer_gps_allowed', 'true');
          }
        } catch (e) {}
      }

      // Nếu đã ĐỒNG Ý trước đó -> Tự động lấy GPS ngầm, KHÔNG hỏi nữa!
      if (hasGpsPerm) {
        this.requestGpsLocation(true);
      } else {
        // Nếu CHƯA ĐỒNG Ý -> kiểm tra xem trong phiên này đã bấm 'Để sau' chưa
        if (!sessionStorage.getItem('lazer_gps_session_skipped')) {
          setTimeout(() => {
            const card = document.getElementById('gps-prompt-card');
            if (card) {
              card.style.display = 'block';
              setTimeout(() => card.classList.add('visible'), 50);
            }
          }, 1200);
        }
      }
    } catch (err) {
      console.warn('[Analytics] Track visitor failed:', err);
    }
  },

  async requestGpsLocation(isSilent = false) {
    if (!db || !navigator.geolocation) return;
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      // Người dùng đã cho phép! Lưu lại vào localStorage -> lần sau truy cập lại KHÔNG hỏi nữa
      localStorage.setItem('lazer_gps_allowed', 'true');

      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const acc = Math.round(pos.coords.accuracy);

      // Đổi tọa độ sang địa chỉ cụ thể bằng OpenStreetMap Reverse Geocoding
      let gpsAddress = '';
      let gpsCity = '';
      let gpsDistrict = '';
      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=vi`);
        const geoJson = await geoRes.json();
        if (geoJson && geoJson.address) {
          const a = geoJson.address;
          gpsCity = a.city || a.town || a.state || '';
          gpsDistrict = a.suburb || a.quarter || a.county || a.city_district || '';
          const parts = [a.road, gpsDistrict, a.city || a.town, a.state].filter(Boolean);
          gpsAddress = parts.join(', ');
        }
      } catch (e) {}

      const dev = this.getClientDeviceInfo();
      const vRef = db.ref('analytics/visitors/' + dev.deviceId);
      await vRef.update({
        locationSource: 'GPS',
        latitude: lat,
        longitude: lon,
        gpsAccuracy: acc,
        city: gpsCity || 'Không rõ',
        district: gpsDistrict || '',
        address: gpsAddress || `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
        lastVisit: Date.now(),
        lastVisitTime: new Date().toLocaleString('vi-VN', { hour12: false })
      });

      if (!isSilent && window.showToast) {
        window.showToast('Đã xác định vị trí GPS chính xác!');
      }
    } catch (err) {
      console.warn('[GPS] Geolocation error or denied:', err);
      if (err && err.code === 1) {
        localStorage.removeItem('lazer_gps_allowed');
        if (!isSilent && window.showToast) {
          window.showToast('Bạn đã chặn quyền Vị trí. Hãy bấm vào biểu tượng 🔒 trên thanh địa chỉ để cho phép!');
        }
      }
      if (!isSilent) {
        sessionStorage.setItem('lazer_gps_session_skipped', 'true');
      }
    }
  },

  verifyPassword(pwd) {
    const expected = this.state.adminPassword || 'dtl792k7';
    return String(pwd || '').trim() === String(expected).trim();
  },

  updateUI() {
    const n = document.getElementById('fp-name');
    if (n) n.textContent = this.state.username;
    const a = document.getElementById('fp-avatar');
    if (a && this.state.avatarUrl) a.src = this.state.avatarUrl;
    const b = document.getElementById('notif-badge');
    if (b) b.textContent = this.state.notifications;

    // Tự động điền dữ liệu hiện tại vào popup cài đặt (tránh bị mất khi mở popup)
    const inpBg = document.getElementById('inp-bg');
    if (inpBg && !inpBg.matches(':focus')) {
      inpBg.value = this.state.backgroundUrl || '';
    }
    const inpName = document.getElementById('inp-name');
    if (inpName && !inpName.matches(':focus')) {
      inpName.value = this.state.username || '';
    }
    const inpAvatar = document.getElementById('inp-avatar');
    if (inpAvatar && !inpAvatar.matches(':focus')) {
      inpAvatar.value = this.state.avatarUrl || '';
    }
    const avPrev = document.getElementById('ov-avatar-preview');
    if (avPrev && this.state.avatarUrl) {
      avPrev.src = this.state.avatarUrl;
    }

    this.updateAudioUI();
  },

  updateAudioUI() {
    const toggle = document.getElementById('inp-audio-toggle');
    if (toggle) toggle.checked = this.state.audioEnabled;

    const volSlider = document.getElementById('inp-volume');
    if (volSlider) volSlider.value = this.state.audioVolume;

    const volText = document.getElementById('vol-text');
    if (volText) volText.textContent = this.state.audioVolume + '%';

    const bgmInp = document.getElementById('inp-bgm');
    if (bgmInp && !bgmInp.matches(':focus')) bgmInp.value = this.state.bgmUrl || '';

    // Sidebar background audio toggle indicator
    const bgLabel = document.getElementById('bg-audio-label');
    const bgBtn = document.getElementById('btn-bg-audio');
    if (bgLabel) {
      bgLabel.textContent = this.state.audioEnabled ? 'Âm thanh background: Bật' : 'Âm thanh background: Tắt';
    }
    if (bgBtn) {
      if (this.state.audioEnabled) {
        bgBtn.classList.add('active');
      } else {
        bgBtn.classList.remove('active');
      }
    }
  },

  applyBackground(url) {
    const vid = document.getElementById('bg-custom-video');
    const img = document.getElementById('bg-custom-image');
    const wrap = document.querySelector('.lazer-custom-bg');
    if (!url) {
      if (vid) { vid.pause(); vid.src = ''; vid.style.display = 'none'; vid.__currentUrl = ''; }
      if (img) { img.src = ''; img.style.display = 'none'; }
      if (wrap) wrap.style.opacity = '0';
      return;
    }
    if (wrap) wrap.style.opacity = '1';

    // Check if video link (mp4, webm, mov, or Gofile download stream)
    const isVideo = /\.(mp4|webm|mov)(\?.*)?$/i.test(url) || url.includes('gofile.io/download') || url.includes('/video');

    if (isVideo) {
      if (img) img.style.display = 'none';
      if (vid) {
        vid.style.display = 'block';
        // Chỉ tải lại khi đổi sang video khác. Nếu cùng 1 video thì phát tiếp tục liền mạch, không reload!
        if (vid.__currentUrl !== url) {
          vid.__currentUrl = url;
          vid.src = url;
          vid.load();
          const p = vid.play();
          if (p && p.catch) p.catch(e => console.log('[Video] Autoplay note:', e));
        }
      }
    } else {
      if (vid) { vid.pause(); vid.src = ''; vid.style.display = 'none'; vid.__currentUrl = ''; }
      if (img) { img.style.display = 'block'; img.src = url; }
    }
    this.applyAudio();
    this.initVideoWatchdog();
  },

  // Video Stall Recovery Watchdog (Chống đứng hình / nghẽn buffer)
  initVideoWatchdog() {
    const vid = document.getElementById('bg-custom-video');
    if (!vid || vid.__watchdogAttached) return;
    vid.__watchdogAttached = true;

    let lastTime = -1;
    let stallCount = 0;

    // Check every 1.5s if currentTime stops moving
    setInterval(() => {
      if (!vid || vid.style.display === 'none' || !vid.src) return;

      if (!vid.paused && !vid.ended && vid.readyState >= 2) {
        if (vid.currentTime === lastTime) {
          stallCount++;
          if (stallCount >= 2) {
            console.warn('[VideoWatchdog] Phát hiện video bị khựng tại', vid.currentTime, '— Đang tự gỡ kẹt...');
            if (vid.duration && vid.currentTime >= vid.duration - 0.5) {
              vid.currentTime = 0;
            } else {
              vid.currentTime += 0.05;
            }
            vid.play().catch(() => { });
            stallCount = 0;
          }
        } else {
          stallCount = 0;
        }
      } else if (vid.paused && !vid.ended && vid.style.display !== 'none' && vid.src) {
        // Auto resume if accidentally paused by browser buffer
        vid.play().catch(() => { });
      }
      lastTime = vid.currentTime;
    }, 1500);

    // Auto resume on stall / waiting
    vid.addEventListener('waiting', () => {
      setTimeout(() => { if (vid.paused && !vid.ended) vid.play().catch(() => { }); }, 1500);
    });
    vid.addEventListener('stalled', () => {
      setTimeout(() => { if (vid.paused && !vid.ended) vid.play().catch(() => { }); }, 1500);
    });
  },

  applyAudio() {
    const vid = document.getElementById('bg-custom-video');
    const vol = Math.min(Math.max((this.state.audioVolume || 80) / 100, 0), 1);

    if (vid) {
      vid.volume = vol;
      // Chỉ bật / tắt mute của video đang chạy. Video tiếp tục phát liền mạch tại vị trí hiện tại, không tua lại!
      vid.muted = !this.state.audioEnabled;
      if (vid.paused) {
        vid.play().catch(() => { });
      }
    }

    // Khi bật âm thanh background: tạm dừng máy phát nhạc để tránh phát đè 2 bài cùng lúc ("lộn nhạc")
    if (this.state.audioEnabled) {
      const pAudio = document.getElementById('player-audio');
      if (pAudio && !pAudio.paused) {
        pAudio.pause();
        const mpCard = document.getElementById('music-popup');
        mpCard?.classList.remove('playing');
        const mpPlayIcon = document.getElementById('mp-play-icon');
        if (mpPlayIcon) mpPlayIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
        const jbLabel = document.getElementById('jukebox-label');
        const jbBtn = document.getElementById('btn-jukebox-audio');
        if (jbLabel) jbLabel.textContent = 'Bật / Tắt nhạc: Tắt';
        if (jbBtn) jbBtn.classList.remove('active');
      }
    }
  },

  toggleAudio() {
    this.state.audioEnabled = !this.state.audioEnabled;
    this.applyAudio();
    this.updateAudioUI();
  },

  async setAsBgm(url) {
    if (!url) return;
    this.state.bgmUrl = url;
    if (db) {
      db.ref('settings/bgmUrl').set(url)
        .then(() => alert('Đã ghim bài hát này làm nhạc nền BGM trang web!'))
        .catch(e => alert('Lỗi ghim BGM: ' + e.message));
    } else {
      alert('Đã ghim bài hát làm BGM (Local)!');
    }
    this.updateAudioUI();
  },

  async save(bgUrl, name, avatar, audioEnabled, audioVolume, albumsOrPlaylist, currentAlbumId) {
    const rawBg = (typeof bgUrl === 'string') ? bgUrl.trim() : '';
    const resolvedBg = await resolveMediaUrl(rawBg);
    const resolvedAvatar = await resolveMediaUrl(avatar);

    this.state.backgroundUrl = rawBg;
    this.state.audioEnabled = !!audioEnabled;
    this.state.audioVolume = Number(audioVolume) || 80;
    if (name) this.state.username = name;
    if (avatar) this.state.avatarUrl = resolvedAvatar;

    let albumsToSave = [];
    if (Array.isArray(albumsOrPlaylist) && albumsOrPlaylist.length > 0) {
      if (albumsOrPlaylist[0] && Array.isArray(albumsOrPlaylist[0].playlist)) {
        albumsToSave = albumsOrPlaylist;
      } else {
        const cur = this.getCurrentAlbum();
        cur.playlist = albumsOrPlaylist;
        albumsToSave = this.state.albums;
      }
    } else {
      albumsToSave = this.state.albums;
    }

    // Resolve media links cho tất cả bài hát trong từng album
    for (const alb of albumsToSave) {
      if (Array.isArray(alb.playlist)) {
        for (const track of alb.playlist) {
          if (track.src) track.src = await resolveMediaUrl(track.src);
          if (track.cover) track.cover = await resolveMediaUrl(track.cover);
          if (track.bg) track.bg = await resolveMediaUrl(track.bg);
          if (track.lrc) track.lrc = await resolveMediaUrl(track.lrc);
        }
      }
    }

    this.state.albums = albumsToSave;
    if (currentAlbumId) this.state.currentAlbumId = currentAlbumId;
    this.syncActiveAlbum(false);

    // Cập nhật ngay lập tức giao diện & background cục bộ
    this.applyBackground(resolvedBg);
    this.applyAudio();
    this.updateUI();

    if (!db) {
      alert('Đã cập nhật Local thành công (Firebase chưa kết nối)!');
      return;
    }

    const u = {};
    u['settings/backgroundUrl'] = rawBg;
    u['settings/audioEnabled'] = this.state.audioEnabled;
    u['settings/audioVolume'] = this.state.audioVolume;
    u['settings/albums'] = albumsToSave;
    u['settings/currentAlbumId'] = this.state.currentAlbumId;
    u['settings/customPlaylist'] = this.state.playlist; // backward compat
    if (name) u['profile/name'] = name;
    if (avatar) u['profile/avatar'] = avatar;

    try {
      await db.ref().update(u);
      alert('Đã lưu thành công Background & tất cả Album nhạc lên Firebase!');
    } catch (e) {
      console.error('[Firebase Save Error]', e);
      alert('Lỗi khi lưu lên Firebase: ' + e.message);
    }
  }
};
