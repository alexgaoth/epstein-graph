import { useState, useCallback } from 'react';
import { useGraphStore } from '../store/graphStore';
import { createEdge } from '../lib/api';
import TurnstileWidget from './TurnstileWidget';
import NodeSearchDropdown from './NodeSearchDropdown';

const CONNECTION_TYPES = [
  { value: 'named in document', label: 'Named in Document' },
  { value: 'flight record', label: 'Flight Record' },
  { value: 'testimony mention', label: 'Testimony Mention' },
  { value: 'financial record', label: 'Financial Record' },
  { value: 'photograph', label: 'Photograph' },
  { value: 'other', label: 'Other' },
];

export default function AddEdgeModal() {
  const { addEdgeModalOpen, addEdgeSourceNode, closeAddEdgeModal, addEdge, getNodeById } = useGraphStore();

  const [target, setTarget] = useState('');
  const [connectionType, setConnectionType] = useState('other');
  const [dojLink, setDojLink] = useState('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [quoteSnippet, setQuoteSnippet] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleToken = useCallback((token: string) => setTurnstileToken(token), []);

  const sourceNode = addEdgeSourceNode ? getNodeById(addEdgeSourceNode) : null;

  const resetForm = () => {
    setTarget('');
    setConnectionType('other');
    setDojLink('');
    setDocumentTitle('');
    setQuoteSnippet('');
    setTurnstileToken('');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    closeAddEdgeModal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !addEdgeSourceNode) return;
    setError('');

    if (!target) {
      setError('Please select a target person');
      return;
    }

    setSubmitting(true);
    try {
      const edge = await createEdge({
        source: addEdgeSourceNode,
        target,
        connection_type: connectionType,
        doj_link: dojLink.trim(),
        document_title: documentTitle.trim(),
        quote_snippet: quoteSnippet.trim(),
        turnstileToken,
      });
      addEdge(edge);
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add connection');
    } finally {
      setSubmitting(false);
    }
  };

  if (!addEdgeModalOpen || !addEdgeSourceNode) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={handleClose}>
      <div
        className="w-full max-w-md mx-4 rounded-xl bg-graph-surface border border-graph-border shadow-2xl fade-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-graph-border">
          <h2 className="text-base font-medium text-graph-text">Add Connection</h2>
          <button
            onClick={handleClose}
            className="p-1 text-graph-text-dim hover:text-graph-text transition-colors"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Source (read-only) */}
          <div>
            <label className="block text-xs text-graph-text-dim mb-1">From</label>
            <div className="px-3 py-2 rounded-lg bg-graph-bg/80 border border-graph-border text-sm text-graph-accent">
              {sourceNode?.label || addEdgeSourceNode}
            </div>
          </div>

          {/* Target (searchable dropdown) */}
          <NodeSearchDropdown
            value={target}
            onChange={setTarget}
            excludeId={addEdgeSourceNode}
            label="To *"
          />

          {/* Connection type */}
          <div>
            <label className="block text-xs text-graph-text-dim mb-1">Connection Type</label>
            <select
              value={connectionType}
              onChange={(e) => setConnectionType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-graph-bg/80 border border-graph-border text-sm text-graph-text focus:outline-none focus:border-graph-accent/40"
            >
              {CONNECTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Document link */}
          <div>
            <label className="block text-xs text-graph-text-dim mb-1">Document Link (optional)</label>
            <input
              type="url"
              value={dojLink}
              onChange={(e) => setDojLink(e.target.value)}
              placeholder="https://…"
              maxLength={500}
              className="w-full px-3 py-2 rounded-lg bg-graph-bg/80 border border-graph-border text-sm text-graph-text placeholder-graph-text-dim focus:outline-none focus:border-graph-accent/40"
            />
          </div>

          {/* Document title */}
          <div>
            <label className="block text-xs text-graph-text-dim mb-1">Document Title (optional)</label>
            <input
              type="text"
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              placeholder="e.g. Deposition Transcript, Flight Log"
              maxLength={300}
              className="w-full px-3 py-2 rounded-lg bg-graph-bg/80 border border-graph-border text-sm text-graph-text placeholder-graph-text-dim focus:outline-none focus:border-graph-accent/40"
            />
          </div>

          {/* Quote snippet */}
          <div>
            <label className="block text-xs text-graph-text-dim mb-1">Quote / Excerpt (optional)</label>
            <textarea
              value={quoteSnippet}
              onChange={(e) => setQuoteSnippet(e.target.value)}
              placeholder="Relevant excerpt from the document…"
              maxLength={1000}
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-graph-bg/80 border border-graph-border text-sm text-graph-text placeholder-graph-text-dim focus:outline-none focus:border-graph-accent/40 resize-none"
            />
          </div>

          {/* Turnstile */}
          <TurnstileWidget onToken={handleToken} />

          {/* Error */}
          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-lg bg-graph-accent/20 border border-graph-accent/30 text-sm text-graph-accent hover:bg-graph-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Adding…' : 'Add Connection'}
          </button>
        </form>
      </div>
    </div>
  );
}
