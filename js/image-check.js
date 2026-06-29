const RECOMMENDED_WIDTH = 1200;
const RECOMMENDED_HEIGHT = 630;
const RECOMMENDED_RATIO = RECOMMENDED_WIDTH / RECOMMENDED_HEIGHT;

let imageCheckToken = 0;

function checkImageDimensions(url) {
  return new Promise((resolve) => {
    if (!url) {
      resolve(null);
      return;
    }

    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        loaded: true,
      });
    };
    img.onerror = () => {
      resolve({ loaded: false });
    };
    img.src = url;
  });
}

function imageDimensionStatus(dimensions) {
  if (!dimensions) return null;

  if (!dimensions.loaded) {
    return { level: "error", text: "Image could not be loaded" };
  }

  const { width, height } = dimensions;
  const ratio = width / height;
  const ratioDiff = Math.abs(ratio - RECOMMENDED_RATIO);
  const sizeText = `${width} × ${height}px`;

  if (width >= RECOMMENDED_WIDTH && height >= RECOMMENDED_HEIGHT && ratioDiff < 0.05) {
    return { level: "ok", text: `${sizeText} — ideal for social cards` };
  }

  if (width < 600 || height < 315) {
    return { level: "error", text: `${sizeText} — too small (min ~600×315)` };
  }

  if (ratioDiff > 0.15) {
    return { level: "warn", text: `${sizeText} — aspect ratio differs from 1.91:1` };
  }

  return { level: "warn", text: `${sizeText} — recommended 1200×630` };
}

async function runImageCheck(url, onResult) {
  const token = ++imageCheckToken;
  const dimensions = await checkImageDimensions(url);

  if (token !== imageCheckToken) return;

  onResult(dimensions, imageDimensionStatus(dimensions));
}

function augmentAuditWithImageSize(items, dimensions) {
  const status = imageDimensionStatus(dimensions);

  return items.map((item) => {
    if (item.tag !== "og:image" && item.tag !== "twitter:image") return item;

    if (!status) return item;

    return { ...item, extra: status };
  });
}
