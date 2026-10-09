import pytest
from detection.threat_score import calculate_threat_score, get_severity
from detection.process_detector import ProcessDetector

def test_threat_score_calculation():
    score = calculate_threat_score(cpu_percent=95.0, memory_percent=10.0, consecutive_high_cpu=3, consecutive_high_memory=0)
    assert score > 0
    assert score <= 100
    
    score_critical = calculate_threat_score(cpu_percent=99.0, memory_percent=90.0, consecutive_high_cpu=5, consecutive_high_memory=5)
    assert score_critical > 80
    
def test_severity_levels():
    assert get_severity(10) == "LOW"
    assert get_severity(45) == "MEDIUM"
    assert get_severity(75) == "HIGH"
    assert get_severity(90) == "CRITICAL"
    
def test_process_detector_high_cpu():
    detector = ProcessDetector(cpu_threshold=90.0, mem_threshold=80.0, required_samples=3)
    
    p = {"pid": 1234, "name": "malware.exe", "cpu_percent": 95.0, "memory_percent": 10.0}
    
    # Sample 1
    events = detector.analyze_processes([p])
    assert len(events) == 0
    
    # Sample 2
    events = detector.analyze_processes([p])
    assert len(events) == 0
    
    # Sample 3 - Triggers alert
    events = detector.analyze_processes([p])
    assert len(events) == 1
    assert events[0]["pid"] == 1234
    assert events[0]["severity"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    
    # Sample 4 - No duplicate alert
    events = detector.analyze_processes([p])
    assert len(events) == 0
    
    # Sample 5 - Normal
    p["cpu_percent"] = 10.0
    events = detector.analyze_processes([p])
    assert len(events) == 0
