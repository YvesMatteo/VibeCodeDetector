'use client';

import { Download, FileText, FileDown, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

interface ExportButtonProps {
    scanId: string;
    className?: string;
}

export function ExportButton({ scanId, className }: ExportButtonProps) {
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
