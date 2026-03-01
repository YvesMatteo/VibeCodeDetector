import React, { createContext, useContext } from "react";

type Theme = "dark" | "light";
type EmojiStyle = "native" | "apple";

interface ThemeContextValue {
    theme: Theme;
    emojiStyle: EmojiStyle;
}

interface Colors {
    bgDark: string;
    bgCard: string;
    bgCardHover: string;
    border: string;
    textPrimary: string;
    textSecondary: string;
    primary: string;
    primaryGlow: string;
    success: string;
    danger: string;
    warning: string;
}

const DARK_COLORS: Colors = {
    bgDark: "#0a0a0a",
    bgCard: "#1c1c1e",
    bgCardHover: "#2c2c2e",
    border: "#3a3a3c",
    textPrimary: "#f5f5f7",
    textSecondary: "#a1a1a6",
    primary: "#4a7ab5",
    primaryGlow: "rgba(74, 122, 181, 0.4)",
    success: "#30d158",
    danger: "#ff453a",
    warning: "#ff9f0a",
};

const LIGHT_COLORS: Colors = {
    bgDark: "#f5f5f7",
    bgCard: "#ffffff",
    bgCardHover: "#f0f0f2",
    border: "#d1d1d6",
    textPrimary: "#1d1d1f",
    textSecondary: "#636366",
    primary: "#2a4a7f",
    primaryGlow: "rgba(42, 74, 127, 0.3)",
    success: "#28a745",
    danger: "#dc3545",
    warning: "#e67e22",
};

const ThemeContext = createContext<ThemeContextValue>({
    theme: "dark",
    emojiStyle: "native",
});

export const ThemeProvider: React.FC<{
    theme?: Theme;
    emojiStyle?: EmojiStyle;
    children: React.ReactNode;
}> = ({ theme = "dark", emojiStyle = "native", children }) => {
    return (
        <ThemeContext.Provider value={{ theme, emojiStyle }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);

export const useColors = (): Colors => {
    const { theme } = useTheme();
    return theme === "light" ? LIGHT_COLORS : DARK_COLORS;
};

export const useEmojiStyle = (): EmojiStyle => {
    const { emojiStyle } = useTheme();
    return emojiStyle;
};
