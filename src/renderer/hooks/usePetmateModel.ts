import * as THREE from 'three'
import gsap from 'gsap'
import { ref } from 'vue'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { ScreenPosition } from '../types/model'

// 屏幕分辨率
let resolution: {width: number, height: number} = {width: 1920, height: 1080};

// three.js 密切相关
let model: THREE.Group | null = null;
let animations: THREE.AnimationClip[] | null = null;
let mixer: THREE.AnimationMixer | null = null;
const clock: THREE.Clock = new THREE.Clock();
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let directionalLightLeft: THREE.DirectionalLight | null = null;
let directionalLightRight: THREE.DirectionalLight | null = null;
let directionalLightCenter: THREE.DirectionalLight | null = null;
let ambientLight: THREE.AmbientLight | null = null;
let renderer: THREE.WebGLRenderer | null = null;

// 开发辅助用的
let orbitControls: OrbitControls | null = null;

/**
 * 模型当前状态
 */
let currentAction: THREE.AnimationAction | null = null;

/**
 * 模型的走路速度
 */
const walkSpeed: number = 4;

export const usePetmateModel = (threeContainer: Ref<HTMLDivElement>) => {

    const loader = new GLTFLoader();

    const init3D = (screenResolution: {width: number, height: number}): Promise<void> => {
        return new Promise((resolve, reject) => {
            resolution = screenResolution;

            scene = new THREE.Scene();
            // 使用实际窗口大小的宽高比，保持与renderer一致
            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            
            renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: false,
                premultipliedAlpha: false
            });
            
            console.log(`window的inner (${window.innerWidth}, ${window.innerHeight})`)
            console.log(`screenResolution (${screenResolution.width}, ${screenResolution.height})`)
            renderer.setSize(window.innerWidth, window.innerHeight);
            // 要完全透明
            renderer.setClearColor(0xffffff, 0);
            threeContainer.value.appendChild(renderer.domElement);
            
            ambientLight = new THREE.AmbientLight(0x404040, 1);
            directionalLightLeft = new THREE.DirectionalLight(0xffffff, 1);
            directionalLightLeft.position.set(-20, 50, 50);

            directionalLightRight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLightRight.position.set(20, 50, 50);

            directionalLightCenter = new THREE.DirectionalLight(0xffffff, 1);
            directionalLightCenter.position.set(0, 50, 0);

            // 加载模型
            loader.load('../assets/models/petmate.glb', (gltf) => {
                model = gltf.scene;
                model.position.set(0, -3, 0);
                // model.scale.set(0.03, 0.03, 0.03);
                model.scale.set(3, 3, 3);
                scene?.add(model);

                camera?.position.set(0, 2, 10)
                
                animations = gltf.animations;
                console.log(animations)
                mixer = new THREE.AnimationMixer(model);
                
                scene?.add(ambientLight!);
                scene?.add(directionalLightLeft!);
                scene?.add(directionalLightRight!);
                scene?.add(directionalLightCenter!);
                if (camera && renderer) orbitControls = new OrbitControls(camera, renderer.domElement);
                
                const axesHelper = new THREE.AxesHelper(10);
                scene?.add(axesHelper);
                renderer?.setAnimationLoop(animate);

                // 更新相机矩阵，确保投影计算正确
                if (camera) {
                    camera.updateMatrixWorld();
                    camera.updateProjectionMatrix();
                }
                console.log('模型初始位置', transferWorldToScreen(model.position, resolution.width, resolution.height))
                resolve();

            }, (event) => {
                console.log(`模型加载${event.loaded / event.total * 100}%`)
            }, (error) => {
                console.log(`加载模型出错${error}`)
                reject(error);
            })
        })
    }

    const animate = () => {
        if (!scene || !camera || !renderer || !model) return;
        if (mixer) mixer.update(clock.getDelta());

        renderer.render(scene, camera);
    };


    /**
     * 播放动画
     * 当需要播放动画的时候直接调用这个方法即可，不需要在_animate中调用，这个方法只能被各种动画逻辑调用，
     * 比如说walkTo，jumpTo等这类既需要播放动画又可能需要改变坐标的指令方法中就会调用_playAnimation
     * 查找动画的时候不是精准查找，只要动画名称中包含animationName，就可以找得到这个动画的，且找到的是第一个包含这个名称的动画
     * @param animationName 动画名称
     * @param loop 是否循环播放
     */
    const _playAction = (action: THREE.AnimationAction, loop: boolean = true, clampWhenFinished: boolean = true) => {
        if (currentAction && currentAction !== action) {
            currentAction.fadeOut(0.1);
        }
        action
            .reset()
            .setEffectiveTimeScale( 1 )
            .setEffectiveWeight( 1 )
            .fadeIn(0.1)
            .play();
        currentAction = action;
        action.loop = loop ? THREE.LoopRepeat : THREE.LoopOnce;
        action.clampWhenFinished = clampWhenFinished;
    };

    const getAnimationAction = (animationName: string): THREE.AnimationAction | undefined => {
        if (!animations || !mixer || !model) return undefined;
        const animationClip: THREE.AnimationClip | undefined = animations?.find(animation => animation.name.includes(animationName));
        if (!animationClip) return undefined;
        const action = mixer.clipAction(animationClip);
        return action;
    }

    /**
     * 走到指定位置
     * 这个指令逻辑是要走到目标位置，但是可能由于模型可能面向正面，可能面向左面/右面，所以必须得先根据目标位置先让模型面向转到正确的方向，然后再走过去，最后再转回来
     * @param target 目标位置
     * @param duration 持续时间
     */
    const walkTo = (position: ScreenPosition, duration: number = 1) => {
        if (!model) return ;
        const target: THREE.Vector3 = transferScreenToWorld(position, resolution.width, resolution.height);
        const distance:number = target.distanceTo(model.position);
        console.log('target screen pos', transferWorldToScreen(target, resolution.width, resolution.height))
        if (distance < 0.1) return ;

        gsap.to(model.rotation, {
            y: Math.atan2(target.x - model.position.x, target.z - model.position.z),
            duration: 0.1
        });
        let walkAction = getAnimationAction("walk");
        if (!walkAction) walkAction = getAnimationAction("run");
        if (!walkAction) return ;
        _playAction(walkAction);
        duration = distance / walkSpeed;
        console.log('distance', distance);
        
        gsap.to(model.position, {
            x: target.x,
            y: target.y,
            z: target.z,
            duration: duration,
            onUpdate: () => {
                if (model) {
                    console.log('model position', transferWorldToScreen(model.position, resolution.width, resolution.height));
                    console.log('世界坐标model position', model.position);
                }
            },
            onComplete: () => {
                let idleAction = getAnimationAction("idle");
                if (!idleAction) return ;
                _playAction(idleAction);
                if (model) {
                    gsap.to(model.rotation, {
                        y: 0,
                        duration: 0.3
                    })
                }
                if (model) console.log('final model position', transferWorldToScreen(model.position, resolution.width, resolution.height))
            }
        });
    };

    /**
     * 坐姿
     */
    const sitted = () => {

    };

    /**
     * 坐下
     */
    const sit = () => {

    };

    /**
     * 待机动作
     */
    const standIdle = () => {
        let idleAction = getAnimationAction("idle");
        if (!idleAction) return ;
        _playAction(idleAction, true);
    };

    /**
     * 扶墙偷看
     */
    const spyBesideWindow = () => {

    };

    /**
     * 跳舞
     */
    const dance = () => {

    };



    /**
     * 跳跃到指定位置
     * 这个方法目前不行，因为动画还需要做调整
     * @param target 目标位置
     * @param duration 跳跃持续时间，如果为空，则使用动画的持续时间
     */
    const jumpTo = (target:THREE.Vector3, duration?:number) => {
        if (!model || !animations) return ;

        const jumpAnimationClip = animations.find(animation => animation.name.includes("jump"));
        if (!jumpAnimationClip) return;
        const animationDuration = duration ?? jumpAnimationClip.duration;
        // _playAnimation("jump Bip001|Take 001|BaseLayer");

        const startPos = model.position.clone();
        const distance = startPos.distanceTo(target);
        const jumpHeight = Math.max(1, distance * 0.5);
        
        // 创建时间轴，精确控制动画
        const tl = gsap.timeline();
        
        // 水平移动（X, Z轴）
        tl.to(model.position, {
            x: target.x,
            z: target.z,
            duration: animationDuration,
            ease: "power1.inOut"
        }, 0); // 从0秒开始

        // 垂直跳跃（Y轴）- 先上升后下降
        tl.to(model.position, {
            y: startPos.y + jumpHeight,
            duration: animationDuration * 0.3, // 上升阶段占40%时间
            ease: "power2.out"
        }, 0)
        .to(model.position, {
            y: target.y,
            duration: animationDuration * 0.7, // 下降阶段占60%时间
            ease: "power2.in"
        }, animationDuration * 0.3); // 在上升完成后开始下降

        tl.call(() => {
        })
    };


    return {
        init3D,
        walkTo,
        standIdle
    }
}

export function transferScreenToWorld(screenPosition: ScreenPosition, width: number, height: number): THREE.Vector3 {
    if (!renderer || !camera) {
        console.warn('Renderer or camera not initialized');
        return new THREE.Vector3(0, 0, 0);
    }

    const screenX = screenPosition.x;
    const screenY = screenPosition.y;

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
    const t = -(rayOrigin.z) / rayDirection.z;
    
    // Calculate intersection point
    const worldX = rayOrigin.x + t * rayDirection.x;
    const worldY = rayOrigin.y + t * rayDirection.y;
    
    return new THREE.Vector3(worldX, worldY, 0);
}

export function transferWorldToScreen(worldPosition: THREE.Vector3, width: number, height: number): ScreenPosition {
    if (!camera) return {x: width / 2, y: height / 2};
    const vector: THREE.Vector3 = worldPosition.clone();
    vector.project(camera);
    const screenX = (vector.x + 1) * width / 2;
    const screenY = -(vector.y - 1) * height / 2;
    return {x: screenX, y: screenY};
}