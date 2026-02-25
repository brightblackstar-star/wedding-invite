// ✅ 예식 날짜/시간 (KST)
const WEDDING_ISO_KST = "2026-05-17T15:00:00+09:00";

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
 * - 사진 크게 보기 후 "뒤로가기"로 돌아오기: history.pushState + popstate로 구현
 * - 확대(핀치줌) 제한: 모달 오픈 시 제스처 차단(가능한 범위에서)
 */
function bindGalleryModal() {
  const modal = document.getElementById("modal");
  const modalImg = document.getElementById("modalImg");
  const bg = document.getElementById("modalBg");
  const backBtn = document.getElementById("modalBack");

  if (!modal || !modalImg || !bg || !backBtn) return;

  let isOpen = false;

  // iOS 사파리 제스처(핀치 줌) 이벤트 차단용
  const preventGesture = (e) => {
    if (!isOpen) return;
    e.preventDefault();
  };

  // 더블탭 줌 방지(일부 브라우저)
  let lastTouchEnd = 0;
  const preventDoubleTapZoom = (e) => {
    if (!isOpen) return;
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  };

  const lockForModal = () => {
    document.body.style.overflow = "hidden";
    document.documentElement.classList.add("noGesture");
    document.body.classList.add("noGesture");

    document.addEventListener("gesturestart", preventGesture, { passive: false });
    document.addEventListener("gesturechange", preventGesture, { passive: false });
    document.addEventListener("gestureend", preventGesture, { passive: false });

    modal.addEventListener("touchend", preventDoubleTapZoom, { passive: false });
  };

  const unlockForModal = () => {
    document.body.style.overflow = "";
    document.documentElement.classList.remove("noGesture");
    document.body.classList.remove("noGesture");

    document.removeEventListener("gesturestart", preventGesture);
    document.removeEventListener("gesturechange", preventGesture);
    document.removeEventListener("gestureend", preventGesture);

    modal.removeEventListener("touchend", preventDoubleTapZoom);
  };

  const openModal = (src, { pushHistory = true } = {}) => {
    modalImg.src = src;
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    isOpen = true;
    lockForModal();

    // 뒤로가기 지원: 첫 오픈은 pushState, 모달 열린 상태에서 다른 사진 누르면 replaceState
    if (pushHistory) {
      const state = { __modal: true, src };
      if (history.state && history.state.__modal) {
        history.replaceState(state, "");
      } else {
        history.pushState(state, "");
      }
    }
  };

  const closeModal = () => {
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    modalImg.src = "";
    isOpen = false;
    unlockForModal();
  };

  const requestCloseWithBack = () => {
    // 모달이 history로 열렸으면 back으로 닫아야 "뒤로가기" UX가 깔끔함
    if (history.state && history.state.__modal) {
      history.back();
    } else {
      closeModal();
    }
  };

  // 썸네일 클릭 → 모달 오픈 + history push
  document.querySelectorAll(".gimg").forEach((b) => {
    b.addEventListener("click", () => {
      const full = b.getAttribute("data-full");
      if (!full) return;
      openModal(full, { pushHistory: true });
    });
  });

  // UI 닫기(배경/뒤로 버튼)
  bg.addEventListener("click", requestCloseWithBack);
  backBtn.addEventListener("click", requestCloseWithBack);

  // ESC 닫기(PC)
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) requestCloseWithBack();
  });

  // ✅ 브라우저 뒤로가기(popstate)로 복귀 처리
  window.addEventListener("popstate", (e) => {
    const st = e.state;
    if (st && st.__modal && st.src) {
      // 앞으로 가기 등으로 모달 상태로 복귀했을 때
      openModal(st.src, { pushHistory: false });
    } else {
      // 모달 닫고 원래 화면으로
      if (isOpen) closeModal();
    }
  });
}

updateCountdown();
setGoogleCalendarLink();
bindCopyButtons();
bindGalleryModal();
setInterval(updateCountdown, 1000 * 30);