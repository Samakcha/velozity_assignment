import React, { useState } from 'react';
import { Task, TaskStatus } from '../../services/api';

interface TaskStatusControlProps {
  task: Task;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  disabled?: boolean;
}

export const TaskStatusControl: React.FC<TaskStatusControlProps> = ({
  task,
  onStatusChange,
  disabled = false,
}) => {
  const [updating, setUpdating] = useState<boolean>(false);

  const handleSelectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as TaskStatus;
    if (newStatus === task.status) return;

    try {
      setUpdating(true);
      await onStatusChange(task.id, newStatus);
    } finally {
      setUpdating(false);
    }
  };

  const currentStatus = (task.status as string) === 'TODO' ? 'TO_DO' : task.status;

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'TO_DO':
      case 'TODO':
        return { backgroundColor: '#6b7280', color: '#ffffff' };
      case 'IN_PROGRESS':
        return { backgroundColor: '#3b82f6', color: '#ffffff' };
      case 'IN_REVIEW':
        return { backgroundColor: '#8b5cf6', color: '#ffffff' };
      case 'DONE':
        return { backgroundColor: '#10b981', color: '#ffffff' };
      case 'OVERDUE':
        return { backgroundColor: '#ef4444', color: '#ffffff' };
      default:
        return { backgroundColor: '#6b7280', color: '#ffffff' };
    }
  };

  return (
    <div className="status-control">
      <select
        className="status-select-pill"
        style={getStatusBadgeStyle(task.status)}
        value={currentStatus}
        onChange={handleSelectChange}
        disabled={disabled || updating}
      >
        <option value="TO_DO">TO DO</option>
        <option value="IN_PROGRESS">IN PROGRESS</option>
        <option value="IN_REVIEW">IN REVIEW</option>
        <option value="DONE">DONE</option>
      </select>
      {updating && <span className="updating-spinner">...</span>}
    </div>
  );
};
