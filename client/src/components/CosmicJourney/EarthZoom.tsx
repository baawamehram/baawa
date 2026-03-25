import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface Props {
  lat: number
  lon: number
  onComplete: () => void
}

export function EarthZoom({ lat, lon, onComplete }: Props) {
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
    const starPos = new Float32Array(2000 * 3)
    for (let i = 0; i < starPos.length; i++) starPos[i] = (Math.random() - 0.5) * 400
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.25 })))

    // Earth
    const earthGeo = new THREE.SphereGeometry(10, 64, 64)
    const textureLoader = new THREE.TextureLoader()
    const earthTexture = textureLoader.load(
      'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg'
    )
    const earthMat = new THREE.MeshPhongMaterial({ map: earthTexture, specular: 0x112244, shininess: 25 })
    const earth = new THREE.Mesh(earthGeo, earthMat)
    scene.add(earth)

    // Digital wireframe overlay
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xFF6B35,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    })
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(10.05, 24, 24), wireMat))

    // Outer atmosphere glow (coral)
    const atmMat = new THREE.MeshBasicMaterial({
      color: 0xFF6B35,
      transparent: true,
      opacity: 0.07,
      side: THREE.BackSide,
    })
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(12, 32, 32), atmMat))

    // Blue inner atmosphere (realistic)
    const atmBlue = new THREE.MeshPhongMaterial({
      color: 0x4466ff,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide,
    })
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(11, 32, 32), atmBlue))

    // Location marker: small glowing sphere at user's lat/lon
    const latR = lat * Math.PI / 180
    const lonR = lon * Math.PI / 180
    const markerPos = new THREE.Vector3(
      10.3 * Math.cos(latR) * Math.sin(lonR),
      10.3 * Math.sin(latR),
      10.3 * Math.cos(latR) * Math.cos(lonR),
    )
    const markerMat = new THREE.MeshBasicMaterial({ color: 0xFF6B35 })
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12), markerMat)
    marker.position.copy(markerPos)
    earth.add(marker) // attach to earth so it rotates with it

    // Lights
    scene.add(new THREE.AmbientLight(0x999999))
    const sun = new THREE.DirectionalLight(0xffffff, 1.0)
    sun.position.set(5, 3, 8)
    scene.add(sun)

    // Target Y rotation to bring user's longitude to face camera (+Z)
    // In THREE.js SphereGeometry: lon=0 is at +Z, so target = -lon_radians
    const targetYRot = -lonR
    // Latitude tilt (gentle)
    const targetXRot = -latR * 0.4

    const clock = new THREE.Clock()
    let elapsed = 0
    let opacity = 1
    let animId: number
    const TOTAL_DURATION = 6.0
    const ZOOM_START = 1.5 // start zooming after orientation spin
    const FADE_START = 5.2

    const animate = () => {
      animId = requestAnimationFrame(animate)
      const delta = clock.getDelta()
      elapsed += delta

      // Phase 1 (0 → ZOOM_START): orient Earth to user's location
      if (elapsed < ZOOM_START) {
        const t = elapsed / ZOOM_START
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t // easeInOut
        earth.rotation.y = targetYRot * ease
        earth.rotation.x = targetXRot * ease
      } else {
        // Phase 2: gentle idle rotation after lock
        earth.rotation.y = targetYRot + (elapsed - ZOOM_START) * 0.015
        earth.rotation.x = targetXRot
      }

      // Zoom: camera moves in from z=100 during ZOOM_START → FADE_START
      if (elapsed > ZOOM_START) {
        const zoomProgress = Math.min((elapsed - ZOOM_START) / (FADE_START - ZOOM_START), 1)
        const easedZoom = zoomProgress * zoomProgress * (3 - 2 * zoomProgress) // smoothstep
        camera.position.z = 100 - 82 * easedZoom
      }

      // Fade out
      if (elapsed > FADE_START) {
        opacity = Math.max(0, 1 - (elapsed - FADE_START) / (TOTAL_DURATION - FADE_START))
        renderer.domElement.style.opacity = String(opacity)
        if (opacity <= 0) {
          cancelAnimationFrame(animId)
          onComplete()
          return
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
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [lat, lon, onComplete])

  return <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />
}
