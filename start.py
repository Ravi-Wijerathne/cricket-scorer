#!/usr/bin/env python3
"""
Cricket Scorer - Auto Start Script
Checks prerequisites, verifies project files, and launches the app.
"""

import sys
import os
import platform
import shutil
import socket
import webbrowser
import time
import http.server
import threading

# ─── Configuration ───────────────────────────────────────────────────────────
PORT = 8000
HOST = "localhost"
APP_URL = f"http://{HOST}:{PORT}"

# All files required by the project (relative to project root)
REQUIRED_FILES = [
    "index.html",
    "app.js",
    "style.css",
    "manifest.json",
    "service-worker.js",
    # Models
    "models/BallEvent.js",
    "models/Innings.js",
    "models/Match.js",
    "models/Over.js",
    "models/Player.js",
    "models/Team.js",
    # Engines
    "engines/RulesEngine.js",
    "engines/ScoringEngine.js",
    "engines/StatsEngine.js",
    # Services
    "services/StorageService.js",
    "services/UndoService.js",
    # UI
    "ui/MatchSetup.js",
    "ui/ScorecardUI.js",
    "ui/ScoringUI.js",
]

REQUIRED_DIRS = [
    "models",
    "engines",
    "services",
    "ui",
    "icons",
]

# ─── Helpers ─────────────────────────────────────────────────────────────────
PASS = "\033[92m[PASS]\033[0m"
FAIL = "\033[91m[FAIL]\033[0m"
INFO = "\033[94m[INFO]\033[0m"
WARN = "\033[93m[WARN]\033[0m"


def check_passed(label):
    print(f"  {PASS} {label}")


def check_failed(label, hint=""):
    msg = f"  {FAIL} {label}"
    if hint:
        msg += f"  ->  {hint}"
    print(msg)


def info(msg):
    print(f"  {INFO} {msg}")


def warn(msg):
    print(f"  {WARN} {msg}")


def is_port_available(port):
    """Return True if the TCP port is free on localhost."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("127.0.0.1", port)) != 0


# ─── Prerequisite Checks ────────────────────────────────────────────────────
def check_python_version():
    """Ensure Python >= 3.7 (f-strings, http.server improvements)."""
    v = sys.version_info
    label = f"Python {v.major}.{v.minor}.{v.micro}"
    if v >= (3, 7):
        check_passed(label)
        return True
    else:
        check_failed(label, "Python 3.7 or higher is required.")
        return False


def check_standard_library_modules():
    """Verify the standard-library modules we depend on are available."""
    modules = ["http.server", "webbrowser", "socket", "threading", "json", "os"]
    all_ok = True
    for mod in modules:
        try:
            __import__(mod)
            check_passed(f"Module '{mod}' available")
        except ImportError:
            check_failed(f"Module '{mod}' missing",
                         "Re-install Python with the standard library.")
            all_ok = False
    return all_ok


def check_browser():
    """Check that a web browser can be detected."""
    try:
        webbrowser.get()
        check_passed("Default web browser detected")
        return True
    except webbrowser.Error:
        check_failed("No web browser found",
                     "Install Chrome, Edge, or Firefox.")
        return False


def check_os_info():
    """Print OS information (informational, always passes)."""
    info(f"OS: {platform.system()} {platform.release()} ({platform.machine()})")
    return True


def check_node_npm():
    """Check if Node.js and npm are installed (optional, for alternate serve)."""
    node = shutil.which("node")
    npm = shutil.which("npm")
    npx = shutil.which("npx")
    if node:
        check_passed(f"Node.js found at {node}")
    else:
        warn("Node.js not found (optional — not required)")
    if npm:
        check_passed(f"npm found at {npm}")
    else:
        warn("npm not found (optional — not required)")
    if npx:
        check_passed(f"npx found at {npx}")
    else:
        warn("npx not found (optional — not required)")
    return True  # These are optional


# ─── Project File Checks ────────────────────────────────────────────────────
def check_project_files(project_root):
    """Verify every required file and directory exists."""
    all_ok = True

    for d in REQUIRED_DIRS:
        path = os.path.join(project_root, d)
        if os.path.isdir(path):
            check_passed(f"Directory  '{d}/'")
        else:
            check_failed(f"Directory  '{d}/' missing")
            all_ok = False

    for f in REQUIRED_FILES:
        path = os.path.join(project_root, f)
        if os.path.isfile(path):
            check_passed(f"File       '{f}'")
        else:
            check_failed(f"File       '{f}' missing")
            all_ok = False

    return all_ok


def check_port(port):
    """Ensure the target port is available."""
    if is_port_available(port):
        check_passed(f"Port {port} is available")
        return True
    else:
        check_failed(f"Port {port} is in use",
                     f"Free the port or change PORT in this script.")
        return False


# ─── Server ─────────────────────────────────────────────────────────────────
class QuietServer(http.server.ThreadingHTTPServer):
    def handle_error(self, request, client_address):
        # Suppress harmless connection drop errors (e.g., when browser cancels request)
        err_type = sys.exc_info()[0]
        if err_type and issubclass(err_type, (ConnectionAbortedError, BrokenPipeError, ConnectionResetError)):
            return
        super().handle_error(request, client_address)

def start_server(project_root, port):
    """Start a simple HTTP server serving the project directory."""
    os.chdir(project_root)
    handler = http.server.SimpleHTTPRequestHandler
    httpd = QuietServer((HOST, port), handler)
    info(f"Serving on {APP_URL}")
    httpd.serve_forever()


# ─── Main ───────────────────────────────────────────────────────────────────
def main():
    project_root = os.path.dirname(os.path.abspath(__file__))

    print()
    print("=" * 60)
    print("   Cricket Scorer — Startup & Dependency Checker")
    print("=" * 60)

    # 1. System info
    print("\n--- System Information ---")
    check_os_info()

    # 2. Python
    print("\n--- Python ---")
    py_ok = check_python_version()

    # 3. Standard library modules
    print("\n--- Standard Library Modules ---")
    lib_ok = check_standard_library_modules()

    # 4. Browser
    print("\n--- Browser ---")
    browser_ok = check_browser()

    # 5. Optional tooling
    print("\n--- Optional Tools (Node / npm / npx) ---")
    check_node_npm()

    # 6. Project files
    print("\n--- Project Files ---")
    files_ok = check_project_files(project_root)

    # 7. Port availability
    print("\n--- Network ---")
    port_ok = check_port(PORT)

    # ── Summary ──────────────────────────────────────────────────────────
    critical_ok = py_ok and lib_ok and browser_ok and files_ok and port_ok
    print("\n" + "=" * 60)
    if not critical_ok:
        print(f"  {FAIL} Some checks failed. Please fix the issues above")
        print("       before running the app.")
        print("=" * 60)
        sys.exit(1)

    print(f"  {PASS} All checks passed!")
    print("=" * 60)

    # ── Launch ───────────────────────────────────────────────────────────
    print(f"\n  Starting Cricket Scorer at {APP_URL} ...")
    print("  Press Ctrl+C to stop the server.\n")

    # Run server in a daemon thread so Ctrl+C stops everything
    server_thread = threading.Thread(
        target=start_server, args=(project_root, PORT), daemon=True
    )
    server_thread.start()

    # Give the server a moment to bind
    time.sleep(1)

    # Open the browser
    webbrowser.open(APP_URL)

    # Keep the main thread alive
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print(f"\n  {INFO} Server stopped. Goodbye!")
        sys.exit(0)


if __name__ == "__main__":
    main()
