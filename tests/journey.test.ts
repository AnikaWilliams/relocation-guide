import { describe, it, expect } from 'vitest';
import { topoOrder, statusOf, currentTaskId, type DependencyNode } from '../src/utils/journey';

/** Minimal task graph: permit → visa → register → card; insurance is independent. */
const tasks: DependencyNode[] = [
  { id: 'register', dependsOn: ['visa'] },
  { id: 'visa', dependsOn: ['permit'] },
  { id: 'permit', dependsOn: [] },
  { id: 'card', dependsOn: ['register'] },
  { id: 'insurance', dependsOn: [] },
];

const ids = (nodes: DependencyNode[]) => nodes.map((n) => n.id);

describe('topoOrder', () => {
  it('orders every task after its dependencies', () => {
    const order = ids(topoOrder(tasks));
    expect(order.indexOf('permit')).toBeLessThan(order.indexOf('visa'));
    expect(order.indexOf('visa')).toBeLessThan(order.indexOf('register'));
    expect(order.indexOf('register')).toBeLessThan(order.indexOf('card'));
  });

  it('keeps input order among independent (ready) tasks', () => {
    // `register` is listed first but depends on others; `permit` and
    // `insurance` are the roots and should lead, in their input order.
    const order = ids(topoOrder(tasks));
    expect(order.indexOf('permit')).toBeLessThan(order.indexOf('insurance'));
  });

  it('returns every task even when a dependency cycle exists', () => {
    const cyclic: DependencyNode[] = [
      { id: 'a', dependsOn: ['b'] },
      { id: 'b', dependsOn: ['a'] },
      { id: 'c', dependsOn: [] },
    ];
    expect(ids(topoOrder(cyclic)).sort()).toEqual(['a', 'b', 'c']);
  });

  it('ignores dependencies that are not present in the list', () => {
    const partial: DependencyNode[] = [{ id: 'x', dependsOn: ['missing'] }];
    expect(ids(topoOrder(partial))).toEqual(['x']);
  });
});

describe('statusOf', () => {
  const present = new Set(tasks.map((t) => t.id));

  it('is "available" for a task whose dependencies are all done', () => {
    expect(statusOf({ id: 'visa', dependsOn: ['permit'] }, present, new Set(['permit']))).toBe('available');
  });

  it('is "locked" while any dependency is incomplete', () => {
    expect(statusOf({ id: 'visa', dependsOn: ['permit'] }, present, new Set())).toBe('locked');
  });

  it('is "done" when the task itself is complete', () => {
    expect(statusOf({ id: 'permit', dependsOn: [] }, present, new Set(['permit']))).toBe('done');
  });

  it('treats a root task (no deps) as available', () => {
    expect(statusOf({ id: 'permit', dependsOn: [] }, present, new Set())).toBe('available');
  });
});

describe('currentTaskId', () => {
  // A linear chain so "the current task" is unambiguous (no independent roots).
  const chain: DependencyNode[] = [
    { id: 'a', dependsOn: [] },
    { id: 'b', dependsOn: ['a'] },
    { id: 'c', dependsOn: ['b'] },
  ];
  const ordered = topoOrder(chain);

  it('returns the first actionable task when nothing is done', () => {
    expect(currentTaskId(ordered, new Set())).toBe('a');
  });

  it('advances to the next unlocked task as work completes', () => {
    expect(currentTaskId(ordered, new Set(['a']))).toBe('b');
    expect(currentTaskId(ordered, new Set(['a', 'b']))).toBe('c');
  });

  it('returns null once every task is done', () => {
    expect(currentTaskId(ordered, new Set(['a', 'b', 'c']))).toBeNull();
  });

  it('picks the first available independent task in order', () => {
    // With two independent roots, the earlier one in topo order wins.
    const order = topoOrder(tasks);
    expect(currentTaskId(order, new Set(['permit']))).toBe('insurance');
  });
});
