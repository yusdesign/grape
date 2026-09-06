// www/js/GraphRenderer.js - FULLY FIXED
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
        this.layoutOptions = {
            hierarchical: {
                enabled: true,
                direction: 'UD',
                sortMethod: 'directed',
                nodeSpacing: 150,
                levelSeparation: 200,
                treeSpacing: 200,
                blockShifting: true,
                edgeMinimization: true,
                parentCentralization: true
                // overlapAvoidance removed - not a valid option
            }
        };
    }

    render(graphData, options = {}) {
        this.nodes.clear();
        this.edges.clear();

        const isUML = this.detectUML(graphData);
        this.applyAdvancedStyling(graphData, isUML);

        this.nodes.add(graphData.nodes);
        this.edges.add(graphData.edges);

        const isLarge = graphData.nodes.length > 500;

        // --- CORRECT HIERARCHICAL LAYOUT ---
        this.layoutOptions.hierarchical.enabled = !isLarge && (options.hierarchical !== false);
        
        // --- CORRECT NODE STYLING (no "padding" at root level) ---
        const defaultOptions = {
            nodes: {
                shape: 'box',
                margin: 12,
                widthConstraint: {
                    minimum: 100,
                    maximum: 250
                },
                heightConstraint: {
                    minimum: 40
                },
                font: {
                    size: 14,
                    face: 'Arial',
                    color: '#e6edf3',
                    multi: 'html',
                    bold: {
                        size: 16,
                        face: 'Arial',
                        color: '#ffffff'
                    },
                    ital: {
                        size: 13,
                        face: 'Arial',
                        color: '#8b949e'
                    }
                },
                borderWidth: 2,
                borderWidthSelected: 4,
                shadow: {
                    enabled: true,
                    color: 'rgba(0,0,0,0.5)',
                    size: 10,
                    x: 5,
                    y: 5
                },
                shapeProperties: {
                    borderRadius: 6,
                    useImageSize: true
                }
                // padding removed - use margin instead
            },
            edges: {
                arrows: {
                    to: { enabled: true, scaleFactor: 0.8 }
                },
                smooth: {
                    type: 'cubicBezier',
                    roundness: 0.3,
                    forceDirection: 'none'
                },
                font: {
                    size: 11,
                    color: '#8b949e',
                    face: 'Arial',
                    align: 'middle',
                    background: '#0d1117',
                    strokeWidth: 2,
                    strokeColor: '#0d1117'
                },
                color: {
                    color: '#484f58',
                    highlight: '#58a6ff',
                    hover: '#58a6ff',
                    inherit: 'from'
                },
                width: 1.5,
                selectionWidth: 3,
                hoverWidth: 2.5,
                dashes: false
            },
            physics: {
                enabled: !isLarge,
                stabilization: { iterations: isLarge ? 0 : 150 },
                solver: 'forceAtlas2Based',
                forceAtlas2Based: {
                    gravitationalConstant: -50,
                    centralGravity: 0.01,
                    springLength: 150,
                    springConstant: 0.08,
                    damping: 0.4
                    // avoidOverlap removed - not a valid option
                },
                maxVelocity: 50,
                minVelocity: 0.1,
                timestep: 0.5
            },
            layout: this.layoutOptions,
            interaction: {
                hover: true,
                tooltipDelay: 200,
                zoomView: true,
                dragView: true,
                navigationButtons: true,
                multiselect: true,
                dragNodes: true,
                selectConnectedEdges: true
            },
            manipulation: {
                enabled: false,
                addNode: true,
                addEdge: true,
                editNode: this.editNodeCallback.bind(this),
                editEdge: this.editEdgeCallback.bind(this),
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
            }
        };

        this.network = new vis.Network(
            this.container,
            { nodes: this.nodes, edges: this.edges },
            { ...defaultOptions, ...options }
        );

        // --- Setup edit events (after network created) ---
        this.setupEditEvents();

        setTimeout(() => {
            if (this.network) {
                this.network.fit();
                if (this.layoutOptions.hierarchical.enabled) {
                    this.centerRoot();
                }
            }
        }, 300);

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
                addDebugLog(`📌 Selected node: ${node?.label || node?.id || 'unknown'}`, 'info');
            } else if (params.edges.length > 0) {
                this.selectedEdgeId = params.edges[0];
                this.selectedNodeId = null;
                const edge = this.edges.get(this.selectedEdgeId);
                addDebugLog(`🔗 Selected edge: ${edge?.label || edge?.id || 'unknown'}`, 'info');
            }
        });

        // Double-click to edit node (only in edit mode)
        this.network.on('doubleClick', (params) => {
            if (params.nodes.length > 0 && this.editMode) {
                const nodeId = params.nodes[0];
                const node = this.nodes.get(nodeId);
                if (node) {
                    this.editNodeCallback(node, (updated) => {
                        if (updated) {
                            this.nodes.update(updated);
                            addDebugLog(`✏️ Updated node: ${updated.label}`, 'success');
                        }
                    });
                }
            }
        });
    }

    // --- Edit Node Callback ---
    editNodeCallback(data, callback) {
        const newLabel = prompt('✏️ Edit node label:', data.label || data.id);
        if (newLabel !== null && newLabel.trim()) {
            data.label = newLabel.trim();
            callback(data);
            addDebugLog(`✏️ Updated node: ${newLabel.trim()}`, 'success');
        } else {
            callback(null);
        }
    }

    // --- Edit Edge Callback ---
    editEdgeCallback(data, callback) {
        const newLabel = prompt('🔗 Edit edge label:', data.label || '');
        if (newLabel !== null) {
            data.label = newLabel.trim() || undefined;
            callback(data);
            addDebugLog(`🔗 Updated edge: ${data.label || 'no label'}`, 'success');
        } else {
            callback(null);
        }
    }

    // --- Apply Advanced Styling ---
    applyAdvancedStyling(graphData, isUML) {
        const typeColors = {
            'class': { bg: '#1f6feb', border: '#58a6ff', icon: '📦' },
            'interface': { bg: '#1a7f37', border: '#3fb950', icon: '🔌' },
            'enum': { bg: '#9e6a03', border: '#d29922', icon: '📋' },
            'abstract': { bg: '#6f42c1', border: '#bc8cff', icon: '📐' },
            'entity': { bg: '#0d419d', border: '#3b82f6', icon: '📊' },
            'component': { bg: '#6b4c2a', border: '#d97706', icon: '🧩' },
            'default': { bg: '#1c2333', border: '#58a6ff', icon: '📄' }
        };

        graphData.nodes.forEach(node => {
            const type = (node.type || 'default').toLowerCase();
            const colors = typeColors[type] || typeColors.default;

            if (isUML) {
                node.shape = 'box';
                node.shapeProperties = { borderRadius: 6 };
            }

            // Multi-font label
            let label = node.label || node.id;
            if (node.type && node.type !== 'default') {
                const icon = typeColors[node.type.toLowerCase()]?.icon || '';
                label = `<b>${icon} ${label}</b>`;
                if (node.stereotype) {
                    label += `\n<i>«${node.stereotype}»</i>`;
                }
            }
            node.label = label;

            node.color = {
                background: colors.bg,
                border: colors.border,
                highlight: {
                    background: colors.border,
                    border: colors.bg
                },
                hover: {
                    background: colors.border,
                    border: colors.bg
                }
            };

            node.font = {
                color: '#e6edf3',
                multi: 'html',
                size: 14,
                bold: {
                    color: '#ffffff',
                    size: 16
                }
            };

            node.borderWidth = 2;
            node.borderWidthSelected = 4;
            node.shadow = {
                enabled: true,
                color: 'rgba(0,0,0,0.4)',
                size: 8,
                x: 3,
                y: 3
            };
        });

        // Edge styling
        if (graphData.edges) {
            graphData.edges.forEach(edge => {
                const label = (edge.label || '').toLowerCase();
                let arrowType = 'to';
                let dashPattern = false;
                let relationshipLabel = edge.label || '';

                if (label.includes('extends') || label.includes('inherits')) {
                    dashPattern = false;
                    relationshipLabel = '▲ extends';
                } else if (label.includes('implements')) {
                    dashPattern = true;
                    relationshipLabel = '△ implements';
                } else if (label.includes('association')) {
                    dashPattern = false;
                    relationshipLabel = '▸ association';
                } else if (label.includes('aggregation')) {
                    dashPattern = false;
                    relationshipLabel = '◇ aggregation';
                } else if (label.includes('composition')) {
                    dashPattern = false;
                    relationshipLabel = '◆ composition';
                } else if (label.includes('dependency')) {
                    dashPattern = true;
                    relationshipLabel = '⇢ dependency';
                } else if (label.includes('realization')) {
                    dashPattern = true;
                    relationshipLabel = '⚡ realization';
                }

                edge.arrows = { to: { enabled: true } };
                edge.dashes = dashPattern;
                edge.label = relationshipLabel || edge.label;
                edge.font = {
                    align: 'middle',
                    background: '#0d1117',
                    strokeWidth: 3,
                    strokeColor: '#0d1117',
                    size: 10,
                    color: '#8b949e'
                };
                edge.width = 2;
                edge.selectionWidth = 4;
                edge.color = {
                    color: '#484f58',
                    highlight: '#58a6ff',
                    hover: '#58a6ff'
                };
                edge.smooth = {
                    type: 'cubicBezier',
                    roundness: 0.3,
                    forceDirection: 'none'
                };
            });
        }
    }

    // --- Toggle Edit Mode ---
    toggleEditMode() {
        if (!this.network) return false;
        
        this.editMode = !this.editMode;
        this.network.setOptions({
            manipulation: {
                enabled: this.editMode,
                addNode: true,
                addEdge: true,
                editNode: this.editNodeCallback.bind(this),
                editEdge: this.editEdgeCallback.bind(this),
                deleteNode: true,
                deleteEdge: true
            }
        });
        
        this.network.setOptions({
            interaction: {
                navigationButtons: !this.editMode
            }
        });
        
        addDebugLog(`✏️ Edit mode ${this.editMode ? 'enabled' : 'disabled'}`, 'info');
        return this.editMode;
    }

    // --- Detect UML ---
    detectUML(graphData) {
        if (!graphData.nodes || graphData.nodes.length === 0) return false;
        
        const umlKeywords = ['class', 'interface', 'enum', 'abstract', 'extends', 
                           'implements', 'association', 'aggregation', 'composition',
                           'entity', 'component', 'stereotype', '«', '»'];
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
        
        return umlScore > graphData.nodes.length * 0.15;
    }

    // --- Center Root ---
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

    // --- Switch Layout ---
    switchLayout(type) {
        if (!this.network) return;
        
        const currentData = {
            nodes: this.nodes.get(),
            edges: this.edges.get()
        };
        
        const isHierarchical = type === 'hierarchical' || 
                              (type === 'auto' && this.detectUML(currentData));
        
        const hierarchicalOptions = {
            enabled: isHierarchical,
            direction: 'UD',
            sortMethod: 'directed',
            nodeSpacing: 150,
            levelSeparation: 200,
            treeSpacing: 200,
            blockShifting: true,
            edgeMinimization: true,
            parentCentralization: true
        };
        
        const options = {
            layout: {
                hierarchical: hierarchicalOptions,
                randomSeed: 42,
                improvedLayout: true
            },
            physics: {
                enabled: !isHierarchical,
                stabilization: { iterations: 150 },
                solver: 'forceAtlas2Based',
                forceAtlas2Based: {
                    gravitationalConstant: -50,
                    centralGravity: 0.01,
                    springLength: 150,
                    springConstant: 0.08,
                    damping: 0.4
                }
            }
        };
        
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
