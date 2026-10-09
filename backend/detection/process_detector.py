from .threat_score import calculate_threat_score, get_severity

class ProcessDetector:
    def __init__(self, cpu_threshold=90.0, mem_threshold=80.0, required_samples=3):
        self.cpu_threshold = cpu_threshold
        self.mem_threshold = mem_threshold
        self.required_samples = required_samples
        
        # Track historical data: pid -> {"high_cpu_count": 0, "high_mem_count": 0, "last_alerted": False}
        self.process_history = {}
        self.simulation_history = {}
        
    def analyze_processes(self, processes, total_system_memory=None, is_simulation=False):
        events = []
        current_pids = set()
        
        history_dict = self.simulation_history if is_simulation else self.process_history
        
        for p in processes:
            pid = p["pid"]
            current_pids.add(pid)
            
            if pid not in history_dict:
                history_dict[pid] = {
                    "high_cpu_count": 0, 
                    "high_mem_count": 0,
                    "last_alerted": False
                }
                
            history = history_dict[pid]
            
            # Check CPU
            if p.get("cpu_percent") is not None and p["cpu_percent"] > self.cpu_threshold:
                history["high_cpu_count"] += 1
            else:
                history["high_cpu_count"] = 0
                
            # Check Memory
            if p.get("memory_percent") is not None and p["memory_percent"] > self.mem_threshold:
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
                        "description": f"Potential anomaly detected: Sustained high resource usage for {p['name']}.",
                        "is_simulated": p.get("is_simulated", False) or is_simulation
                    })
                    history["last_alerted"] = True
            else:
                history["last_alerted"] = False
                
        # Cleanup dead processes
        dead_pids = set(history_dict.keys()) - current_pids
        for pid in dead_pids:
            del history_dict[pid]
            
        return events
