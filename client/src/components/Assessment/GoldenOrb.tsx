import { useEffect, useRef } from 'react'
import * as THREE from 'three'

type OrbState = 'idle' | 'listening' | 'processing' | 'settled'

interface Props {
  state: OrbState
}

export function GoldenOrb({ state }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef<OrbState>(state)

  // Keep stateRef in sync with prop without restarting Three.js
  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const W = 220, H = 220
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
    camera.position.z = 12

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)

    // Geometry
    const geometry = new THREE.IcosahedronGeometry(4, 3)
    const originalPositions = new Float32Array(geometry.attributes.position.array)

    // Main sphere
    const material = new THREE.MeshStandardMaterial({
      color: '#064E3B',
      metalness: 0.9,
      roughness: 0.12,
      emissive: '#8B2500',
      emissiveIntensity: 0.2,
    })
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    // Wireframe overlay
    const wireMat = new THREE.MeshBasicMaterial({ color: '#FFB09A', wireframe: true, transparent: true, opacity: 0.3 })
    scene.add(new THREE.Mesh(geometry, wireMat))

    // Outer glow
    const glowGeo = new THREE.SphereGeometry(4.8, 32, 32)
    const glowMat = new THREE.MeshBasicMaterial({ color: '#064E3B', transparent: true, opacity: 0.08, side: THREE.BackSide })
    const glowMesh = new THREE.Mesh(glowGeo, glowMat)
    scene.add(glowMesh)

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.5))
    const keyLight = new THREE.DirectionalLight(0xff6b35, 1.5)
    keyLight.position.set(5, 5, 5)
    scene.add(keyLight)
    const frontLight = new THREE.PointLight(0xff6b35, 2.5, 20)
    frontLight.position.set(0, 0, 6)
    scene.add(frontLight)

    const clock = new THREE.Clock()
    let animId: number

    const animate = () => {
      animId = requestAnimationFrame(animate)
      const elapsed = clock.getElapsedTime()
      const s = stateRef.current
      const pos = geometry.attributes.position

      // Rotation speeds
      const rotY = s === 'processing' ? 0.012 : s === 'listening' ? 0.006 : 0.003
      const rotX = s === 'processing' ? 0.004 : 0
      mesh.rotation.y += rotY
      mesh.rotation.x += rotX

      // Glow + emissive intensity
      const targetGlow = s === 'processing' ? 0.18 : s === 'listening' ? 0.12 : s === 'settled' ? 0.08 : 0.06
      const targetEmissive = s === 'processing' ? 0.6 : s === 'listening' ? 0.4 : s === 'settled' ? 0.25 : 0.2
      glowMat.opacity += (targetGlow - glowMat.opacity) * 0.05
      material.emissiveIntensity += (targetEmissive - material.emissiveIntensity) * 0.05

      // Vertex animation
      if (s === 'listening') {
        for (let i = 0; i < pos.count; i++) {
          const scale = 1 + Math.sin(elapsed * 4 + i * 0.1) * 0.03
          pos.setXYZ(i, originalPositions[i*3] * scale, originalPositions[i*3+1] * scale, originalPositions[i*3+2] * scale)
        }
        pos.needsUpdate = true
      } else if (s === 'processing') {
        for (let i = 0; i < pos.count; i++) {
          const ox = originalPositions[i*3], oy = originalPositions[i*3+1], oz = originalPositions[i*3+2]
          const wave = Math.sin(oy * 3 + elapsed * 6) * 0.2
          const len = Math.sqrt(ox*ox + oy*oy + oz*oz)
          const nx = ox/len, ny = oy/len, nz = oz/len
          pos.setXYZ(i, ox + nx*wave, oy + ny*wave, oz + nz*wave)
        }
        pos.needsUpdate = true
      } else {
        // Reset to original
        for (let i = 0; i < pos.count; i++) {
          pos.setXYZ(i, originalPositions[i*3], originalPositions[i*3+1], originalPositions[i*3+2])
        }
        pos.needsUpdate = true
      }

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
      renderer.dispose()
      geometry.dispose()
      material.dispose()
      wireMat.dispose()
      glowMat.dispose()
      glowGeo.dispose()
    }
  }, [])

  return <div ref={mountRef} style={{ width: 220, height: 220 }} />
}
