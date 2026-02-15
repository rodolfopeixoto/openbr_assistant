/**
 * LeakDetection - Detect secrets in code and logs
 * Prevents accidental exposure of API keys, tokens, and credentials
 */

import { EventEmitter } from 'events';
import { readFile } from 'fs/promises';
import { glob } from 'glob';

interface LeakPattern {
  name: string;
  regex: RegExp;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}

interface LeakFinding {
  pattern: string;
  file: string;
  line: number;
  column: number;
  match: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}

interface DetectionConfig {
  scanCode?: boolean;
  scanLogs?: boolean;
  patterns?: LeakPattern[];
  ignorePatterns?: string[];
  threshold?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * LeakDetection - Secret detection in code and runtime
 * 
 * Features:
 * - Pattern-based detection (API keys, tokens, passwords)
 * - File scanning
 * - Runtime log monitoring
 * - Configurable severity levels
 */
export class LeakDetection extends EventEmitter {
  private config: DetectionConfig;
  private patterns: LeakPattern[];
  private isScanning: boolean = false;

  // Default patterns for common secrets
  private static DEFAULT_PATTERNS: LeakPattern[] = [
    {
      name: 'AWS Access Key',
      regex: /AKIA[0-9A-Z]{16}/,
      severity: 'critical',
      description: 'AWS Access Key ID detected'
    },
    {
      name: 'AWS Secret Key',
      regex: /['"`]([0-9a-zA-Z/+]{40})['"`]/,
      severity: 'critical',
      description: 'Potential AWS Secret Access Key'
    },
    {
      name: 'Generic API Key',
      regex: /['"`]?(api[_-]?key|apikey)['"`]?\s*[:=]\s*['"`]([a-zA-Z0-9_\-]{16,})['"`]/i,
      severity: 'high',
      description: 'Generic API key detected'
    },
    {
      name: 'Private Key',
      regex: /-----BEGIN (RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----/,
      severity: 'critical',
      description: 'Private key detected'
    },
    {
      name: 'GitHub Token',
      regex: /gh[pousr]_[A-Za-z0-9_]{36,}/,
      severity: 'critical',
      description: 'GitHub token detected'
    },
    {
      name: 'Slack Token',
      regex: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*/,
      severity: 'critical',
      description: 'Slack token detected'
    },
    {
      name: 'Bearer Token',
      regex: /bearer\s+[a-zA-Z0-9_\-\.=]+/i,
      severity: 'high',
      description: 'Bearer token detected'
    },
    {
      name: 'Password in URL',
      regex: /[a-zA-Z]{3,10}:\/\/[^\/\s:@]*:[^\/\s:@]*@/,
      severity: 'high',
      description: 'Password in URL detected'
    },
    {
      name: 'OpenAI API Key',
      regex: /sk-[a-zA-Z0-9]{20,}T3BlbkFJ[a-zA-Z0-9]{20,}/,
      severity: 'critical',
      description: 'OpenAI API key detected'
    }
  ];

  constructor(config: DetectionConfig = {}) {
    super();
    this.config = {
      scanCode: true,
      scanLogs: true,
      threshold: 'low',
      ...config
    };
    
    this.patterns = [
      ...LeakDetection.DEFAULT_PATTERNS,
      ...(config.patterns || [])
    ];
  }

  /**
   * Scan a string for secrets
   */
  scanString(content: string, source: string = 'inline'): LeakFinding[] {
    const findings: LeakFinding[] = [];
    const lines = content.split('\n');

    for (const pattern of this.patterns) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let match: RegExpExecArray | null;
        
        // Reset regex
        pattern.regex.lastIndex = 0;
        
        while ((match = pattern.regex.exec(line)) !== null) {
          findings.push({
            pattern: pattern.name,
            file: source,
            line: i + 1,
            column: match.index + 1,
            match: this.maskMatch(match[0]),
            severity: pattern.severity,
            description: pattern.description
          });

          // Prevent infinite loop on zero-width matches
          if (match.index === pattern.regex.lastIndex) {
            pattern.regex.lastIndex++;
          }
        }
      }
    }

    // Filter by threshold
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const minSeverity = severityOrder[this.config.threshold || 'low'];

    const filtered = findings.filter(f => 
      severityOrder[f.severity] >= minSeverity
    );

    if (filtered.length > 0) {
      this.emit('secretsDetected', { findings: filtered, source });
    }

    return filtered;
  }

  /**
   * Scan a file for secrets
   */
  async scanFile(filePath: string): Promise<LeakFinding[]> {
    try {
      const content = await readFile(filePath, 'utf-8');
      return this.scanString(content, filePath);
    } catch (error) {
      this.emit('scanError', { file: filePath, error });
      return [];
    }
  }

  /**
   * Scan multiple files using glob pattern
   */
  async scanFiles(pattern: string, ignore?: string[]): Promise<LeakFinding[]> {
    if (this.isScanning) {
      throw new Error('Scan already in progress');
    }

    this.isScanning = true;
    const findings: LeakFinding[] = [];

    try {
      const files = await glob(pattern, { ignore: ignore || this.config.ignorePatterns });
      
      this.emit('scanStarted', { fileCount: files.length });

      for (const file of files) {
        const fileFindings = await this.scanFile(file);
        findings.push(...fileFindings);
      }

      this.emit('scanCompleted', { 
        fileCount: files.length, 
        findingCount: findings.length,
        findings 
      });

      return findings;
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Monitor logs in real-time
   */
  monitorLogLine(line: string, source: string = 'log'): LeakFinding[] {
    if (!this.config.scanLogs) return [];
    return this.scanString(line, source);
  }

  /**
   * Add a custom detection pattern
   */
  addPattern(pattern: LeakPattern): void {
    this.patterns.push(pattern);
  }

  /**
   * Remove a detection pattern
   */
  removePattern(name: string): void {
    this.patterns = this.patterns.filter(p => p.name !== name);
  }

  /**
   * Get all configured patterns
   */
  getPatterns(): LeakPattern[] {
    return [...this.patterns];
  }

  /**
   * Check if scan is in progress
   */
  scanning(): boolean {
    return this.isScanning;
  }

  private maskMatch(match: string): string {
    if (match.length <= 8) return '****';
    return match.substring(0, 4) + '****' + match.substring(match.length - 4);
  }
}

export default LeakDetection;
