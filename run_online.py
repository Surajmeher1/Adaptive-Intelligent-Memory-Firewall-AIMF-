"""
AIMF — Start Backend & Online Tunnel
====================================
Robust runner that:
1. Cleans up any existing processes on port 8000 or old cloudflared instances.
2. Starts the FastAPI backend with health monitoring.
3. Launches cloudflared tunnel to expose port 8000 to the internet.
4. Captures the live trycloudflare.com URL and copies it to clipboard.
5. Displays clear instructions for connecting to the Vercel frontend.
"""

import os
import sys
import time
import re
import socket
import subprocess
import threading
import urllib.request
import urllib.error

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
PYTHON_EXE = os.path.join(BACKEND_DIR, ".venv", "Scripts", "python.exe")
CLOUDFLARED_EXE = os.path.join(PROJECT_ROOT, "scratch", "cloudflared.exe")

if not os.path.exists(PYTHON_EXE):
    PYTHON_EXE = sys.executable

def kill_process_on_port(port: int):
    """Kill any process listening on the target port (Windows)."""
    try:
        cmd = f'powershell -Command "Get-NetTCPConnection -LocalPort {port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique"'
        output = subprocess.check_output(cmd, shell=True, text=True).strip()
        if output:
            for pid in output.split():
                pid = pid.strip()
                if pid and pid != "0":
                    subprocess.run(f"taskkill /F /PID {pid}", shell=True, capture_output=True)
    except Exception:
        pass

def kill_cloudflared():
    """Kill any existing cloudflared processes."""
    try:
        subprocess.run("taskkill /F /IM cloudflared.exe", shell=True, capture_output=True)
    except Exception:
        pass

def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1", port)) == 0

def check_backend_health(timeout: int = 20) -> bool:
    start = time.time()
    url = "http://127.0.0.1:8000/api/v1/health"
    while time.time() - start < timeout:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "AIMF-Check"})
            with urllib.request.urlopen(req, timeout=2) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            time.sleep(1)
    return False

def copy_to_clipboard(text: str):
    try:
        p = subprocess.Popen(["clip"], stdin=subprocess.PIPE, shell=True)
        p.communicate(input=text.encode("utf-8"))
    except Exception:
        pass

def main():
    os.chdir(PROJECT_ROOT)
    print("\n" + "=" * 60)
    print("   AIMF — Adaptive Memory Firewall: Online Launcher")
    print("=" * 60 + "\n")

    # Step 1: Clean up port 8000 if needed
    if is_port_in_use(8000):
        print("[*] Port 8000 is currently in use. Cleaning up existing process...")
        kill_process_on_port(8000)
        time.sleep(1)

    kill_cloudflared()

    # Step 2: Start backend
    print("[1/3] Starting FastAPI backend on http://127.0.0.1:8000 ...")
    backend_cmd = [PYTHON_EXE, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"]
    backend_proc = subprocess.Popen(
        backend_cmd,
        cwd=BACKEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    # Monitor backend output in background thread to prevent buffer clogging
    def stream_backend_log(proc):
        for line in proc.stdout:
            # Uncomment if debug is needed: sys.stdout.write("[Backend] " + line)
            pass
    threading.Thread(target=stream_backend_log, args=(backend_proc,), daemon=True).start()

    print("[*] Waiting for backend to become ready...")
    if not check_backend_health(timeout=25):
        print("[!] ERROR: Backend server failed to respond on http://127.0.0.1:8000/api/v1/health within 25s.")
        print("[!] Please check your Python environment or logs.")
        input("Press Enter to exit...")
        return 1

    print("[OK] Backend is healthy and ready!\n")

    # Step 3: Start Cloudflare Tunnel
    print("[2/3] Starting Cloudflare Online Tunnel for Vercel connection...")
    if not os.path.exists(CLOUDFLARED_EXE):
        print(f"[!] Warning: cloudflared not found at {CLOUDFLARED_EXE}")
        input("Press Enter to exit...")
        return 1

    tunnel_cmd = [CLOUDFLARED_EXE, "tunnel", "--url", "http://127.0.0.1:8000"]
    tunnel_proc = subprocess.Popen(
        tunnel_cmd,
        cwd=PROJECT_ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    tunnel_url = None
    start_time = time.time()
    url_pattern = re.compile(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com")

    while time.time() - start_time < 30:
        line = tunnel_proc.stdout.readline()
        if not line:
            time.sleep(0.5)
            continue
        match = url_pattern.search(line)
        if match:
            tunnel_url = match.group(0).strip()
            break

    if not tunnel_url:
        print("[!] Cloudflare tunnel did not provide a URL within 30s.")
        print("[*] Local backend is still running at http://localhost:8000")
    else:
        copy_to_clipboard(tunnel_url)
        print("\n" + "=" * 60)
        print("  [SUCCESS] AIMF BACKEND IS ONLINE FOR VERCEL!")
        print("=" * 60)
        print(f"\n  Local Backend API:  http://localhost:8000")
        print(f"  Swagger Docs:       http://localhost:8000/docs")
        print(f"\n  >>> LIVE PUBLIC URL:  {tunnel_url}")
        print("  (This URL has been automatically copied to your clipboard!)\n")
        print("-" * 60)
        print("  HOW TO USE WITH ONLINE VERCEL FRONTEND:")
        print("  1. Open your Vercel URL in your browser:")
        print("     https://aimf-psi.vercel.app/login")
        print("  2. Look at the API URL shown above the Login button.")
        print("  3. Click '[Change]' next to the API URL.")
        print(f"  4. Paste this Public URL: {tunnel_url}")
        print("  5. Click 'Save' and Login with:")
        print("     Email:    admin@aimf.dev")
        print("     Password: Admin123!")
        print("-" * 60)
        print("\nKeep this window open while using the application.")
        print("Press Ctrl+C to stop both backend and tunnel.\n")

    try:
        while True:
            time.sleep(1)
            if backend_proc.poll() is not None:
                print("\n[!] Backend process stopped unexpectedly.")
                break
            if tunnel_proc.poll() is not None:
                print("\n[!] Tunnel process stopped unexpectedly.")
                break
    except KeyboardInterrupt:
        print("\n[*] Stopping services gracefully...")
    finally:
        try:
            backend_proc.terminate()
        except Exception:
            pass
        try:
            tunnel_proc.terminate()
        except Exception:
            pass
        kill_process_on_port(8000)
        kill_cloudflared()
        print("[OK] Services stopped.")

if __name__ == "__main__":
    main()
