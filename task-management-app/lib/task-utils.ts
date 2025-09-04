import { TaskWithDetails } from './types'

/**
 * Utility functions for working with tasks and sections
 */

export const SECTION_PREFIX = '📁 '

/**
 * Check if a task is actually a section (container for other tasks)
 */
export function isSection(task: TaskWithDetails): boolean {
  return task.title.startsWith(SECTION_PREFIX)
}

/**
 * Get the display name for a section (without the emoji prefix)
 */
export function getSectionDisplayName(task: TaskWithDetails): string {
  if (isSection(task)) {
    return task.title.replace(SECTION_PREFIX, '')
  }
  return task.title
}

/**
 * Get sections only (filter out regular tasks)
 */
export function getSections(tasks: TaskWithDetails[]): TaskWithDetails[] {
  return tasks.filter(isSection)
}

/**
 * Get regular tasks only (filter out sections)
 */
export function getRegularTasks(tasks: TaskWithDetails[]): TaskWithDetails[] {
  return tasks.filter(task => !isSection(task))
}

/**
 * Get tasks that belong to a specific section
 */
export function getTasksInSection(tasks: TaskWithDetails[], sectionId: string): TaskWithDetails[] {
  return tasks.filter(task => 
    !isSection(task) && task.parent_task_id === sectionId
  )
}

/**
 * Get top-level sections (sections without parent sections)
 */
export function getTopLevelSections(tasks: TaskWithDetails[]): TaskWithDetails[] {
  return tasks.filter(task => 
    isSection(task) && !task.parent_task_id
  )
}

/**
 * Get subsections of a specific section
 */
export function getSubsections(tasks: TaskWithDetails[], parentSectionId: string): TaskWithDetails[] {
  return tasks.filter(task => 
    isSection(task) && task.parent_task_id === parentSectionId
  )
}

/**
 * Get tasks that are not in any section (orphaned tasks)
 */
export function getOrphanedTasks(tasks: TaskWithDetails[]): TaskWithDetails[] {
  return tasks.filter(task => 
    !isSection(task) && !task.parent_task_id
  )
}