export const FREE_PLAN_CONFIG = {
    name: 'Free',
    priceMonthly: 0,
    priceAnnual: 0,
    priceAnnualPerMonth: 0,
    scans: 4,
    domains: 1,
    projects: 1,
    apiKeys: 0,
    monitoringFrequency: 'weekly' as const,
    monitoringLabel: 'Weekly monitoring',
    threatDetection: false,
    threatRetentionHours: 0,
    threatAlertFrequencies: [] as readonly string[],
} as const;

export const PLAN_CONFIG = {
    starter: {
        name: 'Starter',
        priceMonthly: 19,
        priceAnnual: 159.60,
        priceAnnualPerMonth: 13.30,
        scans: 30,
        domains: 1,
        projects: 1,
        apiKeys: 1,
        monitoringFrequency: 'daily' as const,
        monitoringLabel: 'Daily monitoring',
        threatDetection: false,
        threatRetentionHours: 0,
        threatAlertFrequencies: [] as readonly string[],
    },
    pro: {
        name: 'Pro',
        priceMonthly: 39,
        priceAnnual: 327.60,
        priceAnnualPerMonth: 27.30,
        scans: 155,
        domains: 3,
        projects: 5,
        apiKeys: 5,
        monitoringFrequency: 'daily' as const,
        monitoringLabel: 'Daily monitoring',
        threatDetection: false,
        threatRetentionHours: 0,
        threatAlertFrequencies: [] as readonly string[],
    },
    /** Max is custom pricing — not self-serve. Limits here are defaults for legacy/webhook handling. */
    max: {
        name: 'Max',
        priceMonthly: 79,
        priceAnnual: 663.60,
        priceAnnualPerMonth: 55.30,
        scans: 3000,
        domains: 10,
        projects: 25,
        apiKeys: 20,
        monitoringFrequency: 'every_6h' as const,
        monitoringLabel: 'Every 6 hours',
        threatDetection: false,
        threatRetentionHours: 0,
        threatAlertFrequencies: [] as readonly string[],
    },
} as const;

export type PlanName = keyof typeof PLAN_CONFIG;

/** Map plan name to default monitoring frequency */
export const PLAN_FREQUENCY_MAP: Record<string, string> = {
    none: FREE_PLAN_CONFIG.monitoringFrequency,
    starter: PLAN_CONFIG.starter.monitoringFrequency,
    pro: PLAN_CONFIG.pro.monitoringFrequency,
    max: PLAN_CONFIG.max.monitoringFrequency,
};
