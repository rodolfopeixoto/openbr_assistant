export type ChannelType =
  | "telegram"
  | "discord"
  | "slack"
  | "whatsapp"
  | "signal"
  | "web"
  | "email"
  | "sms";

export type ChannelStatus = "online" | "offline" | "error" | "connecting";

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  enabled: boolean;
  config: Record<string, unknown>;
  description?: string;
  icon?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChannelStatusInfo {
  channelId: string;
  status: ChannelStatus;
  lastSeen?: string;
  lastError?: string;
  latency?: number;
  connectedSince?: string;
}

export interface ChannelMetrics {
  channelId: string;
  messagesSent: number;
  messagesReceived: number;
  messagesFailed: number;
  successRate: number;
  averageLatency: number;
  lastActivity: string;
}

export interface RouteResult {
  channelId: string;
  channelName: string;
  channelType: ChannelType;
  healthScore: number;
  estimatedLatency: number;
  reason: string;
}

export interface UnifiedStatus {
  total: number;
  enabled: number;
  online: number;
  offline: number;
  error: number;
  byType: Record<ChannelType, { total: number; online: number }>;
}

export interface HealthStatus {
  healthy: boolean;
  score: number;
  issues: string[];
  recommendations: string[];
}

export interface TestResult {
  channelId: string;
  success: boolean;
  latency: number;
  error?: string;
  timestamp: string;
}
