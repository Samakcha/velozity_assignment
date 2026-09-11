import React, { useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi';
import { apiUsers, Task, TaskPriority, TaskStatus } from '../../services/api';

interface DeveloperOption {
  id: string;
  name: string;
  email: string;
}

interface TaskFormProps {
  projectId: string;
  initialTask?: Task | null;
  onSave: (data: {
    title: string;
    description?: string;
    assignedToId?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string | null;
  }) => Promise<void>;
  onClose: () => void;
}

export const TaskForm: React.FC<TaskFormProps> = ({
  initialTask,
  onSave,
  onClose,
}) => {
  const [title, setTitle] = useState<string>(initialTask?.title || '');
  const [description, setDescription] = useState<string>(initialTask?.description || '');
  const [assignedToId, setAssignedToId] = useState<string>(initialTask?.assignedToId || '');
  const [status, setStatus] = useState<TaskStatus>(initialTask?.status || 'TO_DO');
  const [priority, setPriority] = useState<TaskPriority>(initialTask?.priority || 'MEDIUM');
  const [dueDate, setDueDate] = useState<string>(
    initialTask?.dueDate ? new Date(initialTask.dueDate).toISOString().split('T')[0] : ''
  );

  const [developers, setDevelopers] = useState<DeveloperOption[]>([]);
  const [loadingDevelopers, setLoadingDevelopers] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiUsers
      .getDevelopers()
      .then((data) => {
        setDevelopers(data);
        setLoadingDevelopers(false);
      })
      .catch((err) => {
        console.warn('Could not load developer list:', err.message);
        setLoadingDevelopers(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSave({
        title,
        description,
        assignedToId: assignedToId || null,
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      });
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to save task');
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <h2>{initialTask ? 'Edit Task' : 'Create New Task'}</h2>
          <button className="btn-close" onClick={onClose}>
            <FiX />
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Task Title *</label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement OAuth Login"
              required
            />
          </div>

          <div className="form-group">
            <label>Assign Developer</label>
            {loadingDevelopers ? (
              <div>Loading developers...</div>
            ) : (
              <select
                className="form-select"
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {developers.map((dev) => (
                  <option key={dev.id} value={dev.id}>
                    {dev.name} ({dev.email})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="form-row">
            <div className="form-group half">
              <label>Status</label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
              >
                <option value="TO_DO">TO DO</option>
                <option value="IN_PROGRESS">IN PROGRESS</option>
                <option value="IN_REVIEW">IN REVIEW</option>
                <option value="DONE">DONE</option>
              </select>
            </div>

            <div className="form-group half">
              <label>Priority</label>
              <select
                className="form-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Due Date</label>
            <input
              type="date"
              className="form-input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Technical instructions or task acceptance criteria..."
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : initialTask ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
