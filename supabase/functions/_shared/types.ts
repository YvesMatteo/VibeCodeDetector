/**
 * Shared types for VibeCode scanner edge functions.
 *
 * These types define the common structures used across all 30 scanner
 * edge functions. Scanners can import from this file instead of
 * redeclaring the same interfaces locally.
 *
 * Compatible with the Deno runtime (no Node.js imports).
 */

// ---------------------------------------------------------------------------
// Severity levels
// ---------------------------------------------------------------------------

/**
 * Severity levels used across all scanner findings.
 * - critical: Immediate exploitation risk, data breach likely
 * - high:     Serious vulnerability, should be fixed urgently
 * - medium:   Moderate risk, should be addressed
 * - low:      Minor issue or best-practice recommendation
 * - info:     Informational finding, no action required
 */
export type Severity = "critical" | "high" | "medium" | "low" | "info";

// ---------------------------------------------------------------------------
// Finding
// ---------------------------------------------------------------------------

/**
 * A single finding produced by a scanner.
 *
 * Every scanner uses this structure (or a superset of it) to report
 * individual issues discovered during a scan.
 *
 * Required fields: id, severity, title
 * Optional fields: description, recommendation, evidence, value, location, category
 *
 * Note on evidence vs value:
 *   Most scanners use `evidence` for supporting data (e.g. the HTTP header
 *   value that triggered the finding). A few older scanners (security-headers,
 *   ssl, dns) use `value` instead. Both are included here for compatibility.
 */
export interface Finding {
    /** Unique identifier for this finding type (e.g. "cors-wildcard", "missing-hsts") */
    id: string;

    /** Severity level of the finding */
    severity: Severity;

    /** Short human-readable title */
    title: string;

    /** Detailed description of the issue */
    description?: string;

    /** Actionable recommendation for fixing the issue */
    recommendation?: string;

    /**
     * Supporting evidence or context (used by most scanners).
     * For example, the offending HTTP header value or the matched payload.
     */
    evidence?: string;

    /**
     * Supporting value (used by security-headers, ssl, dns scanners).
     * Serves the same purpose as `evidence` -- included for backward compatibility.
     */
    value?: string;

    /**
     * Source location where the finding was detected (used by api-key-scanner).
     * For example, a URL or file path where an exposed key was found.
     */
    location?: string;

    /**
     * Finding category (used by api-key-scanner).
     * Groups findings into broad categories for display.
     */
    category?: string;
}

// ---------------------------------------------------------------------------
// Scanner Response
// ---------------------------------------------------------------------------

/**
 * The base response shape returned by every scanner edge function.
 *
 * Successful scans return scannerType, score, findings, scannedAt, and url.
 * Failed scans additionally include an error string.
 * Skipped scans (conditional scanners missing required config) set skipped,
 * reason, and missingConfig instead of running the actual scan.
 *
 * Individual scanners may extend this with scanner-specific fields like
 * `headers`, `checksRun`, `sourcesScanned`, `monitoringTools`, etc.
 * Those fields belong to the scanner's own extended interface, not here.
 */
export interface ScannerResponse {
    /** Identifies which scanner produced the result (e.g. "security", "cors", "xss") */
    scannerType: string;

    /** Numeric score from 0 (worst) to 100 (best) */
    score: number;

    /** Array of individual findings from the scan */
    findings: Finding[];

    /** ISO 8601 timestamp of when the scan completed */
    scannedAt: string;

    /** The target URL that was scanned */
    url: string;

    /** Error message if the scan failed */
    error?: string;

    /** Arbitrary scanner-specific metadata (e.g. extra context for the dashboard) */
    metadata?: Record<string, unknown>;

    // -- Fields used for conditionally skipped scanners (set by the scan route) --

    /** True if the scanner was skipped because required config is missing */
    skipped?: boolean;

    /** Human-readable reason why the scanner was skipped */
    reason?: string;

    /** The specific config field that was missing (e.g. "githubRepo", "backendType") */
    missingConfig?: string;
}

// ---------------------------------------------------------------------------
// Skipped Scanner Response
// ---------------------------------------------------------------------------

/**
 * The shape used when a scanner is conditionally skipped by the scan route.
 * These are never produced by the edge functions themselves -- the Next.js
 * scan route creates them when required project config is missing.
 */
export interface SkippedScannerResponse {
    skipped: true;
    reason: string;
    missingConfig: string;
}

// ---------------------------------------------------------------------------
// Error Scanner Response
// ---------------------------------------------------------------------------

/**
 * The shape returned by scanner edge functions when an unrecoverable error
 * occurs (network failure, unexpected exception, etc.).
 */
export interface ErrorScannerResponse {
    scannerType: string;
    score: 0;
    error: string;
    findings: [];
    metadata?: Record<string, unknown>;
}
