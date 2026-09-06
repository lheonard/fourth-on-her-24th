const YT_ID = "vBy7FaapGRo";
const LOCAL_SONG = "assets/best-part.mp3";

const intro = document.getElementById("intro");
const note = document.getElementById("note");
const enter = document.getElementById("enter");
const nowPlaying = document.getElementById("nowPlaying");
const muteBtn = document.getElementById("muteBtn");
const petals = document.getElementById("petals");
const cursor = document.querySelector(".cursor");
const topbar = document.getElementById("topbar");
const pages = [...document.querySelectorAll(".page")];

let audio = null;
let ytPlayer = null;
let muted = false;
let usingYouTube = false;
let pageIndex = 0;
let moving = false;

function loadPhotos() {
  document.querySelectorAll("figure").forEach((frame) => {
    const img = frame.querySelector("img");
    if (!img) return;

    const src = img.getAttribute("src") || frame.getAttribute("data-src");
    if (!src) return;

    if (!img.getAttribute("src")) img.src = src;

    const show = () => frame.classList.add("has-photo");
    const hide = () => frame.classList.remove("has-photo");

    img.addEventListener("error", hide);
    if (img.complete) {
      if (img.naturalWidth) show();
      else hide();
      return;
    }
    img.addEventListener("load", show, { once: true });
  });
}

function burstPetals(count = 10) {
  const colors = ["#c4b8cf", "#e4d7ea", "#5a189a", "#9a86a8"];
  for (let i = 0; i < count; i += 1) {
    const el = document.createElement("span");
    el.className = "petal";
    const size = 8 + Math.random() * 12;
    el.style.left = `${Math.random() * 100}%`;
    el.style.width = `${size}px`;
    el.style.height = `${size * 0.7}px`;
    el.style.background = colors[i % colors.length];
    el.style.animationDuration = `${4.5 + Math.random() * 4}s`;
    el.style.animationDelay = `${Math.random() * 0.8}s`;
    petals.appendChild(el);
    setTimeout(() => el.remove(), 9000);
  }
}

function loadYouTubeApi() {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = resolve;
  });
}

function startYouTube() {
  return loadYouTubeApi().then(
    () =>
      new Promise((resolve, reject) => {
        const mount = document.getElementById("ytWrap");
        mount.innerHTML = "";
        const host = document.createElement("div");
        host.id = "ytPlayer";
        mount.appendChild(host);
        const timeout = setTimeout(() => reject(new Error("youtube timeout")), 4000);
        ytPlayer = new YT.Player("ytPlayer", {
          videoId: YT_ID,
          width: 1,
          height: 1,
          playerVars: {
            autoplay: 1,
            loop: 1,
            playlist: YT_ID,
            controls: 0,
            modestbranding: 1,
            playsinline: 1,
          },
          events: {
            onReady: (e) => {
              clearTimeout(timeout);
              e.target.setVolume(72);
              e.target.playVideo();
              usingYouTube = true;
              resolve();
            },
            onError: () => {
              clearTimeout(timeout);
              reject(new Error("youtube error"));
            },
          },
        });
      })
  );
}

function startLocalAudio() {
  return new Promise((resolve, reject) => {
    audio = new Audio(LOCAL_SONG);
    audio.loop = true;
    audio.volume = 0.72;
    const fail = () => reject(new Error("no local file"));
    audio.addEventListener("error", fail, { once: true });
    audio.play().then(resolve).catch(fail);
  });
}

async function startMusic() {
  try {
    await startLocalAudio();
  } catch {
    try {
      await startYouTube();
    } catch {
      nowPlaying.hidden = true;
      return;
    }
  }
  nowPlaying.hidden = false;
}

function setMuted(next) {
  muted = next;
  nowPlaying.classList.toggle("is-muted", muted);
  if (audio) audio.muted = muted;
  if (ytPlayer && ytPlayer.mute) {
    if (muted) ytPlayer.mute();
    else ytPlayer.unMute();
  }
}

function initTilts() {
  if (window.matchMedia("(hover: none)").matches) return;

  document.querySelectorAll(".tilt").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      const rot = getComputedStyle(el).getPropertyValue("--rot") || "0deg";
      const origin = el.classList.contains("frame--solo-left") || el.classList.contains("frame--solo-right")
        ? "translateY(-50%) "
        : "";
      el.style.transform = `${origin}rotate(${rot}) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
    });
    el.addEventListener("mouseleave", () => {
      const rot = getComputedStyle(el).getPropertyValue("--rot") || "0deg";
      const origin = el.classList.contains("frame--solo-left") || el.classList.contains("frame--solo-right")
        ? "translateY(-50%) "
        : "";
      el.style.transform = `${origin}rotate(${rot})`;
    });
  });
}

function initCursor() {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  window.addEventListener("mousemove", (e) => {
    cursor.style.left = `${e.clientX}px`;
    cursor.style.top = `${e.clientY}px`;
  });
  document.querySelectorAll("button, a, .pill, .tilt").forEach((el) => {
    el.addEventListener("mouseenter", () => cursor.classList.add("grow"));
    el.addEventListener("mouseleave", () => cursor.classList.remove("grow"));
  });
}

function activeScrollPage() {
  const page = pages[pageIndex];
  if (!page) return null;
  if (page.classList.contains("note") || page.classList.contains("slide--letter")) return page;
  return null;
}

function canLeavePage(dir) {
  const el = activeScrollPage();
  if (!el) return true;
  const max = el.scrollHeight - el.clientHeight;
  if (dir < 0) return el.scrollTop <= 2;
  return el.scrollTop >= max - 2;
}

function lockPageScroll(e) {
  if (!document.body.classList.contains("ready")) return;
  if (e.target.closest("button, a, .intro__btn")) return;
  if (e.target.closest(".page.is-active.note, .page.is-active.slide--letter")) return;
  e.preventDefault();
}

function onWheel(e) {
  if (!document.body.classList.contains("ready")) {
    e.preventDefault();
    return;
  }

  const dir = e.deltaY > 4 ? 1 : e.deltaY < -4 ? -1 : 0;
  if (!dir) return;

  if (activeScrollPage() && !canLeavePage(dir)) return;

  e.preventDefault();
  goTo(pageIndex + dir);
}

let touchStartX = 0;
let touchStartY = 0;
let touchOnControl = false;

function onTouchStart(e) {
  const t = e.changedTouches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
  touchOnControl = Boolean(e.target.closest("button, a"));
}

function onTouchEnd(e) {
  if (!document.body.classList.contains("ready") || touchOnControl) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;
  if (Math.abs(dy) < 56 || Math.abs(dy) < Math.abs(dx) * 1.15) return;
  const dir = dy < 0 ? 1 : -1;
  if (!canLeavePage(dir)) return;
  goTo(pageIndex + dir);
}

function updateChrome() {
  const dark = pages[pageIndex].classList.contains("slide--burgundy")
    || pages[pageIndex].classList.contains("slide--finale");
  document.body.classList.toggle("on-dark", dark);
}

function goTo(nextIndex) {
  if (moving || nextIndex < 0 || nextIndex >= pages.length || nextIndex === pageIndex) return;
  moving = true;

  const current = pages[pageIndex];
  const incoming = pages[nextIndex];

  current.classList.remove("is-settled");
  incoming.classList.remove("is-settled");

  if (nextIndex > pageIndex) {
    current.classList.remove("is-active");
    current.classList.add("is-passed");
    incoming.classList.add("is-active");
  } else {
    current.classList.remove("is-active");
    incoming.classList.remove("is-passed");
    incoming.classList.add("is-active");
  }

  pageIndex = nextIndex;
  updateChrome();
  setTimeout(() => {
    incoming.classList.add("is-settled");
    moving = false;
  }, 850);
}

window.addEventListener("wheel", onWheel, { passive: false });
window.addEventListener("touchmove", lockPageScroll, { passive: false });
window.addEventListener("touchstart", onTouchStart, { passive: true });
window.addEventListener("touchend", onTouchEnd, { passive: true });
window.addEventListener("keydown", (e) => {
  if (!document.body.classList.contains("ready")) return;
  if (e.key === "ArrowDown" || e.key === "PageDown") {
    e.preventDefault();
    if (canLeavePage(1)) goTo(pageIndex + 1);
  }
  if (e.key === "ArrowUp" || e.key === "PageUp") {
    e.preventDefault();
    if (canLeavePage(-1)) goTo(pageIndex - 1);
  }
});

function enterSite(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  if (!intro || document.body.classList.contains("ready")) return;

  document.documentElement.classList.remove("intro-lock");
  document.body.classList.remove("intro-lock");
  document.body.classList.add("ready");
  intro.classList.add("is-gone");
  if (topbar) topbar.hidden = false;
  if (pages[0]) {
    pages[0].classList.add("is-active");
    updateChrome();
  }
  if (enter) enter.disabled = true;

  setTimeout(() => {
    pages[0]?.classList.add("is-settled");
    intro.remove();
  }, 1100);

  if (nowPlaying) nowPlaying.hidden = false;
  try { startMusic(); } catch {}
  try { burstPetals(); } catch {}
}

window.enterSite = enterSite;

if (enter) {
  enter.addEventListener("click", enterSite);
  enter.addEventListener("pointerup", enterSite);
  enter.addEventListener("touchend", enterSite, { passive: false });
}

muteBtn.addEventListener("click", () => setMuted(!muted));

loadPhotos();
initTilts();
initCursor();
