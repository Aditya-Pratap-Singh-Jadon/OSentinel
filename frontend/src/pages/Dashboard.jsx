import React, { useState, useMemo, useEffect } from 'react';
import { useMonitoringData } from '../hooks/useMonitoringData';
import { Activity, Cpu, HardDrive, Network, AlertTriangle, Search, X, Activity as ActivityIcon, ShieldAlert } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DetectionLab from '../components/DetectionLab';

const formatBytes = (bytes) => {
    if (bytes === 0 || bytes === undefined || isNaN(bytes)) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const ProcessModal = ({ process, onClose, threat }) => {
    if (!process) return null;
    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="card" style={{ width: '500px', maxWidth: '90%', position: 'relative' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X /></button>
                <h2 className="title" style={{ marginBottom: '1.5rem', fontSize: '1.4rem' }}>Process Details</h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Name</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>
                            {process.name}
                            {process.is_simulated && <span className="badge" style={{marginLeft: '0.5rem', fontSize: '0.7rem', padding: '0.1rem 0.3rem', backgroundColor: 'var(--warning)', color: '#000', verticalAlign: 'middle'}}>TEST</span>}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>PID</div>
                        <div style={{ fontSize: '1.1rem' }}>{process.pid}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status</div>
                        <div style={{ fontSize: '1.1rem', textTransform: 'capitalize' }}>{process.status}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>User</div>
                        <div style={{ fontSize: '1.1rem' }}>{process.username || 'N/A'}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>CPU Usage</div>
                        <div style={{ fontSize: '1.1rem' }}>{process.cpu_percent?.toFixed(2) || '0.00'}%</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Memory Usage</div>
                        <div style={{ fontSize: '1.1rem' }}>{process.memory_percent?.toFixed(2) || '0.00'}% ({formatBytes(process.memory_usage)})</div>
                    </div>
                </div>

                {threat && (
                    <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '8px', marginTop: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', marginBottom: '0.5rem', fontWeight: 600 }}>
                            <AlertTriangle size={18} /> Threat Detected
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.5rem' }}>
                            <div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Severity</div>
                                <div><span className={`badge ${threat.severity.toLowerCase()}`}>{threat.severity}</span></div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Score</div>
                                <div>{threat.score}/100</div>
                            </div>
                        </div>
                        <div style={{ fontSize: '0.9rem' }}>{threat.description}</div>
                    </div>
                )}
            </div>
        </div>
    );
};

const Dashboard = () => {
    const { systemStats, processes, threats, loading, error, lastUpdated } = useMonitoringData(2000);
    const [view, setView] = useState('overview'); // overview, processes, threats, network, lab
    const [history, setHistory] = useState([]);
    
    // Process Table State
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'cpu_percent', direction: 'desc' });
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedProcess, setSelectedProcess] = useState(null);

    // Threat Table State
    const [threatSearchQuery, setThreatSearchQuery] = useState('');
    const [severityFilter, setSeverityFilter] = useState('all');

    // Update history for charts
    useEffect(() => {
        if (systemStats) {
            setHistory(prev => {
                const now = new Date();
                const newPoint = {
                    time: `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`,
                    cpu: systemStats.cpu_percent || 0,
                    ram: systemStats.memory?.percent || 0
                };
                const newHistory = [...prev, newPoint];
                if (newHistory.length > 60) newHistory.shift();
                return newHistory;
            });
        }
    }, [systemStats]);

    const sortedAndFilteredProcesses = useMemo(() => {
        let filtered = processes;
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            filtered = processes.filter(p => 
                p.name.toLowerCase().includes(lowerQuery) || 
                p.pid.toString().includes(lowerQuery)
            );
        }
        
        if (statusFilter !== 'all') {
            filtered = filtered.filter(p => p.status === statusFilter);
        }
        
        filtered.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
        
        return filtered;
    }, [processes, searchQuery, sortConfig, statusFilter]);

    const filteredThreats = useMemo(() => {
        let filtered = threats;
        if (threatSearchQuery) {
            const lowerQuery = threatSearchQuery.toLowerCase();
            filtered = filtered.filter(t => 
                t.name.toLowerCase().includes(lowerQuery) || 
                t.pid.toString().includes(lowerQuery)
            );
        }
        if (severityFilter !== 'all') {
            filtered = filtered.filter(t => t.severity === severityFilter);
        }
        return filtered;
    }, [threats, threatSearchQuery, severityFilter]);

    const handleSort = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    if (loading && !systemStats) {
        return (
            <div className="dashboard-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
                <div className="title">Initializing OSentinel...</div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <div className="header">
                <div>
                    <h1 className="title">OSentinel</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Host-based Security Monitoring</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: error ? 'var(--danger)' : 'var(--success)', boxShadow: `0 0 8px ${error ? 'var(--danger)' : 'var(--success)'}` }}></div>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            {error ? 'Connection Lost' : 'System Active'}
                        </span>
                    </div>
                    {lastUpdated && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Updated: {lastUpdated.toLocaleTimeString()}
                        </span>
                    )}
                </div>
            </div>

            {error && !systemStats && (
                <div className="card" style={{ textAlign: 'center', borderColor: 'var(--danger)', marginBottom: '2rem' }}>
                    <AlertTriangle size={48} color="var(--danger)" style={{ marginBottom: '1rem', display: 'inline-block' }} />
                    <h2 className="title" style={{ color: 'var(--danger)', margin: '0 auto' }}>Connection Error</h2>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{error}</p>
                </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <button className={`nav-btn ${view === 'overview' ? 'active' : ''}`} onClick={() => setView('overview')}>Overview</button>
                <button className={`nav-btn ${view === 'processes' ? 'active' : ''}`} onClick={() => setView('processes')}>Processes ({processes.length})</button>
                <button className={`nav-btn ${view === 'threats' ? 'active' : ''}`} onClick={() => setView('threats')}>Threats ({threats.length})</button>
                <button className={`nav-btn ${view === 'network' ? 'active' : ''}`} onClick={() => setView('network')}>Network</button>
                <button className={`nav-btn ${view === 'lab' ? 'active' : ''}`} onClick={() => setView('lab')} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)' }}>
                    <ShieldAlert size={16} /> Detection Lab
                </button>
            </div>

            {view === 'overview' && (
                <>
                    <div className="grid">
                        <div className="card">
                            <div className="card-title"><Cpu size={18} /> CPU Utilization</div>
                            <div className="metric-value">{systemStats?.cpu_percent?.toFixed(1) || '0.0'}%</div>
                        </div>
                        <div className="card">
                            <div className="card-title"><Activity size={18} /> Memory Usage</div>
                            <div className="metric-value">{systemStats?.memory?.percent?.toFixed(1) || '0.0'}%</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                {formatBytes(systemStats?.memory?.used)} / {formatBytes(systemStats?.memory?.total)}
                            </div>
                        </div>
                        <div className="card">
                            <div className="card-title"><HardDrive size={18} /> Disk Utilization</div>
                            <div className="metric-value">{systemStats?.disk?.percent?.toFixed(1) || '0.0'}%</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                {formatBytes(systemStats?.disk?.used)} / {formatBytes(systemStats?.disk?.total)}
                            </div>
                        </div>
                        <div className="card">
                            <div className="card-title"><Network size={18} /> Network Traffic</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Upload</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{formatBytes(systemStats?.network?.upload_rate)}/s</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Download</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{formatBytes(systemStats?.network?.download_rate)}/s</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                        <div className="card">
                            <div className="card-title"><ActivityIcon size={18} /> CPU History</div>
                            <div style={{ height: '200px', width: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={history}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                        <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize={12} tick={{fill: 'var(--text-secondary)'}} />
                                        <YAxis domain={[0, 100]} stroke="var(--text-secondary)" fontSize={12} tick={{fill: 'var(--text-secondary)'}} />
                                        <Tooltip contentStyle={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                                        <Line type="monotone" dataKey="cpu" stroke="var(--accent-primary)" strokeWidth={2} dot={false} isAnimationActive={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="card">
                            <div className="card-title"><ActivityIcon size={18} /> Memory History</div>
                            <div style={{ height: '200px', width: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={history}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                        <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize={12} tick={{fill: 'var(--text-secondary)'}} />
                                        <YAxis domain={[0, 100]} stroke="var(--text-secondary)" fontSize={12} tick={{fill: 'var(--text-secondary)'}} />
                                        <Tooltip contentStyle={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                                        <Line type="monotone" dataKey="ram" stroke="var(--success)" strokeWidth={2} dot={false} isAnimationActive={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {threats.length > 0 && (
                        <>
                            <h2 style={{ marginTop: '2rem', marginBottom: '1rem', fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <AlertTriangle size={20} color="var(--warning)" /> Recent Threat Events
                            </h2>
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Process</th>
                                            <th>PID</th>
                                            <th>Threat Score</th>
                                            <th>Severity</th>
                                            <th>Description</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {threats.slice(0, 5).map((threat, idx) => (
                                            <tr key={`${threat.pid}-${idx}`} onClick={() => setSelectedProcess(processes.find(p => p.pid === threat.pid) || {name: threat.name, pid: threat.pid})} style={{ cursor: 'pointer' }}>
                                                <td style={{ fontWeight: 500 }}>
                                                    {threat.name}
                                                    {threat.is_simulated && <span className="badge" style={{marginLeft: '0.5rem', fontSize: '0.7rem', padding: '0.1rem 0.3rem', backgroundColor: 'var(--warning)', color: '#000'}}>TEST</span>}
                                                </td>
                                                <td style={{ color: 'var(--text-secondary)' }}>{threat.pid}</td>
                                                <td>{threat.score}/100</td>
                                                <td>
                                                    <span className={`badge ${threat.severity.toLowerCase()}`}>
                                                        {threat.severity}
                                                    </span>
                                                </td>
                                                <td style={{ color: 'var(--text-secondary)' }}>{threat.description}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </>
            )}

            {view === 'processes' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Active Processes</h2>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <select 
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                            >
                                <option value="all">All Statuses</option>
                                <option value="running">Running</option>
                                <option value="sleeping">Sleeping</option>
                                <option value="stopped">Stopped</option>
                            </select>
                            <div style={{ position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input 
                                    type="text" 
                                    placeholder="Search by name or PID..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{ padding: '0.5rem 1rem 0.5rem 2.2rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>Process Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                    <th onClick={() => handleSort('pid')} style={{ cursor: 'pointer' }}>PID {sortConfig.key === 'pid' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                    <th onClick={() => handleSort('cpu_percent')} style={{ cursor: 'pointer' }}>CPU % {sortConfig.key === 'cpu_percent' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                    <th onClick={() => handleSort('memory_percent')} style={{ cursor: 'pointer' }}>Memory % {sortConfig.key === 'memory_percent' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                    <th onClick={() => handleSort('memory_usage')} style={{ cursor: 'pointer' }}>Memory (RSS) {sortConfig.key === 'memory_usage' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                    <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedAndFilteredProcesses.slice(0, 100).map(proc => (
                                    <tr key={proc.pid} onClick={() => setSelectedProcess(proc)} style={{ cursor: 'pointer' }}>
                                        <td style={{ fontWeight: 500 }}>
                                            {proc.name}
                                            {proc.is_simulated && <span className="badge" style={{marginLeft: '0.5rem', fontSize: '0.7rem', padding: '0.1rem 0.3rem', backgroundColor: 'var(--warning)', color: '#000'}}>TEST</span>}
                                        </td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{proc.pid}</td>
                                        <td>{proc.cpu_percent?.toFixed(2) || '0.00'}%</td>
                                        <td>{proc.memory_percent?.toFixed(2) || '0.00'}%</td>
                                        <td>{formatBytes(proc.memory_usage)}</td>
                                        <td>
                                            <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                                                {proc.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {sortedAndFilteredProcesses.length === 0 && (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                                            No processes found matching your criteria.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textAlign: 'right' }}>Showing top 100 results. Process CPU usage is normalized relative to total system capacity.</div>
                </>
            )}

            {view === 'threats' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Threat History</h2>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <select 
                                value={severityFilter}
                                onChange={(e) => setSeverityFilter(e.target.value)}
                                style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                            >
                                <option value="all">All Severities</option>
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                                <option value="CRITICAL">Critical</option>
                            </select>
                            <div style={{ position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input 
                                    type="text" 
                                    placeholder="Search by name or PID..." 
                                    value={threatSearchQuery}
                                    onChange={(e) => setThreatSearchQuery(e.target.value)}
                                    style={{ padding: '0.5rem 1rem 0.5rem 2.2rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                                />
                            </div>
                        </div>
                    </div>
                    {filteredThreats.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                            <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                                <ActivityIcon size={32} color="var(--success)" />
                            </div>
                            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No Threats Found</h3>
                            <p style={{ color: 'var(--text-secondary)' }}>No events match your current filter criteria.</p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>Process</th>
                                        <th>PID</th>
                                        <th>Threat Score</th>
                                        <th>Severity</th>
                                        <th>Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredThreats.map((threat, idx) => (
                                        <tr key={`${threat.pid}-${idx}`} onClick={() => setSelectedProcess(processes.find(p => p.pid === threat.pid) || {name: threat.name, pid: threat.pid, is_simulated: threat.is_simulated})} style={{ cursor: 'pointer' }}>
                                            <td style={{ color: 'var(--text-secondary)' }}>{threat.timestamp ? new Date(threat.timestamp * 1000).toLocaleTimeString() : 'N/A'}</td>
                                            <td style={{ fontWeight: 500 }}>
                                                {threat.name}
                                                {threat.is_simulated && <span className="badge" style={{marginLeft: '0.5rem', fontSize: '0.7rem', padding: '0.1rem 0.3rem', backgroundColor: 'var(--warning)', color: '#000'}}>TEST</span>}
                                            </td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{threat.pid}</td>
                                            <td>{threat.score}/100</td>
                                            <td>
                                                <span className={`badge ${threat.severity.toLowerCase()}`}>
                                                    {threat.severity}
                                                </span>
                                            </td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{threat.description}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {view === 'network' && (
                <>
                    <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem', fontWeight: 600 }}>Network Details</h2>
                    <div className="grid">
                        <div className="card">
                            <div className="card-title">Total Bytes Sent</div>
                            <div className="metric-value">{formatBytes(systemStats?.network?.bytes_sent)}</div>
                        </div>
                        <div className="card">
                            <div className="card-title">Total Bytes Received</div>
                            <div className="metric-value">{formatBytes(systemStats?.network?.bytes_recv)}</div>
                        </div>
                    </div>
                    <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                        <p style={{ color: 'var(--text-secondary)' }}>Active Connections Monitoring is planned for Phase 3.</p>
                    </div>
                </>
            )}

            {view === 'lab' && (
                <DetectionLab />
            )}

            {selectedProcess && (
                <ProcessModal 
                    process={selectedProcess} 
                    threat={threats.find(t => t.pid === selectedProcess.pid)}
                    onClose={() => setSelectedProcess(null)} 
                />
            )}
        </div>
    );
};

export default Dashboard;
