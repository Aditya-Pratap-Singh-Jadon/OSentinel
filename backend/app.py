from flask import Flask, jsonify
from flask_cors import CORS
from monitor.system_monitor import SystemMonitor
from monitor.process_monitor import ProcessMonitor
from detection.process_detector import ProcessDetector

app = Flask(__name__)
CORS(app) # Allow frontend to access

recent_events = []
simulation_events = []

sys_monitor = SystemMonitor()
detector = ProcessDetector(cpu_threshold=90.0, mem_threshold=80.0, required_samples=3)
# Inject detector and event buffer into ProcessMonitor so it can run detection in the background
proc_monitor = ProcessMonitor(detector=detector, events_buffer=recent_events)

@app.route('/api/system', methods=['GET'])
def get_system():
    stats = sys_monitor.get_system_stats()
    return jsonify(stats)

@app.route('/api/processes', methods=['GET'])
def get_processes():
    processes = proc_monitor.get_processes()
    return jsonify(processes)

@app.route('/api/threats', methods=['GET'])
def get_threats():
    return jsonify(recent_events)

@app.route('/api/simulation/run', methods=['POST'])
def run_simulation():
    from flask import request
    data = request.json or {}
    test_id = data.get("test_id", "TC-01")
    
    # Base normal sample
    normal_sample = {"cpu_percent": 10.0, "memory_percent": 20.0}
    
    scenarios = {
        "TC-01": {"samples": [{"cpu_percent": 95.0, "memory_percent": 20.0}], "consecutive": 1, "desc": "CPU 95% for 1 sample"},
        "TC-02": {"samples": [{"cpu_percent": 95.0, "memory_percent": 20.0}], "consecutive": 3, "desc": "CPU 95% for 3 samples"},
        "TC-03": {"samples": [{"cpu_percent": 99.0, "memory_percent": 20.0}], "consecutive": 3, "desc": "CPU 99% for 3 samples"},
        "TC-04": {"samples": [{"cpu_percent": 10.0, "memory_percent": 85.0}], "consecutive": 1, "desc": "Memory 85% for 1 sample"},
        "TC-05": {"samples": [{"cpu_percent": 10.0, "memory_percent": 85.0}], "consecutive": 3, "desc": "Memory 85% for 3 samples"},
        "TC-06": {"samples": [{"cpu_percent": 10.0, "memory_percent": 90.0}], "consecutive": 3, "desc": "Memory 90% for 3 samples"},
    }
    
    scenario = scenarios.get(test_id)
    if not scenario:
        return jsonify({"error": "Unknown test ID"}), 400
        
    pid = f"sim_{test_id}_{int(__import__('time').time())}"
    p_name = f"SIM-TEST: {scenario['desc']}"
    
    # 1 normal sample before
    proc_monitor.inject_process({"pid": pid, "name": p_name, **normal_sample, "is_simulated": True, "status": "running", "memory_usage": 1024*1024*10})
    __import__('time').sleep(2.2)
    
    # Test samples
    for _ in range(scenario["consecutive"]):
        for s in scenario["samples"]:
            proc_monitor.inject_process({"pid": pid, "name": p_name, **s, "is_simulated": True, "status": "running", "memory_usage": 1024*1024*100})
            __import__('time').sleep(2.1)
            
    # 1 normal sample after (resets counters)
    proc_monitor.inject_process({"pid": pid, "name": p_name, **normal_sample, "is_simulated": True, "status": "running", "memory_usage": 1024*1024*10})
    __import__('time').sleep(2.2)
    
    # Remove the simulated process entirely to clean up
    proc_monitor.remove_injected_process(pid)
    
    triggered_events = [e for e in recent_events if e["pid"] == pid]
    
    result = {
        "test_id": test_id,
        "description": scenario["desc"],
        "cpu_simulated": scenario["samples"][0]["cpu_percent"],
        "mem_simulated": scenario["samples"][0]["memory_percent"],
        "samples_run": scenario["consecutive"],
        "detected": len(triggered_events) > 0,
        "events": triggered_events
    }
    
    simulation_events.append(result)
    return jsonify(result)

@app.route('/api/simulation/results', methods=['GET'])
def get_simulation_results():
    return jsonify(simulation_events)

@app.route('/api/simulation/clear', methods=['POST'])
def clear_simulation():
    simulation_events.clear()
    return jsonify({"status": "cleared"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
