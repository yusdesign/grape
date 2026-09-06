// www/js/GraphRenderer.js
class GraphRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.network = null;
        this.nodes = new vis.DataSet();
        this.edges = new vis.DataSet();
        this.currentLayout = 'hierarchical';
        this.editMode = false;
        this.selectedNodeId = null;
        this.selectedEdgeId = null;
    }

    render(graphData, options = {}) {
        this.nodes.clear();
        this.edges.clear();

        const isUML = this.detectUML(graphData);
        this.applyNodeStyling(graphData, isUML);

        this.nodes.add(graphData.nodes);
        this.edges.add(graphData.edges);

        const isLarge = graphData.nodes.length > 500;

        const layoutOptions = {
            hierarchical: {
                enabled: !isLarge && (options.hierarchical !== false),
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
            improvedLayout: !isLarge
        };

        if (options.layout === 'force') {
            layoutOptions.hierarchical.enabled = false;
        }

        // --- EDITING CONFIGURATION ---
        const manipulationOptions = {
            enabled: false, // Turned on/off via toggleEditMode()
            initiallyActive: false,
            addNode: true,
            addEdge: true,
            editNode: true,
            editEdge: true,
            deleteNode: true,
            deleteEdge: true,
            controlNodeStyle: {
                shape: 'circle',
                size: 15,
                color: {
                    background: '#58a6ff',
                    border: '#1f6feb',
                    highlight: {
                        background: '#79c0ff',
                        border: '#58a6ff'
                    }
                }
            }
        };

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
                multiselect: true,
                dragNodes: true,
                dragView: true,
                hideEdgesOnDrag: false,
                hideNodesOnDrag: false
            },
            manipulation: manipulationOptions
        };

        this.network = new vis.Network(
            this.container,
            { nodes: this.nodes, edges: this.edges },
            { ...defaultOptions, ...options }
        );

        // --- Setup editing events ---
        this.setupEditEvents();

        // Auto-fit after render
        setTimeout(() => {
            if (this.network) {
                this.network.fit();
                if (layoutOptions.hierarchical.enabled) {
                    this.centerRoot();
                }
            }
        }, 200);

        return this.network;
    }

    // --- Setup edit events ---
    setupEditEvents() {
        if (!this.network) return;

        // Node selection
        this.network.on('click', (params) => {
            if (params.nodes.length > 0) {
                this.selectedNodeId = params.nodes[0];
                this.selectedEdgeId = null;
                const node = this.nodes.get(this.selectedNodeId);
                addDebugLog(`📌 Selected node: ${node.label || node.id}`, 'info');
            } else if (params.edges.length > 0) {
                this.selectedEdgeId = params.edges[0];
                this.selectedNodeId = null;
                const edge = this.edges.get(this.selectedEdgeId);
                addDebugLog(`🔗 Selected edge: ${edge.label || edge.id}`, 'info');
            } else {
                this.selectedNodeId = null;
                this.selectedEdgeId = null;
            }
        });

        // Double-click to edit node
        this.network.on('doubleClick', (params) => {
            if (params.nodes.length > 0 && this.editMode) {
                const nodeId = params.nodes[0];
                this.editNode(nodeId);
            }
        });

        // Right-click context menu
        this.network.on('oncontext', (params) => {
            params.event.preventDefault();
            if (params.nodes.length > 0 && this.editMode) {
                const nodeId = params.nodes[0];
                this.showNodeContextMenu(params.event.clientX, params.event.clientY, nodeId);
            }
        });
    }

    // --- Toggle edit mode ---
    toggleEditMode() {
        if (!this.network) return false;
        
        this.editMode = !this.editMode;
        this.network.setOptions({
            manipulation: {
                enabled: this.editMode,
                addNode: true,
                addEdge: true,
                editNode: true,
                editEdge: true,
                deleteNode: true,
                deleteEdge: true
            }
        });
        
        // Show/hide navigation buttons based on edit mode
        this.network.setOptions({
            interaction: {
                navigationButtons: !this.editMode
            }
        });
        
        addDebugLog(`✏️ Edit mode ${this.editMode ? 'enabled' : 'disabled'}`, 'info');
        return this.editMode;
    }

    // --- Edit node (show prompt) ---
    editNode(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return;
        
        const newLabel = prompt('Edit node label:', node.label || node.id);
        if (newLabel !== null && newLabel.trim()) {
            this.nodes.update({ id: nodeId, label: newLabel.trim() });
            addDebugLog(`✏️ Updated node: ${newLabel.trim()}`, 'success');
        }
    }

    // --- Show context menu for node ---
    showNodeContextMenu(x, y, nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return;
        
        const menu = document.getElementById('contextMenu');
        const content = document.getElementById('contextMenuContent');
        
        content.innerHTML = `
            <div style="font-weight:bold;margin-bottom:8px;color:#e6edf3;">${node.label || node.id}</div>
            <button onclick="window.app.renderer.editNode('${nodeId}')" style="width:100%;padding:4px;background:#58a6ff;color:#fff;border:none;border-radius:4px;cursor:pointer;margin-bottom:4px;">✏️ Edit</button>
            <button onclick="window.app.renderer.deleteNode('${nodeId}')" style="width:100%;padding:4px;background:#f85149;color:#fff;border:none;border-radius:4px;cursor:pointer;">🗑️ Delete</button>
        `;
        
        menu.style.display = 'block';
        menu.style.left = `${Math.min(x, window.innerWidth - 200)}px`;
        menu.style.top = `${Math.min(y, window.innerHeight - 150)}px`;
    }

    // --- Delete node ---
    deleteNode(nodeId) {
        if (confirm('Delete this node and its connected edges?')) {
            this.nodes.remove(nodeId);
            addDebugLog(`🗑️ Deleted node: ${nodeId}`, 'info');
            document.getElementById('contextMenu').style.display = 'none';
        }
    }

    // --- Add node at position ---
    addNodeAt(x, y) {
        if (!this.network || !this.editMode) return;
        
        const pos = this.network.getScreenToCanvas({ x, y });
        const newNode = {
            id: `node_${Date.now()}`,
            label: 'New Node',
            x: pos.x,
            y: pos.y,
            shape: 'box',
            color: {
                background: '#1f6feb',
                border: '#58a6ff'
            }
        };
        this.nodes.add(newNode);
        addDebugLog(`➕ Added new node at (${pos.x}, ${pos.y})`, 'success');
        return newNode;
    }

    // --- Export as JSON ---
    exportGraph() {
        return {
            nodes: this.nodes.get(),
            edges: this.edges.get(),
            metadata: {
                exportedAt: new Date().toISOString(),
                nodeCount: this.nodes.length,
                edgeCount: this.edges.length,
                layout: this.currentLayout
            }
        };
    }

    // --- Import from JSON ---
    importGraph(data) {
        if (data.nodes && data.edges) {
            this.nodes.clear();
            this.edges.clear();
            this.nodes.add(data.nodes);
            this.edges.add(data.edges);
            
            // Re-render with current settings
            const currentData = {
                nodes: this.nodes.get(),
                edges: this.edges.get()
            };
            this.render(currentData);
            addDebugLog(`📥 Imported graph: ${data.nodes.length} nodes, ${data.edges.length} edges`, 'success');
            return true;
        }
        return false;
    }

    // --- Detect UML-like graphs ---
    detectUML(graphData) {
        if (!graphData.nodes || graphData.nodes.length === 0) return false;
        
        const umlKeywords = ['class', 'interface', 'enum', 'abstract', 'extends', 'implements', 'association', 'aggregation', 'composition'];
        let umlScore = 0;
        
        graphData.nodes.forEach(node => {
            const label = (node.label || '').toLowerCase();
            const type = (node.type || '').toLowerCase();
            if (umlKeywords.some(keyword => label.includes(keyword) || type.includes(keyword))) {
                umlScore++;
            }
            if (label.includes('«') || label.includes('»')) umlScore++;
        });
        
        if (graphData.edges) {
            graphData.edges.forEach(edge => {
                const label = (edge.label || '').toLowerCase();
                if (umlKeywords.some(keyword => label.includes(keyword))) {
                    umlScore++;
                }
            });
        }
        
        return umlScore > graphData.nodes.length * 0.2;
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
            if (isUML) {
                node.shape = 'box';
                node.borderWidth = 2;
                
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
                
                if (node.stereotype) {
                    node.label = `«${node.stereotype}»\n${node.label}`;
                }
            }
            
            if (!node.font) {
                node.font = { color: '#e6edf3' };
            }
        });
    }

    // --- Center root node ---
    centerRoot() {
        if (!this.network) return;
        const incoming = new Set();
        this.edges.forEach(edge => {
            incoming.add(edge.to);
        });
        
        let rootNodes = this.nodes.get().filter(node => !incoming.has(node.id));
        if (rootNodes.length === 0) {
            const allNodes = this.nodes.get();
            if (allNodes.length > 0) {
                rootNodes = [allNodes[0]];
            }
        }
        
        if (rootNodes.length > 0) {
            this.network.focus(rootNodes[0].id, { scale: 0.8, animation: true });
        }
    }

    // --- Switch layout ---
    switchLayout(type) {
        if (!this.network) return;
        
        const currentData = {
            nodes: this.nodes.get(),
            edges: this.edges.get()
        };
        
        const isHierarchical = type === 'hierarchical' || (type === 'auto' && this.detectUML(currentData));
        
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

    // --- Export PNG ---
    async exportPNG() {
        if (typeof html2canvas !== 'undefined') {
            return await html2canvas(this.container);
        }
        console.warn('html2canvas not available');
        return null;
    }
}
