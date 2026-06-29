const THEME_KEY = "meta-preview-lab-theme";
const RING_CIRCUMFERENCE = 2 * Math.PI * 34;

const pageTitle = document.getElementById("pageTitle");
const pageUrl = document.getElementById("pageUrl");
const pageDesc = document.getElementById("pageDesc");
const imageUrl = document.getElementById("imageUrl");
const titleCount = document.getElementById("titleCount");
const descCount = document.getElementById("descCount");
const imageDimensions = document.getElementById("imageDimensions");
const headSnippet = document.getElementById("headSnippet");
const copyHead = document.getElementById("copyHead");
const fetchBtn = document.getElementById("fetchBtn");
const fetchStatus = document.getElementById("fetchStatus");
const auditList = document.getElementById("auditList");
const auditSummary = document.getElementById("auditSummary");
const readinessScore = document.getElementById("readinessScore");
const readinessVerdict = document.getElementById("readinessVerdict");
const scoreDelta = document.getElementById("scoreDelta");
const scoreRingFill = document.querySelector(".score-ring-fill");
const comparePanel = document.getElementById("comparePanel");
const compareBody = document.getElementById("compareBody");
const fixList = document.getElementById("fixList");
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
let liveSnapshot = null;
let liveScore = null;
let captureLiveScore = false;

function init() {
  loadTheme();
  prefillDemo();
  bindEvents();
  updateAll();
}

function prefillDemo() {
  pageUrl.value = "https://resla.github.io/focus-desk/";
}

function bindEvents() {
  inputs.forEach((input) => input.addEventListener("input", onInputChange));
  copyHead.addEventListener("click", copyHeadSnippet);
  fetchBtn.addEventListener("click", handleFetch);
  themeToggle.addEventListener("click", toggleTheme);

  pageUrl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleFetch();
    }
  });

  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      applyPreviewFilter(btn.dataset.filter);
    });
  });
}

function onInputChange() {
  updateFetchStatus("");
  updateAll();
}

function getDraftMeta() {
  return formToMeta(
    pageTitle.value.trim(),
    pageDesc.value.trim(),
    imageUrl.value.trim(),
    pageUrl.value.trim()
  );
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
  updateFacebook(title, desc, domain, image);
  updateDiscord(title, desc, image);
  updateSlack(title, desc, domain, image);
  updateHeadSnippet(title, desc, url, image);

  runImageCheck(image, (dimensions) => {
    updateImageDimensionHint(imageDimensionStatus(dimensions));

    const draftMeta = getDraftMeta();
    const draftResult = computeReadinessScore(draftMeta, dimensions);

    if (captureLiveScore && liveSnapshot) {
      liveScore = computeReadinessScore(
        liveMetaFromFetch({
          title: liveSnapshot.title,
          description: liveSnapshot.description,
          image: liveSnapshot.image,
          url: liveSnapshot.url,
          raw: liveSnapshot.raw,
        }),
        dimensions
      ).score;
      captureLiveScore = false;
    }

    renderScore(draftResult);
    renderFixList(buildFixChecklist(draftMeta, dimensions));
    renderCompare(draftMeta);
    renderAudit(augmentAuditWithImageSize(buildAuditFromForm(
      pageTitle.value.trim(),
      pageDesc.value.trim(),
      image,
      url
    ), dimensions));
  });
}

async function handleFetch() {
  const url = pageUrl.value.trim();

  if (!url) {
    showToast("Enter a URL first");
    pageUrl.focus();
    return;
  }

  setFetchLoading(true);
  updateFetchStatus("Fetching live metadata (usually 2–5 sec)…");

  try {
    const metadata = await fetchMetadata(url);

    liveSnapshot = {
      title: metadata.title,
      description: metadata.description,
      image: metadata.image,
      url: metadata.url,
      raw: { ...metadata.raw },
    };

    pageTitle.value = metadata.title;
    pageDesc.value = metadata.description;
    pageUrl.value = metadata.url;
    imageUrl.value = metadata.image;

    liveScore = null;
    captureLiveScore = true;

    updateFetchStatus(`Fetched from ${new URL(metadata.url).hostname}`);
    updateAll();
    showToast("Live metadata loaded!");
  } catch (error) {
    updateFetchStatus("");
    showToast(error.message || "Fetch failed");
    renderAudit([]);
    auditSummary.textContent = "Fetch failed — check the URL and try again";
  } finally {
    setFetchLoading(false);
  }
}

function renderScore(result) {
  readinessScore.textContent = result.score;
  readinessVerdict.textContent = result.verdict;

  const offset = RING_CIRCUMFERENCE * (1 - result.score / 100);
  scoreRingFill.style.strokeDashoffset = offset;
  scoreRingFill.classList.remove("score-low", "score-mid", "score-high");
  if (result.score >= 80) scoreRingFill.classList.add("score-high");
  else if (result.score >= 50) scoreRingFill.classList.add("score-mid");
  else scoreRingFill.classList.add("score-low");

  if (liveSnapshot && liveScore !== null) {
    const delta = result.score - liveScore;
    if (delta > 0) {
      scoreDelta.textContent = `↑ +${delta} pts from live site (${liveScore} → ${result.score})`;
      scoreDelta.classList.remove("hidden");
    } else if (delta < 0) {
      scoreDelta.textContent = `↓ ${delta} pts from live site (${liveScore} → ${result.score})`;
      scoreDelta.classList.remove("hidden");
    } else {
      scoreDelta.textContent = `Same as live site (${liveScore} pts)`;
      scoreDelta.classList.remove("hidden");
    }
  } else {
    scoreDelta.classList.add("hidden");
  }
}

function renderCompare(draftMeta) {
  if (!liveSnapshot) {
    comparePanel.classList.add("hidden");
    return;
  }

  comparePanel.classList.remove("hidden");
  const rows = compareFields(liveSnapshot, draftMeta);

  compareBody.innerHTML = rows
    .map(
      (row) => `<tr class="${row.changed ? "compare-changed" : ""}">
        <td>${escapeHtml(row.label)}</td>
        <td>${escapeHtml(row.live)}</td>
        <td>${escapeHtml(row.draft)}${row.changed ? ' <span class="compare-badge">edited</span>' : ""}</td>
      </tr>`
    )
    .join("");
}

function renderFixList(fixes) {
  if (!fixes.length) {
    fixList.innerHTML = '<li class="fix-empty">Your action items will appear here.</li>';
    return;
  }

  fixList.innerHTML = fixes
    .map(
      (item) => `<li class="fix-item ${item.done ? "fix-done" : ""}">
        <span class="fix-icon" aria-hidden="true">${item.done ? "✓" : "→"}</span>
        <div>
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.detail)}</p>
        </div>
      </li>`
    )
    .join("");
}

function updateImageDimensionHint(status) {
  if (!status) {
    imageDimensions.textContent = "";
    imageDimensions.className = "field-hint image-dimensions";
    return;
  }

  imageDimensions.textContent = status.text;
  imageDimensions.className = `field-hint image-dimensions dim-${status.level}`;
}

function applyPreviewFilter(filter) {
  document.querySelectorAll(".preview-card").forEach((card) => {
    const platform = card.dataset.platform;
    const show = filter === "all" || platform === filter;
    card.classList.toggle("hidden", !show);
  });
}

function setFetchLoading(loading) {
  fetchBtn.disabled = loading;
  fetchBtn.textContent = loading ? "Fetching…" : "Fetch";
}

function updateFetchStatus(message) {
  fetchStatus.textContent = message;
}

function renderAudit(items) {
  if (!items.length) {
    auditList.innerHTML =
      '<li class="audit-empty">Fetch a URL to audit its live metadata, or fill in the fields to check your draft.</li>';
    auditSummary.textContent = "";
    return;
  }

  const errors = items.filter((i) => i.level === "error").length;
  const warns = items.filter((i) => i.level === "warn").length;
  const oks = items.filter((i) => i.level === "ok").length;

  auditSummary.textContent = liveSnapshot
    ? `Draft audit — ${oks} ok · ${warns} warnings · ${errors} issues`
    : `${oks} passed · ${warns} warnings · ${errors} missing`;

  auditList.innerHTML = items
    .map((item) => {
      const icon = item.level === "ok" ? "✓" : item.level === "warn" ? "!" : "✕";
      const extra = item.extra
        ? `<span class="audit-extra audit-${item.extra.level}">${escapeHtml(item.extra.text)}</span>`
        : "";

      return `<li class="audit-item audit-${item.level}">
        <span class="audit-icon" aria-hidden="true">${icon}</span>
        <div class="audit-body">
          <span class="audit-tag">${escapeHtml(item.tag)}</span>
          <span class="audit-message">${escapeHtml(item.message)}</span>
          ${extra}
        </div>
      </li>`;
    })
    .join("");
}

function parseUrl(urlString) {
  try {
    const url = new URL(urlString);
    const domain = url.hostname.replace(/^www\./, "");
    const path = url.pathname.replace(/\/$/, "").split("/").filter(Boolean);
    const breadcrumb = path.length ? `${domain} › ${path.join(" › ")}` : domain;
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

function updateFacebook(title, desc, domain, image) {
  document.getElementById("facebookDomain").textContent = domain.toUpperCase();
  document.getElementById("facebookTitle").textContent = truncate(title, 80);
  document.getElementById("facebookDesc").textContent = truncate(desc, 110);
  setPreviewImage("facebook", image);
}

function updateDiscord(title, desc, image) {
  document.getElementById("discordTitle").textContent = truncate(title, 256);
  document.getElementById("discordDesc").textContent = truncate(desc, 200);
  setPreviewImage("discord", image);
}

function updateSlack(title, desc, domain, image) {
  document.getElementById("slackTitle").textContent = truncate(title, 80);
  document.getElementById("slackDesc").textContent = truncate(desc, 140);
  document.getElementById("slackDomain").textContent = domain;
  setPreviewImage("slack", image);
}

function setPreviewImage(platform, src) {
  const img = document.getElementById(`${platform}Image`);
  const placeholder = document.getElementById(`${platform}ImagePlaceholder`);

  if (!src) {
    img.hidden = true;
    img.classList.add("hidden");
    placeholder.hidden = false;
    placeholder.textContent = getPlaceholderText(platform);
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

function getPlaceholderText(platform) {
  const labels = {
    x: "1200 × 630 image preview",
    linkedin: "Image preview",
    facebook: "Image preview",
    discord: "Embed image",
    slack: "Unfurl image",
  };
  return labels[platform] || "Image preview";
}

function updateHeadSnippet(title, desc, url, image) {
  headSnippet.textContent = buildHeadSnippet(title, desc, url, image);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function copyHeadSnippet() {
  try {
    await navigator.clipboard.writeText(headSnippet.textContent);
    showToast("Head snippet copied!");
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
