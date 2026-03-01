import * as React from 'react';

export interface SimpleIconProps extends React.SVGProps<SVGSVGElement> {
    path: string;
    color?: string;
}

export function SimpleIcon({ path, color, className, ...props }: SimpleIconProps) {
    return (
        <svg
            role="img"
            viewBox="0 0 24 24"
            fill={color || "currentColor"}
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <path d={path} />
        </svg>
    );
}
