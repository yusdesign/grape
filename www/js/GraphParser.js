// www/js/GraphParser.js
class GraphParser {
    parse(content, mimeType) {
        console.log('🔍 GraphParser.parse() called with mimeType:', mimeType);
        console.log('📄 Content preview:', typeof content === 'string' ? content.substring(0, 200) : 'Binary data');
        
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
                    result = this.parseJSON(content);
            }
            console.log('✅ Parse result:', result.nodes?.length || 0, 'nodes,', result.edges?.length || 0, 'edges');
            return result;
        } catch (e) {
            console.error('❌ Parse error:', e.message);
            console.error('Stack:', e.stack);
            throw new Error(`Parse error: ${e.message}`);
        }
    }

    parseJSON(data) {
        console.log('📊 parseJSON() called');
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
            
            // Try to convert from UML-like format (PlantUML, etc.)
            // This is where you add your specific parsers
            console.warn('⚠️ JSON format not recognized, attempting generic conversion');
            
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
            throw new Error(`Invalid JSON: ${e.message}`);
        }
    }

    inferGraphFromArray(arr) {
        console.log('🔍 inferGraphFromArray() called with', arr.length, 'items');
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
        });
        return { nodes, edges };
    }

    inferGraphFromObject(obj) {
        console.log('🔍 inferGraphFromObject() called');
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
        // Placeholder for XML/XMI parser
        console.warn('⚠️ XML parser not fully implemented');
        return { nodes: [], edges: [], metadata: { format: 'xml' } };
    }

    parseSVG(svgString) {
        console.log('📊 parseSVG() called');
        // Placeholder for SVG parser
        console.warn('⚠️ SVG parser not fully implemented');
        return { nodes: [], edges: [], metadata: { format: 'svg' } };
    }

    parseHTML(htmlString) {
        console.log('📊 parseHTML() called');
        // Placeholder for HTML parser
        console.warn('⚠️ HTML parser not fully implemented');
        return { nodes: [], edges: [], metadata: { format: 'html' } };
    }
}
