alert("app.js 読み込みOK");
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const LS_KEY = 'wineLogEntries_v1';

  const state = {
    entries: [],
    editingId: null,
    photoDataUrl: null,
  };

  function toast(msg, ms = 1500) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), ms);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function fmtDate(iso) {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${hh}:${mm}`;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (s) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[s]));
  }

  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      state.entries = raw ? JSON.parse(raw) : [];
    } catch {
      state.entries = [];
    }
  }

  function save() {
    localStorage.setItem(LS_KEY, JSON.stringify(state.entries));
  }

  function uid() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  // 画像
  function renderPhotoPreview() {
    const box = $('photoPreview');
    box.innerHTML = '';
    if (!state.photoDataUrl) {
      box.textContent = '写真なし';
      return;
    }
    const img = document.createElement('img');
    img.src = state.photoDataUrl;
    box.appendChild(img);
  }

  function fileToImage(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = fr.result;
      };
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  function downscaleToDataUrl(img, maxSide = 1200, quality = 0.78) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const scale = Math.min(1, maxSide / Math.max(w, h));
    const cw = Math.round(w * scale);
    const ch = Math.round(h * scale);
    const c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, cw, ch);
    return c.toDataURL('image/jpeg', quality);
  }

  async function handlePhoto(file) {
    if (!file) {
      state.photoDataUrl = null;
      renderPhotoPreview();
      return;
    }
    const img = await fileToImage(file);
    state.photoDataUrl = downscaleToDataUrl(img);
    renderPhotoPreview();
  }

  // 表示
  function stars(n, cls) {
    if (!n) return `<span class="pill">未</span>`;
    return `<span class="rating ${cls}">${'★'.repeat(n)}<span class="pill">${n}</span></span>`;
  }

  function textMatch(e, q) {
    if (!q) return true;
    const t = `${e.name || ''} ${e.origin || ''} ${e.grape || ''} ${e.shop || ''}`.toLowerCase();
    return t.includes(q.toLowerCase());
  }

  function sortEntries(arr, sortKey) {
    const a = [...arr];
    const taro = (e) => Number(e.taroRating || 0);
    const mako = (e) => Number(e.makoRating || 0);
    a.sort((x, y) => {
      if (sortKey === 'new') return new Date(y.drankAt) - new Date(x.drankAt);
      if (sortKey === 'old') return new Date(x.drankAt) - new Date(y.drankAt);
      if (sortKey === 'taro') return (taro(y) - taro(x)) || (new Date(y.drankAt) - new Date(x.drankAt));
      if (sortKey === 'mako') return (mako(y) - mako(x)) || (new Date(y.drankAt) - new Date(x.drankAt));
      return 0;
    });
    return a;
  }

  function aggTop(entries, keyFn, ratingKey) {
    const m = new Map();
    for (const e of entries) {
      const r = Number(e[ratingKey] || 0);
      if (!r) continue;
      const key = (keyFn(e) || '').trim();
      if (!key) continue;
      if (!m.has(key)) m.set(key, { sum: 0, n: 0 });
      const obj = m.get(key);
      obj.sum += r; obj.n += 1;
    }
    const arr = [...m.entries()].map(([k, v]) => ({ k, avg: v.sum / v.n, n: v.n }));
    arr.sort((a, b) => (b.avg - a.avg) || (b.n - a.n));
    return arr.slice(0, 5);
  }

  function chipTrend(icon, x) {
    const avg = (Math.round(x.avg * 10) / 10).toFixed(1);
    return `<span class="chip">${icon} ${escapeHtml(x.k)} <span class="pill">平均★${avg}</span> <span class="pill">${x.n}件</span></span>`;
  }

  function renderKpis(entries) {
    const k = $('kpis');
    k.innerHTML = '';
    const sections = [
      { label: '太郎', rk: 'taroRating' },
      { label: '真子', rk: 'makoRating' },
    ];
    for (const s of sections) {
      const topG = aggTop(entries, (e) => e.grape, s.rk);
      const topO = aggTop(entries, (e) => e.origin, s.rk);

      const box = document.createElement('div');
      box.className = 'kpi';
      box.innerHTML = `
        <div class="kpi-title">
          <div class="name">${escapeHtml(s.label)}の“当たり傾向”</div>
          <span class="badge">★入りのみ</span>
        </div>
        <div class="small">品種 TOP</div>
        <div class="chips">${topG.length ? topG.map(x => chipTrend('🍇', x)).join('') : '<span class="small">まだデータなし</span>'}</div>
        <div class="small" style="margin-top:10px;">産地 TOP</div>
        <div class="chips">${topO.length ? topO.map(x => chipTrend('📍', x)).join('') : '<span class="small">まだデータなし</span>'}</div>
      `;
      k.appendChild(box);
    }
  }

  function renderList(arr) {
    const list = $('list');
    list.innerHTML = '';
    if (arr.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'note';
      empty.style.padding = '8px';
      empty.textContent = 'まだ記録がありません。右上の「＋追加」から入れてみてください。';
      list.appendChild(empty);
      return;
    }

    for (const e of arr) {
      const div = document.createElement('div');
      div.className = 'item';

      const thumb = document.createElement('div');
      thumb.className = 'thumb';
      if (e.photoDataUrl) {
        const img = document.createElement('img');
        img.src = e.photoDataUrl;
        thumb.appendChild(img);
      } else {
        thumb.innerHTML = `<div class="muted">no photo</div>`;
      }

      const name = e.name?.trim() ? e.name : '(名前なし)';
      const chips = [];
      if (e.origin) chips.push(`<span class="chip">📍 ${escapeHtml(e.origin)}</span>`);
      if (e.grape) chips.push(`<span class="chip">🍇 ${escapeHtml(e.grape)}</span>`);
      if (e.shop) chips.push(`<span class="chip">🛒 ${escapeHtml(e.shop)}</span>`);
      if (e.price !== '' && e.price != null) chips.push(`<span class="chip">💴 ${escapeHtml(String(e.price))}</span>`);

      const typeLabel =
  e.type === 'red' ? '赤' :
  e.type === 'white' ? '白' :
  e.type === 'other' ? 'その他' : '';

if (typeLabel) chips.unshift(`<span class="chip wineType ${e.type}">🍷 ${typeLabel}</span>`);


      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.innerHTML = `
        <h3>${escapeHtml(name)}</h3>
        <div class="subline">
          <span class="badge">${escapeHtml(fmtDate(e.drankAt))}</span>
          ${chips.join('')}
        </div>
        <div class="pair">
          <span class="who">太郎</span>${stars(e.taroRating, 'star')}
          <span class="who">真子</span>${stars(e.makoRating, 'star2')}
        </div>
        ${e.other ? `<div class="muted" style="margin-top:6px;">${escapeHtml(e.other).slice(0, 140)}${e.other.length > 140 ? '…' : ''}</div>` : ''}
      `;

      const right = document.createElement('div');
      right.className = 'right';

      const btnEdit = document.createElement('button');
      btnEdit.textContent = '編集';
      btnEdit.type = 'button';
      btnEdit.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        openModal('edit', e);
      });

      const btnDel = document.createElement('button');
      btnDel.textContent = '削除';
      btnDel.type = 'button';
      btnDel.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        if (!confirm('この記録を削除しますか？')) return;
        state.entries = state.entries.filter(x => x.id !== e.id);
        save();
        refresh();
        toast('削除しました');
      });

      right.appendChild(btnEdit);
      right.appendChild(btnDel);

      div.appendChild(thumb);
      div.appendChild(meta);
      div.appendChild(right);
      list.appendChild(div);
    }
  }

  function applyFilters() {
    const q = $('q').value.trim();
    const minTaro = Number($('minTaro').value || 0);
    const minMako = Number($('minMako').value || 0);
    const sortKey = $('sort').value;

    let arr = state.entries.filter(e => textMatch(e, q));
    if (minTaro > 0) arr = arr.filter(e => Number(e.taroRating || 0) >= minTaro);
    if (minMako > 0) arr = arr.filter(e => Number(e.makoRating || 0) >= minMako);

    arr = sortEntries(arr, sortKey);
    renderList(arr);
    renderKpis(state.entries);
  }

  function openModal(mode = 'add', entry = null) {
    state.editingId = (mode === 'edit' && entry) ? entry.id : null;
    state.photoDataUrl = entry?.photoDataUrl || null;

    $('modalTitle').textContent = mode === 'edit' ? '編集' : '追加';
    $('modalBackdrop').style.display = 'flex';

    $('f_drankAt').value = fmtDate(entry?.drankAt || nowIso());
    $('f_name').value = entry?.name || '';
    $('f_origin').value = entry?.origin || '';
    $('f_type').value = entry?.type ?? '';
    $('f_grape').value = entry?.grape || '';
    $('f_shop').value = entry?.shop || '';
    $('f_price').value = entry?.price ?? '';

    $('f_taroRating').value = entry?.taroRating ?? '';
    $('f_taroComment').value = entry?.taroComment || '';
    $('f_makoRating').value = entry?.makoRating ?? '';
    $('f_makoComment').value = entry?.makoComment || '';

    $('f_other').value = entry?.other || '';
    $('f_photo').value = '';

    renderPhotoPreview();
  }

  function closeModal() {
    $('modalBackdrop').style.display = 'none';
  }

  function exportJson() {
    const data = { exportedAt: nowIso(), entries: state.entries };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wine-log-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('バックアップを書き出しました');
  }

  function importJson() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      let parsed;
      try {
        parsed = JSON.parse(await file.text());
      } catch {
        alert('JSONが読み込めません');
        return;
      }
      const entries = parsed.entries || parsed;
      if (!Array.isArray(entries)) {
        alert('形式が違います');
        return;
      }
      if (!confirm(`取り込みますか？（${entries.length}件）\n※同じIDは上書き`)) return;

      const byId = new Map(state.entries.map(e => [e.id, e]));
      for (const e of entries) {
        const clean = {
          id: e.id || uid(),
          name: e.name || '',
          origin: e.origin || '',
          grape: e.grape || '',
          type: e.type || '',
          shop: e.shop || '',
          price: (e.price === 0 || e.price) ? e.price : '',
          taroRating: e.taroRating ?? '',
          taroComment: e.taroComment || '',
          makoRating: e.makoRating ?? '',
          makoComment: e.makoComment || '',
          other: e.other || '',
          drankAt: e.drankAt || nowIso(),
          photoDataUrl: e.photoDataUrl || null,
        };
        byId.set(clean.id, clean);
      }

      state.entries = [...byId.values()];
      save();
      refresh();
      toast('取り込み完了');
    };
    input.click();
  }

  function refresh() {
    applyFilters();
  }

  function wire() {
    // iPhone/Safariで確実に反応させるため pointerdown を使う
    $('btnAdd').addEventListener('pointerdown', (e) => { e.preventDefault(); openModal('add'); });
    $('btnClose').addEventListener('pointerdown', (e) => { e.preventDefault(); closeModal(); });
    $('btnSave').addEventListener('pointerdown', (e) => { e.preventDefault(); onSave(); });
    $('btnExport').addEventListener('pointerdown', (e) => { e.preventDefault(); exportJson(); });
    $('btnImport').addEventListener('pointerdown', (e) => { e.preventDefault(); importJson(); });

    $('q').addEventListener('input', applyFilters);
    $('sort').addEventListener('change', applyFilters);
    $('minTaro').addEventListener('change', applyFilters);
    $('minMako').addEventListener('change', applyFilters);

    $('modalBackdrop').addEventListener('pointerdown', (e) => {
      if (e.target === $('modalBackdrop')) closeModal();
    });

    $('f_photo').addEventListener('change', async () => {
      await handlePhoto($('f_photo').files?.[0]);
    });
  }

  function onSave() {
    try {
      $('btnSave').disabled = true;

      const entry = {
        id: state.editingId || uid(),
        name: $('f_name').value.trim(),
        origin: $('f_origin').value.trim(),
        grape: $('f_grape').value.trim(),
        const entry = {
  id: ...,
  name: $('f_name').value.trim(),
  origin: $('f_origin').value.trim(),
  grape: $('f_grape').value.trim(),
  type: $('f_type').value || '',
  shop: $('f_shop').value.trim(),
  ...
};

        shop: $('f_shop').value.trim(),
        price: $('f_price').value.trim(),

        taroRating: $('f_taroRating').value ? Number($('f_taroRating').value) : '',
        taroComment: $('f_taroComment').value.trim(),

        makoRating: $('f_makoRating').value ? Number($('f_makoRating').value) : '',
        makoComment: $('f_makoComment').value.trim(),

        other: $('f_other').value.trim(),
        drankAt: state.editingId
          ? (state.entries.find(e => e.id === state.editingId)?.drankAt || nowIso())
          : nowIso(),

        photoDataUrl: state.photoDataUrl || null,
      };

      const idx = state.entries.findIndex(e => e.id === entry.id);
      if (idx >= 0) state.entries[idx] = entry;
      else state.entries.unshift(entry); // 新規は上に

      save();
      closeModal();
      refresh();
      toast('保存しました');
    } catch (err) {
      console.error(err);
      alert('保存に失敗しました：' + (err?.message || err));
    } finally {
      $('btnSave').disabled = false;
    }
  }

  function init() {
    wire();
    load();
    refresh();
    toast('準備OK');
  }

  window.addEventListener('DOMContentLoaded', init);
})();
