import * as THREE from 'three'
import gsap from 'gsap'
import { ref } from 'vue'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { ScreenPosition } from '../types/model'
import { ModelStatus } from '../types/model'

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
let raycaster: THREE.Raycaster | null = null;
let mouse: THREE.Vector2 | null = null;

let petMateModelConfig = {
    scale: 1,
}

// 开发辅助用的
let orbitControls: OrbitControls | null = null;

/**
 * 模型当前状态
 */
let currentAction: THREE.AnimationAction | null = null;
let modelState: ModelStatus = {
    walk: false,
    jump: false,
    dance: false,
    sitting: false,
    standIdle: false,
    sittedIdle: false,
    spyBesideWindow: false
}

let defaultModelState: ModelStatus = {
    walk: false,
    jump: false,
    dance: false,
    sitting: false,
    standIdle: false,
    sittedIdle: false,
    spyBesideWindow: false
}

// 正在坐的窗口名字
// 这个就是由Petmate.vue进行修改的
export let sittedWindowTitle: string = "";

/**
 * 模型的走路速度
 */
const walkSpeed: number = 2;


export const isShowContextMenu = ref(false);



export const usePetmateModel = (threeContainer: Ref<HTMLDivElement>) => {

    const loader = new GLTFLoader();
    /**
     * rotation.y 最多只能到(-rotationMaxY, rotationMaxY)
     */
    const rotationMaxY = Math.PI / 4;

    const init3D = (screenResolution: {width: number, height: number}): Promise<void> => {
        return new Promise((resolve, reject) => {
            resolution = screenResolution;

            scene = new THREE.Scene();
            // 使用实际窗口大小的宽高比，保持与renderer一致
            camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 1, 1000);
            
            renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: true,
                premultipliedAlpha: false
            });
            
            console.log(`window的inner (${window.innerWidth}, ${window.innerHeight})`)
            console.log(`screenResolution (${screenResolution.width}, ${screenResolution.height})`)
            renderer.setSize(window.innerWidth, window.innerHeight);
            // 要完全透明
            renderer.setClearColor(0xffffff, 0);
            threeContainer.value.appendChild(renderer.domElement);
            raycaster = new THREE.Raycaster();
            mouse = new THREE.Vector2();

            renderer.domElement.addEventListener('mousemove', onMouseMove, false);
            renderer.domElement.addEventListener('contextmenu', (event) => {
                event.preventDefault();
                isShowContextMenu.value = true;
                console.log('右键')
            }, false);
            
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
                model.position.set(0, -1, 0);
                model.scale.set(petMateModelConfig.scale, petMateModelConfig.scale, petMateModelConfig.scale);
                scene?.add(model);

                camera?.position.set(0, 0, 5)
                
                animations = gltf.animations;
                console.log(animations)
                mixer = new THREE.AnimationMixer(model);
                
                scene?.add(ambientLight!);
                scene?.add(directionalLightLeft!);
                scene?.add(directionalLightRight!);
                scene?.add(directionalLightCenter!);
                // if (camera && renderer) orbitControls = new OrbitControls(camera, renderer.domElement);
                
                // const axesHelper = new THREE.AxesHelper(10);
                // scene?.add(axesHelper);
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

    function onMouseMove(event: MouseEvent) {
        if (!mouse || !camera || !scene) return ;
        // 将鼠标位置归一化为设备坐标 (-1 to +1)
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        // console.log("鼠标移动")

        // 先检测有没有按到菜单UI
        const element = document.elementFromPoint(event.clientX, event.clientY);
        const inOnUI = checkOnUI(element);
        if (inOnUI) {
            // window.api.setIgnoreMouseEvents(false);
            // console.log(`鼠标在${element?.className}上`)
            return ;
        }

        // 检测是否与3D对象相交
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        const hasIntersection = intersects.length > 0;

        // console.log(`点到3D对象了么？: ${hasIntersection} 鼠标位置: ${mouse.x}, ${mouse.y}`)
        // console.log(`模型位置: ${model?.position.x}, ${model?.position.y}`)
        
        // 通知主进程是否忽略鼠标事件
        window.api.setIgnoreMouseEvents(!hasIntersection);
    }

    function checkIntersection() {
        if (!raycaster || !camera || !mouse || !scene) return false;
        // 从相机位置发射射线
        raycaster.setFromCamera(mouse, camera);
        // 检测相交
        const intersects = raycaster.intersectObjects(scene.children);
        console.log(`相交对象: ${intersects.length}`)
        return intersects.length > 0;
    }

    const animate = () => {
        if (!scene || !camera || !renderer || !model) return;
        if (mixer) mixer.update(clock.getDelta());

        renderer.render(scene, camera);
    };


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
     * @param onComplete 完成后的回调函数
     */
    const walkTo = (position: ScreenPosition, onCompleted?: () => void) => {
        if (!model) return ;
        const target: THREE.Vector3 = transferScreenToWorld(position, resolution.width, resolution.height);
        const distance:number = target.distanceTo(model.position);
        console.log('target screen pos', transferWorldToScreen(target, resolution.width, resolution.height))
        if (distance < 0.1) return ;

        // 杀死可能存在的位置和旋转动画，避免冲突
        gsap.killTweensOf(model.position);
        gsap.killTweensOf(model.rotation);

        gsap.to(model.rotation, {
            y: Math.atan2(target.x - model.position.x, target.z - model.position.z),
            duration: 0.1
        });
        let walkAction = getAnimationAction("walk");
        if (!walkAction) walkAction = getAnimationAction("run");
        if (!walkAction) return ;
        _playAction(walkAction);
        updateModelState({walk: true});
        const duration = distance / walkSpeed;
        
        gsap.to(model.position, {
            x: target.x,
            y: target.y,
            z: target.z,
            duration: duration,
            onComplete: () => {
                if (onCompleted) {
                    onCompleted();
                }
            }
        });
    };

    /**
     * 坐姿
     * 这个是晃腿的
     * @param rotationY 旋转角度，如果为空，就保持现在的model.rotation.y
     */
    const sitted = () => {
        let sit2 = getAnimationAction("sit_2");
        if (!sit2 || !model) return ;
        _playAction(sit2, true);

        updateModelState({sittedIdle: true});
    };

    /**
     * 坐下
     * 这是一整个完整的坐下的动画，因为petmate坐下的动画分成了三段，所以这里需要分段走，站起来是第三段，这里不需要
     */
    const sit = () => {
        let sit1 = getAnimationAction("sit_1");
        let sit2 = getAnimationAction("sit_2");
        
        if (!sit1 || !sit2  || !mixer || !model) return;
        updateModelState({sitting: true});

        // 杀死可能存在的位置动画，避免冲突
        gsap.killTweensOf(model.position);
        
        _playAction(sit1, false);
        gsap.to(model.rotation, {
            y: 0,
            duration: 0.2
        })
        
        const onSit1Finished = () => {
            mixer!.removeEventListener('finished', onSit1Finished);
            sitted();
        };
        
        mixer.addEventListener('finished', onSit1Finished);
    };

    /**
     * 从坐姿站起来
     * 这个方法只能在modelStatus.sittedIdle为true的时候调用，因此调用这个方法的时候，最好先检查一下modelStatus
     */
    const standFromSit = () => {
        if (!modelState.sittedIdle) return ;
        let sit3 = getAnimationAction("sit_3");
        if (!sit3) return ;
        _playAction(sit3, false);
        updateModelState({standIdle: true});
        const onSit3Finished = () => {
            mixer!.removeEventListener('finished', onSit3Finished);
            standIdle();
        };
        mixer!.addEventListener('finished', onSit3Finished);
    }

    /**
     * 待机动作
     */
    const standIdle = () => {
        let idleAction = getAnimationAction("idle");
        if (!idleAction || !model) return ;
        _playAction(idleAction, true);
        updateModelState({standIdle: true});
        gsap.to(model.rotation, {
            y: 0,
            duration: 0.3
        });
    };

    /**
     * 扶墙偷看
     * 调用这个方法之前必须要先检查一下Petmate的模型是否在屏幕最边上，否则可能出问题
     */
    const spyBesideWindow = () => {
        let spyBesideWindow = getAnimationAction("see");
        if (!spyBesideWindow || !model) return ;
        _playAction(spyBesideWindow, false, true);
        gsap.to(model.rotation, {
            y: 0,
            duration: 0.3
        });
        updateModelState({spyBesideWindow: true});
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

    /**
     * 更新Petmate模型的动作状态
     * 传入的state如果没有指明其他的状态的话，其他状态就会变成false
     * @param state 新的状态
     * @returns 更新后的状态
     */
    const updateModelState = (state: Partial<ModelStatus>): ModelStatus => {
        modelState = { ...defaultModelState, ...state };
        return modelState;
    }

    /**
     * 获取Petmate模型当前在屏幕上的坐标
     */
    const getModelScreenPosition = (): ScreenPosition => {
        if (!model) return {x: 0, y: 0};
        return transferWorldToScreen(model.position, resolution.width, resolution.height);
    }

    const setSittedWindowTitle = (title: string) => {
        sittedWindowTitle = title;
    }

    const setModelPosition = (position: THREE.Vector3) => {
        if (!model) return ;
        gsap.killTweensOf(model.position);
        gsap.to(model.position, {
            x: position.x,
            y: position.y,
            z: position.z,
            duration: 0.1
        });
    }

    return {
        init3D,
        modelConfig: readonly(petMateModelConfig),
        modelState: readonly(modelState),

        // 动作
        walkTo,
        standIdle,
        sit,
        sitted,
        standFromSit,
        spyBesideWindow,

        // get
        getModelScreenPosition,

        // set
        setSittedWindowTitle,
        setModelPosition
    }
}

export function transferScreenToWorld(screenPosition: ScreenPosition, width: number, height: number): THREE.Vector3 {
    if (!renderer || !camera || !model) {
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
    
    return new THREE.Vector3(worldX, worldY, model.position.z);
}

export function transferWorldToScreen(worldPosition: THREE.Vector3, width: number, height: number): ScreenPosition {
    if (!camera) return {x: width / 2, y: height / 2};
    const vector: THREE.Vector3 = worldPosition.clone();
    vector.project(camera);
    const screenX = (vector.x + 1) * width / 2;
    const screenY = -(vector.y - 1) * height / 2;
    return {x: screenX, y: screenY};
}

function checkOnUI(element: Element | null) {
    if (!element) return false;
    const className = element.className || '';
    if (className.includes('radial-menu-overlay') || 
        element.closest('.radial-menu-overlay')) {
        return true;
    }
    return false
}