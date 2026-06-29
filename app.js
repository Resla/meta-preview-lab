const THEME_KEY = "meta-preview-lab-theme";

const pageTitle = document.getElementById("pageTitle");
const pageUrl = document.getElementById("pageUrl");
const pageDesc = document.getElementById("pageDesc");
const imageUrl = document.getElementById("imageUrl");
const titleCount = document.getElementById("titleCount");
const descCount = document.getElementById("descCount");
const ogSnippet = document.getElementById("ogSnippet");
const copyOg = document.getElementById("copyOg");
const themeToggle = document.getElementById("themeToggle");
const toast = document.getElementById("toast");

const DEFAULTS = {
  title: "Your page title appears here",
  desc: "Your meta description shows as the snippet below the title in search results.",
  url: "https://yourname.github.io/my-project/",
  domain: "yourname.github.io",
  breadcrumb: "yourname.github.io › my-project",
};

const inputs = [pageTitle, pageUrl, pageDesc, imageUrl];

function init() {
  loadTheme();
  prefillDemo();
  updateAll();
  bindEvents();
}

function prefillDemo() {
  pageTitle.value = "Focus Desk — Minimal Pomodoro Timer";
  pageUrl.value = "https://resla.github.io/focus-desk/";
  pageDesc.value =
    "A beautiful Pomodoro timer with task labels, custom durations, and browser notifications. Built with vanilla JS.";
  imageUrl.value = "";
}

function bindEvents() {
  inputs.forEach((input) => input.addEventListener("input", updateAll));
  copyOg.addEventListener("click", copyOgTags);
  themeToggle.addEventListener("click", toggleTheme);
}

function updateAll() {
  const title = pageTitle.value.trim() || DEFAULTS.title;
  const desc = pageDesc.value.trim() || DEFAULTS.desc;
  const url = pageUrl.value.trim() || DEFAULTS.url;
  const image = imageUrl.value.trim();
  const { domain, breadcrumb } = parseUrl(url);

  updateCharCounts();
  updateGoogle(title, desc, breadcrumb);
  updateX(title, desc, domain, image);
  updateLinkedIn(title, domain, image);
  updateOgSnippet(title, desc, url, image);
}

function parseUrl(urlString) {
  try {
    const url = new URL(urlString);
    const domain = url.hostname.replace(/^www\./, "");
    const path = url.pathname.replace(/\/$/, "").split("/").filter(Boolean);
    const breadcrumb = path.length
      ? `${domain} › ${path.join(" › ")}`
      : domain;
    return { domain, breadcrumb };
  } catch {
    return { domain: DEFAULTS.domain, breadcrumb: DEFAULTS.breadcrumb };
  }
}

function truncate(text, max) {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}

function updateCharCounts() {
  const titleLen = pageTitle.value.length;
  const descLen = pageDesc.value.length;

  titleCount.textContent = `${titleLen} / 60 recommended`;
  titleCount.className = "char-count" + charClass(titleLen, 60, 70);

  descCount.textContent = `${descLen} / 160 recommended`;
  descCount.className = "char-count" + charClass(descLen, 160, 200);
}

function charClass(len, warn, over) {
  if (len > over) return " over";
  if (len > warn) return " warn";
  return "";
}

function updateGoogle(title, desc, breadcrumb) {
  document.getElementById("googleUrl").textContent = breadcrumb;
  document.getElementById("googleTitle").textContent = truncate(title, 60);
  document.getElementById("googleDesc").textContent = truncate(desc, 160);
}

function updateX(title, desc, domain, image) {
  document.getElementById("xDomain").textContent = domain;
  document.getElementById("xTitle").textContent = truncate(title, 70);
  document.getElementById("xDesc").textContent = truncate(desc, 125);
  setPreviewImage("x", image);
}

function updateLinkedIn(title, domain, image) {
  document.getElementById("linkedinTitle").textContent = truncate(title, 100);
  document.getElementById("linkedinDomain").textContent = domain;
  setPreviewImage("linkedin", image);
}

function setPreviewImage(platform, src) {
  const img = document.getElementById(`${platform}Image`);
  const placeholder = document.getElementById(`${platform}ImagePlaceholder`);

  if (!src) {
    img.hidden = true;
    img.classList.add("hidden");
    placeholder.hidden = false;
    img.removeAttribute("src");
    return;
  }

  img.onload = () => {
    img.hidden = false;
    img.classList.remove("hidden");
    placeholder.hidden = true;
  };

  img.onerror = () => {
    img.hidden = true;
    img.classList.add("hidden");
    placeholder.hidden = false;
    placeholder.textContent = "Could not load image";
  };

  img.src = src;
  img.alt = pageTitle.value.trim() || "Preview image";
}

function updateOgSnippet(title, desc, url, image) {
  const lines = [
    `<meta property="og:title" content="${escapeAttr(title)}">`,
    `<meta property="og:description" content="${escapeAttr(desc)}">`,
    `<meta property="og:url" content="${escapeAttr(url)}">`,
    `<meta property="og:type" content="website">`,
  ];

  if (image) {
    lines.push(`<meta property="og:image" content="${escapeAttr(image)}">`);
  }

  lines.push(
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">`,
    `<meta name="twitter:title" content="${escapeAttr(title)}">`,
    `<meta name="twitter:description" content="${escapeAttr(desc)}">`
  );

  if (image) {
    lines.push(`<meta name="twitter:image" content="${escapeAttr(image)}">`);
  }

  ogSnippet.textContent = lines.join("\n");
}

function escapeAttr(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function copyOgTags() {
  try {
    await navigator.clipboard.writeText(ogSnippet.textContent);
    showToast("Open Graph tags copied!");
  } catch {
    showToast("Copy failed — select text manually");
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  const theme = saved || (prefersLight ? "light" : "dark");
  document.documentElement.setAttribute("data-theme", theme === "light" ? "light" : "");
  themeToggle.querySelector(".theme-icon").textContent = theme === "light" ? "☾" : "☀";
}

function toggleTheme() {
  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  const next = isLight ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next === "light" ? "light" : "");
  localStorage.setItem(THEME_KEY, next);
  themeToggle.querySelector(".theme-icon").textContent = next === "light" ? "☾" : "☀";
}

init();
