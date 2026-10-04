// Renders the fixed Plan-it app icon (same for every theme). Run: node scripts/make-icons.mjs
import sharp from "sharp";

const CREAM = "#fdf6ec", LILAC = "#9b83cf", INK = "#5b4360";

// The notepad scene, drawn in a 512x512 space and centred. `scale` shrinks it for maskable/safe-zone use.
const scene = (scale) => `
<g transform="translate(256 256) scale(${scale}) rotate(-6) translate(-256 -256)">
  <rect x="124" y="104" width="268" height="318" rx="22" fill="#000" opacity=".10" transform="translate(6 10)"/>
  <rect x="124" y="104" width="268" height="318" rx="22" fill="#fffdf9" stroke="#e6d9c6" stroke-width="4"/>
  <rect x="124" y="104" width="268" height="52" rx="22" fill="#f1e6d4"/>
  <rect x="124" y="134" width="268" height="22" fill="#f1e6d4"/>
  <g fill="#fffdf9" stroke="${INK}" stroke-width="7">
    <circle cx="190" cy="104" r="13"/><circle cx="258" cy="104" r="13"/><circle cx="326" cy="104" r="13"/>
  </g>
  <g fill="${INK}"><circle cx="190" cy="104" r="4"/><circle cx="258" cy="104" r="4"/><circle cx="326" cy="104" r="4"/></g>
  <g stroke="${LILAC}" stroke-width="6" fill="#fffdf9">
    <rect x="156" y="186" width="42" height="42" rx="9"/>
    <rect x="156" y="256" width="42" height="42" rx="9"/>
    <rect x="156" y="326" width="42" height="42" rx="9" stroke="#cfc3e6"/>
  </g>
  <g fill="none" stroke="${LILAC}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
    <path d="M165 208 L174 218 L190 195"/><path d="M165 278 L174 288 L190 265"/>
  </g>
  <g fill="#d9cfc0">
    <rect x="216" y="199" width="132" height="15" rx="7.5"/>
    <rect x="216" y="269" width="104" height="15" rx="7.5"/>
    <rect x="216" y="339" width="118" height="15" rx="7.5"/>
  </g>
  <!-- orange pen resting across the bottom right corner -->
  <g transform="translate(396 418) rotate(-45)">
    <rect x="-96" y="-12" width="160" height="24" rx="6" fill="#f08a24"/>
    <rect x="-96" y="-12" width="160" height="8" rx="4" fill="#f9a64f"/>
    <rect x="-100" y="-12" width="16" height="24" rx="5" fill="#d9701a"/>
    <path d="M64 -12 L100 0 L64 12 Z" fill="#f3d9b4"/>
    <path d="M90 -3.5 L100 0 L90 3.5 Z" fill="${INK}"/>
    <rect x="-52" y="-12" width="6" height="24" fill="#d9701a" opacity=".7"/>
  </g>
</g>`;

const svg = (scale, radius) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
<rect width="512" height="512" rx="${radius}" fill="${CREAM}"/>${scene(scale)}</svg>`;

const out = async (name, s, size) => sharp(Buffer.from(s)).resize(size, size).png().toFile(`public/icons/${name}`);
await out("icon-512.png", svg(0.92, 112), 512);
await out("icon-192.png", svg(0.92, 112), 192);
await out("icon-maskable-512.png", svg(0.72, 0), 512); // full bleed, scene inside the safe zone
// iOS rounds the corners itself, so these are square and opaque
for (const size of [120, 152, 167, 180]) await out(`apple-touch-icon-${size}.png`, svg(0.84, 0), size);
await out("apple-touch-icon.png", svg(0.84, 0), 180);
// Small monochrome mark for the Android status bar
const badge = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><g fill="none" stroke="#000" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"><rect x="18" y="16" width="60" height="68" rx="9"/><path d="M32 8v14M48 8v14M64 8v14"/><path d="M32 46l7 7 13-14"/><path d="M32 68h32" stroke-width="7"/></g></svg>`;
await sharp(Buffer.from(badge)).png().toFile("public/icons/badge-96.png");
console.log("icons written");
