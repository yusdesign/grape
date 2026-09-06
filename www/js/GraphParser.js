// www/js/GraphParser.js
class GraphParser {
    parse(content, mimeType) {
        console.log('🔍 GraphParser.parse() called with mimeType:', mimeType);
        addDebugLog(`🔍 Parsing ${mimeType}...`, 'info');
        
        try {
            let result;
            switch (mimeType) {
                case 'application/json':
                    result = this.parseJSON(content);
                    break;
                case 'text/xml':
                    result = this.parseXML(content);
                    break;
                case 'image/svg+xml':
                    result = this.parseSVG(content);
                    break;
                case 'text/html':
                    result = this.parseHTML(content);
                    break;
                default:
                    // Try JSON as fallback
                    console.warn('⚠️ Unknown mimeType, trying JSON fallback');
                    addDebugLog('⚠️ Unknown type, trying JSON fallback', 'warn');
                    result = this.parseJSON(content);
            }
            
            console.log('✅ Parse result:', result.nodes?.length || 0, 'nodes,', result.edges?.length || 0, 'edges');
            addDebugLog(`✅ Parsed: ${result.nodes?.length || 0} nodes, ${result.edges?.length || 0} edges`, 'success');
            return result;
        } catch (e) {
            console.error('❌ Parse error:', e.message);
            console.error('Stack:', e.stack);
            addDebugLog('❌ Parse error: ' + e.message, 'error');
            throw new Error(`Parse error: ${e.message}`);
        }
    }

    parseJSON(data) {
        console.log('📊 parseJSON() called');
        addDebugLog('📊 Parsing JSON...', 'info');
        try {
            const parsed = typeof data === 'string' ? JSON.parse(data) : data;
            console.log('📊 JSON parsed, keys:', Object.keys(parsed));
            
            // Check if it's already in graph format
            if (parsed.nodes && parsed.edges) {
                console.log('✅ Found nodes and edges in JSON');
                return {
                    nodes: parsed.nodes || [],
                    edges: parsed.edges || [],
                    metadata: parsed.metadata || {}
                };
            }
            
            // Try to convert from UML-like format
            console.warn('⚠️ JSON format not recognized, attempting generic conversion');
            addDebugLog('⚠️ Converting generic JSON to graph', 'warn');
            
            // If it's an array of objects, try to infer nodes and edges
            if (Array.isArray(parsed)) {
                return this.inferGraphFromArray(parsed);
            }
            
            // If it's an object with nested objects, try to flatten
            if (typeof parsed === 'object' && parsed !== null) {
                return this.inferGraphFromObject(parsed);
            }
            
            return { nodes: [], edges: [], metadata: {} };
        } catch (e) {
            console.error('❌ JSON parse error:', e.message);
            addDebugLog('❌ JSON parse error: ' + e.message, 'error');
            throw new Error(`Invalid JSON: ${e.message}`);
        }
    }

    inferGraphFromArray(arr) {
        console.log('🔍 inferGraphFromArray() called with', arr.length, 'items');
        addDebugLog(`🔍 Inferring graph from array (${arr.length} items)`, 'info');
        const nodes = arr.map((item, index) => ({
            id: item.id || `node_${index}`,
            label: item.label || item.name || `Item ${index}`,
            type: item.type || 'unknown',
            ...item
        }));
        // Try to find relationships
        const edges = [];
        arr.forEach((item, index) => {
            if (item.refs && Array.isArray(item.refs)) {
                item.refs.forEach(ref => {
                    edges.push({
                        from: item.id || `node_${index}`,
                        to: ref,
                        label: item.relation || 'references'
                    });
                });
            }
            // Check for parent/child relationships
            if (item.parent) {
                edges.push({
                    from: item.parent,
                    to: item.id || `node_${index}`,
                    label: 'parent'
                });
            }
            if (item.children && Array.isArray(item.children)) {
                item.children.forEach(child => {
                    edges.push({
                        from: item.id || `node_${index}`,
                        to: child,
                        label: 'child'
                    });
                });
            }
        });
        return { nodes, edges };
    }

    inferGraphFromObject(obj) {
        console.log('🔍 inferGraphFromObject() called');
        addDebugLog('🔍 Inferring graph from object', 'info');
        const nodes = [];
        const edges = [];
        const nodeMap = new Map();
        
        Object.entries(obj).forEach(([key, value]) => {
            if (!nodeMap.has(key)) {
                nodeMap.set(key, { id: key, label: key, type: 'object' });
                nodes.push(nodeMap.get(key));
            }
            if (typeof value === 'object' && value !== null) {
                Object.keys(value).forEach(subKey => {
                    if (!nodeMap.has(subKey)) {
                        nodeMap.set(subKey, { id: subKey, label: subKey, type: 'property' });
                        nodes.push(nodeMap.get(subKey));
                    }
                    edges.push({
                        from: key,
                        to: subKey,
                        label: 'contains'
                    });
                });
            }
        });
        return { nodes, edges };
    }

    parseXML(xmlString) {
        console.log('📊 parseXML() called');
        addDebugLog('📊 Parsing XML...', 'info');
        try {
            const parser = new DOMParser();
            const xml = parser.parseFromString(xmlString, 'text/xml');
            const elements = xml.querySelectorAll('*');
            
            const nodes = [];
            const edges = [];
            const idMap = new Map();
            
            elements.forEach(el => {
                if (el.tagName === '#document' || el.tagName === '#text') return;
                
                const id = el.getAttribute('id') || el.getAttribute('name') || el.tagName;
                const uniqueId = `${el.tagName}_${id}_${Math.random().toString(36).substr(2, 4)}`;
                
                if (!idMap.has(uniqueId)) {
                    idMap.set(uniqueId, { id: uniqueId, label: el.tagName, type: 'element' });
                    nodes.push(idMap.get(uniqueId));
                }
                
                if (el.parentElement && el.parentElement.tagName !== '#document') {
                    const parentEl = el.parentElement;
                    const parentId = parentEl.getAttribute('id') || parentEl.getAttribute('name') || parentEl.tagName;
                    const parentUniqueId = `${parentEl.tagName}_${parentId}_${Math.random().toString(36).substr(2, 4)}`;
                    
                    if (!idMap.has(parentUniqueId)) {
                        idMap.set(parentUniqueId, { id: parentUniqueId, label: parentEl.tagName, type: 'element' });
                        nodes.push(idMap.get(parentUniqueId));
                    }
                    
                    edges.push({ from: parentUniqueId, to: uniqueId, label: 'contains' });
                }
            });
            
            return { nodes, edges };
        } catch (e) {
            console.error('❌ XML parse error:', e.message);
            addDebugLog('❌ XML parse error: ' + e.message, 'error');
            return { nodes: [], edges: [] };
        }
    }

    parseSVG(svgString) {
        console.log('📊 parseSVG() called');
        addDebugLog('📊 Parsing SVG...', 'info');
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgString, 'image/svg+xml');
            const elements = doc.querySelectorAll('svg, g, rect, circle, ellipse, line, path, text, defs, use, polygon, polyline');
            
            const nodes = [];
            const edges = [];
            const idMap = new Map();
            
            elements.forEach(el => {
                if (el.tagName === 'svg') {
                    // Skip root SVG
                    return;
                }
                
                const id = el.id || el.getAttribute('label') || el.tagName;
                const uniqueId = `${el.tagName}_${id}_${Math.random().toString(36).substr(2, 4)}`;
                const label = el.id || el.getAttribute('label') || el.tagName;
                
                if (!idMap.has(uniqueId)) {
                    idMap.set(uniqueId, { id: uniqueId, label: label, type: el.tagName });
                    nodes.push(idMap.get(uniqueId));
                }
                
                // Check for parent relationships (groups containing elements)
                if (el.parentElement && el.parentElement.tagName !== 'svg') {
                    const parentId = el.parentElement.id || el.parentElement.getAttribute('label') || el.parentElement.tagName;
                    const parentUniqueId = `${el.parentElement.tagName}_${parentId}_${Math.random().toString(36).substr(2, 4)}`;
                    
                    if (!idMap.has(parentUniqueId)) {
                        idMap.set(parentUniqueId, { id: parentUniqueId, label: parentId, type: 'group' });
                        nodes.push(idMap.get(parentUniqueId));
                    }
                    
                    edges.push({ from: parentUniqueId, to: uniqueId, label: 'contains' });
                }
            });
            
            // If no nodes found, try to create nodes from SVG elements
            if (nodes.length === 0) {
                console.warn('⚠️ No SVG elements found, creating fallback nodes');
                addDebugLog('⚠️ No SVG elements found', 'warn');
                // Create a single node for the SVG
                nodes.push({
                    id: 'svg_root',
                    label: 'SVG Document',
                    type: 'svg'
                });
            }
            
            return { nodes, edges };
        } catch (e) {
            console.error('❌ SVG parse error:', e.message);
            addDebugLog('❌ SVG parse error: ' + e.message, 'error');
            return { nodes: [], edges: [] };
        }
    }

    parseHTML(htmlString) {
        console.log('📊 parseHTML() called');
        addDebugLog('📊 Parsing HTML...', 'info');
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlString, 'text/html');
            const elements = doc.querySelectorAll('body *');
            
            const nodes = [];
            const edges = [];
            
            elements.forEach(el => {
                const id = el.id || el.className?.replace(/\s/g, '_') || el.tagName;
                const uniqueId = `${el.tagName}_${id}_${Math.random().toString(36).substr(2, 4)}`;
                const label = el.tagName + (el.id ? `#${el.id}` : '');
                nodes.push({ id: uniqueId, label, type: 'html' });
                
                if (el.parentElement && el.parentElement.tagName !== 'BODY') {
                    const parentId = el.parentElement.id || el.parentElement.className?.replace(/\s/g, '_') || el.parentElement.tagName;
                    const parentUniqueId = `${el.parentElement.tagName}_${parentId}_${Math.random().toString(36).substr(2, 4)}`;
                    edges.push({ from: parentUniqueId, to: uniqueId, label: 'contains' });
                }
            });
            
            return { nodes, edges };
        } catch (e) {
            console.error('❌ HTML parse error:', e.message);
            addDebugLog('❌ HTML parse error: ' + e.message, 'error');
            return { nodes: [], edges: [] };
        }
    }
}
