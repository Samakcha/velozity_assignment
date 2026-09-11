import React, { useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi';
import { apiClients, Client, Project } from '../../services/api';

interface ProjectFormProps {
  initialProject?: Project | null;
  onSave: (data: { name: string; description?: string; clientId: string }) => Promise<void>;
  onClose: () => void;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({ initialProject, onSave, onClose }) => {
  const [name, setName] = useState<string>(initialProject?.name || '');
  const [description, setDescription] = useState<string>(initialProject?.description || '');
  const [clientId, setClientId] = useState<string>(initialProject?.clientId || '');

  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClients
      .list()
      .then((data) => {
        setClients(data);
        if (!clientId && data.length > 0) {
          setClientId(data[0].id);
        }
        setLoadingClients(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load client list');
        setLoadingClients(false);
      });
  }, [clientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }
    if (!clientId) {
      setError('Please select a client');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSave({ name, description, clientId });
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to save project');
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <h2>{initialProject ? 'Edit Project' : 'Create New Project'}</h2>
          <button className="btn-close" onClick={onClose}>
            <FiX />
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Project Name *</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. E-Commerce Redesign"
              required
            />
          </div>

          <div className="form-group">
            <label>Client *</label>
            {loadingClients ? (
              <div>Loading clients...</div>
            ) : (
              <select
                className="form-select"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
              >
                <option value="">Select a Client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.company ? `(${c.company})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed project requirements..."
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : initialProject ? 'Update Project' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
