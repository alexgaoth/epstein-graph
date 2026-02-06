/**
 * Unit tests for fetch_doj.js — name matching and JSON schema validation.
 *
 * Run: npm test
 */

import { findNameMentions, validateGraphSchema } from '../fetch_doj.js';

describe('findNameMentions', () => {
  test('finds exact name match in text', () => {
    const text = 'The defendant Ghislaine Maxwell was arrested on July 2, 2020.';
    const results = findNameMentions(text, 'Ghislaine Maxwell');
    expect(results).toHaveLength(1);
    expect(results[0].snippet).toContain('Ghislaine Maxwell');
  });

  test('returns empty array when name not found', () => {
    const text = 'This document does not reference the individual.';
    const results = findNameMentions(text, 'John Doe');
    expect(results).toHaveLength(0);
  });

  test('finds multiple mentions', () => {
    const text =
      'Sarah Kellen was identified as a co-conspirator. Later, Sarah Kellen was mentioned again in the testimony.';
    const results = findNameMentions(text, 'Sarah Kellen', 5);
    expect(results).toHaveLength(2);
  });

  test('is case-insensitive', () => {
    const text = 'GHISLAINE MAXWELL appeared in court.';
    const results = findNameMentions(text, 'Ghislaine Maxwell');
    expect(results).toHaveLength(1);
  });

  test('respects maxSnippets limit', () => {
    const text = 'Name Name Name Name Name'.replace(/Name/g, 'Jeffrey Epstein');
    const results = findNameMentions(text, 'Jeffrey Epstein', 2);
    expect(results).toHaveLength(2);
  });
});

describe('validateGraphSchema', () => {
  const validGraph = {
    nodes: [
      { id: 'epstein', label: 'Jeffrey Epstein', role: 'Central subject' },
      { id: 'person1', label: 'Person One', role: 'Associate' },
    ],
    edges: [
      {
        id: 'e-1',
        source: 'epstein',
        target: 'person1',
        connection_type: 'named in document',
        doj_link: 'https://www.justice.gov/usao-sdny/test',
        document_title: 'Test Document',
      },
    ],
  };

  test('validates a correct graph', () => {
    const result = validateGraphSchema(validGraph);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('rejects null data', () => {
    const result = validateGraphSchema(null);
    expect(result.valid).toBe(false);
  });

  test('rejects missing nodes array', () => {
    const result = validateGraphSchema({ edges: [] });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing or invalid "nodes" array');
  });

  test('rejects missing edges array', () => {
    const result = validateGraphSchema({ nodes: [] });
    expect(result.valid).toBe(false);
  });

  test('rejects node without id', () => {
    const data = {
      nodes: [{ label: 'No ID' }],
      edges: [],
    };
    const result = validateGraphSchema(data);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('missing "id"');
  });

  test('rejects edge with invalid connection_type', () => {
    const data = {
      nodes: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ],
      edges: [
        {
          id: 'e1',
          source: 'a',
          target: 'b',
          connection_type: 'invalid_type',
          doj_link: 'https://www.justice.gov/test',
          document_title: 'Test',
        },
      ],
    };
    const result = validateGraphSchema(data);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('invalid connection_type');
  });

  test('rejects edge referencing non-existent node', () => {
    const data = {
      nodes: [{ id: 'a', label: 'A' }],
      edges: [
        {
          id: 'e1',
          source: 'a',
          target: 'nonexistent',
          connection_type: 'named in document',
          doj_link: 'https://www.justice.gov/test',
          document_title: 'Test',
        },
      ],
    };
    const result = validateGraphSchema(data);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('not found in nodes');
  });

  test('rejects edge without justice.gov doj_link', () => {
    const data = {
      nodes: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ],
      edges: [
        {
          id: 'e1',
          source: 'a',
          target: 'b',
          connection_type: 'named in document',
          doj_link: 'https://example.com/test',
          document_title: 'Test',
        },
      ],
    };
    const result = validateGraphSchema(data);
    expect(result.valid).toBe(false);
  });
});
