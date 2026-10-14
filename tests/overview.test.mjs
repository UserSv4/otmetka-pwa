import test from "node:test";
import assert from "node:assert/strict";
import { addPeople, archivePerson, createEmptyState, setPersonStatus } from "../src/model.js";
import { getDateWindow } from "../src/dates.js";
import {
  MAX_OVERVIEW_CANVAS_HEIGHT,
  OVERVIEW_PAGE_SIZE,
  getOverviewCanvasHeight,
  generateOverviewFiles,
  getOverviewDates,
  paginatePeople
} from "../src/overview.js";

test("large rosters are split before reaching unsafe iOS canvas sizes", () => {
  const people = Array.from({ length: 191 }, (_, index) => ({ id: String(index) }));
  const pages = paginatePeople(people);
  assert.deepEqual(pages.map((page) => page.length), [50, 50, 50, 41]);
  assert.equal(pages.flat().length, people.length);
  assert.equal(OVERVIEW_PAGE_SIZE, 50);
  assert.ok(getOverviewCanvasHeight(OVERVIEW_PAGE_SIZE) <= MAX_OVERVIEW_CANVAS_HEIGHT);
  assert.ok(getOverviewCanvasHeight(OVERVIEW_PAGE_SIZE + 6) > MAX_OVERVIEW_CANVAS_HEIGHT);
});

test("shared dates trim empty ends and preserve empty days between marks", () => {
  const dates = getDateWindow("2026-09-21", 7);
  const state = createEmptyState(1);
  const [person] = addPeople(state, "Анна", dates[1], 2);
  setPersonStatus(state, dates[4], person.id, "sick", 3);
  state.attendance[dates[0]] = {};
  state.attendance[dates[2]] = {};
  state.attendance[dates[6]] = {};
  const before = structuredClone(state);

  assert.deepEqual(getOverviewDates(state, dates), dates.slice(1, 5));
  assert.deepEqual(state, before);
  assert.equal(dates.length, 7);
});

test("any active person's mark retains a day, including absence, but removed people do not", () => {
  const dates = getDateWindow("2026-09-21", 7);
  const state = createEmptyState(1);
  const [removed] = addPeople(state, "Удалённый", dates[0], 2);
  setPersonStatus(state, dates[6], removed.id, "present", 3);
  archivePerson(state, removed.id, 4);
  const [first, last] = addPeople(state, "Анна\nИван", dates[2], 5);
  setPersonStatus(state, dates[2], first.id, "sick", 6);
  setPersonStatus(state, dates[4], last.id, "absent", 7);

  assert.deepEqual(getOverviewDates(state, dates), dates.slice(2, 5));
});

test("a single filled day stays as one column; filled boundaries retain all middle days", () => {
  const dates = getDateWindow("2026-09-21", 7);
  const state = createEmptyState(1);
  const [person] = addPeople(state, "Анна", dates[3], 2);
  assert.deepEqual(getOverviewDates(state, dates), [dates[3]]);
  setPersonStatus(state, dates[0], person.id, "absent", 3);
  setPersonStatus(state, dates[6], person.id, "drunk", 4);
  assert.deepEqual(getOverviewDates(state, dates), dates);
});

test("a fully empty visible range produces no image, including removed-person-only history", async () => {
  const dates = getDateWindow("2026-09-21", 7);
  const state = createEmptyState(1);
  const [removed] = addPeople(state, "Удалённый", dates[3], 2);
  archivePerson(state, removed.id, 3);
  addPeople(state, "Анна", "2026-09-01", 4);
  state.attendance[dates[2]] = {};
  assert.deepEqual(getOverviewDates(state, dates), []);
  assert.deepEqual(await generateOverviewFiles(state, dates), []);
  assert.deepEqual(await generateOverviewFiles(state, []), []);
});
