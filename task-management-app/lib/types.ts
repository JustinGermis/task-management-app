import { Database } from '@/types/database'

// Database type aliases
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Organization = Database['public']['Tables']['organizations']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type Comment = Database['public']['Tables']['comments']['Row']
export type Label = Database['public']['Tables']['labels']['Row']
export type OrganizationMember = Database['public']['Tables']['organization_members']['Row']
export type ProjectMember = Database['public']['Tables']['project_members']['Row']
export type TaskAssignee = Database['public']['Tables']['task_assignees']['Row']

// Enum type aliases
export type UserRole = Database['public']['Enums']['user_role']
export type TaskStatus = Database['public']['Enums']['task_status']
export type TaskPriority = Database['public']['Enums']['task_priority']
export type ProjectStatus = Database['public']['Enums']['project_status']

// Extended types with relationships
export interface TaskWithDetails extends Task {
  assignees?: (TaskAssignee & {
    profiles?: Profile
  })[]
  comments?: Comment[]
  labels?: (Database['public']['Tables']['task_labels']['Row'] & {
    labels?: Label
  })[]
  project?: Project
  created_by_profile?: Profile
}

export interface ProjectWithDetails extends Project {
  organization?: Organization
  members?: (ProjectMember & {
    profiles?: Profile
  })[]
  tasks?: TaskWithDetails[]
}

export interface OrganizationWithDetails extends Organization {
  members?: (OrganizationMember & {
    profiles?: Profile
  })[]
  projects?: ProjectWithDetails[]
}

// Form types
export interface CreateOrganizationData {
  name: string
  description?: string
}

export interface CreateProjectData {
  name: string
  description?: string
  color?: string
  start_date?: string
  end_date?: string
  organization_id: string
}

export interface CreateTaskData {
  title: string
  description?: string
  priority?: TaskPriority
  due_date?: string
  project_id: string
  assignee_ids?: string[]
}

export interface UpdateProfileData {
  full_name?: string
  bio?: string
  department?: string
  phone?: string
  timezone?: string
}

// UI state types
export interface DragItem {
  id: string
  type: 'task'
  data: TaskWithDetails
}

export interface Column {
  id: TaskStatus
  title: string
  tasks: TaskWithDetails[]
}

// Auth context type
export interface AuthUser extends Profile {
  id: string
  email: string
}

// Filter and sort types
export interface TaskFilters {
  status?: TaskStatus[]
  priority?: TaskPriority[]
  assignee_ids?: string[]
  project_ids?: string[]
  label_ids?: string[]
  due_date_from?: string
  due_date_to?: string
  search?: string
}

export interface ProjectFilters {
  status?: ProjectStatus[]
  member_ids?: string[]
  search?: string
}

export type SortDirection = 'asc' | 'desc'
export type TaskSortBy = 'created_at' | 'updated_at' | 'due_date' | 'priority' | 'title'
export type ProjectSortBy = 'created_at' | 'updated_at' | 'name' | 'status'

export interface TaskSort {
  field: TaskSortBy
  direction: SortDirection
}

export interface ProjectSort {
  field: ProjectSortBy
  direction: SortDirection
}