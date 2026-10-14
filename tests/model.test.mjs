import test from "node:test";
import assert from "node:assert/strict";
import {
  addPeople,
  archivePerson,
  createBackupPayload,
  createEmptyState,
  fillMissingFromDefaults,
  getActivePeople,
  getDailyCounts,
  getEntry,
  getOverviewPeople,
  initializeDay,
  normalizeState,
  resetDay,
  restoreDaySnapshot,
  restorePerson,
  restoreBackupPayload,
  restoreBulkSnapshot,
  setAllActivePeopleStatus,
  setPersonStatus,
  statusDistribution
} from "../src/model.js";

test("new roster entries start present for a zero-tap first day", () => {
  const state = createEmptyState(1);
  initializeDay(state, "2026-08-18", { seedDefaults: true, timestamp: 2 });
  const people = addPeople(state, "Анна\nИван", "2026-08-18", 3);

  assert.equal(people.length, 2);
  assert.deepEqual(getDailyCounts(state, "2026-08-18"), {
    present: 2,
    sick: 0,
    drunk: 0,
    absent: 0,
    half: 0,
    missing: 0,
    total: 2
  });
  assert.ok(people.every((person) => person.defaultStatus === "present"));
});

test("half shifts survive saving, backups and next-day defaults", () => {
  const state = createEmptyState(1);
  const [person] = addPeople(state, "Тест", "2026-09-22", 2);
  setPersonStatus(state, "2026-09-22", person.id, "half", 3);
  const saved = normalizeState(JSON.parse(JSON.stringify(state)), 4);
  const restored = restoreBackupPayload(createBackupPayload(saved, 5), 6);
  initializeDay(restored, "2026-09-23", { seedDefaults: true, timestamp: 7 });
  assert.equal(getEntry(restored, "2026-09-22", person.id).status, "half");
  assert.equal(getEntry(restored, "2026-09-23", person.id).status, "half");
  assert.equal(restored.people[0].defaultStatus, "half");
  assert.equal(getDailyCounts(restored, "2026-09-23").half, 1);
  assert.equal(getDailyCounts(restored, "2026-09-23").missing, 0);
  assert.equal(statusDistribution(restored, "2026-09-23", restored.people).half, 1);
});

test("manual choices become defaults without changing initialized history", () => {
  const state = createEmptyState(1);
  const [person] = addPeople(state, "Анна", "2026-08-17", 2);
  setPersonStatus(state, "2026-08-17", person.id, "sick", 3);
  initializeDay(state, "2026-08-18", { seedDefaults: true, timestamp: 4 });

  assert.equal(getEntry(state, "2026-08-18", person.id).status, "sick");
  setPersonStatus(state, "2026-08-18", person.id, "drunk", 5);
  assert.equal(getEntry(state, "2026-08-17", person.id).status, "sick");
  assert.equal(person.defaultStatus, "drunk");
});

test("Нету is a persistent red attendance status and next-day default", () => {
  const state = createEmptyState(1);
  const [person] = addPeople(state, "Анна", "2026-08-17", 2);
  setPersonStatus(state, "2026-08-17", person.id, "absent", 3);
  initializeDay(state, "2026-08-18", { seedDefaults: true, timestamp: 4 });

  assert.equal(person.defaultStatus, "absent");
  assert.equal(getEntry(state, "2026-08-18", person.id).status, "absent");
  assert.equal(getDailyCounts(state, "2026-08-18").absent, 1);
});

test("unopened past days stay blank until explicitly filled", () => {
  const state = createEmptyState(1);
  const [person] = addPeople(state, "Анна", "2026-08-18", 2);
  assert.equal(getEntry(state, "2026-08-16", person.id), null);
  const filled = fillMissingFromDefaults(state, "2026-08-16", 3);
  assert.equal(filled, 1);
  assert.equal(getEntry(state, "2026-08-16", person.id).status, "present");
  assert.equal(person.defaultStatus, "present");
});

test("bulk action undo restores entries and sticky defaults", () => {
  const state = createEmptyState(1);
  const [anna, ivan] = addPeople(state, "Анна\nИван", "2026-08-18", 2);
  setPersonStatus(state, "2026-08-18", anna.id, "sick", 3);
  const snapshot = setAllActivePeopleStatus(state, "2026-08-18", "present", 4);
  assert.equal(anna.defaultStatus, "present");
  assert.equal(ivan.defaultStatus, "present");

  restoreBulkSnapshot(state, "2026-08-18", snapshot, 5);
  assert.equal(getEntry(state, "2026-08-18", anna.id).status, "sick");
  assert.equal(anna.defaultStatus, "sick");
  assert.equal(getEntry(state, "2026-08-18", ivan.id).status, "present");
});

test("removed people are excluded from overview rows and totals until restored", () => {
  const state = createEmptyState(1);
  const [person, remaining] = addPeople(state, "Анна\nИван", "2026-08-18", 2);
  setPersonStatus(state, "2026-08-18", person.id, "sick", 3);
  archivePerson(state, person.id, 3);
  assert.deepEqual(getOverviewPeople(state, ["2026-08-18"]), [remaining]);
  assert.deepEqual(getOverviewPeople(state, ["2026-08-17"]), [remaining]);
  const counts = statusDistribution(state, "2026-08-18", getOverviewPeople(state, ["2026-08-18"]));
  assert.equal(counts.present, 1);
  assert.equal(counts.sick, 0);
  restorePerson(state, person.id, 4);
  assert.deepEqual(getOverviewPeople(state, ["2026-08-18"]), [person, remaining]);
  archivePerson(state, person.id, 5);
  archivePerson(state, remaining.id, 5);
  assert.deepEqual(getOverviewPeople(state, ["2026-08-18"]), []);
});

test("versioned backups restore roster and attendance", () => {
  const state = createEmptyState(1);
  const [person] = addPeople(state, "Анна", "2026-08-18", 2);
  setPersonStatus(state, "2026-08-18", person.id, "absent", 3);
  const restored = restoreBackupPayload(createBackupPayload(state, 4), 5);

  assert.equal(restored.people[0].name, "Анна");
  assert.equal(restored.people[0].defaultStatus, "absent");
  assert.equal(getEntry(restored, "2026-08-18", restored.people[0].id).status, "absent");
});

test("clearing a day removes every mark and stays empty after save and reopen", () => {
  const state = createEmptyState(1);
  const [person, removed] = addPeople(state, "Анна\nИван", "2026-08-17", 2);
  setPersonStatus(state, "2026-08-17", person.id, "sick", 3);
  archivePerson(state, removed.id, 4);
  initializeDay(state, "2026-08-18", { seedDefaults: true, timestamp: 5 });
  const before = structuredClone(state);

  const snapshot = resetDay(state, "2026-08-17", { empty: true, timestamp: 6 });
  assert.deepEqual(state.attendance["2026-08-17"], {});
  assert.deepEqual(state.attendance["2026-08-18"], before.attendance["2026-08-18"]);
  assert.deepEqual(state.people, before.people);
  const reopened = normalizeState(JSON.parse(JSON.stringify(state)), 7);
  initializeDay(reopened, "2026-08-17", { seedDefaults: true, timestamp: 8 });
  assert.deepEqual(reopened.attendance["2026-08-17"], {});

  restoreDaySnapshot(state, snapshot, 9);
  assert.deepEqual(state.attendance, before.attendance);
  assert.deepEqual(state.initializedDays, before.initializedDays);
  assert.deepEqual(state.people, before.people);
});

test("reset uses current active-person defaults and undo restores only the selected day", () => {
  const state = createEmptyState(1);
  const [person, removed] = addPeople(state, "Анна\nИван", "2026-08-17", 2);
  archivePerson(state, removed.id, 3);
  setPersonStatus(state, "2026-08-18", person.id, "absent", 4);
  const oldDay = structuredClone(state.attendance["2026-08-17"]);
  const people = structuredClone(state.people);

  const snapshot = resetDay(state, "2026-08-17", { timestamp: 5 });
  assert.deepEqual(Object.keys(state.attendance["2026-08-17"]), [person.id]);
  assert.equal(getEntry(state, "2026-08-17", person.id).status, "absent");
  assert.equal(getEntry(state, "2026-08-17", person.id).source, "default");
  assert.deepEqual(state.people, people);
  setPersonStatus(state, "2026-08-18", person.id, "sick", 6);
  restoreDaySnapshot(state, snapshot, 7);
  assert.deepEqual(state.attendance["2026-08-17"], oldDay);
  assert.equal(getEntry(state, "2026-08-18", person.id).status, "sick");
  assert.equal(person.defaultStatus, "sick");
});

test("undo restores an uninitialized day and invalid dates cannot mutate state", () => {
  const state = createEmptyState(1);
  addPeople(state, "Анна", "2026-08-18", 2);
  const before = structuredClone(state);
  const snapshot = resetDay(state, "2026-08-17", { timestamp: 3 });
  restoreDaySnapshot(state, snapshot, 4);
  assert.deepEqual(state.attendance, before.attendance);
  assert.deepEqual(state.initializedDays, before.initializedDays);
  const unchanged = structuredClone(state);
  assert.throws(() => resetDay(state, "2026-02-31"), TypeError);
  assert.deepEqual(state, unchanged);
});
