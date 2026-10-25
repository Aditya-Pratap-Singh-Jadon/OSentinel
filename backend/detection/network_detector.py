from collections import defaultdict, deque
import time

from .threat_score import get_severity


class NetworkDetector:
    def __init__(self, threshold=30, window_seconds=10):
        self.threshold = threshold
        self.window_seconds = window_seconds
        self.reset()

    def reset(self):
        """Start a fresh baseline after startup or a collection gap."""
        self.previous = None
        self.observations = {}
        self.alerted = set()

    def analyze_connections(self, connections, now=None):
        """Count newly observed TCP endpoints per PID in a rolling monotonic-time window.

        The first snapshot is a baseline. Endpoint identity ignores TCP state changes;
        incoming and outgoing sockets both count, but listening/cleanup sockets do not.
        """
        now = time.monotonic() if now is None else now
        current = defaultdict(set)
        names = {}
        for row in connections:
            pid = row['pid']
            if pid is None or row['protocol'] != 'TCP' or not row['remote']:
                continue
            if row['status'] not in ('SYN_SENT', 'SYN_RECV', 'ESTABLISHED'):
                continue
            current[pid].add((row['family'], row['local'], row['remote']))
            names[pid] = row['name']
        if self.previous is None:
            self.previous = current
            return []

        events = []
        for pid in set(current) | set(self.observations):
            history = self.observations.setdefault(pid, deque())
            while history and history[0][0] <= now - self.window_seconds:
                history.popleft()
            for endpoint in current.get(pid, set()) - self.previous.get(pid, set()):
                history.append((now, endpoint))
            count = len(history)
            if count >= self.threshold and pid not in self.alerted:
                score = 65  # Fixed HIGH severity for this explainable threshold rule.
                destinations = sorted({endpoint[2] for _, endpoint in history})
                events.append({
                    'type': 'network_burst', 'pid': pid, 'name': names.get(pid, 'Unknown'),
                    'score': score, 'severity': get_severity(score), 'is_simulated': False,
                    'timestamp': time.time(), 'connection_count': count,
                    'window_seconds': self.window_seconds, 'threshold': self.threshold,
                    'remote_endpoints': destinations[:10],
                    'description': f"Network connection burst: {count} new TCP connections observed for {names.get(pid, 'Unknown')} in {self.window_seconds}s (threshold: {self.threshold}).",
                })
                self.alerted.add(pid)
            elif count < self.threshold:
                self.alerted.discard(pid)
            if not history:
                del self.observations[pid]
        self.previous = current
        return events
