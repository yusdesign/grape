// www/js/app.js
class GrapeApp {
    constructor() {
        this.parser = new GraphParser();
        this.renderer = null;
        this.currentData = null;
    }

    init() {
        console.log('🍇 GrapeApp.init() called');
        if (!checker || !checker.allGreen) {
            console.warn('⚠️ System not ready, waiting...');
            document.getElementById('status').textContent = '⚠️ System not ready';
            return;
        }

        const pickBtn = document.getElementById('pickFileBtn');
        const sampleBtn = document.getElementById('sampleBtn');
        
        if (pickBtn) {
            pickBtn.addEventListener('click', () => this.pickFile());
            console.log('✅ Pick button bound');
        } else {
            console.error('❌ pickFileBtn not found');
        }
        
        if (sampleBtn) {
            sampleBtn.addEventListener('click', () => this.loadSample());
            console.log('✅ Sample button bound');
        } else {
            console.error('❌ sampleBtn not found');
        }
        
        console.log('🍇 grape ready!');
    }

    async pickFile() {
        console.log('📂 pickFile() called');
        const picker = new FilePicker();
        const file = await picker.pickFile();
        
        if (!file) {
            console.log('❌ No file selected');
            document.getElementById('status').textContent = 'No file selected';
            return;
        }

        console.log('📄 File selected:', file.name, 'MIME:', file.mimeType);
        document.getElementById('status').textContent = `Loading ${file.name}...`;
        
        try {
            console.log('🔍 Parsing file content...');
            this.currentData = this.parser.parse(file.data, file.mimeType);
            console.log('✅ Parse complete:', this.currentData);
            
            if (!this.currentData.nodes || this.currentData.nodes.length === 0) {
                console.warn('⚠️ No nodes found in parsed data');
                document.getElementById('status').textContent = 'No graph nodes found';
                return;
            }
            
            this.renderGraph();
            document.getElementById('status').textContent = `Loaded ${file.name} (${this.currentData.nodes.length} nodes)`;
            console.log(`✅ Loaded ${file.name} with ${this.currentData.nodes.length} nodes and ${this.currentData.edges?.length || 0} edges`);
        } catch (e) {
            console.error('❌ Error loading file:', e.message);
            document.getElementById('status').textContent = `Error: ${e.message}`;
            // Show error in debug console
            const debugEl = document.getElementById('debugConsole');
            if (debugEl) {
                const msg = document.createElement('div');
                msg.style.color = '#ff4444';
                msg.textContent = `[ERROR] ${e.message}`;
                debugEl.appendChild(msg);
                debugEl.scrollTop = debugEl.scrollHeight;
            }
        }
    }

    loadSample() {
        console.log('📄 loadSample() called');
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
        console.log('✅ Sample loaded');
    }

    renderGraph() {
        console.log('🎨 renderGraph() called');
        if (!this.currentData) {
            console.warn('⚠️ No data to render');
            return;
        }
        console.log('📊 Rendering:', this.currentData.nodes.length, 'nodes,', this.currentData.edges?.length || 0, 'edges');
        
        this.renderer = new GraphRenderer('graphContainer');
        this.renderer.render(this.currentData);
        document.getElementById('nodeCount').textContent = `${this.currentData.nodes.length} nodes`;
        console.log('✅ Graph rendered');
    }
}

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM ready, starting GrapeApp...');
    const app = new GrapeApp();
    app.init();
});
