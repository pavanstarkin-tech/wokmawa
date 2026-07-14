import socket

HOST = "0.0.0.0"
PORT = 9100

server = socket.socket()
# Allow reusing address/port immediately after restarts
server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
server.bind((HOST, PORT))
server.listen(1)

print("Paakashala ESC/POS Printer Emulator Listening on port 9100...")
print("Raw byte commands will be saved to 'receipt.bin'")

try:
    while True:
        conn, addr = server.accept()
        print("Connection received from:", addr)
        
        data = bytearray()
        while True:
            chunk = conn.recv(4096)
            if not chunk:
                break
            data.extend(chunk)
        
        if len(data) > 0:
            print(f"Captured {len(data)} raw ESC/POS bytes.")
            print(f"Hex: {data.hex()[:100]}...")
            
            with open("receipt.bin", "ab") as f:
                f.write(data)
            print("Successfully appended to receipt.bin\n")
            
        conn.close()
except KeyboardInterrupt:
    print("\nEmulator stopped by user.")
