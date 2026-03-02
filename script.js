// ✅ 예식 날짜/시간 (KST)
const WEDDING_ISO_KST = "2026-05-17T15:00:00+09:00";

// ✅ 카카오맵 RoughMap (사용자가 공유해준 값)
const KAKAO_ROUGHMAP = {
  timestamp: "1772109912536",
  key: "ife62pktwsq",
};

// ✅ Firebase 설정 (아래는 반드시 너의 값으로 교체해야 게시판이 동작해요)
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyA7XXEdrdKCKm_-ZwBy1nk10xZMPDCH3ww",
  authDomain: "wedding-ae80b.firebaseapp.com",
  projectId: "wedding-ae80b",
  appId: "1:1007496471653:web:cac00eedf8d6f6b659128c",
};

// ✅ 관리자 이메일(삭제 권한용: 보안 규칙에도 동일 이메일을 넣는 걸 권장)
const GUESTBOOK_ADMIN_EMAIL = "bright.blackstar@gmail.com";

/**
 * ✅ 페이지 확대 방지(최대한)
 */
(function preventPageZoom() {
  const prevent = (e) => e.preventDefault();
  document.addEventListener("gesturestart", prevent, { passive: false });
  document.addEventListener("gesturechange", prevent, { passive: false });
  document.addEventListener("gestureend", prevent, { passive: false });

  let lastTouchEnd = 0;
  document.addEventListener("touchend", function (e) {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });
})();

/* ✅ D-day (첫 화면 한 줄) */
function calcDdayDaysLocal() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(2026, 4, 17); // 2026-05-17
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function updateHeroDday() {
  const el = document.getElementById("heroDday");
  if (!el) return;

  const days = calcDdayDaysLocal();
  if (days > 0) el.textContent = `D-${days}`;
  else if (days === 0) el.textContent = `D-DAY`;
  else el.textContent = `D+${Math.abs(days)}`;
}

/* ✅ Toast */
function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  window.clearTimeout(showToast._timer);
  showToast._timer = window.setTimeout(() => t.classList.remove("show"), 1400);
}

/* ✅ Copy(계좌) */
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {}

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (_) {
    return false;
  }
}

function bindCopyButtons() {
  document.querySelectorAll(".copyBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const text = btn.getAttribute("data-copy") || "";
      const ok = await copyText(text);
      showToast(ok ? "복사했습니다" : "복사에 실패했어요");
    });
  });
}

/* ✅ 카카오 RoughMap 미리보기 */
function loadScriptOnce(src, id) {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.id = id;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("script load failed"));
    document.head.appendChild(s);
  });
}

async function renderKakaoRoughMap() {
  const host = document.getElementById("kakaoMapEmbed");
  const fallback = document.querySelector(".mapBox__fallback");
  if (!host) return;

  const { timestamp, key } = KAKAO_ROUGHMAP;

  if (!timestamp || !key) {
    if (fallback) fallback.style.display = "flex";
    return;
  }

  try {
    await loadScriptOnce(
      "https://ssl.daumcdn.net/dmaps/map_js_init/roughmapLoader.js",
      "kakaoRoughmapLoader"
    );

    const containerId = `daumRoughmapContainer${timestamp}`;
    host.innerHTML = `<div id="${containerId}" class="root_daum_roughmap root_daum_roughmap_landing"></div>`;

    const w = host.clientWidth || 300;
    const h = host.clientHeight || Math.round(w * 4 / 5);

    // eslint-disable-next-line no-undef
    new daum.roughmap.Lander({
      timestamp: String(timestamp),
      key: String(key),
      mapWidth: String(w),
      mapHeight: String(h),
    }).render();

    if (fallback) fallback.style.display = "none";
  } catch (e) {
    if (fallback) fallback.style.display = "flex";
  }
}

/* ✅ 갤러리 모달 */
function bindGalleryModal() {
  const modal = document.getElementById("modal");
  const scroller = document.getElementById("modalScroller");
  const bg = document.getElementById("modalBg");
  const closeBtn = document.getElementById("modalClose");
  const counterEl = document.getElementById("modalCounter");

  if (!modal || !scroller || !bg || !closeBtn || !counterEl) return;

  const thumbs = Array.from(document.querySelectorAll(".gimg"));
  const images = thumbs.map(b => b.getAttribute("data-full")).filter(Boolean);
  if (images.length === 0) return;

  scroller.innerHTML = images.map((src, i) => {
    const alt = `갤러리 ${i + 1}`;
    return `
      <div class="modal__slide">
        <img src="${src}" alt="${alt}" draggable="false" decoding="async" />
      </div>
    `;
  }).join("");

  let isOpen = false;
  let currentIndex = 0;
  let startIndex = 0;
  let startLeft = 0;

  const clamp = (n) => Math.max(0, Math.min(images.length - 1, n));

  const updateCounter = () => {
    counterEl.textContent = `${currentIndex + 1} / ${images.length}`;
  };

  const replaceState = () => {
    if (history.state && history.state.__modal) {
      history.replaceState({ __modal: true, idx: currentIndex }, "");
    }
  };

  const scrollToIndex = (idx, behavior = "auto") => {
    currentIndex = clamp(idx);
    updateCounter();
    replaceState();
    const w = scroller.clientWidth || 1;
    scroller.scrollTo({ left: w * currentIndex, behavior });
  };

  const openAt = (idx, { pushHistory = true } = {}) => {
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    isOpen = true;

    currentIndex = clamp(idx);
    updateCounter();

    const st = { __modal: true, idx: currentIndex };
    if (pushHistory) {
      if (history.state && history.state.__modal) history.replaceState(st, "");
      else history.pushState(st, "");
    } else {
      history.replaceState(st, "");
    }

    requestAnimationFrame(() => scrollToIndex(currentIndex, "auto"));
  };

  const closeModal = () => {
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    isOpen = false;
  };

  const requestCloseWithBack = () => {
    if (history.state && history.state.__modal) history.back();
    else closeModal();
  };

  thumbs.forEach((b, fallbackIdx) => {
    b.addEventListener("click", () => {
      const idxAttr = b.getAttribute("data-index");
      const idx = Number.isFinite(Number(idxAttr)) ? Number(idxAttr) : fallbackIdx;
      openAt(idx, { pushHistory: true });
    });
  });

  bg.addEventListener("click", requestCloseWithBack);
  closeBtn.addEventListener("click", requestCloseWithBack);

  scroller.addEventListener("touchstart", () => {
    if (!isOpen) return;
    startIndex = currentIndex;
    startLeft = scroller.scrollLeft;
  }, { passive: true });

  scroller.addEventListener("touchend", () => {
    if (!isOpen) return;
    const w = scroller.clientWidth || 1;
    const delta = scroller.scrollLeft - startLeft;
    const threshold = w * 0.26;

    let target = startIndex;
    if (delta > threshold) target = startIndex + 1;
    else if (delta < -threshold) target = startIndex - 1;

    target = clamp(target);
    scrollToIndex(target, "smooth");
  }, { passive: true });

  let raf = 0;
  scroller.addEventListener("scroll", () => {
    if (!isOpen) return;
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const w = scroller.clientWidth || 1;
      const idx = clamp(Math.round(scroller.scrollLeft / w));
      if (idx !== currentIndex) {
        currentIndex = idx;
        updateCounter();
      }
    });
  }, { passive: true });

  window.addEventListener("resize", () => {
    if (!isOpen) return;
    requestAnimationFrame(() => scrollToIndex(currentIndex, "auto"));
  });

  window.addEventListener("popstate", (e) => {
    const st = e.state;
    if (st && st.__modal && typeof st.idx === "number") {
      if (!isOpen) openAt(st.idx, { pushHistory: false });
      else scrollToIndex(st.idx, "auto");
    } else {
      if (isOpen) closeModal();
    }
  });
}

/* ✅ 게시판(Firebase) */
function isFirebaseConfigured() {
  const v = FIREBASE_CONFIG;
  if (!v) return false;
  const vals = [v.apiKey, v.authDomain, v.projectId, v.appId];
  if (vals.some(x => !x || String(x).includes("YOUR_"))) return false;
  if (!GUESTBOOK_ADMIN_EMAIL || GUESTBOOK_ADMIN_EMAIL.includes("YOUR_")) return false;
  return true;
}

function bindGuestbook() {
  const form = document.getElementById("gbForm");
  const nameEl = document.getElementById("gbName");
  const msgEl = document.getElementById("gbMsg");
  const listEl = document.getElementById("gbList");

  const adminEmailEl = document.getElementById("adminEmail");
  const adminPassEl = document.getElementById("adminPassword");
  const loginBtn = document.getElementById("adminLogin");
  const logoutBtn = document.getElementById("adminLogout");

  if (!form || !nameEl || !msgEl || !listEl || !loginBtn || !logoutBtn) return;

  // 설정 안내
  if (!window.firebase || !isFirebaseConfigured()) {
    listEl.innerHTML = `
      <div class="gbItem">
        <div class="gbMsg">
          게시판 기능은 <strong>설정 중</strong>입니다.<br/>
          (Firebase 설정값을 script.js의 FIREBASE_CONFIG에 넣으면 활성화됩니다.)
        </div>
      </div>
    `;
    // 입력은 막아두는 게 혼란이 적음
    form.querySelector("button[type='submit']").disabled = true;
    form.querySelector("button[type='submit']").style.opacity = "0.5";
    return;
  }

  // Firebase init (중복 방지)
  const app = firebase.apps && firebase.apps.length ? firebase.app() : firebase.initializeApp(FIREBASE_CONFIG);
  const db = firebase.firestore();
  const auth = firebase.auth();

  let isAdmin = false;
  let lastDocs = []; // {id,data}

  const fmt = (d) => {
    if (!d) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}.${mm}.${dd}`;
  };

  const render = () => {
    if (lastDocs.length === 0) {
      listEl.innerHTML = `
        <div class="gbItem">
          <div class="gbMsg">아직 작성된 글이 없어요. 첫 축하글을 남겨주세요 💐</div>
        </div>
      `;
      return;
    }

    listEl.innerHTML = lastDocs.map(({ id, data }) => {
      const name = (data.name || "").toString();
      const msg = (data.message || "").toString();
      let dateStr = "";
      const c = data.createdAt;
      if (c && typeof c.toDate === "function") dateStr = fmt(c.toDate());
      else if (typeof c === "number") dateStr = fmt(new Date(c));

      return `
        <div class="gbItem">
          <div class="gbHead">
            <div>
              <span class="gbName">${escapeHtml(name)}</span>
              <span class="gbTime"> ${dateStr ? "· " + dateStr : ""}</span>
            </div>
            ${isAdmin ? `<button class="gbDelete" data-id="${id}" type="button">삭제</button>` : ``}
          </div>
          <div class="gbMsg">${escapeHtml(msg)}</div>
        </div>
      `;
    }).join("");

    if (isAdmin) {
      listEl.querySelectorAll(".gbDelete").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id");
          if (!id) return;
          try {
            await db.collection("guestbook").doc(id).delete();
            showToast("삭제했습니다");
          } catch (e) {
            showToast("삭제 실패");
          }
        });
      });
    }
  };

  // 실시간 구독
  db.collection("guestbook")
    .orderBy("createdAt", "desc")
    .limit(60)
    .onSnapshot((snap) => {
      lastDocs = snap.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
      render();
    });

  // 작성
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = nameEl.value.trim();
    const message = msgEl.value.trim();

    if (!name || !message) return;
    if (name.length > 12 || message.length > 60) return;

    try {
      await db.collection("guestbook").add({
        name,
        message,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      nameEl.value = "";
      msgEl.value = "";
      showToast("남겼습니다");
    } catch (err) {
      showToast("등록 실패");
    }
  });

  // 관리자 로그인/로그아웃
  auth.onAuthStateChanged((user) => {
    isAdmin = !!(user && user.email && user.email.toLowerCase() === GUESTBOOK_ADMIN_EMAIL.toLowerCase());
    logoutBtn.hidden = !isAdmin;
    loginBtn.hidden = isAdmin;
    render();
  });

  loginBtn.addEventListener("click", async () => {
    const email = (adminEmailEl?.value || "").trim();
    const pw = (adminPassEl?.value || "").trim();

    if (!email || !pw) {
      showToast("이메일/비밀번호를 입력해 주세요");
      return;
    }

    try {
      await auth.signInWithEmailAndPassword(email, pw);
      showToast("관리자 로그인");
    } catch (e) {
      showToast("로그인 실패");
    }
  });

  logoutBtn.addEventListener("click", async () => {
    try {
      await auth.signOut();
      showToast("로그아웃");
    } catch (e) {
      showToast("로그아웃 실패");
    }
  });
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* init */
updateHeroDday();
setInterval(updateHeroDday, 1000 * 60 * 10);

bindCopyButtons();
bindGalleryModal();
renderKakaoRoughMap();
bindGuestbook();