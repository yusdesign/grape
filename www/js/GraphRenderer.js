// www/js/GraphRenderer.js
class GraphRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.network = null;
        this.nodes = new vis.DataSet();
        this.edges = new vis.DataSet();
        this.currentLayout = 'hierarchical'; // default
    }

    render(graphData, options = {}) {
        this.nodes.clear();
        this.edges.clear();

        // Auto-detect if this looks like a UML graph (has class/type info)
        const isUML = this.detectUML(graphData);
        
        // Apply default styling based on type
        this.applyNodeStyling(graphData, isUML);

        this.nodes.add(graphData.nodes);
        this.edges.add(graphData.edges);

        const isLarge = graphData.nodes.length > 500;

        const layoutOptions = {
            hierarchical: {
                enabled: !isLarge && (options.hierarchical !== false),
                direction: 'UD',        // Up-Down (like UML inheritance)
                sortMethod: 'directed',
                nodeSpacing: 150,
                levelSeparation: 200,
                treeSpacing: 200,
                blockShifting: true,
                edgeMinimization: true,
                parentCentralization: true
            },
            randomSeed: 42,
            improvedLayout: !isLarge
        };

        // If user wants force layout instead
        if (options.layout === 'force') {
            layoutOptions.hierarchical.enabled = false;
        }

        const defaultOptions = {
            nodes: {
                shape: 'box',
                margin: 10,
                font: { 
                    size: 14, 
                    face: 'Arial',
                    color: '#e6edf3'
                },
                borderWidth: 2,
                shadow: true,
                widthConstraint: {
                    minimum: 80,
                    maximum: 200
                }
            },
            edges: {
                arrows: { to: { enabled: true, scaleFactor: 0.8 } },
                smooth: { type: 'cubicBezier', roundness: 0.2 },
                font: {
                    size: 10,
                    color: '#8b949e',
                    face: 'Arial',
                    align: 'middle'
                },
                color: { color: '#484f58', highlight: '#58a6ff' },
                width: 1.5
            },
            physics: {
                enabled: !isLarge,
                stabilization: { iterations: isLarge ? 0 : 100 },
                solver: 'forceAtlas2Based',
                forceAtlas2Based: {
                    gravitationalConstant: -50,
                    centralGravity: 0.01,
                    springLength: 120,
                    springConstant: 0.08,
                    damping: 0.4
                }
            },
            layout: layoutOptions,
            interaction: {
                hover: true,
                tooltipDelay: 200,
                zoomView: true,
                dragView: true,
                navigationButtons: true,
                multiselect: true
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
                // If hierarchical, center the root
                if (layoutOptions.hierarchical.enabled) {
                    this.centerRoot();
                }
            }
        }, 200);

        return this.network;
    }

    // --- Detect UML-like graphs ---
    detectUML(graphData) {
        if (!graphData.nodes || graphData.nodes.length === 0) return false;
        
        // Check for UML indicators
        const umlKeywords = ['class', 'interface', 'enum', 'abstract', 'extends', 'implements', 'association', 'aggregation', 'composition'];
        let umlScore = 0;
        
        graphData.nodes.forEach(node => {
            const label = (node.label || '').toLowerCase();
            const type = (node.type || '').toLowerCase();
            if (umlKeywords.some(keyword => label.includes(keyword) || type.includes(keyword))) {
                umlScore++;
            }
            // Check for stereotype notation «...»
            if (label.includes('«') || label.includes('»')) umlScore++;
        });
        
        // Check edges for UML relationships
        if (graphData.edges) {
            graphData.edges.forEach(edge => {
                const label = (edge.label || '').toLowerCase();
                if (umlKeywords.some(keyword => label.includes(keyword))) {
                    umlScore++;
                }
            });
        }
        
        return umlScore > graphData.nodes.length * 0.2; // 20% UML keywords threshold
    }

    // --- Apply styling based on node type ---
    applyNodeStyling(graphData, isUML) {
        const colorMap = {
            'class': { background: '#1f6feb', border: '#58a6ff' },
            'interface': { background: '#1a7f37', border: '#3fb950' },
            'enum': { background: '#9e6a03', border: '#d29922' },
            'abstract': { background: '#6f42c1', border: '#bc8cff' },
            'default': { background: '#1c2333', border: '#58a6ff' }
        };

        graphData.nodes.forEach(node => {
            // If UML mode, apply specific shapes
            if (isUML) {
                node.shape = 'box';
                node.borderWidth = 2;
                
                // Set colors based on type
                const type = (node.type || 'default').toLowerCase();
                const colors = colorMap[type] || colorMap.default;
                node.color = {
                    background: colors.background,
                    border: colors.border,
                    highlight: {
                        background: colors.border,
                        border: colors.background
                    }
                };
                
                // Add stereotype if present
                if (node.stereotype) {
                    node.label = `«${node.stereotype}»\n${node.label}`;
                }
            }
            
            // Ensure label is visible
            if (!node.font) {
                node.font = { color: '#e6edf3' };
            }
        });
    }

    // --- Center the root node in hierarchical layout ---
    centerRoot() {
        if (!this.network) return;
        // Find root nodes (nodes with no incoming edges)
        const incoming = new Set();
        this.edges.forEach(edge => {
            incoming.add(edge.to);
        });
        
        let rootNodes = this.nodes.get().filter(node => !incoming.has(node.id));
        if (rootNodes.length === 0) {
            // If no root found, use the first node
            const allNodes = this.nodes.get();
            if (allNodes.length > 0) {
                rootNodes = [allNodes[0]];
            }
        }
        
        if (rootNodes.length > 0) {
            this.network.focus(rootNodes[0].id, { scale: 0.8, animation: true });
        }
    }

    // --- Switch layout between hierarchical and force ---
    switchLayout(type) {
        if (!this.network) return;
        
        const currentData = {
            nodes: this.nodes.get(),
            edges: this.edges.get()
        };
        
        // Determine which layout to use
        const isHierarchical = type === 'hierarchical' || (type === 'auto' && this.detectUML(currentData));
        
        // Update options
        const options = {
            layout: {
                hierarchical: {
                    enabled: isHierarchical,
                    direction: 'UD',
                    sortMethod: 'directed',
                    nodeSpacing: 150,
                    levelSeparation: 200,
                    treeSpacing: 200,
                    blockShifting: true,
                    edgeMinimization: true,
                    parentCentralization: true
                },
                randomSeed: 42,
                improvedLayout: true
            },
            physics: {
                enabled: !isHierarchical,
                stabilization: { iterations: 100 },
                solver: 'forceAtlas2Based',
                forceAtlas2Based: {
                    gravitationalConstant: -50,
                    centralGravity: 0.01,
                    springLength: 120,
                    springConstant: 0.08,
                    damping: 0.4
                }
            }
        };
        
        if (!isHierarchical) {
            options.layout.hierarchical.enabled = false;
        }
        
        this.network.setOptions(options);
        this.currentLayout = isHierarchical ? 'hierarchical' : 'force';
        
        // Refit after layout change
        setTimeout(() => {
            if (this.network) {
                this.network.fit();
                if (isHierarchical) {
                    this.centerRoot();
                }
            }
        }, 500);
        
        addDebugLog(`🔄 Switched to ${isHierarchical ? 'hierarchical' : 'force'} layout`, 'info');
    }

    // --- Export methods ---
    async exportPNG() {
        if (typeof html2canvas !== 'undefined') {
            return await html2canvas(this.container);
        }
        console.warn('html2canvas not available');
        return null;
    }
}
