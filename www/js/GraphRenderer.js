// www/js/GraphRenderer.js
class GraphRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.network = null;
        this.nodes = new vis.DataSet();
        this.edges = new vis.DataSet();
    }

    render(graphData, options = {}) {
        this.nodes.clear();
        this.edges.clear();

        this.nodes.add(graphData.nodes);
        this.edges.add(graphData.edges);

        // Detect large graph
        const isLarge = graphData.nodes.length > 500;

        const defaultOptions = {
            nodes: {
                shape: 'box',
                margin: 10,
                font: { size: 14 },
                borderWidth: 2,
                shadow: true
            },
            edges: {
                arrows: { to: { enabled: true } },
                smooth: { type: 'cubicBezier' }
            },
            physics: {
                enabled: !isLarge,
                stabilization: { iterations: isLarge ? 0 : 100 }
            },
            layout: {
                improvedLayout: !isLarge,
                randomSeed: 42
            },
            interaction: {
                zoomView: true,
                dragView: true,
                navigationButtons: true
            }
        };

        this.network = new vis.Network(
            this.container,
            { nodes: this.nodes, edges: this.edges },
            { ...defaultOptions, ...options }
        );

        // Auto-fit after render
        setTimeout(() => {
            if (this.network) {
                this.network.fit();
            }
        }, 100);

        return this.network;
    }

    async exportPNG() {
        if (typeof html2canvas !== 'undefined') {
            return await html2canvas(this.container);
        }
        console.warn('html2canvas not available');
        return null;
    }
}
