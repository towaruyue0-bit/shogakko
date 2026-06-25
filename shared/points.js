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
    return total;
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
