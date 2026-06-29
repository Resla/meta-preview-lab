# Meta Preview Lab

See how your link looks on **Google**, **X**, and **LinkedIn** before you share it. Type your title, description, and image URL — previews update live.

Perfect for polishing READMEs, portfolio pages, and blog posts before posting on social media.

## Features

- **Fetch from URL** — paste a live link and pull real `og:*` tags from the page
- **Metadata audit** — see what's found, missing, or too long (title, description, image, Twitter card)
- **Live Google search snippet** preview with title, URL breadcrumb, and description
- **X / Twitter card** preview with large-image layout
- **LinkedIn link preview** mockup
- **Open Graph tag generator** — copy-paste ready `<meta>` tags
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
