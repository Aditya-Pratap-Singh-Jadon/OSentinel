# OSentinel — OS Threat Detection & Monitoring System

## 1. Project Overview
OSentinel is a host-based security monitoring application designed to observe operating-system activities, identify anomalous resource consumption, and present intelligence through a modern web dashboard. Traditional monitoring tools provide raw system metrics but often lack real-time threat detection. OSentinel bridges this gap by acting as a lightweight, intelligent monitor that scores potential threats locally.

## 2. Objectives
- Collect accurate, real-time metrics (CPU, RAM, Disk, Network) and process data.
- Implement a rule-based anomaly detection engine.
- Calculate explainable threat scores based on sustained suspicious behavior.
- Provide a responsive, beginner-friendly web dashboard for visualization.
- Establish a foundation for future file and network monitoring features.

## 3. Technologies Used
- **Backend (Implemented)**: Python 3, Flask, `psutil` (for OS interactions), `pytest`
- **Frontend (Implemented)**: React, Vite, JavaScript (JSX), Recharts, custom CSS
- **Database (Planned)**: SQLite

## 4. System Architecture
OSentinel uses a decoupled client-server architecture:
1. **Operating System Layer**: The host OS (Windows/Linux) providing raw system metrics.
2. **Monitoring Engine (Python)**: A background daemon thread uses `psutil` to constantly sample hardware resource telemetry and map active process trees without blocking the system.
3. **Detection & Scoring (Python)**: A stateful analysis engine evaluates the telemetry against configured thresholds, tracking historical violations, and assigning a 0-100 severity score.
4. **Flask REST API**: Exposes the cached telemetry and threat events as JSON endpoints.
5. **React Dashboard**: A Single Page Application (SPA) that actively polls the backend and renders dynamic charts, tables, and alerts in real-time.

## 5. Main Features
- **Live System Telemetry (Implemented)**: Background sampling of CPU, RAM, Disk, and total Network IO.
- **Process Mapping (Implemented)**: Real-time process isolation, normalising CPU loads across cores.
- **Stateful Threat Detection (Implemented)**: Evaluates sustained resource abuse (e.g., CPU > 90%, RAM > 80%) across consecutive samples to prevent false positive alerts from temporary spikes.
- **Threat Scoring Engine (Implemented)**: Mathematically scales anomalies to a 0-100 score and assigns categorical severities (LOW, MEDIUM, HIGH, CRITICAL).
- **React Dashboard (Implemented)**: A non-blocking UI featuring live Recharts graphing, sortable tables, and interactive process inspection modals.
- **Event History (Partially Implemented)**: Currently held in a temporary memory buffer.
- **Network Burst Detection (Implemented)**: HIGH alert when at least 30 new TCP connections are observed for one PID in a rolling 10-second window. Startup connections form a baseline; continuing bursts are deduplicated.
- **Network Connections (Implemented)**: Live TCP/UDP sockets with owning process, PID, local/remote addresses, state, and search/filter controls.
- **File System Monitoring (Planned)**: File integrity monitoring is scoped for future updates.

## 6. How It Works
1. **Collection**: Every 2 seconds, the Python backend silently queries the Operating System for its resource consumption and active process list. 
2. **Analysis**: The detection engine looks for processes that are consistently abusing resources (e.g., maxing out the CPU over multiple cycles). 
3. **Scoring**: If a process is deemed anomalous, it receives a threat score and is pushed to an event buffer.
4. **Display**: The React frontend recursively asks the Flask API for the latest data, instantly rendering any new charts, process states, or threat alerts to the user.

## 7. Current Implementation Status
OSentinel is currently at an estimated 40-50% completion, successfully finishing Phase 1 and Phase 2 of its roadmap:
- **System & Process Monitoring**: Complete and functional.
- **Threat Detection & Scoring**: Complete and verified via automated tests.
- **Flask API & React UI**: Complete and visually polished.
- **Database Persistence**: Not implemented (Events clear on server restart).
- **Network Connections**: Implemented; visibility depends on OS permissions.
- **File Monitoring**: Not implemented.

## 8. Future Development
The project roadmap includes two major upcoming phases:
- **Phase 3 (Advanced Monitoring)**: Integrating an SQLite database to permanently log threat history. Introducing the `watchdog` Python library to monitor suspicious file creation/deletion, with network socket monitoring now implemented.
- **Phase 4 (Final Polish)**: Integrating the new data streams into the React UI, allowing for historical date-range analysis, and performing end-to-end load testing.

## 9. How to Run the Project

You must run the backend and frontend simultaneously in separate terminal windows.

### Start the Backend
```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```
*(The API will be available at `http://127.0.0.1:5000`)*

### Start the Frontend
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
*(The React dashboard will be available at `http://localhost:5173`)*

## Testing Network Connections

If port 5000 is occupied (common with macOS AirPlay), start the backend with `python -m flask --app app run --port 5001 --no-debugger --no-reload` and the frontend with `VITE_API_BASE_URL=http://127.0.0.1:5001/api npm run dev`.

Start the backend and frontend, then open **Network**. The connection table refreshes approximately every two seconds. Search by process, PID, or address, and filter by protocol or listening/established state.

For a local demonstration, run these commands in separate terminals:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
nc 127.0.0.1 8000
```

The server should appear as a TCP `LISTEN` socket on port 8000. Keep `nc` open without entering anything to see an `ESTABLISHED` connection. Close the client with Ctrl+C, then stop the server; the established/listening rows should disappear after the next sample (TCP cleanup states may remain briefly). Clear filters to inspect UDP sockets; UDP has no TCP connection state.

On macOS, system-wide socket collection requires root privileges. Without them, the page displays an access restriction instead of an empty success state. For a macOS demo requiring full visibility, use an isolated local demo environment and start Flask with the virtual environment's Python using `sudo .venv/bin/python -m flask --app app run --no-debugger --no-reload` from `backend` (use your actual virtual environment path). This keeps the privileged demo server on loopback with debugging disabled. Linux may omit sockets that the current user cannot inspect; a notice explains this. Unknown process names/PIDs mean the owner was inaccessible or no longer available.

### Network burst detection demo (macOS)

From `backend`, start the backend with socket visibility enabled:

```bash
sudo .venv/bin/python -m flask --app app run --port 5001 --no-debugger --no-reload
```

From `frontend`, run `VITE_API_BASE_URL=http://127.0.0.1:5001/api npm run dev`.

In another terminal, from `backend`:

```bash
python3 scripts/network_demo.py server
```

Wait at least 3 seconds for the monitor's baseline. In a fourth terminal, also from `backend`, demonstrate normal activity:

```bash
python3 scripts/network_demo.py client --count 1
```

This should not produce a network burst alert for the printed client PID. After it exits, demonstrate the burst:

```bash
python3 scripts/network_demo.py client --count 30
```

Open **Threats**. Within a few seconds, expect a HIGH “Network connection burst” alert. Click its row for the count, threshold, window, and observed remote endpoints. Match the printed client PID to its alert. The local demo server may also alert because it accepts the same 30 connections: both incoming and outgoing sockets count. The script opens real connections only to `127.0.0.1:8765`, holds them for 20 seconds, and closes them on exit. Stop the server with Ctrl+C. Restart the demo server between presentations to release its retained sockets.

The rule detects unusual activity, not confirmed malware. Score 65/HIGH is a fixed rule severity, not a probability. Connections already present at startup/recovery do not count. State changes on the same socket do not count as new connections. Sampling approximately every two seconds can miss shorter connections; restricted collection disables detection until a fresh baseline is available. An alert can rearm after the process's rolling count falls below 30. Events remain in memory and disappear when the backend restarts.

### What local and remote mean

For each row, **local** is the endpoint owned by that row's process; **remote** is the other endpoint. An address contains an IP and port. The IP identifies a host/interface; the port identifies a communication endpoint on it. `127.0.0.1` is loopback: this computer.

For example, a demo client might have local `127.0.0.1:54321` and remote `127.0.0.1:8765`. The server's accepted connection has those addresses reversed: local `:8765`, remote `:54321`. Both run on the same Mac, so “remote” does not necessarily mean another computer or the internet. A listening socket has no connected peer yet, so its remote column is blank. For a browser connecting to an external website, local is the browser's endpoint on your computer and remote is the web server endpoint.

Run automated checks:

```bash
cd backend
python -m pytest -q
# In frontend:
npm run build
npm run lint
```

Network tests cover socket serialization, IPv6/UDP, disappearing process owners, permission/collection failures, burst thresholds, rolling-window expiry, duplicate suppression, startup/recovery baselines, and publication through the Threats API. They do not require elevated privileges.

## 10. Conclusion
OSentinel successfully bridges the gap between raw, static OS telemetry tools and complex commercial security software. It provides an intelligent, automated way to monitor local system health and detect runaway or suspicious processes, wrapped in an accessible and premium visual interface.
