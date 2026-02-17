'use client';

import { Download, FileText, FileDown, ChevronDown, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import Link from 'next/link';

interface ExportButtonProps {
    scanId: string;
    className?: string;
    userPlan?: string;
}

export function ExportButton({ scanId, className, userPlan }: ExportButtonProps) {
    const isFreePlan = userPlan === 'none';

    if (isFreePlan) {
        return (
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" className={`bg-white/5 border-white/10 ${className ?? ''}`}>
                        <Download className="mr-2 h-4 w-4" />
                        Export
                        <Lock className="ml-1.5 h-3 w-3 opacity-60" />
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm bg-[#070D19] border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Lock className="h-5 w-5 text-indigo-400" />
                            Export requires a plan
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Subscribe to export your scan results as Markdown or PDF.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end mt-4">
                        <Button asChild className="bg-indigo-600 hover:bg-indigo-500 text-white">
                            <Link href="/dashboard/credits">View Plans</Link>
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className={`bg-white/5 border-white/10 ${className ?? ''}`}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                    <ChevronDown className="ml-1.5 h-3.5 w-3.5 opacity-60" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem asChild>
                    <a href={`/api/scan/${scanId}/export`} download>
                        <FileText className="mr-2 h-4 w-4" />
                        Markdown
                    </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <a href={`/api/scan/${scanId}/export?format=pdf`} download>
                        <FileDown className="mr-2 h-4 w-4" />
                        PDF
                    </a>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
