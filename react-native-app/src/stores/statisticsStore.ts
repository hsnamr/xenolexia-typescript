/**
 * Statistics Store - Manages reading and learning statistics
 * Persists stats, sessions, and review stats to AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';
import type {ReadingStats, ReadingSession} from '@types/index';

const STATISTICS_KEY = '@xenolexia/statistics';
const MAX_PERSISTED_SESSIONS = 200;

/** Session as stored (dates as ISO strings) */
interface SerializedSession {
  id: string;
  bookId: string;
  startedAt: string;
  endedAt: string | null;
  pagesRead: number;
  wordsRevealed: number;
  wordsSaved: number;
  duration: number;
}

const defaultStats: ReadingStats = {
  totalBooksRead: 0,
  totalReadingTime: 0,
  totalWordsLearned: 0,
  currentStreak: 0,
  longestStreak: 0,
  averageSessionDuration: 0,
  wordsRevealedToday: 0,
  wordsSavedToday: 0,
};

interface ReviewSessionData {
  cardsReviewed: number;
  correctCount: number;
  timeSpentSeconds: number;
}

interface StatisticsState {
  stats: ReadingStats;
  currentSession: ReadingSession | null;
  sessions: ReadingSession[];
  isLoading: boolean;

  // Review stats
  reviewStats: {
    totalReviews: number;
    totalCorrect: number;
    totalTimeSpent: number;
    reviewsToday: number;
  };

  // Actions
  startSession: (bookId: string) => void;
  endSession: () => void;
  recordWordRevealed: () => void;
  recordWordSaved: () => void;
  recordReviewSession: (data: ReviewSessionData) => void;
  updateStats: (updates: Partial<ReadingStats>) => void;
  loadStats: () => Promise<void>;
  saveStats: () => Promise<void>;
  refreshStats: () => Promise<void>;
  resetDailyStats: () => void;
}

export const useStatisticsStore = create<StatisticsState>((set, get) => ({
  stats: defaultStats,
  currentSession: null,
  sessions: [],
  isLoading: false,
  reviewStats: {
    totalReviews: 0,
    totalCorrect: 0,
    totalTimeSpent: 0,
    reviewsToday: 0,
  },

  startSession: (bookId: string) => {
    const session: ReadingSession = {
      id: Date.now().toString(),
      bookId,
      startedAt: new Date(),
      endedAt: null,
      pagesRead: 0,
      wordsRevealed: 0,
      wordsSaved: 0,
      duration: 0,
    };
    set({currentSession: session});
  },

  endSession: () => {
    const {currentSession, stats, sessions} = get();
    if (!currentSession) return;

    const endedAt = new Date();
    const duration = Math.floor(
      (endedAt.getTime() - currentSession.startedAt.getTime()) / 1000,
    );

    const completedSession: ReadingSession = {
      ...currentSession,
      endedAt,
      duration,
    };

    // Update stats
    const newTotalTime = stats.totalReadingTime + duration;
    const newSessionCount = sessions.length + 1;
    const newAverageSession = Math.floor(newTotalTime / newSessionCount);

    set({
      currentSession: null,
      sessions: [...sessions, completedSession],
      stats: {
        ...stats,
        totalReadingTime: newTotalTime,
        averageSessionDuration: newAverageSession,
      },
    });

    // TODO: Persist to database
  },

  recordWordRevealed: () => {
    set(state => ({
      stats: {
        ...state.stats,
        wordsRevealedToday: state.stats.wordsRevealedToday + 1,
      },
      currentSession: state.currentSession
        ? {...state.currentSession, wordsRevealed: state.currentSession.wordsRevealed + 1}
        : null,
    }));
    get().saveStats();
  },

  recordWordSaved: () => {
    set(state => ({
      stats: {
        ...state.stats,
        wordsSavedToday: state.stats.wordsSavedToday + 1,
        totalWordsLearned: state.stats.totalWordsLearned + 1,
      },
      currentSession: state.currentSession
        ? {...state.currentSession, wordsSaved: state.currentSession.wordsSaved + 1}
        : null,
    }));
    get().saveStats();
  },

  recordReviewSession: (data: ReviewSessionData) => {
    set(state => ({
      reviewStats: {
        totalReviews: state.reviewStats.totalReviews + data.cardsReviewed,
        totalCorrect: state.reviewStats.totalCorrect + data.correctCount,
        totalTimeSpent: state.reviewStats.totalTimeSpent + data.timeSpentSeconds,
        reviewsToday: state.reviewStats.reviewsToday + data.cardsReviewed,
      },
    }));
    get().saveStats();
  },

  updateStats: (updates: Partial<ReadingStats>) => {
    set(state => ({
      stats: {...state.stats, ...updates},
    }));
    get().saveStats();
  },

  loadStats: async () => {
    set({isLoading: true});
    try {
      const stored = await AsyncStorage.getItem(STATISTICS_KEY);
      if (stored) {
        const data = JSON.parse(stored) as {
          stats?: Partial<ReadingStats>;
          sessions?: SerializedSession[];
          reviewStats?: {
            totalReviews: number;
            totalCorrect: number;
            totalTimeSpent: number;
            reviewsToday: number;
          };
        };
        const sessions: ReadingSession[] = (data.sessions ?? []).map(s => ({
          ...s,
          startedAt: new Date(s.startedAt),
          endedAt: s.endedAt ? new Date(s.endedAt) : null,
        }));
        set({
          stats: {...defaultStats, ...data.stats},
          sessions,
          reviewStats: data.reviewStats ?? get().reviewStats,
        });
      }
      set({isLoading: false});
    } catch (error) {
      console.error('Failed to load stats:', error);
      set({isLoading: false});
    }
  },

  saveStats: async () => {
    try {
      const {stats, sessions, reviewStats} = get();
      const sessionsToSave = sessions
        .slice(-MAX_PERSISTED_SESSIONS)
        .map(s => ({
          ...s,
          startedAt: s.startedAt.toISOString(),
          endedAt: s.endedAt ? s.endedAt.toISOString() : null,
        }));
      await AsyncStorage.setItem(
        STATISTICS_KEY,
        JSON.stringify({stats, sessions: sessionsToSave, reviewStats}),
      );
    } catch (error) {
      console.error('Failed to save stats:', error);
    }
  },

  refreshStats: async () => {
    await get().loadStats();
  },

  resetDailyStats: () => {
    set(state => ({
      stats: {
        ...state.stats,
        wordsRevealedToday: 0,
        wordsSavedToday: 0,
      },
    }));
    get().saveStats();
  },
}));
