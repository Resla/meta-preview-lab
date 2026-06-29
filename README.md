# Meta Preview Lab

See how your link looks on **Google**, **X**, and **LinkedIn** before you share it. Type your title, description, and image URL — previews update live.

Perfect for polishing READMEs, portfolio pages, and blog posts before posting on social media.

## Features

### Phase 1 — Share readiness
- **Share Readiness Score (0–100)** — instant verdict on whether your link is ready to post
- **Fix checklist** — plain-English action items, not just technical audit lines
- **Live vs draft comparison** — see what changed after you fetch and edit
- **Full `<head>` snippet** — copy-paste ready block with title, description, OG, and Twitter tags
- **3-step fix guide** — copy → paste in index.html → push and re-fetch

### Core tools
- **Fetch from URL** — pull real `og:*` tags from any public page
- **Metadata audit** — technical pass/warn/fail for each tag
- **6 platform previews** — Google, X, LinkedIn, Facebook, Discord, Slack
- **Image dimension checker** — validates size and 1.91:1 aspect ratio
- **Character counters** with SEO-friendly limits (60 / 160)
- **Dark & light mode**

## How fetch works

Browsers can't read other websites directly (CORS). The **Fetch** button uses a public CORS proxy to download the page HTML, then parses:

- `og:title`, `og:description`, `og:image`, `og:url`
- `twitter:*` tags as fallbacks
- `<title>` and `meta name="description"` as last resort

Try it with `https://resla.github.io/focus-desk/` after you've added OG tags.

## Live demo

```
https://<your-username>.github.io/meta-preview-lab/
```

## Run locally

Open `index.html` in a browser, or:

```bash
python -m http.server 8080
```

## Use case

You just shipped [Focus Desk](https://github.com/Resla/focus-desk) and want to tweet about it. Paste your title, GitHub Pages URL, description, and a screenshot URL — instantly see if the card will look good.

## Tech stack

- Vanilla HTML, CSS, JavaScript
- IBM Plex Sans & Mono via Google Fonts
- No build step, no dependencies

## License

MIT
