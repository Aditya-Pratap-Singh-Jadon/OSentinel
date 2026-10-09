from flask import Flask, jsonify
from flask_cors import CORS
from monitor.system_monitor import SystemMonitor
from monitor.process_monitor import ProcessMonitor
from detection.process_detector import ProcessDetector

app = Flask(__name__)
CORS(app) # Allow frontend to access

recent_events = []

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

if __name__ == '__main__':
    app.run(debug=True, port=5000)
