// ✅ 예식 날짜/시간 (KST)
const WEDDING_ISO_KST = "2026-05-17T15:00:00+09:00";

// ✅ 카카오맵 RoughMap (사용자가 제공한 최신 값)
const KAKAO_ROUGHMAP = {
  timestamp: "1772431483308",
  key: "ikwriqe8rf6",
};

// ✅ Firebase 설정 (사용자 제공)
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyA7XXEdrdKCKm_-ZwBy1nk10xZMPDCH3ww",
  authDomain: "wedding-ae80b.firebaseapp.com",
  projectId: "wedding-ae80b",
  storageBucket: "wedding-ae80b.firebasestorage.app",
  messagingSenderId: "1007496471653",
  appId: "1:1007496471653:web:cac00eedf8d6f6b659128c",
  measurementId: "G-5X86K0NZTZ",
};

// ✅ 관리자 이메일
const GUESTBOOK_ADMIN_EMAIL = "bright.blackstar@gmail.com";

// 게시판: 처음 5개 + 더보기(5개씩)
const GUESTBOOK_STEP = 5;

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

/* ✅ D-day */
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

/* ✅ Copy */
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

/* ✅ 카카오 RoughMap: “안 뜨는 경우” 대비해서 daum 로딩까지 재시도 */
function renderKakaoRoughMap() {
  const { timestamp, key } = KAKAO_ROUGHMAP;
  const box = document.querySelector(".mapBox");
  const container = document.getElementById(`daumRoughmapContainer${timestamp}`);
  const fallback = document.querySelector(".mapBox__fallback");

  if (!box || !container) return;

  const tryRender = () => {
    if (!(window.daum && window.daum.roughmap && window.daum.roughmap.Lander)) {
      return false;
    }

    // 기존 렌더 제거
    container.innerHTML = "";

    const w = Math.max(240, box.clientWidth || 300);
    const h = Math.round(w * 4 / 5); // 5:4

    // eslint-disable-next-line no-undef
    new daum.roughmap.Lander({
      timestamp: String(timestamp),
      key: String(key),
      mapWidth: String(w),
      mapHeight: String(h),
    }).render();

    // iframe 생성 여부로 fallback 처리
    setTimeout(() => {
      const hasFrame = !!container.querySelector("iframe");
      if (fallback) fallback.style.display = hasFrame ? "none" : "flex";
    }, 450);

    return true;
  };

  let tries = 0;
  const tick = () => {
    tries += 1;
    if (tryRender()) return;
    if (tries < 40) setTimeout(tick, 120);
    else if (fallback) fallback.style.display = "flex";
  };
  tick();

  // 리사이즈 시 재렌더(너무 자주 X)
  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      tries = 0;
      tick();
    }, 250);
  }, { passive: true });
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

/* ✅ 게시판(Firebase): 최신 5개 + 더보기로 limit 확장 */
function bindGuestbook() {
  const form = document.getElementById("gbForm");
  const nameEl = document.getElementById("gbName");
  const msgEl = document.getElementById("gbMsg");
  const listEl = document.getElementById("gbList");
  const moreBtn = document.getElementById("gbMoreBtn");

  const adminEmailEl = document.getElementById("adminEmail");
  const adminPassEl = document.getElementById("adminPassword");
  const loginBtn = document.getElementById("adminLogin");
  const logoutBtn = document.getElementById("adminLogout");

  if (!form || !nameEl || !msgEl || !listEl || !moreBtn || !loginBtn || !logoutBtn) return;

  if (!window.firebase) {
    listEl.innerHTML = `<div class="gbItem"><div class="gbMsg">게시판 로딩 실패(Firebase 스크립트).</div></div>`;
    return;
  }

  const app = (firebase.apps && firebase.apps.length) ? firebase.app() : firebase.initializeApp(FIREBASE_CONFIG);
  const db = firebase.firestore();
  const auth = firebase.auth();

  let isAdmin = false;
  let limitCount = GUESTBOOK_STEP;
  let unsub = null;

  // ✅ 더보기 클릭 후 로드 완료되면 “아래로 자연스럽게” 내려가게 하는 플래그
  let pendingAutoScroll = false;

  const fmt = (d) => {
    if (!d) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}.${mm}.${dd}`;
  };

  const render = (docs) => {
    if (!docs || docs.length === 0) {
      listEl.innerHTML = `
        <div class="gbItem">
          <div class="gbMsg">아직 작성된 글이 없어요. 첫 축하글을 남겨주세요 💐</div>
        </div>
      `;
      return;
    }

    listEl.innerHTML = docs.map((doc) => {
      const data = doc.data() || {};
      const id = doc.id;

      const name = escapeHtml((data.name || "").toString());
      const msg = escapeHtml((data.message || "").toString());

      let dateStr = "";
      const c = data.createdAt;
      if (c && typeof c.toDate === "function") dateStr = fmt(c.toDate());

      return `
        <div class="gbItem">
          <div class="gbHead">
            <div>
              <span class="gbName">${name}</span>
              <span class="gbTime">${dateStr ? "· " + dateStr : ""}</span>
            </div>
            ${isAdmin ? `<button class="gbDelete" data-id="${id}" type="button">삭제</button>` : ``}
          </div>
          <div class="gbMsg">${msg}</div>
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

  const updateMoreVisibility = (docs) => {
    // 더보기 표시 조건
    if (docs.length < GUESTBOOK_STEP) {
      moreBtn.hidden = true;
    } else if (docs.length < limitCount) {
      // limitCount를 늘렸는데 그만큼 못 채우면 더 이상 없음
      moreBtn.hidden = true;
    } else {
      moreBtn.hidden = false;
    }
  };

  const subscribe = () => {
    if (unsub) unsub();

    listEl.setAttribute("aria-busy", "true");

    unsub = db.collection("guestbook")
      .orderBy("createdAt", "desc")
      .limit(limitCount)
      .onSnapshot((snap) => {
        listEl.setAttribute("aria-busy", "false");

        const docs = snap.docs;
        render(docs);
        updateMoreVisibility(docs);

        // 더보기 버튼 상태 복구
        moreBtn.disabled = false;
        moreBtn.textContent = "더보기";

        // ✅ “더보기” 누른 뒤에만: 아래로 자연스럽게 내려가기
        if (pendingAutoScroll) {
          pendingAutoScroll = false;

          requestAnimationFrame(() => {
            const target = moreBtn.hidden
              ? listEl.lastElementChild   // 더보기 없어졌으면 리스트 마지막 글로
              : moreBtn;                  // 더보기 있으면 버튼 위치로

            if (target && target.scrollIntoView) {
              target.scrollIntoView({ behavior: "smooth", block: "end" });
            }
          });
        }
      }, () => {
        listEl.setAttribute("aria-busy", "false");
        listEl.innerHTML = `<div class="gbItem"><div class="gbMsg">게시판을 불러오지 못했어요.</div></div>`;
        moreBtn.hidden = true;
        moreBtn.disabled = false;
        moreBtn.textContent = "더보기";
        pendingAutoScroll = false;
      });
  };

  // ✅ 더보기
  moreBtn.addEventListener("click", () => {
    pendingAutoScroll = true;        // << 핵심
    limitCount += GUESTBOOK_STEP;

    moreBtn.disabled = true;
    moreBtn.textContent = "불러오는 중…";

    subscribe();
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

  // 관리자 로그인 상태
  auth.onAuthStateChanged((user) => {
    isAdmin = !!(user && user.email && user.email.toLowerCase() === GUESTBOOK_ADMIN_EMAIL.toLowerCase());
    logoutBtn.hidden = !isAdmin;
    loginBtn.hidden = isAdmin;

    // 관리자 상태 변화 시 삭제 버튼 표시 반영
    subscribe();
  });

  loginBtn.addEventListener("click", async () => {
    const email = (adminEmailEl.value || "").trim();
    const pw = (adminPassEl.value || "").trim();

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

  // 시작
  moreBtn.hidden = true;
  subscribe();
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