import { describe, it, expect, beforeEach } from 'vitest';
import { LeakDetection } from '../src/leak-detection/index.js';

describe('LeakDetection', () => {
  let detector: LeakDetection;

  beforeEach(() => {
    detector = new LeakDetection();
  });

  it('should detect AWS access key', () => {
    const code = 'const key = "AKIAIOSFODNN7EXAMPLE"';
    const findings = detector.scanString(code, 'test.js');
    
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].pattern).toBe('AWS Access Key');
  });

  it('should detect GitHub token', () => {
    const code = 'const token = "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"';
    const findings = detector.scanString(code, 'test.js');
    
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].pattern).toBe('GitHub Token');
  });

  it('should detect Slack token', () => {
    const code = 'const token = "xoxb-EXAMPLE123-FAKE456-SAMPLE789TOKEN"';
    const findings = detector.scanString(code, 'test.js');
    
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].pattern).toBe('Slack Token');
  });

  it('should detect private key', () => {
    const code = 'const key = `-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...`;';
    const findings = detector.scanString(code, 'test.js');
    
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].pattern).toBe('Private Key');
  });

  it('should detect generic API key', () => {
    const code = 'const apiKey = "sk_live_1234567890abcdef"';
    const findings = detector.scanString(code, 'test.js');
    
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].pattern).toContain('API');
  });

  it('should mask matched values', () => {
    const code = 'const secret = "super-secret-value-12345"';
    const findings = detector.scanString(code, 'test.js');
    
    if (findings.length > 0) {
      expect(findings[0].match).toContain('****');
      expect(findings[0].match).not.toBe('super-secret-value-12345');
    }
  });

  it('should return empty array for clean code', () => {
    const code = 'const greeting = "Hello World"';
    const findings = detector.scanString(code, 'test.js');
    
    expect(findings).toHaveLength(0);
  });

  it('should add custom pattern', () => {
    detector.addPattern({
      name: 'Custom Pattern',
      regex: /CUSTOM_SECRET_\w+/,
      severity: 'high',
      description: 'Custom secret pattern'
    });

    const code = 'const custom = "CUSTOM_SECRET_ABC123"';
    const findings = detector.scanString(code, 'test.js');
    
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.some(f => f.pattern === 'Custom Pattern')).toBe(true);
  });

  it('should filter by threshold', () => {
    const strictDetector = new LeakDetection({ threshold: 'critical' });
    const code = 'const email = "test@example.com"'; // Lower severity
    
    const findings = strictDetector.scanString(code, 'test.js');
    expect(findings).toHaveLength(0);
  });

  it('should get all patterns', () => {
    const patterns = detector.getPatterns();
    expect(patterns.length).toBeGreaterThan(5);
    expect(patterns.some(p => p.name === 'AWS Access Key')).toBe(true);
  });

  it('should monitor log lines', () => {
    const logLine = 'Error: Token ghp_1234567890abcdef is invalid';
    const findings = detector.monitorLogLine(logLine, 'app.log');
    
    expect(findings.length).toBeGreaterThan(0);
  });

  it('should classify severity correctly', () => {
    const code = `
      const aws = "AKIAIOSFODNN7EXAMPLE";
      const email = "test@example.com";
    `;
    const findings = detector.scanString(code, 'test.js');
    
    const awsFinding = findings.find(f => f.pattern === 'AWS Access Key');
    if (awsFinding) {
      expect(awsFinding.severity).toBe('critical');
    }
  });
});
