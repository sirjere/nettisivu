// Reaaliaikainen järvimaisema etusivun taustalle (WebGL).
// Piirtää pilvettömän taivaan, auringon, kuusimetsäisen rannan ja
// aaltoilevan järven, joka heijastaa taivasta ja auringonvälkettä.
(() => {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) { canvas.remove(); return; } // CSS-liukuväri jää näkyviin

  const vert = `
    attribute vec2 p;
    void main() { gl_Position = vec4(p, 0.0, 1.0); }
  `;

  const frag = `
    precision highp float;
    uniform vec2 uRes;
    uniform float uTime;
    uniform vec3 uSun;

    const float CAM_H = 1.6;
    const float SHORE = 320.0;
    const float HORIZON = 0.13;

    float hash(float n) { return fract(sin(n) * 43758.5453); }
    float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash2(i), hash2(i + vec2(1, 0)), f.x),
                 mix(hash2(i + vec2(0, 1)), hash2(i + vec2(1, 1)), f.x), f.y);
    }

    // ---- Taivas ----
    vec3 sky(vec3 d) {
      float y = max(d.y, 0.0);
      vec3 zenith  = vec3(0.04, 0.24, 0.72);
      vec3 horizon = vec3(0.58, 0.78, 0.96);
      vec3 col = mix(horizon, zenith, pow(y, 0.38));
      float s = max(dot(d, uSun), 0.0);
      col += vec3(1.0, 0.93, 0.78) * pow(s, 8.0) * 0.18;    // laaja hehku
      col += vec3(1.0, 0.97, 0.90) * pow(s, 120.0) * 0.55;  // kirkas kehä
      col += vec3(1.0, 1.0, 0.96) * pow(s, 900.0) * 1.2;    // häikäisy
      col += vec3(1.0) * smoothstep(0.99986, 0.99992, s) * 4.0; // kiekko
      return col;
    }

    // ---- Ranta: kaukaiset harjut ja kuusimetsä ----
    float ridgeTop(float a) {
      return 0.020 + 0.022 * noise(vec2(a * 2.2, 3.1)) + 0.010 * noise(vec2(a * 6.0, 7.7));
    }
    float treeTop(float a) {
      float hills = 0.010 + 0.016 * noise(vec2(a * 3.5, 1.0));
      float t = 0.0;
      for (int k = 0; k < 2; k++) {
        float fk = float(k);
        float x = a * (110.0 + fk * 70.0) + fk * 13.7;
        float i = floor(x), f = fract(x);
        float h = (0.006 + 0.016 * hash(i + fk * 57.0)) * (0.6 + 0.6 * noise(vec2(a * 9.0, fk)));
        float cone = h * max(0.0, 1.0 - abs(f - 0.5) * 2.3);
        t = max(t, cone);
      }
      return hills + t;
    }

    // Näkymä vedenpinnan yläpuolella (käytetään myös heijastuksiin)
    vec3 above(vec3 d, float mirror) {
      vec3 col = sky(d);
      if (abs(d.z) < 1e-3) return col;
      float a = d.x / d.z;
      float y = d.y;
      vec3 hz = vec3(0.58, 0.78, 0.96);

      float rt = ridgeTop(a);
      if (y < rt) {
        vec3 ridge = mix(vec3(0.20, 0.33, 0.30), hz, 0.55);
        col = ridge * (0.92 + 0.08 * noise(vec2(a * 80.0, y * 300.0)));
      }
      float tt = treeTop(a);
      if (y < tt) {
        float tex = noise(vec2(a * 900.0, y * 260.0)) * 0.6 + noise(vec2(a * 240.0, y * 90.0)) * 0.4;
        vec3 forest = mix(vec3(0.035, 0.085, 0.05), vec3(0.11, 0.20, 0.10), tex);
        // Aurinko valaisee latvoja hieman
        float lit = smoothstep(tt - 0.012, tt, y) * max(dot(normalize(vec3(d.x, 0.0, d.z)), normalize(vec3(uSun.x, 0.0, uSun.z))), 0.0);
        forest += vec3(0.10, 0.10, 0.04) * lit;
        forest = mix(forest, hz, 0.22);           // ilmaperspektiivi
        col = mix(forest, col, smoothstep(tt - 0.0015, tt, y) * 0.6);
      }
      return col;
    }

    // ---- Järvi ----
    float waterH(vec2 p) {
      float t = uTime;
      float h = 0.0;
      h += 0.30 * sin(dot(p, vec2(0.60, 0.80)) * 0.9 + t * 1.10);
      h += 0.22 * sin(dot(p, vec2(-0.70, 0.71)) * 1.4 + t * 1.45);
      h += 0.14 * sin(dot(p, vec2(0.95, -0.31)) * 2.3 + t * 1.90);
      vec2 q = p + t * vec2(0.25, 0.45);
      h += 0.55 * (noise(q * 1.3) - 0.5) + 0.28 * (noise(q * 2.9 + 4.0) - 0.5) + 0.08 * (noise(q * 6.1 - 2.0) - 0.5);
      return h * 0.09;
    }
    vec3 waterNormal(vec2 p, float dist) {
      float e = 0.02 + dist * 0.002;
      float hx = waterH(p + vec2(e, 0.0)) - waterH(p - vec2(e, 0.0));
      float hz = waterH(p + vec2(0.0, e)) - waterH(p - vec2(0.0, e));
      vec3 n = normalize(vec3(-hx, 2.0 * e, -hz));
      return normalize(mix(n, vec3(0, 1, 0), smoothstep(15.0, 260.0, dist)));
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
      vec3 d = normalize(vec3(uv.x, uv.y + HORIZON, 1.45));
      float shoreY = -CAM_H / SHORE;
      vec3 col;

      if (d.y > shoreY) {
        col = above(d, 0.0);
      } else {
        float t = -CAM_H / d.y;
        vec3 pos = d * t;
        vec3 n = waterNormal(pos.xz * 1.6, t);
        vec3 r = reflect(d, n);
        r.y = abs(r.y);
        vec3 refl = above(r, 1.0);
        float fres = 0.02 + 0.98 * pow(1.0 - max(dot(-d, n), 0.0), 5.0);
        vec3 body = mix(vec3(0.04, 0.20, 0.30), vec3(0.02, 0.10, 0.17), smoothstep(0.0, 0.5, -d.y));
        col = mix(body, refl, fres);
        // Auringonvälke
        float s = max(dot(r, uSun), 0.0);
        col += vec3(1.0, 0.95, 0.82) * (pow(s, 1400.0) * 9.0 + pow(s, 160.0) * 0.35);
        // Rantaviivan tumma kaistale lähellä horisonttia
        col = mix(col, vec3(0.06, 0.10, 0.08), smoothstep(SHORE * 0.8, SHORE, t) * 0.5);
      }

      // Kevyt sävytys, vinjetointi ja ditherointi
      col = mix(col, 1.0 - exp(-col * 1.6), smoothstep(0.75, 1.6, max(col.r, max(col.g, col.b))));
      vec2 v = gl_FragCoord.xy / uRes - 0.5;
      col *= 1.0 - dot(v, v) * 0.2;
      col += (hash2(gl_FragCoord.xy) - 0.5) / 255.0;
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    return sh;
  };

  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vert));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (err) {
    console.warn('Taustamaisemaa ei voitu piirtää:', err);
    canvas.remove();
    return;
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'uRes');
  const uTime = gl.getUniformLocation(prog, 'uTime');
  const uSun = gl.getUniformLocation(prog, 'uSun');

  const resize = () => {
    const scale = Math.min(window.devicePixelRatio || 1, 1.25);
    const w = Math.max(1, Math.round(canvas.clientWidth * scale));
    const h = Math.max(1, Math.round(canvas.clientHeight * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    gl.uniform2f(uRes, w, h);
    // Aurinko oikeaan yläkulmaan; kapealla näytöllä lähemmäs keskeä
    const aspect = w / h;
    const sx = Math.min(0.42, aspect * 0.5 * 0.55);
    const sy = aspect < 1 ? 0.52 : 0.36;
    const len = Math.hypot(sx, sy, 1.45);
    gl.uniform3f(uSun, sx / len, sy / len, 1.45 / len);
  };

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = true;
  let raf = 0;
  const start = performance.now();

  const draw = (now) => {
    resize();
    gl.uniform1f(uTime, reduceMotion.matches ? 8.0 : (now - start) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const loop = (now) => {
    raf = 0;
    draw(now);
    if (visible && !document.hidden && !reduceMotion.matches) raf = requestAnimationFrame(loop);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }).observe(canvas);
  }
  document.addEventListener('visibilitychange', kick);
  window.addEventListener('resize', kick);
  reduceMotion.addEventListener?.('change', kick);
  kick();
})();
