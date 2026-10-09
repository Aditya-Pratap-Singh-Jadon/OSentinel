import React, { useState, useEffect } from 'react';
import { AlertTriangle, Play, CheckCircle, XCircle, Trash2, ShieldAlert } from 'lucide-react';

const TESTS = [
    { id: 'TC-01', name: 'CPU Spike (1 sample)', expected: false },
    { id: 'TC-02', name: 'Sustained CPU 95% (3 samples)', expected: true },
    { id: 'TC-03', name: 'Sustained CPU 99% (3 samples)', expected: true },
    { id: 'TC-04', name: 'Memory Spike (1 sample)', expected: false },
    { id: 'TC-05', name: 'Sustained Memory 85% (3 samples)', expected: true },
    { id: 'TC-06', name: 'Sustained Memory 90% (3 samples)', expected: true },
];

const DetectionLab = () => {
    const [results, setResults] = useState([]);
    const [running, setRunning] = useState(false);
    const [runningId, setRunningId] = useState(null);

    const fetchResults = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/simulation/results');
            const data = await res.json();
            setResults(data);
        } catch (e) {
            console.error('Failed to fetch results', e);
        }
    };

    useEffect(() => {
        fetchResults();
    }, []);

    const runTest = async (testId) => {
        setRunningId(testId);
        try {
            await fetch('http://localhost:5000/api/simulation/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ test_id: testId })
            });
            await fetchResults();
        } catch (e) {
            console.error('Failed to run test', e);
        } finally {
            setRunningId(null);
        }
    };

    const runAllTests = async () => {
        setRunning(true);
        for (const test of TESTS) {
            await runTest(test.id);
        }
        setRunning(false);
    };

    const clearResults = async () => {
        try {
            await fetch('http://localhost:5000/api/simulation/clear', { method: 'POST' });
            setResults([]);
        } catch (e) {
            console.error('Failed to clear results', e);
        }
    };

    // Calculate Summary
    const totalTests = results.length;
    let passed = 0;
    let failed = 0;
    let anomalies = 0;
    
    results.forEach(r => {
        const expected = TESTS.find(t => t.id === r.test_id)?.expected;
        if (r.detected === expected) {
            passed++;
        } else {
            failed++;
        }
        if (r.detected) anomalies++;
    });

    return (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ShieldAlert size={24} color="var(--accent-primary)" />
                        Threat Simulation Lab
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        Safely validate the detection engine by sending synthetic resource spikes through the live scoring pipeline.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button 
                        onClick={clearResults} 
                        className="btn-secondary" 
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}
                    >
                        <Trash2 size={16} /> Clear Simulation Results
                    </button>
                    <button 
                        onClick={runAllTests} 
                        disabled={running}
                        className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', backgroundColor: 'var(--accent-primary)', color: 'white', cursor: running ? 'not-allowed' : 'pointer', opacity: running ? 0.7 : 1 }}
                    >
                        <Play size={16} /> {running ? 'Running...' : 'Run All Tests'}
                    </button>
                </div>
            </div>

            <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '2rem' }}>
                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{totalTests}</div>
                    <div style={{ color: 'var(--text-secondary)' }}>Total Runs</div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>{passed}</div>
                    <div style={{ color: 'var(--text-secondary)' }}>Passed</div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--danger)' }}>{failed}</div>
                    <div style={{ color: 'var(--text-secondary)' }}>Failed</div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--warning)' }}>{anomalies}</div>
                    <div style={{ color: 'var(--text-secondary)' }}>Anomalies Detected</div>
                </div>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Test Case</th>
                            <th>Description</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {TESTS.map(test => (
                            <tr key={test.id}>
                                <td style={{ fontWeight: 600 }}>{test.id}</td>
                                <td>{test.name}</td>
                                <td>
                                    <button 
                                        onClick={() => runTest(test.id)}
                                        disabled={running || runningId === test.id}
                                        style={{ padding: '0.3rem 0.8rem', borderRadius: '4px', border: '1px solid var(--accent-primary)', backgroundColor: 'transparent', color: 'var(--accent-primary)', cursor: (running || runningId === test.id) ? 'not-allowed' : 'pointer' }}
                                    >
                                        {runningId === test.id ? 'Running...' : 'Run'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {results.length > 0 && (
                <>
                    <h3 style={{ marginTop: '2rem', marginBottom: '1rem', fontSize: '1.2rem' }}>Simulation Results</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {[...results].reverse().map((res, i) => {
                            const expected = TESTS.find(t => t.id === res.test_id)?.expected;
                            const pass = res.detected === expected;
                            return (
                                <div key={i} className="card" style={{ borderLeft: `4px solid ${pass ? 'var(--success)' : 'var(--danger)'}`, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {pass ? <CheckCircle color="var(--success)" size={20} /> : <XCircle color="var(--danger)" size={20} />}
                                            <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{res.test_id} - {res.description}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                                                Expected: {expected ? 'Detected' : 'Not Detected'}
                                            </span>
                                            <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: res.detected ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: res.detected ? 'var(--danger)' : 'var(--success)' }}>
                                                Actual: {res.detected ? 'Detected' : 'Not Detected'}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                        Simulated CPU: <strong>{res.cpu_simulated}%</strong> | Memory: <strong>{res.mem_simulated}%</strong> | Samples: <strong>{res.samples_run}</strong>
                                    </div>
                                    
                                    {res.events && res.events.length > 0 && (
                                        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                            <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Threats Triggered (SIMULATED):</div>
                                            {res.events.map((e, ei) => (
                                                <div key={ei} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '1rem', fontSize: '0.9rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                                                    <div>Score: <span style={{ fontWeight: 'bold' }}>{e.score}/100</span></div>
                                                    <div>Severity: <span className={`badge ${e.severity.toLowerCase()}`}>{e.severity}</span></div>
                                                    <div style={{ color: 'var(--text-secondary)' }}>{e.description}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: pass ? 'var(--success)' : 'var(--danger)' }}>
                                        {pass ? 'Explanation: Detector behaved as expected.' : 'Explanation: Detector failed to match expected behavior.'}
                                        {!expected && res.detected && ' Triggered incorrectly on single sample or below threshold.'}
                                        {expected && !res.detected && ' Failed to trigger on sustained threshold breach.'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

export default DetectionLab;
