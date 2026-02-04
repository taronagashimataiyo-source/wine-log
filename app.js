'use strict';

/** ★ここを自分の値に変更 **/
const API_URL = 'https://script.google.com/macros/s/AKfycbxqt_2vJDsl4_OBDkLimOLdX6TpSAQc7ZryPgLMtcxffwgEaBDBwXfaJyIRf3Yhv-0zng/exec';
const API_KEY = 'TAROMAKO-winelog';

const $ = (id) => document.getElementById(id);
let entries = [];
let editingId = null;

function toast(msg){
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1400);
}

function nowString(){
  const d = new Date();
  const pad = (n) => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function apiGet(){
  const url = `${API_URL}?key=${encodeURIComponent(API_KEY)}`;
  const res = await fetch(url, { cache:'no-store' });
  const data = await res.json();
  if (!data.items) throw new Error('API error');
  return data.items;
}

async function apiUpsert(item){
  const res = await fetch(`${API_URL}?key=${encodeURIComponent(API_KEY)}`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ op:'upsert', item })
  });
  return res.json();
}

async function apiDelete(id){
  const res = await fetch(`${API_URL}?key=${encodeURIComponent(API_KEY)}`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ op:'delete', id })
  });
  return res.json();
}

function openModal(entry=null){
  editingId = entry?.id ?? null;
  $('modalTitle').textContent = editingId ? '編集' : '追加';

  $('f_name').value = entry?.name ?? '';
  $('f_origin').value = entry?.origin ?? '';
  $('f_grape').value = entry?.grape ?? '';
  $('f_shop').value = entry?.shop ?? '';
  $('f_type').value = entry?.type ?? '';
  $('f_price').value = entry?.price ?? '';
  $('f_drankAt').value = entry?.drankAt ?? nowString();

  $('f_taroRating').value = entry?.taroRating ?? '';
  $('f_taroComment').value = entry?.taroComment ?? '';
  $('f_makoRating').value = entry?.makoRating ?? '';
  $('f_makoComment').value = entry?.makoComment ?? '';

  $('modalBackdrop').setAttribute('aria-hidden','false');
}

function closeModal(){
  $('modalBackdrop').setAttribute('aria-hidden','true');
}

function normalizeStr(v){ return (v ?? '').toString().trim(); }

function renderList(){
  const q = normalizeStr($('q').value).toLowerCase();
  const sort = $('sort').value;
  const typeFilter = $('typeFilter').value;

  let list = [...entries];

  // filter: type
  if (typeFilter) list = list.filter(e => (e.type || '') === typeFilter);

  // search
  if (q){
    list = list.filter(e => {
      const hay = [
        e.name, e.origin, e.grape, e.shop
      ].map(x => normalizeStr(x).toLowerCase()).join(' / ');
      return hay.includes(q);
    });
  }

  // sort
  const num = (v) => v === '' || v == null ? -1 : Number(v);
  if (sort === 'new') list.sort((a,b) => normalizeStr(b.drankAt).localeCompare(normalizeStr(a.drankAt)));
  if (sort === 'old') list.sort((a,b) => normalizeStr(a.drankAt).localeCompare(normalizeStr(b.drankAt)));
  if (sort === 'taro') list.sort((a,b) => num(b.taroRating) - num(a.taroRating));
  if (sort === 'mako') list.sort((a,b) => num(b.makoRating) - num(a.makoRating));

  const el = $('list');
  if (!list.length){
    el.innerHTML = `<div class="note">まだ記録がありません。「＋ 追加」から入れてください。</div>`;
    return;
  }

  el.innerHTML = list.map(e => {
    const chips = [];
    const typeLabel = e.type === 'red' ? '赤' : e.type === 'white' ? '白' : e.type === 'other' ? 'その他' : '';
    if (typeLabel) chips.push(`<span class="chip wineType ${e.type}">🍷 ${typeLabel}</span>`);
    if (normalizeStr(e.origin)) chips.push(`<span class="chip">${escapeHtml(e.origin)}</span>`);
    if (normalizeStr(e.grape)) chips.push(`<span class="chip">${escapeHtml(e.grape)}</span>`);
    if (normalizeStr(e.shop)) chips.push(`<span class="chip">${escapeHtml(e.shop)}</span>`);

    const taroStars = e.taroRating ? `★${e.taroRating}` : '—';
    const makoStars = e.makoRating ? `★${e.makoRating}` : '—';

    return `
      <div class="item">
        <div class="itemTop">
          <div>
            <div class="itemTitle">${escapeHtml(normalizeStr(e.name) || '(無題)')}</div>
            <div class="note">飲んだ日：${escapeHtml(normalizeStr(e.drankAt) || '')}</div>
          </div>
        </div>

        <div class="chips">${chips.join('')}</div>

        <div class="ratings">
          <div class="r"><span class="muted">太郎</span> <span class="stars">${taroStars}</span></div>
          <div class="r"><span class="muted">真子</span> <span class="stars">${makoStars}</span></div>
          ${normalizeStr(e.price) ? `<div class="r"><span class="muted">価格</span> <span>${escapeHtml(e.price)}円</span></div>` : ''}
        </div>

        <div style="display:flex;gap:8px;margin-top:10px;">
          <button type="button" onclick="window.__edit('${e.id}')">開く</button>
          <button type="button" onclick="window.__del('${e.id}')">削除</button>
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}

async function refresh(){
  try{
    entries = await apiGet();
    renderList();
  }catch(err){
    console.error(err);
    toast('読み込み失敗（API設定を確認）');
  }
}

async function onSave(){
  const item = {
    id: editingId || '',
    createdAt: '', // Sheet側で任意。空でOK
    drankAt: $('f_drankAt').value || nowString(),
    type: $('f_type').value || '',
    name: $('f_name').value || '',
    origin: $('f_origin').value || '',
    grape: $('f_grape').value || '',
    shop: $('f_shop').value || '',
    price: $('f_price').value || '',
    taroRating: $('f_taroRating').value || '',
    taroComment: $('f_taroComment').value || '',
    makoRating: $('f_makoRating').value || '',
    makoComment: $('f_makoComment').value || '',
    photo: ''
  };

  try{
    await apiUpsert(item);
    closeModal();
    toast('保存しました');
    await refresh();
  }catch(err){
    console.error(err);
    toast('保存失敗（API設定/権限）');
  }
}

window.__edit = (id) => {
  const e = entries.find(x => x.id === id);
  openModal(e);
};

window.__del = async (id) => {
  if (!confirm('削除しますか？')) return;
  try{
    await apiDelete(id);
    toast('削除しました');
    await refresh();
  }catch(err){
    console.error(err);
    toast('削除失敗');
  }
};

function bind(){
  $('btnAdd').addEventListener('click', () => openModal(null));
  $('btnClose').addEventListener('click', closeModal);
  $('modalBackdrop').addEventListener('click', (e) => {
    if (e.target === $('modalBackdrop')) closeModal();
  });
  $('btnSave').addEventListener('click', onSave);

  $('q').addEventListener('input', renderList);
  $('sort').addEventListener('change', renderList);
  $('typeFilter').addEventListener('change', renderList);
}

bind();
refresh();
// 10秒ごとに自動更新（複数人で同時利用の反映用）
setInterval(refresh, 10000);
