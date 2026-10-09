from .threat_score import calculate_threat_score, get_severity

class ProcessDetector:
    def __init__(self, cpu_threshold=90.0, mem_threshold=80.0, required_samples=3):
        self.cpu_threshold = cpu_threshold
        self.mem_threshold = mem_threshold
        self.required_samples = required_samples
        
        # Track historical data: pid -> {"high_cpu_count": 0, "high_mem_count": 0, "last_alerted": False}
        self.process_history = {}
        
    def analyze_processes(self, processes, total_system_memory=None):
        events = []
        current_pids = set()
        
        for p in processes:
            pid = p["pid"]
            current_pids.add(pid)
            
            if pid not in self.process_history:
                self.process_history[pid] = {
                    "high_cpu_count": 0, 
                    "high_mem_count": 0,
                    "last_alerted": False
                }
                
            history = self.process_history[pid]
            
            # Check CPU
            if p["cpu_percent"] is not None and p["cpu_percent"] > self.cpu_threshold:
                history["high_cpu_count"] += 1
            else:
                history["high_cpu_count"] = 0
                
            # Check Memory
            if p["memory_percent"] is not None and p["memory_percent"] > self.mem_threshold:
                history["high_mem_count"] += 1
            else:
                history["high_mem_count"] = 0
                
            is_anomaly = history["high_cpu_count"] >= self.required_samples or history["high_mem_count"] >= self.required_samples
            
            if is_anomaly:
                score = calculate_threat_score(
                    p["cpu_percent"], 
                    p["memory_percent"], 
                    history["high_cpu_count"], 
                    history["high_mem_count"]
                )
                severity = get_severity(score)
                
                # Prevent duplicate alerts for same continuing condition
                if not history["last_alerted"]:
                    events.append({
                        "pid": pid,
                        "name": p["name"],
                        "cpu_percent": p["cpu_percent"],
                        "memory_percent": p["memory_percent"],
                        "score": score,
                        "severity": severity,
                        "description": f"Potential anomaly detected: Sustained high resource usage for {p['name']}."
                    })
                    history["last_alerted"] = True
            else:
                history["last_alerted"] = False
                
        # Cleanup dead processes
        dead_pids = set(self.process_history.keys()) - current_pids
        for pid in dead_pids:
            del self.process_history[pid]
            
        return events
