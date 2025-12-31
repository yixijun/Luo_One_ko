/**
 * 洛一 (Luo One) 邮箱管理系统 - TypeScript 类型定义
 * Requirements: 8.1
 */

// 用户信息
export interface User {
  id: number;
  username: string;
  nickname: string;
  avatar: string;
  createdAt?: number;
  updatedAt?: number;
}

// 邮箱账户
export interface EmailAccount {
  id: number;
  userId: number;
  email: string;
  displayName: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  username: string;
  password?: string;
  useSSL: boolean;
  enabled: boolean;
  lastSyncAt: number;
  createdAt?: number;
}

// 处理结果
export interface ProcessedResult {
  id: number;
  emailId: number;
  verificationCode?: string;
  isAd: boolean;
  summary?: string;
  importance: 'low' | 'medium' | 'high' | 'critical';
  processedAt: number;
  processedBy: 'ai' | 'local';
}

// 邮件文件夹类型
export type EmailFolder = 'inbox' | 'sent' | 'trash' | 'all';

// 邮件
export interface Email {
  id: number;
  accountId: number;
  messageId: string;
  subject: string;
  from: string;
  to: string[];
  date: number;
  body: string;
  htmlBody: string;
  hasAttachments: boolean;
  isRead: boolean;
  folder: EmailFolder;
  rawFilePath?: string;
  processedResult?: ProcessedResult;
  createdAt?: number;
}

// 用户设置
export interface UserSettings {
  id?: number;
  userId?: number;
  aiEnabled: boolean;
  aiProvider: string;
  aiApiKey: string;
  aiModel: string;
  extractCode: boolean;
  detectAd: boolean;
  summarize: boolean;
  judgeImportance: boolean;
}


// API 响应类型
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// 登录请求/响应
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expiresAt: number;
}

// 修改密码请求
export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

// 邮件列表响应
export interface EmailListResponse {
  total: number;
  page: number;
  limit: number;
  emails: Email[];
}

// 邮件列表查询参数
export interface EmailListParams {
  accountId?: number;
  folder?: EmailFolder;
  page?: number;
  limit?: number;
  sort?: 'date' | 'from';
  search?: string;
}

// 发送邮件请求
export interface SendEmailRequest {
  accountId: number;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  attachments?: string[];
}

// 连接测试响应
export interface TestConnectionResponse {
  success: boolean;
  message: string;
}

// 同步请求
export interface SyncRequest {
  accountId?: number;
  days?: number; // 收取天数，0 表示使用上次同步时间或默认 30 天
}
