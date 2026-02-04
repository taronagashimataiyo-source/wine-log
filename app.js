'use strict';

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = 'wineLogEntries_v2';

let entries = loadEntries();
let editingId = null;

init();

function init(){
  // ボタンが押せない問題の9割は「イベントが付いてない」か「JSが途中で落ちてる」。
  // ここで必ず付ける（scriptはbody末尾なのでDOMは確実に存在する）
  $('btnAdd').addEventListener('click', () => openModal(null));
  $('btnClose').addEventListener('click', closeModal);
  $('modalBackdrop').addEventListener('click', (e) => {
    if(e.target === $('modalBackdrop')) closeModal();
  });
  $('btnSave').addEventListener('click', onSave);
  $('btnDelete').addEventListener('click', onDelete);

  $('q').addEventListener('input', render);
  $('sort').addEventListener('change', render);
  $('typeFilter').addEventListener('change', render);

  render();
}

function nowString(){
  const d = new Date();
  const pad = (n)=> String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toast(msg){
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=> t.classList.remove('show'), 1200);
}

function saveEntries(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function loadEntries(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  }catch{
    return [];
  }
}

function openModal(entry){
  editingId = entry ? entry.id : null;

  $('modalTitle').textContent = editingId ? '編集' : '追加';
  $('btnDelete').style.display = editingId ? 'inline-flex' : 'none';

  $('f_name').value = entry?.name ?? '';
  $('f_type').value = entry?.type ?? '';
  $('f_origin').value = entry?.origin ?? '';
  $('f_grape').value = entry?.grape ?? '';
  $('f_shop').value = entry?.shop ?? '';
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

function onSave(){
  const entry = {
    id: editingId ?? cryptoId(),
    name: $('f_name').value.trim(),
    type: $('f_type').value || '',
    origin: $('f_origin').value.trim(),
    grape: $('f_grape').value.trim(),
    shop: $('f_shop').value.trim(),
    price: $('f_price').value.trim(),
    drankAt: $('f_drankAt').value || nowString(),
    taroRating: $('f_taroRating').value || '',
    taroComment: $('f_taroComment').value.trim(),
    makoRating: $('f_makoRating').value || '',
    makoComment: $('f_makoComment').value.trim(),
  };

  const idx = entries.findIndex(e => e.id === entry.id);
  if(idx >= 0) entries[idx] = entry;
  else entries.unshift(entry);

  saveEntries();
  closeModal();
  render();
  toast('保存しました');
}

function onDelete(){
  if(!editingId) return;
  entries = entries.filter(e => e.id !== editingId);
  saveEntries();
  closeModal();
  render();
  toast('削除しました');
}

function cryptoId(){
  try{
    return crypto.randomUUID();
  }catch{
    return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

function render(){
  const q = $('q').value.trim().toLowerCase();
  const sort = $('sort').value;
  const typeFilter = $('typeFilter').value;

  let list = entries.slice();

  if(q){
    list = list.filter(e => {
      const hay = `${e.name||''} ${e.origin||''} ${e.grape||''} ${e.shop||''}`.toLowerCase();
      return hay.includes(q);
    });
  }

  if(typeFilter){
    list = list.filter(e => (e.type||'') === typeFilter);
  }

  list.sort((a,b)=>{
    if(sort === 'old') return (a.drankAt||'').localeCompare(b.drankAt||'');
    if(sort === 'taro') return (num(b.taroRating) - num(a.taroRating)) || (b.drankAt||'').localeCompare(a.drankAt||'');
    if(sort === 'mako') return (num(b.makoRating) - num(a.makoRating)) || (b.drankAt||'').localeCompare(a.drankAt||'');
    // new
    return (b.drankAt||'').localeCompare(a.drankAt||'');
  });

  const root = $('list');
  if(list.length === 0){
    root.innerHTML = `<div class="note">まだ記録がありません。「＋ 追加」から入れてください。</div>`;
    return;
  }

  root.innerHTML = list.map(e => {
    const chips = [];

    const typeLabel = e.type === 'red' ? '赤' : e.type === 'white' ? '白' : e.type === 'other' ? 'その他' : '';
    if(typeLabel) chips.push(`<span class="chip wineType ${e.type}">🍷 ${typeLabel}</span>`);

    if(e.origin) chips.push(`<span class="chip">📍 ${escapeHtml(e.origin)}</span>`);
    if(e.grape) chips.push(`<span class="chip">🍇 ${escapeHtml(e.grape)}</span>`);
    if(e.shop) chips.push(`<span class="chip">🛒 ${escapeHtml(e.shop)}</span>`);
    if(e.price) chips.push(`<span class="chip">💴 ${escapeHtml(e.price)}</span>`);

    const taro = e.taroRating ? `太郎 ${stars(e.taroRating)}` : '';
    const mako = e.makoRating ? `真子 ${stars(e.makoRating)}` : '';
    const ratingLine = [taro, mako].filter(Boolean).join(' / ');

    return `
      <div class="item">
        <div class="itemTop">
          <div>
            <div class="itemTitle">${escapeHtml(e.name || '(無題)')}</div>
            <div class="itemMeta">${escapeHtml(e.drankAt || '')}</div>
          </div>
          <button class="ghost" type="button" data-edit="${e.id}">開く</button>
        </div>

        ${ratingLine ? `<div class="itemMeta" style="margin-top:8px;"><span class="stars">${escapeHtml(ratingLine)}</span></div>` : ''}

        ${chips.length ? `<div class="chips">${chips.join('')}</div>` : ''}
      </div>
    `;
  }).join('');

  // edit buttons
  root.querySelectorAll('[data-edit]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.getAttribute('data-edit');
      const entry = entries.find(e => e.id === id);
      openModal(entry || null);
    });
  });
}

function num(v){
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function stars(v){
  const n = num(v);
  if(!n) return '';
  return '★'.repeat(n);
}

function escapeHtml(s){
  return String(s ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#039;");
}
