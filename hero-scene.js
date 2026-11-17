// Etusivun live-tausta (WebGL): hitaasti virtaava, pehmeä värigradientti
// (persikka, terrakotta ja laventeli tummalla pohjalla) sekä hienojakoinen filmirae.
(() => {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) { canvas.remove(); return; } // CSS-gradientti jää näkyviin

  const vert = `
    attribute vec2 p;
    void main() { gl_Position = vec4(p, 0.0, 1.0); }
  `;

  const frag = `
    precision highp float;
    uniform vec2 uRes;
    uniform float uTime;

    float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash2(i), hash2(i + vec2(1, 0)), f.x),
                 mix(hash2(i + vec2(0, 1)), hash2(i + vec2(1, 1)), f.x), f.y);
    }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
      for (int i = 0; i < 4; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
      return v;
    }

    // Pehmeä valopallo
    float blob(vec2 uv, vec2 c, float r) { return exp(-dot(uv - c, uv - c) / (r * r)); }

    void main() {
      vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
      float t = uTime * 0.12;

      // Vääristetään koordinaatteja, jotta värit virtaavat kuin neste
      vec2 w = uv + 0.35 * vec2(fbm(uv * 1.3 + t), fbm(uv * 1.3 - t + 4.0)) - 0.17;

      vec3 base  = vec3(0.039, 0.039, 0.043);
      vec3 peach = vec3(0.95, 0.78, 0.62);
      vec3 coral = vec3(0.86, 0.48, 0.38);
      vec3 lilac = vec3(0.55, 0.46, 0.98);
      vec3 plum  = vec3(0.30, 0.16, 0.42);

      vec3 col = base;
      col += plum  * blob(w, vec2(-0.55 + 0.20 * sin(t * 0.9), 0.25 + 0.15 * cos(t * 0.7)), 0.75) * 0.9;
      col += lilac * blob(w, vec2( 0.55 + 0.25 * cos(t * 0.8), 0.30 + 0.20 * sin(t * 1.1)), 0.45) * 0.85;
      col += coral * blob(w, vec2( 0.15 + 0.30 * sin(t * 0.6), -0.05 + 0.15 * cos(t * 0.9)), 0.42) * 0.75;
      col += peach * blob(w, vec2( 0.75 + 0.15 * sin(t * 1.3), -0.30 + 0.12 * cos(t)), 0.30) * 0.65;

      // Hienovarainen valoviiru
      float band = smoothstep(0.08, 0.0, abs(w.y - 0.25 * sin(w.x * 2.0 + t * 2.0) - 0.05));
      col += peach * band * 0.08;

      // Vasen alakulma tummemmaksi tekstin luettavuuden vuoksi
      col *= 1.0 - 0.55 * smoothstep(0.2, -0.6, uv.x - uv.y * 0.6);

      // Filmirae ja sävytys
      col = 1.0 - exp(-col * 1.25);
      col += (hash2(gl_FragCoord.xy + fract(uTime) * 100.0) - 0.5) * 0.045;
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
    console.warn('Taustaa ei voitu piirtää:', err);
    canvas.remove();
    return;
  }
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'uRes');
  const uTime = gl.getUniformLocation(prog, 'uTime');

  const resize = () => {
    // Gradientti on pehmeä, joten pienempi resoluutio riittää ja säästää akkua
    const scale = Math.min(window.devicePixelRatio || 1, 1) * 0.75;
    const w = Math.max(1, Math.round(canvas.clientWidth * scale));
    const h = Math.max(1, Math.round(canvas.clientHeight * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    gl.uniform2f(uRes, w, h);
  };

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = true;
  let raf = 0;
  const start = performance.now();

  const loop = (now) => {
    raf = 0;
    resize();
    gl.uniform1f(uTime, reduceMotion.matches ? 10.0 : 10.0 + (now - start) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
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
