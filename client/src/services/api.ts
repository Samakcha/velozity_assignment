export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'PROJECT_MANAGER' | 'DEVELOPER';
}

export interface Client {
  id: string;
  name: string;
  email: string;
  company?: string | null;
  createdAt: string;
  _count?: { projects: number };
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  clientId: string;
  createdById: string;
  createdAt: string;
  client?: { id: string; name: string };
  createdBy?: { id: string; name: string; email: string };
  _count?: { tasks: number };
}

export type TaskStatus = 'TO_DO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  projectId: string;
  assignedToId?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string; createdById?: string };
  assignedTo?: { id: string; name: string; email: string } | null;
}

export interface ActivityItem {
  id: string;
  projectId: string;
  taskId?: string | null;
  userId: string;
  action: string;
  previousStatus?: TaskStatus | null;
  newStatus?: TaskStatus | null;
  createdAt: string;
  user?: { id: string; name: string; email: string };
  task?: { id: string; title: string };
  project?: { id: string; name: string };
}

export interface TaskFilters {
  status?: string;
  priority?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
}

const API_BASE = '/api';

let inMemoryAccessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  inMemoryAccessToken = token;
};

export const getAccessToken = (): string | null => {
  return inMemoryAccessToken;
};

export const setAccessTokenGetter = (getter: () => string | null) => {
  const val = getter();
  if (val !== undefined) {
    inMemoryAccessToken = val;
  }
};

async function fetchWithAuth<T>(
  url: string,
  options: RequestInit & { _isRetry?: boolean } = {}
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = body?.error?.message || body?.message || res.statusText || 'API Request Failed';
    const error = new Error(errorMsg);
    (error as unknown as Record<string, unknown>).status = res.status;
    (error as unknown as Record<string, unknown>).code = body?.error?.code;
    throw error;
  }

  return body.data as T;
}

// Clients API
export const apiClients = {
  list: () => fetchWithAuth<Client[]>('/clients'),
  getById: (id: string) => fetchWithAuth<Client>(`/clients/${id}`),
  create: (data: { name: string; email: string; company?: string }) =>
    fetchWithAuth<Client>('/clients', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Client>) =>
    fetchWithAuth<Client>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

// Projects API
export const apiProjects = {
  list: () => fetchWithAuth<Project[]>('/projects'),
  getById: (id: string) => fetchWithAuth<Project>(`/projects/${id}`),
  create: (data: { name: string; description?: string; clientId: string }) =>
    fetchWithAuth<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Project>) =>
    fetchWithAuth<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    fetchWithAuth<{ success: boolean }>(`/projects/${id}`, { method: 'DELETE' }),
};

// Tasks API
export const apiTasks = {
  listAll: (filters: TaskFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.dueDateFrom) params.append('dueDateFrom', filters.dueDateFrom);
    if (filters.dueDateTo) params.append('dueDateTo', filters.dueDateTo);
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchWithAuth<Task[]>(`/tasks${query}`);
  },
  listProjectTasks: (projectId: string, filters: TaskFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.dueDateFrom) params.append('dueDateFrom', filters.dueDateFrom);
    if (filters.dueDateTo) params.append('dueDateTo', filters.dueDateTo);
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchWithAuth<Task[]>(`/projects/${projectId}/tasks${query}`);
  },
  getById: (id: string) => fetchWithAuth<Task>(`/tasks/${id}`),
  create: (projectId: string, data: { title: string; description?: string; assignedToId?: string | null; priority?: TaskPriority; dueDate?: string | null }) =>
    fetchWithAuth<Task>(`/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ title: string; description?: string; assignedToId?: string | null; status: TaskStatus; priority?: TaskPriority; dueDate?: string | null }>) =>
    fetchWithAuth<Task>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => fetchWithAuth<{ success: boolean }>(`/tasks/${id}`, { method: 'DELETE' }),
};

// Activity API
export const apiActivity = {
  list: (params: { projectId?: string; limit?: number } = {}) => {
    if (params.projectId) {
      const searchParams = new URLSearchParams();
      if (params.limit) searchParams.append('limit', params.limit.toString());
      const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
      return fetchWithAuth<ActivityItem[]>(`/projects/${params.projectId}/activity${query}`);
    }
    return Promise.resolve([]);
  },
};

// Users API (Developers for assignment)
export const apiUsers = {
  getDevelopers: () => fetchWithAuth<Array<{ id: string; name: string; email: string }>>('/auth/developers'),
};
