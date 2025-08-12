import * as THREE from 'three'
import gsap from 'gsap'
import { ref } from 'vue'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { ScreenPosition } from '../types/model'
import { ModelStatus } from '../types/model'
import { throttle } from 'lodash'
import modelPath from '@/assets/models/petmate-1.glb'

/** 屏幕分辨率
 * 这个分辨率是一块屏幕的分辨率
 */
let resolution: {width: number, height: number} = {width: 1920, height: 1080};


/**
 * Electron视口缩放比例
 */
let scaleFactor: number = 1;

// three.js 密切相关
let model: THREE.Group | null = null;
let animations: THREE.AnimationClip[] | null = null;
let mixer: THREE.AnimationMixer | null = null;
const clock: THREE.Clock = new THREE.Clock();
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let renderer: THREE.WebGLRenderer | null = null;
let raycaster: THREE.Raycaster | null = null;
let mouse: THREE.Vector2 | null = null;

/** 模型缩放大小 */
let petMateModelConfig = {
    scale: 1,
}
/**
 * model size
 * need it to calculate model width and height.
 */
let modelSize: THREE.Vector3 = new THREE.Vector3();

// 优化
let lastFrameTime = 0;
let fps = 60;

/**
 * 模型当前状态
 */
let currentAction: THREE.AnimationAction | null = null;

/**
 * 模型的动作状态，如果需要组合播放动画，请将这组合动画导致的状态同时设置为true
 */
let modelState: ModelStatus = {
    walk: false,
    dance: false,
    sitting: false,
    standIdle: false,
    sittedIdle: false,
    spyBesideWindow: false,
    dragging: false
}

let defaultModelState: ModelStatus = {
    walk: false,
    dance: false,
    sitting: false,
    standIdle: false,
    sittedIdle: false,
    spyBesideWindow: false,
    dragging: false
}

// 正在坐的窗口名字
// 这个就是由Petmate.vue进行修改的
export let sittedWindowTitle: string = "";

/** 是否显示轮盘菜单栏的flag */
export const isShowContextMenu = ref(false);

/**
 * 模型的走路速度
 */
const walkSpeed: number = 2;

export const usePetmateModel = (threeContainer: Ref<HTMLDivElement>) => {

    const loader = new GLTFLoader();

    /**
     * 初始化模型显示
     * @param screenResolution 模型所在屏幕的分辨率
     * @param screenScaleFactor 屏幕分辨率缩放因子
     * @returns
     */
    const init3D = (screenResolution: {width: number, height: number}, screenScaleFactor: number): Promise<void> => {
        return new Promise((resolve, reject) => {
            resolution = screenResolution;
            scaleFactor = screenScaleFactor;

            scene = new THREE.Scene();
            // 使用实际窗口大小的宽高比，保持与renderer一致
            camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 1, 1000);

            renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: true,
                premultipliedAlpha: false,
                // powerPreference: "low-power" // 优先使用低功耗GPU
            });

            console.log(`window的inner (${window.innerWidth}, ${window.innerHeight})`)
            console.log(`screenResolution (${screenResolution.width}, ${screenResolution.height})`)
            renderer.setSize(window.innerWidth, window.innerHeight);
            // 要完全透明
            renderer.setClearColor(0xffffff, 0);
            threeContainer.value.appendChild(renderer.domElement);
            raycaster = new THREE.Raycaster();
            mouse = new THREE.Vector2();

            // 鼠标移动/按下/松开
            renderer.domElement.addEventListener('mousemove', throttle(onMouseMove, 20), false);
            /**
             * 不要使用contextmenu来触发右键事件，这会导致鼠标按住右键+移动的时候直接卡死
             */
            renderer.domElement.addEventListener('mousedown', onMouseDown, false);
            renderer.domElement.addEventListener('mouseup', onMouseUp, false);

            // 加载模型
            loader.load(modelPath, (gltf) => {
                model = gltf.scene;
                model.position.set(0, -1, 0);
                model.scale.set(petMateModelConfig.scale, petMateModelConfig.scale, petMateModelConfig.scale);
                scene?.add(model);

                camera?.position.set(0, 0, 10)

                // 将物理材质转换成基础材质
                model.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        if (child.material instanceof THREE.Material)
                            console.log(`${JSON.stringify(child.name)}: ${JSON.stringify(child.material.type)}`)
                            const oldMaterial = child.material;
                            const oldColor = oldMaterial.color;
                            const oldMap = oldMaterial.map;
                            const newMaterial = new THREE.MeshBasicMaterial({
                                color: oldColor,
                                map: oldMap,
                                side: oldMaterial.side,
                                alphaTest: oldMaterial.alphaTest,
                                transparent: oldMaterial.transparent
                            });
                            child.material = newMaterial;
                            oldMaterial.dispose();
                    }
                })

                animations = gltf.animations;
                console.log(animations)
                mixer = new THREE.AnimationMixer(model);

                renderer?.setAnimationLoop(animate);

                // 更新相机矩阵，确保投影计算正确
                if (camera) {
                    camera.updateMatrixWorld();
                    camera.updateProjectionMatrix();
                }
                const modelScreenPosition = transferWorldToScreen(model.position, window.innerWidth, window.innerHeight)
                console.log('模型初始位置', JSON.stringify(modelScreenPosition))
                window.api.onResetPetmatePosition((_) => {
                    setModelPosition(new THREE.Vector3(0, -1, 0))
                })

                // 辅助3D开发使用的一些工具
                // if (camera && renderer) orbitControls = new OrbitControls(camera, renderer.domElement);
                // const axesHelper = new THREE.AxesHelper(10);
                // scene?.add(axesHelper);
                // let box = new THREE.Box3().setFromObject(model);
                // let helper = new THREE.Box3Helper(box, new THREE.Color(0, 255, 0));
                // scene?.add(helper)
                resolve();

            }, (event) => {
                console.log(`模型加载${event.loaded / event.total * 100}%`)
            }, (error) => {
                console.log(`加载模型出错${error}`)
                reject(error);
            })
        })
    }

    /**
     * 渲染播放动画
     */
    const animate = () => {
        if (!scene || !camera || !renderer || !model) return;
        if (mixer) mixer.update(clock.getDelta());
        const now = performance.now();
        // 渲染60帧
        const delta = now - lastFrameTime;
        if (delta > 1000 / fps) {
            lastFrameTime = now;
            renderer.render(scene, camera);
        }
    };

    /**
     * 播放动画动作
     * @param action 动画动作
     * @param loop 是否循环播放
     * @param clampWhenFinished 是否停在最后一帧
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

    /**
     * 获取动画动作
     * 如果没找到动画动作就会返回一个undefined
     * @param animationName 动画名字
     * @returns 动画动作 | undefined
     */
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
     * 重置了模型状态和模型所处的窗口
     * @param target 目标位置
     * @param onComplete 完成后的回调函数
     */
    const walkTo = (position: ScreenPosition, onCompleted?: () => void) => {
        if (!model) return ;
        const target: THREE.Vector3 = transferScreenToWorld(position, window.innerWidth, window.innerHeight);
        const distance:number = target.distanceTo(model.position);
        console.log('target screen pos', transferWorldToScreen(target, window.innerWidth, window.innerHeight))
        if (distance < 0.1) return ;

        // 杀死可能存在的位置和旋转动画，避免冲突
        gsap.killTweensOf(model.position);
        gsap.killTweensOf(model.rotation);

        // 先让模型转向
        gsap.to(model.rotation, {
            y: Math.atan2(target.x - model.position.x, target.z - model.position.z),
            duration: 0.1
        });
        let walkAction = getAnimationAction("walk");
        if (!walkAction) walkAction = getAnimationAction("run");
        if (!walkAction) return ;

        // 播放走路动画
        _playAction(walkAction);
        updateModelState({walk: true});
        // 重置一下坐着的窗口
        setSittedWindowTitle("");

        // 计算动画播放时间
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
     */
    const sitted = () => {
        let sit2 = getAnimationAction("sit_2");
        if (!sit2 || !model) return ;
        _playAction(sit2, true);

        updateModelState({sittedIdle: true});
    };

    /**
     * 被拖拽的动画
     */
    const drag = () => {
        let pick1 = getAnimationAction("pick_up_1");
        if (!pick1 || !model) return ;
        _playAction(pick1, true)
        updateModelState({dragging: true});
        setSittedWindowTitle("");
    }

    /**
     * 坐下
     * 这是一整个完整的坐下的动画，因为petmate坐下的动画分成了三段，所以这里需要分段播放，站起来是第三段，这里不需要
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
     * 重置了模型状态和模型所处的窗口
     */
    const standFromSit = () => {
        if (!modelState.sittedIdle) return ;
        let sit3 = getAnimationAction("sit_3");
        if (!sit3) return ;
        _playAction(sit3, false);
        updateModelState({standIdle: true});
        setSittedWindowTitle("");
        const onSit3Finished = () => {
            mixer!.removeEventListener('finished', onSit3Finished);
            standIdle();
        };
        mixer!.addEventListener('finished', onSit3Finished);
    }

    /**
     * 待机动作
     * 重置模型所处窗口
     */
    const standIdle = () => {
        let idleAction = getAnimationAction("idle");
        if (!idleAction || !model) return ;
        _playAction(idleAction, true);
        updateModelState({standIdle: true});
        setSittedWindowTitle("");
        gsap.to(model.rotation, {
            y: 0,
            duration: 0.3
        });
    };

    /**
     * 扶墙偷看
     * 这个先不能用，因为动画还有点问题
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
     * @returns 模型的屏幕坐标
     */
    const getModelScreenPosition = (): ScreenPosition => {
        if (!model) return {x: 0, y: 0};
        return transferWorldToScreen(model.position, window.innerWidth, window.innerHeight);
    }

    // const getModelScreenSize = (): { width: number, height: number } => {
    //     if (!modelSize || !model) throw new Error("请init3D初始化完成了以后再调用该方法");

    //     const modelPosition: THREE.Vector3 = model?.position;


    // }

    /**
     * 设置模型坐的窗口名字
     * @param title 窗口名字
     */
    const setSittedWindowTitle = (title: string) => {
        sittedWindowTitle = title;
    }

    /**
     * 设置模型的世界位置
     * @param position 目标世界位置
     * @returns
     */
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

    /**
     * 鼠标按下
     * 如果鼠标按下的地方是模型的话，需要设置模型的拖拽状态并播放拖拽动画，这会导致原来的动画被强制打断的。
     * 这里会判断一下是鼠标左键按下的还是鼠标右键按下的，如果是左键按下的话，则判断有没有按到模型，如果是右键按下的话，就直接显示菜单
     * @param event 鼠标事件
     * @returns
     */
    function onMouseDown(event: MouseEvent) {
        if (!mouse || !camera || !scene) return ;
        if (event.button !== 0) {
            isShowContextMenu.value = true;
            return ;
        }
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        const hasIntersection = intersects.length > 0;
        // 模型状态变为dragging
        updateModelState({dragging: hasIntersection});
        drag();
    }

    /**
     * 鼠标松开，模型就会待机
     */
    function onMouseUp(event: MouseEvent) {
        if (event.button !== 0) return ;
        updateModelState({dragging: false});
        standIdle();
    }

    /**
     * 鼠标移动事件监听
     * 判断鼠标是否在建模上或者WheelMenu这个组件上，如果鼠标在这两个地方的话，就需要监听鼠标事件，否则不需要监听
     * 目前是利用鼠标射线来判断是否在模型和WheelMenu上
     * @param event 鼠标事件
     */
    function onMouseMove(event: MouseEvent) {
        if (!mouse || !camera || !scene || !model) return ;
        // 将鼠标位置归一化为设备坐标 (-1 to +1)
        mouse.x = (event.offsetX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.offsetY / window.innerHeight) * 2 + 1;
        // console.log("鼠标移动")

        // 先检测有没有按到菜单UI
        const element = document.elementFromPoint(event.clientX, event.clientY);

        // 这个可能没有用，因为只能检测到画布目前，因为菜单的z轴是1000
        const inUI = checkOnUI(element);
        if (inUI) {
            // window.api.setIgnoreMouseEvents(false);
            // 如果鼠标移动到了UI上的话，需要响应鼠标事件的
            window.api.setIgnoreMouseEvents(false);
            return ;
        }

        // 检测是否与3D对象相交
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        const hasIntersection = intersects.length > 0;

        // console.log(`点到3D对象了么？: ${hasIntersection} 鼠标位置: ${mouse.x}, ${mouse.y}`)
        // console.log(`模型位置: ${model?.position.x}, ${model?.position.y}`)
        // console.log(`${event.clientX * scaleFactor}, ${event.clientY * scaleFactor}`)

        // 通知主进程是否忽略鼠标事件
        window.api.setIgnoreMouseEvents(!hasIntersection);
        if (modelState.dragging) {
            // 说明被拖拽了，需要 * scaleFactor才可以拿到绝对位置
            model.position.copy(transferScreenToWorld({x: event.clientX * scaleFactor, y: event.clientY * scaleFactor}, window.innerWidth, window.innerHeight));
        }
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

/**
 * 将屏幕坐标转换为世界坐标
 * @param screenPosition 待转换的屏幕坐标 （基于分辨率的坐标）
 * @param width 分辨率 x
 * @param height 分辨率 y
 * @returns 世界坐标
 */
export function transferScreenToWorld(screenPosition: ScreenPosition, width: number, height: number): THREE.Vector3 {
    if (!renderer || !camera || !model) {
        console.warn('Renderer or camera not initialized');
        return new THREE.Vector3(0, 0, 0);
    }

    // 先转换成画布坐标
    const screenX = screenPosition.x / scaleFactor;
    const screenY = screenPosition.y / scaleFactor;

    const coords = new THREE.Vector2(
        (screenX / width) * 2 - 1,
        -(screenY / height) * 2 + 1,
    )
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(coords, camera);

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

/**
 * 将世界坐标转换为屏幕坐标
 * @param worldPosition 待转换的世界坐标
 * @param width 画布的宽window.innerWidth
 * @param height 画布的高window.innerHeight
 * @returns
 */
export function transferWorldToScreen(worldPosition: THREE.Vector3, width: number, height: number): ScreenPosition {
    if (!camera) return {x: width / 2, y: height / 2};
    const vector: THREE.Vector3 = worldPosition.clone();
    vector.project(camera);
    const screenX = (vector.x + 1) * width / 2;
    const screenY = (1 - vector.y) * height / 2;
    return {x: screenX * scaleFactor, y: screenY * scaleFactor};
}

/**
 * 判断element元素是否是可以穿透的UI element
 * 目前可以穿透的UI是radial-menu-overlay（WheelMenu的class名字）
 * @param element html元素
 * @returns 是否在UI上
 */
function checkOnUI(element: Element | null): boolean {
    if (!element) return false;
    const className = element.className || '';
    if (className.includes('context-menu') ||
        element.closest('.context-menu')) {
        return true;
    }
    return false
}
