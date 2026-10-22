"""Vendor-neutral MLLP listener. Mindray and Philips both arrive on this port.

Starts with the API. Do not run hl7_listen.py while uvicorn is up.
"""

import asyncio
import logging
import socket
from datetime import datetime

from app.core.config import settings

logger = logging.getLogger("uvicorn.error")

VT = b"\x0b"
FS = b"\x1c"
CR = b"\r"
SYSTEM_USER = {"sub": "hl7-listener", "pid": "hl7-listener"}
_connections: set[asyncio.StreamWriter] = set()


def build_ack(message: str) -> bytes:
    fields = message.split("\r", 1)[0].split("|")
    sending_app = fields[2] if len(fields) > 2 else ""
    sending_facility = fields[3] if len(fields) > 3 else ""
    control_id = fields[9] if len(fields) > 9 else "1"
    version = fields[11] if len(fields) > 11 and fields[11] else "2.6"
    now = datetime.now().strftime("%Y%m%d%H%M%S")
    text = (
        f"MSH|^~\\&|eNext|eNext|{sending_app}|{sending_facility}|{now}"
        f"||ACK^R01^ACK|{control_id}|P|{version}\r"
        f"MSA|AA|{control_id}\r"
    )
    return VT + text.encode("utf-8") + FS + CR


async def _handle(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
    from app.base.models import BaseError
    from app.integrations.service import MonitorIngestService

    peer = writer.get_extra_info("peername")
    logger.info("HL7 connected from %s", peer)
    _connections.add(writer)
    buf = b""
    try:
        while True:
            chunk = await reader.read(65536)
            if not chunk:
                break
            buf += chunk
            while FS + CR in buf:
                raw, buf = buf.split(FS + CR, 1)
                text = raw.lstrip(VT).decode("utf-8", "ignore").strip("\r\n")
                if not text.startswith("MSH"):
                    continue
                try:
                    snapshot = await MonitorIngestService.ingest(text, SYSTEM_USER)
                    logger.info(
                        "HL7 saved vendor=%s hospital=%s icu=%s bed=%s patient=%s",
                        snapshot.vendor,
                        snapshot.hospital_name,
                        snapshot.icu_name,
                        snapshot.bed_number,
                        snapshot.patient_unique_id or snapshot.patient_id,
                    )
                except BaseError as exc:
                    detail = exc.detail if isinstance(exc.detail, dict) else {}
                    logger.warning(
                        "HL7 received but not saved: %s",
                        detail.get("message") or exc.detail,
                    )
                except Exception:
                    logger.exception("HL7 received but not saved")
                writer.write(build_ack(text))
                await writer.drain()
    except (ConnectionError, asyncio.IncompleteReadError) as exc:
        logger.info("HL7 connection closed: %s", exc)
    finally:
        _connections.discard(writer)
        writer.close()
        try:
            await writer.wait_closed()
        except Exception:
            pass


def _lan_ip() -> str:
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("8.8.8.8", 80))
        return sock.getsockname()[0]
    except OSError:
        return ""
    finally:
        sock.close()


async def start_mllp_server():
    if not settings.HL7_MLLP_ENABLED:
        logger.info("HL7 listener is off")
        return None
    host = settings.HL7_MLLP_HOST
    port = settings.HL7_MLLP_PORT
    server = None
    last_error = None
    for _ in range(10):
        try:
            server = await asyncio.start_server(_handle, host, port)
            break
        except OSError as exc:
            last_error = exc
            await asyncio.sleep(0.5)
    if server is None:
        logger.error(
            "HL7 listener did not start on %s:%s (%s). "
            "Stop hl7_listen.py if that window is still open, then restart uvicorn.",
            host,
            port,
            last_error,
        )
        return None
    lan_ip = _lan_ip()
    if lan_ip:
        logger.info(
            "HL7 listener on %s:%s. Point the gateway Primary Server at %s port %s.",
            host,
            port,
            lan_ip,
            port,
        )
    else:
        logger.info("HL7 listener on %s:%s", host, port)
    return server


async def stop_mllp_server(server) -> None:
    if server is None:
        return
    for writer in list(_connections):
        transport = getattr(writer, "transport", None)
        if transport is not None:
            transport.abort()
        else:
            writer.close()
    _connections.clear()
    server.close()
    try:
        await asyncio.wait_for(server.wait_closed(), timeout=2)
    except asyncio.TimeoutError:
        logger.warning("HL7 listener stop timed out; API shutdown is continuing")
