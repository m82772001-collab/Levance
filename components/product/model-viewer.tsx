"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls, useGLTF } from "@react-three/drei";

function ProductModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

export function ModelViewer({ modelUrl, title = "3D product view" }: { modelUrl: string; title?: string }) {
  return (
    <div className="h-[420px] w-full overflow-hidden rounded-xl" role="img" aria-label={title}>
      <Canvas camera={{ position: [2.8, 2, 4.2], fov: 42 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 4, 2]} intensity={1.2} />
        <Suspense fallback={null}>
          <ProductModel url={modelUrl} />
          <Environment preset="studio" />
        </Suspense>
        <OrbitControls enablePan={false} minDistance={2} maxDistance={7} />
      </Canvas>
    </div>
  );
}
