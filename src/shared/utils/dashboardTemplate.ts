export interface ISystemMetricsData {
  totalApiHits: number;
  cpuCores: number;
  cpuModel: string;
  arch: string;
  platform: string;
  osType: string;
  osRelease: string;
  nodeVersion: string;
  processUptime: number;
  systemUptime: number;
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
  totalSystemMem: number;
  usedSystemMem: number;
  freeSystemMem: number;
  dbStatus: 'Connected' | 'Disconnected';
  dbColor: string;
}

const formatBytes = (bytes: number): string => (bytes / (1024 * 1024)).toFixed(2);
const formatGigabytes = (bytes: number): string => (bytes / (1024 * 1024 * 1024)).toFixed(2);
const formatUptime = (seconds: number): string => {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d > 0 ? `${d}d ` : ''}${h}h ${m}m ${s}s`;
};

export const generateDashboardHtml = (data: ISystemMetricsData): string => {
  const sysMemPercent = ((data.usedSystemMem / data.totalSystemMem) * 100).toFixed(1);
  const heapPercent = ((data.heapUsed / data.heapTotal) * 100).toFixed(1);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Backend Server Status & Live Metrics</title>
  <meta http-equiv="refresh" content="10">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090d16;
      --card-bg: rgba(18, 24, 38, 0.75);
      --card-border: rgba(255, 255, 255, 0.08);
      --text: #f1f5f9;
      --muted: #94a3b8;
      --accent: #6366f1;
      --accent-glow: rgba(99, 102, 241, 0.25);
      --green: #10b981;
      --cyan: #06b6d4;
      --amber: #f59e0b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: radial-gradient(circle at 50% 0%, #1e1b4b 0%, var(--bg) 75%);
      color: var(--text);
      font-family: 'Plus Jakarta Sans', sans-serif;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 30px 20px;
    }
    .container {
      width: 100%;
      max-width: 1100px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 28px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .title-group h1 {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
      background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .title-group p {
      color: var(--muted);
      font-size: 14px;
      margin-top: 4px;
    }
    .badge-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 600;
      background: rgba(16, 185, 129, 0.12);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.25);
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--green);
      box-shadow: 0 0 12px var(--green);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(1.2); }
      100% { opacity: 1; transform: scale(1); }
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }
    .card {
      background: var(--card-bg);
      backdrop-filter: blur(20px);
      border: 1px solid var(--card-border);
      border-radius: 18px;
      padding: 24px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
      transition: transform 0.2s, border-color 0.2s;
    }
    .card:hover {
      transform: translateY(-2px);
      border-color: rgba(255, 255, 255, 0.16);
    }
    .card-label {
      font-size: 13px;
      color: var(--muted);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .card-value {
      font-size: 32px;
      font-weight: 800;
      margin: 14px 0 8px;
      letter-spacing: -1px;
    }
    .card-sub {
      font-size: 13px;
      color: var(--muted);
    }
    .progress-bar {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 9999px;
      overflow: hidden;
      margin-top: 14px;
    }
    .progress-fill {
      height: 100%;
      border-radius: 9999px;
      transition: width 0.4s ease;
    }
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    @media (max-width: 768px) {
      .details-grid { grid-template-columns: 1fr; }
    }
    .detail-card {
      background: var(--card-bg);
      backdrop-filter: blur(20px);
      border: 1px solid var(--card-border);
      border-radius: 18px;
      padding: 24px;
    }
    .detail-card h3 {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 14px;
    }
    .row:last-child { border-bottom: none; }
    .row span:first-child { color: var(--muted); }
    .row span:last-child { font-family: 'JetBrains Mono', monospace; font-weight: 600; color: #e2e8f0; }
    .footer-bar {
      margin-top: 24px;
      text-align: center;
      font-size: 13px;
      color: var(--muted);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title-group">
        <h1>Enterprise Backend API</h1>
        <p>Live Real-Time Production Server & System Performance Monitor</p>
      </div>
      <div class="badge-group">
        <div class="badge">
          <span class="pulse-dot"></span>
          Server Operational
        </div>
      </div>
    </div>

    <!-- Top Metric Cards -->
    <div class="grid">
      <!-- Card 1: API Hits -->
      <div class="card">
        <div class="card-label">
          <span>Total API Requests</span>
          <span>📈</span>
        </div>
        <div class="card-value" style="color: var(--cyan);">${data.totalApiHits.toLocaleString()}</div>
        <div class="card-sub">Total incoming requests recorded</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: 100%; background: linear-gradient(90deg, #06b6d4, #3b82f6);"></div>
        </div>
      </div>

      <!-- Card 2: CPU Cores & Model -->
      <div class="card">
        <div class="card-label">
          <span>CPU Cores & Arch</span>
          <span>⚡</span>
        </div>
        <div class="card-value" style="color: #a855f7;">${data.cpuCores} Cores</div>
        <div class="card-sub">${data.arch} • ${data.platform}</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: 100%; background: linear-gradient(90deg, #a855f7, #ec4899);"></div>
        </div>
      </div>

      <!-- Card 3: Process Heap Memory -->
      <div class="card">
        <div class="card-label">
          <span>Node Heap Used</span>
          <span>🧠</span>
        </div>
        <div class="card-value" style="color: #6366f1;">${formatBytes(data.heapUsed)} MB</div>
        <div class="card-sub">${heapPercent}% of ${formatBytes(data.heapTotal)} MB Total Heap</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${Math.min(Number(heapPercent), 100)}%; background: linear-gradient(90deg, #6366f1, #8b5cf6);"></div>
        </div>
      </div>

      <!-- Card 4: System RAM -->
      <div class="card">
        <div class="card-label">
          <span>System RAM (ROM)</span>
          <span>💾</span>
        </div>
        <div class="card-value" style="color: #10b981;">${sysMemPercent}%</div>
        <div class="card-sub">${formatGigabytes(data.usedSystemMem)} GB / ${formatGigabytes(data.totalSystemMem)} GB Used</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${Math.min(Number(sysMemPercent), 100)}%; background: linear-gradient(90deg, #10b981, #06b6d4);"></div>
        </div>
      </div>
    </div>

    <!-- Detailed System & Process Specs -->
    <div class="details-grid">
      <!-- Section 1: Process & System Details -->
      <div class="detail-card">
        <h3><span>🖥️</span> System & Environment Details</h3>
        <div class="row">
          <span>CPU Processor</span>
          <span title="${data.cpuModel}">${data.cpuModel.length > 25 ? data.cpuModel.slice(0, 25) + '...' : data.cpuModel}</span>
        </div>
        <div class="row">
          <span>OS Platform</span>
          <span>${data.osType} (${data.osRelease})</span>
        </div>
        <div class="row">
          <span>Node.js Runtime</span>
          <span>${data.nodeVersion}</span>
        </div>
        <div class="row">
          <span>Process Uptime</span>
          <span>${formatUptime(data.processUptime)}</span>
        </div>
        <div class="row">
          <span>System Uptime</span>
          <span>${formatUptime(data.systemUptime)}</span>
        </div>
      </div>

      <!-- Section 2: Memory Footprint & Database -->
      <div class="detail-card">
        <h3><span>⚡</span> Memory Allocation & Infrastructure</h3>
        <div class="row">
          <span>Resident Set Size (RSS)</span>
          <span>${formatBytes(data.rss)} MB</span>
        </div>
        <div class="row">
          <span>Heap Total</span>
          <span>${formatBytes(data.heapTotal)} MB</span>
        </div>
        <div class="row">
          <span>Heap Used</span>
          <span>${formatBytes(data.heapUsed)} MB</span>
        </div>
        <div class="row">
          <span>External Memory</span>
          <span>${formatBytes(data.external)} MB</span>
        </div>
        <div class="row">
          <span>Database Connection</span>
          <span style="color: ${data.dbColor};">${data.dbStatus}</span>
        </div>
      </div>
    </div>

    <div class="footer-bar">
      Auto-refreshing every 10 seconds • Built with Node.js, Express & TypeScript
    </div>
  </div>
</body>
</html>
  `.trim();
};
