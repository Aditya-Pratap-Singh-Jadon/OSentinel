from unittest.mock import Mock

import pytest

from detection.network_detector import NetworkDetector
from monitor.network_monitor import NetworkMonitor


def connections(count, pid=42, start=0):
    return [dict(pid=pid, name='demo-client', protocol='TCP', family='IPv4',
                 local=f'127.0.0.1:{50000 + index}', remote='127.0.0.1:8765',
                 status='ESTABLISHED') for index in range(start, start + count)]


def test_existing_connections_are_baseline_and_unchanged_sockets_do_not_count():
    detector = NetworkDetector()
    assert detector.analyze_connections(connections(40), now=0) == []
    assert detector.analyze_connections(connections(40), now=2) == []
    assert detector.analyze_connections(connections(69), now=4) == []
    events = detector.analyze_connections(connections(70), now=6)
    assert len(events) == 1
    assert events[0]['connection_count'] == 30
    assert events[0]['remote_endpoints'] == ['127.0.0.1:8765']
    assert events[0]['severity'] == 'HIGH'


def test_window_expires_and_new_burst_rearms_without_duplicate_alerts():
    detector = NetworkDetector()
    detector.analyze_connections([], now=0)
    assert len(detector.analyze_connections(connections(30), now=1)) == 1
    assert detector.analyze_connections(connections(31), now=2) == []
    assert detector.analyze_connections(connections(31), now=12) == []
    assert len(detector.analyze_connections(connections(61), now=13)) == 1


def test_slow_connections_outside_window_do_not_trigger():
    detector = NetworkDetector()
    detector.analyze_connections([], now=0)
    assert detector.analyze_connections(connections(15), now=1) == []
    assert detector.analyze_connections(connections(30), now=11) == []


def test_connections_are_counted_per_process():
    detector = NetworkDetector()
    detector.analyze_connections([], now=0)
    assert detector.analyze_connections(connections(20) + connections(20, pid=43), now=1) == []


@pytest.mark.parametrize('field,value', [('protocol', 'UDP'), ('status', 'LISTEN'), ('status', 'TIME_WAIT'), ('pid', None), ('remote', None)])
def test_non_connection_rows_do_not_trigger(field, value):
    detector = NetworkDetector()
    detector.analyze_connections([], now=0)
    rows = connections(30)
    for row in rows:
        row[field] = value
    assert detector.analyze_connections(rows, now=1) == []


def test_state_transition_and_duplicate_rows_are_not_new_connections():
    detector = NetworkDetector(threshold=2)
    rows = connections(1)
    rows[0]['status'] = 'SYN_SENT'
    detector.analyze_connections(rows, now=0)
    rows[0]['status'] = 'ESTABLISHED'
    assert detector.analyze_connections(rows + rows, now=1) == []


def test_reset_does_not_treat_connections_during_gap_as_new():
    detector = NetworkDetector()
    detector.analyze_connections([], now=0)
    detector.analyze_connections(connections(20), now=1)
    detector.reset()
    assert detector.analyze_connections(connections(50), now=2) == []


def test_monitor_publishes_burst_to_threats_api(monkeypatch):
    monkeypatch.setattr('threading.Thread.start', lambda self: None)
    import app

    detector = NetworkDetector()
    detector.analyze_connections([], now=0)
    events = []
    monitor = NetworkMonitor(detector=detector, events_buffer=events)
    monkeypatch.setattr(monitor, 'collect', lambda: {'connections': connections(30), 'status': 'ok'})
    monkeypatch.setattr('monitor.network_monitor.time.sleep', Mock(side_effect=InterruptedError))
    with pytest.raises(InterruptedError):
        monitor._monitor_loop()
    monkeypatch.setattr(app, 'recent_events', events)
    response = app.app.test_client().get('/api/threats')
    assert response.status_code == 200
    assert response.get_json()[0]['type'] == 'network_burst'
    assert response.get_json()[0]['connection_count'] == 30


def test_monitor_resets_detection_after_collection_failure(monkeypatch):
    monkeypatch.setattr('threading.Thread.start', lambda self: None)
    detector = NetworkDetector()
    detector.analyze_connections([], now=0)
    detector.analyze_connections(connections(20), now=1)
    monitor = NetworkMonitor(detector=detector)
    monkeypatch.setattr(monitor, 'collect', Mock(side_effect=PermissionError))
    monkeypatch.setattr('monitor.network_monitor.time.sleep', Mock(side_effect=InterruptedError))
    with pytest.raises(InterruptedError):
        monitor._monitor_loop()
    assert detector.previous is None
    assert monitor.get_connections()['status'] == 'restricted'
