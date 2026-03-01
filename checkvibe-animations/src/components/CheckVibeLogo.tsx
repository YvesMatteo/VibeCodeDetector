/**
 * CheckVibe Logo — the geometric triple-V mark
 * Based on the brand assets provided
 */
export function CheckVibeMark({ size = 40, color = "white" }: { size?: number; color?: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Outer V */}
            <path
                d="M10 20 L50 85 L90 20"
                stroke={color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
            {/* Middle V */}
            <path
                d="M22 30 L50 75 L78 30"
                stroke={color}
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
            {/* Inner V / Check */}
            <path
                d="M34 40 L50 65 L66 40"
                stroke={color}
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
        </svg>
    );
}

export function CheckVibeWordmark({ height = 32, color = "white" }: { height?: number; color?: string }) {
    const aspect = 4.5;
    const width = height * aspect;

    return (
        <div className="flex items-center gap-2">
            <CheckVibeMark size={height * 1.2} color={color} />
            <span
                style={{
                    fontSize: `${height * 0.75}px`,
                    fontWeight: 700,
                    color,
                    letterSpacing: '-0.02em',
                    fontFamily: "'Inter', -apple-system, sans-serif",
                }}
            >
                checkvibe
            </span>
        </div>
    );
}

export function CheckVibeWordmarkGradient({ height = 32 }: { height?: number }) {
    const id = `cv-gradient-${Math.random().toString(36).slice(2, 6)}`;
    return (
        <div className="flex items-center gap-2">
            <svg
                width={height * 1.2}
                height={height * 1.2}
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0a84ff" />
                        <stop offset="100%" stopColor="#30d158" />
                    </linearGradient>
                </defs>
                <path d="M10 20 L50 85 L90 20" stroke={`url(#${id})`} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M22 30 L50 75 L78 30" stroke={`url(#${id})`} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M34 40 L50 65 L66 40" stroke={`url(#${id})`} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span
                style={{
                    fontSize: `${height * 0.75}px`,
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    fontFamily: "'Inter', -apple-system, sans-serif",
                    background: 'linear-gradient(135deg, #0a84ff, #30d158)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                }}
            >
                checkvibe
            </span>
        </div>
    );
}
