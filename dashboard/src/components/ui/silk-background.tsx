'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function SilkBackground() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // 1. Setup Scene
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const renderer = new THREE.WebGLRenderer({ alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // optimize performance
        containerRef.current.appendChild(renderer.domElement);

        // 2. The Geometry (A flat plane filling the screen)
        const geometry = new THREE.PlaneGeometry(2, 2);

        // 3. The "Prism" Shader
        const fragmentShader = `
            uniform float u_time;
            uniform vec2 u_resolution;

            void main() {
                vec2 uv = gl_FragCoord.xy / u_resolution.xy;

                // 1. Diagonal Movement & Rotation
                // Rotate ~45 degrees to get diagonal folds
                float angle = 0.785; 
                float c = cos(angle);
                float s = sin(angle);
                mat2 rot = mat2(c, -s, s, c);
                
                // Scale upuv to get more "folds" across the screen
                vec2 p = rot * uv * 3.0; 

                // Animate the phase
                float t = u_time * 0.3;
                p += vec2(t, t * 0.5);

                // 2. Sine Wave Interference (The "Folds")
                // Layering pure sine waves to create ridges
                float wave = sin(p.x * 2.5);
                wave += sin(p.y * 1.5 + wave * 0.8); // Domain warping for silkiness
                wave += sin((p.x + p.y) * 1.0 + t * 0.5);

                // Normalize roughly to [0, 1] for mixing
                // The raw wave sum is roughly [-3, 3], so map it
                float intensity = wave * 0.5 + 0.5;

                // Sharpen the peaks for high contrast
                intensity = pow(intensity, 3.0); 

                // 3. High Contrast Color Mixing
                vec3 dark = vec3(0.01, 0.02, 0.12);   // Deep Navy / Black
                vec3 mid = vec3(0.05, 0.3, 0.8);      // Vivid Blue
                vec3 light = vec3(0.2, 0.7, 1.0);     // Bright Cyan
                vec3 highlight = vec3(1.0, 1.0, 1.0); // Pure White

                vec3 col = mix(dark, mid, smoothstep(0.1, 0.4, intensity));
                col = mix(col, light, smoothstep(0.4, 0.7, intensity));
                col = mix(col, highlight, smoothstep(0.8, 1.2, intensity));

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

        // 4. Animation Loop
        const clock = new THREE.Clock();
        let animationId: number;

        function animate() {
            animationId = requestAnimationFrame(animate);
            uniforms.u_time.value = clock.getElapsedTime();
            renderer.render(scene, camera);
        }

        animate();

        // 5. Handle Resize
        function handleResize() {
            const width = window.innerWidth;
            const height = window.innerHeight;
            renderer.setSize(width, height);
            uniforms.u_resolution.value.set(width, height);
        }

        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationId);
            if (containerRef.current && containerRef.current.contains(renderer.domElement)) {
                containerRef.current.removeChild(renderer.domElement);
            }
            renderer.dispose();
            geometry.dispose();
            material.dispose();
        };
    }, []);

    return <div ref={containerRef} className="fixed inset-0 z-0 pointer-events-none" />;
}
