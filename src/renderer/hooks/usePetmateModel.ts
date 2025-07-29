import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { Ref } from 'vue'

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer

let mixer: THREE.AnimationMixer
let model: THREE.Group
let animations: THREE.AnimationClip[] = []
let animationActions: Map<string, THREE.AnimationAction> = new Map()
let currentAction: THREE.AnimationAction | null = null
let animationId: number | null = null;
let clock = new THREE.Clock()
let isModelLoaded = false
let onModelLoadedCallbacks: (() => void)[] = []

/**
 * 行走的参数
 */
let isWalking = false
let walkStartTime = 0
let walkStartPosition: THREE.Vector3 = new THREE.Vector3()
let walkTargetPosition: THREE.Vector3 = new THREE.Vector3()
let walkDuration = 0

export let isSitting = false;
export let sittingWindowTitle: string = "";


/**
 * 坠下的参数
 */
let isFalling = false
let fallStartTime = 0
let fallStartPosition: THREE.Vector3 = new THREE.Vector3()
let fallTargetPosition: THREE.Vector3 = new THREE.Vector3()
let fallDuration = 0

/**
 * 动画的名字
 */
const walkAnimationName = 'walk Bip001|Take 001|BaseLayer'
const fallAnimationName = ''

/**
 * 动画参数
 */
const walkSpeed: number = 1;
const gravity: number = 0.001;


export const usePetmateModel = (threeContainer: Ref<HTMLDivElement | undefined>) => {


    /**
     * 获取并设置所有动画
     */
    const _getAnimations = () => {
        if (!model || animations.length === 0) return;

        if (!mixer) {
            mixer = new THREE.AnimationMixer(model);
        }

        // 为每个动画创建动画动作
        animations.forEach((clip) => {
            const action = mixer.clipAction(clip);
            animationActions.set(clip.name, action);
        });

        console.log('Available animations:', Array.from(animationActions.keys()));
        
        // 标记模型已加载完成
        isModelLoaded = true;
        
        // 执行所有等待的回调
        onModelLoadedCallbacks.forEach(callback => callback());
        onModelLoadedCallbacks = []; // 清空回调队列
    }

    /**
     * 动画更新
     */
    const _animate = () => {
        animationId = requestAnimationFrame(_animate)
        
        // 更新动画混合器
        if (mixer) {
            const delta = clock.getDelta();
            mixer.update(delta);
        }
        
        // 更新走路移动
        if (isWalking) {
            _updateWalkMovement();
        }

        // 更新坠落的移动
        if (isFalling) {
            _updateFallMovement();
        }
        
        if (renderer && scene && camera) {
            renderer.render(scene, camera)
        }
    }

    /**
     * 更新走路移动
     */
    const _updateWalkMovement = () => {
        if (!isWalking || !model) return;

        const currentTime = performance.now();
        const elapsed = currentTime - walkStartTime;
        const progress = Math.min(elapsed / walkDuration, 1);

        // 使用缓动函数来平滑移动
        const easeInOutQuad = (t: number) => {
            return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        };
        const easedProgress = easeInOutQuad(progress);

        // 插值计算当前位置
        model.position.lerpVectors(walkStartPosition, walkTargetPosition, easedProgress);

        if (progress >= 1) {
            // 到达目标位置
            model.position.copy(walkTargetPosition);
            _stopWalking();
            
            // 回到初始动画
            onAnimationFinished();
        }
    }

    /**
     * 更新坠落的移动
     */
    const _updateFallMovement = () => {
        if (!isFalling || !model) return;
        const currentTime = performance.now();
        const elapsed = currentTime - fallStartTime;
        const progress = Math.min(elapsed / fallDuration, 1);

        // 使用缓动函数来平滑移动
        const easeInOutQuad = (t: number) => {
            return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        };
        const easedProgress = easeInOutQuad(progress);

        // 插值计算当前位置
        model.position.lerpVectors(fallStartPosition, fallTargetPosition, easedProgress);

        if (progress >= 1) {
            // 到达目标位置
            model.position.copy(fallTargetPosition);
            _stopFalling();
            
            // 回到初始动画
            onAnimationFinished();
        }
    }

    /**
     * 停止坠落
     */
    const _stopFalling = () => {
        isFalling = false;
    }

    /**
     * 停止走路
     */
    const _stopWalking = () => {
        isWalking = false;
        // 之后去掉
        isSitting = true;
    }

    /**
     * 初始化three.js需要的scene, camera, renderer, light
     */
    const _initThreeJS = () => {
        if (!threeContainer || !threeContainer.value) return ;

        scene = new THREE.Scene()
        // 透明背景
        scene.background = null
      
        camera = new THREE.PerspectiveCamera(
          45,
          threeContainer.value.clientWidth / threeContainer.value.clientHeight,
          0.1,
          100
        )
        camera.position.set(0, 0, 8)
        camera.lookAt(0, 0, 0)
      
        renderer = new THREE.WebGLRenderer({ 
          antialias: true, 
          alpha: true,
          premultipliedAlpha: false
        })
        renderer.setSize(threeContainer.value.clientWidth, threeContainer.value.clientHeight)
        renderer.setClearColor(0x000000, 0) // 透明背景
        threeContainer.value.appendChild(renderer.domElement)
      
        const ambientLight = new THREE.AmbientLight(0xffffff, 1)
        scene.add(ambientLight)
      
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
        directionalLight.position.set(2, 3, 8)
        scene.add(directionalLight)
    };

    /**
     * 加载模型
     */
    const _loadModel = () => {
        const loader = new GLTFLoader()
    
        loader.load(
            '../assets/models/petmate.glb',
            (gltf) => {
                model = gltf.scene;
                model.position.set(0, 0, 0)
                scene.add(model)

                // 从GLTF对象中获取动画
                if (gltf.animations && gltf.animations.length > 0) {
                    animations = gltf.animations;
                    _getAnimations();
                }

                _animate();
            },
            undefined,
            (error) => {
                console.error('Error loading model:', error)
            }
        )
    };

    /**
     * 播放完了以后，需要回到初始动画，并设置为循环播放
     */
    const onAnimationFinished = () => {
        // 平滑旋转到目标方向
        const targetQuaternion = new THREE.Quaternion();
        targetQuaternion.setFromEuler(new THREE.Euler(0, 0, 0));
        
        const rotationDuration = 400; // 300ms旋转时间
        const rotationStartTime = performance.now();
        const rotateToTarget = () => {
            const rotationElapsed = performance.now() - rotationStartTime;
            const rotationProgress = Math.min(rotationElapsed / rotationDuration, 1);
            
            model.quaternion.slerpQuaternions(model.quaternion, targetQuaternion, rotationProgress);
            
            if (rotationProgress < 1) {
                requestAnimationFrame(rotateToTarget);
            }
        };

        rotateToTarget();
        isSitting = true;
    };

    /**
     * 初始化petmate的模型
     */
    const initPetmateModel = () => {
        _initThreeJS();
        _loadModel();
        console.log("模型初始化完成");
    };

    /**
     * 播放指定的动画
     * @param animationName 动画名称
     * @param loop 是否循环播放
     * @param fadeTime 淡入淡出时间
     */
    const playAnimation = (animationName: string, loop: boolean = true, fadeTime: number = 0.5) => {
        // 如果模型还没加载完成，将动画播放请求加入队列
        if (!isModelLoaded) {
            console.log(`模型还没有加载完成，请求动画放入队列中： ${animationName}`);
            onModelLoadedCallbacks.push(() => playAnimation(animationName, loop, fadeTime));
            return;
        }

        const action: THREE.AnimationAction | undefined = animationActions.get(animationName);
        console.log("animationActions", animationActions);
        
        if (!action) {
            console.log(`Animation "${animationName}" not found. Available animations:`, Array.from(animationActions.keys()));
            return;
        }

        // 停止当前动画
        if (currentAction && currentAction !== action) {
            currentAction.fadeOut(fadeTime);
        }

        // 播放新动画
        action.reset();
        action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
        action.fadeIn(fadeTime);
        action.play();

        currentAction = action;
    };

    /**
     * 停止当前动画
     * @param fadeTime 淡出时间
     */
    const stopAnimation = (fadeTime: number = 0.5) => {
        if (currentAction) {
            currentAction.fadeOut(fadeTime);
            currentAction = null;
        }
    };

    /**
     * 获取所有可用的动画名称
     */
    const getAnimationNames = (): string[] => {
        return Array.from(animationActions.keys());
    };

    /**
     * 获取模型位置
     */
    const getModelPosition = (): THREE.Vector3 => {
        return model.position;
    }

    /**
     * 检查模型是否已加载完成
     */
    const isLoaded = (): boolean => {
        return isModelLoaded;
    };

    /**
     * 等待模型加载完成
     * @returns Promise that resolves when model is loaded
     */
    const waitForLoad = (): Promise<void> => {
        return new Promise((resolve) => {
            if (isModelLoaded) {
                resolve();
            } else {
                onModelLoadedCallbacks.push(() => resolve());
            }
        });
    };

    /**
     * 让模型走到指定的3D位置
     * 这个位置是一个世界坐标，不要传屏幕坐标，如果是屏幕坐标，请先用screenToWorld进行转换
     * @param targetPosition 目标位置 (x, y, z)
     * @param speed 移动速度，默认使用 walkSpeed
     */
    const walkTo = async (targetPosition: THREE.Vector3, speed: number = walkSpeed) => {
        // 等待模型加载完成
        if (!isModelLoaded) {
            console.log('模型还没有加载完成，等待加载...');
            await waitForLoad();
        }

        if (!model) {
            console.warn('模型不可用');
            return;
        }

        // 如果已经在走路，先停止当前移动
        if (isWalking) {
            _stopWalking();
        }

        // 设置起始和目标位置
        walkStartPosition.copy(model.position);
        walkTargetPosition.copy(targetPosition);
        
        // 计算距离和移动时间
        const distance = walkStartPosition.distanceTo(walkTargetPosition);
        walkDuration = (distance / speed) * 1000; // 转换为毫秒

        if (distance < 0.1) {
            console.log('目标位置太近，无需移动');
            return;
        }

        // 计算方向并旋转模型朝向目标
        const direction = new THREE.Vector3().subVectors(walkTargetPosition, walkStartPosition).normalize();
        
        // 只在XZ平面计算角度（Y轴旋转），保持模型直立
        const angle = Math.atan2(direction.x, direction.z);
        
        // 平滑旋转到目标方向
        const targetQuaternion = new THREE.Quaternion();
        targetQuaternion.setFromEuler(new THREE.Euler(0, angle, 0));
        
        const rotationDuration = 300; // 300ms旋转时间
        const rotationStartTime = performance.now();
        const startQuaternion = model.quaternion.clone();
        
        const rotateToTarget = () => {
            const rotationElapsed = performance.now() - rotationStartTime;
            const rotationProgress = Math.min(rotationElapsed / rotationDuration, 1);
            
            model.quaternion.slerpQuaternions(startQuaternion, targetQuaternion, rotationProgress);
            
            if (rotationProgress < 1) {
                requestAnimationFrame(rotateToTarget);
            }
        };

        const startWalkingMovement = () => {
            // 播放走路动画
            const availableAnimations = getAnimationNames();
            if (availableAnimations.includes(walkAnimationName)) {
                playAnimation(walkAnimationName, true, 0.1);
                console.log("播放走路动画");
            }

            // 开始移动
            isWalking = true;
            isSitting = false;
            walkStartTime = performance.now();
        };

        // 先旋转模型，再走
        rotateToTarget();
        startWalkingMovement();
    };

    const jumpTo = async (targetPosition: THREE.Vector3, speed: number = walkSpeed) => {
        if (!isModelLoaded) {
            console.log('模型还没有加载完成，等待加载...');
            await waitForLoad();
        }

        if (!model) {
            console.warn('模型不可用');
            return;
        }

        isFalling = true;
        fallStartTime = performance.now();
        fallStartPosition.copy(model.position);
        fallTargetPosition.copy(targetPosition);

        // 计算距离和时间
        const distance = fallStartPosition.distanceTo(fallTargetPosition);
        fallDuration = (distance / speed) * 1000; // 转换为毫秒

        const startFallingMovement = () => {
            // 播放坠落动画
            const availableAnimations = getAnimationNames();
            if (availableAnimations.includes(fallAnimationName)) {
                playAnimation(fallAnimationName, true, 0.1);
            }
        }
        startFallingMovement();
    }

    /**
     * 停止当前的走路移动
     */
    const stopWalking = () => {
        if (isWalking) {
            _stopWalking();
            onAnimationFinished(); // 回到初始动画
        }
    };

    /**
     * 检查是否正在走路
     */
    const isCurrentlyWalking = (): boolean => {
        return isWalking;
    };


    /**
     * 坐到某个窗口上
     * @param windowTitle 窗口标题
     */
    const sitOn = (windowTitle: string) => {
        sittingWindowTitle = windowTitle;
    }

    /**
     * 销毁所有动画资源
     */
    const destroy = () => {
        // 停止所有动画
        stopAnimation(0);
        
        if (mixer) {
            mixer.stopAllAction();
            mixer.uncacheRoot(model);
        }
        
        if (renderer) {
            renderer.dispose();
        }
        if (scene) {
            scene.clear();
        }
        if (camera) {
            camera.clear();
        }
        
        // 清理动画相关数据
        animationActions.clear();
        animations = [];
        currentAction = null;
        
        // 重置加载状态
        isModelLoaded = false;
        onModelLoadedCallbacks = [];
        
        // 重置状态
        isWalking = false;
        isSitting = false;
        isFalling = false;
    }

    return {
        initPetmateModel,
        destroy,
        playAnimation,
        stopAnimation,
        getAnimationNames,
        isLoaded,
        waitForLoad,
        walkTo,
        jumpTo,
        stopWalking,
        isCurrentlyWalking,
        getModelPosition,
        sitOn,
    }
}

/**
 * 将屏幕(x, y)坐标转换成three.js里的三维坐标，但是z = 0
 * @param screenX - X coordinate in pixels (0 = left edge of canvas)
 * @param screenY - Y coordinate in pixels (0 = top edge of canvas)
 * @param targetZ - Z depth in world coordinates to project to (default: 0)
 * @returns Vector3 world coordinates
 */
export function screenToWorld(screenX: number, screenY: number, height: number, width: number): THREE.Vector3 {
    if (!renderer || !camera) {
        console.warn('Renderer or camera not initialized');
        return new THREE.Vector3(0, 0, 0);
    }

    
    const coords = new THREE.Vector2(
        (screenX / width) * 2 - 1,
        -(screenY / height) * 2 + 1,
    )
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(coords, camera);

    /**
     * 不知道为什么把屏幕的坐标转换成three.js里的三维坐标是这样的，但这样搞是正确的，尽量不要动这个了
     */

    const rayOrigin = raycaster.ray.origin;
    const rayDirection = raycaster.ray.direction;
    
    // Ray equation: point = origin + t * direction
    // For z=0 plane: rayOrigin.z + t * rayDirection.z = 0
    // Solve for t: t = -rayOrigin.z / rayDirection.z
    const t = (rayOrigin.z) / rayDirection.z;
    
    // Calculate intersection point
    const worldX = rayOrigin.x + t * rayDirection.x;
    const worldY = rayOrigin.y + t * rayDirection.y;
    
    return new THREE.Vector3(worldX, worldY, 0);
}

/**
 * 将世界坐标转换为屏幕坐标
 * @param worldPosition 世界坐标
 * @param height 屏幕高度
 * @param width 屏幕宽度
 * @returns 屏幕坐标
 */
export function worldToScreen(worldPosition: THREE.Vector3, height: number, width: number): {x: number, y: number} {
    if (!renderer || !camera) {
        console.warn('Renderer or camera not initialized');
        return {x: 0, y: 0};
    }

    // Clone the world position to avoid modifying the original
    const vector = worldPosition.clone();
    
    // Project the 3D point to 2D screen coordinates
    vector.project(camera);
    
    // Convert from normalized device coordinates [-1, 1] to screen coordinates [0, width/height]
    const screenX = (vector.x + 1) * width / 2;
    const screenY = (-vector.y + 1) * height / 2;
    
    return {
        x: Math.round(screenX),
        y: Math.round(screenY)
    };
}