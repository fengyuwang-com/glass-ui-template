/* Standalone UI behaviors. No mail/CRM/Thunderbird/service dependency.
 * Generalizes navigation, theme, menu, dialog, toast and tabs patterns
 * referenced from webui/app.js behavior ranges recorded in sources.json.
 * All demo content is fictitious; nothing leaves the page. */
(function () {
  'use strict';
  var root = document.documentElement;
  var live = document.getElementById('live');

  function say(message) {
    if (live) live.textContent = message;
  }

  /* ---------- theme ---------- */
  function currentTheme() {
    return root.dataset.theme === 'dark' ? 'dark' : 'light';
  }
  function setTheme(mode) {
    root.dataset.theme = mode === 'dark' ? 'dark' : 'light';
    try { localStorage.setItem('glass-ui-theme', root.dataset.theme); } catch (e) {}
    document.querySelectorAll('[data-theme-toggle]').forEach(function (el) {
      el.setAttribute('aria-pressed', String(root.dataset.theme === 'dark'));
    });
  }
  document.querySelectorAll('[data-theme-toggle]').forEach(function (el) {
    el.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      setTheme(next);
      say(next === 'dark' ? '已切换到深夜模式' : '已切换到白天模式');
    });
  });

  /* ---------- panes ---------- */
  var panes = Array.prototype.slice.call(document.querySelectorAll('.pane'));
  var title = document.getElementById('ttl');
  function go(name, push) {
    var target = document.getElementById('pane-' + name);
    if (!target) return;
    panes.forEach(function (p) {
      var on = p === target;
      p.hidden = !on;
      p.setAttribute('data-on', String(on));
    });
    document.querySelectorAll('[data-pane]').forEach(function (a) {
      if (a.getAttribute('data-pane') === name) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    var active = document.querySelector('[data-pane="' + name + '"][data-title]');
    if (title) title.textContent = active ? active.getAttribute('data-title') : target.getAttribute('aria-labelledby') || name;
    movePill();
    closeSheet(false);
    closeMenu(false);
    if (push !== false && history.pushState) {
      try { history.pushState({ pane: name }, '', '#' + name); } catch (e) {}
    }
    var main = document.getElementById('main-content');
    if (main && push !== false) main.focus({ preventScroll: true });
  }
  document.querySelectorAll('[data-pane]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      go(a.getAttribute('data-pane'));
    });
  });
  addEventListener('popstate', function () {
    go((location.hash || '#components').slice(1), false);
  });

  /* Moving selection pill shared by sidebar groups. */
  var pill = document.getElementById('navsel-all');
  var sidebar = document.getElementById('sidebar');
  function movePill() {
    if (!pill || !sidebar) return;
    var cur = sidebar.querySelector('.navrow[aria-current="page"]');
    if (!cur) { pill.setAttribute('data-on', '0'); return; }
    var sr = sidebar.getBoundingClientRect(), rr = cur.getBoundingClientRect();
    pill.style.left = (rr.left - sr.left) + 'px';
    pill.style.width = rr.width + 'px';
    pill.style.height = rr.height + 'px';
    pill.style.transform = 'translateY(' + (rr.top - sr.top + sidebar.scrollTop) + 'px)';
    pill.setAttribute('data-on', '1');
  }
  addEventListener('resize', movePill);
  if (sidebar) sidebar.addEventListener('scroll', movePill, { passive: true });

  /* ---------- sidebar ---------- */
  var win = document.getElementById('window');
  var btnSide = document.getElementById('btn-side');
  if (btnSide && win) {
    btnSide.addEventListener('click', function () {
      var hidden = win.classList.toggle('side-hidden');
      btnSide.setAttribute('aria-expanded', String(!hidden));
      say(hidden ? '侧栏已隐藏' : '侧栏已显示');
      movePill();
    });
  }

  /* ---------- menu ---------- */
  var more = document.getElementById('btn-more'), menu = document.getElementById('more-menu');
  function openMenu(on) {
    if (!menu || !more) return;
    menu.setAttribute('data-open', String(on));
    more.setAttribute('aria-expanded', String(on));
    if (on) {
      var first = menu.querySelector('.menuitem');
      if (first) first.focus();
    }
  }
  function closeMenu(returnFocus) {
    var was = menu && menu.getAttribute('data-open') === 'true';
    openMenu(false);
    if (was && returnFocus && more) more.focus();
  }
  if (more && menu) {
    more.addEventListener('click', function (e) {
      e.stopPropagation();
      openMenu(menu.getAttribute('data-open') !== 'true');
    });
    document.addEventListener('click', function (e) {
      if (!menu.contains(e.target) && e.target !== more) closeMenu();
    });
    menu.addEventListener('keydown', function (e) {
      var items = Array.prototype.slice.call(menu.querySelectorAll('.menuitem'));
      if (!items.length) return;
      var i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      else if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
      else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
      else if (e.key === 'Escape') { closeMenu(true); }
    });
    /* Global Escape closes menu/sheet even when focus is outside them. */
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (menu.getAttribute('data-open') === 'true') {
        var inside = menu.contains(document.activeElement);
        closeMenu(false);
        if (inside && more) more.focus();
      } else if (sheet && document.body.classList.contains('sheet-open')) {
        closeSheet();
      }
    });
  }

  /* ---------- sheet (mobile) ---------- */
  var sheet = document.getElementById('sheet'), btnSheet = document.getElementById('btn-sheet');
  var sheetClose = document.getElementById('sheet-close'), sheetReturn = null;
  function openSheet() {
    if (!sheet || !btnSheet) return;
    closeMenu();
    sheetReturn = document.activeElement;
    document.body.classList.add('sheet-open');
    btnSheet.setAttribute('aria-expanded', 'true');
    sheet.setAttribute('aria-hidden', 'false');
    var f = sheet.querySelector('button');
    if (f) f.focus();
  }
  function closeSheet(refocus) {
    if (!sheet || !btnSheet || !document.body.classList.contains('sheet-open')) return;
    document.body.classList.remove('sheet-open');
    btnSheet.setAttribute('aria-expanded', 'false');
    sheet.setAttribute('aria-hidden', 'true');
    if (refocus !== false && sheetReturn && sheetReturn.focus) sheetReturn.focus();
    sheetReturn = null;
  }
  if (btnSheet) btnSheet.addEventListener('click', function () {
    if (document.body.classList.contains('sheet-open')) closeSheet();
    else openSheet();
  });
  if (sheetClose) sheetClose.addEventListener('click', function () { closeSheet(); });
  var dim = document.getElementById('dim');
  if (dim) dim.addEventListener('click', function () { closeSheet(); });

  /* ---------- dialog ---------- */
  var dlg = document.getElementById('ui-dialog'), dlgReturn = null;
  var dlgOk = document.getElementById('dialog-ok'), dlgCancel = document.getElementById('dialog-cancel');
  var pending = null;
  function openDialog(opts) {
    if (!dlg) return;
    document.getElementById('dialog-title').textContent = opts.title || '';
    document.getElementById('dialog-message').textContent = opts.message || '';
    var img = document.getElementById('dialog-image');
    if (opts.image) { img.src = opts.image; img.hidden = false; }
    else { img.removeAttribute('src'); img.hidden = true; }
    dlgOk.textContent = opts.ok || '确定';
    pending = opts.onOk || null;
    dlgReturn = document.activeElement;
    document.querySelectorAll('.dlg').forEach(function (d) { d.setAttribute('aria-hidden', 'true'); });
    dlg.setAttribute('aria-hidden', 'false');
    document.body.classList.add('dlg-open');
    (opts.danger ? dlgOk : dlgCancel).focus();
    dlgOk.classList.toggle('danger', !!opts.danger);
  }
  function closeDialog() {
    if (!dlg) return;
    dlg.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('dlg-open');
    pending = null;
    if (dlgReturn && dlgReturn.focus) dlgReturn.focus();
    dlgReturn = null;
  }
  if (dlgOk) dlgOk.addEventListener('click', function () {
    var fn = pending;
    closeDialog();
    if (fn) fn();
  });
  if (dlgCancel) dlgCancel.addEventListener('click', closeDialog);
  var scrim = document.getElementById('scrim');
  if (scrim) scrim.addEventListener('click', closeDialog);
  /* Focus trap: Tab cycles inside the open dialog. */
  dlg.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || dlg.getAttribute('aria-hidden') === 'true') return;
    var focusables = Array.prototype.slice.call(
      dlg.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
      .filter(function (el) { return !el.disabled; });
    if (!focusables.length) { e.preventDefault(); return; }
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && dlg && dlg.getAttribute('aria-hidden') === 'false') closeDialog();
  });
  var demoConfirm = document.getElementById('demo-confirm');
  if (demoConfirm) demoConfirm.addEventListener('click', function () {
    openDialog({ title: '确认危险操作', message: '这只是模板里的静态样例，不会删除任何内容。', ok: '知道了' });
  });
  var demoDialog = document.getElementById('demo-dialog');
  if (demoDialog) demoDialog.addEventListener('click', function () {
    openDialog({ title: '弹层样例', message: '焦点进入弹层，Escape 或背景关闭，关闭后回到触发按钮。' });
  });

  /* ---------- toast ---------- */
  var region = document.getElementById('toast-region');
  function toast(message) {
    if (!region) { say(message); return; }
    while (region.children.length >= 3) region.firstChild.remove();
    var el = document.createElement('div');
    el.className = 'toast';
    var span = document.createElement('span');
    span.textContent = message;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '关闭';
    btn.addEventListener('click', function () { el.remove(); });
    el.append(span, btn);
    region.appendChild(el);
    say(message);
    setTimeout(function () { el.remove(); }, 6000);
  }
  document.querySelectorAll('[data-toast]').forEach(function (el) {
    el.addEventListener('click', function () {
      if (menu && menu.contains(el)) closeMenu(false);
      toast(el.getAttribute('data-toast'));
    });
  });
  var errToast = document.getElementById('demo-error-toast');
  if (errToast) errToast.addEventListener('click', function () {
    toast('错误反馈样例：生产应用应显示真实失败原因。');
  });

  /* ---------- toggle button demo ---------- */
  var toggle = document.getElementById('toggle-demo');
  if (toggle) toggle.addEventListener('click', function () {
    var on = toggle.getAttribute('aria-pressed') === 'true';
    toggle.setAttribute('aria-pressed', String(!on));
    toast(!on ? '切换按钮：已开启。' : '切换按钮：已关闭。');
  });

  /* ---------- form demo ---------- */
  var form = document.getElementById('demo-form');
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = document.getElementById('project-name');
    var err = document.getElementById('name-error');
    var bad = !name.value.trim();
    name.setAttribute('aria-invalid', String(bad));
    if (err) err.hidden = !bad;
    if (bad) { name.focus(); return; }
    toast('表单校验通过（仅当前页面演示）。');
  });

  /* ---------- segmented tabs ---------- */
  document.querySelectorAll('.seg').forEach(function (seg) {
    var tabs = Array.prototype.slice.call(seg.querySelectorAll('[role="tab"]'));
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab, false); });
      tab.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          var d = e.key === 'ArrowRight' ? 1 : -1;
          select(tabs[(i + d + tabs.length) % tabs.length], true);
        } else if (e.key === 'Home') { e.preventDefault(); select(tabs[0], true); }
        else if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1], true); }
      });
    });
  });

  /* ---------- component search ---------- */
  var search = document.getElementById('component-search');
  var empty = document.getElementById('search-empty');
  if (search) {
    varShortcut(search);
    search.addEventListener('input', function () {
      var q = search.value.trim().toLowerCase();
      var visible = 0;
      document.querySelectorAll('#pane-components [data-component]').forEach(function (sec) {
        var hit = !q || (sec.getAttribute('data-component') + ' ' + sec.textContent).toLowerCase().indexOf(q) !== -1;
        sec.hidden = !hit;
        if (hit) visible++;
      });
      if (empty) empty.hidden = visible !== 0;
    });
  }
  function varShortcut(input) {
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        input.focus();
      }
    });
  }

  go((location.hash || '#components').slice(1), false);
  movePill();
})();
