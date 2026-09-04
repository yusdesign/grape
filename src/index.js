import { FilePicker } from '@capawesome/capacitor-file-picker';
import { FileOpener } from '@capawesome-team/capacitor-file-opener';
import { Capacitor } from '@capacitor/core';
import { DataSet, Network } from 'vis-network';

// --- DOM Elements ---
const container = document.getElementById('graphContainer');
const statusEl = document.getElementById('status');
const nodeCountEl = document.getElementById('nodeCount');
const openBtn = document.getElementById('openFileBtn');
const sampleBtn = document.getElementById('sampleFileBtn');
const exportBtn = document.getElementById('exportBtn');
const resetBtn = document.getElementById('resetViewBtn');
const contextMenu = document.getElementById('contextMenu');
const contextContent = document.getElementById('contextMenuContent');

// --- State ---
let network = null;
let nodes = null;
let edges = null;
let currentFile = null;
let graphData = null;

// --- Toast System ---
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

// --- Status Update ---
function setStatus(message, isLoading = false) {
    if (isLoading) {
        statusEl.innerHTML = `<span class="loading"></span> ${message}`;
    } else {
        statusEl.textContent = message;
    }
}

// --- 1. FILE LOADING ---
async function loadFile(fileData, filename) {
    try {
        setStatus('Loading file...', true);
        
        const content = new TextDecoder('utf-8').decode(fileData);
        currentFile = filename;
        
        setStatus(`Parsing ${filename}...`, true);
        const parsed = parseContent(content, filename);
        
        if (parsed) {
            graphData = parsed;
            renderGraph(parsed);
            setStatus(`Loaded: ${filename} (${parsed.nodes.length} nodes, ${parsed.edges.length} edges)`);
            showToast(`✅ Loaded ${filename}`, 'success');
        }
    } catch (error) {
        console.error('Load error:', error);
        setStatus(`❌ Error: ${error.message}`);
        showToast(`Error: ${error.message}`, 'error');
    }
}

// --- 2. FILE PICKER (Updated for Capacitor 8) ---
async function openFilePicker() {
    try {
        setStatus('Opening file picker...', true);
        
        const result = await FilePicker.pickFiles({
            types: ['application/json', 'text/xml', 'text/html', 'image/svg+xml', 'text/plain'],
            limit: 1,
            readData: false
        });

        if (result.files && result.files.length > 0) {
            const file = result.files[0];
            
            let fileData;
            if (Capacitor.isNativePlatform()) {
                // Capacitor 8 uses convertFileSrc differently
                const fileUrl = Capacitor.convertFileSrc(file.path);
                const response = await fetch(fileUrl);
                const blob = await response.blob();
                const arrayBuffer = await blob.arrayBuffer();
                fileData = new Uint8Array(arrayBuffer);
            } else {
                const arrayBuffer = await file.blob.arrayBuffer();
                fileData = new Uint8Array(arrayBuffer);
            }
            
            await loadFile(fileData, file.name);
        }
    } catch (error) {
        if (!error.message?.includes('cancel')) {
            showToast(`Picker error: ${error.message}`, 'error');
            setStatus(`Error: ${error.message}`);
        }
    }
}

// --- 3. PARSERS ---
function parseContent(content, filename) {
    const ext = filename.split('.').pop().toLowerCase();
    
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
    
    // Expected: { nodes: [{id, label}], edges: [{from, to}] }
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

// --- 4. RENDERER ---
function renderGraph(data) {
    const styledNodes = data.nodes.map(n => ({
        ...n,
        shape: 'dot',
        size: 25,
        font: { size: 14, face: 'Arial', color: '#1a2332' },
        color: {
            background: '#97C2FC',
            border: '#2B7CE9',
            highlight: { background: '#D2E5FF', border: '#2B7CE9' }
        },
        borderWidth: 2
    }));
    
    const styledEdges = data.edges.map(e => ({
        ...e,
        arrows: 'to',
        smooth: { type: 'curvedCW', roundness: 0.2 },
        color: { color: '#848484', highlight: '#2B7CE9' },
        width: 1.5
    }));
    
    nodes = new DataSet(styledNodes);
    edges = new DataSet(styledEdges);
    
    const options = {
        nodes: {
            shape: 'dot',
            size: 25,
            font: { size: 14, face: 'Arial', color: '#1a2332' },
            borderWidth: 2,
            shadow: true
        },
        edges: {
            arrows: 'to',
            smooth: { type: 'curvedCW', roundness: 0.2 },
            width: 1.5,
            color: { color: '#848484', highlight: '#2B7CE9' }
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
    
    // Auto-fit after stabilization
    setTimeout(() => {
        network.fit();
    }, 500);
}

// --- 5. CONTEXT MENU ---
function showContextMenu(x, y, node) {
    contextContent.innerHTML = `
        <div style="font-weight:bold;margin-bottom:8px;">${node.label}</div>
        <div style="font-size:12px;color:#666;margin-bottom:8px;">ID: ${node.id}</div>
        <button onclick="window.copyNodeId('${node.id}')" style="width:100%;padding:4px;background:#3498db;color:white;border:none;border-radius:4px;cursor:pointer;">Copy ID</button>
        <button onclick="window.focusNode('${node.id}')" style="width:100%;margin-top:4px;padding:4px;background:#2ecc71;color:white;border:none;border-radius:4px;cursor:pointer;">Focus</button>
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

// --- 6. SAMPLE DATA ---
function loadSample() {
    const sample = {
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
    };
    
    const json = JSON.stringify(sample);
    const encoder = new TextEncoder();
    const data = encoder.encode(json);
    loadFile(data, 'sample.json');
}

// --- 7. EXPORT (Updated for Capacitor 8) ---
async function exportGraph() {
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
        const blob = new Blob([json], { type: 'application/json' });
        const filename = `graph_${new Date().toISOString().slice(0,10)}.json`;
        
        // For Web, use download link
        if (!Capacitor.isNativePlatform()) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            showToast('✅ Graph downloaded', 'success');
            return;
        }
        
        // For native, use FileOpener to save
        // First, we need to save the file to a temporary location
        const tempPath = `${Capacitor.getFilesDirectory()}${filename}`;
        // You'd need to use Filesystem plugin here, or implement a save dialog
        showToast('Native export: Use Filesystem plugin', 'info');
        
    } catch (error) {
        showToast(`Export failed: ${error.message}`, 'error');
    }
}

// --- 8. RESET VIEW ---
function resetView() {
    if (network) {
        network.fit({ animation: true });
        showToast('View reset', 'info');
    }
}

// --- 9. EVENT LISTENERS ---
openBtn.addEventListener('click', openFilePicker);
sampleBtn.addEventListener('click', loadSample);
exportBtn.addEventListener('click', exportGraph);
resetBtn.addEventListener('click', resetView);

// Click outside context menu to close
document.addEventListener('click', () => {
    contextMenu.style.display = 'none';
});

// --- 10. INIT ---
setStatus('Ready - Open a file or load sample');
showToast('🚀 Graph Viewer Ready', 'info');

// --- 11. OPEN FILE WITH DEFAULT APP (Using File Opener) ---
async function openWithDefaultApp(filePath) {
    try {
        await FileOpener.openFile({
            path: filePath,
            // mimeType: 'application/json' // Optional: specify MIME type
        });
        showToast('Opening file...', 'success');
    } catch (error) {
        showToast(`Failed to open: ${error.message}`, 'error');
    }
}

// Auto-load sample for testing
loadSample(); // Comment to disable
