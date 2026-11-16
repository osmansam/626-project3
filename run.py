"""Serve the local report explorer without third-party dependencies."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Run Intelligence Report Explorer locally')
    parser.add_argument('--port', type=int, default=8000)
    options = parser.parse_args()
    root = Path(__file__).resolve().parent / 'dist'
    if not (root / 'index.html').exists():
        parser.error('Build the React app first with npm install and npm run build')
    handler = partial(SimpleHTTPRequestHandler, directory=str(root))
    server = ThreadingHTTPServer(('127.0.0.1', options.port), handler)
    print(f'Intelligence Report Explorer: http://127.0.0.1:{options.port}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nServer stopped.')
    finally:
        server.server_close()
