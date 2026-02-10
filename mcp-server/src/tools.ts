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
      const result = await client.runScan(url, github_repo, supabase_url);

      const summary = summarizeFindings(result.results);
      const scannerScores = Object.entries(result.results)
        .filter(([, r]) => typeof r.score === 'number' && !r.error)
        .map(([name, r]) => `  ${name}: ${r.score}/100`)
        .join('\n');

      return {
        content: [{
          type: 'text' as const,
          text: [
            `Scan completed for ${result.url}`,
            `Scan ID: ${result.scanId}`,
            `Overall Score: ${result.overallScore}/100`,
            `Findings: ${summary}`,
            '',
            'Scanner Scores:',
            scannerScores,
          ].join('\n'),
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
              lines.push(`  [${f.severity}] ${f.title}${f.description ? ': ' + f.description : ''}`);
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
      const result = await client.listScans(limit ?? 10, status);

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
