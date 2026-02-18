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
            
            // Scale UV to create diagonal folds
            // We rotate the coordinates slightly to get that diagonal flow
            float scale = 4.0;
            vec2 p = uv * scale;
            
            // Animate: Shift the pattern over time
            float t = u_time * 0.4;
            
            // Create complex wave patterns (The "Silk" Math)
            // We layer multiple sine waves to create the "folds"
            float height = sin(p.x * 2.0 + t);
            height += sin(p.y * 2.0 + t + height); 
            height += sin(p.x * 3.0 + p.y * 1.5 + t);

            // Colors: Deep Blue to Cyan/White
            vec3 col1 = vec3(0.01, 0.02, 0.08); // Deeper Black-Blue
            vec3 col2 = vec3(0.05, 0.2, 0.7);   // Rich Mid Blue
            vec3 col3 = vec3(0.6, 0.9, 1.0);    // Sharp Cyan Highlight

            // Mix colors based on the wave height
            vec3 color = mix(col1, col2, smoothstep(-1.5, 0.5, height)); // Stick to darks longer
            color = mix(color, col3, smoothstep(1.2, 2.5, height));      // Highlights only on peaks

            gl_FragColor = vec4(color, 1.0);
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
