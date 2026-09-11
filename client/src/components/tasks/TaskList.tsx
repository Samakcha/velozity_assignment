import React from 'react';
import { FiUser, FiCalendar } from 'react-icons/fi';
import { Task, TaskStatus } from '../../services/api';
import { TaskStatusControl } from './TaskStatusControl';

interface TaskListProps {
  tasks: Task[];
  onStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => Promise<void>;
  canManageTasks?: boolean;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onStatusChange,
  onEdit,
  onDelete,
  canManageTasks = false,
}) => {
  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return 'priority-low';
      case 'MEDIUM':
        return 'priority-medium';
      case 'HIGH':
        return 'priority-high';
      case 'URGENT':
        return 'priority-urgent';
      default:
        return '';
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'No due date';
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (tasks.length === 0) {
    return <div className="empty-state">No tasks found.</div>;
  }

  return (
    <div className="table-responsive">
      <table className="data-table">
        <thead>
          <tr>
            <th>Task Title</th>
            <th>Project</th>
            <th>Assignee</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Due Date</th>
            {canManageTasks && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
              <td>
                <div className="task-title-cell">
                  <span className="task-title">{task.title}</span>
                  {task.description && (
                    <span className="task-description-sub">{task.description}</span>
                  )}
                </div>
              </td>
              <td>{task.project?.name || '—'}</td>
              <td>
                {task.assignedTo ? (
                  <span className="assignee-tag"><FiUser style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {task.assignedTo.name}</span>
                ) : (
                  <span className="unassigned-tag">Unassigned</span>
                )}
              </td>
              <td>
                <span className={`priority-badge ${getPriorityBadgeClass(task.priority)}`}>
                  {task.priority}
                </span>
              </td>
              <td>
                <TaskStatusControl task={task} onStatusChange={onStatusChange} />
              </td>
              <td>
                <span
                  className={
                    task.status === 'DONE'
                      ? 'due-normal'
                      : task.dueDate && new Date(task.dueDate) < new Date()
                      ? 'due-overdue'
                      : 'due-normal'
                  }
                >
                  <FiCalendar style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {formatDate(task.dueDate)}
                </span>
              </td>
              {canManageTasks && (
                <td>
                  <div className="action-buttons">
                    {onEdit && (
                      <button className="btn-secondary btn-sm" onClick={() => onEdit(task)}>
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        className="btn-danger btn-sm"
                        onClick={() => onDelete(task.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
