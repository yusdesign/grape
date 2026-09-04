// ⭐ IMMEDIATE STARTUP CHECK
console.log('🚀 INDEX.JS LOADED');
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM Content Loaded');
    const startupCheck = document.getElementById('startupCheck');
    if (startupCheck) {
        startupCheck.style.display = 'none';
        console.log('✅ Startup check passed');
    }
});

// ⭐ Force show debug if hidden
setTimeout(() => {
    const debugEl = document.getElementById('debugConsole');
    if (debugEl) {
        debugEl.style.display = 'block';
        debugEl.innerHTML = '<div style="color:#0f0;">🐛 DEBUG CONSOLE FORCED OPEN</div>';
        console.log('🐛 Debug console forced open');
    }
}, 1000);

// ============================================================
// DEBUG CONSOLE - SIMPLE VERSION
// ============================================================
(function() {
    console.log('🔧 Setting up debug console...');
    
    // Create debug console if missing
    let debugEl = document.getElementById('debugConsole');
    if (!debugEl) {
        debugEl = document.createElement('div');
        debugEl.id = 'debugConsole';
        debugEl.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            max-height: 200px;
            background: rgba(0,0,0,0.95);
            color: #0f0;
            font-family: monospace;
            font-size: 11px;
            padding: 8px 12px;
            overflow-y: auto;
            z-index: 99999;
            border-top: 2px solid #0f0;
            line-height: 1.6;
            display: block;
        `;
        document.body.appendChild(debugEl);
        console.log('✅ Debug console created');
    }
    
    // Always show debug console on startup
    debugEl.style.display = 'block';
    debugEl.innerHTML = '<div style="color:#ff0;">🐛 DEBUG CONSOLE ACTIVE</div>';
    
    // Simple toggle on status bar double-click
    const statusEl = document.getElementById('status');
    if (statusEl) {
        statusEl.addEventListener('dblclick', function() {
            if (debugEl.style.display === 'none') {
                debugEl.style.display = 'block';
                addLog('🐛 Debug console shown', 'success');
            } else {
                debugEl.style.display = 'none';
            }
        });
        console.log('✅ Double-click status bar to toggle debug');
    }
    
    // Log function
    function addLog(message, type = 'info') {
        const colors = {
            error: '#ff4444',
            warn: '#ffaa00',
            info: '#44aaff',
            success: '#44ff88',
            debug: '#888888'
        };
        const div = document.createElement('div');
        div.style.color = colors[type] || '#ffffff';
        const timestamp = new Date().toLocaleTimeString();
        div.textContent = `[${timestamp}] ${message}`;
        debugEl.appendChild(div);
        debugEl.scrollTop = debugEl.scrollHeight;
        while (debugEl.children.length > 100) {
            debugEl.removeChild(debugEl.firstChild);
        }
    }
    
    // Override console
    const origLog = console.log;
    const origError = console.error;
    const origWarn = console.warn;
    
    console.log = function(...args) {
        addLog(args.join(' '), 'info');
        origLog.apply(console, args);
    };
    console.error = function(...args) {
        addLog('❌ ' + args.join(' '), 'error');
        origError.apply(console, args);
    };
    console.warn = function(...args) {
        addLog('⚠️ ' + args.join(' '), 'warn');
        origWarn.apply(console, args);
    };
    
    // Log startup
    addLog('🚀 App starting...', 'success');
    addLog('📱 Platform: ' + (window.Capacitor ? Capacitor.getPlatform() : 'web'), 'info');
    addLog('💡 Double-click "Ready" to toggle this console', 'info');
    
    window.addDebugLog = addLog;
    console.log('✅ Debug console ready');
})();

// ============================================================
// IMPORTS
// ============================================================
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { AssetManager, Encoding } from '@capawesome/capacitor-asset-manager';
import { DataSet, Network } from 'vis-network';

// ============================================================
// DOM ELEMENTS
// ============================================================
const container = document.getElementById('graphContainer');
const statusEl = document.getElementById('status');
const nodeCountEl = document.getElementById('nodeCount');
const openBtn = document.getElementById('openFileBtn');
const sampleBtn = document.getElementById('sampleFileBtn');
const exportBtn = document.getElementById('exportBtn');
const resetBtn = document.getElementById('resetViewBtn');
const shareBtn = document.getElementById('shareBtn');
const fileInput = document.getElementById('fileInput');
const contextMenu = document.getElementById('contextMenu');
const contextContent = document.getElementById('contextMenuContent');

// ============================================================
// STATE
// ============================================================
let network = null;
let nodes = null;
let edges = null;
let currentFile = null;
let graphData = null;
let currentFilePath = null;

// ============================================================
// TOAST SYSTEM
// ============================================================
function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================================
// STATUS UPDATE
// ============================================================
function setStatus(message, isLoading = false) {
    if (isLoading) {
        statusEl.innerHTML = `<span class="loading"></span> ${message}`;
    } else {
        statusEl.textContent = message;
    }
}

// ============================================================
// DEBUG: Check buttons exist
// ============================================================
console.log('🔍 Checking DOM elements:');
console.log('  openBtn:', document.getElementById('openFileBtn'));
console.log('  sampleBtn:', document.getElementById('sampleFileBtn'));
console.log('  exportBtn:', document.getElementById('exportBtn'));
console.log('  resetBtn:', document.getElementById('resetViewBtn'));
console.log('  shareBtn:', document.getElementById('shareBtn'));
console.log('  fileInput:', document.getElementById('fileInput'));
console.log('  status:', document.getElementById('status'));
console.log('  container:', document.getElementById('graphContainer'));

// Test click handlers
if (document.getElementById('sampleFileBtn')) {
    document.getElementById('sampleFileBtn').addEventListener('click', function() {
        console.log('🖱️ SAMPLE BUTTON CLICKED (inline test)');
        alert('Button clicked!');
    });
}

// ============================================================
// 1. FILE LOADING
// ============================================================
async function loadFile(fileData, filename) {
    console.log('📤 loadFile() called for:', filename);
    try {
        setStatus('Loading file...', true);
        
        const content = new TextDecoder('utf-8').decode(fileData);
        console.log('📄 Content preview:', content.substring(0, 100) + '...');
        currentFile = filename;
        
        setStatus(`Parsing ${filename}...`, true);
        const parsed = parseContent(content, filename);
        
        if (parsed && parsed.nodes && parsed.edges) {
            console.log('📊 Parsed:', parsed.nodes.length, 'nodes,', parsed.edges.length, 'edges');
            graphData = parsed;
            renderGraph(parsed);
            setStatus(`✅ Loaded: ${filename} (${parsed.nodes.length} nodes, ${parsed.edges.length} edges)`);
            showToast(`✅ Loaded ${filename}`, 'success');
        } else {
            throw new Error('Invalid graph data: missing nodes or edges');
        }
    } catch (error) {
        console.error('❌ Load error:', error.message);
        console.error('Stack:', error.stack);
        setStatus(`❌ Error: ${error.message}`);
        showToast(`Error: ${error.message}`, 'error');
    }
}

// ============================================================
// 2. FILE PICKER (Native file input - free, works everywhere)
// ============================================================
async function openFilePicker() {
    console.log('📂 openFilePicker() called');
    fileInput.click();
}

fileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('📄 Selected file:', file.name, 'Size:', file.size);
    setStatus(`Loading ${file.name}...`, true);
    
    try {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target.result;
            console.log('📦 File loaded, size:', content.length);
            const encoder = new TextEncoder();
            const data = encoder.encode(content);
            await loadFile(data, file.name);
        };
        reader.readAsText(file);
    } catch (error) {
        console.error('❌ File read error:', error.message);
        showToast('File read error: ' + error.message, 'error');
        setStatus('Error: ' + error.message);
    }
    
    // Reset input so same file can be loaded again
    fileInput.value = '';
});

// ============================================================
// 3. PARSERS
// ============================================================
function parseContent(content, filename) {
    const ext = filename.split('.').pop().toLowerCase();
    console.log('🔍 Parsing extension:', ext);
    
    try {
        switch(ext) {
            case 'json':
                return parseJSON(content);
            case 'xml':
                return parseXML(content);
            case 'html':
            case 'htm':
                return parseHTML(content);
            case 'svg':
                return parseSVG(content);
            case 'txt':
                return parseText(content);
            default:
                throw new Error(`Unsupported format: ${ext}`);
        }
    } catch (error) {
        throw new Error(`Parse error: ${error.message}`);
    }
}

function parseJSON(jsonStr) {
    const data = JSON.parse(jsonStr);
    console.log('📊 JSON parsed, keys:', Object.keys(data));
    
    if (data.nodes && data.edges) {
        return {
            nodes: data.nodes.map(n => ({ ...n, id: n.id || n.label })),
            edges: data.edges.map(e => ({ ...e }))
        };
    }
    
    // Fallback: Convert object to graph
    const nodes = [];
    const edges = [];
    const nodeMap = new Map();
    
    function traverse(obj, parentKey = null) {
        Object.entries(obj).forEach(([key, value]) => {
            if (!nodeMap.has(key)) {
                nodeMap.set(key, { id: key, label: key });
                nodes.push(nodeMap.get(key));
            }
            if (parentKey) {
                edges.push({ from: parentKey, to: key });
            }
            if (typeof value === 'object' && value !== null) {
                traverse(value, key);
            }
        });
    }
    
    traverse(data);
    return { nodes, edges };
}

function parseXML(xmlStr) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlStr, 'text/xml');
    const elements = doc.querySelectorAll('*');
    
    const nodes = [];
    const edges = [];
    const idMap = new Map();
    
    elements.forEach(el => {
        if (el.tagName === '#document' || el.tagName === '#text') return;
        
        const id = el.getAttribute('id') || el.getAttribute('name') || el.tagName;
        const uniqueId = `${el.tagName}_${id}_${Math.random().toString(36).substr(2, 4)}`;
        
        if (!idMap.has(uniqueId)) {
            idMap.set(uniqueId, { id: uniqueId, label: el.tagName });
            nodes.push({ id: uniqueId, label: el.tagName });
        }
        
        if (el.parentElement && el.parentElement.tagName !== '#document') {
            const parentEl = el.parentElement;
            const parentId = parentEl.getAttribute('id') || parentEl.getAttribute('name') || parentEl.tagName;
            const parentUniqueId = `${parentEl.tagName}_${parentId}_${Math.random().toString(36).substr(2, 4)}`;
            
            if (!idMap.has(parentUniqueId)) {
                idMap.set(parentUniqueId, { id: parentUniqueId, label: parentEl.tagName });
                nodes.push({ id: parentUniqueId, label: parentEl.tagName });
            }
            
            edges.push({ from: parentUniqueId, to: uniqueId });
        }
    });
    
    return { nodes, edges };
}

function parseHTML(htmlStr) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlStr, 'text/html');
    const elements = doc.querySelectorAll('body *');
    
    const nodes = [];
    const edges = [];
    
    elements.forEach(el => {
        const id = el.id || el.className?.replace(/\s/g, '_') || el.tagName;
        const uniqueId = `${el.tagName}_${id}_${Math.random().toString(36).substr(2, 4)}`;
        const label = el.tagName + (el.id ? `#${el.id}` : '');
        nodes.push({ id: uniqueId, label });
        
        if (el.parentElement && el.parentElement.tagName !== 'BODY') {
            const parentId = el.parentElement.id || el.parentElement.className?.replace(/\s/g, '_') || el.parentElement.tagName;
            const parentUniqueId = `${el.parentElement.tagName}_${parentId}_${Math.random().toString(36).substr(2, 4)}`;
            edges.push({ from: parentUniqueId, to: uniqueId });
        }
    });
    
    return { nodes, edges };
}

function parseSVG(svgStr) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgStr, 'image/svg+xml');
    const elements = doc.querySelectorAll('svg, g, rect, circle, ellipse, line, path, text, defs, use');
    
    const nodes = [];
    const edges = [];
    
    elements.forEach(el => {
        const id = el.id || el.getAttribute('label') || el.tagName;
        const uniqueId = `${el.tagName}_${id}_${Math.random().toString(36).substr(2, 4)}`;
        nodes.push({ id: uniqueId, label: el.tagName });
        
        if (el.parentElement && el.parentElement.tagName !== 'svg') {
            const parentId = el.parentElement.id || el.parentElement.getAttribute('label') || el.parentElement.tagName;
            const parentUniqueId = `${el.parentElement.tagName}_${parentId}_${Math.random().toString(36).substr(2, 4)}`;
            edges.push({ from: parentUniqueId, to: uniqueId });
        }
    });
    
    return { nodes, edges };
}

function parseText(txtStr) {
    const lines = txtStr.split('\n').filter(line => line.trim());
    const nodes = [];
    const edges = [];
    
    lines.forEach((line, index) => {
        const id = `line_${index}`;
        nodes.push({ id, label: line.substring(0, 50) + (line.length > 50 ? '...' : '') });
        
        if (index > 0) {
            edges.push({ from: `line_${index - 1}`, to: id });
        }
    });
    
    return { nodes, edges };
}

// ============================================================
// 4. RENDERER
// ============================================================
function renderGraph(data) {
    console.log('🎨 renderGraph() called with', data.nodes.length, 'nodes');
    
    const styledNodes = data.nodes.map(n => ({
        ...n,
        shape: 'dot',
        size: 25,
        font: { size: 14, face: 'Arial', color: '#e6edf3' },
        color: {
            background: '#58a6ff',
            border: '#1f6feb',
            highlight: { background: '#79c0ff', border: '#58a6ff' }
        },
        borderWidth: 2,
        shadow: true
    }));
    
    const styledEdges = data.edges.map(e => ({
        ...e,
        arrows: 'to',
        smooth: { type: 'curvedCW', roundness: 0.2 },
        color: { color: '#484f58', highlight: '#58a6ff' },
        width: 1.5
    }));
    
    nodes = new DataSet(styledNodes);
    edges = new DataSet(styledEdges);
    
    const options = {
        nodes: {
            shape: 'dot',
            size: 25,
            font: { size: 14, face: 'Arial', color: '#e6edf3' },
            borderWidth: 2,
            shadow: true
        },
        edges: {
            arrows: 'to',
            smooth: { type: 'curvedCW', roundness: 0.2 },
            width: 1.5,
            color: { color: '#484f58', highlight: '#58a6ff' }
        },
        physics: {
            enabled: true,
            solver: 'forceAtlas2Based',
            forceAtlas2Based: {
                gravitationalConstant: -50,
                centralGravity: 0.01,
                springLength: 120,
                springConstant: 0.08
            },
            stabilization: { 
                iterations: 150,
                updateInterval: 25
            }
        },
        interaction: {
            hover: true,
            tooltipDelay: 200,
            zoomView: true,
            dragView: true,
            navigationButtons: true
        },
        layout: {
            randomSeed: 42,
            improvedLayout: true
        }
    };
    
    if (network) {
        network.destroy();
    }
    
    network = new Network(container, { nodes, edges }, options);
    console.log('✅ Network created');
    
    // Events
    network.on('doubleClick', function(params) {
        if (params.nodes.length > 0) {
            const node = nodes.get(params.nodes[0]);
            showToast(`📌 ${node.label}\nID: ${node.id}`, 'info');
        }
    });
    
    network.on('click', function(params) {
        contextMenu.style.display = 'none';
    });
    
    network.on('rightClick', function(params) {
        params.event.preventDefault();
        if (params.nodes.length > 0) {
            const node = nodes.get(params.nodes[0]);
            showContextMenu(params.event.clientX, params.event.clientY, node);
        }
    });
    
    // Update node count
    nodeCountEl.textContent = `${data.nodes.length} nodes, ${data.edges.length} edges`;
    console.log('📊 Node count updated');
    
    // Auto-fit after stabilization
    setTimeout(() => {
        network.fit();
        console.log('🔍 Network fit');
    }, 500);
}

// ============================================================
// 5. CONTEXT MENU
// ============================================================
function showContextMenu(x, y, node) {
    contextContent.innerHTML = `
        <div style="font-weight:bold;margin-bottom:8px;">${node.label}</div>
        <div style="font-size:12px;color:#8b949e;margin-bottom:8px;">ID: ${node.id}</div>
        <button onclick="window.copyNodeId('${node.id}')" style="width:100%;padding:4px;background:#58a6ff;color:#fff;border:none;border-radius:4px;cursor:pointer;">Copy ID</button>
        <button onclick="window.focusNode('${node.id}')" style="width:100%;margin-top:4px;padding:4px;background:#3fb950;color:#fff;border:none;border-radius:4px;cursor:pointer;">Focus</button>
    `;
    
    contextMenu.style.display = 'block';
    contextMenu.style.left = `${Math.min(x, window.innerWidth - 200)}px`;
    contextMenu.style.top = `${Math.min(y, window.innerHeight - 120)}px`;
}

window.copyNodeId = function(id) {
    navigator.clipboard?.writeText(id);
    showToast('Copied!', 'success');
    contextMenu.style.display = 'none';
};

window.focusNode = function(id) {
    if (network) {
        network.focus(id, { scale: 1.5, animation: true });
        contextMenu.style.display = 'none';
    }
};

// ============================================================
// 6. SAMPLE DATA (Using Asset Manager on native, fetch on web)
// ============================================================
async function loadSample() {
    console.log('🔍 loadSample() called');
    console.log('📱 Platform:', Capacitor.getPlatform());
    console.log('📱 Is native:', Capacitor.isNativePlatform());
    
    try {
        setStatus('Loading sample...', true);
        showToast('Loading sample...', 'info');
        
        let content;
        
        if (Capacitor.isNativePlatform()) {
            // Use Asset Manager to read bundled sample.json
            console.log('📦 Reading sample from app bundle using Asset Manager...');
            try {
                const { data } = await AssetManager.read({
                    path: 'public/sample.json',
                    encoding: Encoding.Utf8
                });
                content = data;
                console.log('✅ Asset Manager read successful, size:', content.length);
            } catch (assetError) {
                console.warn('⚠️ Asset Manager failed, trying fallback:', assetError.message);
                // Fallback: use hardcoded sample
                content = JSON.stringify({
                    nodes: [
                        { id: 'A', label: 'Class A', color: '#FF6B6B' },
                        { id: 'B', label: 'Class B', color: '#4ECDC4' },
                        { id: 'C', label: 'Class C', color: '#45B7D1' },
                        { id: 'D', label: 'Class D', color: '#96CEB4' },
                        { id: 'E', label: 'Class E', color: '#FFEAA7' },
                        { id: 'F', label: 'Class F', color: '#DDA0DD' }
                    ],
                    edges: [
                        { from: 'A', to: 'B', label: 'extends' },
                        { from: 'A', to: 'C', label: 'implements' },
                        { from: 'B', to: 'D', label: 'uses' },
                        { from: 'C', to: 'D', label: 'uses' },
                        { from: 'C', to: 'E', label: 'contains' },
                        { from: 'D', to: 'F', label: 'depends' },
                        { from: 'E', to: 'F', label: 'inherits' }
                    ]
                });
                console.log('📦 Using hardcoded sample fallback');
            }
        } else {
            // Web: fetch from server
            console.log('🌐 Loading sample from web...');
            const response = await fetch('sample.json');
            if (!response.ok) {
                throw new Error('sample.json not found, using hardcoded');
            }
            content = await response.text();
            console.log('✅ Web fetch successful, size:', content.length);
        }
        
        const encoder = new TextEncoder();
        const data = encoder.encode(content);
        await loadFile(data, 'sample.json');
        showToast('✅ Sample loaded', 'success');
        
    } catch (error) {
        console.error('❌ Sample load error:', error.message);
        console.error('Stack:', error.stack);
        showToast('Sample error: ' + error.message, 'error');
        setStatus('Error: ' + error.message);
    }
}

// ============================================================
// 7. EXPORT (Using Capacitor Filesystem - free)
// ============================================================
async function exportGraph() {
    console.log('💾 exportGraph() called');
    
    if (!network) {
        showToast('No graph to export', 'error');
        return;
    }
    
    try {
        const data = {
            nodes: nodes.get(),
            edges: edges.get(),
            exportedAt: new Date().toISOString(),
            sourceFile: currentFile || 'unknown'
        };
        
        const json = JSON.stringify(data, null, 2);
        const filename = `graph_${new Date().toISOString().slice(0,10)}.json`;
        console.log('📦 Export data size:', json.length);
        
        if (Capacitor.isNativePlatform()) {
            console.log('📱 Saving to device...');
            await Filesystem.writeFile({
                path: filename,
                data: json,
                directory: Directory.Documents,
                encoding: 'utf8'
            });
            currentFilePath = filename;
            showToast(`✅ Saved to Documents/${filename}`, 'success');
            setStatus(`Exported: ${filename}`);
            console.log('✅ Saved to:', filename);
        } else {
            console.log('🌐 Downloading via browser...');
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            showToast('✅ Graph downloaded', 'success');
            console.log('✅ Download triggered');
        }
    } catch (error) {
        console.error('❌ Export error:', error.message);
        console.error('Stack:', error.stack);
        showToast(`Export failed: ${error.message}`, 'error');
    }
}

// ============================================================
// 8. SHARE (Using Capacitor Share - free)
// ============================================================
async function shareGraph() {
    console.log('📤 shareGraph() called');
    
    if (!network) {
        showToast('No graph to share', 'error');
        return;
    }
    
    try {
        const data = {
            nodes: nodes.get(),
            edges: edges.get(),
            exportedAt: new Date().toISOString(),
            sourceFile: currentFile || 'unknown'
        };
        
        const json = JSON.stringify(data, null, 2);
        
        if (Capacitor.isNativePlatform()) {
            console.log('📱 Sharing via Share plugin...');
            await Share.share({
                title: 'Graph Data',
                text: json,
                dialogTitle: 'Share graph data'
            });
            showToast('✅ Shared!', 'success');
            console.log('✅ Share completed');
        } else {
            console.log('🌐 Web share fallback...');
            // Web fallback: copy to clipboard
            await navigator.clipboard.writeText(json);
            showToast('📋 Graph data copied to clipboard', 'success');
            console.log('✅ Copied to clipboard');
        }
    } catch (error) {
        console.error('❌ Share error:', error.message);
        showToast(`Share failed: ${error.message}`, 'error');
    }
}

// ============================================================
// 9. RESET VIEW
// ============================================================
function resetView() {
    console.log('🔄 resetView() called');
    if (network) {
        network.fit({ animation: true });
        showToast('View reset', 'info');
        console.log('✅ View reset');
    }
}

// ============================================================
// 10. EVENT LISTENERS
// ============================================================
openBtn.addEventListener('click', openFilePicker);
sampleBtn.addEventListener('click', loadSample);
exportBtn.addEventListener('click', exportGraph);
resetBtn.addEventListener('click', resetView);
if (shareBtn) shareBtn.addEventListener('click', shareGraph);

// Click outside context menu to close
document.addEventListener('click', () => {
    contextMenu.style.display = 'none';
});

// ============================================================
// 11. INIT
// ============================================================
console.log('🚀 Grape app starting...');
console.log('📱 Platform:', Capacitor.getPlatform());
console.log('📱 Is native:', Capacitor.isNativePlatform());
setStatus('Ready - Open a file or load sample');
showToast('🚀 Graph Viewer Ready', 'info');

// Auto-load sample for testing
console.log('📦 Auto-loading sample...');
loadSample();
