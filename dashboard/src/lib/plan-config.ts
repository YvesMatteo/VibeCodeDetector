export const PLAN_CONFIG = {
    starter: {
        name: 'Starter',
        priceMonthly: 19,
        priceAnnual: 159.60,
        priceAnnualPerMonth: 13.30,
        scans: 5,
        domains: 1,
        projects: 1,
        apiKeys: 1,
    },
    pro: {
        name: 'Pro',
        priceMonthly: 39,
        priceAnnual: 327.60,
        priceAnnualPerMonth: 27.30,
        scans: 20,
        domains: 3,
        projects: 5,
        apiKeys: 5,
    },
    max: {
        name: 'Max',
        priceMonthly: 79,
        priceAnnual: 663.60,
        priceAnnualPerMonth: 55.30,
        scans: 75,
        domains: 10,
        projects: 25,
        apiKeys: 20,
    },
} as const;

export type PlanName = keyof typeof PLAN_CONFIG;
