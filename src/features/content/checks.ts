import { useLiveQuery } from "dexie-react-hooks";
import { usePlanContext } from "../../app/PlanContext";
import { nowIso } from "../../lib/actions";
import type { ConceptCard } from "../../lib/concepts";

/** Ticks on resources.json topics (table topicChecks). */
export function useTopicChecks() {
  const { db, plan } = usePlanContext();
  const rows = useLiveQuery(() => db.topicChecks.toArray(), [db]);
  const done = new Set((rows ?? []).map((r) => r.topicId));
  const toggle = (id: string) => (done.has(id) ? db.topicChecks.delete(id) : db.topicChecks.put({ topicId: id, checkedOn: plan.today, at: nowIso() }));
  return { done, toggle };
}

/**
 * Ticks on concept cards. A numbered curriculum concept ("w03-c2") lives in conceptChecks; "Core reading" cards are
 * resources.json topics and keep their tick in topicChecks, like every other topic. Either way a tick is stored once per id.
 */
export function useConceptTicks() {
  const { db, plan } = usePlanContext();
  const concepts = useLiveQuery(() => db.conceptChecks.toArray(), [db]);
  const topics = useLiveQuery(() => db.topicChecks.toArray(), [db]);
  const doneNumbered = new Set((concepts ?? []).map((r) => r.conceptId));
  const doneCore = new Set((topics ?? []).map((r) => r.topicId));
  const isDone = (c: ConceptCard) => (c.core ? doneCore : doneNumbered).has(c.id);

  async function setMany(cards: readonly ConceptCard[], on: boolean) {
    const numbered = cards.filter((c) => !c.core).map((c) => c.id);
    const core = cards.filter((c) => c.core).map((c) => c.id);
    if (on) {
      await db.conceptChecks.bulkPut(numbered.map((conceptId) => ({ conceptId, checkedOn: plan.today, at: nowIso() })));
      await db.topicChecks.bulkPut(core.map((topicId) => ({ topicId, checkedOn: plan.today, at: nowIso() })));
    } else {
      await db.conceptChecks.bulkDelete(numbered);
      await db.topicChecks.bulkDelete(core);
    }
  }
  return { isDone, toggle: (c: ConceptCard) => setMany([c], !isDone(c)), setMany, ready: concepts !== undefined && topics !== undefined };
}
