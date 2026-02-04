'use strict';

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = 'wineLogEntriesV2';

function nowString() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toast(msg) {
  const t = $('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1400);
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

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

let entries = loadEntries();
let editingId = null;
let editingPhotoDataUrl = '';

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function openModal(entry = null) {
  editingId = entry?.id ?? null;
  editingPhotoDataUrl = entry?.photo ?? '';

  $('modalTitle').textContent = editingId ? '編集' : '追加';
  const delBtn = $('btnDelete');
  if (delBtn) delBtn.style.display = editingId ? 'inline-flex' : 'none';

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
  if (!box) return;
  if (!dataUrl) {
    box.textContent = '写真なし';
    box.style.backgroundImage = 'none';
    return;
  }
  box.textContent = '';
  box.style.backgroundImage = `url(${dataUrl})`;
  box.style.backgroundSize = 'cover';
  box.style.backgroundPosition = 'center';
}

function compressImageToDataUrl(file, maxW = 900, maxH = 900, quality = 0.8) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width: w, height: h } = img;
      const ratio = Math.min(maxW / w, maxH / h, 1);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);

      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(dataUrl);
    };
    img.onerror = () => resolve('');
    img.src = url;
  });
}

function onSave() {
  const entry = {
    id: editingId ?? uid(),
    name: $('f_name').value.trim(),
    origin: $('f_origin').value.trim(),
    grape: $('f_grape').value.trim(),
    type: $('f_type').value || '',
    shop: $('f_shop').value.trim(),
    price: $('f_price').value.trim(),
    drankAt: $('f_drankAt').value || nowString(),

    taroRating: $('f_taroRating').value || '',
    taroComment: $('f_taroComment').value.trim(),
    makoRating: $('f_makoRating').value || '',
    makoComment: $('f_makoComment').value.trim(),

    photo: editingPhotoDataUrl || ''
  };

  const idx = entries.findIndex(e => e.id === entry.id);
  if (idx >= 0) entries[idx] = entry;
  else entries.unshift(entry);

  saveEntries(entries);
  renderList();
  closeModal();
  toast('保存しました');
}

function onDelete() {
  if (!editingId) return;
  entries = entries.filter(e => e.id !== editingId);
  saveEntries(entries);
  renderList();
  closeModal();
  toast('削除しました');
}

function typeLabel(type) {
  if (type === 'red') return '赤';
  if (type === 'white') return '白';
  if (type === 'other') return 'その他';
  return '';
}

function ratingStars(val) {
  if (!val) return '未入力';
  return '★'.repeat(Number(val));
}

function renderList() {
  const list = $('list');
  const empty = $('empty');
  if (!list) return;

  const q = ($('q')?.value ?? '').trim().toLowerCase();
  const sort = $('sort')?.value ?? 'new';
  const typeF = $('typeFilter')?.value ?? '';
  const minTaro = Number($('minTaro')?.value ?? '0');
  const minMako = Number($('minMako')?.value ?? '0');

  let data = entries.slice();

  // 検索
  if (q) {
    data = data.filter(e => {
      const hay = `${e.name||''} ${e.origin||''} ${e.grape||''} ${e.shop||''}`.toLowerCase();
      return hay.includes(q);
    });
  }

  // 種類フィルタ
  if (typeF) {
    data = data.filter(e => (e.type || '') === typeF);
  }

  // ★フィルタ
  if (minTaro > 0) data = data.filter(e => Number(e.taroRating || 0) >= minTaro);
  if (minMako > 0) data = data.filter(e => Number(e.makoRating || 0) >= minMako);

  // ソート
  const toTime = (s) => {
    // "YYYY-MM-DD HH:mm" 想定
    const t = Date.parse((s || '').replace(' ', 'T'));
    return Number.isFinite(t) ? t : 0;
  };

  if (sort === 'new') data.sort((a,b) => toTime(b.drankAt) - toTime(a.drankAt));
  if (sort === 'old') data.sort((a,b) => toTime(a.drankAt) - toTime(b.drankAt));
  if (sort === 'taro') data.sort((a,b) => Number(b.taroRating||0) - Number(a.taroRating||0));
  if (sort === 'mako') data.sort((a,b) => Number(b.makoRating||0) - Number(a.makoRating||0));

  list.innerHTML = '';

  if (data.length === 0) {
    if (empty) empty.style.display = 'block';
    return;
  } else {
    if (empty) empty.style.display = 'none';
  }

  for (const e of data) {
    const chips = [];

    const tl = typeLabel(e.type);
    if (tl) chips.push(`<span class="chip wineType ${e.type}">🍷 ${tl}</span>`);
    if (e.origin) chips.push(`<span class="chip">📍 ${escapeHtml(e.origin)}</span>`);
    if (e.grape) chips.push(`<span class="chip">🍇 ${escapeHtml(e.grape)}</span>`);
    if (e.shop) chips.push(`<span class="chip">🛒 ${escapeHtml(e.shop)}</span>`);
    if (e.price) chips.push(`<span class="chip">💴 ${escapeHtml(e.price)}</span>`);

    const photo = e.photo
      ? `<div class="thumbSmall" style="background-image:url('${e.photo}')"></div>`
      : `<div class="thumbSmall noPhoto">No Photo</div>`;

    const card = document.createElement('div');
    card.className = 'item';

    card.innerHTML = `
      <div class="itemTop">
        ${photo}
        <div class="itemMain">
          <div class="itemTitle">${escapeHtml(e.name || '（無題）')}</div>
          <div class="itemSub">${escapeHtml(e.drankAt || '')}</div>
          <div class="chips">${chips.join('')}</div>
          <div class="ratings">
            <div class="r"><span class="who">太郎</span> <span class="star">${ratingStars(e.taroRating)}</span> <span class="cm">${escapeHtml(e.taroComment||'')}</span></div>
            <div class="r"><span class="who">真子</span> <span class="star">${ratingStars(e.makoRating)}</span> <span class="cm">${escapeHtml(e.makoComment||'')}</span></div>
          </div>
        </div>
      </div>
      <div class="itemActions">
        <button class="ghost" data-act="edit">開く</button>
        <button class="ghost" data-act="copy">複製</button>
      </div>
    `;

    card.querySelector('[data-act="edit"]').addEventListener('click', () => openModal(e));
    card.querySelector('[data-act="copy"]').addEventListener('click', () => {
      const copy = { ...e, id: uid(), drankAt: nowString() };
      entries.unshift(copy);
      saveEntries(entries);
      renderList();
      toast('複製しました');
    });

    list.appendChild(card);
  }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#39;");
}

function bind() {
  // ここが落ちると「押せない」になるので、必ず存在チェックしてから繋ぐ
  const btnAdd = $('btnAdd');
  if (btnAdd) btnAdd.addEventListener('click', () => openModal(null));

  const btnClose = $('btnClose');
  if (btnClose) btnClose.addEventListener('click', closeModal);

  const backdrop = $('modalBackdrop');
  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });
  }

  const btnSave = $('btnSave');
  if (btnSave) btnSave.addEventListener('click', onSave);

  const btnDelete = $('btnDelete');
  if (btnDelete) btnDelete.addEventListener('click', onDelete);

  const photo = $('f_photo');
  if (photo) {
    photo.addEventListener('change', async () => {
      const f = photo.files?.[0];
      if (!f) return;
      editingPhotoDataUrl = await compressImageToDataUrl(f);
      renderPhotoPreview(editingPhotoDataUrl);
    });
  }

  // フィルタ類
  ['q','sort','typeFilter','minTaro','minMako'].forEach(id => {
    const el = $(id);
    if (!el) return;
    el.addEventListener('input', renderList);
    el.addEventListener('change', renderList);
  });

  renderList();
}

document.addEventListener('DOMContentLoaded', bind);
