// One-off: renders the Plan-it app icons from the bow artwork. Run: node scripts/make-icons.mjs
import sharp from "sharp";

const bow = (scale) => `
<g transform="translate(256 256) scale(${scale}) translate(-24 -16)">
  <path d="M22 20 L14 30 L21 28 L24 22Z" fill="#e58fb0"/>
  <path d="M26 20 L34 30 L27 28 L24 22Z" fill="#e58fb0"/>
  <path d="M24 16 C14 1 1 3 2 15 C3 28 15 28 24 16Z" fill="#f6b3cf" stroke="#c2467f" stroke-width="1.4" stroke-linejoin="round"/>
  <path d="M24 16 C34 1 47 3 46 15 C45 28 33 28 24 16Z" fill="#f6b3cf" stroke="#c2467f" stroke-width="1.4" stroke-linejoin="round"/>
  <path d="M9 11 C11 8 15 8 18 11" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>
  <path d="M30 11 C33 8 37 8 39 11" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>
  <rect x="20" y="11" width="8" height="10" rx="4" fill="#c2467f"/>
</g>`;
const svg = (scale, radius) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fdeef5"/><stop offset="1" stop-color="#f3c9dd"/></linearGradient></defs>
<rect width="512" height="512" rx="${radius}" fill="url(#g)"/>${bow(scale)}</svg>`;

const out = async (name, s, size) => sharp(Buffer.from(s)).resize(size, size).png().toFile(`public/icons/${name}`);
await out("icon-512.png", svg(7.6, 112), 512);
await out("icon-192.png", svg(7.6, 112), 192);
await out("icon-maskable-512.png", svg(5.6, 0), 512); // full bleed, bow inside the safe zone
await out("apple-touch-icon.png", svg(6.4, 0), 180);   // iOS rounds the corners itself
await out("badge-96.png", `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><g fill="#000">${bow(7.6).replace(/fill="#[0-9a-f]+"/gi, 'fill="#000"').replace(/stroke="#[0-9a-f]+"/gi, 'stroke="#000"')}</g></svg>`, 96);
console.log("icons written");
