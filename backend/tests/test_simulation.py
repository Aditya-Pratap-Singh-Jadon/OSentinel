import pytest
from detection.process_detector import ProcessDetector

def test_simulation_tc01():
    detector = ProcessDetector(cpu_threshold=90.0, mem_threshold=80.0, required_samples=3)
    pid = "sim_TC01"
    # CPU at 95% for 1 sample
    events = detector.analyze_processes([{"pid": pid, "name": "test", "cpu_percent": 95.0, "memory_percent": 20.0}], is_simulation=True)
    assert len(events) == 0

def test_simulation_tc02():
    detector = ProcessDetector(cpu_threshold=90.0, mem_threshold=80.0, required_samples=3)
    pid = "sim_TC02"
    # CPU at 95% for 3 samples
    for _ in range(2):
        events = detector.analyze_processes([{"pid": pid, "name": "test", "cpu_percent": 95.0, "memory_percent": 20.0}], is_simulation=True)
        assert len(events) == 0
    events = detector.analyze_processes([{"pid": pid, "name": "test", "cpu_percent": 95.0, "memory_percent": 20.0}], is_simulation=True)
    assert len(events) == 1
    assert events[0]["score"] > 0

def test_simulation_tc03():
    detector = ProcessDetector(cpu_threshold=90.0, mem_threshold=80.0, required_samples=3)
    pid = "sim_TC03"
    # CPU at 99% for 3 samples
    for _ in range(2):
        detector.analyze_processes([{"pid": pid, "name": "test", "cpu_percent": 99.0, "memory_percent": 20.0}], is_simulation=True)
    events = detector.analyze_processes([{"pid": pid, "name": "test", "cpu_percent": 99.0, "memory_percent": 20.0}], is_simulation=True)
    assert len(events) == 1
    
    # Score should be higher than TC02 due to higher CPU
    # 3 samples: consecutive=3 -> 30 + (99-90)*0.5 = 34.5 (TC02: 30 + 5*0.5 = 32.5)
    assert events[0]["score"] == 34

def test_simulation_tc04():
    detector = ProcessDetector(cpu_threshold=90.0, mem_threshold=80.0, required_samples=3)
    pid = "sim_TC04"
    # Memory at 85% for 1 sample
    events = detector.analyze_processes([{"pid": pid, "name": "test", "cpu_percent": 10.0, "memory_percent": 85.0}], is_simulation=True)
    assert len(events) == 0

def test_simulation_tc05():
    detector = ProcessDetector(cpu_threshold=90.0, mem_threshold=80.0, required_samples=3)
    pid = "sim_TC05"
    # Memory at 85% for 3 samples
    for _ in range(2):
        detector.analyze_processes([{"pid": pid, "name": "test", "cpu_percent": 10.0, "memory_percent": 85.0}], is_simulation=True)
    events = detector.analyze_processes([{"pid": pid, "name": "test", "cpu_percent": 10.0, "memory_percent": 85.0}], is_simulation=True)
    assert len(events) == 1

def test_simulation_tc06():
    detector = ProcessDetector(cpu_threshold=90.0, mem_threshold=80.0, required_samples=3)
    pid = "sim_TC06"
    # Memory at 90% for 3 samples
    for _ in range(2):
        detector.analyze_processes([{"pid": pid, "name": "test", "cpu_percent": 10.0, "memory_percent": 90.0}], is_simulation=True)
    events = detector.analyze_processes([{"pid": pid, "name": "test", "cpu_percent": 10.0, "memory_percent": 90.0}], is_simulation=True)
    assert len(events) == 1
    # 3 samples: consecutive=3 -> 30 + (90-80)*0.5 = 35
    assert events[0]["score"] == 35

def test_baseline_resets():
    detector = ProcessDetector(cpu_threshold=90.0, mem_threshold=80.0, required_samples=3)
    pid = "sim_TC_reset"
    # 2 high samples
    for _ in range(2):
        detector.analyze_processes([{"pid": pid, "name": "test", "cpu_percent": 95.0, "memory_percent": 20.0}], is_simulation=True)
    
    # 1 normal sample (should reset)
    detector.analyze_processes([{"pid": pid, "name": "test", "cpu_percent": 10.0, "memory_percent": 20.0}], is_simulation=True)
    
    # 1 more high sample (should not trigger, total is 1 now)
    events = detector.analyze_processes([{"pid": pid, "name": "test", "cpu_percent": 95.0, "memory_percent": 20.0}], is_simulation=True)
    assert len(events) == 0
