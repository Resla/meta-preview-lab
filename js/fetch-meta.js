const CORS_PROXIES = [
  {
    name: "allorigins",
    buildUrl: (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    parse: async (response) => {
      const data = await response.json();
      return data.contents || "";
    },
  },
  {
    name: "corsproxy",
    buildUrl: (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    parse: async (response) => response.text(),
  },
];

async function fetchPageHtml(urlString) {
  let lastError = null;

  for (const proxy of CORS_PROXIES) {
    try {
      const response = await fetch(proxy.buildUrl(urlString), {
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        lastError = new Error(`Proxy ${proxy.name} returned HTTP ${response.status}`);
        continue;
      }

      const html = await proxy.parse(response);

      if (html && html.length > 0) {
        return html;
      }

      lastError = new Error(`Proxy ${proxy.name} returned empty content`);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Could not fetch the page — try again or paste metadata manually");
}

function getMetaContent(doc, selectors) {
  for (const selector of selectors) {
    const el = doc.querySelector(selector);
    if (!el) continue;

    const content = el.getAttribute("content")?.trim();
    if (content) return content;

    if (el.tagName === "TITLE") {
      return el.textContent.trim();
    }
  }

  return "";
}

function resolveAbsoluteUrl(value, baseUrl) {
  if (!value) return "";
  try {
    return new URL(value, baseUrl).href;
  } catch {
    return value;
  }
}

function parseMetadata(html, pageUrl) {
  const doc = new DOMParser().parseFromString(html, "text/html");

  const raw = {
    ogTitle: getMetaContent(doc, ['meta[property="og:title"]', 'meta[name="og:title"]']),
    ogDescription: getMetaContent(doc, [
      'meta[property="og:description"]',
      'meta[name="og:description"]',
    ]),
    ogImage: getMetaContent(doc, ['meta[property="og:image"]', 'meta[name="og:image"]']),
    ogUrl: getMetaContent(doc, ['meta[property="og:url"]', 'meta[name="og:url"]']),
    twitterTitle: getMetaContent(doc, ['meta[name="twitter:title"]']),
    twitterDescription: getMetaContent(doc, ['meta[name="twitter:description"]']),
    twitterImage: getMetaContent(doc, ['meta[name="twitter:image"]', 'meta[name="twitter:image:src"]']),
    twitterCard: getMetaContent(doc, ['meta[name="twitter:card"]']),
    metaDescription: getMetaContent(doc, ['meta[name="description"]']),
    documentTitle: doc.querySelector("title")?.textContent?.trim() || "",
  };

  const title = raw.ogTitle || raw.twitterTitle || raw.documentTitle;
  const description = raw.ogDescription || raw.twitterDescription || raw.metaDescription;
  const image = resolveAbsoluteUrl(raw.ogImage || raw.twitterImage, pageUrl);
  const url = resolveAbsoluteUrl(raw.ogUrl, pageUrl) || pageUrl;

  return {
    title,
    description,
    image,
    url,
    raw,
  };
}

async function fetchMetadata(urlString) {
  let parsedUrl;

  try {
    parsedUrl = new URL(urlString);
  } catch {
    throw new Error("Enter a valid URL (include https://)");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Only http and https URLs are supported");
  }

  const html = await fetchPageHtml(parsedUrl.href);
  return parseMetadata(html, parsedUrl.href);
}

function buildAuditItems(metadata) {
  const { title, description, image, url, raw } = metadata;
  const items = [];

  if (raw.ogTitle) {
    items.push(auditItem("ok", "og:title", `Found — "${truncateAudit(raw.ogTitle, 50)}"`, titleLengthStatus(title.length)));
  } else if (title) {
    items.push(auditItem("warn", "og:title", "Missing — using <title> tag as fallback", titleLengthStatus(title.length)));
  } else {
    items.push(auditItem("error", "og:title", "Missing — no title found on page"));
  }

  if (raw.ogDescription) {
    items.push(auditItem("ok", "og:description", `Found — "${truncateAudit(raw.ogDescription, 50)}"`, descLengthStatus(description.length)));
  } else if (description) {
    items.push(auditItem("warn", "og:description", "Missing — using meta description as fallback", descLengthStatus(description.length)));
  } else {
    items.push(auditItem("error", "og:description", "Missing — no description found"));
  }

  if (raw.ogImage || raw.twitterImage) {
    const source = raw.ogImage ? "og:image" : "twitter:image";
    items.push(auditItem("ok", source, "Found", imageUrlStatus(image)));
  } else {
    items.push(auditItem("error", "og:image", "Missing — social cards won't show an image"));
  }

  if (raw.twitterCard) {
    items.push(auditItem("ok", "twitter:card", `Found — "${raw.twitterCard}"`));
  } else if (image) {
    items.push(auditItem("warn", "twitter:card", 'Missing — add content="summary_large_image"'));
  } else {
    items.push(auditItem("warn", "twitter:card", "Missing — add twitter:card meta tag"));
  }

  if (raw.ogUrl) {
    items.push(auditItem("ok", "og:url", `Found — ${truncateAudit(raw.ogUrl, 40)}`));
  } else {
    items.push(auditItem("warn", "og:url", "Missing — recommended for canonical link"));
  }

  if (raw.documentTitle) {
    items.push(auditItem("ok", "<title>", `Found — "${truncateAudit(raw.documentTitle, 50)}"`));
  } else {
    items.push(auditItem("warn", "<title>", "Missing — important for Google search"));
  }

  if (raw.metaDescription) {
    items.push(auditItem("ok", "meta description", `Found — "${truncateAudit(raw.metaDescription, 50)}"`));
  } else {
    items.push(auditItem("warn", "meta description", "Missing — Google may auto-generate a snippet"));
  }

  return items;
}

function auditItem(level, tag, message, extra) {
  const item = { level, tag, message };
  if (extra) item.extra = extra;
  return item;
}

function titleLengthStatus(len) {
  if (len > 70) return { level: "error", text: `${len} chars — too long (recommended ≤60)` };
  if (len > 60) return { level: "warn", text: `${len} chars — slightly long (recommended ≤60)` };
  return { level: "ok", text: `${len} chars — good length` };
}

function descLengthStatus(len) {
  if (len > 200) return { level: "error", text: `${len} chars — too long (recommended ≤160)` };
  if (len > 160) return { level: "warn", text: `${len} chars — slightly long (recommended ≤160)` };
  return { level: "ok", text: `${len} chars — good length` };
}

function imageUrlStatus(imageUrl) {
  if (!imageUrl) return null;
  if (!imageUrl.startsWith("https://")) {
    return { level: "warn", text: "Use HTTPS for best compatibility" };
  }
  return { level: "ok", text: "HTTPS URL" };
}

function truncateAudit(text, max) {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}

function buildAuditFromForm(title, description, image, url) {
  const metadata = {
    title,
    description,
    image,
    url,
    raw: {
      ogTitle: title,
      ogDescription: description,
      ogImage: image,
      ogUrl: url,
      twitterCard: image ? "summary_large_image" : "",
      twitterImage: image,
      documentTitle: title,
      metaDescription: description,
    },
  };

  return buildAuditItems(metadata).map((item) => {
    if (item.tag === "og:title" && title) item.message = `Draft — "${truncateAudit(title, 50)}"`;
    if (item.tag === "og:description" && description) item.message = `Draft — "${truncateAudit(description, 50)}"`;
    return item;
  });
}
