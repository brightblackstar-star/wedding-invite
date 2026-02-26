// ✅ 예식 날짜/시간 (KST)
const WEDDING_ISO_KST = "2026-05-17T15:00:00+09:00";

/**
 * ✅ 페이지 확대 방지(최대한)
 * - iOS Safari: gesturestart/gesturechange/gestureend 막기
 * - 더블탭 줌 억제
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

/* ✅ 히어로 D-day (얇은 한 줄) */
function updateHeroDday() {
  const el = document.getElementById("heroDday");
  if (!el) return;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 로컬 기준 날짜 계산(한국에서 보면 자연스럽게 동작)
  const target = new Date(2026, 4, 17); // 2026-05-17
  const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));

  if (diffDays > 0) el.textContent = `D-${diffDays}`;
  else if (diffDays === 0) el.textContent = `D-DAY`;
  else el.textContent = `D+${Math.abs(diffDays)}`;
}

/* ✅ Toast + copy */
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

/* ✅ 카카오맵 퍼가기 렌더링 (네가 준 값 적용) */
function renderKakaoRoughMap() {
  const wrap = document.getElementById("kakaoMapWrap");
  if (!wrap) return;

  const timestamp = "1772109912536";
  const key = "ife62pktwsq";

  const containerId = `daumRoughmapContainer${timestamp}`;
  const container = document.getElementById(containerId);
  if (!container) return;

  let tries = 0;

  const run = () => {
    tries += 1;

    if (window.daum && window.daum.roughmap && window.daum.roughmap.Lander) {
      // wrapper 크기 기준으로 5:4 렌더
      const w = Math.max(240, wrap.clientWidth || 300);
      const h = Math.round(w * 4 / 5);

      // 기존 내용 제거 후 렌더
      container.innerHTML = "";

      // eslint-disable-next-line no-undef
      new daum.roughmap.Lander({
        timestamp: String(timestamp),
        key: String(key),
        mapWidth: String(w),
        mapHeight: String(h),
      }).render();

      return;
    }

    if (tries < 40) {
      setTimeout(run, 100);
    }
  };

  // 레이아웃 안정 후 실행
  requestAnimationFrame(run);

  // 회전/리사이즈 시 재렌더(너무 잦지 않게)
  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      tries = 0;
      run();
    }, 250);
  });
}

/**
 * ✅ 갤러리 모달 (transform 슬라이더)
 * - 잔상/흔들림 방지: scroll-snap/scrollLeft 제거
 * - 한 번 스와이프 = 최대 1장
 * - 뒤로가기로 닫힘 유지
 */
function bindGalleryModal() {
  const modal = document.getElementById("modal");
  const bg = document.getElementById("modalBg");
  const backBtn = document.getElementById("modalBack");
  const counterEl = document.getElementById("modalCounter");

  const viewport = document.getElementById("modalViewport");
  const track = document.getElementById("modalTrack");

  if (!modal || !bg || !backBtn || !counterEl || !viewport || !track) return;

  const thumbs = Array.from(document.querySelectorAll(".gimg"));
  const images = thumbs.map(b => b.getAttribute("data-full")).filter(Boolean);
  if (images.length === 0) return;

  // 슬라이드 생성(한 번)
  track.innerHTML = images.map((src, i) => {
    const alt = `갤러리 ${i + 1}`;
    // data-src로 두고 필요할 때 src를 주입(깜빡임/용량 완화)
    return `
      <div class="modal__slide" data-idx="${i}">
        <img data-src="${src}" alt="${alt}" draggable="false" />
      </div>
    `;
  }).join("");

  const slideImgs = Array.from(track.querySelectorAll("img"));

  const ensureLoaded = (idx) => {
    const i = Math.max(0, Math.min(images.length - 1, idx));
    const img = slideImgs[i];
    if (!img) return;
    if (img.getAttribute("src")) return;
    const src = img.getAttribute("data-src");
    if (src) img.setAttribute("src", src);
  };

  const preloadNeighbors = (idx) => {
    ensureLoaded(idx);
    ensureLoaded(idx - 1);
    ensureLoaded(idx + 1);
  };

  let isOpen = false;
  let currentIndex = 0;

  let startX = 0;
  let startY = 0;
  let isDragging = false;
  let baseTranslate = 0;
  let currentTranslate = 0;

  const clamp = (n) => Math.max(0, Math.min(images.length - 1, n));

  const getWidth = () => viewport.clientWidth || 1;

  const setTransition = (on) => {
    track.style.transition = on ? "transform 420ms cubic-bezier(0.22,0.61,0.36,1)" : "none";
  };

  const applyTranslate = (px) => {
    track.style.transform = `translate3d(${px}px, 0, 0)`;
  };

  const updateCounter = () => {
    counterEl.textContent = `${currentIndex + 1} / ${images.length}`;
  };

  const replaceModalState = () => {
    if (history.state && history.state.__modal) {
      history.replaceState({ __modal: true, idx: currentIndex }, "");
    }
  };

  const goTo = (idx, animate = true) => {
    currentIndex = clamp(idx);
    updateCounter();
    replaceModalState();

    preloadNeighbors(currentIndex);

    const w = getWidth();
    currentTranslate = -currentIndex * w;

    setTransition(animate);
    applyTranslate(currentTranslate);

    // 다음 프레임에서 transition 복원(드래그 대비)
    if (!animate) return;
    requestAnimationFrame(() => {});
  };

  const openAt = (idx, { pushHistory = true } = {}) => {
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    isOpen = true;

    const st = { __modal: true, idx: clamp(idx) };
    if (pushHistory) {
      if (history.state && history.state.__modal) history.replaceState(st, "");
      else history.pushState(st, "");
    } else {
      history.replaceState(st, "");
    }

    currentIndex = clamp(idx);
    updateCounter();
    preloadNeighbors(currentIndex);

    // 레이아웃 후 위치 확정
    requestAnimationFrame(() => goTo(currentIndex, false));
  };

  const closeModal = () => {
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    isOpen = false;
    isDragging = false;
  };

  const requestCloseWithBack = () => {
    if (history.state && history.state.__modal) history.back();
    else closeModal();
  };

  // 썸네일 클릭
  thumbs.forEach((b, fallbackIdx) => {
    b.addEventListener("click", () => {
      const idxAttr = b.getAttribute("data-index");
      const idx = Number.isFinite(Number(idxAttr)) ? Number(idxAttr) : fallbackIdx;
      openAt(idx, { pushHistory: true });
    });
  });

  bg.addEventListener("click", requestCloseWithBack);
  backBtn.addEventListener("click", requestCloseWithBack);

  // 드래그(스와이프)
  viewport.addEventListener("touchstart", (e) => {
    if (!isOpen) return;
    if (!e.touches || e.touches.length !== 1) return;

    setTransition(false);
    isDragging = false;

    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;

    baseTranslate = currentTranslate;
  }, { passive: true });

  viewport.addEventListener("touchmove", (e) => {
    if (!isOpen) return;
    if (!e.touches || e.touches.length !== 1) return;

    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;

    const dx = x - startX;
    const dy = y - startY;

    // 가로 스와이프 의도일 때만 잡기
    if (!isDragging) {
      if (Math.abs(dx) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)) return; // 세로 스크롤 우선
      isDragging = true;
    }

    // 가로 드래그 중에는 페이지 스크롤 방지
    e.preventDefault();

    // 끝에서 약간 저항(바운스) 주기
    let next = baseTranslate + dx;
    const w = getWidth();

    const min = -(images.length - 1) * w;
    const max = 0;

    if (next > max) next = max + (next - max) * 0.25;
    if (next < min) next = min + (next - min) * 0.25;

    currentTranslate = next;
    applyTranslate(currentTranslate);
  }, { passive: false });

  viewport.addEventListener("touchend", (e) => {
    if (!isOpen) return;

    // 드래그가 아니면 그냥 종료
    if (!isDragging) {
      setTransition(true);
      goTo(currentIndex, true);
      return;
    }

    const w = getWidth();
    const moved = currentTranslate - (-currentIndex * w);

    // 임계값: 22% 이상 움직여야 넘어감 (너무 민감하지 않게)
    const threshold = w * 0.22;

    let nextIndex = currentIndex;

    if (moved < -threshold) nextIndex = currentIndex + 1;
    else if (moved > threshold) nextIndex = currentIndex - 1;

    // ✅ 한 번 스와이프에 최대 1장
    nextIndex = clamp(nextIndex);

    setTransition(true);
    goTo(nextIndex, true);

    isDragging = false;
  }, { passive: true });

  // 리사이즈/회전 시 현재 인덱스 유지
  window.addEventListener("resize", () => {
    if (!isOpen) return;
    requestAnimationFrame(() => goTo(currentIndex, false));
  });

  // 키보드(PC 테스트용)
  window.addEventListener("keydown", (e) => {
    if (!isOpen) return;
    if (e.key === "Escape") requestCloseWithBack();
    if (e.key === "ArrowLeft") goTo(currentIndex - 1, true);
    if (e.key === "ArrowRight") goTo(currentIndex + 1, true);
  });

  // 뒤로가기(popstate)
  window.addEventListener("popstate", (e) => {
    const st = e.state;
    if (st && st.__modal && typeof st.idx === "number") {
      if (!isOpen) openAt(st.idx, { pushHistory: false });
      else goTo(st.idx, false);
    } else {
      if (isOpen) closeModal();
    }
  });
}

/* init */
updateHeroDday();
setInterval(updateHeroDday, 1000 * 60 * 10);

bindCopyButtons();
bindGalleryModal();
renderKakaoRoughMap();