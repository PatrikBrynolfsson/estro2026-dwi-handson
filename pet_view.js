/* Shared by the PET pages B-D: decode the image strips and show a stack of axial slices.
 *
 *   PetView.decode(uri)            -> Promise<Uint8Array>  (grey levels of a PNG strip)
 *   PetView.suv(u8, vmax)          -> Float32Array         (square-root scale: value = vmax * (g/255)^2)
 *   PetView.hu(u8)                 -> Float32Array         (CT: g/254 * 2000 - 1000)
 *   PetView.gauss3(a, dims, fwhm)  -> Float32Array         (3-D Gaussian post-filter, FWHM in mm; dims = {ns, rows, cols, px, dz})
 *   PetView.chips(id, items, current, onPick) / PetView.press(id, key)
 *   PetView.toggle(id, {off, on, value, onChange})  a two-way switch (Grey <o> Colour)
 *   PetView.displayFor(img)  show the window and colour controls only where they apply (a short note otherwise)
 *   PetView.applies(id, reason) / PetView.limit(id, key => reason)  the building blocks
 *   PetView.outline(ctx, mask, rows, cols, sx, sy, colour, dash, fill)   (trace a 0/1 mask as closed loops)
 *   PetView.chart(svg, opt)        (a small line chart: one axis, one highlighted series, grey context series)
 *
 *   const v = PetView.create({ els: {canvas, viewer, tag, slider, sliceBox, sliceVal, cbarBox, cbar, ticks, readout},
 *                              dims, unit })
 *   v.st                 state: view ("axial" | "coronal"), img ("pet" | "ct" | "fused" | "change"), win, cmap ("grey" | "hot"),
 *                        slice, corRow, pet, ct, ref (for "change"), roi, point, label, unit
 *   v.set({...})         change the state and redraw
 *   v.overlay = (ctx, geo) => {}           extra drawing (outlines) after the image; geo = {view, sx, sy, rows, cols}
 *   v.pointer = (type, [r, c], ev) => bool  take over the pointer (drawing); return true when handled
 *   v.afterDraw = () => {}                  called after every draw (page readouts)
 * Uses the page's colour tokens.
 */
(() => {
  "use strict";
  const decode = uri => new Promise((ok, fail) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement("canvas"); c.width = im.width; c.height = im.height;
      const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(im, 0, 0);
      const d = x.getImageData(0, 0, im.width, im.height).data, u = new Uint8Array(im.width * im.height);
      for (let i = 0; i < u.length; i++) u[i] = d[4 * i];
      ok(u);
    };
    im.onerror = fail; im.src = uri;
  });
  const suv = (u8, vmax) => {
    const lut = new Float32Array(256).map((_, g) => vmax * (g / 255) ** 2), f = new Float32Array(u8.length);
    for (let i = 0; i < u8.length; i++) f[i] = lut[u8[i]];
    return f;
  };
  const hu = u8 => { const f = new Float32Array(u8.length); for (let i = 0; i < u8.length; i++) f[i] = u8[i] / 254 * 2000 - 1000; return f; };

  function blur1(a, len, stride, sigma) {
    if (sigma < 0.05) return a;
    const rad = Math.ceil(3 * sigma), w = [];
    let s = 0;
    for (let j = -rad; j <= rad; j++) { const v = Math.exp(-0.5 * (j / sigma) ** 2); w.push(v); s += v; }
    for (let j = 0; j < w.length; j++) w[j] /= s;
    const out = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) {
      const p = Math.floor(i / stride) % len;
      let acc = 0;
      for (let j = -rad; j <= rad; j++) { const q = Math.min(len - 1, Math.max(0, p + j)); acc += a[i + (q - p) * stride] * w[j + rad]; }
      out[i] = acc;
    }
    return out;
  }
  function gauss3(a, d, fwhm) {
    if (!fwhm) return a;
    const s = fwhm / 2.3548;
    let b = blur1(a, d.cols, 1, s / d.px);
    b = blur1(b, d.rows, d.cols, s / d.px);
    return blur1(b, d.ns, d.rows * d.cols, s / d.dz);
  }

  // ---------- colour ----------
  const clamp = t => Math.max(0, Math.min(1, t));
  function hot(t) {         // black -> red -> yellow -> white
    t = clamp(t);
    return [Math.min(1, t * 2.6), Math.max(0, Math.min(1, t * 2.6 - 1)), Math.max(0, Math.min(1, t * 3 - 2))].map(v => Math.round(v * 255));
  }
  const grey = t => { const v = Math.round(255 * (1 - clamp(t))); return [v, v, v]; };
  function diverge(t) {     // -1 blue .. 0 light grey .. +1 red
    t = Math.max(-1, Math.min(1, t));
    const mid = [236, 236, 236], neg = [33, 102, 172], pos = [178, 24, 43], e = t < 0 ? neg : pos, a = Math.abs(t);
    return mid.map((m, i) => Math.round(m + (e[i] - m) * a));
  }

  function chips(id, items, current, onPick) {
    const box = document.getElementById(id); box.innerHTML = "";
    for (const it of items) {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = it.label; b.dataset.key = it.key; b.setAttribute("aria-pressed", String(String(it.key) === String(current)));
      if (it.title) b.title = it.title;
      b.addEventListener("click", () => { press(id, it.key); onPick(it); });
      box.appendChild(b);
    }
  }
  // ---------- display controls that know what they apply to ----------
  const ctrlCss = document.createElement("style");
  ctrlCss.textContent = `
.switch { display: flex; align-items: center; gap: 8px; min-height: 31px; }
.switch .sw-lab { background: none; border: 0; border-radius: 6px; padding: 3px 2px; color: var(--muted); }
.switch .sw-lab.on { color: var(--ink); font-weight: bold; }
.switch .sw { position: relative; width: 44px; height: 24px; padding: 0; border-radius: 12px; background: var(--chip); border: 1px solid var(--guide); flex: none; }
.switch .sw span { position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: var(--muted); transition: left .15s; }
.switch .sw[aria-checked="true"] { background: var(--teal); border-color: var(--teal); }
.switch .sw[aria-checked="true"] span { left: 23px; background: #ffffff; }
.ctrl .na { display: flex; align-items: center; min-height: 31px; font-size: 13.5px; font-style: italic; color: var(--muted); }`;
  document.head.appendChild(ctrlCss);

  // a two-way switch, e.g. Grey (inverted) <o> Colour. Clicking a side label picks that side.
  function toggle(id, { off, on, value, onChange }) {
    const box = document.getElementById(id); box.className = "switch";
    box.innerHTML = `<button type="button" class="sw-lab" data-v="0">${off}</button><button type="button" class="sw" role="switch" aria-label="${on}"><span></span></button><button type="button" class="sw-lab" data-v="1">${on}</button>`;
    const sw = box.querySelector(".sw");
    const set = v => { sw.setAttribute("aria-checked", String(!!v)); box.querySelectorAll(".sw-lab").forEach(b => b.classList.toggle("on", (b.dataset.v === "1") === !!v)); };
    const pick = v => { set(v); onChange(!!v); };
    set(value);
    sw.addEventListener("click", () => pick(sw.getAttribute("aria-checked") !== "true"));
    box.querySelectorAll(".sw-lab").forEach(b => b.addEventListener("click", () => pick(b.dataset.v === "1")));
  }
  // show a control, or in its place a short note on why it does not apply (reason = null: it applies)
  function applies(id, reason) {
    const box = document.getElementById(id); if (!box) return;
    let n = box.nextElementSibling;
    if (!n || !n.classList.contains("na")) { n = document.createElement("span"); n.className = "na"; box.after(n); }
    box.hidden = !!reason; n.hidden = !reason; n.textContent = reason || "";
  }
  // grey out the chips that do not apply; why(key) -> reason (shown on hover) or null
  function limit(id, why) {
    document.getElementById(id).querySelectorAll("button").forEach(b => { const r = why(b.dataset.key); b.disabled = !!r; b.title = r || ""; });
  }
  // which display controls apply to an image type: window (SUV) and colours
  function displayFor(img, win = "win-chips", cmap = "cmap-chips") {
    applies(win, img === "ct" ? "CT: fixed lung window" : img === "change" ? "Change: fixed ±40 %" : null);
    applies(cmap, img === "pet" ? null : img === "fused" ? "PET on CT: always colour" : img === "ct" ? "Not used for CT" : "Change: fixed blue–red scale");
  }

  const press = (id, key) => document.getElementById(id).querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.key === String(key))));

  function outline(ctx, m, rows, cols, sx, sy, colour, dash, fill) {
    if (fill) {
      const ov = document.createElement("canvas"); ov.width = cols; ov.height = rows;
      const oc = ov.getContext("2d"), od = oc.createImageData(cols, rows);
      const rgb = [1, 3, 5].map(j => parseInt(colour.substr(j, 2), 16));
      for (let i = 0; i < rows * cols; i++) if (m[i]) { od.data[4 * i] = rgb[0]; od.data[4 * i + 1] = rgb[1]; od.data[4 * i + 2] = rgb[2]; od.data[4 * i + 3] = 70; }
      oc.putImageData(od, 0, 0); ctx.imageSmoothingEnabled = false; ctx.drawImage(ov, 0, 0, cols * sx, rows * sy);
    }
    const W = cols + 1, out = new Map(), on = (r, c) => r >= 0 && c >= 0 && r < rows && c < cols && m[r * cols + c];
    const add = (x0, y0, x1, y1) => { const k = y0 * W + x0; if (!out.has(k)) out.set(k, []); out.get(k).push(y1 * W + x1); };
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (!m[r * cols + c]) continue;
      if (!on(r - 1, c)) add(c, r, c + 1, r);
      if (!on(r, c + 1)) add(c + 1, r, c + 1, r + 1);
      if (!on(r + 1, c)) add(c + 1, r + 1, c, r + 1);
      if (!on(r, c - 1)) add(c, r + 1, c, r);
    }
    ctx.beginPath();
    for (const k0 of out.keys()) {
      while (out.get(k0).length) {
        let k = k0; ctx.moveTo((k % W) * sx, Math.floor(k / W) * sy);
        do { k = out.get(k).pop(); ctx.lineTo((k % W) * sx, Math.floor(k / W) * sy); } while (k !== k0 && out.get(k) && out.get(k).length);
        ctx.closePath();
      }
    }
    ctx.setLineDash(dash || []);
    ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = 4.4; ctx.stroke();
    ctx.strokeStyle = colour; ctx.lineWidth = 2.4; ctx.stroke(); ctx.setLineDash([]);
  }

  // ---------- a small line chart (SVG): x categories, one axis ----------
  // opt: { x: [labels], series: [{ name, values, main }], band: [[lo, hi] per x] (optional), yLabel, xLabel, current (x index),
  //        fmt, yMin, yMax }
  function chart(svg, o) {
    const W = 320, H = 170, L = 42, R = 12, T = 14, B = 34;
    const all = o.series.flatMap(s => s.values).concat(o.band ? o.band.flat() : []).filter(v => isFinite(v));
    let y0 = o.yMin != null ? o.yMin : Math.min(...all), y1 = o.yMax != null ? o.yMax : Math.max(...all);
    if (y1 - y0 < 1e-6) { y1 += 1; y0 -= 1; }
    const pad = (y1 - y0) * 0.08; if (o.yMin == null) y0 -= pad; if (o.yMax == null) y1 += pad;
    const n = o.x.length, X = i => L + (n === 1 ? 0 : i * (W - L - R) / (n - 1)), Y = v => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
    const fmt = o.fmt || (v => v.toFixed(1));
    const ticks = []; const step = niceStep((y1 - y0) / 4);
    for (let v = Math.ceil(y0 / step) * step; v <= y1 + 1e-9; v += step) ticks.push(v);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${o.aria || ""}">`;
    for (const v of ticks) s += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${L - 6}" y="${Y(v) + 4}" class="tick" text-anchor="end">${fmt(v)}</text>`;
    o.x.forEach((lab, i) => { s += `<text x="${X(i)}" y="${H - B + 16}" class="tick" text-anchor="middle">${lab}</text>`; });
    if (o.xLabel) s += `<text x="${(L + W - R) / 2}" y="${H - 3}" class="axis" text-anchor="middle">${o.xLabel}</text>`;
    if (o.band) {
      const up = o.band.map((b, i) => `${X(i)},${Y(b[1])}`), dn = o.band.map((b, i) => `${X(i)},${Y(b[0])}`).reverse();
      s += `<polygon points="${up.concat(dn).join(" ")}" class="band"/>`;
    }
    if (o.current != null) s += `<line x1="${X(o.current)}" x2="${X(o.current)}" y1="${T}" y2="${H - B}" class="cur"/>`;
    for (const se of o.series.filter(x => !x.main)) s += `<polyline points="${se.values.map((v, i) => `${X(i)},${Y(v)}`).join(" ")}" class="ctx"/>`;
    for (const se of o.series.filter(x => x.main)) {
      s += `<polyline points="${se.values.map((v, i) => `${X(i)},${Y(v)}`).join(" ")}" class="main"/>`;
      se.values.forEach((v, i) => {
        s += `<circle cx="${X(i)}" cy="${Y(v)}" r="${i === o.current ? 5.5 : 4}" class="dot${i === o.current ? " on" : ""}"><title>${o.x[i]}: ${fmt(v)}</title></circle>`;
        s += `<circle cx="${X(i)}" cy="${Y(v)}" r="12" class="hit"><title>${o.xTitle ? o.xTitle(i) : o.x[i]}: ${fmt(v)}${o.unit ? " " + o.unit : ""}</title></circle>`;
      });
      if (o.current != null) { const v = se.values[o.current], x = X(o.current); s += `<text x="${x + (o.current > n / 2 ? -8 : 8)}" y="${Y(v) - 9}" class="lab" text-anchor="${o.current > n / 2 ? "end" : "start"}">${fmt(v)}</text>`; }
    }
    s += `</svg>`;
    svg.innerHTML = s;
  }
  function niceStep(x) { const p = Math.pow(10, Math.floor(Math.log10(x))), m = x / p; return (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p; }
  const chartCss = `
.chart svg { width: 100%; height: auto; display: block; font-family: var(--font); }
.chart .grid { stroke: var(--line); stroke-width: 1; }
.chart .tick { fill: var(--muted); font-size: 11px; }
.chart .axis { fill: var(--muted); font-size: 11.5px; }
.chart .band { fill: var(--line); opacity: .9; }
.chart .cur { stroke: var(--guide); stroke-dasharray: 3 4; }
.chart .ctx { fill: none; stroke: var(--guide); stroke-width: 1.5; opacity: .6; }
.chart .main { fill: none; stroke: var(--teal); stroke-width: 2; }
.chart .dot { fill: var(--teal); stroke: var(--surface); stroke-width: 2; }
.chart .dot.on { fill: var(--ink); }
.chart .hit { fill: transparent; }
.chart .lab { fill: var(--ink); font-size: 12px; font-weight: bold; }`;
  const st_ = document.createElement("style"); st_.textContent = chartCss; document.head.appendChild(st_);

  // ---------- the viewer ----------
  function create(opt) {
    const E = opt.els, D = opt.dims, NA = D.rows * D.cols;
    const st = { view: "axial", img: "pet", win: 10, cmap: "grey", slice: 0, corRow: 0, pet: null, ct: null, ref: null,
      roi: null, point: null, drag: null, label: "", unit: opt.unit || "SUV", changeWin: 40 };
    const api = { st, overlay: null, pointer: null, afterDraw: null };
    const dimsOf = view => view === "axial" ? { rows: D.rows, cols: D.cols, dy: D.px } : { rows: D.ns, cols: D.cols, dy: D.dz };
    const idx = (view, r, c) => view === "axial" ? st.slice * NA + r * D.cols + c : r * NA + st.corRow * D.cols + c;
    api.valueAt = (view, r, c, arr) => { const V = dimsOf(view); if (r < 0 || c < 0 || r >= V.rows || c >= V.cols) return NaN; return (arr || st.pet)[idx(view, r, c)]; };

    const ends = E.sliceBox ? [...E.sliceBox.querySelectorAll(":scope > span:not(.ctrl-label):not(.mono)")] : [], endText = ends.map(e => e.textContent);
    const cv = E.canvas, ctx = cv.getContext("2d"), off = document.createElement("canvas"), octx = off.getContext("2d");
    let geo = null;
    const colour = t => st.cmap === "hot" ? hot(t) : grey(t);
    function drawBar() {
      const c = E.cbar, x = c.getContext("2d"), im = x.createImageData(14, 256);
      const cm = st.img === "change" ? (t => diverge(2 * t - 1)) : st.img === "fused" ? hot : colour;
      for (let y = 0; y < 256; y++) { const rgb = cm(1 - y / 255); for (let i = 0; i < 14; i++) { const o = 4 * (y * 14 + i); im.data[o] = rgb[0]; im.data[o + 1] = rgb[1]; im.data[o + 2] = rgb[2]; im.data[o + 3] = 255; } }
      x.putImageData(im, 0, 0);
      E.ticks.innerHTML = st.img === "change" ? `<span>+${st.changeWin} %</span><span>0</span><span>−${st.changeWin} %</span>` : `<span>${st.win}</span><span>${st.win / 2}</span><span>0</span>`;
      if (E.cbarLabel) E.cbarLabel.textContent = st.img === "change" ? "Change" : st.unit;
    }
    function draw() {
      const V = dimsOf(st.view);
      off.width = V.cols; off.height = V.rows;
      const S = Math.max(2, Math.ceil(560 / V.cols)), W = V.cols * S, H = Math.round(V.rows * (V.dy / D.px) * S);
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      geo = { view: st.view, sx: W / V.cols, sy: H / V.rows, rows: V.rows, cols: V.cols };
      const img = octx.createImageData(V.cols, V.rows), d = img.data;
      for (let r = 0; r < V.rows; r++) for (let c = 0; c < V.cols; c++) {
        const i = r * V.cols + c, j = idx(st.view, r, c), o = 4 * i;
        let rgb;
        if (st.img === "pet") rgb = colour(st.pet[j] / st.win);
        else if (st.img === "change") {
          const ref = st.ref[j];
          rgb = ref > 0.8 ? diverge((st.pet[j] - ref) / ref * 100 / st.changeWin) : [236, 236, 236];
        } else {
          const h = st.ct[j], gv = clamp((h + 1000) / 1300) * 255;
          rgb = [gv, gv, gv];
          if (st.img === "fused") {
            const t = st.pet[j] / st.win, a = t < 0.06 ? 0 : Math.min(0.85, t * 1.2), cc = hot(t);
            rgb = rgb.map((g, k) => g * (1 - a) + cc[k] * a);
          }
        }
        d[o] = rgb[0]; d[o + 1] = rgb[1]; d[o + 2] = rgb[2]; d[o + 3] = 255;
      }
      octx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
      ctx.drawImage(off, 0, 0, W, H);
      const light = (st.img === "pet" && st.cmap === "grey") || st.img === "change";
      E.viewer.classList.toggle("light", light);
      const ink = light ? "#e0821a" : "#4cb4d0";
      ctx.setLineDash([6, 6]); ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.beginPath();
      if (st.view === "coronal") { const y = (st.slice + 0.5) * geo.sy; ctx.moveTo(0, y); ctx.lineTo(W, y); }
      else if (opt.showCorLine !== false) { const y = (st.corRow + 0.5) * geo.sy; ctx.moveTo(0, y); ctx.lineTo(14, y); ctx.moveTo(W - 14, y); ctx.lineTo(W, y); }
      ctx.stroke(); ctx.setLineDash([]);
      if (api.overlay) api.overlay(ctx, geo);
      if (st.roi && st.roi.view === st.view) {
        const { r, c, rad } = st.roi;
        ctx.strokeStyle = ink; ctx.lineWidth = 2.5; ctx.beginPath();
        ctx.ellipse((c + 0.5) * geo.sx, (r + 0.5) * geo.sy, rad / D.px * geo.sx, rad / V.dy * geo.sy, 0, 0, 2 * Math.PI); ctx.stroke();
      }
      if (st.point && st.point.view === st.view) {
        const x = (st.point.c + 0.5) * geo.sx, y = (st.point.r + 0.5) * geo.sy;
        ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(x - 10, y); ctx.lineTo(x - 3, y); ctx.moveTo(x + 3, y); ctx.lineTo(x + 10, y);
        ctx.moveTo(x, y - 10); ctx.lineTo(x, y - 3); ctx.moveTo(x, y + 3); ctx.lineTo(x, y + 10); ctx.stroke();
      }
      // one slider: axial slices (head at the top) or coronal slices (front at the top). Its value is reversed
      // (value = last - slice) so the track fills from the bottom while the top stays slice 0.
      const cor = st.view === "coronal", k = cor ? st.corRow : st.slice, nk = cor ? D.rows : D.ns;
      E.cbarBox.style.visibility = st.img === "ct" ? "hidden" : "visible";
      const name = { pet: "PET", ct: "CT", fused: "PET on CT", change: "Change" }[st.img];
      E.tag.textContent = (st.label ? st.label + " · " : "") + `${name} · ${cor ? "coronal · " : ""}slice ${k + 1} of ${nk}`;
      if (E.sliceVal) E.sliceVal.textContent = `${k + 1} / ${nk}`;
      if (E.slider) { E.slider.max = String(nk - 1); E.slider.value = String(nk - 1 - k); E.slider.setAttribute("aria-label", cor ? "Coronal slice (top = front)" : "Slice (top = towards the head)"); }
      if (ends.length === 2) { ends[0].textContent = cor ? "front" : endText[0]; ends[1].textContent = cor ? "back" : endText[1]; }
      drawBar(); readout();
      if (E.viewer && E.viewer.offsetParent !== null) displayFor(st.img);   // the shown viewer sets which display controls apply
      if (api.afterDraw) api.afterDraw();
    }
    api.draw = draw;
    api.set = p => { Object.assign(st, p); draw(); };

    api.roiStats = () => {
      if (!st.roi || st.roi.view !== st.view) return null;
      const V = dimsOf(st.view), { r: r0, c: c0, rad } = st.roi;
      let n = 0, sum = 0, mx = -Infinity;
      const rr = Math.ceil(rad / V.dy), cr = Math.ceil(rad / D.px);
      for (let r = Math.max(0, r0 - rr); r <= Math.min(V.rows - 1, r0 + rr); r++)
        for (let c = Math.max(0, c0 - cr); c <= Math.min(V.cols - 1, c0 + cr); c++) {
          if (((r - r0) * V.dy) ** 2 + ((c - c0) * D.px) ** 2 > rad * rad) continue;
          const v = st.pet[idx(st.view, r, c)]; n++; sum += v; if (v > mx) mx = v;
        }
      return n ? { n, mean: sum / n, max: mx, d: 2 * rad } : null;
    };
    const f2 = x => isFinite(x) ? x.toFixed(2) : "–";
    function readout() {
      if (!E.readout) return;
      const u = st.unit === "SUV" ? "SUV" : st.unit, lines = [];
      const pre = st.unit === "SUV" ? "SUV" : "";
      if (st.point && st.point.view === st.view) {
        const v = api.valueAt(st.view, st.point.r, st.point.c);
        let extra = "";
        if (st.img === "change" && st.ref) { const r = api.valueAt(st.view, st.point.r, st.point.c, st.ref); extra = ` &nbsp; <span class="note">with the matched CT</span> <span class="mono">${f2(r)}</span> <b class="mono">${r > 0.8 ? ((v / r - 1) * 100 >= 0 ? "+" : "") + ((v / r - 1) * 100).toFixed(0) + " %" : ""}</b>`; }
        lines.push(`<div>Point: <b class="mono">${pre ? pre + " " : ""}${f2(v)}${pre ? "" : " " + u}</b>${extra}</div>`);
      }
      const s = api.roiStats();
      if (s) lines.push(`<div>Circle (${(s.d / 10).toFixed(1)} cm): <b class="mono">${pre}max ${f2(s.max)}</b> &nbsp; <b class="mono">${pre}mean ${f2(s.mean)}</b>${pre ? "" : ` <span class="note">${u}</span>`}</div>`);
      if (!lines.length) lines.push(`<span class="note">Click to read a value; drag to draw a circle.${st.view === "coronal" ? " Clicking also moves the axial slice." : ""}</span>`);
      E.readout.innerHTML = lines.join("");
    }

    const gridRC = ev => { const b = cv.getBoundingClientRect(), V = dimsOf(st.view); return [(ev.clientY - b.top) / b.height * V.rows, (ev.clientX - b.left) / b.width * V.cols]; };
    cv.addEventListener("pointerdown", ev => {
      ev.preventDefault(); cv.setPointerCapture(ev.pointerId);
      const p = gridRC(ev);
      if (api.pointer && api.pointer("down", p, ev)) return;
      st.drag = p.map(Math.floor);
    });
    cv.addEventListener("pointermove", ev => {
      const p = gridRC(ev);
      if (api.pointer && api.pointer("move", p, ev)) return;
      if (!st.drag) return;
      const V = dimsOf(st.view), q = p.map(Math.floor), rad = Math.hypot((q[0] - st.drag[0]) * V.dy, (q[1] - st.drag[1]) * D.px);
      if (rad > 3) { st.roi = { view: st.view, r: st.drag[0], c: st.drag[1], rad }; st.point = null; draw(); }
    });
    function up(ev) {
      const p = gridRC(ev);
      if (api.pointer && api.pointer("up", p, ev)) return;
      if (!st.drag) return;
      const q = p.map(Math.floor), V = dimsOf(st.view);
      const moved = st.roi && st.roi.view === st.view && st.roi.r === st.drag[0] && st.roi.c === st.drag[1];
      if (!moved && q[0] >= 0 && q[0] < V.rows && q[1] >= 0 && q[1] < V.cols) {
        st.point = { view: st.view, r: q[0], c: q[1] };
        if (st.view === "coronal") st.slice = q[0]; else st.corRow = q[0];
      }
      st.drag = null; draw();
    }
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointercancel", () => { st.drag = null; if (api.pointer) api.pointer("cancel", [0, 0]); });
    if (E.slider) {
      E.slider.addEventListener("input", () => { const k = +E.slider.max - +E.slider.value; if (st.view === "coronal") st.corRow = k; else st.slice = k; st.roi = null; st.point = null; draw(); });
    }
    return api;
  }

  window.PetView = { decode, suv, hu, gauss3, chips, press, toggle, applies, limit, displayFor, outline, chart, create, hot, diverge };
})();
