"""
小学校 学習アプリ用ローカルサーバー
=====================================
このファイルを実行すると、スマホからアプリにアクセスできるようになります。
スマホとパソコンを同じ Wi-Fi に接続してください。
"""

import http.server
import socketserver
import json
import os
import socket
import webbrowser
from pathlib import Path

# ─── 設定 ───────────────────────────────────────────────────────────────────
PORT = 8080                          # ポート番号（通常はそのままでOK）
BASE_DIR = Path(__file__).parent     # このファイルのあるフォルダ


# ─── カスタムHTTPハンドラー ────────────────────────────────────────────────────
class AppHandler(http.server.SimpleHTTPRequestHandler):
    """
    ファイルの配信 + apps.json の保存APIを担うサーバー処理クラス。
    通常のファイルリクエストは SimpleHTTPRequestHandler に任せ、
    /api/save-apps への POST だけ独自処理する。
    """

    def __init__(self, *args, **kwargs):
        # ファイル配信のルートを、このスクリプトがあるフォルダに設定
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    def do_POST(self):
        """POST リクエストの処理。manage.html からの保存リクエストを受け取る。"""
        if self.path == '/api/save-apps':
            # リクエストボディ（JSON）を読み込む
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            data = json.loads(body.decode('utf-8'))

            # apps.json に書き込む
            apps_file = BASE_DIR / 'apps.json'
            with open(apps_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

            # 成功レスポンスを返す
            self._send_json({'ok': True})

        elif self.path == '/api/create-app':
            # 新しいアプリフォルダとindex.htmlを作成する
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            data = json.loads(body.decode('utf-8'))

            app_id = data.get('id', '').strip()
            if app_id and app_id.isalnum():
                app_dir = BASE_DIR / 'apps' / app_id
                app_dir.mkdir(parents=True, exist_ok=True)
                template = app_dir / 'index.html'
                if not template.exists():
                    # シンプルなテンプレートHTMLを作成
                    name = data.get('name', app_id)
                    template.write_text(
                        f'<!DOCTYPE html>\n<html lang="ja">\n<head>\n'
                        f'<meta charset="UTF-8">\n'
                        f'<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
                        f'<title>{name}</title>\n</head>\n<body>\n'
                        f'<h1>{name}</h1>\n<p>ここにアプリを作ってください。</p>\n'
                        f'</body>\n</html>\n',
                        encoding='utf-8'
                    )
                self._send_json({'ok': True, 'path': f'apps/{app_id}/index.html'})
            else:
                self._send_json({'ok': False, 'error': 'IDが無効です'}, status=400)
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        """プリフライトリクエスト（CORS）の処理。"""
        self.send_response(200)
        self._add_cors_headers()
        self.end_headers()

    def _send_json(self, data: dict, status: int = 200):
        """JSON レスポンスを送信するヘルパー。"""
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self._add_cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def _add_cors_headers(self):
        """CORS ヘッダーを追加（スマホからのアクセスに必要）。"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def log_message(self, format, *args):
        """アクセスログをシンプルに表示する。"""
        path = args[0].split('"')[1] if '"' in args[0] else args[0]
        # 静的ファイル（画像・CSSなど）のログは省略
        if not any(path.endswith(ext) for ext in ['.ico', '.png', '.jpg', '.css']):
            print(f"  📥 {self.client_address[0]} → {path}")


# ─── ローカルIPアドレスを取得 ─────────────────────────────────────────────────
def get_local_ip() -> str:
    """
    このパソコンのローカルIPアドレスを取得する。
    スマホからアクセスするときに必要なアドレスを調べるために使う。
    """
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # 実際には接続しないが、これでIPが分かる
        s.connect(('8.8.8.8', 80))
        return s.getsockname()[0]
    except Exception:
        return '127.0.0.1'
    finally:
        s.close()


# ─── メイン処理 ───────────────────────────────────────────────────────────────
if __name__ == '__main__':
    ip = get_local_ip()
    url_pc    = f'http://localhost:{PORT}'
    url_phone = f'http://{ip}:{PORT}'

    print()
    print("=" * 52)
    print("  📚  小学校 学習アプリ  サーバー起動中")
    print("=" * 52)
    print(f"  【このパソコンから開く】")
    print(f"    {url_pc}")
    print()
    print(f"  【スマホから開く】")
    print(f"    {url_phone}")
    print(f"    ↑ スマホとパソコンを同じ Wi-Fi に繋いでください")
    print()
    print(f"  管理ツール: {url_pc}/manage.html")
    print("=" * 52)
    print("  ※ 終了するにはこのウィンドウを閉じてください")
    print("=" * 52)
    print()

    # パソコンのブラウザでランチャーを自動的に開く
    webbrowser.open(url_pc)

    # サーバーを起動して待ち受ける
    with socketserver.TCPServer(('', PORT), AppHandler) as httpd:
        httpd.allow_reuse_address = True
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n  サーバーを終了しました。")
