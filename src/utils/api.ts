/**
 * API client for backend communication
 */

// Use relative URL in production, localhost in development
const API_BASE_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? '/api' : 'http://localhost:8000/api');

// Token storage key
const TOKEN_KEY = 'qcloud_auth_token';

/**
 * Get stored auth token
 */
export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Store auth token
 */
export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Remove auth token
 */
export function removeAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * API request options
 */
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
  requireAuth?: boolean;
}

/**
 * API error class
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public detail?: string
  ) {
    super(detail || statusText);
    this.name = 'ApiError';
  }
}

/**
 * Make an API request
 */
async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, requireAuth = false } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Add auth header if token exists or required
  const token = getAuthToken();
  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  } else if (requireAuth) {
    throw new ApiError(401, 'Unauthorized', 'Authentication required');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Handle non-OK responses
  if (!response.ok) {
    let detail: string | undefined;
    try {
      const errorData = await response.json();
      detail = errorData.detail;
    } catch {
      // Ignore JSON parse errors
    }
    throw new ApiError(response.status, response.statusText, detail);
  }

  // Return empty for 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// ============ Auth API ============

export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url: string | null;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserStats {
  total_score: number;
  problems_solved: number;
  total_submissions: number;
  global_rank: number | null;
  badges: string[];
}

export interface UserProfile extends User {
  stats: UserStats | null;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export const authApi = {
  /**
   * Register a new user
   */
  register: (email: string, username: string, password: string) =>
    apiRequest<User>('/auth/register', {
      method: 'POST',
      body: { email, username, password },
    }),

  /**
   * Login and get token
   */
  login: (email: string, password: string) =>
    apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  /**
   * Logout (client-side token removal)
   */
  logout: () =>
    apiRequest('/auth/logout', {
      method: 'POST',
      requireAuth: true,
    }),

  /**
   * Get current user info
   */
  me: () =>
    apiRequest<UserProfile>('/auth/me', {
      requireAuth: true,
    }),
};

// ============ Users API ============

export interface UserProblemProgress {
  problem_id: string;
  status: string;
  best_score: number;
  submission_count: number;
  last_submitted_at: string | null;
}

export const usersApi = {
  /**
   * Get user profile by ID
   */
  getUser: (userId: string) =>
    apiRequest<UserProfile>(`/users/${userId}`),

  /**
   * Get user stats
   */
  getUserStats: (userId: string) =>
    apiRequest<UserStats>(`/users/${userId}/stats`),

  /**
   * Update current user profile
   */
  updateProfile: (data: { username?: string; avatar_url?: string }) =>
    apiRequest<User>('/users/me', {
      method: 'PUT',
      body: data,
      requireAuth: true,
    }),

  /**
   * Get current user's problem progress
   */
  getMyProgress: () =>
    apiRequest<UserProblemProgress[]>('/users/me/progress', {
      requireAuth: true,
    }),
};

// ============ Submissions API ============

export interface Submission {
  id: string;
  user_id: string;
  problem_id: string;
  code: string;
  submission_type: string;
  target: string;
  status: string;
  score: number | null;
  fidelity: number | null;
  gate_count: number | null;
  circuit_depth: number | null;
  qubit_count: number | null;
  feedback: unknown[] | null;
  test_results: unknown[] | null;
  created_at: string;
  completed_at: string | null;
}

export interface SubmissionList {
  submissions: Submission[];
  total: number;
}

export const submissionsApi = {
  /**
   * Create a new submission
   */
  create: (data: {
    problem_id: string;
    code: string;
    submission_type?: string;
    target?: string;
  }) =>
    apiRequest<Submission>('/submissions/', {
      method: 'POST',
      body: data,
      requireAuth: true,
    }),

  /**
   * Get submission by ID
   */
  get: (submissionId: string) =>
    apiRequest<Submission>(`/submissions/${submissionId}`, {
      requireAuth: true,
    }),

  /**
   * Get current user's submissions
   */
  getMine: (options?: { limit?: number; offset?: number; problem_id?: string }) => {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.problem_id) params.append('problem_id', options.problem_id);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<SubmissionList>(`/submissions/me/${query}`, {
      requireAuth: true,
    });
  },
};

// ============ Jobs API ============

export interface Job {
  id: string;
  submission_id: string;
  user_id: string;
  ibmq_job_id: string | null;
  backend_name: string;
  status: string;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface JobResult {
  id: string;
  submission_id: string;
  status: string;
  result: unknown;
  error_message: string | null;
  completed_at: string | null;
}

export const jobsApi = {
  /**
   * Submit job to IBMQ
   */
  submit: (submissionId: string, backendName: string = 'ibm_brisbane') =>
    apiRequest<Job>('/jobs/submit', {
      method: 'POST',
      body: { submission_id: submissionId, backend_name: backendName },
      requireAuth: true,
    }),

  /**
   * Get job status
   */
  get: (jobId: string) =>
    apiRequest<Job>(`/jobs/${jobId}`, {
      requireAuth: true,
    }),

  /**
   * Get job result
   */
  getResult: (jobId: string) =>
    apiRequest<JobResult>(`/jobs/${jobId}/result`, {
      requireAuth: true,
    }),

  /**
   * Get my jobs
   */
  getMine: () =>
    apiRequest<Job[]>('/jobs/', {
      requireAuth: true,
    }),

  /**
   * Get available backends
   */
  getBackends: () =>
    apiRequest<{ backends: string[]; available: boolean }>('/jobs/backends/available'),
};

// ============ Leaderboard API ============

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_score?: number;
  problems_solved?: number;
  total_submissions?: number;
  score?: number;
  submitted_at?: string;
}

export interface GlobalLeaderboard {
  leaderboard: LeaderboardEntry[];
  total_entries: number;
  my_rank?: number;
}

export interface ProblemLeaderboard {
  problem_id: string;
  leaderboard: LeaderboardEntry[];
  total_entries: number;
}

export const leaderboardApi = {
  /**
   * Get global leaderboard
   */
  getGlobal: (options?: { limit?: number; offset?: number }) => {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<GlobalLeaderboard>(`/leaderboard/global${query}`);
  },

  /**
   * Get problem leaderboard
   */
  getProblem: (problemId: string, options?: { limit?: number; offset?: number }) => {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<ProblemLeaderboard>(`/leaderboard/problem/${problemId}${query}`);
  },
};

// ============ Admin API ============

export interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  order: number;
  is_active: boolean;
  problem_count: number;
  created_at: string;
  updated_at: string;
}

export interface Problem {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  max_qubits: number;
  max_gate_count: number;
  max_circuit_depth: number;
  allowed_gates: string[] | null;
  max_two_qubit_gates: number | null;
  min_fidelity: number;
  target_fidelity: number;
  fidelity_metric: string;
  test_cases: unknown[];
  hints: string[];
  starter_code: string | null;
  solution_template?: string | null;
  author: string;
  tags: string[];
  max_score: number;
  time_bonus: boolean;
  solve_count: number;
  attempt_count: number;
  is_active: boolean;
  is_featured: boolean;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface Example {
  id: string;
  title: string;
  description: string | null;
  category: string;
  difficulty: string;
  code: string;
  explanation: string | null;
  author: string;
  tags: string[];
  icon: string;
  view_count: number;
  copy_count: number;
  is_active: boolean;
  is_featured: boolean;
  order: number;
  created_at: string;
  updated_at: string;
}

export const adminApi = {
  // Categories
  listCategories: (includeInactive = false) =>
    apiRequest<Category[]>(`/admin/categories?include_inactive=${includeInactive}`, {
      requireAuth: true,
    }),

  getCategory: (id: string) =>
    apiRequest<Category>(`/admin/categories/${id}`, {
      requireAuth: true,
    }),

  createCategory: (data: Partial<Category>) =>
    apiRequest<Category>('/admin/categories', {
      method: 'POST',
      body: data,
      requireAuth: true,
    }),

  updateCategory: (id: string, data: Partial<Category>) =>
    apiRequest<Category>(`/admin/categories/${id}`, {
      method: 'PUT',
      body: data,
      requireAuth: true,
    }),

  deleteCategory: (id: string) =>
    apiRequest(`/admin/categories/${id}`, {
      method: 'DELETE',
      requireAuth: true,
    }),

  // Problems
  listProblems: (options?: { category?: string; includeInactive?: boolean }) => {
    const params = new URLSearchParams();
    if (options?.category) params.append('category', options.category);
    if (options?.includeInactive !== undefined) params.append('include_inactive', String(options.includeInactive));
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<Problem[]>(`/admin/problems${query}`, {
      requireAuth: true,
    });
  },

  getProblem: (id: string) =>
    apiRequest<Problem>(`/admin/problems/${id}`, {
      requireAuth: true,
    }),

  createProblem: (data: Partial<Problem>) =>
    apiRequest<Problem>('/admin/problems', {
      method: 'POST',
      body: data,
      requireAuth: true,
    }),

  updateProblem: (id: string, data: Partial<Problem>) =>
    apiRequest<Problem>(`/admin/problems/${id}`, {
      method: 'PUT',
      body: data,
      requireAuth: true,
    }),

  deleteProblem: (id: string) =>
    apiRequest(`/admin/problems/${id}`, {
      method: 'DELETE',
      requireAuth: true,
    }),

  // Examples
  listExamples: (options?: { category?: string; includeInactive?: boolean }) => {
    const params = new URLSearchParams();
    if (options?.category) params.append('category', options.category);
    if (options?.includeInactive !== undefined) params.append('include_inactive', String(options.includeInactive));
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<Example[]>(`/admin/examples${query}`, {
      requireAuth: true,
    });
  },

  getExample: (id: string) =>
    apiRequest<Example>(`/admin/examples/${id}`, {
      requireAuth: true,
    }),

  createExample: (data: Partial<Example>) =>
    apiRequest<Example>('/admin/examples', {
      method: 'POST',
      body: data,
      requireAuth: true,
    }),

  updateExample: (id: string, data: Partial<Example>) =>
    apiRequest<Example>(`/admin/examples/${id}`, {
      method: 'PUT',
      body: data,
      requireAuth: true,
    }),

  deleteExample: (id: string) =>
    apiRequest(`/admin/examples/${id}`, {
      method: 'DELETE',
      requireAuth: true,
    }),

  // Users
  listUsers: (options?: { limit?: number; offset?: number }) => {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<User[]>(`/admin/users${query}`, {
      requireAuth: true,
    });
  },

  toggleUserAdmin: (userId: string) =>
    apiRequest<{ message: string; is_admin: boolean }>(`/admin/users/${userId}/admin`, {
      method: 'PUT',
      requireAuth: true,
    }),

  deleteUser: (userId: string) =>
    apiRequest(`/admin/users/${userId}`, {
      method: 'DELETE',
      requireAuth: true,
    }),
};

// ============ Public Examples API ============

export interface ExampleCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  exampleCount: number;
}

export interface ExampleItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  code: string;
  explanation: string | null;
  author: string;
  tags: string[];
  icon: string;
  viewCount: number;
  copyCount: number;
  isFeatured: boolean;
}

export interface ExampleCategoryWithExamples extends ExampleCategory {
  examples: ExampleItem[];
}

export const examplesApi = {
  /**
   * Get all example categories
   */
  getCategories: () =>
    apiRequest<ExampleCategory[]>('/problems/examples/categories'),

  /**
   * Get all examples (optionally filtered)
   */
  getExamples: (options?: { category?: string; difficulty?: string; featured?: boolean }) => {
    const params = new URLSearchParams();
    if (options?.category) params.append('category', options.category);
    if (options?.difficulty) params.append('difficulty', options.difficulty);
    if (options?.featured !== undefined) params.append('featured', String(options.featured));
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<ExampleItem[]>(`/problems/examples/${query}`);
  },

  /**
   * Get all examples grouped by category
   */
  getExamplesGrouped: () =>
    apiRequest<ExampleCategoryWithExamples[]>('/problems/examples/grouped'),

  /**
   * Get a single example
   */
  getExample: (exampleId: string) =>
    apiRequest<ExampleItem>(`/problems/examples/${exampleId}`),

  /**
   * Track when an example is copied
   */
  trackCopy: (exampleId: string) =>
    apiRequest<{ success: boolean }>(`/problems/examples/${exampleId}/copy`, {
      method: 'POST',
    }),
};

// ============ Public Problems API ============

export interface ProblemCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  problemCount: number;
}

export interface ProblemSummary {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  solveCount: number;
  attemptCount: number;
  maxScore: number;
  tags: string[];
  isFeatured: boolean;
  timeBonus: boolean;
  constraints: {
    maxQubits: number;
    maxGateCount: number;
    maxCircuitDepth: number;
  };
  fidelityRequirement: {
    minFidelity: number;
    targetFidelity: number;
    metric: string;
  };
  createdAt: string | null;
}

export interface ProblemDetail extends ProblemSummary {
  testCases: unknown[];
  hints: string[];
  starterCode: string | null;
  author: string;
}

export interface ProblemCategoryWithProblems extends ProblemCategory {
  problems: ProblemSummary[];
}

export interface ProblemsStats {
  totalProblems: number;
  byDifficulty: Record<string, number>;
  byCategory: Array<{ category: string; name: string; count: number }>;
}

export const problemsApi = {
  /**
   * Get all problem categories
   */
  getCategories: () =>
    apiRequest<ProblemCategory[]>('/problems/categories'),

  /**
   * Get all problems (optionally filtered)
   */
  getProblems: (options?: { category?: string; difficulty?: string; featured?: boolean }) => {
    const params = new URLSearchParams();
    if (options?.category) params.append('category', options.category);
    if (options?.difficulty) params.append('difficulty', options.difficulty);
    if (options?.featured !== undefined) params.append('featured', String(options.featured));
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<ProblemSummary[]>(`/problems/${query}`);
  },

  /**
   * Get all problems grouped by category
   */
  getProblemsGrouped: () =>
    apiRequest<ProblemCategoryWithProblems[]>('/problems/grouped'),

  /**
   * Get a single problem with full details
   */
  getProblem: (problemId: string) =>
    apiRequest<ProblemDetail>(`/problems/${problemId}`),

  /**
   * Get problems statistics
   */
  getStats: () =>
    apiRequest<ProblemsStats>('/problems/stats'),
};

// ============ Simulator API ============

export interface SimulationResult {
  success: boolean;
  error?: string;
  measurements?: Record<string, number>;
  probabilities?: Record<string, number>;
  shots?: number;
  qubitCount?: number;
  gateCount?: number;
  circuitDepth?: number;
  executionTime?: number;
  statevector?: Array<[number, number]>;
  backend?: string;
}

export interface SimulatorBackend {
  name: string;
  description: string;
  max_qubits: number;
  supports_statevector: boolean;
}

export const simulatorApi = {
  /**
   * Run a quantum circuit simulation using Qiskit Aer
   */
  run: (code: string, options?: { shots?: number; includeStatevector?: boolean }) =>
    apiRequest<SimulationResult>('/simulator/run', {
      method: 'POST',
      body: {
        code,
        shots: options?.shots ?? 1024,
        include_statevector: options?.includeStatevector ?? false,
      },
    }),

  /**
   * Check if simulator is available
   */
  checkAvailable: () =>
    apiRequest<{ available: boolean; simulators: SimulatorBackend[] }>('/simulator/available'),

  /**
   * Get available simulator backends
   */
  getBackends: () =>
    apiRequest<SimulatorBackend[]>('/simulator/backends'),
};

// ============ Hardware API ============

export interface HardwareResult {
  success: boolean;
  error?: string;
  job_id?: string;
  submission_id?: string;  // Our database ID
  backend?: string;
  status?: string;
  shots?: number;
  qubitCount?: number;
  gateCount?: number;
  circuitDepth?: number;
  measurements?: Record<string, number>;
  probabilities?: Record<string, number>;
  executionTime?: number;
}

export interface HardwareSubmission {
  id: string;
  user_id: string | null;
  circuit_code: string;
  ibmq_job_id: string | null;
  backend_name: string;
  shots: number;
  qubit_count: number | null;
  gate_count: number | null;
  circuit_depth: number | null;
  status: string;
  measurements: Record<string, number> | null;
  probabilities: Record<string, number> | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  last_checked_at: string | null;
}

export interface HardwareSubmissionList {
  submissions: HardwareSubmission[];
  total: number;
  page: number;
  page_size: number;
}

export interface HardwareBackend {
  name: string;
  num_qubits: number | null;
  operational: boolean;
  simulator: boolean;
}

export interface HardwareLeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  completed_jobs: number;
  total_qubits: number;
  total_gates: number;
  avg_circuit_depth: number;
  score: number;
  last_submission: string | null;
}

export interface HardwareLeaderboard {
  leaderboard: HardwareLeaderboardEntry[];
  total_users: number;
  total_jobs: number;
  updated_at: string;
}

export const hardwareApi = {
  /**
   * Submit a quantum circuit to real IBM Quantum hardware
   */
  run: (code: string, options?: {
    backend?: string;
    shots?: number;
    waitForResult?: boolean;
    token?: string;
    channel?: string;
    instance?: string;
    user_id?: string;
  }) =>
    apiRequest<HardwareResult>('/hardware/run', {
      method: 'POST',
      body: {
        code,
        backend: options?.backend,
        shots: options?.shots ?? 1024,
        wait_for_result: options?.waitForResult ?? false,
        token: options?.token,
        channel: options?.channel,
        instance: options?.instance,
        user_id: options?.user_id,
      },
    }),

  /**
   * Check the status of a hardware job
   */
  getStatus: (jobId: string, credentials?: { token?: string; channel?: string; instance?: string }) =>
    apiRequest<HardwareResult>('/hardware/status', {
      method: 'POST',
      body: {
        job_id: jobId,
        token: credentials?.token,
        channel: credentials?.channel,
        instance: credentials?.instance,
      },
    }),

  /**
   * Check if quantum hardware is available
   */
  checkAvailable: () =>
    apiRequest<{ available: boolean; default_backend: string | null; backends: HardwareBackend[] }>('/hardware/available'),

  /**
   * Get available hardware backends
   */
  getBackends: () =>
    apiRequest<HardwareBackend[]>('/hardware/backends'),

  /**
   * Test user-provided IBM Quantum credentials
   */
  testCredentials: (token: string, channel?: string, instance?: string) =>
    apiRequest<{ success: boolean; error?: string; backends?: string[]; message?: string }>('/hardware/test-credentials', {
      method: 'POST',
      body: {
        token,
        channel: channel || 'ibm_quantum',
        instance: instance || null,
      },
    }),

  /**
   * Get hardware submission history
   */
  getHistory: (options?: { user_id?: string; status?: string; page?: number; page_size?: number }) => {
    const params = new URLSearchParams();
    if (options?.user_id) params.append('user_id', options.user_id);
    if (options?.status) params.append('status', options.status);
    if (options?.page) params.append('page', options.page.toString());
    if (options?.page_size) params.append('page_size', options.page_size.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<HardwareSubmissionList>(`/hardware/history${query}`);
  },

  /**
   * Get a specific hardware submission
   */
  getSubmission: (submissionId: string) =>
    apiRequest<HardwareSubmission>(`/hardware/submission/${submissionId}`),

  /**
   * Refresh the status of a pending hardware submission
   */
  refreshSubmission: (submissionId: string, credentials?: { token?: string; channel?: string; instance?: string }) => {
    const params = new URLSearchParams();
    if (credentials?.token) params.append('token', credentials.token);
    if (credentials?.channel) params.append('channel', credentials.channel);
    if (credentials?.instance) params.append('instance', credentials.instance);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<HardwareSubmission>(`/hardware/refresh/${submissionId}${query}`, {
      method: 'POST',
    });
  },

  /**
   * Get hardware leaderboard
   */
  getLeaderboard: (limit?: number) => {
    const params = limit ? `?limit=${limit}` : '';
    return apiRequest<HardwareLeaderboard>(`/hardware/leaderboard${params}`);
  },
};
