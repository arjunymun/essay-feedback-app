"use client";

import { useEffect, useRef, useState } from "react";
import type * as Three from "three";

type OrbitNode = {
  label: string;
  color: number;
  radius: number;
  angle: number;
  y: number;
};

const orbitNodes: OrbitNode[] = [
  { label: "Claims", color: 0x1a73e8, radius: 2.45, angle: 0.1, y: 0.2 },
  { label: "Evidence", color: 0x22b58f, radius: 2.05, angle: 1.3, y: -0.45 },
  { label: "Citations", color: 0xffbf69, radius: 2.75, angle: 2.45, y: 0.42 },
  { label: "Trace", color: 0x7c8cff, radius: 2.15, angle: 3.72, y: -0.15 },
  { label: "Critic", color: 0xff7d7d, radius: 2.55, angle: 5.0, y: 0.3 },
];

export function TrustOrbitScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [useFallbackScene, setUseFallbackScene] = useState(false);

  useEffect(() => {
    let cleanup = () => undefined;
    let cancelled = false;

    async function initScene() {
      const THREE = await import("three");
      if (cancelled || !mountRef.current) {
        return;
      }

      const mount = mountRef.current;
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const probeCanvas = document.createElement("canvas");
      const hasWebGL = Boolean(
        probeCanvas.getContext("webgl2") ?? probeCanvas.getContext("webgl"),
      );
      if (!hasWebGL) {
        setUseFallbackScene(true);
        return;
      }
      setUseFallbackScene(false);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
      camera.position.set(0, 0.35, 7.4);

      let renderer: Three.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          preserveDrawingBuffer: true,
        });
      } catch {
        setUseFallbackScene(true);
        return;
      }
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
      mount.appendChild(renderer.domElement);
      renderer.domElement.setAttribute("aria-hidden", "true");
      renderer.domElement.dataset.testid = "trust-orbit-canvas";

      const group = new THREE.Group();
      scene.add(group);

      const ambient = new THREE.AmbientLight(0xffffff, 1.7);
      scene.add(ambient);
      const key = new THREE.DirectionalLight(0xffffff, 2.1);
      key.position.set(2.5, 3.4, 4);
      scene.add(key);

      const core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.78, 3),
        new THREE.MeshStandardMaterial({
          color: 0x142034,
          roughness: 0.24,
          metalness: 0.2,
          emissive: 0x123d7a,
          emissiveIntensity: 0.12,
        }),
      );
      group.add(core);

      const coreHalo = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.08, 2),
        new THREE.MeshBasicMaterial({
          color: 0x1a73e8,
          transparent: true,
          opacity: 0.14,
          wireframe: true,
        }),
      );
      group.add(coreHalo);

      const pulseRings = [0x1a73e8, 0x22b58f, 0xffbf69].map((color, index) => {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.98 + index * 0.28, 0.011, 12, 120),
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.18,
          }),
        );
        ring.rotation.x = Math.PI / 2.55;
        ring.rotation.z = index * 0.7;
        group.add(ring);
        return ring;
      });

      const orbitMaterial = new THREE.LineBasicMaterial({
        color: 0x9fc5ef,
        transparent: true,
        opacity: 0.36,
      });
      const orbitLines: Three.Line[] = [];
      [1.75, 2.25, 2.75].forEach((radius, index) => {
        const curve = new THREE.EllipseCurve(0, 0, radius, radius * (0.46 + index * 0.04));
        const points = curve
          .getPoints(110)
          .map((point: Three.Vector2) => new THREE.Vector3(point.x, point.y, 0));
        const orbit = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), orbitMaterial);
        orbit.rotation.x = Math.PI / 2.55;
        orbit.rotation.z = index * 0.68;
        group.add(orbit);
        orbitLines.push(orbit);
      });

      const nodeMeshes = orbitNodes.map((node) => {
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.16, 32, 32),
          new THREE.MeshStandardMaterial({
            color: node.color,
            roughness: 0.18,
            metalness: 0.12,
            emissive: node.color,
            emissiveIntensity: 0.18,
          }),
        );
        mesh.userData = { ...node };
        group.add(mesh);
        return mesh;
      });

      const dataPackets = orbitNodes.map((node) => {
        const packet = new THREE.Mesh(
          new THREE.SphereGeometry(0.055, 18, 18),
          new THREE.MeshBasicMaterial({
            color: node.color,
            transparent: true,
            opacity: 0.88,
          }),
        );
        packet.userData = { ...node };
        group.add(packet);
        return packet;
      });

      const particleGeometry = new THREE.BufferGeometry();
      const particleCount = 120;
      const particlePositions = new Float32Array(particleCount * 3);
      for (let index = 0; index < particleCount; index += 1) {
        const angle = index * 2.399963;
        const radius = 2.4 + ((index * 37) % 100) * 0.021;
        particlePositions[index * 3] = Math.cos(angle) * radius;
        particlePositions[index * 3 + 1] = (((index * 17) % 100) / 100 - 0.5) * 3.2;
        particlePositions[index * 3 + 2] = Math.sin(angle * 0.74) * 1.45 - 0.15;
      }
      particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
      const particleMaterial = new THREE.PointsMaterial({
        color: 0x7fb7ee,
        size: 0.028,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
      });
      const particleField = new THREE.Points(particleGeometry, particleMaterial);
      group.add(particleField);

      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x1a73e8,
        transparent: true,
        opacity: 0.24,
      });
      const lineGeometry = new THREE.BufferGeometry();
      const linePositions = new Float32Array(nodeMeshes.length * 2 * 3);
      lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
      const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
      group.add(lines);

      const pointer = { x: 0, y: 0 };
      const handlePointer = (event: PointerEvent) => {
        const rect = mount.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 0.45;
        pointer.y = ((event.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 0.28;
      };
      mount.addEventListener("pointermove", handlePointer, { passive: true });

      const resize = () => {
        const width = Math.max(320, mount.clientWidth);
        const height = Math.max(360, mount.clientHeight);
        const isNarrow = width < 520;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.position.z = isNarrow ? 8.9 : 7.4;
        group.scale.setScalar(isNarrow ? 0.82 : 1);
        camera.updateProjectionMatrix();
      };
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(mount);
      resize();

      let frame = 0;
      const positionNodes = (time: number) => {
        nodeMeshes.forEach((mesh, index) => {
          const node = mesh.userData as OrbitNode;
          const phase = node.angle + time * (0.18 + index * 0.025);
          mesh.position.set(
            Math.cos(phase) * node.radius,
            node.y + Math.sin(phase * 1.2) * 0.26,
            Math.sin(phase) * node.radius * 0.45,
          );
          const scale = 0.88 + (mesh.position.z + 1.35) * 0.08;
          mesh.scale.setScalar(Math.max(0.78, scale));

          const offset = index * 6;
          linePositions[offset] = 0;
          linePositions[offset + 1] = 0;
          linePositions[offset + 2] = 0;
          linePositions[offset + 3] = mesh.position.x;
          linePositions[offset + 4] = mesh.position.y;
          linePositions[offset + 5] = mesh.position.z;

          const packet = dataPackets[index];
          const packetPhase = phase + time * 0.58 + index * 0.42;
          packet.position.set(
            Math.cos(packetPhase) * node.radius * 0.62,
            node.y * 0.5 + Math.sin(packetPhase * 1.35) * 0.16,
            Math.sin(packetPhase) * node.radius * 0.32,
          );
          packet.scale.setScalar(0.75 + Math.sin(time * 2.8 + index) * 0.22);
        });
        lineGeometry.attributes.position.needsUpdate = true;
      };

      const render = () => {
        const time = reducedMotion ? 1.8 : frame * 0.016;
        group.rotation.y += reducedMotion ? 0 : 0.0025;
        group.rotation.x += ((pointer.y * -1) - group.rotation.x) * 0.035;
        group.rotation.z += (pointer.x - group.rotation.z) * 0.025;
        core.rotation.x += reducedMotion ? 0 : 0.006;
        core.rotation.y += reducedMotion ? 0 : 0.008;
        coreHalo.rotation.x -= reducedMotion ? 0 : 0.002;
        coreHalo.rotation.y += reducedMotion ? 0 : 0.0035;
        particleField.rotation.y -= reducedMotion ? 0 : 0.0009;
        particleField.rotation.z += reducedMotion ? 0 : 0.00045;
        orbitLines.forEach((orbit, index) => {
          orbit.rotation.z += reducedMotion ? 0 : 0.0009 + index * 0.00035;
        });
        pulseRings.forEach((ring, index) => {
          const pulse = (Math.sin(time * 1.65 + index * 1.25) + 1) / 2;
          ring.scale.setScalar(1 + pulse * 0.16);
          const material = ring.material as Three.MeshBasicMaterial;
          material.opacity = 0.09 + pulse * 0.18;
        });
        positionNodes(time);
        renderer.render(scene, camera);
        frame += 1;
        if (!reducedMotion) {
          animationFrame = window.requestAnimationFrame(render);
        }
      };

      let animationFrame = window.requestAnimationFrame(render);

      cleanup = () => {
        window.cancelAnimationFrame(animationFrame);
        resizeObserver.disconnect();
        mount.removeEventListener("pointermove", handlePointer);
        renderer.dispose();
        core.geometry.dispose();
        (core.material as Three.Material).dispose();
        coreHalo.geometry.dispose();
        (coreHalo.material as Three.Material).dispose();
        pulseRings.forEach((ring) => {
          ring.geometry.dispose();
          (ring.material as Three.Material).dispose();
        });
        orbitLines.forEach((orbit) => {
          orbit.geometry.dispose();
        });
        nodeMeshes.forEach((mesh) => {
          mesh.geometry.dispose();
          (mesh.material as Three.Material).dispose();
        });
        dataPackets.forEach((packet) => {
          packet.geometry.dispose();
          (packet.material as Three.Material).dispose();
        });
        particleGeometry.dispose();
        particleMaterial.dispose();
        lineGeometry.dispose();
        lineMaterial.dispose();
        orbitMaterial.dispose();
        renderer.domElement.remove();
      };
    }

    initScene();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return (
    <section className="marketing-3d-section" aria-labelledby="trust-map-title">
      <div className="marketing-3d-copy">
        <p className="marketing-status-kicker">Interactive provenance map</p>
        <h2 id="trust-map-title">See the review pipeline as connected evidence.</h2>
        <p>
          Claims, citations, evidence, traces, and critic checks orbit the same
          review core. It is a visual shorthand for the product architecture:
          every conclusion should be inspectable.
        </p>
      </div>
      <div className="marketing-3d-stage" ref={mountRef}>
        {useFallbackScene ? (
          <div className="marketing-3d-fallback" aria-hidden="true">
            <span className="marketing-3d-fallback-ring marketing-3d-fallback-ring-one" />
            <span className="marketing-3d-fallback-ring marketing-3d-fallback-ring-two" />
            <span className="marketing-3d-fallback-ring marketing-3d-fallback-ring-three" />
            <span className="marketing-3d-fallback-core">Critic</span>
            <span className="marketing-3d-fallback-node marketing-3d-fallback-node-one" />
            <span className="marketing-3d-fallback-node marketing-3d-fallback-node-two" />
            <span className="marketing-3d-fallback-node marketing-3d-fallback-node-three" />
            <span className="marketing-3d-fallback-node marketing-3d-fallback-node-four" />
          </div>
        ) : null}
        <div className="marketing-3d-label marketing-3d-label-claims">Claims</div>
        <div className="marketing-3d-label marketing-3d-label-evidence">Evidence</div>
        <div className="marketing-3d-label marketing-3d-label-citations">Citations</div>
        <div className="marketing-3d-label marketing-3d-label-trace">Trace</div>
        <div className="marketing-3d-label marketing-3d-label-critic">Critic</div>
      </div>
    </section>
  );
}
