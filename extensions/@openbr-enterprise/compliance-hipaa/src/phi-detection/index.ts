/**
 * PHIDetection - HIPAA Protected Health Information detection
 * Identifies and masks PHI in messages
 */

export class PHIDetection {
  private patterns = [
    { name: 'SSN', regex: /\b\d{3}-\d{2}-\d{4}\b/, risk: 'high' },
    { name: 'Email', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, risk: 'medium' },
    { name: 'Phone', regex: /\b\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/, risk: 'medium' }
  ];

  scan(text: string): { found: boolean; matches: any[]; masked: string } {
    const matches: any[] = [];
    let masked = text;

    for (const pattern of this.patterns) {
      const regex = new RegExp(pattern.regex, 'g');
      let match;
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          type: pattern.name,
          value: match[0],
          risk: pattern.risk,
          position: match.index
        });
        masked = masked.replace(match[0], `[${pattern.name}]`);
      }
    }

    return { found: matches.length > 0, matches, masked };
  }
}

export default PHIDetection;
