import { Timestamp } from 'firebase/firestore';

/**
 * User Configuration
 * Global settings for the user's Threads automation.
 */
export interface UserConfig {
  geminiKey?: string;
  timezone?: string;
  threadsClientId?: string;
  threadsClientSecret?: string;
  isPaid?: boolean;
  createdAt?: string;
  role?: 'user' | 'admin';
  hatenaEmail?: string;
}

/**
 * Admin Configuration
 * System-wide settings for MIZUIRO.
 */
export interface AdminConfig {
  availableModels: string[]; // List of AI model IDs
  updatedAt?: Timestamp;
}

/**
 * Character Settings
 * Defines the personality and tone of the AI poster.
 */
export interface CharacterSettings {
  id: string;
  name: string;
  basicInfo: string;
  firstPerson: string;
  ending: string;
  tendency: string;
}

/**
 * Threads Account
 * Linked Threads account information.
 */
export interface ThreadsAccount {
  id: string;
  threadsToken: string;
  threadsUserId: string;
  accountName: string;
  profilePic?: string;
  createdAt?: Timestamp;
  lastRefreshedAt?: Timestamp;
}

/**
 * Automation Schedule
 * Defines when and how to post content automatically.
 */
export interface Schedule {
  id: string;
  type: 'fixed' | 'random';
  time?: string; // HH:mm format for 'fixed'
  frequency?: number; // posts per day for 'random'
  characterId: string;
  accountId: string;
  prompt: string;
  enabled: boolean;
  days: string[]; // ['sun', 'mon', ...]
}

/**
 * Post Log
 * History of manual and automated posts.
 */
export interface PostLog {
  id: string;
  type: 'manual' | 'auto';
  status: 'success' | 'error';
  text: string;
  message: string;
  timestamp?: Timestamp;
  accountId: string;
  characterId: string;
}
