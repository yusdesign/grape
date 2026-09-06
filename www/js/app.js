// www/js/app.js
class GrapeApp {
    constructor() {
        this.parser = new GraphParser();
        this.renderer = null;
        this.currentData = null;
    }

    init() {
        if (!checker.allGreen) {
            document.getElementById('status').textContent = '⚠️ System not ready';
            return;
        }

        document.getElementById('pickFileBtn').addEventListener('click', () => this.pickFile());
        document.getElementById('sampleBtn').addEventListener('click', () => this.loadSample());
        console.log('🍇 grape ready!');
    }

    async pickFile() {
        const picker = new FilePicker();
        const file = await picker.pickFile();
        if (!file) {
            document.getElementById('status').textContent = 'No file selected';
            return;
        }

        document.getElementById('status').textContent = `Loading ${file.name}...`;
        try {
            this.currentData = this.parser.parse(file.data, file.mimeType);
            this.renderGraph();
            document.getElementById('status').textContent = `Loaded ${file.name} (${this.currentData.nodes.length} nodes)`;
        } catch (e) {
            document.getElementById('status').textContent = `Error: ${e.message}`;
            console.error(e);
        }
    }

    loadSample() {
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
        this.currentData = sample;
        this.renderGraph();
        document.getElementById('status').textContent = `Loaded sample (${sample.nodes.length} nodes)`;
    }

    renderGraph() {
        if (!this.currentData) return;
        this.renderer = new GraphRenderer('graphContainer');
        this.renderer.render(this.currentData);
        document.getElementById('nodeCount').textContent = `${this.currentData.nodes.length} nodes`;
    }
}

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new GrapeApp();
    app.init();
});
