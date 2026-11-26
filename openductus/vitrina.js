/* OpenDuctus · vitrina del inicio: helicoide, lámina, brida, tolva en U y valde en orden al azar, y la curva de fluencia que se dibuja sola.
   Necesita three.js r147 (cargado antes). Respeta "reducir movimiento". */
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ease = function (x) { return x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x); };

  /* ---------------- Curva esfuerzo–deformación que se dibuja ---------------- */
  (function () {
    var svg = document.querySelector('.curva svg'); if (!svg) return;
    var linea = svg.querySelector('path[stroke="url(#g)"]'), rotura = svg.querySelector('circle');
    var textos = [].slice.call(svg.querySelectorAll('g[font-size="11.5"] text'));
    var duct = [].slice.call(svg.querySelectorAll('path[stroke="#ffc94d"], text[fill="#ffc94d"]'));
    if (!linea) return;
    var L = linea.getTotalLength();
    // fracción del recorrido en la que aparece cada letrero (cuando la línea pasa por su x)
    function fraccionX(x) { for (var s = 0; s <= 200; s++) { if (linea.getPointAtLength(L * s / 200).x >= x) return s / 200; } return 1; }
    var umbrales = textos.map(function (t) { var x = +t.getAttribute('x'); return Math.min(1, fraccionX(x + 6)); });
    umbrales[umbrales.length - 1] = 1; // "rotura" sale al final
    var punta = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    punta.setAttribute('r', '4.5'); punta.setAttribute('fill', '#e9fdff');
    punta.style.filter = 'drop-shadow(0 0 6px #22e3ff) drop-shadow(0 0 12px #22e3ff)';
    linea.parentNode.insertBefore(punta, linea.nextSibling);
    function pintar(p, alfa) {
      linea.style.strokeDasharray = L; linea.style.strokeDashoffset = L * (1 - p);
      var q = linea.getPointAtLength(L * p); punta.setAttribute('cx', q.x); punta.setAttribute('cy', q.y);
      punta.style.opacity = p > 0 && p < 1 ? alfa : 0;
      textos.forEach(function (t, i) { t.style.opacity = (p >= umbrales[i] ? 1 : 0) * alfa; t.style.transition = 'opacity .35s'; });
      rotura.style.opacity = (p >= 1 ? 1 : 0) * alfa; rotura.style.transformBox = 'fill-box'; rotura.style.transformOrigin = 'center';
      rotura.style.transform = p >= 1 ? 'scale(1)' : 'scale(.2)'; rotura.style.transition = 'transform .35s cubic-bezier(.2,1.6,.4,1), opacity .2s';
      duct.forEach(function (d) { d.style.opacity = (p >= 1 ? 1 : 0) * alfa; d.style.transition = 'opacity .5s'; });
      svg.style.opacity = 1;
    }
    if (reduce) { pintar(1, 1); return; }
    var DIBUJO = 4200, QUIETO = 3800, APAGA = 500, CICLO = DIBUJO + QUIETO + APAGA, t0 = null, visible = true;
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) t0 = null; }).observe(svg);
    (function cuadro(now) {
      requestAnimationFrame(cuadro); if (!visible || document.hidden) return;
      if (t0 === null) t0 = now; var t = (now - t0) % CICLO;
      if (t < DIBUJO) pintar(t / DIBUJO, 1);
      else if (t < DIBUJO + QUIETO) pintar(1, 1);
      else pintar(1, 1 - (t - DIBUJO - QUIETO) / APAGA);
    })(performance.now());
  })();

  /* ---------------- Vitrina 3D ---------------- */
  var canvas = document.getElementById('vit-c'); if (!canvas || !window.THREE) return;
  var caja = canvas.parentElement, eti = document.getElementById('vit-eti'), puntos = [].slice.call(caja.querySelectorAll('.vit-puntos i'));
  var r = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  r.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75)); r.outputEncoding = THREE.sRGBEncoding;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = .82;
  var scene = new THREE.Scene(); var pm = new THREE.PMREMGenerator(r);
  if (THREE.RoomEnvironment) scene.environment = pm.fromScene(new THREE.RoomEnvironment(), .04).texture;
  var key = new THREE.DirectionalLight(0xffffff, .9); key.position.set(200, 320, 240); scene.add(key);
  var rim = new THREE.DirectionalLight(0x22e3ff, .6); rim.position.set(-260, 120, -200); scene.add(rim);
  var cam = new THREE.PerspectiveCamera(35, 2, 1, 6000);
  var grid = new THREE.GridHelper(2400, 48, 0x16345c, 0x0f2444); scene.add(grid);

  /* Helicoide */
  var H = (function () {
    var D = 300, d = 100, P = 300, N = 4, SEL = 1, w = (D - d) / 2, Lo = Math.hypot(Math.PI * D, P), Li = Math.hypot(Math.PI * d, P);
    var rr = w * Li / (Lo - Li), R = rr + w, TH = Lo / R, U = 120, V = 5, g = new THREE.Group();
    function aleta() {
      var mat = new THREE.MeshStandardMaterial({ color: '#b9c3cd', metalness: .88, roughness: .32, side: THREE.DoubleSide, transparent: true });
      var pos = new Float32Array((U + 1) * (V + 1) * 3), idx = [];
      for (var i = 0; i < U; i++) for (var j = 0; j < V; j++) { var a = i * (V + 1) + j, b = a + V + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
      var geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx);
      var mesh = new THREE.Mesh(geo, mat);
      var ep = new Float32Array((U + 1) * 2 * 3), eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
      var borde = new THREE.LineLoop(eg, new THREE.LineBasicMaterial({ color: 0x22e3ff, transparent: true, opacity: .9 })); mesh.add(borde);
      function upd(t) {
        var Phi = 2 * Math.PI + (TH - 2 * Math.PI) * t, pit = P * (1 - t), ri = d / 2 + (rr - d / 2) * t, ro = D / 2 + (R - D / 2) * t;
        function pt(u, vv, o, k) { var an = Phi * u - Phi / 2, rho = ri + vv * (ro - ri); o[k] = rho * Math.cos(an); o[k + 1] = pit * u - pit / 2; o[k + 2] = rho * Math.sin(an); }
        for (var i = 0; i <= U; i++) for (var j = 0; j <= V; j++) pt(i / U, j / V, pos, (i * (V + 1) + j) * 3);
        var k = 0; for (i = 0; i <= U; i++) { pt(i / U, 1, ep, k); k += 3; } for (i = U; i >= 0; i--) { pt(i / U, 0, ep, k); k += 3; }
        geo.attributes.position.needsUpdate = true; eg.attributes.position.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere(); eg.computeBoundingSphere();
      }
      upd(0); g.add(mesh); return { mesh: mesh, mat: mat, borde: borde, upd: upd };
    }
    var al = []; for (var i = 0; i < N; i++) al.push(aleta());
    var eje = new THREE.Mesh(new THREE.CylinderGeometry(d / 2 - 1, d / 2 - 1, N * P + 220, 32), new THREE.MeshStandardMaterial({ color: '#7d8893', metalness: .9, roughness: .35, transparent: true }));
    eje.rotation.z = -Math.PI / 2; g.add(eje);
    var ultimo = -1;
    return { g: g, dur: 7200, eti: 'Ductus Model · del sinfín a la lámina', piso: -230,
      set: function (p) {
        var s = ease(p * 3), b = ease(p * 3 - 1), c = ease(p * 3 - 2);
        al.forEach(function (a, i) { var k = i - (N - 1) / 2, x = k * (P + 160 * s);
          if (i === SEL) { a.mesh.position.set(x * (1 - b), -110 * b, 0); a.mesh.rotation.z = -Math.PI / 2 * (1 - b); }
          else { a.mesh.position.set(x, 520 * b, 0); a.mesh.rotation.z = -Math.PI / 2; a.mat.opacity = 1 - .92 * b; a.borde.material.opacity = .9 * (1 - .92 * b); a.mesh.visible = b < .99; } });
        eje.material.opacity = 1 - s; eje.visible = s < .99;
        if (Math.abs(c - ultimo) > 1e-4) { al[SEL].upd(c); ultimo = c; }
        return 2150 - 1300 * b; } };
  })();

  /* Lámina que se dobla */
  var Lm = (function () {
    var W = 200, Dp = 150, Hh = 80, T = 3.6, g = new THREE.Group();
    var mat = new THREE.MeshStandardMaterial({ color: '#aeb8c3', metalness: .85, roughness: .38 });
    var edge = new THREE.LineBasicMaterial({ color: 0x22e3ff, transparent: true, opacity: .85 });
    function plate(w, dd) { var m = new THREE.Mesh(new THREE.BoxGeometry(w, T, dd), mat); m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), edge)); return m; }
    g.add(plate(W, Dp)); var fl = [];
    function flap(px, pz, w, dd, ox, oz, axis, sign, orden) { var piv = new THREE.Group(); piv.position.set(px, 0, pz); var p = plate(w, dd); p.position.set(ox, 0, oz); piv.add(p); g.add(piv); fl.push({ piv: piv, axis: axis, sign: sign, orden: orden }); }
    flap(0, Dp / 2, W, Hh, 0, Hh / 2, 'x', -1, 0); flap(0, -Dp / 2, W, Hh, 0, -Hh / 2, 'x', 1, 0);
    flap(-W / 2, 0, Hh, Dp, -Hh / 2, 0, 'z', -1, 1); flap(W / 2, 0, Hh, Dp, Hh / 2, 0, 'z', 1, 1);
    return { g: g, dur: 3600, eti: 'Ductus Model · la lámina se dobla en caja', piso: -4,
      set: function (p) { fl.forEach(function (f) { f.piv.rotation[f.axis] = f.sign * ease(p * 2 - f.orden) * Math.PI / 2; }); return 560; } };
  })();

  /* Brida que se arma */
  var Br = (function () {
    var g = new THREE.Group();
    var acero = new THREE.MeshStandardMaterial({ color: '#b8c2cc', metalness: .92, roughness: .3 });
    var pintura = new THREE.MeshStandardMaterial({ color: '#d99a1c', metalness: .15, roughness: .55 });
    var caucho = new THREE.MeshStandardMaterial({ color: '#15181d', roughness: .9 });
    var pavon = new THREE.MeshStandardMaterial({ color: '#3a4048', metalness: .85, roughness: .35 });
    var BC = 62, ang = [45, 135, 225, 315].map(function (a) { return a * Math.PI / 180; }), piezas = [];
    function holed(s, holes, depth) { holes.forEach(function (h) { var p = new THREE.Path(); p.absarc(h[0], h[1], h[2], 0, Math.PI * 2, true); s.holes.push(p); });
      var geo = new THREE.ExtrudeGeometry(s, { depth: depth, bevelEnabled: false, curveSegments: 32 }); geo.rotateX(-Math.PI / 2); return geo; }
    function bh(rad) { return ang.map(function (a) { return [Math.cos(a) * BC, Math.sin(a) * BC, rad]; }); }
    function sq() { var s = new THREE.Shape(); s.moveTo(-100, -100); s.lineTo(100, -100); s.lineTo(100, 100); s.lineTo(-100, 100); s.lineTo(-100, -100); return s; }
    function circ(rad) { var s = new THREE.Shape(); s.absarc(0, 0, rad, 0, Math.PI * 2, false); return s; }
    function pieza(m, y0, yx, gr) { m.position.y = y0; g.add(m); piezas.push({ m: m, y0: y0, yx: yx, gr: gr }); }
    pieza(new THREE.Mesh(holed(sq(), [[0, 0, 30]].concat(bh(7)), 12), pintura), 0, 0, 0);
    pieza(new THREE.Mesh(holed(circ(80), [[0, 0, 30]].concat(bh(7)), 3), caucho), 12, 60, 1);
    var brida = new THREE.Group(); brida.add(new THREE.Mesh(holed(circ(80), [[0, 0, 30]].concat(bh(7)), 14), acero));
    var cuello = new THREE.Mesh(holed(circ(40), [[0, 0, 30]], 60), acero); cuello.position.y = 14; brida.add(cuello); pieza(brida, 15, 130, 2);
    ang.forEach(function (a) { var x = Math.cos(a) * BC, z = -Math.sin(a) * BC, t = new THREE.Group();
      var cab = new THREE.Mesh(new THREE.CylinderGeometry(10.5, 10.5, 8, 6), pavon); cab.position.y = 4;
      var cu = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 50, 16), pavon); cu.position.y = -25; t.add(cab, cu); t.position.set(x, 0, z); pieza(t, 29, 230, 3);
      var tu = new THREE.Mesh(new THREE.CylinderGeometry(10.5, 10.5, 9, 6), pavon); tu.position.set(x, 0, z); pieza(tu, -4.5, -80, 4); });
    return { g: g, dur: 4200, eti: 'Ductus Model · la brida se arma pieza por pieza', piso: -40,
      set: function (p) { piezas.forEach(function (o) { var lp = o.gr === 0 ? 1 : ease(p * 4 - (o.gr - 1)); o.m.position.y = o.yx + (o.y0 - o.yx) * lp; }); return 620; } };
  })();

  var aceroT = new THREE.MeshStandardMaterial({ color: '#b9c3cd', metalness: .88, roughness: .32, side: THREE.DoubleSide });
  var cianT = new THREE.LineBasicMaterial({ color: 0x22e3ff, transparent: true, opacity: .9 });
  function lamina4x8(w, h) { // contorno ámbar de una lámina, acostada en el piso
    var mb = new THREE.LineBasicMaterial({ color: 0xffc94d, transparent: true, opacity: 0 });
    var l = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(function (q) { return new THREE.Vector3(q[0] * w / 2, 0, q[1] * h / 2); })), mb);
    return { l: l, mb: mb };
  }

  /* Tolva en U de mezcladora: suelta las tapas, desenrolla el cuerpo y queda en una lámina 4x8 (medidas en mm, se dibuja a escala) */
  var TU = (function () {
    var L = 1200, R = 300, h = 250, LW = 2440, LH = 1220, M = 10, S = 2 * h + Math.PI * R, SA = Math.PI * R / 2, NS = 100, ES = .3;
    var g = new THREE.Group(), in_ = new THREE.Group(); in_.scale.setScalar(ES); g.add(in_);
    function perfil(s, t) { var sg = s < 0 ? -1 : 1, a = Math.abs(s), k = (1 - t) / R, sa = Math.min(a, SA), x, y;
      if (k < 1e-9) { x = sa; y = -R; } else { x = Math.sin(k * sa) / k; y = -R + (1 - Math.cos(k * sa)) / k; }
      if (a > SA) { var th = k * SA, e = a - SA; x += e * Math.cos(th); y += e * Math.sin(th); } return [sg * x, y]; }
    var pos = new Float32Array((NS + 1) * 6), idx = []; for (var i = 0; i < NS; i++) { var a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    var geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx);
    var cuerpo = new THREE.Mesh(geo, aceroT); in_.add(cuerpo);
    var ep = new Float32Array((NS + 1) * 6), eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(ep, 3)); cuerpo.add(new THREE.LineLoop(eg, cianT));
    function doblar(t) {
      for (var i = 0; i <= NS; i++) { var q = perfil(-S / 2 + S * i / NS, t), k = i * 6; pos[k] = q[0]; pos[k + 1] = q[1]; pos[k + 2] = -L / 2; pos[k + 3] = q[0]; pos[k + 4] = q[1]; pos[k + 5] = L / 2; }
      var k2 = 0; for (i = 0; i <= NS; i++) { ep.set(pos.subarray(i * 6, i * 6 + 3), k2); k2 += 3; } for (i = NS; i >= 0; i--) { ep.set(pos.subarray(i * 6 + 3, i * 6 + 6), k2); k2 += 3; }
      geo.attributes.position.needsUpdate = true; eg.attributes.position.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere(); eg.computeBoundingSphere(); }
    var forma = new THREE.Shape(); forma.moveTo(-R, h); forma.lineTo(-R, 0); forma.absarc(0, 0, R, Math.PI, 2 * Math.PI, false); forma.lineTo(R, h); forma.lineTo(-R, h);
    var tapas = [1, -1].map(function (lado) { var m = new THREE.Mesh(new THREE.ShapeGeometry(forma, 40), aceroT);
      m.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(forma.getPoints(40)), cianT)); in_.add(m);
      var cz = lado * (LH / 2 - M - (h + R) / 2); return { m: m, lado: lado, x1: LW / 2 - M - (LW - S - M) / 2 + M / 2, z1: cz + lado * (h - R) / 2 }; });
    var lam = lamina4x8(LW, LH); lam.l.position.y = -R - 1.5; in_.add(lam.l);
    var dx = -LW / 2 + M + S / 2, ultimo = -1;
    return { g: g, dur: 7000, eti: 'Ductus Model · la tolva de la mezcladora, en una lámina', piso: -R * ES - 3,
      set: function (p) {
        var a = ease(p * 4), b = ease(p * 4 - 1), c = ease(p * 4 - 2), d = ease(p * 4 - 3);
        if (Math.abs(b - ultimo) > 1e-4) { doblar(b); ultimo = b; }
        cuerpo.position.x = dx * c;
        tapas.forEach(function (o) { var z0 = o.lado * (L / 2 + 380 * a);
          o.m.position.set(o.x1 * c, (-R + 3) * c + 260 * Math.sin(Math.PI * c), z0 + (o.z1 - z0) * c); o.m.rotation.x = -o.lado * Math.PI / 2 * c; });
        lam.mb.opacity = .95 * d;
        return 780 + 260 * a + 260 * c; } };
  })();

  /* Valde cónico: se parte en 2 mitades que se abren en abanico, cada una en su lámina 4x8 */
  var TC = (function () {
    var D = 1200, d = 600, H = 900, LW = 2440, LH = 1220, M = 40, ES = .3, U = 70, V = 4;
    var gg = Math.hypot((D - d) / 2, H), Rg = gg * D / (D - d), rg = gg * d / (D - d), THh = Math.PI * D / Rg / 2, s0 = (D / 2) / Rg;
    var g = new THREE.Group(), in_ = new THREE.Group(); in_.scale.setScalar(ES); in_.position.y = -110; g.add(in_);
    var mit = [0, Math.PI].map(function (beta) {
      var pos = new Float32Array((U + 1) * (V + 1) * 3), idx = [];
      for (var i = 0; i < U; i++) for (var j = 0; j < V; j++) { var a = i * (V + 1) + j, b = a + V + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
      var geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx);
      var mesh = new THREE.Mesh(geo, aceroT); in_.add(mesh);
      var ep = new Float32Array((U + 1) * 6), eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(ep, 3)); mesh.add(new THREE.LineLoop(eg, cianT));
      function upd(t) { var sA = s0 + (1 - s0) * t, cA = Math.sqrt(Math.max(0, 1 - sA * sA));
        function pt(u, w, o, k) { var ph = (u - .5) * THh, rho = rg + w * (Rg - rg), ps = beta + ph / sA, ra = rho * sA; o[k] = ra * Math.cos(ps); o[k + 1] = (rho - rg) * cA; o[k + 2] = ra * Math.sin(ps); }
        for (var i = 0; i <= U; i++) for (var j = 0; j <= V; j++) pt(i / U, j / V, pos, (i * (V + 1) + j) * 3);
        var k = 0; for (i = 0; i <= U; i++) { pt(i / U, 1, ep, k); k += 3; } for (i = U; i >= 0; i--) { pt(i / U, 0, ep, k); k += 3; }
        geo.attributes.position.needsUpdate = true; eg.attributes.position.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere(); eg.computeBoundingSphere(); }
      return { mesh: mesh, beta: beta, upd: upd }; });
    var medio = (rg * Math.cos(THh / 2) + Rg) / 2, centro = LH / 2 + M, offF = centro - medio;
    var lams = mit.map(function (o) { var l = lamina4x8(LH, LW); l.l.position.set(Math.cos(o.beta) * centro, -1.5, Math.sin(o.beta) * centro); in_.add(l.l); return l; });
    var ultimo = -1;
    return { g: g, dur: 7000, eti: 'Ductus Model · el valde se abre en abanico', piso: -113,
      set: function (p) {
        var a = ease(p * 4), b = ease((p - .25) * 2), c = ease(p * 4 - 3);
        if (Math.abs(b - ultimo) > 1e-4) { mit.forEach(function (o) { o.upd(b); }); ultimo = b; }
        var off = 250 * a + (offF - 250) * c;
        mit.forEach(function (o) { o.mesh.position.set(Math.cos(o.beta) * off, 0, Math.sin(o.beta) * off); });
        lams.forEach(function (l) { l.mb.opacity = .95 * c; });
        return 820 + 250 * a + 500 * b; } };
  })();

  var demos = [H, Lm, Br, TU, TC], QUIETO = 1600, ENTRA = 500, actual = -1, t0 = 0, giro = Math.random() * 6, dist = 800;
  // orden al azar: nunca repite la misma dos veces seguidas
  function otra() { if (actual < 0) return Math.floor(Math.random() * demos.length); var n = Math.floor(Math.random() * (demos.length - 1)); return n >= actual ? n + 1 : n; }
  demos.forEach(function (d) { d.g.visible = false; scene.add(d.g); });
  function poner(i, now) {
    actual = i; t0 = now; demos.forEach(function (d, k) { d.g.visible = k === i; });
    grid.position.y = demos[i].piso; if (eti) eti.textContent = demos[i].eti;
    puntos.forEach(function (p, k) { p.classList.toggle('on', k === i); });
  }
  function tam() { var w = caja.clientWidth, h = caja.clientHeight; r.setSize(w, h, false); cam.aspect = w / h; cam.fov = w < 420 ? 44 : 35; cam.updateProjectionMatrix(); }
  new ResizeObserver(tam).observe(caja); tam();
  var visible = true; new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(caja);
  if (reduce) { poner(0, 0); dist = demos[0].set(1); cam.position.set(dist * .55, dist * .42, dist * .72); cam.lookAt(0, 0, 0); r.render(scene, cam); return; }
  (function cuadro(now) {
    requestAnimationFrame(cuadro); if (!visible || document.hidden) return;
    if (actual < 0) poner(otra(), now);
    var d = demos[actual], t = now - t0;
    if (t > d.dur + QUIETO) { poner(otra(), now); d = demos[actual]; t = 0; }
    dist = d.set(Math.min(1, t / d.dur));
    var s = Math.min(1, t / ENTRA); d.g.scale.setScalar(.92 + .08 * ease(s));
    giro += .0035; var y = dist * .42;
    cam.position.set(Math.sin(giro + .9) * dist * .9, y, Math.cos(giro + .9) * dist * .9); cam.lookAt(0, -40, 0);
    r.render(scene, cam);
  })(performance.now());
})();
