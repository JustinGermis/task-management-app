export const TASK_STATUSES = [
  { id: 'todo', label: 'To Do', color: 'bg-gray-500' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
  { id: 'review', label: 'Review', color: 'bg-purple-500' },
  { id: 'done', label: 'Done', color: 'bg-green-500' },
  { id: 'blocked', label: 'Blocked', color: 'bg-red-500' },
] as const

export const TASK_PRIORITIES = [
  { id: 'low', label: 'Low', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-l-green-500' },
  { id: 'medium', label: 'Medium', color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-l-yellow-500' },
  { id: 'high', label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-l-orange-500' },
  { id: 'critical', label: 'Critical', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-l-red-500' },
] as const

export const DEFAULT_LABELS = [
  { name: 'Bug', color: '#ef4444' },
  { name: 'Feature', color: '#10b981' },
  { name: 'Enhancement', color: '#3b82f6' },
  { name: 'Documentation', color: '#8b5cf6' },
  { name: 'Design', color: '#ec4899' },
  { name: 'Testing', color: '#f59e0b' },
  { name: 'Refactor', color: '#6b7280' },
  { name: 'Research', color: '#06b6d4' },
] as const

export const TASK_COLORS = [
  { name: 'Gray', value: '#6b7280' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Lime', value: '#84cc16' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Sky', value: '#0ea5e9' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Fuchsia', value: '#d946ef' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Rose', value: '#f43f5e' },
] as const

export type TaskStatusId = typeof TASK_STATUSES[number]['id']
export type TaskPriorityId = typeof TASK_PRIORITIES[number]['id']