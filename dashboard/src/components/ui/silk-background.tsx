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

        const fragmentShader = `
            uniform float u_time;
            uniform vec2 u_resolution;

            void main() {
                vec2 uv = gl_FragCoord.xy / u_resolution.xy;

                // 1. Horizontal / Slight Angle
                float angle = -0.1;
                float s = sin(angle);
                float c = cos(angle);

                vec2 centered = uv - 0.5;
                vec2 p = vec2(centered.x * c - centered.y * s, centered.x * s + centered.y * c);
                p += 0.5;

                // 2. Horizontal Linear Waves (Cylinders)
                float t = u_time * 0.15;
                float wave = sin(p.y * 6.0 + t);

                // Secondary layer for detail
                wave += sin(p.y * 15.0 + t * 1.5) * 0.2;

                // Third layer for "machined" texture
                wave += sin(p.y * 25.0 - t * 0.5) * 0.05;

                // 3. Sharpness / Specular
                float intensity = wave * 0.4 + 0.5;
                intensity = smoothstep(0.0, 1.0, intensity);

                // 4. Colors
                vec3 dark = vec3(0.01, 0.01, 0.05);
                vec3 mid = vec3(0.02, 0.2, 0.6);
                vec3 light = vec3(0.4, 0.8, 1.0);
                vec3 white = vec3(0.9, 0.95, 1.0);

                vec3 col = mix(dark, mid, smoothstep(0.1, 0.45, intensity));
                col = mix(col, light, smoothstep(0.45, 0.85, intensity));

                // Subtle glint along the band
                float shine = intensity + sin(p.x * 2.0 + t) * 0.05;
                col = mix(col, white, smoothstep(0.9, 1.1, shine));

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
                gl_Position = vec4( position, 1.0 );
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
            if (containerRef.current && containerRef.current.contains(renderer.domElement)) {
                containerRef.current.removeChild(renderer.domElement);
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
