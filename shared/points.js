/* ════════════════════════════════════════════════════════════════
 *  ポイント共通ライブラリ  (points.js)
 *  ----------------------------------------------------------------
 *  すべてのアプリで読み込んで使う「ポイントの貯金箱」です。
 *
 *  ・ポイントは localStorage（ブラウザの中の保存箱）にためます。
 *  ・サーバー経由で開けば、どのアプリも同じ保存箱を見るので、
 *    ゲームでためたポイントを どうがタイマーで使えます。
 *  ・1ポイント ＝ どうがを 1分みられる、という意味で使います。
 *
 *  使いかた（各アプリのスクリプトの中で）:
 *    Points.add(3);      // 3ポイントふやす（ゲームクリア時など）
 *    Points.get();       // いまのポイントを数で受け取る
 *    Points.spend(5);    // 5ポイント使う（足りれば true、足りなければ false）
 * ════════════════════════════════════════════════════════════════ */

// 保存箱のなまえ（キー）。全アプリでこの名前をそろえることが大事。
const POINTS_KEY = 'kids_points';

// アプリごとの「もらえるポイント数」の設定をしまう箱（キー）。
// { アプリID: ポイント数 } の形で入る。管理ツールの「ポイント設定」で変える。
// ※この設定は この端末（ブラウザ）の中だけに残る。
const POINTS_CONFIG_KEY = 'kids_point_config';

const Points = {
  /** いまのポイントを数（整数）で返す。まだ無いときは 0。 */
  get() {
    return parseInt(localStorage.getItem(POINTS_KEY) || '0', 10);
  },

  /**
   * ポイントを指定の値にセットする。
   * マイナスにはならないように 0 でとめ、小数は切り捨てる。
   */
  set(value) {
    const v = Math.max(0, Math.floor(value));
    localStorage.setItem(POINTS_KEY, String(v));
    return v;
  },

  /**
   * ポイントをふやす（ゲームをクリアしたときなど）。
   * @param {number} n ふやす数
   * @returns {number} ふやしたあとの合計ポイント
   */
  add(n) {
    return this.set(this.get() + n);
  },

  /**
   * ポイントを使う（どうがを見たぶんだけへらす）。
   * 足りないときは何もせず false を返す。
   * @param {number} n 使う数
   * @returns {boolean} 使えたら true、足りなければ false
   */
  spend(n) {
    const now = this.get();
    if (now < n) return false;     // ポイントが足りない
    this.set(now - n);
    return true;
  },

  /**
   * ポイントをふやして、画面に「○ポイント ゲット！」のお祝いを出す。
   * ゲームをクリアしたときに、各ゲームから1行で呼べるようにしたもの。
   * 見た目（HTML・CSS）はこの関数の中で作るので、各ゲーム側に
   * 用意するものは何もいりません。
   * @param {number} n ふやす数（ふつうは 3）
   */
  reward(n) {
    const total = this.add(n);
    showRewardPopup(n, total);
    // きょうの しゅくだいの アプリなら「できた」にする
    if (typeof Homework !== 'undefined') Homework.notifyCleared();
    return total;
  },

  /* ──────────────────────────────────────────────────────────
   *  アプリごとの「もらえるポイント数」の設定
   *  （管理ツールの「ポイント設定」で変える。端末ごとに保存）
   * ────────────────────────────────────────────────────────── */

  /** いまのURLから アプリID（apps/◯◯/ の ◯◯）を推測する。 */
  _appId() {
    const m = location.pathname.match(/\/apps\/([^\/]+)\//);
    return m ? m[1] : null;
  },

  /** ポイント設定を まるごと読みこむ（無ければ空っぽ {}）。 */
  getConfig() {
    try {
      return JSON.parse(localStorage.getItem(POINTS_CONFIG_KEY) || '{}');
    } catch (e) {
      return {};
    }
  },

  /** ポイント設定を まるごと保存する。 */
  setConfig(cfg) {
    localStorage.setItem(POINTS_CONFIG_KEY, JSON.stringify(cfg || {}));
  },

  /**
   * 指定アプリで もらえるポイント数を返す。
   * 設定があればその数を、無ければ fallback（各アプリの初期値）を返す。
   * @param {string} appId アプリID
   * @param {number} fallback 設定が無いときの数（各アプリの初期値）
   */
  pointsFor(appId, fallback) {
    const cfg = this.getConfig();
    const v = cfg[appId];
    // 0 もちゃんと「0ポイント」として有効にする（設定で0にできる）
    if (typeof v === 'number' && !isNaN(v)) return Math.max(0, Math.floor(v));
    return fallback;
  },

  /**
   * 設定にしたがって ポイントをふやし、お祝いを出す。
   * 各アプリの結果画面では Points.reward(3) のかわりに
   * Points.rewardFor(3) と書く（3はそのアプリの初期値）。
   * アプリIDはURLから自動で判定する。
   * @param {number} fallback 設定が無いときの数（各アプリの初期値）
   */
  rewardFor(fallback) {
    const appId = this._appId();
    const n = appId ? this.pointsFor(appId, fallback) : fallback;
    if (n <= 0) {
      // 0ポイント設定でも「しゅくだいが できた」ことは記録する
      if (typeof Homework !== 'undefined') Homework.notifyCleared();
      return this.get();  // 0ポイント設定なら 何も足さない（お祝いも出さない）
    }
    return this.reward(n);
  },
};

/* ----------------------------------------------------------------
 *  「○ポイント ゲット！」のお祝いポップアップ
 *  ・必要な CSS を一度だけ <head> に差しこむ
 *  ・画面の真ん中に少しのあいだ表示して、自動で消える
 * ---------------------------------------------------------------- */
function showRewardPopup(n, total) {
  // CSS をまだ入れていなければ1回だけ入れる
  if (!document.getElementById('points-reward-style')) {
    const style = document.createElement('style');
    style.id = 'points-reward-style';
    style.textContent = `
      .points-reward-overlay {
        position: fixed; inset: 0; z-index: 9999;
        display: flex; align-items: center; justify-content: center;
        background: rgba(15, 23, 42, 0.35);
        animation: prFade 0.25s ease-out;
      }
      .points-reward-card {
        background: white;
        border-radius: 24px;
        padding: 26px 34px;
        text-align: center;
        box-shadow: 0 12px 40px rgba(0,0,0,0.25);
        animation: prPop 0.45s cubic-bezier(0.18, 0.9, 0.3, 1.3);
      }
      .points-reward-card .pr-emoji { font-size: 3.2rem; }
      .points-reward-card .pr-big {
        font-size: 2.4rem; font-weight: 900; margin: 4px 0;
        color: #7c5cff;
      }
      .points-reward-card .pr-big small { font-size: 1.1rem; color: #94a3b8; font-weight: 800; }
      .points-reward-card .pr-sub { font-size: 0.9rem; color: #64748b; font-weight: 700; }
      @keyframes prFade { from { opacity: 0; } to { opacity: 1; } }
      @keyframes prPop {
        0%   { transform: scale(0.3); opacity: 0; }
        60%  { transform: scale(1.1); opacity: 1; }
        100% { transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
  }

  // お祝いカードを作って表示する
  const overlay = document.createElement('div');
  overlay.className = 'points-reward-overlay';
  overlay.innerHTML = `
    <div class="points-reward-card">
      <div class="pr-emoji">🎉</div>
      <div class="pr-big">＋${n}<small> ポイント ゲット！</small></div>
      <div class="pr-sub">⭐ ぜんぶで ${total} ポイント</div>
    </div>`;
  document.body.appendChild(overlay);

  // タップ、または2.2秒で消える
  const remove = () => overlay.remove();
  overlay.addEventListener('click', remove);
  setTimeout(remove, 2200);
}

/* ════════════════════════════════════════════════════════════════
 *  利用記録ライブラリ  (Stats)
 *  ----------------------------------------------------------------
 *  「どのアプリを 何回ひらいたか」「正答率はどれくらいか」を
 *  ブラウザの中（localStorage）に ためていく しくみです。
 *
 *  ・アプリを ひらくと、自動で「ひらいた回数」を1ふやします。
 *    （各アプリは points.js を読みこむだけで、書くことはありません）
 *  ・クイズ型のアプリは、結果画面で次のように1行よぶと
 *    「正解数 / 問題数」を ためられます:
 *        Stats.record(correctCount, total);
 *
 *  ためたデータは kiroku.html（記録ページ）で見られます。
 *  データはこの端末の中だけに残ります（その端末で遊んだぶんだけ）。
 * ════════════════════════════════════════════════════════════════ */

// 保存箱のなまえ（キー）。
const STATS_KEY = 'kids_stats';

const Stats = {
  /* ──────────────────────────────────────────────────────────
   *  時間の記録（画面には いっさい表示しない）
   *  ----------------------------------------------------------
   *  ・beginPlay() … クイズが始まった瞬間によぶ（各アプリのスタート処理で1行）
   *  ・lapStart()  … 問題を画面に出した瞬間によぶ
   *  ・lap(ok)     … 問題に答えが出た瞬間によぶ（1問ぶんの秒数を記録）
   *  ・record()    … 従来どおり。beginPlay されていれば、かかった時間と
   *                  1問ごとの秒数も いっしょに history に保存する
   *  記録した時間は 管理ツール（manage.html）の「時間の記録」でだけ見られる。
   *  子ども向けの画面（アプリ本体・きろくページ）には出さない。
   * ────────────────────────────────────────────────────────── */

  _playStartMs: null,   // クイズ開始時刻（ミリ秒）。null なら計測していない
  _lapStartMs:  null,   // いまの問題を表示した時刻
  _lastLapMs:   null,   // 直前の問題に答えた時刻（lapStart が無いアプリ用の代わり）
  _laps:        [],     // 1問ごとの記録 [{s: 秒, ok: 正解かどうか(省略あり)}]

  /** クイズ（1回ぶんのプレイ）の計測を始める。 */
  beginPlay() {
    this._playStartMs = performance.now();
    this._lapStartMs  = performance.now();
    this._lastLapMs   = null;
    this._laps        = [];
  },

  /** 問題を画面に出した瞬間によぶ（1問の計測スタート）。 */
  lapStart() {
    if (this._playStartMs === null) return;  // beginPlay していなければ何もしない
    this._lapStartMs = performance.now();
  },

  /**
   * 1問に答えが出た瞬間によぶ（1問ぶんの秒数を確定する）。
   * @param {boolean} [ok] 正解なら true。省略すると 正誤なしで時間だけ記録
   */
  lap(ok) {
    if (this._playStartMs === null) return;
    const now = performance.now();
    // 問題表示時刻 → なければ 直前の答えの時刻 → なければ クイズ開始時刻 から測る
    const base = this._lapStartMs ?? this._lastLapMs ?? this._playStartMs;
    const s = Math.round((now - base) / 100) / 10;  // 0.1秒きざみ
    const entry = (ok === undefined) ? { s } : { s, ok: !!ok };
    if (this._laps.length < 200) this._laps.push(entry);  // ためすぎ防止
    this._lastLapMs  = now;
    this._lapStartMs = null;
  },
  /** 保存箱を読みこむ。こわれていても空っぽとして扱う。 */
  _read() {
    try {
      return JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
    } catch (e) {
      return {};
    }
  },

  /** 保存箱に書きこむ。 */
  _write(data) {
    localStorage.setItem(STATS_KEY, JSON.stringify(data));
  },

  /** 指定アプリの記録欄を取り出す（無ければ新しく作る）。 */
  _entry(data, appId) {
    if (!data[appId]) {
      data[appId] = {
        opens: 0,       // ひらいた回数
        plays: 0,       // 結果まで遊んだ回数（クイズ型のみ）
        correct: 0,     // 正解の合計
        total: 0,       // 問題の合計
        lastUsed: null  // 最後に使った日時（ISO文字列）
      };
    }
    return data[appId];
  },

  /** いまのURLから アプリID（apps/◯◯/ の ◯◯）を推測する。 */
  _detectId() {
    const m = location.pathname.match(/\/apps\/([^\/]+)\//);
    return m ? m[1] : null;
  },

  /**
   * アプリを ひらいたことを記録する（読みこみ時に自動でよばれる）。
   * @param {string} [appId] 省略時はURLから自動判定
   */
  open(appId) {
    appId = appId || this._detectId();
    if (!appId) return;
    const data = this._read();
    const e = this._entry(data, appId);
    e.opens++;
    e.lastUsed = new Date().toISOString();
    this._write(data);
  },

  /**
   * 1回ぶんの結果（正解数・問題数）を記録する。
   * クイズ型アプリの結果画面で1行よぶ。
   * @param {number} correct 正解の数
   * @param {number} total   問題の数
   * @param {string} [appId] 省略時はURLから自動判定
   */
  record(correct, total, appId) {
    appId = appId || this._detectId();
    if (!appId) return;
    const data = this._read();
    const e = this._entry(data, appId);
    e.plays++;
    e.correct += Math.max(0, Math.floor(correct) || 0);
    e.total   += Math.max(0, Math.floor(total) || 0);
    e.lastUsed = new Date().toISOString();

    // ── 1回ぶんの詳しい記録（history）を残す ──
    // 時間の計測（beginPlay）をしていれば、かかった秒数と1問ごとの秒数も入れる。
    // この記録は 管理ツールの「時間の記録」でだけ使う（子どもの画面には出さない）。
    const session = {
      at: e.lastUsed,                        // いつ
      c:  Math.max(0, Math.floor(correct) || 0),  // 正解数
      t:  Math.max(0, Math.floor(total) || 0),    // 問題数
    };
    if (this._playStartMs !== null) {
      session.sec = Math.round((performance.now() - this._playStartMs) / 1000);
      if (this._laps.length > 0) session.laps = this._laps;
    }
    if (!Array.isArray(e.history)) e.history = [];
    e.history.push(session);
    // 古いものから消して、アプリごとに最大60回ぶんだけ残す（保存箱のパンク防止）
    if (e.history.length > 60) e.history.splice(0, e.history.length - 60);

    // 計測をリセットする（「もういちど」は 次の beginPlay からまた測る）
    this._playStartMs = null;
    this._lapStartMs  = null;
    this._lastLapMs   = null;
    this._laps        = [];

    this._write(data);
    // きょうの しゅくだいの アプリなら「できた」にする
    if (typeof Homework !== 'undefined') Homework.notifyCleared(appId);
  },

  /** すべての記録を まとめて返す（記録ページ用）。 */
  all() {
    return this._read();
  },

  /** 記録をぜんぶ消す（記録ページの「リセット」用）。 */
  reset() {
    localStorage.removeItem(STATS_KEY);
  }
};

/* ════════════════════════════════════════════════════════════════
 *  きょうの しゅくだい ライブラリ  (Homework)
 *  ----------------------------------------------------------------
 *  おうちの人が「きょうは このアプリを やってね」と きめられる しくみ。
 *
 *  ・設定は 管理ツール（manage.html）の「きょうの しゅくだい」から行う
 *  ・ランチャー（index.html）の いちばん上に しゅくだい一覧が出る
 *  ・しゅくだいのアプリを ひらくと「きょうの しゅくだいだよ」と お知らせが出る
 *  ・アプリを 1回クリアすると（Points.reward / Stats.record が よばれると）
 *    自動で「できた ✅」になる
 *  ・データは この端末（ブラウザ）の localStorage にだけ保存される。
 *    お子さんが使う端末で 設定してください。
 * ════════════════════════════════════════════════════════════════ */

// 保存箱のなまえ（キー）。
const HOMEWORK_KEY = 'kids_homework';

const Homework = {
  /** きょうの日付を「2026-07-16」の形の文字で返す（端末の時計を使う）。 */
  _todayStr() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  },

  /** 保存箱を読みこむ。無い・こわれているときは null。 */
  _read() {
    try {
      return JSON.parse(localStorage.getItem(HOMEWORK_KEY) || 'null');
    } catch (e) {
      return null;
    }
  },

  /** 保存箱に書きこむ。 */
  _write(data) {
    localStorage.setItem(HOMEWORK_KEY, JSON.stringify(data));
  },

  /**
   * 「きょうの」しゅくだいを返す。
   * 保存されている日付が きょうと違うとき（昨日のしゅくだい等）は null。
   * @returns {{date:string, items:Array}|null}
   */
  getToday() {
    const data = this._read();
    if (!data || data.date !== this._todayStr()) return null;
    if (!Array.isArray(data.items) || data.items.length === 0) return null;
    return data;
  },

  /** 保存されているしゅくだいを 日付に関係なく返す（管理画面用）。 */
  getRaw() {
    return this._read();
  },

  /**
   * しゅくだいを設定する（管理ツールから呼ぶ）。
   * @param {string} date  対象日「YYYY-MM-DD」
   * @param {Array}  items [{appId, note, done?, doneAt?}] の一覧
   */
  setFor(date, items) {
    this._write({
      date,
      items: (items || []).map(it => ({
        appId:  it.appId,
        note:   it.note || '',
        done:   it.done === true,          // 途中保存でも「できた」を消さないため
        doneAt: it.done === true ? (it.doneAt || null) : null,
      })),
    });
  },

  /** しゅくだいを全部けす（管理ツールから呼ぶ）。 */
  clear() {
    localStorage.removeItem(HOMEWORK_KEY);
  },

  /**
   * 指定アプリの きょうのしゅくだい項目を返す。対象でなければ null。
   * @param {string} appId アプリID
   */
  itemFor(appId) {
    const hw = this.getToday();
    if (!hw) return null;
    return hw.items.find(it => it.appId === appId) || null;
  },

  /**
   * 指定アプリのしゅくだいを「できた」にする。
   * はじめて「できた」になったときだけ その項目を返す（2回目以降は null）。
   */
  markDone(appId) {
    const data = this._read();
    if (!data || data.date !== this._todayStr()) return null;
    const item = (data.items || []).find(it => it.appId === appId);
    if (!item || item.done) return null;
    item.done = true;
    item.doneAt = new Date().toISOString();
    this._write(data);
    return item;
  },

  /**
   * アプリを1回クリアしたときに よばれる（Points.reward / Stats.record から自動）。
   * しゅくだい対象なら「できた」にして、お祝いを表示する。
   * @param {string} [appId] 省略時はURLから自動判定
   */
  notifyCleared(appId) {
    appId = appId || (typeof Stats !== 'undefined' ? Stats._detectId() : null);
    if (!appId) return;
    const item = this.markDone(appId);
    if (!item) return;  // しゅくだい対象でない、またはもう「できた」ずみ

    // 全部おわったかどうかを調べる
    const hw = this.getToday();
    const allDone = !!hw && hw.items.every(it => it.done);

    // 「ポイントゲット」のお祝いと重ならないよう、少し待ってから表示する
    setTimeout(() => showHomeworkClearPopup(allDone), 2400);
  },
};

/* ----------------------------------------------------------------
 *  しゅくだい用ポップアップの共通スタイルを1回だけ差しこむ
 * ---------------------------------------------------------------- */
function ensureHomeworkStyle() {
  if (document.getElementById('homework-style')) return;
  const style = document.createElement('style');
  style.id = 'homework-style';
  style.textContent = `
    .hw-overlay {
      position: fixed; inset: 0; z-index: 10000;
      display: flex; align-items: center; justify-content: center;
      background: rgba(15, 23, 42, 0.45);
      animation: hwFade 0.25s ease-out;
      padding: 20px;
    }
    .hw-card {
      background: white;
      border-radius: 24px;
      padding: 28px 26px 22px;
      text-align: center;
      max-width: 340px;
      width: 100%;
      box-shadow: 0 12px 40px rgba(0,0,0,0.25);
      animation: hwPop 0.45s cubic-bezier(0.18, 0.9, 0.3, 1.3);
    }
    .hw-card .hw-emoji { font-size: 3rem; }
    .hw-card .hw-title {
      font-size: 1.2rem; font-weight: 900; color: #e0762e; margin: 6px 0 4px;
    }
    .hw-card .hw-note {
      font-size: 1.15rem; font-weight: 800; color: #2d3748;
      line-height: 1.6; margin: 10px 0 14px;
      background: #fff7ec; border-radius: 14px; padding: 12px 10px;
    }
    .hw-card .hw-sub { font-size: 0.88rem; color: #64748b; font-weight: 700; }
    .hw-card .hw-btn-row { display: flex; gap: 10px; justify-content: center; margin-top: 14px; }
    .hw-card button {
      border: none; border-radius: 999px; cursor: pointer;
      font-family: inherit; font-weight: 900; font-size: 1rem;
      padding: 12px 22px;
    }
    .hw-card .hw-btn-go { background: linear-gradient(135deg, #ff9a3c, #ff6b6b); color: white; }
    .hw-card .hw-btn-speak { background: #eef2ff; color: #5a67d8; }
    @keyframes hwFade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes hwPop {
      0%   { transform: scale(0.3); opacity: 0; }
      60%  { transform: scale(1.1); opacity: 1; }
      100% { transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
}

/* ----------------------------------------------------------------
 *  「きょうの しゅくだいだよ！」お知らせポップアップ
 *  （しゅくだい対象のアプリを ひらいたときに出る）
 * ---------------------------------------------------------------- */
function showHomeworkStartPopup(note) {
  ensureHomeworkStyle();
  const overlay = document.createElement('div');
  overlay.className = 'hw-overlay';

  const noteHtml = note
    ? `<div class="hw-note">${String(note)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;')}</div>`
    : `<div class="hw-note">この アプリを がんばろう！</div>`;

  overlay.innerHTML = `
    <div class="hw-card">
      <div class="hw-emoji">📌</div>
      <div class="hw-title">きょうの しゅくだい</div>
      ${noteHtml}
      <div class="hw-sub">おわると ✅ できた！ になるよ</div>
      <div class="hw-btn-row">
        <button class="hw-btn-speak">🔊 よみあげ</button>
        <button class="hw-btn-go">がんばる！</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  // 「よみあげ」ボタン：しゅくだいの内容を声で読む（読めない子のため）
  overlay.querySelector('.hw-btn-speak').addEventListener('click', (e) => {
    e.stopPropagation();
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance('きょうの しゅくだい。' + (note || 'このアプリを がんばろう！'));
    u.lang = 'ja-JP';
    u.rate = 0.85;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  });

  // 「がんばる！」ボタン、または カードの外を タップで閉じる
  const close = () => overlay.remove();
  overlay.querySelector('.hw-btn-go').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

/* ----------------------------------------------------------------
 *  「しゅくだい クリア！」お祝いポップアップ
 * ---------------------------------------------------------------- */
function showHomeworkClearPopup(allDone) {
  ensureHomeworkStyle();
  const overlay = document.createElement('div');
  overlay.className = 'hw-overlay';
  overlay.innerHTML = `
    <div class="hw-card">
      <div class="hw-emoji">${allDone ? '🏆' : '💮'}</div>
      <div class="hw-title">しゅくだい クリア！</div>
      <div class="hw-sub">${allDone
        ? 'きょうの しゅくだいは ぜんぶ おわったよ！すごい！！'
        : 'のこりの しゅくだいも がんばろう！'}</div>
    </div>`;
  document.body.appendChild(overlay);

  // タップ、または4秒で消える
  const remove = () => overlay.remove();
  overlay.addEventListener('click', remove);
  setTimeout(remove, 4000);
}

// apps/◯◯/ 配下のアプリを ひらいたときだけ、自動で「ひらいた回数」を1ふやす。
// （index.html や kiroku.html など apps の外では何もしない）
if (Stats._detectId()) {
  Stats.open();

  // このアプリが きょうの しゅくだいで、まだ「できた」になっていなければ
  // 「きょうの しゅくだいだよ！」のお知らせを出す
  const hwItem = Homework.itemFor(Stats._detectId());
  if (hwItem && !hwItem.done) {
    const showStart = () => showHomeworkStartPopup(hwItem.note);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showStart);
    } else {
      showStart();
    }
  }
}
