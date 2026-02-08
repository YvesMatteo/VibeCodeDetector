"use client";

import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

export function CountUp({
    to,
    from = 0,
    direction = "up",
    delay = 0,
    onStart,
    onEnd,
    className,
}: {
    to: number;
    from?: number;
    direction?: "up" | "down";
    delay?: number;
    onStart?: () => void;
    onEnd?: () => void;
    className?: string; // Add className prop
}) {
    const ref = useRef<HTMLSpanElement>(null);
    const motionValue = useMotionValue(direction === "down" ? to : from);

    const damping = 20 + 40 * (1 / 1.1); // Reduced from 18 + 20 due to spring behavior change
    const stiffness = 100 * (1 / 1.1); // Reduced from 120 due to spring behavior change

    const springValue = useSpring(motionValue, {
        damping,
        stiffness,
    });

    const isInView = useInView(ref, { once: true, margin: "0px" });

    useEffect(() => {
        if (ref.current) {
            ref.current.textContent = String(direction === "down" ? to : from);
        }
    }, [from, to, direction]);

    useEffect(() => {
        if (isInView) {
            setTimeout(() => {
                motionValue.set(direction === "down" ? from : to);
            }, delay * 1000);
        }
    }, [isInView, delay, motionValue, direction, from, to]);

    useEffect(() => {
        const unsub = springValue.on("change", (latest) => {
            if (ref.current) {
                const options = {
                    useGrouping: false,
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                };

                const formattedNumber = Intl.NumberFormat("en-US", options).format(
                    latest
                );

                ref.current.textContent = formattedNumber;
            }
        });

        return () => unsub(); // Use the returned unsubscribe function directly
    }, [springValue]);

    return <span className={className} ref={ref} />;
}
