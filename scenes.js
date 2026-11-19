// Sviittien elävät näkymät (SVG + CSS-animaatiot) ja kuvakatselu.
// Jokainen näkymä piirretään koodilla, joten kuvatiedostoja ei tarvita.
(() => {
  const W = 800, H = 600;
  let uidCounter = 0;

  // Toistettava satunnaislukugeneraattori, jotta näkymät pysyvät samoina
  const rngFrom = (seed) => () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const f = (n) => n.toFixed(1);
  const delay = (rng, max = 6) => `style="animation-delay:-${f(rng() * max)}s"`;

  // ---------- Yhteiset osat ----------
  const defs = (u) => `
    <defs>
      <linearGradient id="${u}sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0f1230"/>
        <stop offset=".45" stop-color="#33275a"/>
        <stop offset=".78" stop-color="#a8607f"/>
        <stop offset="1" stop-color="#f2b38a"/>
      </linearGradient>
      <radialGradient id="${u}glow">
        <stop offset="0" stop-color="#ffdcae" stop-opacity=".65"/>
        <stop offset=".4" stop-color="#ffc98f" stop-opacity=".22"/>
        <stop offset="1" stop-color="#ffc98f" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="${u}cyan">
        <stop offset="0" stop-color="#7fe6f2" stop-opacity=".6"/>
        <stop offset="1" stop-color="#7fe6f2" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="${u}wood" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#3a2b20"/>
        <stop offset="1" stop-color="#140e0a"/>
      </linearGradient>
      <linearGradient id="${u}marble" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#3b3734"/>
        <stop offset="1" stop-color="#161413"/>
      </linearGradient>
      <linearGradient id="${u}refl" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f2b38a" stop-opacity=".28"/>
        <stop offset="1" stop-color="#33275a" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="${u}pool" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#5fd0dd"/>
        <stop offset="1" stop-color="#145a72"/>
      </linearGradient>
      <linearGradient id="${u}glass" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#1d1b30"/>
        <stop offset=".5" stop-color="#2a2540"/>
        <stop offset="1" stop-color="#121120"/>
      </linearGradient>
      <linearGradient id="${u}sofa" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#e9dfd1"/>
        <stop offset=".55" stop-color="#cdbfae"/>
        <stop offset="1" stop-color="#8f8172"/>
      </linearGradient>
      <linearGradient id="${u}sofaSeat" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#d8cbbb"/>
        <stop offset="1" stop-color="#9c8d7d"/>
      </linearGradient>
      <linearGradient id="${u}linen" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f7f2ea"/>
        <stop offset=".6" stop-color="#e2d8ca"/>
        <stop offset="1" stop-color="#b9ab99"/>
      </linearGradient>
      <linearGradient id="${u}porcelain" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#d9d4cc"/>
        <stop offset=".35" stop-color="#fbf9f5"/>
        <stop offset="1" stop-color="#b8b2a8"/>
      </linearGradient>
      <linearGradient id="${u}haze" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#c77f8f" stop-opacity="0"/>
        <stop offset="1" stop-color="#e9a58e" stop-opacity=".38"/>
      </linearGradient>
      <radialGradient id="${u}vig" cx=".5" cy=".5" r=".75">
        <stop offset=".55" stop-color="#000" stop-opacity="0"/>
        <stop offset="1" stop-color="#000" stop-opacity=".6"/>
      </radialGradient>
      <radialGradient id="${u}warm" cx=".45" cy=".25" r=".8">
        <stop offset="0" stop-color="#ffcf9a" stop-opacity=".12"/>
        <stop offset="1" stop-color="#ffcf9a" stop-opacity="0"/>
      </radialGradient>
      <filter id="${u}far" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="1.1"/></filter>
      <filter id="${u}mid" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation=".45"/></filter>
      <filter id="${u}shadow" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="9"/></filter>
      <filter id="${u}bloom" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
      <filter id="${u}grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/>
        <feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .9 0"/>
      </filter>
    </defs>`;

  const sky = (u, rng, x, y, w, h, stars = 40) => {
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${u}sky)"/>`;
    for (let i = 0; i < stars; i++) {
      const tw = rng() < 0.4;
      s += `<circle cx="${f(x + rng() * w)}" cy="${f(y + rng() * h * 0.45)}" r="${f(0.6 + rng() * 1.1)}" fill="#fff" opacity="${f(0.3 + rng() * 0.6)}"${tw ? ` class="tw" ${delay(rng)}` : ''}/>`;
    }
    return s;
  };

  const buildings = (rng, { x0, x1, base, minH, maxH, fill, lit = 0.25, twinkle = 0.06 }) => {
    let s = '';
    let x = x0;
    while (x < x1) {
      const w = 22 + rng() * 48;
      const h = minH + rng() * (maxH - minH);
      const top = base - h;
      s += `<rect x="${f(x)}" y="${f(top)}" width="${f(w)}" height="${f(h + 2)}" fill="${fill}"/>`;
      if (rng() < 0.18) {
        const ax = x + w * (0.3 + rng() * 0.4);
        s += `<line x1="${f(ax)}" y1="${f(top)}" x2="${f(ax)}" y2="${f(top - 10 - rng() * 22)}" stroke="${fill}" stroke-width="2"/>`;
        if (rng() < 0.6) s += `<circle cx="${f(ax)}" cy="${f(top - 14)}" r="1.6" fill="#ff5a5a" class="blink" ${delay(rng, 2)}/>`;
      }
      if (lit > 0) {
        for (let wy = top + 6; wy < base - 6; wy += 9) {
          for (let wx = x + 4; wx < x + w - 5; wx += 7) {
            if (rng() < lit) {
              const tw = rng() < twinkle;
              s += `<rect x="${f(wx)}" y="${f(wy)}" width="3" height="4" fill="#ffd9a3" opacity="${f(0.35 + rng() * 0.6)}"${tw ? ` class="tw" ${delay(rng)}` : ''}/>`;
            }
          }
        }
      }
      x += w + (rng() < 0.3 ? rng() * 6 : 0);
    }
    return s;
  };

  const city = (u, rng, x, y, w, h) =>
    sky(u, rng, x, y, w, h) +
    `<g filter="url(#${u}far)" opacity=".85">` +
    buildings(rng, { x0: x - 20, x1: x + w, base: y + h, minH: h * 0.18, maxH: h * 0.42, fill: '#33294c', lit: 0.12 }) +
    `</g><rect x="${x}" y="${f(y + h * 0.45)}" width="${w}" height="${f(h * 0.55)}" fill="url(#${u}haze)"/>` +
    `<g filter="url(#${u}mid)">` +
    buildings(rng, { x0: x - 30, x1: x + w, base: y + h, minH: h * 0.08, maxH: h * 0.3, fill: '#14111d', lit: 0.28 }) +
    `</g>`;

  const pendant = (u, x, len, r = 11) => `
    <line x1="${x}" y1="0" x2="${x}" y2="${len}" stroke="#6d6158" stroke-width="1.2"/>
    <circle cx="${x}" cy="${len + r}" r="${r * 8}" fill="url(#${u}glow)" class="glow"/>
    <path d="M${x - r * 1.4} ${len + r} a${r * 1.4} ${r} 0 0 1 ${r * 2.8} 0z" fill="#c9a77a"/>
    <ellipse cx="${x}" cy="${len + r}" rx="${r * 1.1}" ry="${r * 0.35}" fill="#fff1d6"/>`;

  const shadow = (u, cx, cy, rx, ry, o = 0.55) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#000" opacity="${o}" filter="url(#${u}shadow)"/>`;

  // Ikkunalasin heijastus: huoneen lamput näkyvät himmeästi lasissa
  const glassReflection = (u, pts) => pts.map(([x, y]) =>
    `<circle cx="${x}" cy="${y}" r="5" fill="#ffe2b8" opacity=".22" filter="url(#${u}bloom)"/>`).join('');

  const plant = (x, y, s = 1) => `
    <g transform="translate(${x} ${y}) scale(${s})">
      <path d="M-16 0h32l-4 40h-24z" fill="#2b2622"/>
      <g fill="#2f4a34" class="sway">
        <ellipse cx="-10" cy="-26" rx="7" ry="26" transform="rotate(-22 -10 -26)"/>
        <ellipse cx="10" cy="-30" rx="7" ry="30" transform="rotate(18 10 -30)"/>
        <ellipse cx="0" cy="-40" rx="7" ry="34"/>
        <ellipse cx="-20" cy="-12" rx="6" ry="18" transform="rotate(-50 -20 -12)" fill="#3c5d40"/>
        <ellipse cx="20" cy="-14" rx="6" ry="18" transform="rotate(50 20 -14)" fill="#3c5d40"/>
      </g>
    </g>`;

  const svg = (u, body, label) =>
    `<svg class="scene" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${label}">${defs(u)}${body}
      <rect width="${W}" height="${H}" fill="url(#${u}warm)"/>
      <rect width="${W}" height="${H}" fill="url(#${u}vig)"/>
      <rect width="${W}" height="${H}" filter="url(#${u}grain)" opacity=".07" style="mix-blend-mode:overlay"/>
    </svg>`;

  // ---------- Sisänäkymät ----------
  const studioInterior = (u, rng) => {
    const win = { x: 140, y: 40, w: 640, h: 380 };
    return svg(u, `
      <rect width="${W}" height="${H}" fill="#17141a"/>
      <clipPath id="${u}win"><rect x="${win.x}" y="${win.y}" width="${win.w}" height="${win.h}"/></clipPath>
      <g clip-path="url(#${u}win)">${city(u, rng, win.x, win.y, win.w, win.h)}</g>
      ${[295, 455, 615].map((x) => `<rect x="${x}" y="${win.y}" width="6" height="${win.h}" fill="#0d0b0e"/>`).join('')}
      <rect x="${win.x}" y="${win.y}" width="${win.w}" height="${win.h}" fill="none" stroke="#0d0b0e" stroke-width="8"/>
      <path d="M200 40 L330 40 L180 420 L140 420 L140 200z" fill="#fff" opacity=".035"/>
      <rect width="${W}" height="40" fill="#100e12"/>
      <rect x="0" y="40" width="${W}" height="2" fill="#ffd2a1" opacity=".55"/>
      <rect x="0" y="40" width="140" height="380" fill="#1c1820"/>
      <circle cx="70" cy="190" r="70" fill="url(#${u}glow)" class="glow"/>
      <rect x="62" y="180" width="16" height="22" rx="3" fill="#e9cfa8"/>
      <rect y="420" width="${W}" height="180" fill="url(#${u}wood)"/>
      <rect x="${win.x}" y="420" width="${win.w}" height="110" fill="url(#${u}refl)"/>
      ${Array.from({ length: 9 }, (_, i) => `<line x1="0" y1="${430 + i * 20}" x2="${W}" y2="${430 + i * 20}" stroke="#000" stroke-opacity=".18"/>`).join('')}
      <ellipse cx="300" cy="540" rx="260" ry="40" fill="#3a3330" opacity=".8"/>
      ${shadow(u, 250, 525, 210, 18)}
      ${shadow(u, 655, 528, 100, 10, 0.45)}
      ${glassReflection(u, [[470, 150], [700, 380]])}
      <!-- sänky -->
      <rect x="30" y="350" width="34" height="170" rx="4" fill="#3a2e26"/>
      <rect x="60" y="470" width="380" height="50" rx="4" fill="#2c2420"/>
      <rect x="60" y="440" width="380" height="38" rx="8" fill="url(#${u}linen)"/>
      <rect x="170" y="430" width="275" height="50" rx="10" fill="url(#${u}linen)"/>
      <rect x="170" y="430" width="275" height="10" rx="5" fill="#fff" opacity=".18"/>
      <path d="M170 452 Q300 444 445 456" stroke="#bfb2a2" stroke-width="2" fill="none"/>
      <rect x="250" y="428" width="70" height="52" fill="#b89a74" opacity=".75"/>
      <rect x="72" y="408" width="88" height="34" rx="12" fill="url(#${u}linen)"/>
      <rect x="82" y="396" width="78" height="30" rx="12" fill="#efe8de"/>
      <!-- kirjoituspöytä -->
      <rect x="560" y="448" width="190" height="8" fill="#4a3a2e"/>
      <rect x="572" y="456" width="6" height="70" fill="#3a2e26"/><rect x="734" y="456" width="6" height="70" fill="#3a2e26"/>
      <circle cx="715" cy="420" r="70" fill="url(#${u}glow)" class="glow"/>
      <path d="M700 448 L708 410 L730 404" stroke="#a88e6e" stroke-width="3" fill="none"/>
      <path d="M722 398 l18 -4 l2 14z" fill="#e9cfa8"/>
      <rect x="600" y="436" width="60" height="12" rx="2" fill="#26211d"/>
      <path d="M640 470 h50 v14 h-50z M646 484 v45 M684 484 v45" stroke="#2d2622" stroke-width="5" fill="#2d2622"/>
      ${pendant(u, 470, 120, 9)}
      ${plant(510, 520, 0.9)}
    `, 'Studio Suite sisältä: parivuode, työpiste ja kaupunkinäkymä');
  };

  const skylineInterior = (u, rng) => {
    const main = { x: 200, y: 60, w: 600, h: 360 };
    return svg(u, `
      <rect width="${W}" height="${H}" fill="#16131a"/>
      <clipPath id="${u}win"><rect x="${main.x}" y="${main.y}" width="${main.w}" height="${main.h}"/><polygon points="0,10 200,60 200,420 0,480"/></clipPath>
      <g clip-path="url(#${u}win)">${city(u, rng, 0, 10, 800, 410)}</g>
      <polygon points="0,10 200,60 200,420 0,480" fill="#0c0a12" opacity=".25"/>
      ${[350, 500, 650].map((x) => `<rect x="${x}" y="${main.y}" width="5" height="${main.h}" fill="#0c0a0d"/>`).join('')}
      <path d="M100 35 L100 450" stroke="#0c0a0d" stroke-width="5"/>
      <rect x="196" y="56" width="8" height="368" fill="#0c0a0d"/>
      <path d="M0 0 H800 V60 H200 L0 10z" fill="#0f0d11"/>
      <path d="M200 60 H800" stroke="#ffd2a1" stroke-opacity=".5" stroke-width="2"/>
      <polygon points="0,480 200,420 800,420 800,600 0,600" fill="url(#${u}marble)"/>
      <polygon points="0,480 200,420 800,420 800,540 0,600" fill="url(#${u}refl)"/>
      <path d="M80 600 Q300 470 800 455 M300 600 Q500 500 800 520" stroke="#fff" stroke-opacity=".05" stroke-width="2" fill="none"/>
      <ellipse cx="370" cy="525" rx="250" ry="42" fill="#2e2a2b"/>
      <!-- sohva -->
      ${shadow(u, 345, 500, 200, 16)}
      ${shadow(u, 690, 505, 110, 12)}
      ${glassReflection(u, [[300, 230], [400, 260], [604, 330]])}
      <rect x="180" y="398" width="330" height="56" rx="18" fill="url(#${u}sofa)"/>
      <rect x="170" y="440" width="350" height="52" rx="14" fill="url(#${u}sofaSeat)"/>
      <rect x="180" y="442" width="330" height="6" rx="3" fill="#fff" opacity=".2"/>
      <rect x="160" y="420" width="38" height="78" rx="14" fill="url(#${u}sofa)"/>
      <rect x="492" y="420" width="38" height="78" rx="14" fill="url(#${u}sofa)"/>
      <rect x="225" y="414" width="60" height="38" rx="10" fill="#8b6a52"/>
      <rect x="395" y="414" width="60" height="38" rx="10" fill="#6b5a7a"/>
      <!-- sohvapöytä -->
      <ellipse cx="345" cy="540" rx="95" ry="16" fill="#1d1a19"/>
      <ellipse cx="345" cy="534" rx="95" ry="16" fill="#3a3330"/>
      <path d="M330 520 l4 -18 h6 l4 18z" fill="#e9e1d4" opacity=".8"/>
      <!-- vapaasti seisova kylpyamme -->
      <ellipse cx="690" cy="500" rx="100" ry="14" fill="#000" opacity=".35"/>
      <path d="M590 445 Q590 495 640 498 H740 Q790 495 790 445z" fill="url(#${u}porcelain)"/>
      <ellipse cx="690" cy="445" rx="100" ry="12" fill="#e2ddd5"/>
      <ellipse cx="690" cy="446" rx="88" ry="8" fill="#9ed0dc"/>
      <path d="M625 446 h40 M700 444 h50" stroke="#fff" stroke-width="1.5" class="shim"/>
      <path d="M770 445 V395 q0 -12 -12 -12 h-10" stroke="#b9a58a" stroke-width="4" fill="none"/>
      ${pendant(u, 300, 110, 10)}
      ${pendant(u, 400, 140, 10)}
      <circle cx="560" cy="380" r="80" fill="url(#${u}glow)" class="glow"/>
      <path d="M560 500 V370 q0 -40 40 -50" stroke="#2b2420" stroke-width="3" fill="none"/>
      <ellipse cx="604" cy="322" rx="16" ry="8" fill="#ffe2b8"/>
      ${plant(120, 520, 1.1)}
    `, 'Skyline Suite sisältä: kulmaikkunat, olohuone ja kylpyamme näkymällä');
  };

  const penthouseInterior = (u, rng) => {
    const win = { x: 60, y: 20, w: 680, h: 420 };
    let chandelier = '';
    for (let i = 0; i < 14; i++) {
      const x = 400 + Math.cos(i * 0.9) * (20 + (i % 4) * 22);
      const y = 70 + (i % 5) * 18 + Math.sin(i) * 6;
      chandelier += `<line x1="${f(x)}" y1="0" x2="${f(x)}" y2="${f(y)}" stroke="#8a7a68" stroke-width=".8"/><circle cx="${f(x)}" cy="${f(y)}" r="4" fill="#fff1d6" class="tw" ${delay(rng, 5)}/>`;
    }
    let flames = '';
    for (let i = 0; i < 9; i++) {
      const x = 80 + i * 22 + rng() * 8;
      const h = 14 + rng() * 14;
      flames += `<path filter="url(#${u}bloom)" opacity=".5" d="M${f(x)} 506 q-9 -${f(h * 0.6)} 0 -${f(h * 1.1)} q9 ${f(h * 0.6)} 0 ${f(h * 1.1)}z" fill="#ffb15c"/><path d="M${f(x)} 506 q-7 -${f(h * 0.5)} 0 -${f(h)} q7 ${f(h * 0.5)} 0 ${f(h)}z" fill="${i % 2 ? '#ffb15c' : '#ff8a3c'}" class="flame" ${delay(rng, 1)}/>`;
    }
    return svg(u, `
      <rect width="${W}" height="${H}" fill="#141217"/>
      <clipPath id="${u}win"><rect x="${win.x}" y="${win.y}" width="${win.w}" height="${win.h}"/></clipPath>
      <g clip-path="url(#${u}win)">${city(u, rng, win.x, win.y, win.w, win.h)}</g>
      ${[230, 400, 570].map((x) => `<rect x="${x - 3}" y="${win.y}" width="6" height="${win.h}" fill="#0c0a0d"/>`).join('')}
      <rect x="${win.x}" y="228" width="${win.w}" height="5" fill="#0c0a0d"/>
      <rect x="${win.x}" y="${win.y}" width="${win.w}" height="${win.h}" fill="none" stroke="#0c0a0d" stroke-width="8"/>
      <rect width="60" height="${H}" fill="#1b181d"/><rect x="740" width="60" height="${H}" fill="#1b181d"/>
      <circle cx="400" cy="110" r="150" fill="url(#${u}glow)" class="glow"/>
      ${chandelier}
      <rect y="440" width="${W}" height="160" fill="url(#${u}marble)"/>
      <rect x="${win.x}" y="440" width="${win.w}" height="120" fill="url(#${u}refl)"/>
      <path d="M0 520 Q200 470 420 500 T800 470 M0 580 Q300 520 800 560" stroke="#fff" stroke-opacity=".06" stroke-width="1.5" fill="none"/>
      <!-- takka -->
      <rect x="40" y="470" width="270" height="56" fill="#24201e"/>
      <rect x="60" y="482" width="230" height="30" fill="#080606"/>
      <circle cx="175" cy="500" r="110" fill="url(#${u}glow)" class="glow"/>
      ${flames}
      <rect x="40" y="466" width="270" height="6" fill="#3a3430"/>
      <!-- flyygeli -->
      <path d="M560 420 h120 q40 0 40 30 q0 30 -60 30 h-100z" fill="#08070a"/>
      <path d="M560 420 l60 -70 l10 6 l-50 64z" fill="#0c0b0f"/>
      <path d="M565 425 h110" stroke="#fff" stroke-opacity=".25" stroke-width="1.5"/>
      <path d="M600 470 q40 6 90 -8" stroke="#ffd9a8" stroke-opacity=".35" stroke-width="2" fill="none"/>
      <rect x="566" y="480" width="5" height="40" fill="#08070a"/><rect x="690" y="480" width="5" height="40" fill="#08070a"/>
      <rect x="556" y="440" width="8" height="18" fill="#f0ece6"/>
      <!-- sohva -->
      ${shadow(u, 480, 565, 190, 14)}
      ${shadow(u, 640, 515, 100, 10, 0.5)}
      ${glassReflection(u, [[400, 110], [175, 470]])}
      <path d="M330 505 q0 -40 40 -40 h220 q40 0 40 40 v40 h-300z" fill="url(#${u}sofa)"/>
      <rect x="320" y="520" width="320" height="40" rx="14" fill="url(#${u}sofaSeat)"/>
      <rect x="330" y="522" width="300" height="6" rx="3" fill="#fff" opacity=".2"/>
      <rect x="380" y="488" width="56" height="34" rx="10" fill="#b8865f"/>
      <rect x="520" y="488" width="56" height="34" rx="10" fill="#7a6a96"/>
      <ellipse cx="470" cy="585" rx="120" ry="12" fill="#2d2928"/>
      ${plant(730, 560, 1.2)}
    `, 'Penthouse sisältä: kaksikerroksinen olohuone, kattokruunu, takka ja flyygeli');
  };

  // ---------- Kattoterassi ----------
  const penthouseTerrace = (u, rng) => {
    let bulbs = '';
    for (let i = 0; i <= 20; i++) {
      const x = i * 40;
      const y = 60 + Math.sin((i / 20) * Math.PI) * 50 + (i / 20) * 20;
      bulbs += `<circle cx="${x}" cy="${f(y + 6)}" r="16" fill="url(#${u}glow)"/><circle cx="${x}" cy="${f(y + 6)}" r="3.4" fill="#ffe7bf" class="tw" ${delay(rng, 4)}/>`;
    }
    const lounger = (x) => `
      <ellipse cx="${x + 45}" cy="548" rx="50" ry="5" fill="#000" opacity=".35"/>
      <rect x="${x + 4}" y="526" width="3" height="20" fill="#2c2420"/><rect x="${x + 82}" y="526" width="3" height="20" fill="#2c2420"/>
      <rect x="${x}" y="514" width="90" height="13" rx="5" fill="#ece5da"/>
      <path d="M${x + 2} 516 L${x + 12} 478 h14 L${x + 20} 516z" fill="#d9cfc2"/>
      <rect x="${x + 40}" y="510" width="26" height="6" rx="3" fill="#b8865f"/>`;
    return svg(u, `
      ${city(u, rng, 0, 0, 800, 400)}
      <rect y="352" width="${W}" height="48" fill="#fff" opacity=".05"/>
      <line x1="0" y1="352" x2="${W}" y2="352" stroke="#d9cfc2" stroke-opacity=".5" stroke-width="2"/>
      <path d="M0 60 Q400 160 800 80" stroke="#3a3330" stroke-width="1.2" fill="none"/>
      ${bulbs}
      <rect x="40" y="400" width="520" height="70" fill="url(#${u}pool)"/>
      <ellipse cx="300" cy="430" rx="260" ry="60" fill="url(#${u}cyan)" class="glow"/>
      ${Array.from({ length: 12 }, () => `<path d="M${f(60 + rng() * 460)} ${f(410 + rng() * 52)} h${f(20 + rng() * 40)}" stroke="#e8fbff" stroke-width="2" stroke-linecap="round" class="shim" ${delay(rng, 3)}/>`).join('')}
      <rect x="40" y="398" width="520" height="4" fill="#bdf2f8" opacity=".7"/>
      <rect y="470" width="${W}" height="130" fill="url(#${u}wood)"/>
      ${Array.from({ length: 6 }, (_, i) => `<line x1="0" y1="${482 + i * 20}" x2="${W}" y2="${482 + i * 20}" stroke="#000" stroke-opacity=".25"/>`).join('')}
      <rect x="40" y="470" width="520" height="40" fill="#7fe6f2" opacity=".06"/>
      ${lounger(585)}${lounger(675)}
      <circle cx="580" cy="500" r="60" fill="url(#${u}glow)" class="glow"/>
      <rect x="572" y="488" width="16" height="30" rx="3" fill="#2a2420"/>
      <rect x="575" y="492" width="10" height="16" rx="2" fill="#ffd9a3"/>
      ${plant(30, 520, 1.3)}
      ${plant(785, 545, 0.95)}
    `, 'Penthousen kattoterassi: infinity-allas, aurinkotuolit ja kaupungin valot');
  };

  // ---------- Ulkonäkymä ----------
  const exterior = (u, rng, focus) => {
    const tx = 290, tw = 220, top = 96, base = 520, floors = 22;
    const fh = (base - top) / floors;
    const cols = 8, cw = tw / cols;
    const focusFloor = { studio: 5, skyline: 15 }[focus];
    const focusCols = { studio: [2, 3], skyline: [6, 7] }[focus] || [];
    let facade = '';
    for (let fl = 0; fl < floors; fl++) {
      const y = base - (fl + 1) * fh;
      for (let c = 0; c < cols; c++) {
        const x = tx + c * cw;
        const isFocus = fl === focusFloor && focusCols.includes(c);
        const lit = isFocus || rng() < 0.45;
        const fill = isFocus ? '#ffe2b0' : lit ? '#ffcf96' : '#1f1d33';
        const op = isFocus ? 1 : lit ? 0.35 + rng() * 0.5 : 1;
        const tw2 = !isFocus && lit && rng() < 0.08;
        facade += `<rect x="${f(x + 3)}" y="${f(y + 3)}" width="${f(cw - 6)}" height="${f(fh - 6)}" fill="${fill}" opacity="${f(op)}"${tw2 ? ` class="tw" ${delay(rng, 8)}` : ''}/>`;
      }
      facade += `<rect x="${tx}" y="${f(y)}" width="${tw}" height="2" fill="#0c0b14"/>`;
    }
    let marker = '';
    if (focus === 'penthouse') {
      marker = `<circle cx="400" cy="76" r="14" fill="none" stroke="#fff" stroke-width="2" class="ping"/>
        <line x1="${tx + tw - 20}" y1="80" x2="560" y2="130" stroke="#fff" stroke-opacity=".6"/>
        <text x="566" y="135" fill="#fff" font-family="Inter, sans-serif" font-size="16" font-weight="500">Penthouse · 23. krs</text>`;
    } else {
      const fy = base - (focusFloor + 0.5) * fh;
      const fx = tx + (focusCols[0] + 1) * cw;
      const name = focus === 'studio' ? 'Studio Suite · 6. krs' : 'Skyline Suite · 16. krs';
      marker = `<circle cx="${f(fx)}" cy="${f(fy)}" r="60" fill="url(#${u}glow)" class="glow"/>
        <circle cx="${f(fx)}" cy="${f(fy)}" r="14" fill="none" stroke="#fff" stroke-width="2" class="ping"/>
        <line x1="${f(fx + 14)}" y1="${f(fy)}" x2="560" y2="${f(fy - 30)}" stroke="#fff" stroke-opacity=".6"/>
        <text x="566" y="${f(fy - 26)}" fill="#fff" font-family="Inter, sans-serif" font-size="16" font-weight="500">${name}</text>`;
    }
    const cars = Array.from({ length: 7 }, (_, i) => {
      const red = i % 2 === 0;
      const y = red ? 556 : 576;
      return `<rect x="-40" y="${y}" width="${f(16 + rng() * 14)}" height="3" rx="1.5" fill="${red ? '#ff5050' : '#fff3d6'}" class="${red ? 'car' : 'car car-rev'}" style="animation-duration:${f(6 + rng() * 6)}s;animation-delay:-${f(rng() * 12)}s"/>`;
    }).join('');
    return svg(u, `
      ${sky(u, rng, 0, 0, 800, 540, 60)}
      ${buildings(rng, { x0: -20, x1: 820, base: 525, minH: 120, maxH: 300, fill: '#2a2343', lit: 0.12 })}
      ${buildings(rng, { x0: -30, x1: 280, base: 530, minH: 60, maxH: 220, fill: '#14111d', lit: 0.25 })}
      ${buildings(rng, { x0: 520, x1: 830, base: 530, minH: 60, maxH: 230, fill: '#14111d', lit: 0.25 })}
      <!-- hotellitorni -->
      <rect x="${tx - 6}" y="${top - 4}" width="${tw + 12}" height="${base - top + 4}" fill="#0c0b14"/>
      <rect x="${tx}" y="${top}" width="${tw}" height="${base - top}" fill="url(#${u}glass)"/>
      ${facade}
      <polygon points="${tx},${top} ${tx + 70},${top} ${tx},${top + 260}" fill="#fff" opacity=".05"/>
      <!-- penthouse ja kattoterassi -->
      <rect x="${tx + 20}" y="56" width="${tw - 40}" height="40" fill="${focus === 'penthouse' ? '#ffe2b0' : '#ffcf96'}" opacity="${focus === 'penthouse' ? 0.95 : 0.6}"/>
      ${[1, 2, 3, 4].map((i) => `<rect x="${tx + 20 + i * 36}" y="56" width="3" height="40" fill="#0c0b14"/>`).join('')}
      <rect x="${tx + 14}" y="52" width="${tw - 28}" height="5" fill="#0c0b14"/>
      <rect x="${tx - 6}" y="92" width="80" height="5" fill="#7fe6f2" class="shim"/>
      <ellipse cx="${tx + 34}" cy="92" rx="60" ry="14" fill="url(#${u}cyan)" class="glow"/>
      ${focus === 'penthouse' ? `<circle cx="400" cy="76" r="110" fill="url(#${u}glow)" class="glow"/>` : ''}
      <text x="400" y="${base - 6}" text-anchor="middle" fill="#ecd9b8" font-family="Inter Tight, Inter, sans-serif" font-size="14" letter-spacing="6" font-weight="600">AURELIA</text>
      <!-- katutaso -->
      <rect x="${tx + 40}" y="${base - 2}" width="${tw - 80}" height="6" fill="#ffd9a3"/>
      <ellipse cx="400" cy="${base + 6}" rx="140" ry="16" fill="url(#${u}glow)"/>
      <rect y="${base + 4}" width="${W}" height="${H - base}" fill="#0b0a10"/>
      <rect y="${base + 4}" width="${W}" height="6" fill="#1a1822"/>
      ${[60, 200, 600, 740].map((x) => `<line x1="${x}" y1="${base + 4}" x2="${x}" y2="${base - 34}" stroke="#2a2633" stroke-width="3"/><circle cx="${x}" cy="${base - 36}" r="26" fill="url(#${u}glow)"/><circle cx="${x}" cy="${base - 36}" r="3" fill="#ffe7bf"/>`).join('')}
      <line x1="0" y1="568" x2="${W}" y2="568" stroke="#fff" stroke-opacity=".12" stroke-dasharray="18 14"/>
      ${cars}
      ${marker}
    `, `Hotellin ulkonäkymä illalla, ${focus === 'penthouse' ? 'penthouse ja kattoterassi' : 'sviitin ikkunat'} korostettuna`);
  };

  // ---------- Sviittien näkymät ----------
  const SUITES = {
    studio: {
      name: 'Studio Suite',
      views: [
        { label: 'Sisältä', seed: 11, draw: studioInterior },
        { label: 'Ulkoa', seed: 12, draw: (u, r) => exterior(u, r, 'studio') },
      ],
    },
    skyline: {
      name: 'Skyline Suite',
      views: [
        { label: 'Sisältä', seed: 21, draw: skylineInterior },
        { label: 'Ulkoa', seed: 22, draw: (u, r) => exterior(u, r, 'skyline') },
      ],
    },
    penthouse: {
      name: 'Penthouse',
      views: [
        { label: 'Sisältä', seed: 31, draw: penthouseInterior },
        { label: 'Kattoterassi', seed: 33, draw: penthouseTerrace },
        { label: 'Ulkoa', seed: 32, draw: (u, r) => exterior(u, r, 'penthouse') },
      ],
    },
  };

  const render = (view) => view.draw(`s${++uidCounter}`, rngFrom(view.seed));

  // Pikkukuvat sviittikortteihin
  document.querySelectorAll('.suite-img[data-suite]').forEach((el) => {
    const suite = SUITES[el.dataset.suite];
    if (suite) el.insertAdjacentHTML('afterbegin', render(suite.views[0]).replace('role="img"', 'aria-hidden="true"'));
  });

  // ---------- Kuvakatselu ----------
  const dialog = document.getElementById('viewer');
  if (!dialog) return;
  const stage = dialog.querySelector('.viewer-stage');
  const title = dialog.querySelector('.viewer-title');
  const tabs = dialog.querySelector('.viewer-tabs');
  const counter = dialog.querySelector('.viewer-count');
  let current = null;
  let index = 0;

  const show = (i) => {
    index = (i + current.views.length) % current.views.length;
    stage.innerHTML = render(current.views[index]);
    tabs.querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-selected', String(j === index)));
    counter.textContent = `${index + 1} / ${current.views.length}`;
  };

  const open = (key, start = 0) => {
    current = SUITES[key];
    title.textContent = current.name;
    tabs.innerHTML = current.views.map((v, j) => `<button type="button" role="tab" data-i="${j}">${v.label}</button>`).join('');
    show(start);
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
    document.body.style.overflow = 'hidden';
  };
  const close = () => {
    if (dialog.open) dialog.close();
    stage.innerHTML = '';
    document.body.style.overflow = '';
  };

  document.querySelectorAll('[data-open-suite]').forEach((btn) =>
    btn.addEventListener('click', () => open(btn.dataset.openSuite)));
  tabs.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) show(Number(b.dataset.i)); });
  dialog.querySelector('.viewer-prev').addEventListener('click', () => show(index - 1));
  dialog.querySelector('.viewer-next').addEventListener('click', () => show(index + 1));
  dialog.querySelector('.viewer-close').addEventListener('click', close);
  dialog.querySelector('.viewer-book').addEventListener('click', () => {
    const room = document.getElementById('room');
    const key = Object.keys(SUITES).find((k) => SUITES[k] === current);
    if (room && key) { room.value = key; room.dispatchEvent(new Event('change')); }
    close();
  });
  dialog.addEventListener('close', () => { document.body.style.overflow = ''; });
  dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') show(index + 1);
    if (e.key === 'ArrowLeft') show(index - 1);
  });
})();
