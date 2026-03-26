import json, urllib.request, os
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

BINA_URL = "https://webfiles.binaw.com/post/PostJsonDocV2.aspx"
TOKEN    = "76b37357660475442296bc1b40140c54a63711ceacee30002af04286f21fc460-Shilat3583"

@app.route('/')
def index():
    # Try multiple locations for index.html
    for path in ['index.html', 'static/index.html']:
        if os.path.exists(path):
            return send_file(path)
    return "index.html not found", 404

@app.route('/health')
def health():
    return jsonify({"status": "ok"})

@app.route('/bina', methods=['POST', 'OPTIONS'])
def proxy():
    if request.method == 'OPTIONS':
        return '', 204
    body = request.get_json(force=True) or {}
    body['tokenId'] = TOKEN
    try:
        d   = json.dumps(body).encode()
        req = urllib.request.Request(
            BINA_URL, data=d, method='POST',
            headers={'Content-Type': 'application/json', 'User-Agent': 'Shilat/1'}
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read().decode('utf-8', 'replace')
        try:
            pj    = json.loads(raw)
            items = pj if isinstance(pj, list) else pj.get('items', []) if isinstance(pj, dict) else []
            parsed = {'type': 'json', 'items': items}
        except:
            parsed = {'type': 'bina_star', 'items': []} if raw.startswith('*') else {'type': 'unknown', 'items': []}
        return jsonify({'success': True, 'parsed': parsed, 'raw': raw})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5050))
    app.run(host='0.0.0.0', port=port)
