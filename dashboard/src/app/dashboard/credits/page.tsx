'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';

const pricingPackages = [
    {
        id: 1,
        name: 'Single Scan',
        credits: 1,
        price: '29',
        description: 'Perfect for a one-off check',
        features: ['Full report', 'All 6 scanners', 'PDF export'],
        highlighted: false,
    },
    {
        id: 3,
        name: 'Triple Pack',
        credits: 3,
        price: '49',
        description: 'Great for iterations',
        features: ['3 Full reports', 'Save $38', 'All scanners included'],
        highlighted: true,
        badge: 'Best Value',
    },
    {
        id: 5,
        name: 'Agency Pack',
        credits: 5,
        price: '79',
        description: 'For multiple projects',
        features: ['5 Full reports', 'Save $66', 'Priority support'],
        highlighted: false,
    },
];

export default function CreditsPage() {
    const [loading, setLoading] = useState<number | null>(null);
    const router = useRouter();

    const handlePurchase = async (pkgId: number) => {
        setLoading(pkgId);
        try {
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ package: pkgId, currency: 'usd' }),
            });

            if (!res.ok) throw new Error('Checkout failed');

            const { url } = await res.json();
            if (url) window.location.href = url;
        } catch (error) {
            console.error('Purchase error:', error);
            alert('Something went wrong. Please try again.');
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex flex-col items-center text-center mb-12">
                <Badge variant="secondary" className="mb-4 bg-purple-500/10 border-purple-500/20 text-purple-300">
                    Add Credits
                </Badge>
                <h1 className="text-3xl sm:text-4xl font-heading font-medium mb-4 tracking-tight">
                    Simple, <span className="gradient-text">Pay-as-you-go</span> Pricing
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl">
                    Purchase credits to scan your projects. Credits never expire.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {pricingPackages.map((pkg) => (
                    <Card
                        key={pkg.id}
                        className={`relative glass-card hover-lift transition-all duration-300 flex flex-col ${pkg.highlighted
                            ? 'border-[#749CFF]/50 glow-animated scale-105 z-10'
                            : 'border-white/5 hover:border-white/10'
                            }`}
                    >
                        {pkg.highlighted && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                                <Badge className="bg-gradient-to-r from-[#749CFF] to-[#A5B4FC] text-white border-0 px-4 py-1">
                                    {pkg.badge}
                                </Badge>
                            </div>
                        )}
                        <CardHeader className="pb-4 text-center">
                            <CardTitle className="text-xl font-medium">{pkg.name}</CardTitle>
                            <CardDescription className="text-muted-foreground">{pkg.description}</CardDescription>
                            <div className="mt-6">
                                <span className="text-5xl font-heading font-bold gradient-text">${pkg.price}</span>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col">
                            <ul className="space-y-4 mb-8 flex-1 px-4">
                                {pkg.features.map((feature) => (
                                    <li key={feature} className="flex items-center gap-3">
                                        <div className="rounded-full bg-green-500/10 p-1">
                                            <CheckCircle className="h-4 w-4 text-green-400" />
                                        </div>
                                        <span className="text-sm text-muted-foreground">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <Button
                                size="lg"
                                className={`w-full ${pkg.highlighted
                                    ? 'shimmer-button bg-gradient-to-r from-[#749CFF] to-[#A5B4FC] hover:from-[#749CFF] hover:to-[#A5B4FC] border-0 text-white'
                                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                                    }`}
                                variant={pkg.highlighted ? 'default' : 'outline'}
                                onClick={() => handlePurchase(pkg.id)}
                                disabled={loading !== null}
                            >
                                {loading === pkg.id ? (
                                    <span className="flex items-center gap-2">
                                        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        Processing...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        Get {pkg.credits} Credit{pkg.credits > 1 ? 's' : ''}
                                        <Zap className="h-4 w-4" />
                                    </span>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="mt-16 text-center">
                <p className="text-sm text-muted-foreground">
                    Secure payment via Stripe. All major credit cards accepted.
                </p>
            </div>
        </div>
    );
}
