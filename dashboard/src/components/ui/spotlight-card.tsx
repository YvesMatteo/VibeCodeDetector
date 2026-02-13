"use client";

import { useMotionTemplate, useMotionValue, motion } from "framer-motion";
import React, { MouseEvent } from "react";
import { cn } from "@/lib/utils";

export const SpotlightCard = ({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) => {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const background = useMotionTemplate`
        radial-gradient(
            650px circle at ${mouseX}px ${mouseY}px,
            rgba(255,255,255,0.1),
            transparent 80%
        )
    `;

    function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
        const { left, top } = currentTarget.getBoundingClientRect();
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
    }

    return (
        <div
            className={cn(
                "group relative border border-slate-600/20 bg-slate-900/50 overflow-hidden rounded-xl",
                className
            )}
            onMouseMove={handleMouseMove}
        >
            <motion.div
                className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition duration-300 group-hover:opacity-100"
                style={{ background }}
            />
            <div>{children}</div>
        </div>
    );
};
