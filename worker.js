// Cloudflare Worker: aloware-import
// Deploy to Cloudflare Workers, then visit the URL to use

const SUPABASE_URL = "https://sfbfvmmgvcyiydioqnkr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYmZ2bW1ndmN5aXlkaW9xbmtyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzk3MDY0NCwiZXhwIjoyMDgzNTQ2NjQ0fQ._oWlidsaHDWvgiRcCbbYA_usEnWpJ6KCCeG59kPcu8E";
const TABLE_NAME = "aloware_import";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Serve the HTML page
    if (request.method === "GET" && url.pathname === "/") {
      return new Response(HTML_PAGE, {
        headers: { "Content-Type": "text/html" }
      });
    }
    
    // Handle batch insert
    if (request.method === "POST" && url.pathname === "/insert") {
      try {
        const batch = await request.json();
        
        const resp = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE_NAME}`, {
          method: "POST",
          headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
          },
          body: JSON.stringify(batch)
        });
        
        if (!resp.ok) {
          const text = await resp.text();
          return new Response(JSON.stringify({ error: text }), { 
            status: resp.status,
            headers: { "Content-Type": "application/json" }
          });
        }
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    // Handle clear table
    if (request.method === "POST" && url.pathname === "/clear") {
      try {
        const resp = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE_NAME}?id=gt.0`, {
          method: "DELETE",
          headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`
          }
        });
        
        return new Response(JSON.stringify({ success: resp.ok }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    return new Response("Not found", { status: 404 });
  }
};

const HTML_PAGE = `<!DOCTYPE html>
<html>
<head>
    <title>Aloware CSV Import</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 700px; margin: 50px auto; padding: 20px; }
        h1 { color: #333; }
        #dropzone { border: 3px dashed #ccc; padding: 50px; text-align: center; margin: 20px 0; cursor: pointer; border-radius: 10px; }
        #dropzone:hover { border-color: #4CAF50; background: #f9f9f9; }
        #progress { margin: 20px 0; }
        #progressBar { width: 100%; height: 30px; background: #eee; border-radius: 5px; overflow: hidden; }
        #progressFill { height: 100%; background: #4CAF50; width: 0%; transition: width 0.3s; }
        #status { margin: 10px 0; font-size: 16px; font-weight: bold; }
        #log { background: #1e1e1e; color: #0f0; padding: 15px; height: 250px; overflow-y: auto; font-family: monospace; font-size: 12px; border-radius: 5px; }
        button { padding: 12px 24px; font-size: 16px; cursor: pointer; margin: 5px; border-radius: 5px; }
        #startBtn { background: #4CAF50; color: white; border: none; }
        #startBtn:disabled { background: #ccc; cursor: not-allowed; }
        #clearBtn { background: #ff9800; color: white; border: none; }
        .hidden { display: none; }
        .info { background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>Aloware CSV Import</h1>
    
    <div class="info">
        <strong>Instructions:</strong> Select your Aloware CSV export. Click "Clear Table" first if reimporting, then "Start Import".
    </div>
    
    <div id="dropzone">
        <p style="font-size: 18px;">📁 Click to select CSV file or drag & drop</p>
        <input type="file" id="fileInput" accept=".csv" style="display:none">
    </div>
    
    <div id="fileInfo" class="hidden">
        <p><strong>File:</strong> <span id="fileName"></span></p>
        <p><strong>Rows:</strong> <span id="rowCount"></span></p>
    </div>
    
    <div>
        <button id="clearBtn" class="hidden">Clear Table First</button>
        <button id="startBtn" disabled>Start Import</button>
    </div>
    
    <div id="progress" class="hidden">
        <div id="progressBar"><div id="progressFill"></div></div>
        <div id="status">Ready</div>
    </div>
    
    <div id="log"></div>

<script>
const BATCH_SIZE = 100;
let rows = [];
let currentIndex = 0;
let errors = 0;

function log(msg) {
    const el = document.getElementById('log');
    const time = new Date().toLocaleTimeString();
    el.innerHTML += "[" + time + "] " + msg + "\\n";
    el.scrollTop = el.scrollHeight;
}

function updateProgress(done, total) {
    const pct = (done / total * 100).toFixed(1);
    document.getElementById('progressFill').style.width = pct + '%';
    document.getElementById('status').textContent = done.toLocaleString() + ' / ' + total.toLocaleString() + ' (' + pct + '%)';
    localStorage.setItem('aloware_progress', JSON.stringify({ index: done, total: total }));
}

function parseCSV(text) {
    const lines = text.split('\\n');
    const headers = parseCSVLine(lines[0]);
    const result = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = parseCSVLine(line);
        const row = {};
        
        for (let j = 0; j < headers.length; j++) {
            let val = values[j] || null;
            if (val === '') val = null;
            if ((headers[j] === 'Communication ID' || headers[j] === 'Contact ID') && val) {
                val = parseInt(val) || null;
            }
            row[headers[j]] = val;
        }
        result.push(row);
    }
    return result;
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

async function importBatch(batch) {
    const resp = await fetch('/insert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch)
    });
    
    if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || resp.status);
    }
}

async function clearTable() {
    log('Clearing existing data...');
    const resp = await fetch('/clear', { method: 'POST' });
    const data = await resp.json();
    if (data.success) {
        log('Table cleared.');
    } else {
        log('Warning: ' + (data.error || 'Could not clear table'));
    }
}

async function runImport() {
    document.getElementById('startBtn').disabled = true;
    document.getElementById('clearBtn').disabled = true;
    document.getElementById('progress').classList.remove('hidden');
    
    const total = rows.length;
    log('Starting import of ' + total.toLocaleString() + ' rows...');
    
    while (currentIndex < total) {
        const batch = rows.slice(currentIndex, currentIndex + BATCH_SIZE);
        
        try {
            await importBatch(batch);
            currentIndex += batch.length;
            updateProgress(currentIndex, total);
            
            if (currentIndex % 1000 === 0) {
                log('Imported ' + currentIndex.toLocaleString() + ' rows...');
            }
        } catch (e) {
            log('ERROR at row ' + currentIndex + ': ' + e.message);
            errors += batch.length;
            currentIndex += batch.length;
            await new Promise(r => setTimeout(r, 1000));
        }
        
        await new Promise(r => setTimeout(r, 30));
    }
    
    log('');
    log('========== COMPLETE ==========');
    log('Imported: ' + (currentIndex - errors).toLocaleString());
    log('Errors: ' + errors);
    
    localStorage.removeItem('aloware_progress');
    document.getElementById('startBtn').textContent = 'Done!';
}

// File handling
document.getElementById('dropzone').onclick = () => document.getElementById('fileInput').click();

document.getElementById('dropzone').ondragover = (e) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#4CAF50';
};

document.getElementById('dropzone').ondragleave = (e) => {
    e.currentTarget.style.borderColor = '#ccc';
};

document.getElementById('dropzone').ondrop = (e) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#ccc';
    handleFile(e.dataTransfer.files[0]);
};

document.getElementById('fileInput').onchange = (e) => handleFile(e.target.files[0]);

function handleFile(file) {
    if (!file) return;
    
    log('Loading: ' + file.name);
    document.getElementById('fileName').textContent = file.name;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        rows = parseCSV(e.target.result);
        document.getElementById('rowCount').textContent = rows.length.toLocaleString();
        document.getElementById('fileInfo').classList.remove('hidden');
        document.getElementById('startBtn').disabled = false;
        document.getElementById('clearBtn').classList.remove('hidden');
        log('Parsed ' + rows.length.toLocaleString() + ' rows.');
        
        const saved = localStorage.getItem('aloware_progress');
        if (saved) {
            const p = JSON.parse(saved);
            if (confirm('Resume from row ' + p.index.toLocaleString() + '?')) {
                currentIndex = p.index;
                log('Resuming from row ' + currentIndex.toLocaleString());
            } else {
                localStorage.removeItem('aloware_progress');
            }
        }
    };
    reader.readAsText(file);
}

document.getElementById('startBtn').onclick = runImport;
document.getElementById('clearBtn').onclick = async () => {
    if (confirm('Delete all existing data in aloware_import table?')) {
        await clearTable();
    }
};

log('Ready. Select a CSV file to begin.');
</script>
</body>
</html>`;
