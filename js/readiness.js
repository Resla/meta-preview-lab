function computeReadinessScore(meta, dimensions) {
  const { title, description, image, url, raw } = meta;
  let score = 0;
  const breakdown = [];

  function add(points, label, passed) {
    if (passed) {
      score += points;
      breakdown.push({ label, points, passed: true });
    } else {
      breakdown.push({ label, points, passed: false });
    }
  }

  const hasTitle = Boolean(title);
  const hasOgTitle = Boolean(raw?.ogTitle || (raw && !raw.ogTitle && title));
  add(10, "Page title", hasTitle);
  add(5, "og:title tag", Boolean(raw?.ogTitle) || hasTitle);
  add(10, "Title length (≤60)", hasTitle && title.length <= 60);

  const hasDesc = Boolean(description);
  add(10, "Description", hasDesc);
  add(5, "og:description tag", Boolean(raw?.ogDescription) || hasDesc);
  add(10, "Description length (≤160)", hasDesc && description.length <= 160);

  add(15, "Share image (og:image)", Boolean(image));
  add(5, "Image uses HTTPS", !image || image.startsWith("https://"));

  const dimStatus = dimensions ? imageDimensionStatus(dimensions) : null;
  add(10, "Image size & ratio", image && dimStatus?.level === "ok");
  if (image && dimStatus?.level === "warn") score += 5;

  add(5, "twitter:card tag", Boolean(raw?.twitterCard) || Boolean(image));
  add(5, "og:url tag", Boolean(raw?.ogUrl) || Boolean(url));
  add(5, "meta description", Boolean(raw?.metaDescription) || hasDesc);
  add(5, "<title> tag", Boolean(raw?.documentTitle) || hasTitle);

  score = Math.min(100, Math.round(score));

  return { score, breakdown, verdict: scoreVerdict(score) };
}

function scoreVerdict(score) {
  if (score >= 90) return "Ready to share — your link looks great.";
  if (score >= 70) return "Almost there — a few tweaks will polish your card.";
  if (score >= 45) return "Needs work — fix the checklist below before posting.";
  return "Not ready — add missing metadata to avoid broken previews.";
}

function buildFixChecklist(meta, dimensions, auditItems) {
  const fixes = [];
  const { title, description, image, raw } = meta;

  if (!title) {
    fixes.push(fix("Add a page title", "Every share card needs a headline. Fill in the title field above."));
  } else if (title.length > 60) {
    fixes.push(fix("Shorten your title", `Currently ${title.length} chars — aim for 60 or fewer so it doesn't get cut off.`));
  }

  if (!raw?.ogTitle && title) {
    fixes.push(fix("Add og:title to your site", "Your title exists but og:title is missing. Paste the head snippet into your HTML."));
  }

  if (!description) {
    fixes.push(fix("Add a description", "Write 1–2 sentences that make people want to click."));
  } else if (description.length > 160) {
    fixes.push(fix("Shorten your description", `Currently ${description.length} chars — Google truncates around 160.`));
  }

  if (!raw?.ogDescription && description) {
    fixes.push(fix("Add og:description to your site", "Include og:description in your page <head>."));
  }

  if (!image) {
    fixes.push(fix("Add a share image", "Upload a 1200×630 PNG to your site and set og:image. Cards without images get ignored."));
  } else {
    if (!image.startsWith("https://")) {
      fixes.push(fix("Use HTTPS for your image", "Change the image URL to https:// for LinkedIn and X compatibility."));
    }
    const dimStatus = dimensions ? imageDimensionStatus(dimensions) : null;
    if (dimStatus?.level === "error") {
      fixes.push(fix("Fix image size", dimStatus.text));
    } else if (dimStatus?.level === "warn") {
      fixes.push(fix("Improve image dimensions", dimStatus.text));
    }
  }

  if (image && !raw?.twitterCard) {
    fixes.push(fix('Add twitter:card meta tag', 'Set content="summary_large_image" when you have an image.'));
  }

  if (!raw?.ogUrl) {
    fixes.push(fix("Add og:url tag", "Helps platforms link to the correct canonical URL."));
  }

  if (!raw?.metaDescription && description) {
    fixes.push(fix("Add meta name=description", "Improves Google search snippets alongside og:description."));
  }

  if (fixes.length === 0) {
    fixes.push({
      title: "All clear",
      detail: "Your draft metadata looks good. Copy the head snippet and deploy.",
      done: true,
    });
  }

  return fixes;
}

function fix(title, detail) {
  return { title, detail, done: false };
}

function buildHeadSnippet(title, desc, url, image) {
  const lines = [
    "<!-- Social share metadata — paste inside <head> -->",
    `<title>${escapeSnippet(title)}</title>`,
    `<meta name="description" content="${escapeSnippet(desc)}">`,
    "",
    `<meta property="og:title" content="${escapeSnippet(title)}">`,
    `<meta property="og:description" content="${escapeSnippet(desc)}">`,
    `<meta property="og:url" content="${escapeSnippet(url)}">`,
    `<meta property="og:type" content="website">`,
  ];

  if (image) {
    lines.push(`<meta property="og:image" content="${escapeSnippet(image)}">`);
    lines.push(`<meta property="og:image:width" content="1200">`);
    lines.push(`<meta property="og:image:height" content="630">`);
  }

  lines.push(
    "",
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">`,
    `<meta name="twitter:title" content="${escapeSnippet(title)}">`,
    `<meta name="twitter:description" content="${escapeSnippet(desc)}">`
  );

  if (image) {
    lines.push(`<meta name="twitter:image" content="${escapeSnippet(image)}">`);
  }

  return lines.join("\n");
}

function escapeSnippet(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formToMeta(title, description, image, url) {
  return {
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
}

function compareFields(live, draft) {
  const fields = [
    { key: "title", label: "Title" },
    { key: "description", label: "Description" },
    { key: "image", label: "Image" },
    { key: "url", label: "URL" },
  ];

  return fields.map(({ key, label }) => {
    const liveVal = live?.[key] || "";
    const draftVal = draft?.[key] || "";
    const changed = liveVal !== draftVal;
    return {
      label,
      live: formatCompareValue(key, liveVal),
      draft: formatCompareValue(key, draftVal),
      changed,
    };
  });
}

function formatCompareValue(key, value) {
  if (!value) return "— missing —";
  if (key === "image") return value.length > 40 ? value.slice(0, 38) + "…" : value;
  if (key === "description") return value.length > 60 ? value.slice(0, 58) + "…" : value;
  if (key === "title") return value.length > 50 ? value.slice(0, 48) + "…" : value;
  return value.length > 45 ? value.slice(0, 43) + "…" : value;
}

function liveMetaFromFetch(metadata) {
  return {
    title: metadata.title,
    description: metadata.description,
    image: metadata.image,
    url: metadata.url,
    raw: metadata.raw,
  };
}
