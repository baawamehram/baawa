import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface Props { onComplete: () => void }

export function SolarSystem({ onComplete }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // Scene setup
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.set(0, 20, 50)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    // Stars
    const starGeometry = new THREE.BufferGeometry()
    const starPositions = new Float32Array(1500)
    for (let i = 0; i < 1500; i++) {
      starPositions[i] = (Math.random() - 0.5) * 400
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    const stars = new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.3 })
    )
    scene.add(stars)

    // Sun
    const sunGeo = new THREE.SphereGeometry(3, 32, 32)
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 })
    const sun = new THREE.Mesh(sunGeo, sunMat)
    scene.add(sun)
    scene.add(new THREE.PointLight(0xffaa00, 2, 200))

    // Planets: [radius, orbitRadius, speed, color]
    const planetConfigs: [number, number, number, number][] = [
      [0.5, 8, 1.5, 0x4444ff],
      [0.8, 13, 1.0, 0xff6633],
      [0.6, 18, 0.7, 0x44ffaa],
      [1.2, 25, 0.4, 0xffcc44],
    ]

    const planets = planetConfigs.map(([r, orbit, , color]) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(r, 16, 16),
        new THREE.MeshPhongMaterial({ color })
      )
      scene.add(mesh)
      return { mesh, orbit }
    })

    let angle = 0
    let opacity = 1
    const clock = new THREE.Clock()
    let elapsed = 0
    let animId: number

    const animate = () => {
      animId = requestAnimationFrame(animate)
      const delta = clock.getDelta()
      elapsed += delta
      angle += delta * 0.3

      planetConfigs.forEach(([, , speed], i) => {
        planets[i].mesh.position.x = Math.cos(angle * speed) * planets[i].orbit
        planets[i].mesh.position.z = Math.sin(angle * speed) * planets[i].orbit
      })

      camera.position.x = Math.sin(angle * 0.1) * 5

      // Fade out after 3.5s
      if (elapsed > 3.5) {
        opacity = Math.max(0, opacity - delta * 2)
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
