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
- **File System & Network Sockets (Planned)**: File integrity and active socket monitoring are scoped for future updates.

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
- **File/Network Monitoring**: Not implemented.

## 8. Future Development
The project roadmap includes two major upcoming phases:
- **Phase 3 (Advanced Monitoring)**: Integrating an SQLite database to permanently log threat history. Introducing the `watchdog` Python library to monitor suspicious file creation/deletion, and tracking active network socket connections.
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

## 10. Conclusion
OSentinel successfully bridges the gap between raw, static OS telemetry tools and complex commercial security software. It provides an intelligent, automated way to monitor local system health and detect runaway or suspicious processes, wrapped in an accessible and premium visual interface.
