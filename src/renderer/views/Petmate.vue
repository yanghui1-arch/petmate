<template>
  <div class="petmate-container">
    <div ref="threeContainer" class="three-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'


// Reactive references
const threeContainer = ref<HTMLDivElement>()

// Three.js variables
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer

let mixer: THREE.AnimationMixer
let model: THREE.Group
let animationAction: THREE.AnimationAction
let clock = new THREE.Clock()
let isAnimating = false
let animationStartTime = 0
let animationDuration = 0

onMounted(() => {
  initThreeJS()
  loadModel()
})

onUnmounted(() => {
  cleanup()
})

function initThreeJS() {
  if (!threeContainer.value) return

  // Create scene
  scene = new THREE.Scene()
  // Transparent background for desktop pet
  scene.background = null

  // Create camera for desktop pet view
  camera = new THREE.PerspectiveCamera(
    45,
    threeContainer.value.clientWidth / threeContainer.value.clientHeight,
    0.1,
    100
  )
  camera.position.set(0, 0, 8)
  camera.lookAt(0, 0, 0)

  // Create renderer with transparency
  renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    alpha: true,
    premultipliedAlpha: false
  })
  renderer.setSize(threeContainer.value.clientWidth, threeContainer.value.clientHeight)
  renderer.setClearColor(0x000000, 0) // Transparent background
  threeContainer.value.appendChild(renderer.domElement)

  // Simple lighting for desktop pet
  const ambientLight = new THREE.AmbientLight(0x404040, 2)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
  directionalLight.position.set(2, 3, 4)
  scene.add(directionalLight)
}

function loadModel() {
  const loader = new GLTFLoader()
  
  loader.load(
    '../assets/models/petmate.glb',
    (fbx) => {
      model = fbx.scene;
      
      model.position.set(-1.5, -2, 0) // Start from left side of screen
      model.rotation.y = Math.PI / 2
      
      // Debug: Check initial model rotation
      console.log('Model initial rotation:', model.rotation)
      console.log('Model initial position:', model.position)
      
      scene.add(model)
      
      // Set up animation
      if (fbx.animations && fbx.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model)

        const walkAnimation = fbx.animations[0]
        console.log(`Loading animation: "${walkAnimation.name}" (${walkAnimation.duration}s, ${walkAnimation.tracks.length} tracks)`)
         
        animationAction = mixer.clipAction(walkAnimation)

        
        // Configure animation to play once
        animationAction.setLoop(THREE.LoopOnce, 1)
        animationAction.clampWhenFinished = true
        
        // Add event listener for animation completion
        mixer.addEventListener('finished', onAnimationFinished)
        
        // Start the animation
        animationAction.play()
        isAnimating = true
        animationStartTime = performance.now()
        animationDuration = walkAnimation.duration * 1000 // Convert to milliseconds
      } else {
      }
      
      // Start render loop
      animate()
    },
    undefined,
    (error) => {
      console.error('Error loading model:', error)
    }
  )
}

function onAnimationFinished() {
  isAnimating = false
  
  // 动画平滑过渡到脸朝正前方，即rotation.y = 0
  if (model) {
    const targetRotation = new THREE.Quaternion();
    targetRotation.setFromEuler(new THREE.Euler(0, 0, 0));
    const duration = 500; // 1 second
    const startTime = performance.now();
    const easeInOut = (t: number) => {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    };
    const animateRotation = () => {
      const currentTime = performance.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeInOut(progress);
      model.quaternion.slerp(targetRotation, easedProgress);
      if (progress < 1) {
        requestAnimationFrame(animateRotation);
      }
    };
    animateRotation();
  }
}

const speed = 1

function animate() {
  requestAnimationFrame(animate)
  
  // Update animation mixer
  if (mixer) {
    const delta = clock.getDelta()
    mixer.update(delta)
  }
  
    // Since the animation is "walk in place", we need to manually move the character
  if (isAnimating && model) {
    const elapsed = performance.now() - animationStartTime
    const progress = elapsed / animationDuration
    
    if (progress <= 1) {
      model.position.x = progress * speed;
    }
  }
  
  // Render the scene
  renderer.render(scene, camera)
}

function cleanup() {
  if (mixer) {
    mixer.removeEventListener('finished', onAnimationFinished)
  }
  
  if (renderer) {
    renderer.dispose()
  }
}

// Handle window resize
window.addEventListener('resize', () => {
  if (!threeContainer.value || !camera || !renderer) return
  
  camera.aspect = threeContainer.value.clientWidth / threeContainer.value.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(threeContainer.value.clientWidth, threeContainer.value.clientHeight)
})
</script>

<style scoped>
.petmate-container {
  width: 100%;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: black;
}

.three-container {
  width: 100%;
  height: 100%;
}

.controls {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 100;
}

.status {
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px 15px;
  border-radius: 5px;
  font-family: Arial, sans-serif;
  font-size: 14px;
}
</style>
