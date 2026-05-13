import { atom } from "nanostores";
import {
  calculateEarliestHefsekDate,
  canEnterMikvehPhase,
  createDefaultTrackerState,
  normalizeTrackerState,
  type CheckSlot,
  type CheckStatusInput,
  type PhaseId,
  type TrackerState,
} from "../lib/tracker";

const STORAGE_KEY = "family-purity-guide-state";

export const trackerStore = atom<TrackerState>(createDefaultTrackerState());

let hasLoaded = false;
let hasBoundPersistence = false;

function setTrackedState(nextState: TrackerState) {
  trackerStore.set({
    ...normalizeTrackerState(nextState),
    lastUpdatedAt: new Date().toISOString(),
  });
}

export function initializeTrackerStore() {
  if (typeof window === "undefined") {
    return;
  }

  if (!hasLoaded) {
    hasLoaded = true;

    try {
      const rawValue = window.localStorage.getItem(STORAGE_KEY);

      if (rawValue) {
        trackerStore.set(normalizeTrackerState(JSON.parse(rawValue)));
      }
    } catch {
      trackerStore.set(createDefaultTrackerState());
    }
  }

  if (!hasBoundPersistence) {
    hasBoundPersistence = true;
    trackerStore.listen((value) => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    });
  }
}

export function setActivePhase(phase: PhaseId) {
  const state = normalizeTrackerState(trackerStore.get());
  const allowedPhases = new Set(["period", "hefsek", "clean-days", "mikveh"]);

  if (!allowedPhases.has(phase)) {
    return;
  }

  setTrackedState({
    ...state,
    activePhase: phase,
  });
}

export function setPeriodStartDate(periodStartDate: string) {
  if (!periodStartDate) {
    trackerStore.set(createDefaultTrackerState());

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }

    return;
  }

  setTrackedState({
    ...createDefaultTrackerState(),
    periodStartDate,
    hefsekDate: calculateEarliestHefsekDate(periodStartDate),
    activePhase: "period",
  });
}

export function beginHefsekPhase() {
  const state = normalizeTrackerState(trackerStore.get());

  if (!state.periodStartDate) {
    return;
  }

  setTrackedState({
    ...state,
    activePhase: "hefsek",
    warningMessage: null,
  });
}

export function setHefsekDate(hefsekDate: string) {
  const state = normalizeTrackerState(trackerStore.get());

  if (!state.periodStartDate) {
    return;
  }

  const minimumDate = calculateEarliestHefsekDate(state.periodStartDate);
  const nextDate = hefsekDate && hefsekDate >= minimumDate ? hefsekDate : minimumDate;

  setTrackedState({
    ...state,
    hefsekDate: nextDate,
    hefsekConfirmed: false,
    activePhase: "hefsek",
  });
}

export function setHefsekConfirmed(confirmed: boolean) {
  const state = normalizeTrackerState(trackerStore.get());

  if (!state.hefsekDate) {
    return;
  }

  setTrackedState({
    ...state,
    hefsekConfirmed: confirmed,
    activePhase: "hefsek",
    warningMessage: null,
  });
}

export function setCleanDayStatus(
  dayNumber: number,
  slot: CheckSlot,
  status: CheckStatusInput,
) {
  const state = normalizeTrackerState(trackerStore.get());
  const targetDay = state.cleanDays.find((day) => day.dayNumber === dayNumber);

  if (!targetDay) {
    return;
  }

  if (status === "blood") {
    const nextPeriodStartDate = targetDay.date;

    setTrackedState({
      ...createDefaultTrackerState(),
      periodStartDate: nextPeriodStartDate,
      hefsekDate: calculateEarliestHefsekDate(nextPeriodStartDate),
      activePhase: "period",
      warningMessage:
        "סומן מראה דמי במהלך שבעה נקיים. המעקב אופס למחזור חדש לצורך זהירות, ובכל ספק מומלץ לפנות לרב המלווה.",
    });

    return;
  }

  const cleanDays = state.cleanDays.map((day) =>
    day.dayNumber === dayNumber ? { ...day, [slot]: status } : day,
  );

  setTrackedState({
    ...state,
    cleanDays,
  });
}

export function moveToMikvehPhase() {
  const state = normalizeTrackerState(trackerStore.get());

  if (!canEnterMikvehPhase(state)) {
    return;
  }

  setTrackedState({
    ...state,
    activePhase: "mikveh",
  });
}

export function toggleMikvehChecklistItem(itemId: string) {
  const state = normalizeTrackerState(trackerStore.get());

  setTrackedState({
    ...state,
    mikvehChecklist: state.mikvehChecklist.map((item) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item,
    ),
  });
}

export function dismissWarning() {
  const state = normalizeTrackerState(trackerStore.get());

  setTrackedState({
    ...state,
    warningMessage: null,
  });
}

export function restartTracker() {
  trackerStore.set(createDefaultTrackerState());

  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}
