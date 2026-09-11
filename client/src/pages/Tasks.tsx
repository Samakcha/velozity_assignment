import React, { useEffect, useState } from 'react';
import { FiCheckSquare } from 'react-icons/fi';
import { useAuth } from '../auth/AuthContext';
import { TaskList } from '../components/tasks/TaskList';
import { TaskFilters } from '../components/tasks/TaskFilters';
import { apiTasks, Task, TaskFilters as TaskFilterType, TaskStatus } from '../services/api';
import { connectSocket } from '../socket/socket';

export const Tasks: React.FC = () => {
  const { user, accessToken } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filters, setFilters] = useState<TaskFilterType>({});

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const isDev = user?.role === 'DEVELOPER';

  const loadTasks = async (activeFilters: TaskFilterType = {}) => {
    try {
      setLoading(true);
      const data = await apiTasks.listAll(activeFilters);
      setTasks(data);
      setLoading(false);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load tasks');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks(filters);
  }, [filters]);

  // Real-time task update listener
  useEffect(() => {
    if (!accessToken) return;

    const socket = connectSocket(accessToken);

    const handleTaskActivity = () => {
      apiTasks
        .listAll(filters)
        .then((data) => setTasks(data))
        .catch((err) => console.error('Failed to update live tasks:', err));
    };

    socket.on('activity_event', handleTaskActivity);

    return () => {
      socket.off('activity_event', handleTaskActivity);
    };
  }, [accessToken, filters]);

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    await apiTasks.update(taskId, { status: newStatus });
    await loadTasks(filters);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await apiTasks.delete(taskId);
      await loadTasks(filters);
    }
  };

  if (loading) {
    return <div className="page-loading">Loading Tasks...</div>;
  }

  if (error) {
    return <div className="page-error">{error}</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}><FiCheckSquare style={{ color: '#10b981' }} /> Tasks Directory</h1>
          <p className="page-subtitle">
            {isDev
              ? 'View your assigned tasks and update progress.'
              : 'View and filter all system/project tasks.'}
          </p>
        </div>
      </div>

      <TaskFilters
        filters={filters}
        onChange={(f) => setFilters(f)}
        onClear={() => setFilters({})}
      />

      <TaskList
        tasks={tasks}
        onStatusChange={handleStatusChange}
        onDelete={handleDeleteTask}
        canManageTasks={!isDev}
      />
    </div>
  );
};
