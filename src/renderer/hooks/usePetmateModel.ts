import * as THREE from 'three'
import gsap from 'gsap'
import { ref } from 'vue'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { ModelStatus } from '../types/model'



export let modelStatus: ModelStatus = {
    walk: false,
    jump: false,
    dance: false,
    sitting: false,
    standIdle: false,
    sittedIdle: false,
}

/**
 * 这个默认模型状态是用于设置模型状态用的，不可以随便改变的，否则可能看到两个动画一起动
 */
const defaultModelStatus: ModelStatus = {
    walk: false,
    jump: false,
    dance: false,
    sitting: false,
    standIdle: false,
    sittedIdle: false,
}


export const usePetmateModel = (threeContainer: Ref<HTMLDivElement>) => {
    let model: THREE.Group | null = null;
    let animations: THREE.AnimationClip[] | null = null;
    let mixer: THREE.AnimationMixer | null = null;
    const clock: THREE.Clock = new THREE.Clock();
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let directionalLight: THREE.DirectionalLight | null = null;
    let ambientLight: THREE.AmbientLight | null = null;
    let renderer: THREE.WebGLRenderer | null = null;

    // 开发辅助用的
    let orbitControls: OrbitControls | null = null;

    const loader = new GLTFLoader();

    const init3D = (): Promise<void> => {
        return new Promise((resolve, reject) => {
            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.set(0, 1, 5);
            renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: false,
                premultipliedAlpha: false
            });

            renderer.setSize(window.innerWidth, window.innerHeight);
            // 要完全透明
            renderer.setClearColor(0xffffff, 0);
            threeContainer.value.appendChild(renderer.domElement);
            
            ambientLight = new THREE.AmbientLight(0x404040, 1);
            directionalLight = new THREE.DirectionalLight(0xffffff, 6);
            directionalLight.position.set(-10, 5, 10);

            // 加载模型
            loader.load('../assets/models/3333.glb', (gltf) => {
                model = gltf.scene;
                model.position.set(0, 0, 0);
                scene?.add(model);
                animations = gltf.animations;
                console.log(animations)
                mixer = new THREE.AnimationMixer(model);
                
                scene?.add(ambientLight!);
                scene?.add(directionalLight!);

                renderer?.setAnimationLoop(animate);
                resolve();

            }, (event) => {
                console.log(`模型加载${event.loaded / event.total * 100}%`)
            }, (error) => {
                console.log(`加载模型出错${error}`)
                reject(error);
            })

            orbitControls = new OrbitControls(camera, renderer.domElement);
        })
    }

    const animate = () => {
        if (!scene || !camera || !renderer) return;
        if (mixer) mixer.update(clock.getDelta());

        if (modelStatus.jump) {
            _playAnimation("jump Bip001|Take 001|BaseLayer");
            modelStatus.jump = false;
        }

        renderer.render(scene, camera);
    };


    /**
     * 播放动画
     * 这个方法只有在animate中进行调用，别的地方就不要调用这个方法了，如果想让模型播放待机动画，只需要改变modelStatus，将其设置为true即可，同时不要忘了将其他的设置为false，否则会多个动作一起动
     * 动画名称是模糊查找，即如果动画名称中包含animationName，就可以找得到这个动画的
     * @param animationName 动画名称
     * @param loop 是否循环播放
     */
    const _playAnimation = (animationName: string, loop: boolean = false) => {
        if (!animations || !mixer || !model) return;
        const animationClip: THREE.AnimationClip | undefined = animations?.find(animation => animation.name === animationName);
        if (!animationClip) return;
        const action = mixer.clipAction(animationClip);
        action.play();
        action.loop = loop ? THREE.LoopRepeat : THREE.LoopOnce;
        action.clampWhenFinished = true;
        action.reset();
    };

    const walkTo = (target: THREE.Vector3, duration: number = 1) => {
        if (!model) return ;
        setModelStatus({walk: true});
        gsap.to(model.position, {
            x: target.x,
            y: target.y,
            z: target.z,
            duration: duration,
            onUpdate: () => {
                console.log(model?.position)
            }
        });
    };

    const jumpTo = (target:THREE.Vector3, duration?:number) => {
        if (!model || !animations) return ;

        const jumpAnimationClip = animations.find(animation => animation.name.includes("jump"));
        if (!jumpAnimationClip) return;
        const animationDuration = duration ?? jumpAnimationClip.duration;
        _playAnimation("jump Bip001|Take 001|BaseLayer");

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
     * 设置模型状态
     * 这个方法不可以暴露出去！切记切记！
     * @param status 状态
     */
    const setModelStatus = (status: Partial<ModelStatus>) => {
        modelStatus = {...defaultModelStatus, ...status}
    }


    return {
        init3D,
        walkTo,
        jumpTo
    }
}