import logging
import socket
import sys
import threading
import time

import psutil

logger = logging.getLogger(__name__)


class NetworkMonitor:
    def __init__(self, detector=None, events_buffer=None, events_lock=None):
        self.detector = detector
        self.events_buffer = events_buffer
        self.events_lock = events_lock or threading.Lock()
        self.lock = threading.Lock()
        self.snapshot = {"connections": [], "status": "loading", "message": None, "timestamp": None}
        self.thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.thread.start()

    def collect(self):
        """Build a socket snapshot, retaining sockets whose owner exited or is inaccessible."""
        connections = []
        names = {}
        for connection in psutil.net_connections(kind="inet"):
            pid = connection.pid
            if pid not in names:
                try:
                    names[pid] = psutil.Process(pid).name() if pid is not None else "Unknown"
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    names[pid] = "Unknown"
            connections.append({
                "pid": pid,
                "name": names[pid],
                "protocol": "TCP" if connection.type == socket.SOCK_STREAM else "UDP",
                "family": "IPv6" if connection.family == socket.AF_INET6 else "IPv4",
                "local": self._address(connection.laddr),
                "remote": self._address(connection.raddr),
                "status": connection.status,
            })
        connections.sort(key=lambda row: (row["name"].lower(), row["pid"] or -1, row["local"] or ""))
        return {
            "connections": connections,
            "status": "ok",
            # Linux may omit privileged sockets without reporting an error.
            "message": "Some connections may be hidden by OS permissions." if sys.platform.startswith("linux") else None,
            "timestamp": time.time(),
        }

    @staticmethod
    def _address(address):
        if not address:
            return None
        host = f"[{address.ip}]" if ":" in address.ip else address.ip
        return f"{host}:{address.port}"

    def _monitor_loop(self):
        """Collect outside the lock; publish failures explicitly instead of serving stale rows."""
        while True:
            try:
                snapshot = self.collect()
                if self.detector:
                    events = self.detector.analyze_connections(snapshot['connections'])
                    if events and self.events_buffer is not None:
                        with self.events_lock:
                            self.events_buffer.extend(events)
                            del self.events_buffer[:-100]
            except (psutil.AccessDenied, PermissionError):
                snapshot = {
                    "connections": [], "status": "restricted",
                    "message": "The OS denied access to network connections. macOS requires an elevated collector; other systems may require additional permissions.",
                    "timestamp": time.time(),
                }
            except Exception:
                logger.exception("Network connection collection failed")
                snapshot = {
                    "connections": [], "status": "error",
                    "message": "Network collection failed. Check the backend logs.",
                    "timestamp": time.time(),
                }
            if snapshot['status'] != 'ok' and self.detector:
                self.detector.reset()
            with self.lock:
                self.snapshot = snapshot
            time.sleep(2)

    def get_connections(self):
        with self.lock:
            return dict(self.snapshot)
