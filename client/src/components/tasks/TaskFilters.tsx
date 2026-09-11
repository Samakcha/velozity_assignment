import React from 'react';
import { TaskFilters as TaskFilterType } from '../../services/api';

interface TaskFiltersProps {
  filters: TaskFilterType;
  onChange: (filters: TaskFilterType) => void;
  onClear: () => void;
}

export const TaskFilters: React.FC<TaskFiltersProps> = ({ filters, onChange, onClear }) => {
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...filters, status: e.target.value || undefined });
  };

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...filters, priority: e.target.value || undefined });
  };

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, dueDateFrom: e.target.value || undefined });
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, dueDateTo: e.target.value || undefined });
  };

  const hasActiveFilters =
    Boolean(filters.status) ||
    Boolean(filters.priority) ||
    Boolean(filters.dueDateFrom) ||
    Boolean(filters.dueDateTo);

  return (
    <div className="task-filters-bar">
      <div className="filter-group">
        <label>Status:</label>
        <select
          className="filter-select"
          value={filters.status || ''}
          onChange={handleStatusChange}
        >
          <option value="">All Statuses</option>
          <option value="TO_DO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="IN_REVIEW">In Review</option>
          <option value="DONE">Done</option>
          <option value="OVERDUE">Overdue</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Priority:</label>
        <select
          className="filter-select"
          value={filters.priority || ''}
          onChange={handlePriorityChange}
        >
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Due From:</label>
        <input
          type="date"
          className="filter-input"
          value={filters.dueDateFrom || ''}
          onChange={handleDateFromChange}
        />
      </div>

      <div className="filter-group">
        <label>Due To:</label>
        <input
          type="date"
          className="filter-input"
          value={filters.dueDateTo || ''}
          onChange={handleDateToChange}
        />
      </div>

      {hasActiveFilters && (
        <button className="btn-secondary btn-sm" onClick={onClear}>
          Clear Filters
        </button>
      )}
    </div>
  );
};
