// www/js/app.js
class GrapeApp {
    constructor() {
        this.parser = new GraphParser();
        this.renderer = null;
        this.currentData = null;
        this.isMenuOpen = false;
        this.debugLines = [];
        this.maxDebugLines = 50;
    }

    init() {
        console.log('🍇 GrapeApp.init() called');
        this.addDebugLog('🍇 Grape app starting...', 'success');
        
        // Check system
        if (typeof checker !== 'undefined' && checker.allGreen) {
            this.addDebugLog('✅ System check passed', 'success');
        } else {
            this.addDebugLog('⚠️ System check not complete', 'warn');
        }
        
        // Setup UI
        this.setupMenu();
        this.setupButtons();
        this.setupFileInput();
        
        // Update status
        this.updateStatus('Ready - tap Sample or Open File');
        this.addDebugLog('🍇 Grape ready!', 'success');
    }

    // --- Toast System (FIXED) ---
    showToast(message, type = 'info') {
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
        
        // Also log to debug console
        this.addDebugLog(`📢 ${message}`, type);
    }

    // --- Debug Console ---
    addDebugLog(message, type = 'info') {
        const debugEl = document.getElementById('debugConsole');
        if (!debugEl) {
            console.log(`[${type}] ${message}`);
            return;
        }
        
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
        
        // Keep only last N lines
        while (debugEl.children.length > this.maxDebugLines) {
            debugEl.removeChild(debugEl.firstChild);
        }
        
        debugEl.scrollTop = debugEl.scrollHeight;
        console.log(`[${type}] ${message}`);
    }

    // --- Status Update ---
    updateStatus(message, isLoading = false) {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            if (isLoading) {
                statusEl.innerHTML = `<span class="loading"></span> ${message}`;
            } else {
                statusEl.textContent = message;
            }
        }
        this.addDebugLog(`📊 ${message}`, 'info');
    }

    // --- Menu Setup ---
    setupMenu() {
        const menuBtn = document.getElementById('menuBtn');
        const menuDropdown = document.getElementById('menuDropdown');
        
        if (!menuBtn || !menuDropdown) {
            console.error('❌ Menu elements not found');
            this.addDebugLog('❌ Menu elements not found', 'error');
            return;
        }
        
        this.addDebugLog('🔧 Setting up menu...', 'debug');
        
        // Toggle menu on button click
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.isMenuOpen = !this.isMenuOpen;
            menuDropdown.style.display = this.isMenuOpen ? 'block' : 'none';
            this.addDebugLog(`📋 Menu ${this.isMenuOpen ? 'opened' : 'closed'}`, 'debug');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isMenuOpen && !menuDropdown.contains(e.target) && e.target !== menuBtn) {
                this.isMenuOpen = false;
                menuDropdown.style.display = 'none';
            }
        });
        
        // Menu items
        const menuLoadURL = document.getElementById('menuLoadURL');
        const menuPickFile = document.getElementById('menuPickFile');
        const menuExport = document.getElementById('menuExport');
        const menuLayout = document.getElementById('menuLayout');
        const menuReset = document.getElementById('menuReset');
        const menuShare = document.getElementById('menuShare');

        if (menuLoadURL) {
            menuLoadURL.addEventListener('click', (e) => {
                e.stopPropagation();
                this.addDebugLog('🌐 Menu: Load from URL clicked', 'info');
                this.loadFromURL();
                this.isMenuOpen = false;
                document.getElementById('menuDropdown').style.display = 'none';
            });
        }
        
        if (menuPickFile) {
            menuPickFile.addEventListener('click', (e) => {
                e.stopPropagation();
                this.addDebugLog('📂 Menu: Open File clicked', 'info');
                this.pickFile();
                this.isMenuOpen = false;
                menuDropdown.style.display = 'none';
            });
        }
        
        if (menuExport) {
            menuExport.addEventListener('click', (e) => {
                e.stopPropagation();
                this.addDebugLog('💾 Menu: Export clicked', 'info');
                this.exportGraph();
                this.isMenuOpen = false;
                menuDropdown.style.display = 'none';
            });
        }

        if (menuLayout) {
            menuLayout.addEventListener('click', (e) => {
                e.stopPropagation();
                this.addDebugLog('📐 Menu: Switch Layout clicked', 'info');
                this.switchLayout();
                this.isMenuOpen = false;
                document.getElementById('menuDropdown').style.display = 'none';
            });
        }
        
        if (menuReset) {
            menuReset.addEventListener('click', (e) => {
                e.stopPropagation();
                this.addDebugLog('🔄 Menu: Reset clicked', 'info');
                this.resetView();
                this.isMenuOpen = false;
                menuDropdown.style.display = 'none';
            });
        }
        
        if (menuShare) {
            menuShare.addEventListener('click', (e) => {
                e.stopPropagation();
                this.addDebugLog('📤 Menu: Share clicked', 'info');
                this.shareGraph();
                this.isMenuOpen = false;
                menuDropdown.style.display = 'none';
            });
        }
        
        this.addDebugLog('✅ Menu setup complete', 'success');
    }

    // --- Buttons Setup ---
    setupButtons() {
        const sampleBtn = document.getElementById('sampleBtn');
        if (sampleBtn) {
            sampleBtn.addEventListener('click', () => {
                this.addDebugLog('📄 Sample button clicked', 'info');
                this.loadSample();
            });
            this.addDebugLog('✅ Sample button bound', 'debug');
        } else {
            this.addDebugLog('❌ sampleBtn not found', 'error');
        }
    }

    // --- File Input Setup ---
    setupFileInput() {
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (!file) return;
                
                this.addDebugLog(`📄 File selected: ${file.name} (${file.size} bytes)`, 'info');
                this.updateStatus(`Loading ${file.name}...`, true);
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    const content = e.target.result;
                    this.addDebugLog(`📖 File read, ${content.length} bytes`, 'info');
                    this.processFileContent(content, file.name, file.type);
                };
                reader.onerror = (e) => {
                    this.addDebugLog(`❌ File read error: ${e.message}`, 'error');
                    this.updateStatus('Error reading file');
                };
                reader.readAsText(file);
                fileInput.value = ''; // Reset
            });
            this.addDebugLog('✅ File input bound', 'debug');
        } else {
            this.addDebugLog('❌ fileInput not found', 'error');
        }
    }

    // --- Process File Content ---
    processFileContent(content, filename, mimeType) {
        this.addDebugLog(`🔍 Processing: ${filename} (${mimeType})`, 'info');
        this.updateStatus(`Parsing ${filename}...`, true);
        
        try {
            // Determine mime type from extension if needed
            if (!mimeType || mimeType === '') {
                const ext = filename.split('.').pop().toLowerCase();
                const mimeMap = {
                    'json': 'application/json',
                    'xml': 'text/xml',
                    'html': 'text/html',
                    'htm': 'text/html',
                    'svg': 'image/svg+xml',
                    'txt': 'text/plain'
                };
                mimeType = mimeMap[ext] || 'application/json';
                this.addDebugLog(`📋 Detected MIME: ${mimeType}`, 'debug');
            }
            
            this.currentData = this.parser.parse(content, mimeType);
            
            if (!this.currentData.nodes || this.currentData.nodes.length === 0) {
                this.addDebugLog('⚠️ No nodes found in parsed data', 'warn');
                this.updateStatus('No graph nodes found');
                return;
            }
            
            this.addDebugLog(`✅ Parsed: ${this.currentData.nodes.length} nodes, ${this.currentData.edges?.length || 0} edges`, 'success');
            this.renderGraph();
            this.updateStatus(`Loaded ${filename} (${this.currentData.nodes.length} nodes)`);
            
        } catch (e) {
            this.addDebugLog(`❌ Parse error: ${e.message}`, 'error');
            this.updateStatus(`Error: ${e.message}`);
        }
    }

    // --- Pick File ---
    async pickFile() {
        this.addDebugLog('📂 Opening file picker...', 'info');
        this.updateStatus('Opening file picker...', true);
        
        const picker = new FilePicker();
        const file = await picker.pickFile();
        
        if (!file) {
            this.addDebugLog('❌ No file selected', 'warn');
            this.updateStatus('No file selected');
            return;
        }

        this.addDebugLog(`📄 Selected: ${file.name} (${file.mimeType})`, 'success');
        this.processFileContent(file.data, file.name, file.mimeType);
    }

    // --- Load Sample ---
    loadSample() {
        this.addDebugLog('📄 Loading sample data...', 'info');
        this.updateStatus('Loading sample...', true);
        
        const sample = {
            nodes: [
                { id: 1, label: 'User', shape: 'box', color: '#FF6B6B' },
                { id: 2, label: 'Order', shape: 'box', color: '#4ECDC4' },
                { id: 3, label: 'Product', shape: 'box', color: '#45B7D1' }
            ],
            edges: [
                { from: 1, to: 2, label: 'places' },
                { from: 2, to: 3, label: 'contains' }
            ]
        };
        
        this.addDebugLog(`📊 Sample: ${sample.nodes.length} nodes, ${sample.edges.length} edges`, 'info');
        this.currentData = sample;
        this.renderGraph();
        this.updateStatus(`Loaded sample (${sample.nodes.length} nodes)`);
        this.addDebugLog('✅ Sample loaded successfully', 'success');
    }

    // --- Load from URL (with better content type handling) ---
    async loadFromURL() {
        const urlInputContainer = document.getElementById('urlInputContainer');
        const urlInput = document.getElementById('urlInput');
        const urlLoadBtn = document.getElementById('urlLoadBtn');
        const urlCancelBtn = document.getElementById('urlCancelBtn');
        
        urlInputContainer.style.display = 'flex';
        urlInput.value = '';
        urlInput.focus();
        this.isMenuOpen = false;
        document.getElementById('menuDropdown').style.display = 'none';
        
        const loadHandler = async () => {
            const url = urlInput.value.trim();
            if (!url) {
                this.addDebugLog('❌ Please enter a URL', 'warn');
                this.showToast('Please enter a URL', 'error');
                return;
            }
            
            this.addDebugLog(`🌐 Loading from URL: ${url}`, 'info');
            this.updateStatus(`Loading from ${url}...`, true);
            
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                // Get content type from response
                let contentType = response.headers.get('content-type') || '';
                // Remove charset if present
                contentType = contentType.split(';')[0].trim();
                this.addDebugLog(`📋 Content-Type: ${contentType}`, 'debug');
                
                // Read as text
                const content = await response.text();
                const filename = url.split('/').pop() || 'remote-file';
                
                this.addDebugLog(`📖 Loaded ${content.length} bytes from URL`, 'info');
                
                // Pass the detected content type
                this.processFileContent(content, filename, contentType);
                urlInputContainer.style.display = 'none';
                
            } catch (e) {
                this.addDebugLog(`❌ URL load error: ${e.message}`, 'error');
                this.updateStatus(`Error: ${e.message}`);
                this.showToast('Failed to load URL: ' + e.message, 'error');
            }
        };
        
        const cancelHandler = () => {
            urlInputContainer.style.display = 'none';
            this.addDebugLog('📋 URL input cancelled', 'debug');
        };
        
        // Clean up old listeners
        const newLoadBtn = urlLoadBtn.cloneNode(true);
        const newCancelBtn = urlCancelBtn.cloneNode(true);
        urlLoadBtn.parentNode.replaceChild(newLoadBtn, urlLoadBtn);
        urlCancelBtn.parentNode.replaceChild(newCancelBtn, urlCancelBtn);
        
        document.getElementById('urlLoadBtn').addEventListener('click', loadHandler);
        document.getElementById('urlCancelBtn').addEventListener('click', cancelHandler);
        
        // Enter/Escape support
        const keyHandler = (e) => {
            if (e.key === 'Enter') loadHandler();
            if (e.key === 'Escape') cancelHandler();
        };
        urlInput.addEventListener('keydown', keyHandler);
    }
    
    // --- Guess MIME type from filename ---
    guessMimeType(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const mimeMap = {
            'json': 'application/json',
            'xml': 'text/xml',
            'html': 'text/html',
            'htm': 'text/html',
            'svg': 'image/svg+xml',
            'txt': 'text/plain',
            'js': 'application/javascript',
            'css': 'text/css',
            'csv': 'text/csv',
            'yaml': 'text/yaml',
            'yml': 'text/yaml',
            'toml': 'application/toml'
        };
        return mimeMap[ext] || 'application/octet-stream';
    }

    // --- Render Graph (FIXED: disable improvedLayout for large graphs) ---
    renderGraph() {
        if (!this.currentData) {
            this.addDebugLog('⚠️ No data to render', 'warn');
            return;
        }
        
        this.addDebugLog(`🎨 Rendering ${this.currentData.nodes.length} nodes...`, 'info');
        this.updateStatus('Rendering graph...', true);
        
        try {
            // Check if large graph (>500 nodes)
            const isLarge = this.currentData.nodes.length > 500;
            if (isLarge) {
                this.addDebugLog('⚠️ Large graph detected, disabling physics for performance', 'warn');
            }
            
            this.renderer = new GraphRenderer('graphContainer');
            this.renderer.render(this.currentData, {
                physics: {
                    enabled: !isLarge,  // Disable physics for large graphs
                    stabilization: false
                },
                layout: {
                    improvedLayout: !isLarge,  // Disable improvedLayout for large graphs
                    randomSeed: 42
                }
            });
            
            const nodeCount = document.getElementById('nodeCount');
            if (nodeCount) {
                nodeCount.textContent = `${this.currentData.nodes.length} nodes`;
            }
            
            this.addDebugLog('✅ Graph rendered successfully', 'success');
            this.updateStatus(`Graph rendered (${this.currentData.nodes.length} nodes)`);
            
        } catch (e) {
            this.addDebugLog(`❌ Render error: ${e.message}`, 'error');
            this.updateStatus(`Render error: ${e.message}`);
        }
    }

    // --- Export Graph (FIXED: uses this.showToast) ---
    async exportGraph() {
        this.addDebugLog('💾 Exporting graph...', 'info');
        if (!this.currentData) {
            this.addDebugLog('⚠️ No graph to export', 'warn');
            this.showToast('No graph to export', 'error');
            return;
        }
        
        try {
            const data = {
                nodes: this.currentData.nodes,
                edges: this.currentData.edges,
                exportedAt: new Date().toISOString()
            };
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `graph_${new Date().toISOString().slice(0,10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            this.addDebugLog('✅ Graph exported successfully', 'success');
            this.showToast('✅ Graph exported', 'success');
        } catch (e) {
            this.addDebugLog(`❌ Export error: ${e.message}`, 'error');
            this.showToast('Export failed: ' + e.message, 'error');
        }
    }

    // --- Switch Layout ---
    switchLayout() {
        if (!this.renderer || !this.renderer.network) {
            this.addDebugLog('⚠️ No graph to switch layout', 'warn');
            this.showToast('No graph to switch layout', 'error');
            return;
        }
        
        // Toggle between hierarchical and force
        const current = this.renderer.currentLayout || 'hierarchical';
        const next = current === 'hierarchical' ? 'force' : 'hierarchical';
        
        this.addDebugLog(`📐 Switching layout to ${next}...`, 'info');
        this.renderer.switchLayout(next);
        this.showToast(`Layout: ${next}`, 'info');
    }

    // --- Reset View (FIXED: uses this.showToast) ---
    resetView() {
        this.addDebugLog('🔄 Resetting view...', 'info');
        if (this.renderer && this.renderer.network) {
            this.renderer.network.fit({ animation: true });
            this.addDebugLog('✅ View reset', 'success');
            this.showToast('View reset', 'info');
        } else {
            this.addDebugLog('⚠️ No graph to reset', 'warn');
        }
    }

    // --- Share Graph ---
    async shareGraph() {
        this.addDebugLog('📤 Sharing graph...', 'info');
        if (!this.currentData) {
            this.addDebugLog('⚠️ No graph to share', 'warn');
            this.showToast('No graph to share', 'error');
            return;
        }
        
        try {
            const data = {
                nodes: this.currentData.nodes,
                edges: this.currentData.edges,
                exportedAt: new Date().toISOString()
            };
            const json = JSON.stringify(data, null, 2);
            
            if (navigator.share) {
                await navigator.share({
                    title: 'Graph Data',
                    text: json,
                });
                this.addDebugLog('✅ Shared!', 'success');
                this.showToast('✅ Shared!', 'success');
            } else {
                await navigator.clipboard.writeText(json);
                this.addDebugLog('📋 Copied to clipboard', 'success');
                this.showToast('📋 Copied to clipboard', 'success');
            }
        } catch (e) {
            if (e.name !== 'AbortError') {
                this.addDebugLog(`❌ Share error: ${e.message}`, 'error');
                this.showToast('Share failed: ' + e.message, 'error');
            }
        }
    }
}

// --- Global addDebugLog for use in other files ---
function addDebugLog(message, type = 'info') {
    if (window.app) {
        window.app.addDebugLog(message, type);
    } else {
        console.log(`[${type}] ${message}`);
        // Fallback: try to write to debug console directly
        const debugEl = document.getElementById('debugConsole');
        if (debugEl) {
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
            while (debugEl.children.length > 50) {
                debugEl.removeChild(debugEl.firstChild);
            }
            debugEl.scrollTop = debugEl.scrollHeight;
        }
    }
}

// --- Start app ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM ready, starting GrapeApp...');
    window.app = new GrapeApp();
    window.app.init();
});
