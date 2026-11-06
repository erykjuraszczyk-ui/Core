import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function HologramScene({ mood = "neutral" }: { mood?: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    } catch {
      host.dataset.renderState = "unsupported";
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
    camera.position.set(0, 0, 8);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const system = new THREE.Group();
    scene.add(system);
    scene.add(new THREE.AmbientLight(0x78cfff, 1.15));
    const keyLight = new THREE.PointLight(0x44ddff, 26, 18);
    keyLight.position.set(2.5, 2.4, 4);
    scene.add(keyLight);
    const violetLight = new THREE.PointLight(0x7c55ff, 18, 16);
    violetLight.position.set(-3, -1.5, -2);
    scene.add(violetLight);

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.84, 4),
      new THREE.MeshPhysicalMaterial({
        color: 0x5deaff, emissive: 0x0878a8, emissiveIntensity: 1.5,
        metalness: 0.18, roughness: 0.22, transparent: true, opacity: 0.9,
        clearcoat: 1, clearcoatRoughness: 0.12,
      }),
    );
    system.add(core);

    const innerWire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.03, 2),
      new THREE.MeshBasicMaterial({ color: 0x9bf5ff, wireframe: true, transparent: true, opacity: 0.38 }),
    );
    system.add(innerWire);

    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(1.34, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0x237dff, transparent: true, opacity: 0.055, side: THREE.BackSide }),
    );
    system.add(halo);

    const ringMaterials = [
      new THREE.MeshBasicMaterial({ color: 0x43e6ff, transparent: true, opacity: 0.82 }),
      new THREE.MeshBasicMaterial({ color: 0x8e78ff, transparent: true, opacity: 0.7 }),
      new THREE.MeshBasicMaterial({ color: 0x78baff, transparent: true, opacity: 0.52 }),
    ];
    const rings: THREE.Mesh[] = [];
    const configs = [
      { radius: 1.68, tube: 0.012, rx: 1.06, ry: 0.16, rz: 0.2 },
      { radius: 1.92, tube: 0.009, rx: 0.34, ry: 1.04, rz: -0.52 },
      { radius: 2.18, tube: 0.008, rx: 1.48, ry: 0.23, rz: 0.72 },
    ];
    configs.forEach((config, index) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(config.radius, config.tube, 8, 180), ringMaterials[index]);
      ring.rotation.set(config.rx, config.ry, config.rz);
      ring.userData.rotationSpeed = (index % 2 === 0 ? 1 : -1) * (0.0009 + index * 0.00035);
      rings.push(ring);
      system.add(ring);
    });

    const particleCount = 620;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i += 1) {
      const radius = 2.4 + Math.random() * 1.15;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({ color: 0x76dfff, size: 0.018, transparent: true, opacity: 0.68, sizeAttenuation: true }),
    );
    system.add(particles);

    const base = new THREE.Mesh(
      new THREE.TorusGeometry(1.12, 0.018, 8, 120),
      new THREE.MeshBasicMaterial({ color: 0x38caff, transparent: true, opacity: 0.42 }),
    );
    base.rotation.x = Math.PI / 2;
    base.position.y = -2.05;
    base.scale.set(1.3, 0.45, 1);
    system.add(base);

    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      camera.aspect = width / height;
      camera.position.z = width < 500 ? 9.2 : 8;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const animate = () => {
      frame = window.requestAnimationFrame(animate);
      if (!reducedMotion) {
        system.rotation.y += 0.0018;
        system.rotation.x = Math.sin(performance.now() * 0.00022) * 0.055;
        core.rotation.y += 0.002;
        core.rotation.x += 0.0011;
        innerWire.rotation.y -= 0.0011;
        rings.forEach((ring) => { ring.rotation.z += ring.userData.rotationSpeed as number; });
        particles.rotation.y -= 0.00028;
      }
      renderer.render(scene, camera);
    };
    host.dataset.renderState = "ready";
    animate();

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
          else material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div ref={hostRef} className={`hologram-canvas mood-${mood}`} role="img" aria-label="Animowany hologram CORTANY z turkusowym rdzeniem i pierścieniami.">
      <div className="render-fallback"><span className="fallback-orb" /><span>HOLOGRAM 3D WYMAGA WEBGL</span></div>
    </div>
  );
}
