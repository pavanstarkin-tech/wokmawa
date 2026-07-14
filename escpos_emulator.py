import socket
import os
import datetime

HOST = "0.0.0.0"
PORT = 9100

# Save receipts to Downloads/receipts folder
RECEIPTS_DIR = os.path.join(os.path.expanduser("~"), "Downloads", "receipts")
os.makedirs(RECEIPTS_DIR, exist_ok=True)

def get_local_ip():
    """Get the machine's active LAN IP address."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

local_ip = get_local_ip()

server = socket.socket()
server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
server.bind((HOST, PORT))
server.listen(1)

print("=" * 55)
print("  Paakashala ESC/POS Printer Emulator")
print(f"  Listening on port    : {PORT}")
print(f"  Local LAN IP         : {local_ip}")
print(f"  Loopback (same PC)   : 127.0.0.1")
print(f"  Saving receipts to   : {RECEIPTS_DIR}")
print("=" * 55)
print()
print("  Configure in Paakashala:")
print(f"    IP   = 127.0.0.1  (or {local_ip} from another device)")
print(f"    Port = {PORT}")
print()

try:
    while True:
        conn, addr = server.accept()
        print(f"  Connection received from: {addr[0]}:{addr[1]}")

        data = bytearray()
        while True:
            chunk = conn.recv(4096)
            if not chunk:
                break
            data.extend(chunk)

        if len(data) > 0:
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"receipt_{timestamp}.bin"
            filepath = os.path.join(RECEIPTS_DIR, filename)

            with open(filepath, "wb") as f:
                f.write(data)

            print(f"  Captured {len(data)} bytes → {filepath}")
            print()

        conn.close()
except KeyboardInterrupt:
    print("\nEmulator stopped by user.")
