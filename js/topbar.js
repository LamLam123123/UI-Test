/* ==========================================================================
   SIDEBAR DRAWER + TOPBAR CONTROLLER
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  if (window.LazerApp) window.LazerApp.init();

  /* ── Clock & Uptime ─────────────────────────────────────── */
  const ckTime = document.getElementById('ck-time');
  const ckUp = document.getElementById('ck-up');
  const t0 = Date.now();

  function tick() {
    const d = new Date();
    let h = d.getHours(), m = d.getMinutes(), s = d.getSeconds();
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    if (ckTime) ckTime.textContent = `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} ${ap}`;
    const el = Math.floor((Date.now() - t0) / 1000);
    if (ckUp) ckUp.textContent = `running ${String(Math.floor(el / 3600)).padStart(2, '0')}:${String(Math.floor(el % 3600 / 60)).padStart(2, '0')}:${String(el % 60).padStart(2, '0')}`;
  }
  setInterval(tick, 1000); tick();

  /* ── Sidebar drawer ────────────────────────────────────── */
  const drawer = document.getElementById('sidebar-drawer');
  const handle = document.getElementById('sidebar-handle');
  const backdrop = document.getElementById('sb-backdrop');
  const mpCard = document.getElementById('music-popup');
  const lyricsBubble = document.getElementById('music-lyrics');

  const open = () => {
    drawer?.classList.add('open');
    backdrop?.classList.add('active');
    document.body.classList.add('sb-open');
    mpCard?.classList.add('sb-pushed');
    lyricsBubble?.classList.add('sb-pushed');
  };
  const close = () => {
    drawer?.classList.remove('open');
    backdrop?.classList.remove('active');
    document.body.classList.remove('sb-open');
    mpCard?.classList.remove('sb-pushed');
    lyricsBubble?.classList.remove('sb-pushed');
  };
  const toggle = () => drawer?.classList.contains('open') ? close() : open();

  /* click */
  handle?.addEventListener('click', e => { e.stopPropagation(); toggle(); });
  backdrop?.addEventListener('click', close);

  /* drag (mouse + touch) */
  let dragging = false, sx = 0, cx = 0;
  const SW = 220;

  function dStart(x) { dragging = true; sx = cx = x; drawer.style.transition = 'none'; }
  function dMove(x) {
    if (!dragging) return;
    cx = x;
    const dx = cx - sx;
    const isOpen = drawer.classList.contains('open');
    const off = isOpen ? Math.min(Math.max(dx, -SW), 0) : Math.min(Math.max(-SW + dx, -SW), 0);
    drawer.style.transform = `translateX(${off}px)`;
    if (off > -SW + 15) {
      mpCard?.classList.add('sb-pushed');
      lyricsBubble?.classList.add('sb-pushed');
    }
  }
  function dEnd() {
    if (!dragging) return;
    dragging = false;
    drawer.style.transition = '';
    drawer.style.transform = '';
    const dx = cx - sx;
    drawer.classList.contains('open') ? (dx < -40 ? close() : open()) : (dx > 40 ? open() : close());
  }

  handle?.addEventListener('mousedown', e => dStart(e.clientX));
  window.addEventListener('mousemove', e => dMove(e.clientX));
  window.addEventListener('mouseup', dEnd);
  handle?.addEventListener('touchstart', e => dStart(e.touches[0].clientX), { passive: true });
  window.addEventListener('touchmove', e => dMove(e.touches[0].clientX), { passive: true });
  window.addEventListener('touchend', dEnd);

  /* ESC */
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      close();
      ovEl?.classList.remove('open');
      closeAuthModal();
    }
  });

  /* ── Password verification modal ───────────────────────── */
  const authModal = document.getElementById('auth-modal');
  const pwdInput = document.getElementById('auth-pwd-input');
  const pwdError = document.getElementById('auth-pwd-error');
  const cancelBtn = document.getElementById('auth-cancel-btn');
  const submitBtn = document.getElementById('auth-submit-btn');

  function openAuthModal() {
    if (sessionStorage.getItem('lazer_admin_auth') === 'true') {
      toggleOv();
      return;
    }
    close(); // close sidebar
    if (pwdInput) pwdInput.value = '';
    if (pwdError) pwdError.textContent = '';
    authModal?.classList.add('open');
    setTimeout(() => pwdInput?.focus(), 150);
  }

  function closeAuthModal() {
    authModal?.classList.remove('open');
    if (pwdInput) pwdInput.value = '';
    if (pwdError) pwdError.textContent = '';
  }

  function checkPassword() {
    const val = pwdInput ? pwdInput.value : '';
    if (window.LazerApp && window.LazerApp.verifyPassword(val)) {
      sessionStorage.setItem('lazer_admin_auth', 'true');
      closeAuthModal();
      toggleOv();
      if (window.updateAdminPanelsUI) window.updateAdminPanelsUI();
    } else {
      if (pwdError) pwdError.textContent = 'Mật khẩu không chính xác!';
      pwdInput?.select();
    }
  }

  cancelBtn?.addEventListener('click', closeAuthModal);
  submitBtn?.addEventListener('click', checkPassword);
  pwdInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') checkPassword();
  });
  authModal?.addEventListener('click', e => {
    if (e.target === authModal) closeAuthModal();
  });

  /* ── Music Player Popup Controller (Tối giản & Mượt mà) ── */
  const pAudio = document.getElementById('player-audio');
  const mpCover = document.getElementById('mp-cover');
  const mpTitle = document.getElementById('mp-title');
  const mpArtist = document.getElementById('mp-artist');
  const mpPlayBtn = document.getElementById('mp-play');
  const mpPlayIcon = document.getElementById('mp-play-icon');
  const mpPrevBtn = document.getElementById('mp-prev');
  const mpNextBtn = document.getElementById('mp-next');
  const mpToggleDrawer = document.getElementById('mp-toggle-drawer');
  const mpDrawer = document.getElementById('mp-drawer');
  const mpSongCount = document.getElementById('mp-song-count');
  const mpPlaylistList = document.getElementById('mp-playlist-items');
  const mpCurTime = document.getElementById('mp-cur-time');
  const mpDurTime = document.getElementById('mp-dur-time');
  const mpSeekBar = document.getElementById('mp-seek-bar');
  const mpSeekFill = document.getElementById('mp-seek-fill');

  let currentTrackIdx = 0;
  let isSeeking = false;

  function fmtTime(sec) {
    if (isNaN(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  /* ── LRC Lyrics Engine ── */
  const mlActive = document.getElementById('ml-active');
  const lyricsCache = {};
  let lyrics = [];
  let currentLyricIdx = -1;

  function parseLyrics(text) {
    lyrics = [];
    if (!text || typeof text !== 'string') return;
    const lines = text.split('\n');
    const timeReg = /\[(\d{2}):(\d{2})(?:[.:](\d{2,3}))?\]/;

    lines.forEach(line => {
      const match = timeReg.exec(line);
      if (match) {
        const minutes = parseInt(match[1]);
        const seconds = parseInt(match[2]);
        const ms = match[3] ? parseInt(match[3]) : 0;
        const totalSeconds = minutes * 60 + seconds + (ms / (ms > 99 ? 1000 : 100));
        const lyricText = line.replace(/\[\d{2}:\d{2}(?:[.:]\d{2,3})?\]/g, '').trim();
        if (lyricText) {
          lyrics.push({ time: totalSeconds, text: lyricText });
        }
      }
    });

    lyrics.sort((a, b) => a.time - b.time);
  }

  async function loadLyrics(lrcFile) {
    if (!lrcFile) {
      lyrics = [];
      currentLyricIdx = -1;
      const list = getPlaylist();
      const trk = list[currentTrackIdx];
      if (mlActive) mlActive.textContent = trk ? (trk.name || '♪') : '♪';
      return;
    }
    try {
      if (lyricsCache[lrcFile]) {
        parseLyrics(lyricsCache[lrcFile]);
        return;
      }
      let fetchUrl = lrcFile;
      if (window.resolveMediaUrl && (lrcFile.includes('gofile.io') || lrcFile.includes('catbox'))) {
        fetchUrl = await window.resolveMediaUrl(lrcFile);
      }
      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error('Lyrics fetch error');
      const data = await response.text();
      lyricsCache[lrcFile] = data;
      parseLyrics(data);
    } catch (err) {
      lyrics = [];
      const list = getPlaylist();
      const trk = list[currentTrackIdx];
      if (mlActive) mlActive.textContent = trk ? (trk.name || '♪') : '♪';
    }
  }

  async function preloadAllLyrics() {
    const list = getPlaylist();
    if (!list || !list.length) return;
    list.forEach(async (track) => {
      const lrcFile = track.lrc || (track.src ? track.src.replace(/\.mp3$/i, '.lrc') : '');
      if (lrcFile && !lyricsCache[lrcFile]) {
        try {
          let url = lrcFile;
          if (window.resolveMediaUrl && (url.includes('gofile.io') || url.includes('catbox'))) {
            url = await window.resolveMediaUrl(url);
          }
          const resp = await fetch(url);
          if (resp.ok) {
            lyricsCache[lrcFile] = await resp.text();
          }
        } catch (_) { }
      }
    });
  }

  function syncLyrics() {
    if (!lyrics || lyrics.length === 0 || !pAudio) return;
    const curTime = pAudio.currentTime || 0;
    let activeIdx = -1;

    for (let i = 0; i < lyrics.length; i++) {
      if (curTime >= lyrics[i].time) {
        activeIdx = i;
      } else {
        break;
      }
    }

    if (activeIdx !== -1 && activeIdx !== currentLyricIdx) {
      currentLyricIdx = activeIdx;
      if (mlActive) {
        mlActive.textContent = lyrics[activeIdx].text;
        mlActive.classList.remove('pulse');
        void mlActive.offsetWidth;
        mlActive.classList.add('pulse');
      }
    }
  }

  function getPlaylist() {
    return (window.LazerApp && window.LazerApp.state && window.LazerApp.state.playlist)
      ? window.LazerApp.state.playlist
      : (window.LazerApp?.defaultPlaylist || []);
  }

  function loadTrack(idx, autoPlay = false) {
    const list = getPlaylist();
    if (!list || list.length === 0) return;
    if (idx < 0) idx = list.length - 1;
    if (idx >= list.length) idx = 0;
    currentTrackIdx = idx;

    const track = list[currentTrackIdx];
    if (pAudio) {
      if (pAudio.src !== track.src) {
        pAudio.src = track.src;
      }
    }
    if (mpCover) {
      mpCover.src = track.cover || '_backup_media/s4.jpg';
    }
    if (mpTitle) {
      mpTitle.textContent = track.name || 'Bài hát';
      mpTitle.title = track.name || '';
    }
    if (mpArtist) {
      mpArtist.textContent = 'Duong Lam';
    }

    // Cập nhật Lyric cho bài hát mới
    lyrics = [];
    currentLyricIdx = -1;
    if (mlActive) mlActive.textContent = track.name || '♪';
    const lrcUrl = track.lrc || (track.src ? track.src.replace(/\.mp3$/i, '.lrc') : '');
    if (lrcUrl) {
      loadLyrics(lrcUrl);
    }

    // Chuyển sang background độc quyền của bài hát này (nếu có), hoặc trả về background mặc định
    if (window.LazerApp) {
      const activeBg = (track.bg && track.bg.trim()) ? track.bg.trim() : (window.LazerApp.state.backgroundUrl || '');
      if (window.resolveMediaUrl) {
        window.resolveMediaUrl(activeBg).then(resolved => {
          window.LazerApp.applyBackground(resolved);
        });
      } else {
        window.LazerApp.applyBackground(activeBg);
      }
    }

    // Highlight active in playlist
    document.querySelectorAll('.mp-item').forEach((el, i) => {
      if (i === currentTrackIdx) {
        el.classList.add('active');
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        el.classList.remove('active');
      }
    });

    if (autoPlay) {
      playTrack();
    }
  }

  function syncPlayIcons(isPlaying) {
    const playSvg = '<path d="M8 5v14l11-7z"/>';
    const pauseSvg = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
    const svgContent = isPlaying ? pauseSvg : playSvg;
    if (mpPlayIcon) mpPlayIcon.innerHTML = svgContent;
    const miniIcon = document.getElementById('mp-mini-play-icon');
    if (miniIcon) miniIcon.innerHTML = svgContent;
  }

  function playTrack() {
    if (!pAudio) return;
    // Music player hoạt động độc lập, khi phát sẽ tắt tiếng video nền để tránh lộn nhạc
    pAudio.muted = false;
    pAudio.volume = 0.8;

    pAudio.play().then(() => {
      mpCard?.classList.add('playing');
      syncPlayIcons(true);
      const jbLabel = document.getElementById('jukebox-label');
      const jbBtn = document.getElementById('btn-jukebox-audio');
      if (jbLabel) jbLabel.textContent = 'Bật / Tắt nhạc: Bật';
      if (jbBtn) jbBtn.classList.add('active');

      // Tắt tiếng video background để tránh phát đè 2 bài cùng lúc
      const vid = document.getElementById('bg-custom-video');
      if (vid) vid.muted = true;
      if (window.LazerApp) {
        window.LazerApp.state.audioEnabled = false;
        window.LazerApp.updateAudioUI();
      }
    }).catch(err => {
      console.log('[MusicPlayer] Chờ tương tác người dùng để phát nhạc:', err);
      // Tự động mở nhạc số 1 ngay khi người dùng chạm/click lần đầu vào web
      const startOnInteraction = () => {
        window.removeEventListener('pointerdown', startOnInteraction);
        window.removeEventListener('click', startOnInteraction);
        window.removeEventListener('keydown', startOnInteraction);
        if (pAudio && pAudio.paused) {
          playTrack();
        }
      };
      window.addEventListener('pointerdown', startOnInteraction, { once: true, passive: true });
      window.addEventListener('click', startOnInteraction, { once: true, passive: true });
      window.addEventListener('keydown', startOnInteraction, { once: true, passive: true });
    });
  }

  function pauseTrack() {
    if (!pAudio) return;
    pAudio.pause();
    mpCard?.classList.remove('playing');
    syncPlayIcons(false);
    const jbLabel = document.getElementById('jukebox-label');
    const jbBtn = document.getElementById('btn-jukebox-audio');
    if (jbLabel) jbLabel.textContent = 'Bật / Tắt nhạc: Tắt';
    if (jbBtn) jbBtn.classList.remove('active');
  }

  function togglePlay() {
    if (!pAudio) return;
    if (pAudio.paused) {
      playTrack();
    } else {
      pauseTrack();
    }
  }

  mpPlayBtn?.addEventListener('click', togglePlay);

  // Mini Play/Stop button trên ảnh bìa khi ở dạng khối vuông thu nhỏ
  const miniPlayBtn = document.getElementById('mp-mini-play');
  miniPlayBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlay();
  });

  // Chạm/Click vào khối vuông popup nhạc để mở rộng thông tin
  mpCard?.addEventListener('click', (e) => {
    if (e.target.closest('#mp-mini-play') || e.target.closest('.mp-btn') || e.target.closest('.mp-seek-bar') || e.target.closest('#mp-drawer')) {
      return;
    }
    const isExp = mpCard.classList.toggle('expanded');
    lyricsBubble?.classList.toggle('expanded', isExp);
    if (!isExp) {
      mpDrawer?.classList.remove('open');
      mpCard.classList.remove('drawer-open');
      lyricsBubble?.classList.remove('drawer-open');
    }
    updateLyricsPos();
  });

  // Dynamic position updater: Luôn bám sát mép trên của popup nhạc theo đúng chiều cao thực tế
  function updateLyricsPos() {
    if (!mpCard || !lyricsBubble) return;
    const isExpanded = mpCard.classList.contains('expanded') || lyricsBubble.classList.contains('popup-hover');
    if (isExpanded) {
      const h = mpCard.offsetHeight || 84;
      const b = (window.innerWidth <= 600) ? 14 : 20;
      lyricsBubble.style.setProperty('--lyric-bottom', (b + h + 8) + 'px');
    } else {
      lyricsBubble.style.removeProperty('--lyric-bottom');
      lyricsBubble.classList.remove('drawer-open');
    }
  }

  if (window.ResizeObserver && mpCard) {
    new ResizeObserver(updateLyricsPos).observe(mpCard);
  }

  // Hover vào khối vuông để mở rộng trên PC
  mpCard?.addEventListener('mouseenter', () => {
    lyricsBubble?.classList.add('popup-hover');
    updateLyricsPos();
  });
  mpCard?.addEventListener('mouseleave', () => {
    lyricsBubble?.classList.remove('popup-hover');
    if (!mpCard.classList.contains('expanded')) {
      mpDrawer?.classList.remove('open');
      mpCard.classList.remove('drawer-open');
      lyricsBubble?.classList.remove('drawer-open');
    }
    updateLyricsPos();
  });

  // Nhấn ra ngoài popup thì tự động thu nhỏ lại thành khối vuông
  document.addEventListener('click', (e) => {
    if (mpCard && mpCard.classList.contains('expanded')) {
      if (!mpCard.contains(e.target)) {
        mpCard.classList.remove('expanded', 'drawer-open');
        lyricsBubble?.classList.remove('expanded', 'drawer-open');
        mpDrawer?.classList.remove('open');
        updateLyricsPos();
      }
    }
  });
  mpPrevBtn?.addEventListener('click', () => {
    loadTrack(currentTrackIdx - 1, true);
  });
  mpNextBtn?.addEventListener('click', () => {
    loadTrack(currentTrackIdx + 1, true);
  });
  pAudio?.addEventListener('ended', () => {
    loadTrack(currentTrackIdx + 1, true);
  });

  // Tua nhạc (Seekbar click & drag)
  function seekTo(e) {
    if (!pAudio || !pAudio.duration) return;
    const rect = mpSeekBar.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    pAudio.currentTime = pos * pAudio.duration;
  }

  mpSeekBar?.addEventListener('click', seekTo);

  // Time update
  pAudio?.addEventListener('timeupdate', () => {
    if (!pAudio || isSeeking) return;
    const cur = pAudio.currentTime || 0;
    const dur = pAudio.duration || 0;
    if (mpCurTime) mpCurTime.textContent = fmtTime(cur);
    if (mpDurTime) mpDurTime.textContent = dur ? fmtTime(dur) : '0:00';
    if (mpSeekFill && dur > 0) {
      const pct = (cur / dur) * 100;
      mpSeekFill.style.width = pct + '%';
    }
    syncLyrics();
  });

  pAudio?.addEventListener('loadedmetadata', () => {
    if (mpDurTime && pAudio.duration) {
      mpDurTime.textContent = fmtTime(pAudio.duration);
    }
  });

  // Toggle playlist drawer
  mpToggleDrawer?.addEventListener('click', (e) => {
    e.stopPropagation();
    mpDrawer?.classList.toggle('open');
    const isDrawerOpen = mpDrawer?.classList.contains('open') || false;
    if (!isDrawerOpen) {
      mpAlbumPicker?.classList.remove('open');
      mpChangeAlbumBtn?.classList.remove('active');
    }
    mpCard?.classList.toggle('drawer-open', isDrawerOpen);
    lyricsBubble?.classList.toggle('drawer-open', isDrawerOpen);
    updateLyricsPos();
    setTimeout(updateLyricsPos, 320);
  });

  /* ── Album Switcher Controller ─────────────────────────── */
  const mpChangeAlbumBtn = document.getElementById('mp-change-album-btn');
  const mpAlbumPicker = document.getElementById('mp-album-picker');
  const mpAlbumPickerClose = document.getElementById('mp-album-picker-close');
  const mpAlbumPickerList = document.getElementById('mp-album-picker-list');
  const mpDrawerAlbumName = document.getElementById('mp-drawer-album-name');

  // Bật/tắt khung chọn album
  mpChangeAlbumBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!mpDrawer?.classList.contains('open')) {
      mpDrawer?.classList.add('open');
      mpCard?.classList.add('drawer-open');
      lyricsBubble?.classList.add('drawer-open');
      updateLyricsPos();
    }
    const isOpen = mpAlbumPicker?.classList.toggle('open');
    mpChangeAlbumBtn?.classList.toggle('active', isOpen);
    if (isOpen && window.renderAlbumSelect) {
      window.renderAlbumSelect();
    }
  });

  mpAlbumPickerClose?.addEventListener('click', (e) => {
    e.stopPropagation();
    mpAlbumPicker?.classList.remove('open');
    mpChangeAlbumBtn?.classList.remove('active');
  });

  // Click ra ngoài album picker thì đóng lại
  document.addEventListener('click', (e) => {
    if (mpAlbumPicker?.classList.contains('open')) {
      if (!mpAlbumPicker.contains(e.target) && !mpChangeAlbumBtn?.contains(e.target)) {
        mpAlbumPicker.classList.remove('open');
        mpChangeAlbumBtn?.classList.remove('active');
      }
    }
  });

  window.renderAlbumSelect = function () {
    const albums = (window.LazerApp && window.LazerApp.state && window.LazerApp.state.albums) || [];
    const curId = window.LazerApp?.state?.currentAlbumId || (albums[0] ? albums[0].id : '');

    // Cập nhật tên album hiển thị trên header drawer
    const curAlb = window.LazerApp?.getCurrentAlbum ? window.LazerApp.getCurrentAlbum() : null;
    if (mpDrawerAlbumName && curAlb) {
      mpDrawerAlbumName.textContent = curAlb.name || 'Album';
    }

    if (!mpAlbumPickerList) return;
    mpAlbumPickerList.innerHTML = '';

    albums.forEach(alb => {
      const item = document.createElement('div');
      const isActive = alb.id === curId;
      item.className = 'mp-album-picker-item' + (isActive ? ' active' : '');
      item.innerHTML = `
        <div class="mp-album-item-left">
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/></svg>
          <span class="mp-album-item-name">${alb.name || 'Album'}</span>
        </div>
        <div class="mp-album-item-right">
          <span class="mp-album-item-badge">${alb.playlist ? alb.playlist.length : 0} bài</span>
        </div>
      `;
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        mpAlbumPicker?.classList.remove('open');
        mpChangeAlbumBtn?.classList.remove('active');
        window.LazerApp?.selectAlbum(alb.id, true);
      });
      mpAlbumPickerList.appendChild(item);
    });
  };

  // Render Playlist items in music player
  window.renderMusicPlaylist = function () {
    const list = getPlaylist();
    if (!mpPlaylistList) return;
    mpPlaylistList.innerHTML = '';
    if (mpSongCount) mpSongCount.textContent = list.length;

    // Cập nhật tiêu đề drawer kèm tên album đang phát
    const curAlb = window.LazerApp?.getCurrentAlbum ? window.LazerApp.getCurrentAlbum() : null;
    if (mpDrawerAlbumName && curAlb) {
      mpDrawerAlbumName.textContent = curAlb.name || 'Album';
    }

    list.forEach((track, i) => {
      const item = document.createElement('div');
      item.className = 'mp-item' + (i === currentTrackIdx ? ' active' : '');
      item.innerHTML = `
        <img class="mp-item-img" src="${track.cover || '_backup_media/s4.jpg'}" alt="art" onerror="this.src='_backup_media/s4.jpg'">
        <span class="mp-item-name">${track.name || 'Bài hát'}</span>
      `;
      item.addEventListener('click', () => {
        loadTrack(i, true);
      });
      mpPlaylistList.appendChild(item);
    });
  };

  // Expose global methods
  window.loadTrack = loadTrack;
  window.playTrack = playTrack;

  // Khởi tạo danh sách & mặc định mở bài số 1 ở đầu tiên khi vào web
  setTimeout(() => {
    if (window.renderAlbumSelect) window.renderAlbumSelect();
    window.renderMusicPlaylist();
    loadTrack(0, true);
    preloadAllLyrics();
  }, 150);

  /* ==========================================================================
     SIDEBAR CONTROLLER: PANELS, FEEDS, GALLERY, INFO NOTE & TOASTS
     ========================================================================== */

  /* ── 0. Toast Notification Helper ─────────────────────────── */
  const toastEl = document.getElementById('lazer-toast');
  const toastMsg = document.getElementById('toast-msg');
  let toastTimer = null;

  function showToast(msg) {
    if (!toastEl || !toastMsg) return;
    toastMsg.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 2800);
  }
  window.showToast = showToast;

  /* ── 0.1 Common Right Panels Manager ───────────────────────── */
  const sideBackdrop = document.getElementById('side-panel-backdrop');
  const panelNewsfeed = document.getElementById('panel-newsfeed');
  const panelGallery = document.getElementById('panel-gallery');
  const panelInfo = document.getElementById('panel-info');

  function closeAllRightPanels() {
    if (panelNewsfeed?.classList.contains('open')) {
      freezeNewsfeed();
      panelNewsfeed.classList.remove('open');
    }
    if (panelGallery?.classList.contains('open')) {
      panelGallery.classList.remove('open');
    }
    if (panelInfo?.classList.contains('open')) {
      panelInfo.classList.remove('open');
    }
    sideBackdrop?.classList.remove('open');
  }

  sideBackdrop?.addEventListener('click', closeAllRightPanels);

  function updateAdminPanelsUI() {
    const isAdmin = sessionStorage.getItem('lazer_admin_auth') === 'true';
    if (feedComposer) feedComposer.style.display = isAdmin ? 'flex' : 'none';
    if (galleryAdminBox) galleryAdminBox.style.display = isAdmin ? 'flex' : 'none';
    if (noteBtnEdit) noteBtnEdit.style.display = isAdmin ? 'inline-flex' : 'none';
  }
  window.updateAdminPanelsUI = updateAdminPanelsUI;

  /* ── 0.2 Footprint (Dấu chân) Button Controller ─────────────── */
  const sbFootprintBtn = document.getElementById('sb-footprint-btn');
  const sbFootprintCount = document.getElementById('sb-footprint-count');

  function checkFootprintStatus() {
    const hasLeft = localStorage.getItem('lazer_footprint_left') === 'true';
    if (sbFootprintBtn) {
      sbFootprintBtn.classList.toggle('left-footprint', hasLeft);
      const callout = sbFootprintBtn.querySelector('.sb-footprint-callout');
      if (callout) {
        callout.textContent = hasLeft ? 'ĐÃ LƯU' : 'CLICK ME!';
      }
    }
  }
  checkFootprintStatus();

  sbFootprintBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const hasLeft = localStorage.getItem('lazer_footprint_left') === 'true';
    if (hasLeft) {
      showToast('Bạn đã để lại dấu chân rồi. Cảm ơn bạn rất nhiều! ✨');
      return;
    }

    // Đánh dấu mỗi máy chỉ được click 1 lần
    localStorage.setItem('lazer_footprint_left', 'true');
    checkFootprintStatus();

    // Tăng số dấu chân lưu lên Firebase
    const db = window.LazerApp?.db;
    if (db) {
      db.ref('analytics/footprints').transaction(c => (c || 0) + 1);
    }

    // Thông báo theo đúng câu người dùng yêu cầu
    showToast('Cảm ơn bạn đã để lại dấu chân, chúc bạn một ngày tốt lành');
  });

  /* ── 1. News Feed Controller (Lazy Load + Freeze) ─────────── */
  const feedBtnClose = document.getElementById('feed-btn-close');
  const feedBtnRefresh = document.getElementById('feed-btn-refresh');
  const feedComposer = document.getElementById('feed-composer');
  const feedComposerAvatar = document.getElementById('feed-composer-avatar');
  const feedComposerName = document.getElementById('feed-composer-name');
  const feedInpText = document.getElementById('feed-inp-text');
  const feedInpMedia = document.getElementById('feed-inp-media');
  const feedBtnPost = document.getElementById('feed-btn-post');
  const feedLoading = document.getElementById('feed-loading');
  const feedEmpty = document.getElementById('feed-empty');
  const feedPostsList = document.getElementById('feed-posts-list');

  let isNewsfeedLoaded = false;
  let feedFirebaseRef = null;

  function openNewsfeed() {
    closeAllRightPanels();
    close(); // đóng left sidebar
    sideBackdrop?.classList.add('open');
    panelNewsfeed?.classList.add('open');

    updateAdminPanelsUI();
    if (window.LazerApp?.state) {
      if (feedComposerAvatar && window.LazerApp.state.avatarUrl) {
        feedComposerAvatar.src = window.LazerApp.state.avatarUrl;
      }
      if (feedComposerName && window.LazerApp.state.username) {
        feedComposerName.textContent = window.LazerApp.state.username;
      }
    }

    loadNewsfeed();
  }

  function freezeNewsfeed() {
    // Đóng băng Firebase listener khi tắt panel để web không bị lag
    if (window.LazerApp?.db && feedFirebaseRef) {
      try {
        feedFirebaseRef.off('value');
      } catch (e) { }
      feedFirebaseRef = null;
    }
  }

  function loadNewsfeed() {
    if (!feedLoading || !feedPostsList) return;

    if (!isNewsfeedLoaded) {
      feedLoading.style.display = 'flex';
      if (feedEmpty) feedEmpty.style.display = 'none';
    }

    const db = window.LazerApp?.db;
    if (!db) {
      feedLoading.style.display = 'none';
      renderNewsfeedPosts([]);
      return;
    }

    // Kết nối Firebase lấy các status bài đăng
    feedFirebaseRef = db.ref('newsfeed_posts');
    feedFirebaseRef.limitToLast(40).on('value', snap => {
      feedLoading.style.display = 'none';
      isNewsfeedLoaded = true;

      const posts = [];
      if (snap.exists()) {
        snap.forEach(child => {
          posts.push({ id: child.key, ...child.val() });
        });
      }
      posts.reverse(); // Bài mới nhất lên đầu
      renderNewsfeedPosts(posts);
    }, err => {
      console.warn('[NewsFeed] Error loading:', err);
      feedLoading.style.display = 'none';
    });
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatPostContent(str) {
    const escaped = escapeHtml(str);
    return escaped.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener" style="color: #ffffff; text-decoration: underline;">$1</a>');
  }

  function formatPostTime(ts) {
    if (!ts) return 'Vừa xong';
    const now = Date.now();
    const diff = Math.floor((now - Number(ts)) / 1000);
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} ngày trước`;
    const d = new Date(Number(ts));
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function renderNewsfeedPosts(posts) {
    if (!feedPostsList) return;
    feedPostsList.innerHTML = '';

    if (!posts || posts.length === 0) {
      if (feedEmpty) feedEmpty.style.display = 'flex';
      return;
    }
    if (feedEmpty) feedEmpty.style.display = 'none';

    const isAdmin = sessionStorage.getItem('lazer_admin_auth') === 'true';

    posts.forEach(p => {
      const card = document.createElement('div');
      card.className = 'feed-post';
      card.dataset.id = p.id;

      const timeStr = formatPostTime(p.createdAt);

      let mediaList = [];
      if (Array.isArray(p.mediaUrls) && p.mediaUrls.length > 0) {
        mediaList = p.mediaUrls;
      } else if (p.mediaUrl) {
        mediaList = [p.mediaUrl];
      }

      let mediaHtml = '';
      if (mediaList.length === 1) {
        const m = mediaList[0];
        if (window.isVideoUrl && window.isVideoUrl(m)) {
          mediaHtml = `
            <div class="post-media-wrap">
              <video class="post-media-video" src="${m}" controls playsinline preload="metadata"></video>
            </div>
          `;
        } else {
          mediaHtml = `
            <div class="post-media-wrap">
              <img class="post-media-img" src="${m}" alt="media" loading="lazy" onclick="window.openLightboxGallery(['${m}'], 0, '${escapeHtml(p.content || '')}')">
            </div>
          `;
        }
      } else if (mediaList.length > 1) {
        const countClass = mediaList.length === 2 ? 'grid-count-2' :
                           mediaList.length === 3 ? 'grid-count-3' :
                           mediaList.length === 4 ? 'grid-count-4' : 'grid-count-5plus';
        const displayList = mediaList.slice(0, 4);
        const encodedList = JSON.stringify(mediaList).replace(/"/g, '&quot;');
        const contentStr = escapeHtml(p.content || '');

        let itemsHtml = '';
        displayList.forEach((m, idx) => {
          const isLastWithMore = (idx === 3 && mediaList.length > 4);
          const moreOverlay = isLastWithMore ? `<div class="grid-media-item-more">+${mediaList.length - 3}</div>` : '';
          const isVid = window.isVideoUrl && window.isVideoUrl(m);
          const thumbHtml = isVid
            ? `<video src="${m}" preload="metadata" muted></video>`
            : `<img src="${m}" alt="media" loading="lazy">`;

          itemsHtml += `
            <div class="grid-media-item" onclick="window.openLightboxGallery(${encodedList}, ${idx}, '${contentStr}')">
              ${thumbHtml}
              ${moreOverlay}
            </div>
          `;
        });

        mediaHtml = `<div class="post-media-grid ${countClass}">${itemsHtml}</div>`;
      }

      const delBtnHtml = isAdmin ? `
        <button type="button" class="post-btn-del" title="Xóa bài viết" onclick="window.deleteNewsfeedPost('${p.id}')">
          <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
        </button>
      ` : '';

      const isLiked = localStorage.getItem('liked_feed_' + p.id) === 'true';
      const likeCount = Number(p.likes || 0);

      card.innerHTML = `
        <div class="post-header">
          <div class="post-author-wrap">
            <img class="post-avatar" src="${p.avatar || 'https://files.catbox.moe/6797h4.png'}" alt="avt" onerror="this.src='https://files.catbox.moe/6797h4.png'">
            <div class="post-meta">
              <div class="post-author-row">
                <span class="post-author">${escapeHtml(p.author || 'DLam Uwa Uwa')}</span>
                <span class="post-badge">Admin</span>
              </div>
              <span class="post-time">${timeStr}</span>
            </div>
          </div>
          ${delBtnHtml}
        </div>
        <div class="post-body">${formatPostContent(p.content || '')}</div>
        ${mediaHtml}
        <div class="post-footer">
          <button type="button" class="post-like-btn ${isLiked ? 'liked' : ''}" onclick="window.toggleLikeFeedPost('${p.id}', this)">
            <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            <span class="post-like-count">${likeCount}</span>
          </button>
        </div>
      `;
      feedPostsList.appendChild(card);
    });
  }

  // Admin đăng bài viết mới (hỗ trợ nhiều ảnh/video)
  feedBtnPost?.addEventListener('click', async () => {
    const text = feedInpText?.value.trim() || '';
    const rawMedia = feedInpMedia?.value.trim() || '';
    if (!text && !rawMedia) {
      alert('Vui lòng nhập nội dung status hoặc link ảnh/video!');
      return;
    }

    const lines = rawMedia.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    const resolvedMediaList = [];
    for (const m of lines) {
      const r = window.resolveMediaUrl ? await window.resolveMediaUrl(m) : m;
      if (r) resolvedMediaList.push(r);
    }

    const db = window.LazerApp?.db;
    if (!db) {
      alert('Chưa kết nối Firebase!');
      return;
    }

    const newPost = {
      author: window.LazerApp?.state?.username || 'DLam Uwa Uwa',
      avatar: window.LazerApp?.state?.avatarUrl || 'https://files.catbox.moe/6797h4.png',
      content: text,
      mediaUrl: resolvedMediaList[0] || '',
      mediaUrls: resolvedMediaList,
      createdAt: Date.now(),
      likes: 0
    };

    feedBtnPost.disabled = true;
    db.ref('newsfeed_posts').push(newPost, err => {
      feedBtnPost.disabled = false;
      if (err) {
        alert('Lỗi đăng bài: ' + err.message);
      } else {
        if (feedInpText) feedInpText.value = '';
        if (feedInpMedia) feedInpMedia.value = '';
        showToast('Đã đăng bài viết mới thành công!');
      }
    });
  });

  feedBtnClose?.addEventListener('click', closeAllRightPanels);
  feedBtnRefresh?.addEventListener('click', () => {
    isNewsfeedLoaded = false;
    loadNewsfeed();
    showToast('Đang làm mới bảng tin...');
  });

  window.deleteNewsfeedPost = function (postId) {
    if (!confirm('Bạn có chắc chắn muốn xóa bài viết này không?')) return;
    const db = window.LazerApp?.db;
    if (db) {
      db.ref('newsfeed_posts/' + postId).remove(() => {
        showToast('Đã xóa bài viết.');
      });
    }
  };

  window.toggleLikeFeedPost = function (postId, btn) {
    const key = 'liked_feed_' + postId;
    const isLiked = localStorage.getItem(key) === 'true';
    const db = window.LazerApp?.db;
    if (db) {
      if (isLiked) {
        localStorage.removeItem(key);
        btn.classList.remove('liked');
        db.ref(`newsfeed_posts/${postId}/likes`).transaction(c => Math.max(0, (c || 1) - 1));
      } else {
        localStorage.setItem(key, 'true');
        btn.classList.add('liked');
        db.ref(`newsfeed_posts/${postId}/likes`).transaction(c => (c || 0) + 1);
      }
    }
  };

  /* ── 2. Gallery (Kho ảnh & Video) + Passkey Protection ─────── */
  const galleryPasskeyModal = document.getElementById('gallery-passkey-modal');
  const galleryPasskeyInput = document.getElementById('gallery-passkey-input');
  const galleryPasskeyError = document.getElementById('gallery-passkey-error');
  const galleryPasskeyCancel = document.getElementById('gallery-passkey-cancel');
  const galleryPasskeySubmit = document.getElementById('gallery-passkey-submit');

  const galleryBtnClose = document.getElementById('gallery-btn-close');
  const galleryBtnRefresh = document.getElementById('gallery-btn-refresh');
  const galleryAdminBox = document.getElementById('gallery-admin-box');
  const galleryInpTitle = document.getElementById('gallery-inp-title');
  const galleryInpUrl = document.getElementById('gallery-inp-url');
  const galleryBtnAdd = document.getElementById('gallery-btn-add');
  const galleryLoading = document.getElementById('gallery-loading');
  const galleryEmpty = document.getElementById('gallery-empty');
  const galleryGrid = document.getElementById('gallery-grid');

  function openGalleryFlow() {
    close(); // đóng left sidebar
    if (sessionStorage.getItem('lazer_gallery_auth') === 'true') {
      openGalleryPanel();
    } else {
      openGalleryPasskeyModal();
    }
  }

  function openGalleryPasskeyModal() {
    if (galleryPasskeyInput) galleryPasskeyInput.value = '';
    if (galleryPasskeyError) galleryPasskeyError.textContent = '';
    galleryPasskeyModal?.classList.add('open');
    setTimeout(() => galleryPasskeyInput?.focus(), 150);
  }

  function closeGalleryPasskeyModal() {
    galleryPasskeyModal?.classList.remove('open');
    if (galleryPasskeyInput) galleryPasskeyInput.value = '';
    if (galleryPasskeyError) galleryPasskeyError.textContent = '';
  }

  function verifyGalleryPasskey() {
    const val = galleryPasskeyInput ? galleryPasskeyInput.value.trim() : '';
    if (val === 'lamlam123') {
      sessionStorage.setItem('lazer_gallery_auth', 'true');
      closeGalleryPasskeyModal();
      openGalleryPanel();
      showToast('Đã mở khóa Kho ảnh thành công!');
    } else {
      if (galleryPasskeyError) galleryPasskeyError.textContent = 'Mã khóa không đúng! Vui lòng thử lại.';
      galleryPasskeyInput?.select();
    }
  }

  galleryPasskeySubmit?.addEventListener('click', verifyGalleryPasskey);
  galleryPasskeyCancel?.addEventListener('click', closeGalleryPasskeyModal);
  galleryPasskeyInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') verifyGalleryPasskey();
  });
  galleryPasskeyModal?.addEventListener('click', e => {
    if (e.target === galleryPasskeyModal) closeGalleryPasskeyModal();
  });

  function openGalleryPanel() {
    closeAllRightPanels();
    sideBackdrop?.classList.add('open');
    panelGallery?.classList.add('open');

    updateAdminPanelsUI();
    loadGalleryItems();
  }

  function loadGalleryItems() {
    if (!galleryLoading || !galleryGrid) return;
    galleryLoading.style.display = 'flex';
    if (galleryEmpty) galleryEmpty.style.display = 'none';

    const db = window.LazerApp?.db;
    if (!db) {
      galleryLoading.style.display = 'none';
      renderGalleryItems([]);
      return;
    }

    db.ref('gallery_items').on('value', snap => {
      galleryLoading.style.display = 'none';
      const items = [];
      if (snap.exists()) {
        snap.forEach(child => {
          items.push({ id: child.key, ...child.val() });
        });
      }
      items.reverse();
      renderGalleryItems(items);
    }, err => {
      console.warn('[Gallery] Load error:', err);
      galleryLoading.style.display = 'none';
    });
  }

  function renderGalleryItems(items) {
    if (!galleryGrid) return;
    galleryGrid.innerHTML = '';

    if (!items || items.length === 0) {
      if (galleryEmpty) galleryEmpty.style.display = 'flex';
      return;
    }
    if (galleryEmpty) galleryEmpty.style.display = 'none';

    const isAdmin = sessionStorage.getItem('lazer_admin_auth') === 'true';

    items.forEach(it => {
      const card = document.createElement('div');
      card.className = 'gallery-card';
      const isVid = it.type === 'video' || (window.isVideoUrl && window.isVideoUrl(it.url));
      const badgeText = isVid ? 'VIDEO' : 'ẢNH';

      const delBtnHtml = isAdmin ? `
        <button type="button" class="gallery-del-btn" title="Xóa khỏi kho" onclick="event.stopPropagation(); window.deleteGalleryItem('${it.id}')">
          <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
        </button>
      ` : '';

      let mediaThumb = '';
      if (isVid) {
        mediaThumb = `<video class="gallery-thumb" src="${it.url}" preload="metadata" muted></video>`;
      } else {
        mediaThumb = `<img class="gallery-thumb" src="${it.url}" alt="${escapeHtml(it.title || '')}" loading="lazy">`;
      }

      card.innerHTML = `
        ${mediaThumb}
        <span class="gallery-item-badge">${badgeText}</span>
        ${delBtnHtml}
        <div class="gallery-overlay-meta">
          <span class="gallery-item-title">${escapeHtml(it.title || 'Không có tiêu đề')}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        window.openLightbox(it.url, it.title || '', isVid);
      });

      galleryGrid.appendChild(card);
    });
  }

  // Admin thêm ảnh/video mới
  galleryBtnAdd?.addEventListener('click', async () => {
    const title = galleryInpTitle?.value.trim() || '';
    let url = galleryInpUrl?.value.trim() || '';
    if (!url) {
      alert('Vui lòng nhập link ảnh hoặc video!');
      return;
    }

    if (window.resolveMediaUrl) {
      url = await window.resolveMediaUrl(url);
    }

    const db = window.LazerApp?.db;
    if (!db) {
      alert('Chưa kết nối Firebase!');
      return;
    }

    const isVid = window.isVideoUrl ? window.isVideoUrl(url) : false;

    const newItem = {
      title: title || 'Kho lưu trữ',
      url: url,
      type: isVid ? 'video' : 'image',
      createdAt: Date.now()
    };

    galleryBtnAdd.disabled = true;
    db.ref('gallery_items').push(newItem, err => {
      galleryBtnAdd.disabled = false;
      if (err) {
        alert('Lỗi thêm ảnh: ' + err.message);
      } else {
        if (galleryInpTitle) galleryInpTitle.value = '';
        if (galleryInpUrl) galleryInpUrl.value = '';
        showToast('Đã thêm ảnh/video vào kho thành công!');
      }
    });
  });

  galleryBtnClose?.addEventListener('click', closeAllRightPanels);
  galleryBtnRefresh?.addEventListener('click', () => {
    loadGalleryItems();
    showToast('Đang làm mới kho ảnh...');
  });

  window.deleteGalleryItem = function (itemId) {
    if (!confirm('Bạn có chắc chắn muốn xóa mục này khỏi kho ảnh?')) return;
    const db = window.LazerApp?.db;
    if (db) {
      db.ref('gallery_items/' + itemId).remove(() => {
        showToast('Đã xóa mục khỏi kho ảnh.');
      });
    }
  };

  // Lightbox View (Hỗ trợ chuyển ảnh mượt mà khi bài viết có nhiều ảnh)
  const lightbox = document.getElementById('gallery-lightbox');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');
  const lightboxContent = document.getElementById('lightbox-content');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const lightboxCounter = document.getElementById('lightbox-counter');

  let currentLightboxMedia = [];
  let currentLightboxIdx = 0;
  let currentLightboxText = '';

  function renderLightboxCurrent() {
    if (!lightbox || !lightboxContent) return;
    lightboxContent.innerHTML = '';

    if (!currentLightboxMedia || currentLightboxMedia.length === 0) return;
    const url = currentLightboxMedia[currentLightboxIdx];
    const isVideo = window.isVideoUrl && window.isVideoUrl(url);

    if (isVideo) {
      lightboxContent.innerHTML = `<video src="${url}" controls autoplay playsinline style="max-width: 90vw; max-height: 80vh;"></video>`;
    } else {
      lightboxContent.innerHTML = `<img src="${url}" alt="fullscreen" style="max-width: 90vw; max-height: 80vh;">`;
    }

    if (lightboxCaption) lightboxCaption.textContent = currentLightboxText;

    if (lightboxCounter) {
      if (currentLightboxMedia.length > 1) {
        lightboxCounter.style.display = 'block';
        lightboxCounter.textContent = `${currentLightboxIdx + 1} / ${currentLightboxMedia.length}`;
      } else {
        lightboxCounter.style.display = 'none';
      }
    }

    if (lightboxPrev && lightboxNext) {
      const showNav = currentLightboxMedia.length > 1;
      lightboxPrev.style.display = showNav ? 'flex' : 'none';
      lightboxNext.style.display = showNav ? 'flex' : 'none';
    }
  }

  window.openLightboxGallery = function (mediaList, startIndex = 0, caption = '') {
    if (!Array.isArray(mediaList) || mediaList.length === 0) return;
    currentLightboxMedia = mediaList;
    currentLightboxIdx = Math.max(0, Math.min(startIndex, mediaList.length - 1));
    currentLightboxText = caption;
    renderLightboxCurrent();
    lightbox?.classList.add('open');
  };

  window.openLightbox = function (url, caption = '', isVideo = false) {
    window.openLightboxGallery([url], 0, caption);
  };

  lightboxPrev?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentLightboxMedia.length > 1) {
      currentLightboxIdx = (currentLightboxIdx - 1 + currentLightboxMedia.length) % currentLightboxMedia.length;
      renderLightboxCurrent();
    }
  });

  lightboxNext?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentLightboxMedia.length > 1) {
      currentLightboxIdx = (currentLightboxIdx + 1) % currentLightboxMedia.length;
      renderLightboxCurrent();
    }
  });

  lightboxClose?.addEventListener('click', () => {
    lightbox?.classList.remove('open');
    if (lightboxContent) lightboxContent.innerHTML = '';
  });
  lightbox?.addEventListener('click', e => {
    if (e.target === lightbox) {
      lightbox.classList.remove('open');
      if (lightboxContent) lightboxContent.innerHTML = '';
    }
  });

  document.addEventListener('keydown', e => {
    if (lightbox?.classList.contains('open')) {
      if (e.key === 'Escape') {
        lightbox.classList.remove('open');
        if (lightboxContent) lightboxContent.innerHTML = '';
      } else if (e.key === 'ArrowLeft') {
        lightboxPrev?.click();
      } else if (e.key === 'ArrowRight') {
        lightboxNext?.click();
      }
    }
  });

  /* ── 3. Information Note (Popup vuông trượt từ phải sang) ─── */
  const noteBtnClose = document.getElementById('note-btn-close');
  const noteBtnEdit = document.getElementById('note-btn-edit');
  const noteViewBody = document.getElementById('note-view-body');
  const noteEditBody = document.getElementById('note-edit-body');
  const noteDisplayTitle = document.getElementById('note-display-title');
  const noteDisplayContent = document.getElementById('note-display-content');
  const noteDisplayAuthor = document.getElementById('note-display-author');
  const noteDisplayDate = document.getElementById('note-display-date');
  const noteInpTitle = document.getElementById('note-inp-title');
  const noteInpContent = document.getElementById('note-inp-content');
  const noteBtnCancel = document.getElementById('note-btn-cancel');
  const noteBtnSave = document.getElementById('note-btn-save');

  let currentNoteData = {
    title: 'THÔNG TIN & GHI CHÚ',
    content: 'Chào mừng bạn đến với trang cá nhân của DLam Uwa Uwa!\n\nTại đây lưu trữ âm nhạc, hình ảnh, bài viết và những kỷ niệm đẹp.\nTrang web được thiết kế theo phong cách giao diện osu! lazer hiện đại, tối giản và mượt mà.\n\nChúc bạn có những phút giây thư giãn thật tuyệt vời!',
    author: 'DLam Uwa Uwa',
    updatedAt: Date.now()
  };

  function openInfoNote() {
    closeAllRightPanels();
    close(); // đóng left sidebar
    sideBackdrop?.classList.add('open');
    panelInfo?.classList.add('open');

    updateAdminPanelsUI();

    if (noteViewBody) noteViewBody.style.display = 'flex';
    if (noteEditBody) noteEditBody.style.display = 'none';

    loadInfoNote();
  }

  function loadInfoNote() {
    const db = window.LazerApp?.db;
    if (db) {
      db.ref('information_note').on('value', snap => {
        if (snap.exists() && snap.val()) {
          currentNoteData = { ...currentNoteData, ...snap.val() };
        }
        renderInfoNote();
      });
    } else {
      renderInfoNote();
    }
  }

  function renderInfoNote() {
    if (noteDisplayTitle) noteDisplayTitle.textContent = currentNoteData.title || 'THÔNG TIN & GHI CHÚ';
    if (noteDisplayContent) {
      noteDisplayContent.innerHTML = formatPostContent(currentNoteData.content || '');
    }
    if (noteDisplayAuthor) {
      noteDisplayAuthor.textContent = `— ${currentNoteData.author || 'DLam Uwa Uwa'}`;
    }
    if (noteDisplayDate && currentNoteData.updatedAt) {
      const d = new Date(Number(currentNoteData.updatedAt));
      noteDisplayDate.textContent = 'Cập nhật: ' + d.toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  }

  noteBtnEdit?.addEventListener('click', () => {
    if (noteViewBody) noteViewBody.style.display = 'none';
    if (noteEditBody) noteEditBody.style.display = 'flex';
    if (noteInpTitle) noteInpTitle.value = currentNoteData.title || '';
    if (noteInpContent) noteInpContent.value = currentNoteData.content || '';
    setTimeout(() => noteInpContent?.focus(), 100);
  });

  noteBtnCancel?.addEventListener('click', () => {
    if (noteViewBody) noteViewBody.style.display = 'flex';
    if (noteEditBody) noteEditBody.style.display = 'none';
  });

  noteBtnSave?.addEventListener('click', () => {
    const newTitle = noteInpTitle?.value.trim() || 'THÔNG TIN & GHI CHÚ';
    const newContent = noteInpContent?.value.trim() || '';

    currentNoteData.title = newTitle;
    currentNoteData.content = newContent;
    currentNoteData.author = window.LazerApp?.state?.username || 'DLam Uwa Uwa';
    currentNoteData.updatedAt = Date.now();

    const db = window.LazerApp?.db;
    if (db) {
      db.ref('information_note').set(currentNoteData, err => {
        if (err) {
          alert('Lỗi lưu ghi chú: ' + err.message);
        } else {
          showToast('Đã lưu ghi chú thành công!');
        }
      });
    } else {
      showToast('Đã lưu ghi chú cục bộ!');
    }

    if (noteViewBody) noteViewBody.style.display = 'flex';
    if (noteEditBody) noteEditBody.style.display = 'none';
    renderInfoNote();
  });

  noteBtnClose?.addEventListener('click', closeAllRightPanels);

  /* ── 4. Sidebar buttons click dispatcher ───────────────────── */
  document.querySelectorAll('.sb-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const a = btn.dataset.action;
      if (a === 'settings') {
        openAuthModal();
      } else if (a === 'newsfeed') {
        openNewsfeed();
      } else if (a === 'display-mode') {
        showToast('Display Mode: Đang cập nhật tính năng...');
      } else if (a === 'gallery') {
        openGalleryFlow();
      } else if (a === 'information') {
        openInfoNote();
      } else if (a === 'chat') {
        showToast('Kênh Chat: Đang cập nhật thêm...');
      } else if (a === 'create-template') {
        showToast('Tạo một mẫu: Đang cập nhật thêm...');
      } else if (a === 'jukebox') {
        togglePlay();
      } else if (a === 'bg-audio-toggle') {
        window.LazerApp?.toggleAudio();
      }

      if (!btn.classList.contains('no-toggle') && a !== 'jukebox' && a !== 'bg-audio-toggle' && a !== 'settings') {
        document.querySelectorAll('.sb-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
    });
  });

  /* ── Settings overlay & Playlist Manager ───────────────── */
  const ovEl = document.getElementById('lazer-ov');
  const saveBtn = document.getElementById('ov-save');
  const closeOv = document.getElementById('ov-close');
  const clearBg = document.getElementById('ov-clear-bg');

  const ovSongsList = document.getElementById('ov-songs-list');
  const ovSongCount = document.getElementById('ov-song-count');
  const addSongBtn = document.getElementById('btn-add-song-entry');
  const newSongName = document.getElementById('inp-new-song-name');
  const newSongUrl = document.getElementById('inp-new-song-url');
  const newSongCover = document.getElementById('inp-new-song-cover');
  const newSongBg = document.getElementById('inp-new-song-bg');
  const newSongLrc = document.getElementById('inp-new-song-lrc');

  const ovAlbumTabs = document.getElementById('ov-album-tabs');
  const btnAddAlbum = document.getElementById('btn-add-album');
  const btnDelAlbum = document.getElementById('btn-del-album');
  const inpCurAlbumName = document.getElementById('inp-cur-album-name');

  let editingAlbums = [];
  let editingAlbumId = 'default';
  let draggedRowIndex = null;

  function getCurrentEditingAlbum() {
    if (!editingAlbums || editingAlbums.length === 0) {
      editingAlbums = [{
        id: 'default',
        name: 'Album Mặc Định',
        playlist: []
      }];
    }
    let alb = editingAlbums.find(a => a.id === editingAlbumId);
    if (!alb) {
      alb = editingAlbums[0];
      editingAlbumId = alb.id;
    }
    if (!Array.isArray(alb.playlist)) alb.playlist = [];
    return alb;
  }

  function syncRowInputs() {
    if (!ovSongsList) return;
    const curAlb = getCurrentEditingAlbum();
    if (!curAlb || !Array.isArray(curAlb.playlist)) return;

    ovSongsList.querySelectorAll('.ov-song-row').forEach(row => {
      const idx = Number(row.dataset.index);
      if (curAlb.playlist[idx]) {
        const nameVal = row.querySelector('.edit-song-name')?.value;
        const srcVal = row.querySelector('.edit-song-src')?.value;
        const coverVal = row.querySelector('.edit-song-cover')?.value;
        const bgVal = row.querySelector('.edit-song-bg')?.value;
        const lrcVal = row.querySelector('.edit-song-lrc')?.value;
        if (nameVal !== undefined) curAlb.playlist[idx].name = nameVal;
        if (srcVal !== undefined) curAlb.playlist[idx].src = srcVal;
        if (coverVal !== undefined) curAlb.playlist[idx].cover = coverVal;
        if (bgVal !== undefined) curAlb.playlist[idx].bg = bgVal;
        if (lrcVal !== undefined) curAlb.playlist[idx].lrc = lrcVal;
      }
    });
  }

  window.renderOverlayAlbums = function () {
    if (!ovAlbumTabs) return;
    ovAlbumTabs.innerHTML = '';
    const curAlb = getCurrentEditingAlbum();

    editingAlbums.forEach(alb => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'ov-album-tab' + (alb.id === editingAlbumId ? ' active' : '');
      tab.dataset.id = alb.id;
      tab.innerHTML = `
        <span>💿 ${alb.name || 'Album'}</span>
        <span class="ov-album-tab-count">${alb.playlist ? alb.playlist.length : 0}</span>
      `;
      tab.addEventListener('click', () => {
        if (alb.id !== editingAlbumId) {
          syncRowInputs();
          editingAlbumId = alb.id;
          renderOverlayAlbums();
          renderOverlayPlaylist();
        }
      });
      ovAlbumTabs.appendChild(tab);
    });

    if (inpCurAlbumName) {
      inpCurAlbumName.value = curAlb.name || '';
    }
  };

  inpCurAlbumName?.addEventListener('input', () => {
    const curAlb = getCurrentEditingAlbum();
    curAlb.name = inpCurAlbumName.value.trim() || 'Album';
    const activeTabSpan = ovAlbumTabs?.querySelector(`.ov-album-tab[data-id="${editingAlbumId}"] span:first-child`);
    if (activeTabSpan) {
      activeTabSpan.textContent = `💿 ${curAlb.name}`;
    }
  });

  btnAddAlbum?.addEventListener('click', () => {
    syncRowInputs();
    const newName = prompt('Nhập tên Album mới:', `Album ${editingAlbums.length + 1}`);
    if (!newName || !newName.trim()) return;
    const newId = 'album_' + Date.now();
    editingAlbums.push({
      id: newId,
      name: newName.trim(),
      playlist: []
    });
    editingAlbumId = newId;
    renderOverlayAlbums();
    renderOverlayPlaylist();
    if (inpCurAlbumName) inpCurAlbumName.focus();
  });

  btnDelAlbum?.addEventListener('click', () => {
    if (editingAlbums.length <= 1) {
      alert('Bạn phải giữ lại ít nhất 1 Album nhạc!');
      return;
    }
    const curAlb = getCurrentEditingAlbum();
    if (!confirm(`Bạn có chắc chắn muốn xóa Album "${curAlb.name}" cùng tất cả bài hát bên trong không?`)) {
      return;
    }
    const delIdx = editingAlbums.findIndex(a => a.id === editingAlbumId);
    if (delIdx !== -1) {
      editingAlbums.splice(delIdx, 1);
      editingAlbumId = editingAlbums[Math.max(0, delIdx - 1)].id;
      renderOverlayAlbums();
      renderOverlayPlaylist();
    }
  });

  function initOverlayPlaylist() {
    const appAlbums = (window.LazerApp && window.LazerApp.state && window.LazerApp.state.albums) || [];
    if (appAlbums.length > 0) {
      editingAlbums = JSON.parse(JSON.stringify(appAlbums));
    } else {
      editingAlbums = [{
        id: 'default',
        name: 'Album Mặc Định',
        playlist: getPlaylist().map(item => ({
          name: item.name || '',
          src: item.src || '',
          cover: item.cover || '',
          bg: item.bg || '',
          lrc: item.lrc || ''
        }))
      }];
    }
    editingAlbumId = window.LazerApp?.state?.currentAlbumId || editingAlbums[0].id;
    renderOverlayAlbums();
    renderOverlayPlaylist();
  }

  function renderOverlayPlaylist() {
    if (!ovSongsList) return;
    ovSongsList.innerHTML = '';
    const curAlb = getCurrentEditingAlbum();
    const playlist = curAlb.playlist || [];

    if (ovSongCount) ovSongCount.textContent = playlist.length;
    const tabSongCount = document.getElementById('ov-tab-song-count');
    if (tabSongCount) tabSongCount.textContent = playlist.length;

    const countBadge = ovAlbumTabs?.querySelector(`.ov-album-tab[data-id="${editingAlbumId}"] .ov-album-tab-count`);
    if (countBadge) countBadge.textContent = playlist.length;

    playlist.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'ov-song-row';
      row.dataset.index = index;
      row.draggable = true;
      row.innerHTML = `
        <div class="ov-song-order-col">
          <span class="ov-drag-handle" title="Kéo thả để sắp xếp thứ tự phát bài">
            <svg viewBox="0 0 24 24"><path d="M9 3H7v2h2V3zm0 4H7v2h2V7zm0 4H7v2h2v-2zm0 4H7v2h2v-2zm0 4H7v2h2v-2zm8-16h-2v2h2V3zm0 4h-2v2h2V7zm0 4h-2v2h2v-2zm0 4h-2v2h2v-2zm0 4h-2v2h2v-2z"/></svg>
          </span>
          <span class="ov-order-badge" title="Thứ tự phát: #${index + 1}">#${index + 1}</span>
          <div class="ov-shift-btns">
            <button type="button" class="ov-shift-btn ov-btn-up" title="Đẩy bài lên trên" ${index === 0 ? 'disabled' : ''}>▲</button>
            <button type="button" class="ov-shift-btn ov-btn-down" title="Đẩy bài xuống dưới" ${index === playlist.length - 1 ? 'disabled' : ''}>▼</button>
          </div>
        </div>
        <img class="ov-song-thumb" src="${item.cover || '_backup_media/s4.jpg'}" alt="cover" onerror="this.src='_backup_media/s4.jpg'">
        <div class="ov-song-fields">
          <input type="text" class="ov-input edit-song-name" value="${item.name || ''}" placeholder="Tên bài hát" title="${item.name || ''}">
          <input type="text" class="ov-input edit-song-src" value="${item.src || ''}" placeholder="Link nhạc .mp3" title="${item.src || ''}">
          <input type="text" class="ov-input edit-song-cover" value="${item.cover || ''}" placeholder="Link ảnh bìa" title="${item.cover || ''}">
          <input type="text" class="ov-input edit-song-bg" value="${item.bg || ''}" placeholder="Link Background riêng" title="${item.bg || ''}">
          <input type="text" class="ov-input edit-song-lrc" value="${item.lrc || ''}" placeholder="Link file .lrc lyric" title="${item.lrc || ''}">
        </div>
        <button type="button" class="ov-song-del-btn" title="Xóa bài hát khỏi danh sách">
          <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
        </button>
      `;

      const nameInp = row.querySelector('.edit-song-name');
      const srcInp = row.querySelector('.edit-song-src');
      const coverInp = row.querySelector('.edit-song-cover');
      const bgInp = row.querySelector('.edit-song-bg');
      const lrcInp = row.querySelector('.edit-song-lrc');
      const thumb = row.querySelector('.ov-song-thumb');

      nameInp?.addEventListener('input', () => { playlist[index].name = nameInp.value; nameInp.title = nameInp.value; });
      srcInp?.addEventListener('input', () => { playlist[index].src = srcInp.value; srcInp.title = srcInp.value; });
      coverInp?.addEventListener('input', () => {
        const val = coverInp.value.trim();
        playlist[index].cover = val;
        coverInp.title = val;
        if (thumb) thumb.src = val || '_backup_media/s4.jpg';
      });
      bgInp?.addEventListener('input', () => { playlist[index].bg = bgInp.value; bgInp.title = bgInp.value; });
      lrcInp?.addEventListener('input', () => { playlist[index].lrc = lrcInp.value; lrcInp.title = lrcInp.value; });

      // Nút đẩy lên / xuống
      row.querySelector('.ov-btn-up')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (index > 0) {
          syncRowInputs();
          const tmp = playlist[index];
          playlist[index] = playlist[index - 1];
          playlist[index - 1] = tmp;
          renderOverlayPlaylist();
        }
      });

      row.querySelector('.ov-btn-down')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (index < playlist.length - 1) {
          syncRowInputs();
          const tmp = playlist[index];
          playlist[index] = playlist[index + 1];
          playlist[index + 1] = tmp;
          renderOverlayPlaylist();
        }
      });

      // Nút xóa bài
      row.querySelector('.ov-song-del-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        syncRowInputs();
        playlist.splice(index, 1);
        renderOverlayPlaylist();
      });

      // Kéo thả bài hát (HTML5 Drag and Drop)
      row.addEventListener('dragstart', (e) => {
        if (e.target.tagName === 'INPUT') {
          e.preventDefault();
          return;
        }
        syncRowInputs();
        draggedRowIndex = index;
        row.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
      });

      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (draggedRowIndex !== null && draggedRowIndex !== index) {
          row.classList.add('drag-over');
        }
      });

      row.addEventListener('dragleave', () => {
        row.classList.remove('drag-over');
      });

      row.addEventListener('drop', (e) => {
        e.preventDefault();
        row.classList.remove('drag-over');
        if (draggedRowIndex !== null && draggedRowIndex !== index) {
          syncRowInputs();
          const itemToMove = playlist.splice(draggedRowIndex, 1)[0];
          playlist.splice(index, 0, itemToMove);
          draggedRowIndex = null;
          renderOverlayPlaylist();
        }
      });

      row.addEventListener('dragend', () => {
        draggedRowIndex = null;
        document.querySelectorAll('.ov-song-row').forEach(r => {
          r.classList.remove('dragging', 'drag-over');
        });
      });

      ovSongsList.appendChild(row);
    });
  }

  // Thêm bài hát mới vào danh sách
  addSongBtn?.addEventListener('click', () => {
    syncRowInputs();
    const curAlb = getCurrentEditingAlbum();
    if (!curAlb) return;
    if (!Array.isArray(curAlb.playlist)) curAlb.playlist = [];

    const name = newSongName?.value.trim() || '';
    const src = newSongUrl?.value.trim() || '';
    const cover = newSongCover?.value.trim() || '';
    const bg = newSongBg?.value.trim() || '';
    const lrc = newSongLrc?.value.trim() || '';

    if (!src && !name && !bg) {
      alert('Vui lòng nhập ít nhất Tên bài hát và Link nhạc hoặc Link Background!');
      return;
    }

    // Nếu không điền link mp3 mà có link background thì dùng nhạc từ background
    const finalSrc = src || bg;

    curAlb.playlist.unshift({
      name: name || 'Bài hát mới',
      src: finalSrc,
      cover: cover || '_backup_media/s4.jpg',
      bg: bg,
      lrc: lrc
    });

    if (newSongName) newSongName.value = '';
    if (newSongUrl) newSongUrl.value = '';
    if (newSongCover) newSongCover.value = '';
    if (newSongBg) newSongBg.value = '';
    if (newSongLrc) newSongLrc.value = '';

    renderOverlayPlaylist();
    if (ovSongsList) ovSongsList.scrollTop = 0;
  });

  function populateSettingsInputs() {
    if (!window.LazerApp) return;
    const inpBg = document.getElementById('inp-bg');
    if (inpBg) {
      inpBg.value = window.LazerApp.state.backgroundUrl || '';
    }
    const inpName = document.getElementById('inp-name');
    if (inpName) {
      inpName.value = window.LazerApp.state.username || '';
    }
    const inpAvatar = document.getElementById('inp-avatar');
    if (inpAvatar) {
      inpAvatar.value = window.LazerApp.state.avatarUrl || '';
    }
    const avPrev = document.getElementById('ov-avatar-preview');
    if (avPrev) {
      avPrev.src = window.LazerApp.state.avatarUrl || '_backup_media/ava1.png';
    }
    const audToggle = document.getElementById('inp-audio-toggle');
    if (audToggle) {
      audToggle.checked = !!window.LazerApp.state.audioEnabled;
    }
    const volSlider = document.getElementById('inp-volume');
    const volText = document.getElementById('vol-text');
    if (volSlider) {
      volSlider.value = window.LazerApp.state.audioVolume || 80;
    }
    if (volText) {
      volText.textContent = (window.LazerApp.state.audioVolume || 80) + '%';
    }
    const tabSongCount = document.getElementById('ov-tab-song-count');
    if (tabSongCount) {
      tabSongCount.textContent = (window.LazerApp.state.playlist || []).length;
    }
  }

  function toggleOv() {
    ovEl?.classList.toggle('open');
    close();
    if (ovEl?.classList.contains('open')) {
      populateSettingsInputs();
      initOverlayPlaylist();
      renderVisitorAnalyticsTable();
      renderVisitorAnalyticsStats();
    }
  }

  /* ── Tab Switching ── */
  document.querySelectorAll('.ov-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.tab;
      document.querySelectorAll('.ov-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.ov-tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const pane = document.getElementById(targetId);
      if (pane) pane.classList.add('active');
      if (targetId === 'tab-analytics') {
        renderVisitorAnalyticsTable();
        renderVisitorAnalyticsStats();
      }
    });
  });

  /* ── Xem thử Background ── */
  const btnTestBg = document.getElementById('btn-test-bg');
  const bgPreviewWrap = document.getElementById('ov-bg-preview-wrap');
  const bgPreviewVid = document.getElementById('ov-preview-video');
  const bgPreviewImg = document.getElementById('ov-preview-img');

  btnTestBg?.addEventListener('click', async () => {
    const raw = document.getElementById('inp-bg')?.value.trim() || '';
    if (!raw) {
      if (bgPreviewWrap) bgPreviewWrap.style.display = 'none';
      alert('Vui lòng nhập link video hoặc ảnh vào ô trên để xem thử!');
      return;
    }
    const resolved = window.resolveMediaUrl ? await window.resolveMediaUrl(raw) : raw;
    const isVideo = /\.(mp4|webm|mov)(\?.*)?$/i.test(resolved) || resolved.includes('gofile.io/download') || resolved.includes('/video');
    if (bgPreviewWrap) bgPreviewWrap.style.display = 'block';
    if (isVideo) {
      if (bgPreviewImg) bgPreviewImg.style.display = 'none';
      if (bgPreviewVid) {
        bgPreviewVid.style.display = 'block';
        bgPreviewVid.src = resolved;
        bgPreviewVid.load();
        bgPreviewVid.play().catch(() => { });
      }
    } else {
      if (bgPreviewVid) { bgPreviewVid.pause(); bgPreviewVid.style.display = 'none'; }
      if (bgPreviewImg) {
        bgPreviewImg.style.display = 'block';
        bgPreviewImg.src = resolved;
      }
    }
  });

  /* ── Live Avatar Preview ── */
  const inpAvatar = document.getElementById('inp-avatar');
  const avPrev = document.getElementById('ov-avatar-preview');
  inpAvatar?.addEventListener('input', () => {
    const val = inpAvatar.value.trim();
    if (avPrev) {
      avPrev.src = val || '_backup_media/ava1.png';
    }
  });

  document.getElementById('floating-profile')?.addEventListener('click', openAuthModal);
  closeOv?.addEventListener('click', () => ovEl?.classList.remove('open'));
  document.getElementById('ov-close-x')?.addEventListener('click', () => ovEl?.classList.remove('open'));
  ovEl?.addEventListener('click', e => {
    if (e.target === ovEl) ovEl.classList.remove('open');
  });

  // Live volume slider listener
  const volSlider = document.getElementById('inp-volume');
  const volText = document.getElementById('vol-text');
  if (volSlider) {
    volSlider.addEventListener('input', () => {
      const v = Number(volSlider.value);
      if (volText) volText.textContent = v + '%';
      if (window.LazerApp) {
        window.LazerApp.state.audioVolume = v;
        window.LazerApp.applyAudio();
      }
    });
  }

  // Live audio toggle listener
  const audioToggle = document.getElementById('inp-audio-toggle');
  if (audioToggle) {
    audioToggle.addEventListener('change', () => {
      if (window.LazerApp) {
        window.LazerApp.state.audioEnabled = audioToggle.checked;
        window.LazerApp.applyAudio();
        window.LazerApp.updateAudioUI();
      }
    });
  }

  clearBg?.addEventListener('click', () => {
    const inp = document.getElementById('inp-bg');
    if (inp) inp.value = '';
    if (bgPreviewWrap) bgPreviewWrap.style.display = 'none';
    syncRowInputs();
    window.LazerApp?.save('', window.LazerApp.state.username, window.LazerApp.state.avatarUrl, window.LazerApp.state.audioEnabled, window.LazerApp.state.audioVolume, editingAlbums, editingAlbumId);
    ovEl?.classList.remove('open');
  });

  saveBtn?.addEventListener('click', () => {
    const bg = document.getElementById('inp-bg')?.value.trim() || '';
    const nm = document.getElementById('inp-name')?.value.trim() || '';
    const av = document.getElementById('inp-avatar')?.value.trim() || '';
    const audOn = document.getElementById('inp-audio-toggle')?.checked || false;
    const vol = Number(document.getElementById('inp-volume')?.value) || 80;

    syncRowInputs();

    // Lọc sạch bài hát hợp lệ cho từng album
    const cleanedAlbums = editingAlbums.map(alb => ({
      id: alb.id,
      name: alb.name || 'Album',
      playlist: (alb.playlist || []).filter(t => t.name || t.src || t.bg).map(t => ({
        name: t.name || 'Bài hát',
        src: t.src || t.bg || '',
        cover: t.cover || '_backup_media/s4.jpg',
        bg: t.bg || '',
        lrc: t.lrc || ''
      }))
    }));

    window.LazerApp?.save(bg, nm, av, audOn, vol, cleanedAlbums, editingAlbumId);

    // Cập nhật lại UI sau khi lưu
    setTimeout(() => {
      if (window.renderAlbumSelect) window.renderAlbumSelect();
      if (window.renderMusicPlaylist) window.renderMusicPlaylist();
      const curList = getPlaylist();
      if (curList.length > 0) {
        loadTrack(0, false);
      }
    }, 200);

    ovEl?.classList.remove('open');
  });

  /* ── Visitor IP & Market Analytics Controller (Admin) ────── */
  let cachedVisitors = [];

  function initVisitorAnalytics() {
    const rtdb = (typeof db !== 'undefined' && db) ? db : (window.firebase ? firebase.database() : null);
    if (!rtdb) return;

    // Realtime listener for visitors list
    rtdb.ref('analytics/visitors').on('value', snap => {
      const data = snap.val() || {};
      cachedVisitors = Object.values(data);
      // Sắp xếp người mới nhất lên đầu
      cachedVisitors.sort((a, b) => (b.lastVisit || 0) - (a.lastVisit || 0));

      const countEl = document.getElementById('ov-tab-ip-count');
      if (countEl) countEl.textContent = cachedVisitors.length;

      renderVisitorAnalyticsTable();
      renderVisitorAnalyticsStats();
    });

    // Tìm kiếm / Lọc danh sách IP
    const searchInp = document.getElementById('inp-search-ip');
    searchInp?.addEventListener('input', () => {
      renderVisitorAnalyticsTable();
    });

    // Nút làm mới dữ liệu
    const refreshBtn = document.getElementById('btn-refresh-ips');
    refreshBtn?.addEventListener('click', () => {
      rtdb.ref('analytics/visitors').once('value', snap => {
        const data = snap.val() || {};
        cachedVisitors = Object.values(data);
        cachedVisitors.sort((a, b) => (b.lastVisit || 0) - (a.lastVisit || 0));
        renderVisitorAnalyticsTable();
        renderVisitorAnalyticsStats();
        if (window.showToast) window.showToast('Đã làm mới danh sách IP!');
        else alert('Đã làm mới danh sách IP!');
      });
    });

    // Nút xóa toàn bộ lịch sử IP
    const clearBtn = document.getElementById('btn-clear-ips');
    clearBtn?.addEventListener('click', async () => {
      const pwd = prompt('Nhập mật khẩu Admin để xác nhận xóa toàn bộ danh sách IP:');
      if (pwd === null) return;
      if (window.LazerApp && window.LazerApp.verifyPassword(pwd)) {
        try {
          await rtdb.ref('analytics/visitors').remove();
          cachedVisitors = [];
          renderVisitorAnalyticsTable();
          renderVisitorAnalyticsStats();
          if (window.showToast) window.showToast('Đã xóa sạch lịch sử IP!');
          else alert('Đã xóa sạch lịch sử IP!');
        } catch (e) {
          alert('Lỗi khi xóa: ' + e.message);
        }
      } else {
        alert('Mật khẩu Admin không chính xác!');
      }
    });
  }

  function renderVisitorAnalyticsStats() {
    const totalUniqueEl = document.getElementById('ip-stat-unique');
    const totalHitsEl = document.getElementById('ip-stat-hits');
    const topLocEl = document.getElementById('ip-stat-top-loc');
    const topLocSubEl = document.getElementById('ip-stat-top-loc-sub');
    const deviceRatioEl = document.getElementById('ip-stat-device');

    if (!totalUniqueEl) return;

    const totalUnique = cachedVisitors.length;
    let totalHits = 0;
    let mobileCount = 0;
    const regionCount = {};

    cachedVisitors.forEach(v => {
      const hits = Number(v.visitCount) || 1;
      totalHits += hits;
      if (v.device === 'Mobile' || v.device === 'Điện thoại') {
        mobileCount++;
      }
      const locKey = (v.city && v.city !== 'Không rõ') ? v.city : (v.region || v.country || 'Khác');
      regionCount[locKey] = (regionCount[locKey] || 0) + hits;
    });

    totalUniqueEl.textContent = totalUnique.toLocaleString('vi-VN');
    totalHitsEl.textContent = totalHits.toLocaleString('vi-VN');

    // Tìm thị trường đứng đầu
    let topRegion = 'Chưa có';
    let maxHits = 0;
    for (const [r, cnt] of Object.entries(regionCount)) {
      if (cnt > maxHits) {
        maxHits = cnt;
        topRegion = r;
      }
    }
    if (topRegion !== 'Chưa có') {
      topLocEl.textContent = `${topRegion} (${maxHits} lượt)`;
      if (topLocSubEl) topLocSubEl.textContent = 'Khu vực có lượng truy cập nhiều nhất';
    } else {
      topLocEl.textContent = 'Chưa có dữ liệu';
    }

    // Tỉ lệ thiết bị
    if (totalUnique > 0) {
      const mobPct = Math.round((mobileCount / totalUnique) * 100);
      const pcPct = 100 - mobPct;
      deviceRatioEl.textContent = `💻 PC: ${pcPct}% | 📱 Mobile: ${mobPct}%`;
    } else {
      deviceRatioEl.textContent = 'PC: 0% | Mobile: 0%';
    }
  }

  function renderVisitorAnalyticsTable() {
    const tbody = document.getElementById('ov-ip-table-body');
    if (!tbody) return;

    const q = (document.getElementById('inp-search-ip')?.value || '').toLowerCase().trim();
    const filtered = cachedVisitors.filter(v => {
      if (!q) return true;
      return (
        (v.ip && v.ip.toLowerCase().includes(q)) ||
        (v.deviceId && v.deviceId.toLowerCase().includes(q)) ||
        (v.shortId && v.shortId.toLowerCase().includes(q)) ||
        (v.deviceOs && v.deviceOs.toLowerCase().includes(q)) ||
        (v.browser && v.browser.toLowerCase().includes(q)) ||
        (v.city && v.city.toLowerCase().includes(q)) ||
        (v.region && v.region.toLowerCase().includes(q)) ||
        (v.country && v.country.toLowerCase().includes(q)) ||
        (v.isp && v.isp.toLowerCase().includes(q))
      );
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="ov-ip-empty">${cachedVisitors.length === 0 ? 'Chưa có máy nào truy cập.' : 'Không tìm thấy máy/IP nào khớp với từ khóa tìm kiếm.'}</td></tr>`;
      return;
    }

    let html = '';
    filtered.forEach((v, idx) => {
      const flag = v.flag || '🌐';
      const city = v.city || 'Không rõ';
      const region = v.region || '';
      const country = v.country || 'Việt Nam';
      const locDisplay = `${flag} ${city}${region && region !== city ? ', ' + region : ''} (${country})`;

      const isMobile = v.deviceType === 'Mobile' || v.device === 'Mobile' || v.device === 'Điện thoại';
      const devIcon = v.deviceIcon || (isMobile ? '📱' : '💻');
      const devOs = v.deviceOs || v.device || (isMobile ? 'Mobile' : 'PC');
      const shortId = v.shortId || (v.deviceId ? v.deviceId.replace('dev_', '').slice(0, 6).toUpperCase() : 'DEVICE');

      const timeText = v.lastVisitTime || (v.lastVisit ? new Date(v.lastVisit).toLocaleString('vi-VN') : 'Mới đây');

      // Link Google Maps để khảo sát địa điểm
      let mapUrl = '';
      if (v.latitude && v.longitude) {
        mapUrl = `https://www.google.com/maps?q=${v.latitude},${v.longitude}`;
      } else if (v.city && v.city !== 'Không rõ') {
        mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.city + ', ' + country)}`;
      }

      const mapBtn = mapUrl
        ? `<a href="${mapUrl}" target="_blank" rel="noopener noreferrer" class="ip-map-link" title="Xem vị trí ước tính trên Google Maps">📍 Bản đồ</a>`
        : `<span style="color:var(--lazer-text-muted); font-size:11px;">--</span>`;

      html += `
        <tr>
          <td style="color:var(--lazer-text-muted); font-size:12px;">${idx + 1}</td>
          <td>
            <div class="dev-cell">
              <div class="dev-name">${devIcon} ${devOs}</div>
              <div class="dev-meta">
                <span class="dev-id-tag" title="Mã định danh máy duy nhất">#${shortId}</span>
                ${v.browser ? `<span class="dev-browser-tag">${v.browser}</span>` : ''}
                ${v.screen ? `<span class="dev-screen-tag">${v.screen}</span>` : ''}
              </div>
            </div>
          </td>
          <td>
            <div class="ip-cell">
              <span class="ip-text">${v.ip || '---'}</span>
              <span class="ip-public-badge">Public IP</span>
            </div>
          </td>
          <td>
            <div class="ip-location-col" title="${city}, ${region}, ${country}">
              ${locDisplay}
            </div>
          </td>
          <td>
            <span class="ip-isp-text" title="${v.isp || ''}">${v.isp || 'Không rõ'}</span>
          </td>
          <td style="text-align: center;"><span class="ip-hits-badge">${v.visitCount || 1}</span></td>
          <td style="font-size:12px; color:var(--lazer-text-muted);">${timeText}</td>
          <td style="text-align: center;">${mapBtn}</td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }

  // Khởi chạy bộ lắng nghe IP Analytics
  initVisitorAnalytics();

  /* ── FPS counter ───────────────────────────────────────── */
  const fpsV = document.getElementById('fps-val');
  const fpsM = document.getElementById('fps-ms');
  const fpsF = document.querySelector('.fps-fill');
  let last = performance.now(), cnt = 0, fps = 60, dt = 16.6;

  (function loop() {
    const now = performance.now();
    dt = now - last; last = now; cnt++;
    if (cnt % 15 === 0 && dt > 0) {
      fps = Math.round(1000 / dt);
      if (fpsV) fpsV.textContent = fps + ' fps';
      if (fpsM) fpsM.textContent = dt.toFixed(1) + ' ms';
      const c = fps >= 60 ? '--lazer-green' : fps >= 30 ? '--lazer-yellow' : '--lazer-red';
      if (fpsF) fpsF.style.background = `var(${c})`;
      if (fpsV) fpsV.style.color = `var(${c})`;
    }
    requestAnimationFrame(loop);
  })();
});
