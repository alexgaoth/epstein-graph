import { useState, useCallback } from 'react';
import { useGraphStore } from '../store/graphStore';
import { createNode } from '../lib/api';
import TurnstileWidget from './TurnstileWidget';

const GROUPS = [
  { value: 'associate', label: 'Associate' },
  { value: 'staff', label: 'Staff' },
  { value: 'accuser', label: 'Accuser' },
  { value: 'legal', label: 'Legal' },
  { value: 'aviation', label: 'Aviation' },
  { value: 'prosecution', label: 'Prosecution' },
  { value: 'international', label: 'International' },
];

export default function AddNodeModal() {
  const { addNodeModalOpen, closeAddNodeModal, addNode, selectNode } = useGraphStore();

  const [label, setLabel] = useState('');
  const [role, setRole] = useState('');
  const [group, setGroup] = useState('associate');
  const [gender, setGender] = useState('male');
  const [image, setImage] = useState<File | null>(null);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleToken = useCallback((token: string) => setTurnstileToken(token), []);

  const resetForm = () => {
    setLabel('');
    setRole('');
    setGroup('associate');
    setGender('male');
    setImage(null);
    setTurnstileToken('');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    closeAddNodeModal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError('');

    if (label.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('label', label.trim());
      formData.append('role', role.trim());
      formData.append('group', group);
      formData.append('gender', gender);
      if (image) formData.append('image', image);
      formData.append('turnstileToken', turnstileToken);

      const node = await createNode(formData);
      addNode(node);
      handleClose();

      // Center camera on new node after a tick
      setTimeout(() => {
        selectNode(node.id);
        window.__centerOnGraphNode?.(node.id);
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Failed to add person');
    } finally {
      setSubmitting(false);
    }
  };

  if (!addNodeModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={handleClose}>
      <div
        className="w-full max-w-md mx-4 rounded-xl bg-graph-surface border border-graph-border shadow-2xl fade-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-graph-border">
          <h2 className="text-base font-medium text-graph-text">Add Person</h2>
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
          {/* Name */}
          <div>
            <label className="block text-xs text-graph-text-dim mb-1">Name *</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Full name"
              maxLength={100}
              className="w-full px-3 py-2 rounded-lg bg-graph-bg/80 border border-graph-border text-sm text-graph-text placeholder-graph-text-dim focus:outline-none focus:border-graph-accent/40"
              autoFocus
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs text-graph-text-dim mb-1">Role / Description</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Financier, Attorney, Pilot"
              maxLength={200}
              className="w-full px-3 py-2 rounded-lg bg-graph-bg/80 border border-graph-border text-sm text-graph-text placeholder-graph-text-dim focus:outline-none focus:border-graph-accent/40"
            />
          </div>

          {/* Group + Gender row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-graph-text-dim mb-1">Group</label>
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-graph-bg/80 border border-graph-border text-sm text-graph-text focus:outline-none focus:border-graph-accent/40"
              >
                {GROUPS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-graph-text-dim mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-graph-bg/80 border border-graph-border text-sm text-graph-text focus:outline-none focus:border-graph-accent/40"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>

          {/* Image upload */}
          <div>
            <label className="block text-xs text-graph-text-dim mb-1">Portrait (optional, max 2 MB)</label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
              className="w-full text-xs text-graph-text-dim file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-graph-border file:bg-graph-bg/80 file:text-graph-text-dim file:text-xs hover:file:border-graph-accent/40 file:transition-colors file:cursor-pointer"
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
            {submitting ? 'Adding…' : 'Add Person'}
          </button>
        </form>
      </div>
    </div>
  );
}
