// src/index.js - CLI version of grape (optional)
import fs from 'fs';
import { GraphParser } from '../www/js/GraphParser.js';
import { GraphRenderer } from '../www/js/GraphRenderer.js';

// Simple CLI to test parsing without Capacitor
const args = process.argv.slice(2);
if (args.length === 0) {
    console.log('Usage: node src/index.js <file.json>');
    process.exit(1);
}

const filePath = args[0];
const content = fs.readFileSync(filePath, 'utf-8');
const parser = new GraphParser();
const mimeType = filePath.endsWith('.json') ? 'application/json' : 
                 filePath.endsWith('.xml') ? 'text/xml' : 
                 filePath.endsWith('.svg') ? 'image/svg+xml' : 
                 'text/plain';

try {
    const graphData = parser.parse(content, mimeType);
    console.log(`✅ Parsed ${graphData.nodes.length} nodes and ${graphData.edges.length} edges`);
    console.log(JSON.stringify(graphData, null, 2));
} catch (e) {
    console.error('❌ Parse error:', e.message);
}
