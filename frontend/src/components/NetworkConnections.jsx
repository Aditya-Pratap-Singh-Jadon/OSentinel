import { useEffect, useState } from 'react';
import { fetchConnections } from '../services/api';
import './NetworkConnections.css';

export default function NetworkConnections() {
    const [snapshot, setSnapshot] = useState(null);
    const [error, setError] = useState(null);
    const [query, setQuery] = useState('');
    const [state, setState] = useState('all');
    const [protocol, setProtocol] = useState('all');

    // Poll only while this view is mounted; abort on exit and never overlap requests.
    useEffect(() => {
        const controller = new AbortController();
        let timer;
        async function refresh() {
            try {
                const data = await fetchConnections(controller.signal);
                if (!controller.signal.aborted) {
                    setSnapshot(data);
                    setError(null);
                }
            } catch {
                if (!controller.signal.aborted) {
                    setError('Could not refresh connections. Retrying; previous data may be out of date.');
                }
            } finally {
                if (!controller.signal.aborted) timer = setTimeout(refresh, 2000);
            }
        }
        refresh();
        return () => {
            controller.abort();
            clearTimeout(timer);
        };
    }, []);

    const search = query.trim().toLowerCase();
    const connections = snapshot?.connections ?? [];
    const filtered = connections.filter(connection =>
        (state === 'all' || connection.status === state) &&
        (protocol === 'all' || connection.protocol === protocol) &&
        [connection.name, connection.pid, connection.local, connection.remote]
            .some(value => String(value ?? '').toLowerCase().includes(search))
    );
    const ready = snapshot?.status === 'ok';

    return (
        <section className="network-connections" aria-label="Network connections">
            <h2>Connections by Process</h2>
            <div className="card">
                <p><strong>Detection rule:</strong> 30 new TCP connections observed for one process within 10 seconds triggers a HIGH alert in Threats. Both incoming and outgoing connections count.</p>
                <p className="network-help">Existing connections at startup are the baseline. Very short connections between samples can be missed. A burst is unusual activity, not proof of malware.</p>
            </div>
            <p className="network-help"><strong>Local:</strong> this process’s end of the connection. <strong>Remote:</strong> the other end. A port identifies an endpoint used by a program.</p>
            <p className="network-help">Example: a client at 127.0.0.1:54321 connects to a server at 127.0.0.1:8765. For the client, local is :54321 and remote is :8765; the server sees them reversed. Both are on your Mac because 127.0.0.1 means this computer.</p>
            <p className="network-help">See which programs own sockets. LISTEN means waiting for connections; ESTABLISHED means connected. UDP has no TCP connection state.</p>
            {error && <p role="alert" className="card">{error}</p>}
            {snapshot?.message && <p role="status" className="card">{snapshot.message}</p>}
            {!snapshot && !error && <p role="status">Loading connections...</p>}
            {snapshot?.status === 'loading' && <p role="status">Collecting the first connection sample...</p>}
            <div className="network-filters">
                <label>Search process, PID or address
                    <input value={query} onChange={event => setQuery(event.target.value)} placeholder="e.g. Python or 8000" />
                </label>
                <label>Protocol
                    <select value={protocol} onChange={event => setProtocol(event.target.value)}>
                        <option value="all">All protocols</option><option>TCP</option><option>UDP</option>
                    </select>
                </label>
                <label>Connection state
                    <select value={state} onChange={event => setState(event.target.value)}>
                        <option value="all">All states</option><option value="LISTEN">Listening</option><option value="ESTABLISHED">Established</option>
                    </select>
                </label>
            </div>
            {ready && <>
                <p className="network-help">Showing {filtered.length} of {connections.length} sockets · Collected {new Date(snapshot.timestamp * 1000).toLocaleTimeString()}</p>
                <div className="table-container">
                    <table>
                        <thead><tr><th>Process</th><th>PID</th><th>Protocol</th><th>Local address</th><th>Remote address</th><th>State</th></tr></thead>
                        <tbody>
                            {filtered.map((connection, index) => (
                                <tr key={`${connection.pid}-${connection.protocol}-${connection.local}-${connection.remote}-${index}`}>
                                    <td>{connection.name}</td><td>{connection.pid ?? 'Unknown'}</td>
                                    <td>{connection.protocol} / {connection.family}</td>
                                    <td>{connection.local ?? '—'}</td><td>{connection.remote ?? '—'}</td>
                                    <td>{connection.protocol === 'UDP' ? 'Not applicable' : connection.status}</td>
                                </tr>
                            ))}
                            {filtered.length === 0 && <tr><td colSpan="6">{connections.length ? 'No connections match these filters.' : 'No visible connections in this sample.'}</td></tr>}
                        </tbody>
                    </table>
                </div>
            </>}
        </section>
    );
}
