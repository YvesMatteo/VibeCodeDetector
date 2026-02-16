import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { CheckVibeClient } from './client.js';
import type { ScannerResult, Finding } from './types.js';

function summarizeFindings(results: Record<string, ScannerResult>): string {
  let critical = 0, high = 0, medium = 0, low = 0, info = 0;

  for (const scanner of Object.values(results)) {
    if (!scanner.findings) continue;
    for (const f of scanner.findings) {
      switch (f.severity?.toLowerCase()) {
        case 'critical': critical++; break;
        case 'high': high++; break;
        case 'medium': medium++; break;
        case 'low': low++; break;
        case 'info': info++; break;
      }
    }
  }

  const parts: string[] = [];
  if (critical > 0) parts.push(`${critical} critical`);
  if (high > 0) parts.push(`${high} high`);
  if (medium > 0) parts.push(`${medium} medium`);
  if (low > 0) parts.push(`${low} low`);
  if (info > 0) parts.push(`${info} info`);

  return parts.length > 0 ? parts.join(', ') : 'No findings';
}

function formatFinding(f: Finding): string {
  const lines = [`  [${f.severity}] ${f.title}`];
  if (f.description) lines.push(`    Description: ${f.description}`);
  if (f.recommendation) lines.push(`    Fix: ${f.recommendation}`);
  const evidence = f.evidence || f.value;
  if (evidence) lines.push(`    Evidence: ${evidence}`);
  return lines.join('\n');
}

function collectCriticalHighFindings(results: Record<string, ScannerResult>): string[] {
  const lines: string[] = [];
  for (const [scannerName, result] of Object.entries(results)) {
    if (!result.findings) continue;
    const serious = result.findings.filter(
      f => f.severity?.toLowerCase() === 'critical' || f.severity?.toLowerCase() === 'high'
    );
    if (serious.length === 0) continue;
    lines.push(`\n[${scannerName}]`);
    for (const f of serious) {
      lines.push(formatFinding(f));
    }
  }
  return lines;
}

export function registerTools(server: McpServer, client: CheckVibeClient) {
  server.tool(
    'run_scan',
    'Trigger a new security scan on a URL. Returns the scan ID, overall score, and a summary of findings by severity.',
    {
      url: z.string().describe('The URL to scan (e.g., https://example.com)'),
      github_repo: z.string().optional().describe('GitHub repository URL for deep secret scanning'),
      supabase_url: z.string().optional().describe('Supabase project URL for backend scanning'),
    },
    async ({ url, github_repo, supabase_url }) => {
      // Validate URL format before sending to API
      const targetUrl = url.startsWith('http') ? url : `https://${url}`;
      try {
        const parsed = new URL(targetUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return { content: [{ type: 'text' as const, text: 'Error: Only http and https URLs are allowed.' }] };
        }
      } catch {
        return { content: [{ type: 'text' as const, text: 'Error: Invalid URL format.' }] };
      }

      const result = await client.runScan(url, github_repo, supabase_url);

      const summary = summarizeFindings(result.results);
      const scannerScores = Object.entries(result.results)
        .filter(([, r]) => typeof r.score === 'number' && !r.error)
        .map(([name, r]) => `  ${name}: ${r.score}/100`)
        .join('\n');

      const textParts = [
        `Scan completed for ${result.url}`,
        `Scan ID: ${result.scanId}`,
        `Overall Score: ${result.overallScore}/100`,
        `Findings: ${summary}`,
        '',
        'Scanner Scores:',
        scannerScores,
      ];

      const criticalHigh = collectCriticalHighFindings(result.results);
      if (criticalHigh.length > 0) {
        textParts.push('', 'Critical & High Findings:', ...criticalHigh);
      }

      textParts.push('', `Use get_scan_results with scan_id "${result.scanId}" for the complete report.`);

      return {
        content: [{
          type: 'text' as const,
          text: textParts.join('\n'),
        }],
      };
    }
  );

  server.tool(
    'get_scan_results',
    'Get detailed results for a specific scan including all scanner findings.',
    {
      scan_id: z.string().describe('The scan ID to retrieve results for'),
    },
    async ({ scan_id }) => {
      // Validate scan_id format (UUID)
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(scan_id)) {
        return { content: [{ type: 'text' as const, text: 'Error: Invalid scan ID format. Expected a UUID.' }] };
      }
      const scan = await client.getScan(scan_id);

      const lines: string[] = [
        `Scan: ${scan.url}`,
        `Status: ${scan.status}`,
        `Overall Score: ${scan.overall_score ?? 'N/A'}/100`,
        `Created: ${scan.created_at}`,
        '',
      ];

      if (scan.results) {
        for (const [scannerName, result] of Object.entries(scan.results)) {
          lines.push(`--- ${scannerName} (score: ${result.score ?? 'N/A'}) ---`);
          if (result.error) {
            lines.push(`  Error: ${result.error}`);
          }
          if (result.findings && result.findings.length > 0) {
            for (const f of result.findings) {
              lines.push(formatFinding(f));
            }
          } else if (!result.error) {
            lines.push('  No issues found');
          }
          lines.push('');
        }
      }

      return {
        content: [{
          type: 'text' as const,
          text: lines.join('\n'),
        }],
      };
    }
  );

  server.tool(
    'list_scans',
    'List recent security scans with their status and scores.',
    {
      limit: z.number().optional().describe('Number of scans to return (default: 10, max: 100)'),
      status: z.string().optional().describe('Filter by status (e.g., "completed")'),
    },
    async ({ limit, status }) => {
      const clampedLimit = Math.min(Math.max(limit ?? 10, 1), 100);
      const result = await client.listScans(clampedLimit, status);

      if (result.scans.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: 'No scans found.',
          }],
        };
      }

      const lines = result.scans.map(s =>
        `${s.id} | ${s.url} | ${s.status} | score: ${s.overall_score ?? '-'} | ${s.created_at}`
      );

      return {
        content: [{
          type: 'text' as const,
          text: [
            `Showing ${result.scans.length} of ${result.total} scans:`,
            '',
            ...lines,
          ].join('\n'),
        }],
      };
    }
  );
}
