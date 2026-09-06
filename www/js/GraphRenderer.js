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

        // Detect if this is an SVG graph
        this.isSVG = this.detectSVGGraph(graphData);
        
        if (this.isSVG) {
            addDebugLog('🔍 SVG graph detected, applying tree layout', 'info');
            // Apply proper hierarchical layout for SVG
            this.applyHierarchicalLayout({
                method: 'direction',
                shakeTowards: 'roots',
                nodeSpacing: 150,
                levelSeparation: 220
            });
        } else if (isUML) {
            addDebugLog('🔍 UML graph detected, applying hierarchical layout', 'info');
            this.applyHierarchicalLayout({
                method: 'hubsize',
                shakeTowards: 'leaves',
                nodeSpacing: 150,
                levelSeparation: 200
            });
        }

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

    // --- Apply Hierarchical Layout with Methods ---
    applyHierarchicalLayout(options = {}) {
        if (!this.network) return;
        
        const method = options.method || 'hubsize'; // 'hubsize', 'direction', 'directed'
        const shakeTowards = options.shakeTowards || 'leaves'; // 'leaves', 'roots'
        const nodeSpacing = options.nodeSpacing || 150;
        const levelSeparation = options.levelSeparation || 200;
        
        let sortMethod = 'hubsize';
        if (method === 'direction') {
            sortMethod = 'directed';
        } else if (method === 'hubsize') {
            sortMethod = 'hubsize';
        }
        
        // For SVG tree: force directed layout with proper hierarchy
        const hierarchicalOptions = {
            enabled: true,
            direction: 'UD',        // Up-Down (root at top)
            sortMethod: sortMethod,
            shakeTowards: shakeTowards,
            nodeSpacing: nodeSpacing,
            levelSeparation: levelSeparation,
            treeSpacing: 200,
            blockShifting: true,
            edgeMinimization: true,
            parentCentralization: true
        };
        
        // If this is an SVG, we want to detect roots and build proper tree
        if (this.isSVG) {
            // Force root detection for SVG
            const rootNodes = this.findRootNodes();
            if (rootNodes.length > 0) {
                // Move roots to top
                hierarchicalOptions.shakeTowards = 'roots';
                hierarchicalOptions.sortMethod = 'directed';
            }
        }
        
        this.network.setOptions({
            layout: {
                hierarchical: hierarchicalOptions,
                improvedLayout: true,
                randomSeed: 42
            },
            physics: {
                enabled: false, // Disable physics for stable hierarchy
                stabilization: { iterations: 100 }
            }
        });
        
        // Auto-fit after layout change
        setTimeout(() => {
            if (this.network) {
                this.network.fit();
                // Center the root
                const roots = this.findRootNodes();
                if (roots.length > 0) {
                    this.network.focus(roots[0].id, { scale: 0.8, animation: true });
                }
            }
        }, 500);
        
        this.currentLayout = 'hierarchical';
        addDebugLog(`📐 Hierarchical layout applied: ${method}, shakeTowards: ${shakeTowards}`, 'success');
    }

    // --- Find Root Nodes (nodes with no parents) ---
    findRootNodes() {
        const parents = new Set();
        this.edges.forEach(edge => {
            parents.add(edge.to);
        });
        
        const roots = [];
        this.nodes.forEach(node => {
            if (!parents.has(node.id)) {
                roots.push(node);
            }
        });
        
        // If no roots found (cycle), find nodes with most outgoing edges
        if (roots.length === 0) {
            const edgeCount = new Map();
            this.edges.forEach(edge => {
                edgeCount.set(edge.from, (edgeCount.get(edge.from) || 0) + 1);
            });
            let maxCount = 0;
            this.nodes.forEach(node => {
                const count = edgeCount.get(node.id) || 0;
                if (count > maxCount) {
                    maxCount = count;
                    roots.length = 0;
                    roots.push(node);
                } else if (count === maxCount && count > 0) {
                    roots.push(node);
                }
            });
        }
        
        return roots;
    }
    
    // --- Detect if graph is SVG-based ---
    detectSVGGraph(graphData) {
        if (!graphData || !graphData.nodes) return false;
        
        // Check if nodes have SVG-like attributes
        let svgScore = 0;
        graphData.nodes.forEach(node => {
            const label = (node.label || '').toLowerCase();
            if (label.includes('svg') || label.includes('path') || 
                label.includes('rect') || label.includes('circle') ||
                label.includes('g ') || label.includes('group')) {
                svgScore++;
            }
            if (node.type && node.type === 'svg') svgScore++;
        });
        
        // Check edges for SVG relationships
        if (graphData.edges) {
            graphData.edges.forEach(edge => {
                const label = (edge.label || '').toLowerCase();
                if (label.includes('contains') || label.includes('child')) {
                    svgScore++;
                }
            });
        }
        
        const threshold = graphData.nodes.length * 0.3;
        return svgScore > threshold;
    }
    
    // --- GRAPE LAYOUT: Hierarchical tree analyzer ---
    // --- Grape Tree Layout (for SVG/XML) ---
    applyGrapeLayout(animation = true) {
        if (!this.network) return;
        
        const treeData = this.analyzeTree();
        if (!treeData || !treeData.positions) {
            addDebugLog('⚠️ Could not analyze tree structure', 'warn');
            return;
        }
    
        // Update node positions
        Object.entries(treeData.positions).forEach(([nodeId, pos]) => {
            this.nodes.update({
                id: nodeId,
                x: pos.x,
                y: pos.y,
                fixed: true
            });
        });
    
        // Apply hierarchical layout with grape settings
        this.network.setOptions({
            layout: {
                hierarchical: {
                    enabled: true,
                    direction: 'UD',
                    sortMethod: 'directed',
                    shakeTowards: 'roots',
                    nodeSpacing: 180,
                    levelSeparation: 220,
                    treeSpacing: 180,
                    blockShifting: true,
                    edgeMinimization: true,
                    parentCentralization: true
                },
                improvedLayout: true,
                randomSeed: 42
            },
            physics: {
                enabled: false
            }
        });
    
        setTimeout(() => {
            if (this.network) {
                this.network.fit({ animation });
                // Center on root
                const roots = this.findRootNodes();
                if (roots.length > 0) {
                    this.network.focus(roots[0].id, { scale: 0.8, animation: true });
                }
                addDebugLog(`🍇 Grape tree layout applied (${Object.keys(treeData.positions).length} nodes positioned)`, 'success');
            }
        }, 100);
    }
    
    // --- Enhanced tree analyzer for SVG/XML ---
    analyzeTree() {
        if (!this.nodes || !this.edges) return null;
        
        const nodeMap = {};
        this.nodes.forEach(node => {
            nodeMap[node.id] = {
                ...node,
                children: [],
                parents: [],
                level: 0,
                visited: false,
                svgType: node.type || 'unknown'
            };
        });
    
        // Build tree structure
        this.edges.forEach(edge => {
            if (nodeMap[edge.from] && nodeMap[edge.to]) {
                nodeMap[edge.from].children.push(edge.to);
                nodeMap[edge.to].parents.push(edge.from);
            }
        });
    
        // Find root nodes (no parents)
        let roots = [];
        Object.values(nodeMap).forEach(node => {
            if (node.parents.length === 0) {
                roots.push(node.id);
            }
        });
    
        // If no roots found (disconnected graph or cycle), find SVG container nodes
        if (roots.length === 0) {
            // Look for SVG root elements (like <svg>, <g>, etc.)
            const svgRoots = Object.values(nodeMap)
                .filter(node => {
                    const label = (node.label || '').toLowerCase();
                    return label === 'svg' || label.includes('svg') || 
                           (node.svgType === 'svg' || node.svgType === 'group');
                })
                .map(node => node.id);
            
            if (svgRoots.length > 0) {
                roots = svgRoots;
            } else {
                // Fallback: use all nodes
                roots = Object.keys(nodeMap);
            }
        }
    
        // Assign levels (BFS from roots)
        const queue = roots.map(id => ({ id, level: 0 }));
        const visited = new Set();
        
        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current.id)) continue;
            visited.add(current.id);
            
            const node = nodeMap[current.id];
            if (node) {
                node.level = current.level;
                
                // Sort children by type (SVG hierarchy)
                node.children.sort((a, b) => {
                    const aNode = nodeMap[a];
                    const bNode = nodeMap[b];
                    if (!aNode || !bNode) return 0;
                    // SVG elements have natural order: svg > g > path/rect/circle
                    const order = { 'svg': 0, 'g': 1, 'rect': 2, 'circle': 3, 'path': 4, 'default': 5 };
                    const aOrder = order[aNode.type || 'default'] || 5;
                    const bOrder = order[bNode.type || 'default'] || 5;
                    return aOrder - bOrder;
                });
                
                node.children.forEach(childId => {
                    if (!visited.has(childId) && nodeMap[childId]) {
                        queue.push({ id: childId, level: current.level + 1 });
                    }
                });
            }
        }
    
        // Calculate positions based on levels
        const levelGroups = {};
        Object.values(nodeMap).forEach(node => {
            const level = node.level;
            if (!levelGroups[level]) {
                levelGroups[level] = [];
            }
            levelGroups[level].push(node.id);
        });
    
        // Position nodes in a tree layout (grape style)
        const maxLevel = Math.max(...Object.keys(levelGroups).map(Number));
        const positions = {};
        const baseSpacing = 200;
        const verticalSpacing = 250;
    
        Object.keys(levelGroups).forEach(levelKey => {
            const level = Number(levelKey);
            const nodesAtLevel = levelGroups[level];
            const count = nodesAtLevel.length;
            const width = count * baseSpacing;
            const startX = -width / 2;
    
            nodesAtLevel.forEach((nodeId, index) => {
                positions[nodeId] = {
                    x: startX + (index * baseSpacing) + baseSpacing / 2,
                    y: level * verticalSpacing + 50
                };
            });
        });
    
        return { 
            positions, 
            rootIds: roots, 
            maxLevel,
            nodeMap 
        };
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

    // --- Edit Edge Callback (with label editing) ---
    editEdgeCallback(data, callback) {
        // data = { id, from, to, label, ... }
        const currentLabel = data.label || '';
        const newLabel = prompt('🔗 Edit edge label:\n(leave empty to remove label)', currentLabel);
        if (newLabel !== null) {
            if (newLabel.trim()) {
                data.label = newLabel.trim();
            } else {
                delete data.label; // Remove label if empty
            }
            callback(data);
            addDebugLog(`🔗 Updated edge: ${data.label || 'no label'}`, 'success');
        } else {
            callback(null);
        }
    }

    // --- Apply Advanced Styling ---
    // Updated applyAdvancedStyling with images and proper coloring
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
    
            // --- IMAGE PLACEHOLDER (if node has image) ---
            if (node.image) {
                node.shape = 'image';
                node.image = node.image; // URL or base64
                node.size = 40; // Size of the image
                node.shapeProperties = {
                    useImageSize: true,
                    borderRadius: 6
                };
            } else {
                node.shape = 'box';
                node.shapeProperties = { borderRadius: 6 };
            }
    
            // --- COLORING (properly applied) ---
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
    
            // --- LABEL with multi-font ---
            let label = node.label || node.id;
            if (node.type && node.type !== 'default' && isUML) {
                const icon = typeColors[node.type.toLowerCase()]?.icon || '';
                label = `<b>${icon} ${label}</b>`;
                if (node.stereotype) {
                    label += `\n<i>«${node.stereotype}»</i>`;
                }
            }
            node.label = label;
    
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
    
        // --- EDGE COLORING & LABELS ---
        if (graphData.edges) {
            graphData.edges.forEach(edge => {
                const label = (edge.label || '').toLowerCase();
                let dashPattern = false;
                let relationshipLabel = edge.label || '';
    
                // UML relationship detection
                if (label.includes('extends') || label.includes('inherits')) {
                    dashPattern = false;
                    relationshipLabel = '▲ extends';
                    edge.color = { color: '#58a6ff', highlight: '#79c0ff' };
                } else if (label.includes('implements')) {
                    dashPattern = true;
                    relationshipLabel = '△ implements';
                    edge.color = { color: '#3fb950', highlight: '#4ade80' };
                } else if (label.includes('association')) {
                    dashPattern = false;
                    relationshipLabel = '▸ association';
                    edge.color = { color: '#d29922', highlight: '#fbbf24' };
                } else if (label.includes('aggregation')) {
                    dashPattern = false;
                    relationshipLabel = '◇ aggregation';
                    edge.color = { color: '#bc8cff', highlight: '#d8b4fe' };
                } else if (label.includes('composition')) {
                    dashPattern = false;
                    relationshipLabel = '◆ composition';
                    edge.color = { color: '#f85149', highlight: '#fb7185' };
                } else if (label.includes('dependency')) {
                    dashPattern = true;
                    relationshipLabel = '⇢ dependency';
                    edge.color = { color: '#8b949e', highlight: '#d1d5db' };
                } else if (label.includes('realization')) {
                    dashPattern = true;
                    relationshipLabel = '⚡ realization';
                    edge.color = { color: '#f97316', highlight: '#fb923c' };
                }
    
                edge.arrows = { to: { enabled: true } };
                edge.dashes = dashPattern;
                edge.label = relationshipLabel || edge.label;
                
                // Edge label styling
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
