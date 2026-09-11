import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiBriefcase } from 'react-icons/fi';
import { useAuth } from '../auth/AuthContext';
import { TaskList } from '../components/tasks/TaskList';
import { TaskFilters } from '../components/tasks/TaskFilters';
import { TaskForm } from '../components/tasks/TaskForm';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import {
  apiProjects,
  apiTasks,
  Project,
  Task,
  TaskFilters as TaskFilterType,
  TaskStatus,
  TaskPriority,
} from '../services/api';
import {
  connectSocket,
  joinProjectRoom,
  leaveProjectRoom,
  SocketActivityEvent,
} from '../socket/socket';

export const ProjectDetails: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const { user, isDev, accessToken } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filters, setFilters] = useState<TaskFilterType>({});
  const [showTaskModal, setShowTaskModal] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (activeFilters: TaskFilterType = {}) => {
    if (!projectId) return;
    try {
      setLoading(true);
      const [projData, taskData] = await Promise.all([
        apiProjects.getById(projectId),
        apiTasks.listProjectTasks(projectId, activeFilters),
      ]);
      setProject(projData);
      setTasks(taskData);
      setLoading(false);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load project details');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(filters);
  }, [projectId, filters]);

  // Real-time task update listener for Project Details
  useEffect(() => {
    if (!accessToken || !projectId) return;

    const socket = connectSocket(accessToken);

    const handleTaskActivity = (event: SocketActivityEvent) => {
      if (event.projectId === projectId) {
        apiTasks
          .listProjectTasks(projectId, filters)
          .then((updatedTasks) => setTasks(updatedTasks))
          .catch((err) => console.error('Failed to update live project tasks:', err));
      }
    };

    socket.on('activity_event', handleTaskActivity);

    return () => {
      socket.off('activity_event', handleTaskActivity);
    };
  }, [accessToken, projectId, filters]);

  // Phase 6 Socket.io Room Join Authorization Rules
  useEffect(() => {
    if (!projectId || !user) return;

    // PMs join only if project.createdById === user.id
    // Admins join any room
    // Developers NEVER join project rooms (they receive activity via user:<userId>)
    const canJoinRoom =
      user.role === 'ADMIN' || (user.role === 'PROJECT_MANAGER' && project?.createdById === user.id);

    if (canJoinRoom) {
      joinProjectRoom(projectId, (res) => {
        if (!res.success) {
          console.warn('Socket room join response:', res.message);
        }
      });

      return () => {
        leaveProjectRoom(projectId);
      };
    }
  }, [projectId, user, project]);

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    await apiTasks.update(taskId, { status: newStatus });
    await loadData(filters);
  };

  const handleSaveTask = async (data: {
    title: string;
    description?: string;
    assignedToId?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string | null;
  }) => {
    if (!projectId) return;
    if (editingTask) {
      await apiTasks.update(editingTask.id, data);
    } else {
      await apiTasks.create(projectId, data);
    }
    await loadData(filters);
    setShowTaskModal(false);
    setEditingTask(null);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await apiTasks.delete(taskId);
      await loadData(filters);
    }
  };

  if (loading) {
    return <div className="page-loading">Loading Project Details...</div>;
  }

  if (error || !project) {
    return <div className="page-error">{error || 'Project not found'}</div>;
  }

  return (
    <div className="page-container">
      <div className="breadcrumb">
        <Link to="/projects" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <FiArrowLeft /> Back to Projects
        </Link>
      </div>

      <div className="page-header">
        <div>
          <h1>{project.name}</h1>
          <p className="page-subtitle">{project.description || 'No description provided.'}</p>
        </div>
        {!isDev && (
          <button className="btn-primary" onClick={() => setShowTaskModal(true)}>
            <FiPlus /> Create Task
          </button>
        )}
      </div>

      <div className="project-detail-meta">
        <span className="meta-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <FiBriefcase /> Client: {project.client?.name || 'Unassigned'}
        </span>
        <span className="meta-pill">Created By: {project.createdBy?.name || '—'}</span>
      </div>

      <div className="dashboard-layout">
        <div className="dashboard-main">
          <section className="dashboard-section">
            <div className="section-header">
              <h2>Project Tasks ({tasks.length})</h2>
            </div>

            <TaskFilters
              filters={filters}
              onChange={(f) => setFilters(f)}
              onClear={() => setFilters({})}
            />

            <TaskList
              tasks={tasks}
              onStatusChange={handleStatusChange}
              onEdit={(task) => {
                setEditingTask(task);
                setShowTaskModal(true);
              }}
              onDelete={handleDeleteTask}
              canManageTasks={!isDev}
            />
          </section>
        </div>

        <aside className="dashboard-sidebar">
          <ActivityFeed projectId={projectId} limit={15} />
        </aside>
      </div>

      {showTaskModal && projectId && (
        <TaskForm
          projectId={projectId}
          initialTask={editingTask}
          onSave={handleSaveTask}
          onClose={() => {
            setShowTaskModal(false);
            setEditingTask(null);
          }}
        />
      )}
    </div>
  );
};
