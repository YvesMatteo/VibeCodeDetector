import React from "react";

export const Emoji: React.FC<{
    symbol: string;
    label: string;
    size?: number;
}> = ({ symbol, label, size }) => {
    return (
        <span
            role="img"
            aria-label={label}
            style={{
                fontSize: size ? `${size}px` : "inherit",
                lineHeight: 1,
                display: "inline-block",
            }}
        >
            {symbol}
        </span>
    );
};
