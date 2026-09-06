// www/js/GraphParser.js
class GraphParser {
    parse(content, mimeType) {
        // Clean up mime type (remove charset, etc.)
        const cleanMime = mimeType ? mimeType.split(';')[0].trim() : '';
        console.log('🔍 GraphParser.parse() called with mimeType:', mimeType, 'cleaned:', cleanMime);
        addDebugLog(`🔍 Parsing ${cleanMime || mimeType}...`, 'info');
        
        try {
            let result;
            // First, try to detect format from content if mimeType is generic
            const detectedType = this.detectFormat(content, cleanMime);
            
            switch (detectedType) {
                case 'json':
                    result = this.parseJSON(content);
                    break;
                case 'xml':
                    result = this.parseXML(content);
                    break;
                case 'svg':
                    result = this.parseSVG(content);
                    break;
                case 'html':
                    result = this.parseHTML(content);
                    break;
                case 'text':
                    result = this.parseText(content);
                    break;
                default:
                    // Last resort: try JSON, then HTML
                    try {
                        result = this.parseJSON(content);
                    } catch (e) {
                        addDebugLog('⚠️ JSON parse failed, trying HTML...', 'warn');
                        result = this.parseHTML(content);
                    }
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

    // --- Detect format from content and mime type ---
    detectFormat(content, mimeType) {
        // Check mime type first
        if (mimeType) {
            if (mimeType.includes('json')) return 'json';
            if (mimeType.includes('xml')) return 'xml';
            if (mimeType.includes('svg')) return 'svg';
            if (mimeType.includes('html')) return 'html';
            if (mimeType.includes('plain')) return 'text';
        }
        
        // Fallback: inspect content
        const trimmed = content.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
        if (trimmed.startsWith('<?xml') || trimmed.startsWith('<xml')) return 'xml';
        if (trimmed.startsWith('<svg') || trimmed.includes('<svg')) return 'svg';
        if (trimmed.startsWith('<!DOCTYPE html') || trimmed.startsWith('<html')) return 'html';
        if (trimmed.startsWith('<')) return 'html'; // Most likely HTML
        
        return 'text';
    }

    // --- parseJSON remains the same ---
    parseJSON(data) {
        console.log('📊 parseJSON() called');
        addDebugLog('📊 Parsing JSON...', 'info');
        try {
            const parsed = typeof data === 'string' ? JSON.parse(data) : data;
            console.log('📊 JSON parsed, keys:', Object.keys(parsed));
            
            if (parsed.nodes && parsed.edges) {
                console.log('✅ Found nodes and edges in JSON');
                return {
                    nodes: parsed.nodes || [],
                    edges: parsed.edges || [],
                    metadata: parsed.metadata || {}
                };
            }
            
            // Try to convert from various formats
            if (Array.isArray(parsed)) {
                return this.inferGraphFromArray(parsed);
            }
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

    // --- inferGraphFromArray ---
    inferGraphFromArray(arr) {
        console.log('🔍 inferGraphFromArray() called with', arr.length, 'items');
        addDebugLog(`🔍 Inferring graph from array (${arr.length} items)`, 'info');
        const nodes = arr.map((item, index) => ({
            id: item.id || `node_${index}`,
            label: item.label || item.name || `Item ${index}`,
            type: item.type || 'unknown',
            ...item
        }));
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

    // --- inferGraphFromObject ---
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

    // --- parseXML ---
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

    // --- parseSVG ---
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
                if (el.tagName === 'svg') return;
                
                const id = el.id || el.getAttribute('label') || el.tagName;
                const uniqueId = `${el.tagName}_${id}_${Math.random().toString(36).substr(2, 4)}`;
                const label = el.id || el.getAttribute('label') || el.tagName;
                
                if (!idMap.has(uniqueId)) {
                    idMap.set(uniqueId, { id: uniqueId, label: label, type: el.tagName });
                    nodes.push(idMap.get(uniqueId));
                }
                
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
            
            if (nodes.length === 0) {
                console.warn('⚠️ No SVG elements found, creating fallback nodes');
                addDebugLog('⚠️ No SVG elements found', 'warn');
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

    // --- parseHTML (FIXED) ---
    parseHTML(htmlString) {
        console.log('📊 parseHTML() called');
        addDebugLog('📊 Parsing HTML...', 'info');
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlString, 'text/html');
            const elements = doc.querySelectorAll('body *');
            
            const nodes = [];
            const edges = [];
            const idMap = new Map();
            
            elements.forEach(el => {
                // Fix: handle className safely (could be DOMTokenList)
                let className = '';
                if (el.className) {
                    if (typeof el.className === 'string') {
                        className = el.className.replace(/\s/g, '_');
                    } else if (el.className.toString) {
                        className = el.className.toString().replace(/\s/g, '_');
                    }
                }
                
                const id = el.id || className || el.tagName;
                const uniqueId = `${el.tagName}_${id}_${Math.random().toString(36).substr(2, 4)}`;
                const label = el.tagName + (el.id ? `#${el.id}` : '') + (className ? `.${className}` : '');
                
                if (!idMap.has(uniqueId)) {
                    idMap.set(uniqueId, { id: uniqueId, label, type: 'html' });
                    nodes.push(idMap.get(uniqueId));
                }
                
                if (el.parentElement && el.parentElement.tagName !== 'BODY' && el.parentElement.tagName !== 'HTML') {
                    let parentClassName = '';
                    if (el.parentElement.className) {
                        if (typeof el.parentElement.className === 'string') {
                            parentClassName = el.parentElement.className.replace(/\s/g, '_');
                        } else if (el.parentElement.className.toString) {
                            parentClassName = el.parentElement.className.toString().replace(/\s/g, '_');
                        }
                    }
                    const parentId = el.parentElement.id || parentClassName || el.parentElement.tagName;
                    const parentUniqueId = `${el.parentElement.tagName}_${parentId}_${Math.random().toString(36).substr(2, 4)}`;
                    
                    if (!idMap.has(parentUniqueId)) {
                        idMap.set(parentUniqueId, { id: parentUniqueId, label: el.parentElement.tagName, type: 'html' });
                        nodes.push(idMap.get(parentUniqueId));
                    }
                    
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

    // --- parseText ---
    parseText(txtStr) {
        console.log('📊 parseText() called');
        addDebugLog('📊 Parsing text...', 'info');
        const lines = txtStr.split('\n').filter(line => line.trim());
        const nodes = [];
        const edges = [];
        
        lines.forEach((line, index) => {
            const id = `line_${index}`;
            nodes.push({ id, label: line.substring(0, 50) + (line.length > 50 ? '...' : ''), type: 'text' });
            if (index > 0) {
                edges.push({ from: `line_${index - 1}`, to: id, label: 'follows' });
            }
        });
        
        return { nodes, edges };
    }
}
