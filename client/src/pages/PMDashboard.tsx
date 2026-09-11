import React, { useEffect, useState } from 'react';
import { FiBriefcase, FiPlus, FiFolder, FiSearch, FiCheckSquare } from 'react-icons/fi';
import { useAuth } from '../auth/AuthContext';
import { StatCard } from '../components/dashboard/StatCard';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { ProjectList } from '../components/projects/ProjectList';
import { TaskList } from '../components/tasks/TaskList';
import { ProjectForm } from '../components/projects/ProjectForm';
import { apiProjects, apiTasks, Project, Task, TaskStatus } from '../services/api';
import { connectSocket } from '../socket/socket';

export const PMDashboard: React.FC = () => {
  const { user, accessToken } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showProjectModal, setShowProjectModal] = useState<boolean>(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadPMData = async () => {
    try {
      setLoading(true);
      const [projData, taskData] = await Promise.all([
        apiProjects.list(),
        apiTasks.listAll(),
      ]);

      setProjects(projData);
      setTasks(taskData);
      setLoading(false);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load Project Manager data');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPMData();
  }, []);

  // Real-time task/activity update listener for PM Workspace
  useEffect(() => {
    if (!accessToken) return;

    const socket = connectSocket(accessToken);

    const handleTaskActivity = () => {
      loadPMData();
    };

    socket.on('activity_event', handleTaskActivity);

    return () => {
      socket.off('activity_event', handleTaskActivity);
    };
  }, [accessToken]);

  const handleCreateOrUpdateProject = async (data: {
    name: string;
    description?: string;
    clientId: string;
  }) => {
    if (editingProject) {
      await apiProjects.update(editingProject.id, data);
    } else {
      await apiProjects.create(data);
    }
    await loadPMData();
    setShowProjectModal(false);
    setEditingProject(null);
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    await apiTasks.update(taskId, { status: newStatus });
    const updatedTasks = await apiTasks.listAll();
    setTasks(updatedTasks);
  };

  const handleDeleteProject = async (project: Project) => {
    if (
      window.confirm(
        'Are you sure you want to delete this project? This action cannot be undone.'
      )
    ) {
      try {
        await apiProjects.delete(project.id);
        await loadPMData();
      } catch (err: unknown) {
        alert((err as Error).message || 'Failed to delete project');
      }
    }
  };

  if (loading) {
    return <div className="page-loading">Loading Project Manager Dashboard...</div>;
  }

  if (error) {
    return <div className="page-error">{error}</div>;
  }

  const inReviewTasks = tasks.filter((t) => t.status === 'IN_REVIEW');

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}><FiBriefcase style={{ color: '#3b82f6' }} /> Project Manager Workspace</h1>
          <p className="page-subtitle">
            Welcome back, {user?.name}. Manage your projects, review task submissions, and track developer activity.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowProjectModal(true)}>
          <FiPlus /> New Project
        </button>
      </div>

      <div className="stats-grid">
        <StatCard title="My Owned Projects" value={projects.length} icon={<FiFolder />} color="#3b82f6" />
        <StatCard title="In Review Needs Action" value={inReviewTasks.length} icon={<FiSearch />} color="#f59e0b" />
        <StatCard title="Total Project Tasks" value={tasks.length} icon={<FiCheckSquare />} color="#8b5cf6" />
      </div>

      <div className="dashboard-layout">
        <div className="dashboard-main">
          {inReviewTasks.length > 0 && (
            <section className="dashboard-section highlight-section">
              <div className="section-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FiSearch style={{ color: '#f59e0b' }} /> Tasks Pending Your Review ({inReviewTasks.length})</h2>
              </div>
              <TaskList
                tasks={inReviewTasks}
                onStatusChange={handleStatusChange}
                canManageTasks={true}
              />
            </section>
          )}

          <section className="dashboard-section">
            <div className="section-header">
              <h2>My Projects</h2>
            </div>
            <ProjectList
              projects={projects}
              canEdit={true}
              canDelete={true}
              onEdit={(proj) => {
                setEditingProject(proj);
                setShowProjectModal(true);
              }}
              onDelete={handleDeleteProject}
            />
          </section>
        </div>

        <aside className="dashboard-sidebar">
          <ActivityFeed limit={15} />
        </aside>
      </div>

      {showProjectModal && (
        <ProjectForm
          initialProject={editingProject}
          onSave={handleCreateOrUpdateProject}
          onClose={() => {
            setShowProjectModal(false);
            setEditingProject(null);
          }}
        />
      )}
    </div>
  );
};
