/**
 * Journey ordering — the dependency logic that used to live inside the visual
 * flowchart, now headless. The user-facing experience is a guided, one-task-at-
 * a-time form; this module turns the task dependency graph into a linear,
 * dependency-respecting order and derives each task's lock/unlock state.
 *
 * Framework-agnostic (no React, no astro:content) so it can be unit-tested and
 * reused anywhere.
 */

export interface DependencyNode {
  id: string;
  dependsOn: string[];
}

export type TaskStatus = 'done' | 'available' | 'locked';

/**
 * Stable topological order: a task always appears after the tasks it depends
 * on. Ties keep the input order. Dependencies referencing ids that are not in
 * the list are ignored (e.g. a task that depends on something filtered out).
 * Any dependency cycle is broken by falling back to input order for the
 * remaining nodes, so the function never loops or drops tasks.
 */
export function topoOrder<T extends DependencyNode>(tasks: T[]): T[] {
  const present = new Set(tasks.map((t) => t.id));
  const indegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const t of tasks) {
    const deps = t.dependsOn.filter((d) => present.has(d));
    indegree.set(t.id, deps.length);
    for (const d of deps) {
      const list = dependents.get(d) ?? [];
      list.push(t.id);
      dependents.set(d, list);
    }
  }

  // Preserve input order among ready nodes by scanning the original array.
  const ordered: T[] = [];
  const emitted = new Set<string>();

  const drainReady = () => {
    let progressed = true;
    while (progressed) {
      progressed = false;
      for (const t of tasks) {
        if (emitted.has(t.id)) continue;
        if ((indegree.get(t.id) ?? 0) > 0) continue;
        emitted.add(t.id);
        ordered.push(t);
        progressed = true;
        for (const dep of dependents.get(t.id) ?? []) {
          indegree.set(dep, (indegree.get(dep) ?? 0) - 1);
        }
      }
    }
  };

  drainReady();

  // Cycle fallback: emit any remaining nodes in input order.
  if (ordered.length < tasks.length) {
    for (const t of tasks) {
      if (!emitted.has(t.id)) {
        emitted.add(t.id);
        ordered.push(t);
      }
    }
  }

  return ordered;
}

/** A task is `done` if completed, `available` if all its present deps are done, else `locked`. */
export function statusOf(
  task: DependencyNode,
  presentIds: Set<string>,
  doneIds: Set<string>
): TaskStatus {
  if (doneIds.has(task.id)) return 'done';
  const blocked = task.dependsOn.some((d) => presentIds.has(d) && !doneIds.has(d));
  return blocked ? 'locked' : 'available';
}

/**
 * The "current" task: the first not-done, unlocked task in topological order.
 * Returns null when everything is done (or nothing is actionable).
 */
export function currentTaskId<T extends DependencyNode>(
  orderedTasks: T[],
  doneIds: Set<string>
): string | null {
  const present = new Set(orderedTasks.map((t) => t.id));
  for (const t of orderedTasks) {
    if (statusOf(t, present, doneIds) === 'available') return t.id;
  }
  return null;
}
