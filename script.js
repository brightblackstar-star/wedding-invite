// ✅ 예식 날짜/시간 (KST)
const WEDDING_ISO_KST = "2026-05-17T15:00:00+09:00";

/**
 * ✅ 페이지 확대 방지(최대한)
 * - iOS Safari: gesturestart/gesturechange/gestureend 막기
 * - 더블탭 줌 억제
 * ※ 브라우저/접근성 정책에 따라 100% 완전 차단은 보장 불가
 */
(function preventPageZoom() {
  const prevent = (e) => e.preventDefault();

  document.addEventListener("gesturestart", prevent, { passive: false });
  document.addEventListener("gesturechange", prevent, { passive: false });
  document.addEventListener("gestureend", prevent, { passive: false });

  let lastTouchEnd = 0;
  document.addEventListener("touchend", function (e) {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });
})();

function formatCountdown(ms) {
  if (ms <= 0) return "오늘은 결혼식 당일입니다 💐";

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return `D-${days} · ${hours}시간 ${minutes}분 남음`;
}

function updateCountdown() {
  const el = document.getElementById("countdownText");
  if (!el) return;

  const target = new Date(WEDDING_ISO_KST).getTime();
  const now = Date.now();
  el.textContent = formatCountdown(target - now);
}

// Google Calendar 링크 생성
function setGoogleCalendarLink() {
  const a = document.getElementById("addToCalendar");
  if (!a) return;

  const title = encodeURIComponent("홍유석 · 박샛별 결혼식");
  const location = encodeURIComponent("서울한방진흥센터");
  const details = encodeURIComponent("모바일 청첩장 링크를 확인해주세요.");

  const start = new Date(WEDDING_ISO_KST);
  const end = new Date(start.getTime() + 90 * 60 * 1000); // 1시간 30분

  const toGCal = (d) => {
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mi = String(d.getUTCMinutes()).padStart(2, "0");
    const ss = String(d.getUTCSeconds()).padStart(2, "0");
    return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
  };

  const dates = `${toGCal(start)}/${toGCal(end)}`;
  a.href = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
}

function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  window.clearTimeout(showToast._timer);
  showToast._timer = window.setTimeout(() => t.classList.remove("show"), 1400);
}

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {}

  // fallback (iOS Safari 포함)
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

/**
 * ✅ 갤러리 모달 요구사항 반영
 * - 뒤로가기: history.pushState + popstate
 * - 좌우 스와이프: 터치 제스처로 이전/다음
 * - 버튼/키보드(← →)도 지원
 * - 확대(핀치줌) 제한: viewport + gesture 방지 + 이미지 contain
 */
function bindGalleryModal() {
  const modal = document.getElementById("modal");
  const modalImg = document.getElementById("modalImg");
  const stage = document.getElementById("modalStage");
  const bg = document.getElementById("modalBg");
  const backBtn = document.getElementById("modalBack");
  const prevBtn = document.getElementById("modalPrev");
  const nextBtn = document.getElementById("modalNext");
  const counterEl = document.getElementById("modalCounter");

  if (!modal || !modalImg || !stage || !bg || !backBtn || !prevBtn || !nextBtn || !counterEl) return;

  const thumbs = Array.from(document.querySelectorAll(".gimg"));
  const images = thumbs
    .map((b) => b.getAttribute("data-full"))
    .filter(Boolean);

  if (images.length === 0) return;

  let isOpen = false;
  let currentIndex = 0;

  const clampIndex = (idx) => Math.max(0, Math.min(images.length - 1, idx));

  const updateCounter = () => {
    counterEl.textContent = `${currentIndex + 1} / ${images.length}`;
  };

  const openAt = (idx, { pushHistory = true } = {}) => {
    currentIndex = clampIndex(idx);
    modalImg.src = images[currentIndex];

    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    isOpen = true;

    updateCounter();

    // 뒤로가기 지원: "열 때"만 pushState 1번, 이후 사진 넘길 때는 replaceState
    const state = { __modal: true, idx: currentIndex };
    if (pushHistory) {
      if (history.state && history.state.__modal) {
        history.replaceState(state, "");
      } else {
        history.pushState(state, "");
      }
    } else {
      history.replaceState(state, "");
    }
  };

  const closeModal = () => {
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    modalImg.src = "";
    document.body.style.overflow = "";
    isOpen = false;
  };

  const requestCloseWithBack = () => {
    if (history.state && history.state.__modal) history.back();
    else closeModal();
  };

  const goPrev = () => {
    if (currentIndex <= 0) {
      showToast("첫 사진입니다");
      return;
    }
    openAt(currentIndex - 1, { pushHistory: false });
  };

  const goNext = () => {
    if (currentIndex >= images.length - 1) {
      showToast("마지막 사진입니다");
      return;
    }
    openAt(currentIndex + 1, { pushHistory: false });
  };

  // 썸네일 클릭 → 오픈
  thumbs.forEach((b, i) => {
    b.addEventListener("click", () => {
      const idxAttr = b.getAttribute("data-index");
      const idx = idxAttr !== null ? Number(idxAttr) : i;
      openAt(Number.isFinite(idx) ? idx : i, { pushHistory: true });
    });
  });

  // UI 닫기
  bg.addEventListener("click", requestCloseWithBack);
  backBtn.addEventListener("click", requestCloseWithBack);

  // 버튼으로 이전/다음
  prevBtn.addEventListener("click", goPrev);
  nextBtn.addEventListener("click", goNext);

  // 키보드(PC) 지원
  window.addEventListener("keydown", (e) => {
    if (!isOpen) return;
    if (e.key === "Escape") requestCloseWithBack();
    if (e.key === "ArrowLeft") goPrev();
    if (e.key === "ArrowRight") goNext();
  });

  // ✅ 좌우 스와이프(터치)
  let startX = 0;
  let startY = 0;
  let startTime = 0;

  stage.addEventListener("touchstart", (e) => {
    if (!isOpen) return;
    const t = e.changedTouches[0];
    startX = t.clientX;
    startY = t.clientY;
    startTime = Date.now();
  }, { passive: true });

  stage.addEventListener("touchend", (e) => {
    if (!isOpen) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    const dt = Date.now() - startTime;

    // 너무 느리거나, 세로 스크롤성 움직임은 무시
    if (dt > 700) return;
    if (Math.abs(dx) < 45) return;
    if (Math.abs(dy) > 70) return;

    if (dx < 0) goNext();
    else goPrev();
  }, { passive: true });

  // ✅ 브라우저 뒤로가기(popstate)로 복귀 처리
  window.addEventListener("popstate", (e) => {
    const st = e.state;
    if (st && st.__modal && typeof st.idx === "number") {
      openAt(st.idx, { pushHistory: false });
    } else {
      if (isOpen) closeModal();
    }
  });
}

updateCountdown();
setGoogleCalendarLink();
bindCopyButtons();
bindGalleryModal();
setInterval(updateCountdown, 1000 * 30);
