const SUPABASE_URL = "https://sfbfvmmgvcyiydioqnkr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYmZ2bW1ndmN5aXlkaW9xbmtyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzk3MDY0NCwiZXhwIjoyMDgzNTQ2NjQ0fQ._oWlidsaHDWvgiRcCbbYA_usEnWpJ6KCCeG59kPcu8E";
const TABLE_NAME = "aloware_import";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/") return new Response(HTML, {headers: {"Content-Type": "text/html"}});
    if (request.method === "POST" && url.pathname === "/insert") {
      const batch = await request.json();
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE_NAME}`, {
        method: "POST",
        headers: {"apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", "Prefer": "return=minimal"},
        body: JSON.stringify(batch)
      });
      if (!resp.ok) {
        const text = await resp.text();
        return new Response(text, {status: resp.status, headers: {"Content-Type": "application/json"}});
      }
      return new Response(JSON.stringify({success: true}), {headers: {"Content-Type": "application/json"}});
    }
    if (request.method === "POST" && url.pathname === "/clear") {
      await fetch(`${SUPABASE_URL}/rest/v1/${TABLE_NAME}?id=gt.0`, {method: "DELETE", headers: {"apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`}});
      return new Response(JSON.stringify({success: true}), {headers: {"Content-Type": "application/json"}});
    }
    return new Response("Not found", {status: 404});
  }
};

const HTML = `<!DOCTYPE html><html><head><title>Aloware Import</title><style>body{font-family:Arial;max-width:700px;margin:50px auto;padding:20px}#dropzone{border:3px dashed #ccc;padding:50px;text-align:center;cursor:pointer;border-radius:10px}#dropzone:hover{border-color:#4CAF50;background:#f9f9f9}#progress{margin:20px 0}#progressBar{width:100%;height:30px;background:#eee;border-radius:5px}#progressFill{height:100%;background:#4CAF50;width:0%}#log{background:#1e1e1e;color:#0f0;padding:15px;height:250px;overflow-y:auto;font-family:monospace;font-size:12px;border-radius:5px}button{padding:12px 24px;font-size:16px;cursor:pointer;margin:5px;border-radius:5px}#startBtn{background:#4CAF50;color:white;border:none}#startBtn:disabled{background:#ccc}#clearBtn{background:#ff9800;color:white;border:none}.hidden{display:none}</style></head><body><h1>Aloware CSV Import</h1><div id="dropzone"><p>Click to select CSV or drag & drop</p><input type="file" id="fileInput" accept=".csv" style="display:none"></div><div id="fileInfo" class="hidden"><p><b>File:</b> <span id="fileName"></span></p><p><b>Rows:</b> <span id="rowCount"></span></p></div><div><button id="clearBtn" class="hidden">Clear Table</button><button id="startBtn" disabled>Start Import</button></div><div id="progress" class="hidden"><div id="progressBar"><div id="progressFill"></div></div><div id="status">Ready</div></div><div id="log"></div><script>
const BATCH=100;let rows=[],idx=0,errs=0;

function log(m){const e=document.getElementById("log");e.innerHTML+="["+new Date().toLocaleTimeString()+"] "+m+"\\n";e.scrollTop=e.scrollHeight}

function prog(d,t){const p=(d/t*100).toFixed(1);document.getElementById("progressFill").style.width=p+"%";document.getElementById("status").textContent=d.toLocaleString()+" / "+t.toLocaleString()+" ("+p+"%)";localStorage.setItem("aloware_p",JSON.stringify({i:d,t:t}))}

function parseCSV(text) {
  const rows = [];
  const lines = [];
  let currentLine = '';
  let inQuotes = false;
  
  // Split into lines, handling quoted newlines
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      currentLine += char;
    } else if ((char === '\\n' || char === '\\r') && !inQuotes) {
      if (currentLine.trim()) lines.push(currentLine);
      currentLine = '';
      if (char === '\\r' && text[i+1] === '\\n') i++;
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim()) lines.push(currentLine);
  
  if (lines.length < 2) return [];
  
  const headers = parseCSVLine(lines[0]);
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length !== headers.length) continue;
    
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      let val = values[j];
      if (val === '' || val === undefined) val = null;
      if ((headers[j] === 'Communication ID' || headers[j] === 'Contact ID') && val) {
        val = parseInt(val) || null;
      }
      row[headers[j]] = val;
    }
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i+1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

async function run(){document.getElementById("startBtn").disabled=true;document.getElementById("clearBtn").disabled=true;document.getElementById("progress").classList.remove("hidden");const t=rows.length;log("Starting "+t.toLocaleString()+" rows...");while(idx<t){const b=rows.slice(idx,idx+BATCH);try{const r=await fetch("/insert",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)});if(!r.ok){const txt=await r.text();throw new Error(txt)}idx+=b.length;prog(idx,t);if(idx%1000===0)log("Imported "+idx.toLocaleString())}catch(e){log("ERROR row "+idx+": "+e.message);errs+=b.length;idx+=b.length;await new Promise(r=>setTimeout(r,1000))}await new Promise(r=>setTimeout(r,30))}log("DONE: "+(idx-errs).toLocaleString()+" imported, "+errs+" errors");localStorage.removeItem("aloware_p");document.getElementById("startBtn").textContent="Done!"}

document.getElementById("dropzone").onclick=()=>document.getElementById("fileInput").click();
document.getElementById("dropzone").ondragover=e=>{e.preventDefault();e.currentTarget.style.borderColor="#4CAF50"};
document.getElementById("dropzone").ondragleave=e=>e.currentTarget.style.borderColor="#ccc";
document.getElementById("dropzone").ondrop=e=>{e.preventDefault();e.currentTarget.style.borderColor="#ccc";handleFile(e.dataTransfer.files[0])};
document.getElementById("fileInput").onchange=e=>handleFile(e.target.files[0]);

function handleFile(f){if(!f)return;log("Loading: "+f.name);document.getElementById("fileName").textContent=f.name;const r=new FileReader();r.onload=e=>{rows=parseCSV(e.target.result);document.getElementById("rowCount").textContent=rows.length.toLocaleString();document.getElementById("fileInfo").classList.remove("hidden");document.getElementById("startBtn").disabled=false;document.getElementById("clearBtn").classList.remove("hidden");log("Parsed "+rows.length.toLocaleString()+" rows");const s=localStorage.getItem("aloware_p");if(s){const p=JSON.parse(s);if(confirm("Resume from "+p.i.toLocaleString()+"?")){idx=p.i;log("Resuming from "+idx)}else localStorage.removeItem("aloware_p")}};r.readAsText(f)}

document.getElementById("startBtn").onclick=run;
document.getElementById("clearBtn").onclick=async()=>{if(confirm("Clear table?")){log("Clearing...");await fetch("/clear",{method:"POST"});log("Cleared")}};
log("Ready");
</script></body></html>`;
