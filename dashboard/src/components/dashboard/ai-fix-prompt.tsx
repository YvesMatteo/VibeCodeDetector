'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Sparkles, Copy, Check } from 'lucide-react';

interface Finding {
    title: string;
    description: string;
    severity: string;
}

interface AIFixPromptProps {
    url: string;
    findings: Finding[];
}

export function AIFixPrompt({ url, findings }: AIFixPromptProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const generatePrompt = () => {
        const critical = findings.filter(f => f.severity === 'critical');
        const others = findings.filter(f => f.severity !== 'critical');

        let prompt = `# Fix Request for ${url}\n\n`;
        prompt += `I have run an automated audit on my website and need you to fix the following issues.\n\n`;

        if (critical.length > 0) {
            prompt += `## 🚨 Critical Issues (Priority 1)\n`;
            prompt += critical.map(f => `- [ ] **${f.title}**: ${f.description}`).join('\n');
            prompt += `\n\n`;
        }

        if (others.length > 0) {
            prompt += `## 🛠️ Improvements (Priority 2)\n`;
            prompt += others.map(f => `- [ ] **${f.title}**: ${f.description}`).join('\n');
            prompt += `\n\n`;
        }

        prompt += `## Instructions\n`;
        prompt += `1. Analyze the codebase to find the source of these issues.\n`;
        prompt += `2. Fix the critical security/performance issues first.\n`;
        prompt += `3. Apply standard best practices for the remaining items.\n`;
        prompt += `4. Explain your changes file-by-file.\n`;

        return prompt;
    };

    const promptText = generatePrompt();

    const handleCopy = async () => {
        await navigator.clipboard.writeText(promptText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-0 shadow-lg shadow-blue-500/20">
                    <Sparkles className="mr-2 h-4 w-4" />
                    generate AI Fix Prompt
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-[#0E0E10] border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Sparkles className="h-5 w-5 text-blue-400" />
                        AI Remediation Prompt
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Copy this prompt and give it to your AI coding assistant (like Cursor or Windsurf) to fix these issues automatically.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative mt-4 group">
                    <pre className="p-4 rounded-lg bg-black/50 border border-white/10 text-sm font-mono text-slate-300 overflow-auto max-h-[400px] whitespace-pre-wrap">
                        {promptText}
                    </pre>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-2 right-2 h-8 w-8 bg-white/10 hover:bg-white/20 text-white transition-opacity opacity-0 group-hover:opacity-100"
                        onClick={handleCopy}
                    >
                        {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                    </Button>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="ghost" onClick={() => setIsOpen(false)} className="hover:bg-white/5 hover:text-white">
                        Close
                    </Button>
                    <Button onClick={handleCopy} className="bg-blue-600 hover:bg-blue-500 text-white">
                        {copied ? (
                            <>
                                <Check className="mr-2 h-4 w-4" />
                                Copied!
                            </>
                        ) : (
                            <>
                                <Copy className="mr-2 h-4 w-4" />
                                Copy Prompt
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
