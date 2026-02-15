'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ExternalLink, Clock, MoreVertical, Trash2, Eye, ChevronUp, ChevronDown } from 'lucide-react';

function getIssueCountColor(count: number) {
  if (count === 0) return 'text-green-500';
  if (count <= 3) return 'text-amber-500';
  if (count <= 7) return 'text-orange-500';
  return 'text-red-500';
}

function countIssues(results: Record<string, any> | null): number {
  if (!results) return 0;
  let count = 0;
  Object.values(results).forEach((r: any) => {
    if (r.findings && Array.isArray(r.findings)) {
      r.findings.forEach((f: any) => {
        if (f.severity?.toLowerCase() !== 'info') count++;
      });
    }
  });
  return count;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type SortField = 'date' | 'website' | 'issues';
type SortDir = 'asc' | 'desc';

interface ScansTableProps {
  scans: any[];
}

function SortHeader({ label, field, sortBy, sortDir, onSort, className }: {
  label: string;
  field: SortField;
  sortBy: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const active = sortBy === field;
  return (
    <TableHead className={className}>
      <button
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 hover:text-white transition-colors"
      >
        {label}
        {active ? (
          sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3 opacity-30" />
        )}
      </button>
    </TableHead>
  );
}

export function ScansTable({ scans }: ScansTableProps) {
  const router = useRouter();
  const [sortBy, setSortBy] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; url: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir(field === 'date' ? 'desc' : 'asc');
    }
  };

  const sorted = [...scans].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortBy === 'date') {
      return dir * (new Date(a.completed_at || a.created_at).getTime() - new Date(b.completed_at || b.created_at).getTime());
    }
    if (sortBy === 'website') {
      return dir * a.url.localeCompare(b.url);
    }
    if (sortBy === 'issues') {
      return dir * (countIssues(a.results) - countIssues(b.results));
    }
    return 0;
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/scan/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteTarget(null);
        router.refresh();
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader label="Website" field="website" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              <SortHeader label="Issues" field="issues" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              <TableHead className="hidden sm:table-cell">Severity</TableHead>
              <TableHead>Status</TableHead>
              <SortHeader label="Date" field="date" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="hidden sm:table-cell" />
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((scan) => {
              const results = scan.results as Record<string, any> | null;
              let scanFindings = 0;
              let scanCritical = 0;
              let scanHigh = 0;
              if (results) {
                Object.values(results).forEach((r: any) => {
                  if (r.findings && Array.isArray(r.findings)) {
                    r.findings.forEach((f: any) => {
                      const sev = f.severity?.toLowerCase();
                      if (sev === 'info') return;
                      scanFindings++;
                      if (sev === 'critical') scanCritical++;
                      if (sev === 'high') scanHigh++;
                    });
                  }
                });
              }

              return (
                <TableRow
                  key={scan.id}
                  className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                  onClick={() => router.push(`/dashboard/scans/${scan.id}`)}
                >
                  <TableCell className="max-w-[180px] sm:max-w-none">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium truncate">
                        {scan.url.replace(/^https?:\/\//, '')}
                      </span>
                      <a
                        href={scan.url.startsWith('http') ? scan.url : `https://${scan.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </TableCell>
                  <TableCell>
                    {scan.status === 'running' || scan.status === 'pending' ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-muted-foreground">Scanning</span>
                      </div>
                    ) : (
                      <span className={`text-xl font-bold ${getIssueCountColor(scanFindings)}`}>
                        {scanFindings}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {scan.status === 'completed' ? (
                      <div className="flex gap-1.5">
                        {scanCritical > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {scanCritical} critical
                          </Badge>
                        )}
                        {scanHigh > 0 && (
                          <Badge variant="secondary" className="text-xs bg-orange-500/10 text-orange-500">
                            {scanHigh} high
                          </Badge>
                        )}
                        {scanCritical === 0 && scanHigh === 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {scanFindings} issues
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {scan.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex items-center gap-1 text-muted-foreground text-sm">
                      <Clock className="h-3 w-3" />
                      {formatDate(scan.completed_at || scan.created_at)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/scans/${scan.id}`} className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-400 focus:text-red-400"
                          onClick={() => setDeleteTarget({ id: scan.id, url: scan.url })}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Scan</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the scan for{' '}
              <span className="font-medium text-white">{deleteTarget?.url.replace(/^https?:\/\//, '')}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
