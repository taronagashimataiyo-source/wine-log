'use strict';

const $ = (id) => document.getElementById(id);

const STORAGE_KEY = 'wineLogEntriesV1';

let entries = loadEntries();
let editingId = null;
let editingPhotoDataUrl = '';

function nowString() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1400);
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function openModal(entry = null) {
  editingId = entry?.id ?? null;
  editingPhotoDataUrl = entry?.photo ?? '';

  $('modalTitle').textContent = editingId ? '編集' : '追加';
  $('btnDelete').style.display = editingId ? 'inline-flex' : 'none';

  $('f_name').value = entry?.name ?? '';
  $('f_origin').value = entry?.origin ?? '';
  $('f_grape').value = entry?.grape ?? '';
  $('f_type').value = entry?.type ?? '';
  $('f_shop').value = entry?.shop ?? '';
  $('f_price').value = entry?.price ?? '';
  $('f_drankAt').value = entry?.drankAt ?? nowString();

  $('f_taroRating').value = entry?.taroRating ?? '';
  $('f_taroComment').value = entry?.taroComment ?? '';
  $('f_makoRating').value = entry?.makoRating ?? '';
  $('f_makoComment').value = entry?.makoComment ?? '';

  $('f_photo').value = '';
  renderPhotoPreview(editingPhotoDataUrl);

  $('modalBackdrop').setAttribute('aria-hidden', 'false');
}

function closeModal() {
  $('modalBackdrop').setAttribute('aria-hidden', 'true');
}

function renderPhotoPreview(dataUrl) {
  const box = $('photoPreview');
  if (!dataUrl) {
    box.textContent = '写真なし';
    box.style.backgroundImage = '';
    box.classList.remove('has');
    return;
  }
  box.textContent = '';
  box.style.backgroundImage = `url(${dataUrl})`;
  box.classList.add('has');
}

async function fileToResizedDataUrl(file, maxSize = 1200, quality = 0.85) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await new Promise((res, rej) => {
      img.onload = () => res();
      img.onerror = rej;
    });

    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const scale = Math.min(1, maxSize / Math.max(w, h));
    const cw = Math.round(w * scale);
    const ch = Math.round(h * scale);

    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, cw, ch);

    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function normalizeText(s) {
  return (s || '').toString().trim();
}

function onSave() {
  const entry = {
    id: editingId ?? crypto.randomUUID?.() ?? String(Date.now()),
    name: normalizeText($('f_name').value),
    origin: normalizeText($('f_origin').value),
    grape: normalizeText($('f_grape').value),
    type: $('f_type').value || '',
    shop: normalizeText($('f_shop').value),
    price: normalizeText($('f_price').value),
    drankAt: $('f_drankAt').value || nowString(),

    taroRating: $('f_taroRating').value || '',
    taroComment: normalizeText($('f_taroComment').value),
    makoRating: $('f_makoRating').value || '',
    makoComment: normalizeText($('f_makoComment').value),

    photo: editingPhotoDataUrl || ''
  };

  if (editingId) {
    entries = entries.map(e => e.id === editingId ? entry : e);
    toast('更新しました');
  } else {
    entries.unshift(entry);
    toast('追加しました');
  }

  saveEntries();
  closeModal();
  renderList();
}

function onDelete() {
  if (!editingId) return;
  if (!confirm('この記録を削除しますか？')) return;
  entries = entries.filter(e => e.id !== editingId);
  saveEntries();
  closeModal();
  renderList();
  toast('削除しました');
}

function renderList() {
  const q = normalizeText($('q').value).toLowerCase();
  const sort = $('sort').value;
  const minTaro = parseInt($('minTaro').value, 10) || 0;
  const minMako = parseInt($('minMako').value, 10) || 0;
  const typeFilter = $('typeFilter').value || '';

  let items = [...entries];

  // filter
  if (q) {
    items = items.filter(e => {
      const hay = `${e.name} ${e.origin} ${e.grape} ${e.shop}`.toLowerCase();
      return hay.includes(q);
    });
  }

  if (typeFilter) {
    items = items.filter(e => (e.type || '') === typeFilter);
  }

  if (minTaro) {
    items = items.filter(e => (parseInt(e.taroRating || '0', 10) || 0) >= minTaro);
  }

  if (minMako) {
    items = items.filter(e => (parseInt(e.makoRating || '0', 10) || 0) >= minMako);
  }

  // sort
  const score = (v) => (parseInt(v || '0', 10) || 0);
  if (sort === 'old') {
    items.reverse();
  } else if (sort === 'taro') {
    items.sort((a, b) => score(b.taroRating) - score(a.taroRating));
  } else if (sort === 'mako') {
    items.sort((a, b) => score(b.makoRating) - score(a.makoRating));
  } // new: default entries are newest-first when unshift

  const list = $('list');
  list.innerHTML = '';

  $('empty').style.display = items.length ? 'none' : 'block';

  for (const e of items) {
    const chips = [];

    const typeLabel =
      e.type === 'red' ? '赤' :
      e.type === 'white' ? '白' :
      e.type === 'other' ? 'その他' : '';
    if (typeLabel) chips.push(`<span class="chip wineType ${e.type}">🍷 ${typeLabel}</span>`);

    if (e.origin) chips.push(`<span class="chip">${escapeHtml(e.origin)}</span>`);
    if (e.grape) chips.push(`<span class="chip">${escapeHtml(e.grape)}</span>`);
    if (e.shop) chips.push(`<span class="chip">${escapeHtml(e.shop)}</span>`);
    if (e.price) chips.push(`<span class="chip">¥${escapeHtml(e.price)}</span>`);

    const card = document.createElement('div');
    card.className = 'item';

    card.innerHTML = `
      <div class="itemTop">
        <div class="itemTitle">${escapeHtml(e.name || '(無題)')}</div>
        <div class="itemDate">${escapeHtml(e.drankAt || '')}</div>
      </div>

      <div class="chips">${chips.join('')}</div>

      <div class="ratings">
        <div class="r"><span class="who">太郎</span><span class="stars">${renderStars(e.taroRating)}</span></div>
        <div class="r"><span class="who">真子</span><span class="stars">${renderStars(e.makoRating)}</span></div>
      </div>

      ${e.photo ? `<div class="photo" style="background-image:url(${e.photo})"></div>` : ''}

      <div class="itemActions">
        <button class="ghost" type="button" data-act="edit">開く</button>
        <button class="ghost" type="button" data-act="dup">複製</button>
      </div>
    `;

    card.querySelector('[data-act="edit"]').addEventListener('click', () => openModal(e));
    card.querySelector('[data-act="dup"]').addEventListener('click', () => {
      const copy = { ...e, id: crypto.randomUUID?.() ?? String(Date.now()), drankAt: nowString() };
      entries.unshift(copy);
      saveEntries();
      renderList();
      toast('複製しました');
    });

    list.appendChild(card);
  }
}

function renderStars(v) {
  const n = parseInt(v || '0', 10) || 0;
  if (!n) return '<span class="muted">未入力</span>';
  return '★'.repeat(n);
}

function escapeHtml(s) {
  return (s ?? '').toString()
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Events
window.addEventListener('DOMContentLoaded', () => {
  $('btnAdd').addEventListener('click', () => openModal(null));
  $('btnClose').addEventListener('click', closeModal);
  $('btnSave').addEventListener('click', onSave);
  $('btnDelete').addEventListener('click', onDelete);

  $('modalBackdrop').addEventListener('click', (ev) => {
    if (ev.target === $('modalBackdrop')) closeModal();
  });

  $('q').addEventListener('input', renderList);
  $('sort').addEventListener('change', renderList);
  $('minTaro').addEventListener('change', renderList);
  $('minMako').addEventListener('change', renderList);
  $('typeFilter').addEventListener('change', renderList);

  $('f_photo').addEventListener('change', async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    try {
      editingPhotoDataUrl = await fileToResizedDataUrl(file);
      renderPhotoPreview(editingPhotoDataUrl);
      toast('写真を追加しました');
    } catch {
      toast('写真の読み込みに失敗しました');
    }
  });

  renderList();
});
