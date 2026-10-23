/* Standalone wallpaper for the UI template. IndexedDB persistence, no network.
 * Demo-only: import/delete affect this browser only. file:// without IndexedDB
 * falls back to memory and reports it instead of pretending to persist. */
(function () {
  'use strict';
  var MAX_FILES = 20;
  var MAX_EACH = 8 * 1024 * 1024;
  var MAX_TOTAL = 24 * 1024 * 1024;
  var MAX_PIXELS = 40000000;
  var TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
  var DEFAULTS = { fit: 'cover', rotate: 0, x: 50, y: 50, blur: 22, overlay: null };

  var status = document.getElementById('wallpaper-status');
  var files = document.getElementById('wallpaper-files');
  var resetBtn = document.getElementById('wallpaper-reset');
  var fitSel = document.getElementById('wallpaper-fit');
  var rotateSel = document.getElementById('wallpaper-rotate');
  var xRange = document.getElementById('wallpaper-x');
  var yRange = document.getElementById('wallpaper-y');
  var blurRange = document.getElementById('wallpaper-blur');
  var overlayRange = document.getElementById('wallpaper-overlay');
  var gallery = document.getElementById('wallpaper-gallery');
  var empty = document.getElementById('wallpaper-empty');
  if (!status || !files || !resetBtn || !fitSel || !rotateSel || !xRange
      || !yRange || !blurRange || !overlayRange || !gallery || !empty) return;

  var state = { items: [], selectedId: null, settings: Object.assign({}, DEFAULTS), urls: {}, persistent: true };
  var rotateTimer = null, overlayTouched = false;

  function say(t) { status.textContent = t; }
  function theme() { return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'; }
  function autoOverlay() { return theme() === 'dark' ? 82 : 66; }
  function eachOutput(input) {
    var out = input.parentNode.querySelector('output');
    return out;
  }
  function paintOutputs() {
    [[xRange, '%'], [yRange, '%'], [blurRange, 'px']].forEach(function (pair) {
      var out = eachOutput(pair[0]);
      if (out) out.textContent = pair[0].value + pair[1];
    });
    var out = eachOutput(overlayRange);
    if (out) out.textContent = overlayTouched ? overlayRange.value + '%' : '自动';
  }

  /* ---------- storage ---------- */
  var db = null;
  function openDb() {
    return new Promise(function (resolve) {
      if (!('indexedDB' in window)) return resolve(null);
      try {
        var req = indexedDB.open('glass-ui-template', 1);
        req.onupgradeneeded = function () {
          req.result.createObjectStore('wallpapers', { keyPath: 'id' });
        };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { resolve(null); };
      } catch (e) { resolve(null); }
    });
  }
  function tx(mode, fn) {
    return new Promise(function (resolve, reject) {
      if (!db) return reject(new Error('no-db'));
      try {
        var t = db.transaction('wallpapers', mode);
        fn(t.objectStore('wallpapers'), resolve, reject);
      } catch (e) { reject(e); }
    });
  }
  function loadSettings() {
    try {
      var raw = localStorage.getItem('glass-ui-wallpaper');
      if (!raw) return;
      var s = JSON.parse(raw);
      if (s && typeof s === 'object') {
        state.settings = Object.assign({}, DEFAULTS, s.settings);
        state.selectedId = typeof s.selectedId === 'string' ? s.selectedId : null;
        overlayTouched = state.settings.overlay !== null && state.settings.overlay !== undefined;
      }
    } catch (e) {}
  }
  function saveSettings() {
    try { localStorage.setItem('glass-ui-wallpaper', JSON.stringify({ settings: state.settings, selectedId: state.selectedId })); } catch (e) {}
  }

  /* ---------- apply ---------- */
  function currentItem() {
    return state.items.find(function (i) { return i.id === state.selectedId; }) || null;
  }
  function apply() {
    var root = document.documentElement;
    var item = currentItem();
    var url = item && state.urls[item.id] ? 'url("' + state.urls[item.id] + '")'
      : 'linear-gradient(145deg,#91b6da 0%,#cad8eb 35%,#c4c4df 65%,#bba7b7 100%)';
    root.style.setProperty('--wallpaper-image', url);
    root.style.setProperty('--wallpaper-fit', state.settings.fit);
    root.style.setProperty('--wallpaper-position', state.settings.x + '% ' + state.settings.y + '%');
    root.style.setProperty('--wallpaper-blur', state.settings.blur + 'px');
    var overlay = overlayTouched ? Number(state.settings.overlay) : autoOverlay();
    root.style.setProperty('--wallpaper-opacity', String(Math.min(100, Math.max(0, overlay)) / 100));
    fitSel.value = state.settings.fit;
    rotateSel.value = String(state.settings.rotate);
    xRange.value = state.settings.x; yRange.value = state.settings.y;
    blurRange.value = state.settings.blur;
    overlayRange.value = overlayTouched ? state.settings.overlay : autoOverlay();
    paintOutputs();
    render();
    scheduleRotate();
    saveSettings();
  }
  new MutationObserver(function () {
    if (!overlayTouched) {
      document.documentElement.style.setProperty('--wallpaper-opacity', String(autoOverlay() / 100));
      paintOutputs();
    }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  /* ---------- gallery ---------- */
  function render() {
    gallery.replaceChildren();
    var item = currentItem();
    if (item && !state.urls[item.id]) state.selectedId = null;
    state.items.forEach(function (it) {
      var fig = document.createElement('figure');
      fig.dataset.active = String(it.id === state.selectedId);
      var img = document.createElement('img');
      img.alt = it.name;
      img.loading = 'lazy';
      if (state.urls[it.id]) img.src = state.urls[it.id];
      else img.removeAttribute('src');
      var cap = document.createElement('figcaption');
      cap.textContent = it.name + (it.id === state.selectedId ? '（当前）' : '');
      var row = document.createElement('div');
      row.className = 'rowbtns';
      var use = document.createElement('button');
      use.className = 'btn'; use.type = 'button'; use.textContent = '选用';
      use.setAttribute('aria-label', '选用 ' + it.name);
      use.addEventListener('click', function () { state.selectedId = it.id; apply(); say('已选用：' + it.name); });
      var del = document.createElement('button');
      del.className = 'btn'; del.type = 'button'; del.textContent = '删除';
      del.setAttribute('aria-label', '删除 ' + it.name);
      del.addEventListener('click', function () {
        if (!window.confirm('删除「' + it.name + '」？仅影响本浏览器演示，不会影响其他数据。')) return;
        remove(it.id);
      });
      row.append(use, del);
      fig.append(img, cap, row);
      gallery.appendChild(fig);
    });
    if (empty) empty.hidden = state.items.length !== 0;
  }
  function scheduleRotate() {
    if (rotateTimer) { clearInterval(rotateTimer); rotateTimer = null; }
    var secs = Number(state.settings.rotate);
    if (!secs || state.items.length < 2) return;
    rotateTimer = setInterval(function () {
      if (!state.items.length) return;
      var i = state.items.findIndex(function (it) { return it.id === state.selectedId; });
      state.selectedId = state.items[(i + 1 + state.items.length) % state.items.length].id;
      apply();
    }, secs * 1000);
  }
  /* Avoid a leaked interval across bfcache/pagehide; resume on return. */
  addEventListener('pagehide', function () {
    if (rotateTimer) { clearInterval(rotateTimer); rotateTimer = null; }
  });
  addEventListener('pageshow', function () { scheduleRotate(); });

  /* ---------- import ---------- */
  function totalBytes() {
    return state.items.reduce(function (n, it) { return n + (it.bytes || 0); }, 0);
  }
  function decode(file) {
    if ('createImageBitmap' in window) return createImageBitmap(file).then(function (bmp) {
      var w = bmp.width, h = bmp.height;
      bmp.close();
      return { width: w, height: h };
    });
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('无法解码')); };
      img.src = url;
    });
  }
  files.addEventListener('change', async function () {
    var list = Array.prototype.slice.call(files.files || []);
    files.value = '';
    if (!list.length) return;
    for (var k = 0; k < list.length; k++) {
      var file = list[k];
      try {
        if (TYPES.indexOf(file.type) === -1 || !file.size) throw new Error('仅支持 JPEG / PNG / WebP / GIF / AVIF 非空图片');
        if (file.size > MAX_EACH) throw new Error('「' + file.name + '」超过 8 MiB，已跳过');
        if (state.items.length >= MAX_FILES) throw new Error('图库已满（20 张），已停止导入');
        if (totalBytes() + file.size > MAX_TOTAL) throw new Error('总计超过 24 MiB，已停止导入');
        say('正在解码：' + file.name + '…');
        var dims = await decode(file);
        if (!dims.width || !dims.height || dims.width * dims.height > MAX_PIXELS) throw new Error('「' + file.name + '」尺寸超出 40 百万像素，已跳过');
        var id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())).replace(/-/g, '');
        var record = { id: id, name: file.name.slice(0, 120) || '未命名图片', type: file.type,
          width: dims.width, height: dims.height, bytes: file.size, created_at: Date.now(), blob: file };
        if (db) await tx('readwrite', function (store, resolve, reject) {
          var req = store.add(record);
          req.onsuccess = function () { resolve(); };
          req.onerror = function () { reject(req.error || new Error('保存失败')); };
        });
        state.urls[id] = URL.createObjectURL(file);
        state.items.push({ id: id, name: record.name, width: dims.width, height: dims.height, bytes: file.size });
        if (!state.selectedId) state.selectedId = id;
        apply();
        say('已导入：' + record.name + '（' + dims.width + '×' + dims.height + '）。');
      } catch (e) {
        say('导入未完成：' + e.message);
      }
    }
  });
  function remove(id) {
    if (state.urls[id]) { URL.revokeObjectURL(state.urls[id]); delete state.urls[id]; }
    state.items = state.items.filter(function (it) { return it.id !== id; });
    if (state.selectedId === id) state.selectedId = state.items.length ? state.items[0].id : null;
    var done = db ? tx('readwrite', function (store, resolve, reject) {
      var req = store.delete(id);
      req.onsuccess = function () { resolve(); };
      req.onerror = function () { reject(req.error || new Error('删除失败')); };
    }).catch(function () {}) : Promise.resolve();
    done.then(function () { apply(); say('已删除导入图片。'); });
  }

  /* ---------- settings ---------- */
  fitSel.addEventListener('change', function () { state.settings.fit = fitSel.value; apply(); });
  rotateSel.addEventListener('change', function () { state.settings.rotate = Number(rotateSel.value); apply(); });
  [[xRange, 'x'], [yRange, 'y'], [blurRange, 'blur']].forEach(function (pair) {
    pair[0].addEventListener('input', function () {
      state.settings[pair[1]] = Number(pair[0].value);
      paintOutputs();
      document.documentElement.style.setProperty('--wallpaper-position', state.settings.x + '% ' + state.settings.y + '%');
      document.documentElement.style.setProperty('--wallpaper-blur', state.settings.blur + 'px');
    });
    pair[0].addEventListener('change', apply);
  });
  overlayRange.addEventListener('input', function () {
    overlayTouched = true;
    state.settings.overlay = Number(overlayRange.value);
    paintOutputs();
    document.documentElement.style.setProperty('--wallpaper-opacity', String(state.settings.overlay / 100));
  });
  overlayRange.addEventListener('change', apply);
  resetBtn.addEventListener('click', function () {
    state.selectedId = null;
    state.settings = Object.assign({}, DEFAULTS);
    overlayTouched = false;
    apply();
    say('已恢复默认背景。');
  });

  /* ---------- init ---------- */
  loadSettings();
  openDb().then(function (handle) {
    db = handle;
    if (!db) {
      state.persistent = false;
      apply();
      say('此浏览器禁用了 IndexedDB，导入仅保留在当前页面内存中。');
      return;
    }
    tx('readonly', function (store, resolve, reject) {
      var req = store.getAll();
      req.onsuccess = function () { resolve(req.result || []); };
      req.onerror = function () { reject(req.error || new Error('读取失败')); };
    }).then(function (rows) {
      rows.forEach(function (r) {
        if (!r || !r.blob) return;
        state.urls[r.id] = URL.createObjectURL(r.blob);
        state.items.push({ id: r.id, name: r.name, width: r.width, height: r.height, bytes: r.bytes });
      });
      if (state.selectedId && !state.items.find(function (i) { return i.id === state.selectedId; })) state.selectedId = null;
      apply();
      say(state.items.length ? '已从本浏览器图库恢复 ' + state.items.length + ' 张。' : '还没有导入图片。选择一张本地图片开始。');
    }).catch(function (e) {
      apply();
      say('图库读取失败：' + e.message);
    });
  });
})();
