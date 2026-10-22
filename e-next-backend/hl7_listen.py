"""Debug-only MLLP printout. Does not write the progress sheet.

The backend listener on port 7700 does the save. Stop this script before
starting uvicorn, or the port stays taken and the sheet will not update.
"""

import socket
from datetime import datetime
from pathlib import Path

HOST = "0.0.0.0"
PORT = 7700
VT = b"\x0b"
FS = b"\x1c"
CR = b"\r"
LOG = Path(__file__).with_name("hl7_inbox.log")


def ack_for(message: str) -> bytes:
    fields = message.split("\r")[0].split("|")
    control_id = fields[9] if len(fields) > 9 else "1"
    version = fields[11] if len(fields) > 11 and fields[11] else "2.6"
    text = f"MSH|^~\\&|eNext||MINDRAY|MINDRAY|{datetime.now():%Y%m%d%H%M%S}||ACK|{control_id}|P|{version}\rMSA|AA|{control_id}\r"
    return VT + text.encode("utf-8") + FS + CR


def main() -> None:
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((HOST, PORT))
    server.listen(5)
    print(f"Listening on {HOST}:{PORT}")
    print(f"Messages will also be saved in {LOG}")
    print("Leave this window open.")

    while True:
        conn, addr = server.accept()
        print(f"Connected: {addr[0]}:{addr[1]}")
        buf = b""
        try:
            while True:
                chunk = conn.recv(65536)
                if not chunk:
                    break
                print(f"Received {len(chunk)} bytes: {chunk[:300]!r}")
                buf += chunk
                while FS + CR in buf:
                    raw, buf = buf.split(FS + CR, 1)
                    text = raw.lstrip(VT).decode("utf-8", "ignore").strip("\r\n")
                    if not text:
                        continue
                    print(text.replace("\r", "\n"))
                    print("-" * 40)
                    with LOG.open("a", encoding="utf-8") as handle:
                        handle.write(f"\n# {datetime.now().isoformat()} from {addr[0]}\n")
                        handle.write(text.replace("\r", "\n"))
                        handle.write("\n")
                    conn.sendall(ack_for(text))
        except ConnectionError as exc:
            print(f"Connection closed: {exc}")
        finally:
            if buf:
                print(f"Leftover {len(buf)} bytes: {buf[:300]!r}")
            conn.close()
            print(f"Disconnected: {addr[0]}")


if __name__ == "__main__":
    main()
