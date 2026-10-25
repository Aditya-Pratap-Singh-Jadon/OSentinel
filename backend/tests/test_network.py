import socket
from types import SimpleNamespace
from unittest.mock import Mock

import psutil
import pytest

from monitor.network_monitor import NetworkMonitor


def make_monitor(monkeypatch):
    monkeypatch.setattr('monitor.network_monitor.threading.Thread.start', lambda self: None)
    return NetworkMonitor()


def test_connection_addresses_protocols_and_missing_owner(monkeypatch):
    monitor = make_monitor(monkeypatch)
    address = lambda ip, port: SimpleNamespace(ip=ip, port=port)
    rows = [
        SimpleNamespace(pid=123, type=socket.SOCK_STREAM, family=socket.AF_INET,
                        laddr=address('127.0.0.1', 8000), raddr=(), status='LISTEN'),
        SimpleNamespace(pid=None, type=socket.SOCK_DGRAM, family=socket.AF_INET6,
                        laddr=address('::', 5353), raddr=(), status='NONE'),
    ]
    monkeypatch.setattr(psutil, 'net_connections', Mock(return_value=rows))
    monkeypatch.setattr(psutil, 'Process', Mock(return_value=SimpleNamespace(name=lambda: 'Python')))
    snapshot = monitor.collect()
    assert snapshot['status'] == 'ok'
    assert snapshot['connections'][0] == {
        'pid': 123, 'name': 'Python', 'protocol': 'TCP', 'family': 'IPv4',
        'local': '127.0.0.1:8000', 'remote': None, 'status': 'LISTEN',
    }
    assert snapshot['connections'][1]['local'] == '[::]:5353'
    assert snapshot['connections'][1]['name'] == 'Unknown'
    assert snapshot['connections'][1]['protocol'] == 'UDP'
    psutil.net_connections.assert_called_once_with(kind='inet')


def test_exited_process_does_not_drop_socket(monkeypatch):
    monitor = make_monitor(monkeypatch)
    row = SimpleNamespace(pid=123, type=socket.SOCK_STREAM, family=socket.AF_INET,
                          laddr=SimpleNamespace(ip='127.0.0.1', port=8000),
                          raddr=SimpleNamespace(ip='127.0.0.1', port=54321), status='ESTABLISHED')
    monkeypatch.setattr(psutil, 'net_connections', lambda **kwargs: [row])
    monkeypatch.setattr(psutil, 'Process', Mock(side_effect=psutil.NoSuchProcess(123)))
    result = monitor.collect()['connections'][0]
    assert result['name'] == 'Unknown'
    assert result['remote'] == '127.0.0.1:54321'


@pytest.mark.parametrize('failure,status', [(psutil.AccessDenied(), 'restricted'), (RuntimeError('failed'), 'error')])
def test_collection_failure_replaces_stale_snapshot(monkeypatch, failure, status):
    monitor = make_monitor(monkeypatch)
    monitor.snapshot = {'connections': [{'pid': 123}], 'status': 'ok'}
    monkeypatch.setattr(monitor, 'collect', Mock(side_effect=failure))
    # Stop after one published sample, without starting or waiting for a thread.
    monkeypatch.setattr('monitor.network_monitor.time.sleep', Mock(side_effect=InterruptedError))
    with pytest.raises(InterruptedError):
        monitor._monitor_loop()
    snapshot = monitor.get_connections()
    assert snapshot['status'] == status
    assert snapshot['connections'] == []
    assert snapshot['message']


@pytest.mark.parametrize('status', ['ok', 'restricted', 'error'])
def test_connections_api_returns_monitor_snapshot(monkeypatch, status):
    monkeypatch.setattr('threading.Thread.start', lambda self: None)
    import app

    snapshot = {'connections': [], 'status': status, 'message': None, 'timestamp': 123.0}
    monkeypatch.setattr(app.network_monitor, 'get_connections', lambda: snapshot)
    response = app.app.test_client().get('/api/connections')
    assert response.status_code == 200
    assert response.get_json() == snapshot
