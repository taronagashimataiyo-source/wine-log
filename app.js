<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <title>Wine Log</title>
  <meta name="theme-color" content="#fff7f2">
  <link rel="manifest" href="./manifest.webmanifest">
  <link rel="icon" href="./icons/icon-192.png">
  <link rel="apple-touch-icon" href="./icons/icon-180.png">
  <link rel="stylesheet" href="./style.css">
</head>

<body>
  <div class="container">
    <header class="topbar">
      <div class="brand">
        <img class="brandLogo" src="./icons/icon-192.png" alt="Wine Log">
        <div class="brandText">
          <div class="brandTitle">Wine Log</div>
          <div class="brandSub">長島家ワイン記録</div>
        </div>
      </div>
      <button class="primary" id="btnAdd" type="button">＋ 追加</button>
    </header>

    <section class="controls card">
      <input id="q" class="search" placeholder="検索（名前 / 産地 / 品種 / 購入先）">
      <div class="row">
        <div class="field">
          <label>種類</label>
          <select id="typeFilter">
            <option value="">指定なし</option>
            <option value="red">赤</option>
            <option value="white">白</option>
            <option value="other">その他</option>
          </select>
        </div>
        <div class="field">
          <label>並び替え</label>
          <select id="sort">
            <option value="new">新しい順</option>
            <option value="old">古い順</option>
            <option value="taro">太郎★が高い順</option>
            <option value="mako">真子★が高い順</option>
          </select>
        </div>
      </div>
    </section>

    <section class="card">
      <h2>記録一覧</h2>
      <div id="list" class="list"></div>
      <div id="empty" class="muted">まだ記録がありません。「＋ 追加」から入れてください。</div>
    </section>
  </div>

  <!-- Modal -->
  <div class="backdrop" id="backdrop" aria-hidden="true">
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modalHeader">
        <div>
          <div class="modalTitle" id="modalTitle">追加</div>
          <div class="muted small">飲んだ日は自動で入ります</div>
        </div>
        <button class="ghost" id="btnClose" type="button">閉じる</button>
      </div>

      <div class="grid">
        <div class="field">
          <label>名前</label>
          <input id="f_name" placeholder="例：ワイン名 / 生産者">
        </div>
        <div class="field">
          <label>種類</label>
          <select id="f_type">
            <option value="">未入力</option>
            <option value="red">赤</option>
            <option value="white">白</option>
            <option value="other">その他</option>
          </select>
        </div>

        <div class="field">
          <label>産地</label>
          <input id="f_origin" placeholder="例：ブルゴーニュ / ナパ / 山梨">
        </div>
        <div class="field">
          <label>ブドウの品種</label>
          <input id="f_grape" placeholder="例：ピノ・ノワール / シャルドネ">
        </div>

        <div class="field">
          <label>買った場所</label>
          <input id="f_shop" placeholder="例：成城石井 / ディプント / 蓼科">
        </div>
        <div class="field">
          <label>値段（円）</label>
          <input id="f_price" inputmode="numeric" placeholder="例：2500">
        </div>

        <div class="field">
          <label>飲んだ日（自動）</label>
          <input id="f_drankAt" disabled>
        </div>
      </div>

      <div class="panel">
        <div class="panelTitle">評価</div>
        <div class="grid2">
          <div class="field">
            <label>太郎（1〜5）</label>
            <select id="f_taroRating">
              <option value="">未入力</option>
              <option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option>
            </select>
            <textarea id="f_taroComment" placeholder="コメント（短くでOK）"></textarea>
          </div>
          <div class="field">
            <label>真子（1〜5）</label>
            <select id="f_makoRating">
              <option value="">未入力</option>
              <option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option>
            </select>
            <textarea id="f_makoComment" placeholder="コメント（短くでOK）"></textarea>
          </div>
        </div>
      </div>

      <div class="modalFooter">
        <button class="danger" id="btnDelete" type="button">削除</button>
        <button class="primary" id="btnSave" type="button">保存</button>
      </div>
    </div>
  </div>

  <script src="./app.js"></script>
</body>
</html>
