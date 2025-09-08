#!/usr/bin/env python3
import http.server
import socketserver
import os
from urllib.parse import urlparse

class CacheBustHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add cache control headers
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

if __name__ == "__main__":
    PORT = 5000
    os.chdir('.')  # Serve from current directory
    
    with socketserver.TCPServer(("0.0.0.0", PORT), CacheBustHTTPRequestHandler) as httpd:
        print(f"Serving at http://0.0.0.0:{PORT}/")
        httpd.serve_forever()