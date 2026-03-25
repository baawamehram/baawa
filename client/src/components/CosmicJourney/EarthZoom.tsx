import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface Props { onComplete: () => void }

export function EarthZoom({ onComplete }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.set(0, 0, 100)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    // Stars
    const starGeo = new THREE.BufferGeometry()
    const starPos = new Float32Array(1500)
    for (let i = 0; i < 1500; i++) starPos[i] = (Math.random() - 0.5) * 400
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.3 })))

    // Earth with real texture
    const textureLoader = new THREE.TextureLoader()
    const earthTexture = textureLoader.load(
      'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg'
    )
    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(10, 64, 64),
      new THREE.MeshPhongMaterial({ map: earthTexture, specular: 0x112244, shininess: 30 })
    )
    scene.add(earth)
    scene.add(new THREE.AmbientLight(0x888888))
    const sun = new THREE.DirectionalLight(0xffffff, 1.2)
    sun.position.set(5, 3, 5)
    scene.add(sun)

    // Atmosphere glow
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(11, 64, 64),
      new THREE.MeshPhongMaterial({
        color: 0x4466ff,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide,
      })
    )
    scene.add(atmosphere)

    const clock = new THREE.Clock()
    let elapsed = 0
    let opacity = 1
    let animId: number

    const animate = () => {
      animId = requestAnimationFrame(animate)
      const delta = clock.getDelta()
      elapsed += delta

      // Zoom in: move camera from z=100 to z=12 over 3.5s
      const progress = Math.min(elapsed / 3.5, 1)
      camera.position.z = 100 - (88 * progress * progress) // eased
      earth.rotation.y += delta * 0.1

      if (elapsed > 3.5) {
        opacity = Math.max(0, opacity - delta * 2.5)
        renderer.domElement.style.opacity = String(opacity)
        if (opacity <= 0) {
          cancelAnimationFrame(animId)
          onComplete()
        }
      }

      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [onComplete])

  return <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />
}
