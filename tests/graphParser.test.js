// tests/graphParser.test.js
import { describe, it, assert } from 'node:test';
import { GraphParser } from '../www/js/GraphParser.js';

describe('GraphParser', () => {
    const parser = new GraphParser();

    it('should parse valid JSON graph data', () => {
        const json = JSON.stringify({
            nodes: [{ id: 1, label: 'Test' }],
            edges: [{ from: 1, to: 2 }]
        });
        const result = parser.parse(json, 'application/json');
        assert.strictEqual(result.nodes.length, 1);
        assert.strictEqual(result.edges.length, 1);
    });

    it('should handle empty JSON gracefully', () => {
        const json = JSON.stringify({});
        const result = parser.parse(json, 'application/json');
        assert.strictEqual(result.nodes.length, 0);
        assert.strictEqual(result.edges.length, 0);
    });

    it('should throw on unsupported format', () => {
        assert.throws(() => {
            parser.parse('foo', 'application/foo');
        }, /Unsupported format/);
    });
});
