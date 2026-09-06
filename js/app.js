// www/js/app.js
// Fallback if addDebugLog is not defined globally
if (typeof addDebugLog === 'undefined') {
    window.addDebugLog = function(message, type = 'info') {
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
        while (debugEl.children.length > 50) {
            debugEl.removeChild(debugEl.firstChild);
        }
        debugEl.scrollTop = debugEl.scrollHeight;
        console.log(`[${type}] ${message}`);
    };
    console.log('✅ addDebugLog fallback defined in app.js');
}

class GrapeApp {
    constructor() {
        this.parser = new GraphParser();
        this.renderer = null;
        this.currentData = null;
        this.isMenuOpen = false;
    }

    init() {
        console.log('🍇 GrapeApp.init() called');
        addDebugLog('🍇 Grape app starting...', 'success');
        
        if (!checker || !checker.allGreen) {
            console.warn('⚠️ System not ready, waiting...');
            addDebugLog('⚠️ System not ready', 'warn');
            document.getElementById('status').textContent = '⚠️ System not ready';
            return;
        }

        // Setup hamburger menu
        this.setupMenu();
        
        // Setup buttons
        const sampleBtn = document.getElementById('sampleBtn');
        if (sampleBtn) {
            sampleBtn.addEventListener('click', () => this.loadSample());
            console.log('✅ Sample button bound');
        } else {
            console.error('❌ sampleBtn not found');
        }
        
        console.log('🍇 grape ready!');
        addDebugLog('🍇 Grape ready!', 'success');
    }

    setupMenu() {
        const menuBtn = document.getElementById('menuBtn');
        const menuDropdown = document.getElementById('menuDropdown');
        
        if (menuBtn && menuDropdown) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.isMenuOpen = !this.isMenuOpen;
                menuDropdown.style.display = this.isMenuOpen ? 'block' : 'none';
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', () => {
                this.isMenuOpen = false;
                menuDropdown.style.display = 'none';
            });
            
            // Menu items
            document.getElementById('menuPickFile').addEventListener('click', () => {
                this.pickFile();
                this.isMenuOpen = false;
                menuDropdown.style.display = 'none';
            });
            
            document.getElementById('menuExport').addEventListener('click', () => {
                this.exportGraph();
                this.isMenuOpen = false;
                menuDropdown.style.display = 'none';
            });
            
            document.getElementById('menuReset').addEventListener('click', () => {
                this.resetView();
                this.isMenuOpen = false;
                menuDropdown.style.display = 'none';
            });
            
            document.getElementById('menuShare').addEventListener('click', () => {
                this.shareGraph();
                this.isMenuOpen = false;
                menuDropdown.style.display = 'none';
            });
            
            console.log('✅ Menu setup complete');
        } else {
            console.warn('⚠️ Menu elements not found');
        }
    }

    async pickFile() {
        console.log('📂 pickFile() called');
        addDebugLog('📂 Opening file picker...', 'info');
        const picker = new FilePicker();
        const file = await picker.pickFile();
        
        if (!file) {
            console.log('❌ No file selected');
            addDebugLog('❌ No file selected', 'error');
            document.getElementById('status').textContent = 'No file selected';
            return;
        }

        console.log('📄 File selected:', file.name, 'MIME:', file.mimeType);
        addDebugLog(`📄 Selected: ${file.name}`, 'info');
        document.getElementById('status').textContent = `Loading ${file.name}...`;
        
        try {
            console.log('🔍 Parsing file content...');
            addDebugLog('🔍 Parsing content...', 'info');
            this.currentData = this.parser.parse(file.data, file.mimeType);
            console.log('✅ Parse complete:', this.currentData);
            
            if (!this.currentData.nodes || this.currentData.nodes.length === 0) {
                console.warn('⚠️ No nodes found in parsed data');
                addDebugLog('⚠️ No nodes found in file', 'warn');
                document.getElementById('status').textContent = 'No graph nodes found';
                return;
            }
            
            this.renderGraph();
            document.getElementById('status').textContent = `Loaded ${file.name} (${this.currentData.nodes.length} nodes)`;
            console.log(`✅ Loaded ${file.name} with ${this.currentData.nodes.length} nodes and ${this.currentData.edges?.length || 0} edges`);
            addDebugLog(`✅ Loaded ${this.currentData.nodes.length} nodes`, 'success');
        } catch (e) {
            console.error('❌ Error loading file:', e.message);
            addDebugLog('❌ Error: ' + e.message, 'error');
            document.getElementById('status').textContent = `Error: ${e.message}`;
        }
    }

    loadSample() {
        console.log('📄 loadSample() called');
        addDebugLog('📄 Loading sample...', 'info');
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
        console.log('📊 Sample data:', sample);
        this.currentData = sample;
        this.renderGraph();
        document.getElementById('status').textContent = `Loaded sample (${sample.nodes.length} nodes)`;
        addDebugLog(`✅ Sample loaded (${sample.nodes.length} nodes)`, 'success');
    }

    renderGraph() {
        console.log('🎨 renderGraph() called');
        if (!this.currentData) {
            console.warn('⚠️ No data to render');
            addDebugLog('⚠️ No data to render', 'warn');
            return;
        }
        console.log('📊 Rendering:', this.currentData.nodes.length, 'nodes,', this.currentData.edges?.length || 0, 'edges');
        addDebugLog(`🎨 Rendering ${this.currentData.nodes.length} nodes...`, 'info');
        
        this.renderer = new GraphRenderer('graphContainer');
        this.renderer.render(this.currentData);
        document.getElementById('nodeCount').textContent = `${this.currentData.nodes.length} nodes`;
        console.log('✅ Graph rendered');
        addDebugLog('✅ Graph rendered', 'success');
    }

    async exportGraph() {
        console.log('💾 exportGraph() called');
        addDebugLog('💾 Exporting graph...', 'info');
        if (!this.currentData) {
            addDebugLog('⚠️ No graph to export', 'warn');
            showToast('No graph to export', 'error');
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
            addDebugLog('✅ Graph exported', 'success');
            showToast('✅ Graph exported', 'success');
        } catch (e) {
            console.error('❌ Export error:', e.message);
            addDebugLog('❌ Export error: ' + e.message, 'error');
            showToast('Export failed: ' + e.message, 'error');
        }
    }

    resetView() {
        console.log('🔄 resetView() called');
        addDebugLog('🔄 Resetting view', 'info');
        if (this.renderer && this.renderer.network) {
            this.renderer.network.fit({ animation: true });
            showToast('View reset', 'info');
            addDebugLog('✅ View reset', 'success');
        }
    }

    async shareGraph() {
        console.log('📤 shareGraph() called');
        addDebugLog('📤 Sharing graph...', 'info');
        if (!this.currentData) {
            addDebugLog('⚠️ No graph to share', 'warn');
            showToast('No graph to share', 'error');
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
                addDebugLog('✅ Shared!', 'success');
                showToast('✅ Shared!', 'success');
            } else {
                await navigator.clipboard.writeText(json);
                addDebugLog('📋 Copied to clipboard', 'success');
                showToast('📋 Copied to clipboard', 'success');
            }
        } catch (e) {
            if (e.name !== 'AbortError') {
                console.error('❌ Share error:', e.message);
                addDebugLog('❌ Share error: ' + e.message, 'error');
                showToast('Share failed: ' + e.message, 'error');
            }
        }
    }
}

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM ready, starting GrapeApp...');
    const app = new GrapeApp();
    app.init();
    window.app = app; // For debugging
});
