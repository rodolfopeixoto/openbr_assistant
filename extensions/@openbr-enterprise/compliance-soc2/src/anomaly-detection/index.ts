/**
 * AnomalyDetection - SOC2 CC7.2 System Monitoring
 * Detects unusual patterns and potential security incidents
 */

import { EventEmitter } from 'events';

interface MetricData {
  timestamp: Date;
  value: number;
  metric: string;
}

interface AnomalyRule {
  name: string;
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq';
  severity: 'low' | 'medium' | 'high' | 'critical';
  windowMs: number; // Time window for evaluation
}

interface Anomaly {
  id: string;
  rule: string;
  metric: string;
  value: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
}

interface BaselineStats {
  metric: string;
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  sampleCount: number;
}

/**
 * AnomalyDetection - Real-time anomaly detection
 * 
 * Features:
 * - Statistical baseline calculation
 * - Configurable detection rules
 * - Multiple detection algorithms
 * - Alert management
 */
export class AnomalyDetection extends EventEmitter {
  private metrics: Map<string, MetricData[]> = new Map();
  private rules: Map<string, AnomalyRule> = new Map();
  private anomalies: Map<string, Anomaly> = new Map();
  private baselines: Map<string, BaselineStats> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(private checkIntervalMs: number = 60000) {
    super();
    this.startMonitoring();
  }

  /**
   * Add a detection rule
   */
  addRule(rule: AnomalyRule): void {
    this.rules.set(rule.name, rule);
  }

  /**
   * Remove a detection rule
   */
  removeRule(name: string): boolean {
    return this.rules.delete(name);
  }

  /**
   * Record a metric value
   */
  recordMetric(metric: string, value: number): void {
    const data: MetricData = {
      timestamp: new Date(),
      value,
      metric
    };

    if (!this.metrics.has(metric)) {
      this.metrics.set(metric, []);
    }

    const metrics = this.metrics.get(metric)!;
    metrics.push(data);

    // Keep only last 24 hours of data
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const filtered = metrics.filter(m => m.timestamp > cutoff);
    this.metrics.set(metric, filtered);

    // Update baseline
    this.updateBaseline(metric);

    // Check rules
    this.checkRules(metric, value);
  }

  /**
   * Get anomalies
   */
  getAnomalies(filters?: {
    severity?: Anomaly['severity'];
    acknowledged?: boolean;
  }): Anomaly[] {
    let anomalies = Array.from(this.anomalies.values());

    if (filters?.severity) {
      anomalies = anomalies.filter(a => a.severity === filters.severity);
    }
    if (filters?.acknowledged !== undefined) {
      anomalies = anomalies.filter(a => a.acknowledged === filters.acknowledged);
    }

    return anomalies.sort((a, b) => 
      b.detectedAt.getTime() - a.detectedAt.getTime()
    );
  }

  /**
   * Acknowledge an anomaly
   */
  acknowledgeAnomaly(anomalyId: string, user: string): boolean {
    const anomaly = this.anomalies.get(anomalyId);
    if (!anomaly) return false;

    anomaly.acknowledged = true;
    anomaly.acknowledgedBy = user;

    this.emit('anomalyAcknowledged', { anomaly, user });
    return true;
  }

  /**
   * Get baseline statistics for a metric
   */
  getBaseline(metric: string): BaselineStats | null {
    return this.baselines.get(metric) || null;
  }

  /**
   * Check if current value is anomalous using statistical method
   */
  isAnomalous(metric: string, value: number, thresholdStdDev: number = 3): boolean {
    const baseline = this.baselines.get(metric);
    if (!baseline || baseline.sampleCount < 30) return false;

    const zScore = Math.abs((value - baseline.mean) / baseline.stdDev);
    return zScore > thresholdStdDev;
  }

  /**
   * Get current metrics summary
   */
  getMetricsSummary(): { metric: string; count: number; latest: number }[] {
    return Array.from(this.metrics.entries()).map(([metric, data]) => ({
      metric,
      count: data.length,
      latest: data[data.length - 1]?.value || 0
    }));
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    this.removeAllListeners();
  }

  private updateBaseline(metric: string): void {
    const data = this.metrics.get(metric);
    if (!data || data.length < 10) return;

    const values = data.map(d => d.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    this.baselines.set(metric, {
      metric,
      mean,
      stdDev,
      min: Math.min(...values),
      max: Math.max(...values),
      sampleCount: values.length
    });
  }

  private checkRules(metric: string, value: number): void {
    for (const rule of this.rules.values()) {
      if (rule.metric !== metric) continue;

      let triggered = false;
      switch (rule.operator) {
        case 'gt':
          triggered = value > rule.threshold;
          break;
        case 'lt':
          triggered = value < rule.threshold;
          break;
        case 'eq':
          triggered = value === rule.threshold;
          break;
      }

      if (triggered) {
        this.createAnomaly(rule, value);
      }
    }
  }

  private createAnomaly(rule: AnomalyRule, value: number): void {
    const id = `ANM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const anomaly: Anomaly = {
      id,
      rule: rule.name,
      metric: rule.metric,
      value,
      threshold: rule.threshold,
      severity: rule.severity,
      detectedAt: new Date(),
      acknowledged: false
    };

    this.anomalies.set(id, anomaly);
    this.emit('anomalyDetected', { anomaly });
  }

  private startMonitoring(): void {
    this.checkInterval = setInterval(() => {
      // Periodic checks can be added here
      this.emit('healthCheck', { timestamp: new Date() });
    }, this.checkIntervalMs);
  }
}

export default AnomalyDetection;
