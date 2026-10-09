import psutil
import time
import threading

class SystemMonitor:
    def __init__(self):
        self.last_net_io = psutil.net_io_counters()
        self.last_net_time = time.time()
        self.stats = {}
        self.lock = threading.Lock()
        self.running = True
        self.thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.thread.start()

    def _monitor_loop(self):
        # Prime the cpu_percent
        psutil.cpu_percent(interval=0.1)
        while self.running:
            cpu = psutil.cpu_percent(interval=2.0)
            mem = psutil.virtual_memory()
            try:
                disk = psutil.disk_usage('C:\\')
            except:
                disk = psutil.disk_usage('/')
                
            current_net_io = psutil.net_io_counters()
            current_net_time = time.time()
            time_diff = current_net_time - self.last_net_time
            
            if time_diff > 0:
                upload_rate = (current_net_io.bytes_sent - self.last_net_io.bytes_sent) / time_diff
                download_rate = (current_net_io.bytes_recv - self.last_net_io.bytes_recv) / time_diff
            else:
                upload_rate = 0
                download_rate = 0
                
            self.last_net_io = current_net_io
            self.last_net_time = current_net_time
            
            with self.lock:
                self.stats = {
                    "cpu_percent": cpu,
                    "memory": {
                        "total": mem.total,
                        "used": mem.used,
                        "available": mem.available,
                        "percent": mem.percent
                    },
                    "disk": {
                        "total": disk.total,
                        "used": disk.used,
                        "free": disk.free,
                        "percent": disk.percent
                    },
                    "network": {
                        "bytes_sent": current_net_io.bytes_sent,
                        "bytes_recv": current_net_io.bytes_recv,
                        "upload_rate": upload_rate,
                        "download_rate": download_rate
                    },
                    "timestamp": current_net_time
                }
            
    def get_system_stats(self):
        with self.lock:
            return dict(self.stats)
