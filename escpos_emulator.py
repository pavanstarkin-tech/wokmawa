import socket
import os
import datetime

HOST = "0.0.0.0"
PORT = 9100

# Save receipts to Downloads/receipts folder
RECEIPTS_DIR = os.path.join(os.path.expanduser("~"), "Downloads", "receipts")
os.makedirs(RECEIPTS_DIR, exist_ok=True)

server = socket.socket()
# Allow reusing address/port immediately after restarts
server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
server.bind((HOST, PORT))
server.listen(1)

print("=" * 55)
print("  Paakashala ESC/POS Printer Emulator")
print(f"  Listening on port {PORT}")
print(f"  Saving receipts to: {RECEIPTS_DIR}")
print("=" * 55)

try:
    while True:
        conn, addr = server.accept()
        print(f"\nConnection received from: {addr}")
        
        data = bytearray()
        while True:
            chunk = conn.recv(4096)
            if not chunk:
                break
            data.extend(chunk)
        
        if len(data) > 0:
            # Generate a timestamped unique filename for each receipt
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"receipt_{timestamp}.bin"
            filepath = os.path.join(RECEIPTS_DIR, filename)
            
            with open(filepath, "wb") as f:
                f.write(data)

            print(f"  Captured {len(data)} ESC/POS bytes.")
            print(f"  Saved to: {filepath}")
            print(f"  Hex preview: {data.hex()[:80]}...")
            
        conn.close()
except KeyboardInterrupt:
    print("\nEmulator stopped by user.")
