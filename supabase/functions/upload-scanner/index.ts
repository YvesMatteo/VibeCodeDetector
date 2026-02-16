import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateTargetUrl, validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Finding {
    id: string;
    severity: "critical" | "high" | "medium" | "low" | "info";
    title: string;
    description: string;
    recommendation: string;
    evidence?: string;
}

interface ScanResult {
    scannerType: string;
    score: number;
    findings: Finding[];
    scannedAt: string;
    url: string;
    uploadFormsDetected: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const USER_AGENT = "CheckVibe-UploadScanner/1.0";
const FETCH_TIMEOUT_MS = 10000;

const FILE_INPUT_REGEX = /<input[^>]*type\s*=\s*["']file["'][^>]*>/gi;
const MULTIPART_FORM_REGEX = /<form[^>]*enctype\s*=\s*["']multipart\/form-data["'][^>]*>/gi;
const UPLOAD_LIB_PATTERNS = [
    { pattern: /dropzone/gi, name: "Dropzone.js" },
    { pattern: /filepond/gi, name: "FilePond" },
    { pattern: /uppy/gi, name: "Uppy" },
    { pattern: /fine-uploader/gi, name: "Fine Uploader" },
    { pattern: /plupload/gi, name: "Plupload" },
    { pattern: /resumable\.js/gi, name: "Resumable.js" },
    { pattern: /tus-js-client/gi, name: "tus client" },
];

const UPLOAD_JS_PATTERNS = [
    /new\s+FormData/gi,
    /\.upload\s*\(/gi,
    /handleUpload/gi,
    /onFileChange/gi,
    /fileInput/gi,
    /handleFileDrop/gi,
    /onDrop.*file/gi,
    /dropHandler/gi,
];

const UPLOAD_PATHS = [
    "/upload",
    "/api/upload",
    "/api/files",
    "/files/upload",
    "/media/upload",
    "/api/media",
    "/api/images",
    "/api/attachments",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeout = FETCH_TIMEOUT_MS,
): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    return fetch(url, {
        ...options,
        signal: controller.signal,
        redirect: "follow",
        headers: {
            "User-Agent": USER_AGENT,
            ...(options.headers || {}),
        },
    }).finally(() => clearTimeout(timer));
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: getCorsHeaders(req) });
    }

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
    }

    if (!validateScannerAuth(req)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
    }

    try {
        const body = await req.json();
        const validation = validateTargetUrl(body.targetUrl);
        if (!validation.valid) {
            return new Response(JSON.stringify({ error: validation.error }), {
                status: 400,
                headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            });
        }
        const targetUrl = validation.url!;
        const baseUrl = new URL(targetUrl).origin;

        const findings: Finding[] = [];
        let score = 100;

        // =================================================================
        // 1. Fetch the page and detect upload functionality
        // =================================================================
        let response: Response;
        let html = "";
        try {
            response = await fetchWithTimeout(targetUrl);
            html = await response.text();
        } catch (e) {
            return new Response(
                JSON.stringify({
                    scannerType: "file-upload",
                    score: 0,
                    error: `Could not reach target: ${e instanceof Error ? e.message : String(e)}`,
                    findings: [],
                    uploadFormsDetected: 0,
                }),
                {
                    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
                },
            );
        }

        // Detect file inputs
        const fileInputMatches = html.match(FILE_INPUT_REGEX) || [];
        const multipartForms = html.match(MULTIPART_FORM_REGEX) || [];

        // Detect upload libraries
        const detectedLibs: string[] = [];
        for (const lib of UPLOAD_LIB_PATTERNS) {
            if (lib.pattern.test(html)) {
                detectedLibs.push(lib.name);
            }
        }

        // Detect JS upload patterns in HTML (inline scripts)
        let jsUploadIndicators = 0;
        for (const pattern of UPLOAD_JS_PATTERNS) {
            if (pattern.test(html)) jsUploadIndicators++;
        }

        // Also check linked JS bundles for upload patterns (catches SPA / React apps)
        if (jsUploadIndicators < 2 && fileInputMatches.length === 0) {
            const scriptSrcRegex = /<script[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi;
            const scriptUrls: string[] = [];
            let scriptMatch: RegExpExecArray | null;
            while ((scriptMatch = scriptSrcRegex.exec(html)) !== null && scriptUrls.length < 5) {
                let src = scriptMatch[1];
                if (src.startsWith("//")) src = "https:" + src;
                else if (src.startsWith("/")) src = baseUrl + src;
                else if (!src.startsWith("http")) src = baseUrl + "/" + src;
                scriptUrls.push(src);
            }

            const jsChunks = await Promise.all(
                scriptUrls.map(async (url) => {
                    try {
                        const res = await fetchWithTimeout(url, {}, 5000);
                        // Only read first 200KB to avoid memory issues
                        const text = await res.text();
                        return text.substring(0, 200_000);
                    } catch {
                        return "";
                    }
                }),
            );
            const bundleText = jsChunks.join("\n");

            for (const lib of UPLOAD_LIB_PATTERNS) {
                if (!detectedLibs.includes(lib.name) && lib.pattern.test(bundleText)) {
                    detectedLibs.push(lib.name);
                }
            }
            for (const pattern of UPLOAD_JS_PATTERNS) {
                if (pattern.test(bundleText)) jsUploadIndicators++;
            }
        }

        const hasUploadFunctionality =
            fileInputMatches.length > 0 ||
            multipartForms.length > 0 ||
            detectedLibs.length > 0 ||
            jsUploadIndicators >= 2;

        const uploadFormsDetected = Math.max(fileInputMatches.length, multipartForms.length) || (hasUploadFunctionality ? 1 : 0);

        // If no upload detected, return clean
        if (!hasUploadFunctionality) {
            findings.push({
                id: "upload-none-detected",
                severity: "info",
                title: "No file upload functionality detected",
                description:
                    "No file input elements, multipart forms, or upload libraries were found on this page. " +
                    "If file uploads exist on other pages, they were not covered by this scan.",
                recommendation: "No action needed for this page. Consider scanning additional pages with upload functionality.",
            });

            const result: ScanResult = {
                scannerType: "file-upload",
                score: 100,
                findings,
                scannedAt: new Date().toISOString(),
                url: targetUrl,
                uploadFormsDetected: 0,
            };

            return new Response(JSON.stringify(result), {
                headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            });
        }

        // Report what was found
        if (detectedLibs.length > 0) {
            findings.push({
                id: "upload-lib-detected",
                severity: "info",
                title: `Upload library detected: ${detectedLibs.join(", ")}`,
                description: `The page uses ${detectedLibs.join(" and ")} for file uploads. These libraries typically include client-side validation.`,
                recommendation: "Ensure server-side validation is also implemented — client-side checks alone are easily bypassed.",
                evidence: detectedLibs.join(", "),
            });
        }

        // =================================================================
        // 2. Check file type restrictions on each input
        // =================================================================
        const MAX_TYPE_DEDUCTION = 20;
        let typeDeduction = 0;

        for (let idx = 0; idx < fileInputMatches.length; idx++) {
            const inputTag = fileInputMatches[idx];
            const acceptMatch = inputTag.match(/accept\s*=\s*["']([^"']+)["']/i);

            if (acceptMatch) {
                const acceptedTypes = acceptMatch[1];
                findings.push({
                    id: `upload-type-restricted-${idx}`,
                    severity: "info",
                    title: `File input #${idx + 1} restricts types: ${acceptedTypes}`,
                    description: `This file input has an accept attribute limiting uploads to: ${acceptedTypes}. Client-side type restriction helps guide users.`,
                    recommendation: "Good practice. Always validate file types server-side as well — the accept attribute is easily bypassed.",
                    evidence: inputTag.substring(0, 200),
                });
            } else {
                const deduction = Math.min(10, MAX_TYPE_DEDUCTION - typeDeduction);
                typeDeduction += deduction;
                score -= deduction;
                findings.push({
                    id: `upload-no-type-restrict-${idx}`,
                    severity: "medium",
                    title: `File input #${idx + 1} accepts all file types`,
                    description:
                        'This file input has no "accept" attribute, allowing users to select any file type ' +
                        "including executables (.exe, .sh), web shells (.php, .jsp), and other dangerous file types.",
                    recommendation:
                        'Add an accept attribute to restrict uploads to expected types ' +
                        '(e.g., accept="image/*" for profile pictures, accept=".pdf,.doc,.docx" for documents).',
                    evidence: inputTag.substring(0, 200),
                });
            }

            // Check for multiple attribute (bulk upload)
            if (/multiple/i.test(inputTag)) {
                findings.push({
                    id: `upload-multiple-${idx}`,
                    severity: "low",
                    title: `File input #${idx + 1} allows multiple files`,
                    description:
                        "This file input accepts multiple file uploads simultaneously. Without server-side limits, " +
                        "this could be abused to upload many large files at once, exhausting server storage or bandwidth.",
                    recommendation: "Enforce server-side limits on the number and total size of files per upload request.",
                    evidence: inputTag.substring(0, 200),
                });
            }
        }

        // =================================================================
        // 3. Upload security headers
        // =================================================================
        const nosniff = response.headers.get("x-content-type-options");
        if (nosniff && nosniff.toLowerCase() === "nosniff") {
            findings.push({
                id: "upload-nosniff-present",
                severity: "info",
                title: "X-Content-Type-Options: nosniff is set",
                description:
                    "The server sets X-Content-Type-Options: nosniff, preventing browsers from MIME-type sniffing " +
                    "uploaded files. This mitigates attacks where uploaded files are misinterpreted as executable content.",
                recommendation: "Good practice. Continue sending this header on all responses.",
            });
        } else {
            score -= 8;
            findings.push({
                id: "upload-no-nosniff",
                severity: "medium",
                title: "Missing X-Content-Type-Options header",
                description:
                    "X-Content-Type-Options: nosniff is not set. Without this header, browsers may MIME-sniff " +
                    "uploaded files and execute them as scripts, enabling stored XSS via file uploads.",
                recommendation:
                    "Add the header: X-Content-Type-Options: nosniff to all responses, especially those serving uploaded content.",
            });
        }

        // CSP form-action check
        const csp = response.headers.get("content-security-policy") || "";
        if (csp.toLowerCase().includes("form-action")) {
            findings.push({
                id: "upload-csp-form-action",
                severity: "info",
                title: "CSP restricts form actions",
                description:
                    "Content-Security-Policy includes a form-action directive, restricting where forms (including uploads) can submit data. " +
                    "This prevents attackers from redirecting form submissions to malicious servers.",
                recommendation: "Good practice. Ensure the allowlist only includes trusted submission targets.",
            });
        } else if (fileInputMatches.length > 0) {
            score -= 3;
            findings.push({
                id: "upload-no-csp-form-action",
                severity: "low",
                title: "No CSP form-action restriction",
                description:
                    "Content-Security-Policy does not include a form-action directive. Without it, forms on the page " +
                    "(including file uploads) could potentially be hijacked to submit to attacker-controlled servers.",
                recommendation:
                    "Add form-action to your CSP to restrict form submission targets: form-action 'self';",
            });
        }

        // Check if any form action uses HTTP
        for (let idx = 0; idx < multipartForms.length; idx++) {
            const formTag = multipartForms[idx];
            const actionMatch = formTag.match(/action\s*=\s*["'](http:\/\/[^"']+)["']/i);
            if (actionMatch) {
                score -= 15;
                findings.push({
                    id: `upload-http-action-${idx}`,
                    severity: "high",
                    title: "File upload form submits over insecure HTTP",
                    description:
                        `A multipart form submits uploaded files to an HTTP (unencrypted) URL: ${actionMatch[1].substring(0, 100)}. ` +
                        "Files and any associated data (auth tokens, user info) are transmitted in plaintext.",
                    recommendation: "Change the form action to use HTTPS. Ensure all upload endpoints enforce TLS.",
                    evidence: actionMatch[1].substring(0, 100),
                });
            }
        }

        // =================================================================
        // 4. Upload endpoint probing
        // =================================================================
        const probePromises = UPLOAD_PATHS.map(async (path) => {
            try {
                const res = await fetchWithTimeout(`${baseUrl}${path}`, {
                    method: "OPTIONS",
                }, 5000);

                const status = res.status;
                await res.text().catch(() => {});

                if (status === 404 || status === 405) return null;

                // Endpoint exists — check for size limit indicators
                const maxLength = res.headers.get("content-length");
                const allowMethods = res.headers.get("allow") || res.headers.get("access-control-allow-methods") || "";

                return { path, status, maxLength, allowMethods };
            } catch {
                return null;
            }
        });

        const probeResults = (await Promise.all(probePromises)).filter(Boolean);

        for (const probe of probeResults) {
            if (!probe) continue;
            if (probe.allowMethods.toUpperCase().includes("POST") || probe.allowMethods.toUpperCase().includes("PUT")) {
                findings.push({
                    id: `upload-endpoint-found-${probe.path.replace(/\//g, "-")}`,
                    severity: "info",
                    title: `Upload endpoint found: ${probe.path}`,
                    description: `An upload-capable endpoint was found at ${probe.path} (accepts ${probe.allowMethods || "POST"}). ` +
                        "Ensure this endpoint validates file type, size, and content on the server side.",
                    recommendation: "Verify server-side validation: max file size, allowed MIME types, content scanning, and authenticated access.",
                    evidence: `Status: ${probe.status}, Methods: ${probe.allowMethods || "unknown"}`,
                });
            }
        }

        // Clamp score
        score = Math.max(0, Math.min(100, score));

        const result: ScanResult = {
            scannerType: "file-upload",
            score,
            findings,
            scannedAt: new Date().toISOString(),
            url: targetUrl,
            uploadFormsDetected,
        };

        return new Response(JSON.stringify(result), {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Upload Scanner error:", error);
        return new Response(
            JSON.stringify({
                scannerType: "file-upload",
                score: 0,
                error: "Scan failed. Please try again.",
                findings: [],
                uploadFormsDetected: 0,
            }),
            {
                status: 500,
                headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            },
        );
    }
});
