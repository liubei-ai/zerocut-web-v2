/* eslint-disable no-unused-vars */

export enum EUserRole {
  Child = 'child',
  Parent = 'parent',
  Creator = 'creator',
  Admin = 'admin',
}

export enum EUserSettings {
  AUTOPLAY = 'autoplay',
}

export interface UserSettings {
  autoplay: boolean;
}

export enum EUserGender {
  FEMALE = 'female',
  MALE = 'male',
}

export interface IUserInfo {
  displayId: string;
  username: string;
  avatar: string;
  age: number;
  intro: string;
  role: EUserRole;
  birthAt?: string;
  createdAt?: string;
  lastLoginInAt?: string;
  settings: UserSettings;
  gender: EUserGender;
}

export interface IConversation {
  id: number;
  displayId: string;
  title: string;
  bot: IBot;
  user: IUserInfo;
  plan: any;
  createdAt: string;
  updatedAt: string;
  fromNow?: string;
  messageCount?: number;
}

export interface IVoice {
  provider: string;
  name: string;
  autoplay?: boolean;
}

export interface ICreator {
  displayId: string;
  avatar: string;
  username: string;
  intro: string;
}

export interface ICategory {
  id: number;
  displayId: string;
  title: string;
  description: string;
  createdAt: string;
  bots?: IBot[];
}

export interface IBot {
  displayId: string;
  name: string;
  shortUrl: string;
  description: string;
  promptStarters: string[];
  welcomeMessage: string;
  welcomeMessageVoice: string;
  avatar: string;
  voice: IVoice;
  tags: string[];
  tools: any[];
  createdAt: string;
  creator: ICreator;
  categories: ICategory[];
  dominantColor: string;
}

export enum EMessageRole {
  USER = 'user',
  SYSTEM = 'system',
  ASSISTANT = 'assistant',
  FUNCTION = 'function',
}

export interface IMessage {
  clientId: string;
  userId?: number;
  botId?: number;
  role: EMessageRole;
  content: string;
  createdAt: string;
  updatedAt: string;
  timeAgo?: string;
  voice?: string;
  autoplay?: boolean;
}

export interface IMessageRendered extends IMessage {
  renderedMarkdown: string;
  autoPlay?: boolean;
}

export interface IPaginationState {
  page: number;
  pageSize: number;
  hasMore: boolean;
  status: EPaginationState;
}

export interface ILearningPlan {
  displayId: string;
  title: string;
  status: string;
  bot: IBot;
  report: string;
  reportAt: string;
}

export interface ILearningTarget {
  displayId: string;
  title: string;
  status: LearningTargetStatus;
  bot: IBot;
  child?: IUserInfo;
  planList: ILearningPlan[];
}

export enum EPaginationState {
  INIT = 'INIT',
  LOADING = 'LOADING',
  EMPTY = 'EMPTY',
  FINISHED = 'FINISHED',
  ERROR = 'ERROR',
}

export enum LearningPlanStatus {
  NOTSTARTED = 'notstartd',
  ASSIGNED = 'assigned',
  INPROGRESS = 'inprogress',
  COMPLETED = 'completed',
}

export enum LearningTargetStatus {
  NOTSTARTED = 'notstarted',
  ASSIGNED = 'assigned',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
}

export enum EPhoneCallState {
  IDLE = 'IDLE',
  CALLING = 'CALLING',
  ANSWERING = 'ANSWERING',
  WAIT_SPEAK = 'WAIT_SPEAK',
  SPEAKING = 'SPEAKING',
}
