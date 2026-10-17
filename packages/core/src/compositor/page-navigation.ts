/** F08 page navigation: jump/history for a linear page list. */

export interface PageNavigationState {
  pageCount: number;
  currentIndex: number;
  history: readonly number[];
}

export function createPageNavigation(pageCount: number): PageNavigationState {
  const count = Math.max(1, pageCount);
  return { pageCount: count, currentIndex: 0, history: [0] };
}

export function jumpToPage(state: PageNavigationState, pageIndex: number): PageNavigationState {
  const next = Math.min(state.pageCount - 1, Math.max(0, pageIndex));
  if (next === state.currentIndex) return state;
  return {
    ...state,
    currentIndex: next,
    history: [...state.history, next],
  };
}

export function navigateHistory(state: PageNavigationState, delta: -1 | 1): PageNavigationState {
  const pos = state.history.lastIndexOf(state.currentIndex);
  const targetPos = pos + delta;
  if (targetPos < 0 || targetPos >= state.history.length) return state;
  return { ...state, currentIndex: state.history[targetPos]! };
}
