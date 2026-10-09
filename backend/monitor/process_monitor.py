import psutil
import threading
import time

class ProcessMonitor:
    def __init__(self, detector=None, events_buffer=None):
        self.cpu_count = psutil.cpu_count() or 1
        self.detector = detector
        self.events_buffer = events_buffer
        self.processes = []
        self.lock = threading.Lock()
        self.running = True
        
        # Prime CPU percent for all processes
        for p in psutil.process_iter():
            try:
                p.cpu_percent()
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
                
        self.thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.thread.start()

    def _monitor_loop(self):
        while self.running:
            processes = []
            # 'username' is specifically excluded from process_iter attributes because on Windows,
            # WMI/SID resolution for usernames can block for 5-10 seconds per loop.
            for proc in psutil.process_iter(['pid', 'name', 'memory_info', 'memory_percent', 'status']):
                try:
                    pid = proc.info['pid']
                    if pid == 0:  # Skip System Idle Process
                        continue
                        
                    cpu_percent = proc.cpu_percent(interval=None)
                    if cpu_percent is not None:
                        cpu_percent = cpu_percent / self.cpu_count
                        
                    info = proc.info
                    mem_usage = info['memory_info'].rss if info['memory_info'] else 0
                    processes.append({
                        "pid": pid,
                        "name": info['name'],
                        "cpu_percent": cpu_percent,
                        "memory_usage": mem_usage,
                        "memory_percent": info['memory_percent'],
                        "status": info['status'],
                        "username": "N/A" # Omitted to prevent blocking delays
                    })
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    continue
            
            with self.lock:
                self.processes = processes
                
            # Perform detection in the background thread exactly every 2 seconds
            if self.detector and self.events_buffer is not None:
                new_events = self.detector.analyze_processes(processes, total_system_memory=None)
                if new_events:
                    for e in new_events:
                        e['timestamp'] = time.time()
                    
                    self.events_buffer.extend(new_events)
                    while len(self.events_buffer) > 100:
                        self.events_buffer.pop(0)

            time.sleep(2.0)

    def get_processes(self):
        with self.lock:
            return list(self.processes)
