'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

function isMobile(): boolean {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768 || ('ontouchstart' in window);
}

export function SilkBackground() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Respect reduced-motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const mobile = isMobile();

        // 1. Setup Scene
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: mobile ? 'low-power' : 'default' });
        renderer.setSize(window.innerWidth, window.innerHeight);
        // Lower pixel ratio on mobile for significant GPU savings
        renderer.setPixelRatio(mobile ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2));
        containerRef.current.appendChild(renderer.domElement);

        // 2. The Geometry (A flat plane filling the screen)
        const geometry = new THREE.PlaneGeometry(2, 2);

        // Mobile: simpler shader with fewer wave layers + slower drift
        const fragmentShader = mobile ? `
            uniform float u_time;
            uniform vec2 u_resolution;

            void main() {
                vec2 uv = gl_FragCoord.xy / u_resolution.xy;

                float angle = -0.785;
                float s = sin(angle);
                float c = cos(angle);

                vec2 centered = uv - 0.5;
                vec2 p = vec2(centered.x * c - centered.y * s, centered.x * s + centered.y * c);
                p += 0.5;

                float t = u_time * 0.05; // Half speed on mobile

                // Only main fold + one secondary (skip fine metallic texture)
                float wave = sin(p.x * 3.0 + t);
                wave += sin(p.x * 8.0 + t * 1.5) * 0.4;

                float intensity = wave * 0.5 + 0.5;
                intensity = smoothstep(0.0, 1.0, intensity);

                vec3 dark = vec3(0.00, 0.00, 0.02);
                vec3 mid = vec3(0.05, 0.25, 0.65);
                vec3 light = vec3(0.6, 0.85, 1.0);

                vec3 col = mix(dark, mid, smoothstep(0.2, 0.5, intensity));
                col = mix(col, light, smoothstep(0.5, 0.9, intensity));

                gl_FragColor = vec4(col, 1.0);
            }
        ` : `
            uniform float u_time;
            uniform vec2 u_resolution;

            void main() {
                vec2 uv = gl_FragCoord.xy / u_resolution.xy;

                // 1. Diagonal Orientation (Prism Style)
                float angle = -0.785; // -45 degrees
                float s = sin(angle);
                float c = cos(angle);

                vec2 centered = uv - 0.5;
                vec2 p = vec2(centered.x * c - centered.y * s, centered.x * s + centered.y * c);
                p += 0.5;

                // 2. Linear Prism Waves
                float t = u_time * 0.1; // Slow, majestic drift

                // Main large folds
                float wave = sin(p.x * 3.0 + t);

                // Secondary layer for sharp edges
                wave += sin(p.x * 8.0 + t * 1.5) * 0.4;

                // Third layer for fine metallic texture
                wave += sin(p.x * 15.0 - t * 0.5) * 0.1;

                // 3. Sharpness / Specular
                float intensity = wave * 0.5 + 0.5;
                intensity = smoothstep(0.0, 1.0, intensity);

                // 4. Colors - "Prism" Blue
                vec3 dark = vec3(0.00, 0.00, 0.02);
                vec3 mid = vec3(0.05, 0.25, 0.65);
                vec3 light = vec3(0.6, 0.85, 1.0);

                vec3 col = mix(dark, mid, smoothstep(0.2, 0.5, intensity));
                col = mix(col, light, smoothstep(0.5, 0.9, intensity));

                // Add the characteristic "shine" or "glint"
                float glint = smoothstep(0.95, 1.0, intensity);
                col += vec3(glint * 0.5);

                gl_FragColor = vec4(col, 1.0);
            }
        `;



        const uniforms = {
            u_time: { value: 0.0 },
            u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
        };

        const material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            fragmentShader: fragmentShader,
            vertexShader: `
            void main() {
        gl_Position = vec4(position, 1.0);
    }
        `
        });

        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        // 4. Animation Loop with visibility control
        const clock = new THREE.Clock();
        let animationId: number;
        let isPaused = false;

        // If prefers-reduced-motion, render once and stop
        if (prefersReducedMotion) {
            uniforms.u_time.value = 0;
            renderer.render(scene, camera);
        }

        function animate() {
            if (isPaused || prefersReducedMotion) return;
            animationId = requestAnimationFrame(animate);
            uniforms.u_time.value = clock.getElapsedTime();
            renderer.render(scene, camera);
        }

        if (!prefersReducedMotion) {
            animate();
        }

        // Pause animation when tab is hidden (saves battery on mobile)
        function handleVisibilityChange() {
            if (document.hidden) {
                isPaused = true;
                clock.stop();
            } else {
                isPaused = false;
                clock.start();
                if (!prefersReducedMotion) animate();
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // 5. Handle Resize — debounced for performance
        let resizeTimeout: ReturnType<typeof setTimeout>;
        function handleResize() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const width = window.innerWidth;
                const height = window.innerHeight;
                renderer.setSize(width, height);
                uniforms.u_resolution.value.set(width, height);
            }, 150);
        }

        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('resize', handleResize);
            clearTimeout(resizeTimeout);
            cancelAnimationFrame(animationId);
            const el = containerRef.current;
            if (el && el.contains(renderer.domElement)) {
                el.removeChild(renderer.domElement);
            }
            renderer.dispose();
            geometry.dispose();
            material.dispose();
        };
    }, []);

    return (
        <div className="fixed inset-0 z-0 pointer-events-none will-change-transform">
            <div ref={containerRef} className="absolute inset-0" />
            <div className="absolute inset-0 bg-[#0E0E10]/60" />
            <div className="absolute inset-0 bg-radial-[ellipse_at_center] from-[#0E0E10]/70 via-transparent to-transparent sm:from-transparent" />
        </div>
    );
}
