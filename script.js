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
  const scroller = document.getElementById("modalScroller");
  const bg = document.getElementById("modalBg");
  const backBtn = document.getElementById("modalBack");
  const counterEl = document.getElementById("modalCounter");

  if (!modal || !scroller || !bg || !backBtn || !counterEl) return;

  const thumbs = Array.from(document.querySelectorAll(".gimg"));
  const images = thumbs.map(b => b.getAttribute("data-full")).filter(Boolean);

  if (images.length === 0) return;

  // ✅ 슬라이드 DOM 생성 (한 번만)
  scroller.innerHTML = images.map((src, i) => {
    const alt = `갤러리 ${i + 1}`;
    return `
      <div class="modal__slide" data-idx="${i}">
        <img src="${src}" alt="${alt}" draggable="false" />
      </div>
    `;
  }).join("");

  let isOpen = false;
  let currentIndex = 0;
  let rafId = 0;
  let scrollEndTimer = 0;

  const clamp = (n) => Math.max(0, Math.min(images.length - 1, n));

  const updateCounter = () => {
    counterEl.textContent = `${currentIndex + 1} / ${images.length}`;
  };

  const replaceModalState = () => {
    // 모달 열림 상태에서 인덱스만 갱신(뒤로가기 스택은 늘리지 않음)
    if (history.state && history.state.__modal) {
      history.replaceState({ __modal: true, idx: currentIndex }, "");
    }
  };

  const scrollToIndex = (idx, behavior = "auto") => {
    currentIndex = clamp(idx);
    updateCounter();
    replaceModalState();

    const w = scroller.clientWidth;
    if (!w) return;
    scroller.scrollTo({ left: w * currentIndex, behavior });
  };

  const openAt = (idx, { pushHistory = true } = {}) => {
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    isOpen = true;

    currentIndex = clamp(idx);
    updateCounter();

    // ✅ 뒤로가기(Back)로 닫히게 history state 1개만 쌓기
    const st = { __modal: true, idx: currentIndex };
    if (pushHistory) {
      if (history.state && history.state.__modal) history.replaceState(st, "");
      else history.pushState(st, "");
    } else {
      history.replaceState(st, "");
    }

    // 레이아웃 잡힌 다음 위치 점프
    requestAnimationFrame(() => {
      scrollToIndex(currentIndex, "auto");
    });
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

  // 썸네일 클릭 → 해당 인덱스로 오픈
  thumbs.forEach((b, fallbackIdx) => {
    b.addEventListener("click", () => {
      const idxAttr = b.getAttribute("data-index");
      const idx = Number.isFinite(Number(idxAttr)) ? Number(idxAttr) : fallbackIdx;
      openAt(idx, { pushHistory: true });
    });
  });

  // 닫기
  bg.addEventListener("click", requestCloseWithBack);
  backBtn.addEventListener("click", requestCloseWithBack);

  // ✅ 스크롤(스와이프)로 현재 인덱스 추적
  const onScroll = () => {
    if (!isOpen) return;

    // rAF로 부드럽게(과도한 연산 방지)
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      const w = scroller.clientWidth || 1;
      const idx = clamp(Math.round(scroller.scrollLeft / w));
      if (idx !== currentIndex) {
        currentIndex = idx;
        updateCounter();
      }
    });

    // 스크롤 멈춘 후 state 반영(뒤로가기 스택 안 늘림)
    clearTimeout(scrollEndTimer);
    scrollEndTimer = setTimeout(() => {
      replaceModalState();
    }, 120);
  };

  scroller.addEventListener("scroll", onScroll, { passive: true });

  // ✅ 화면 회전/리사이즈 시 현재 사진 유지
  window.addEventListener("resize", () => {
    if (!isOpen) return;
    // 너비 바뀌면 스냅 기준도 바뀌므로 현재 인덱스로 다시 맞춤
    requestAnimationFrame(() => scrollToIndex(currentIndex, "auto"));
  });

  // ✅ 키보드 지원(PC에서 테스트할 때 편함)
  window.addEventListener("keydown", (e) => {
    if (!isOpen) return;
    if (e.key === "Escape") requestCloseWithBack();
    if (e.key === "ArrowLeft") scrollToIndex(currentIndex - 1, "smooth");
    if (e.key === "ArrowRight") scrollToIndex(currentIndex + 1, "smooth");
  });

  // ✅ 뒤로가기(popstate) 처리: 모달 state면 열고, 아니면 닫기
  window.addEventListener("popstate", (e) => {
    const st = e.state;
    if (st && st.__modal && typeof st.idx === "number") {
      if (!isOpen) {
        // 앞으로가기 등으로 모달 상태 복귀한 경우
        openAt(st.idx, { pushHistory: false });
      } else {
        // 열린 상태에서 history state 갱신
        scrollToIndex(st.idx, "auto");
      }
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

