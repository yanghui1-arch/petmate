<template>
    <div 
      v-if="isOpen" 
      class="radial-menu-overlay" 
      @click="closeMenu"
      @keydown="handleKeydown"
      tabindex="0"
      ref="overlayRef"
    >
      <div class="radial-menu-container" @click.stop>
        <svg class="radial-menu-svg" :class="{ 'closing': isClosing }" :width="size" :height="size" ref="svgRef">
          
          <!-- Center circle -->
          <circle
            :cx="center"
            :cy="center"
            :r="centerButtonRadius"
            class="center-circle-transparent"
            @click="handleCenterClick"
          />
          
          <!-- Menu items -->
          <g v-for="(item, index) in currentMenu" :key="`${menuLevel}-${index}`">
            <!-- Sector path -->
            <path
              :d="getSectorPath(index)"
              :class="['menu-sector', { 
                'selected': selectedIndex === index
              }]"
              :style="{ 
                '--final-angle': `${(index * 360 / currentMenu.length)}deg`,
                '--animation-delay': `${index * 0.08}s`,
                '--sector-index': index,
                '--total-sectors': currentMenu.length,
                '--close-delay': `${(currentMenu.length - index - 1) * 0.06}s`
              }"
              @click="selectItem(item, index)"
              @mouseenter="setSelected(index)"
            />
            
  
            
            <!-- Label -->
            <text
              :x="getItemPosition(index).x"
              :y="getItemPosition(index).y"
              class="menu-label"
              :class="{ 'selected': selectedIndex === index }"
              :style="{ 
                '--final-angle': `${(index * 360 / currentMenu.length)}deg`,
                '--animation-delay': `${index * 0.08 + 0.2}s`,
                '--sector-index': index,
                '--total-sectors': currentMenu.length,
                '--close-delay': `${(currentMenu.length - index - 1) * 0.06 + 0.08}s`
              }"
              text-anchor="middle"
              dominant-baseline="central"
            >
              {{ item.title }}
            </text>
            
          </g>
          
          <!-- Center icon/text -->
          <text
            :x="center"
            :y="center"
            class="center-text"
            text-anchor="middle"
            dominant-baseline="central"
            @click="handleCenterClick"
          >
            {{ centerText }}
          </text>
        </svg>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, computed, onMounted, nextTick } from 'vue'
  
  interface MenuItem {
    id: string
    title: String
    action?: () => void
  }
  
  // Props
  interface Props {
    menuItems?: MenuItem[]
    size?: number
    closeOnClick?: boolean
  }
  
  const props = withDefaults(defineProps<Props>(), {
    size: 300,
    closeOnClick: true
  })
  
  // Emits
  const emit = defineEmits<{
    clicked: [item: MenuItem]
    opened: []
    closed: []
  }>()
  
  // Reactive state
  const isOpen = ref(false)
  const isClosing = ref(false)
  const selectedIndex = ref(0)
  const menuLevel = ref(0)
  const menuStack = ref<MenuItem[][]>([])
  const overlayRef = ref<HTMLElement>()
  const svgRef = ref<SVGElement>()
  
  // Sample menu items with nested structure
  const defaultMenuItems: MenuItem[] = [
    {
      id: 'home',
      title: '主页',
      action: () => window.api.openNewWindow('/home')
    },
    {
      id: 'shop',
      title: '商店',
      action: () => window.api.openNewWindow('/shop')
    },
    {
      id: 'settings',
      title: '设置',
      action: () => window.api.openNewWindow('/settings')
    },
    {
      id: 'config',
      title: '模型配置',
      action: () => window.api.openNewWindow('/config')
    },
    {
      id: 'tutorial',
      title: '操作教程',
    },
    {
      id: 'quit',
      title: '退出Petmate',
      action: () => window.api.quitApp()
    }
  ]
  
  // Computed properties
  const menuItems = computed(() => props.menuItems || defaultMenuItems)
  const currentMenu = computed(() => menuStack.value[menuLevel.value] || menuItems.value)
  const center = computed(() => props.size / 2)
  const outerRadius = computed(() => props.size / 4)
  const innerRadius = computed(() => props.size / 8)
  const centerButtonRadius = computed(() => props.size / 8)
  
  const centerText = computed(() => {
    if (menuLevel.value === 0) return '✕'
    return '←'
  })
  
  // Methods
  const getSectorPath = (index: number) => {
    const itemCount = currentMenu.value.length
    const angleStep = (2 * Math.PI) / itemCount
    // Remove the gap angle calculation - we'll use stroke for uniform gaps
    const startAngle = index * angleStep - Math.PI / 2
    const endAngle = startAngle + angleStep
    
    const x1 = center.value + innerRadius.value * Math.cos(startAngle)
    const y1 = center.value + innerRadius.value * Math.sin(startAngle)
    const x2 = center.value + outerRadius.value * Math.cos(startAngle)
    const y2 = center.value + outerRadius.value * Math.sin(startAngle)
    
    const x3 = center.value + outerRadius.value * Math.cos(endAngle)
    const y3 = center.value + outerRadius.value * Math.sin(endAngle)
    const x4 = center.value + innerRadius.value * Math.cos(endAngle)
    const y4 = center.value + innerRadius.value * Math.sin(endAngle)
    
    const largeArc = angleStep > Math.PI ? 1 : 0
    
    return `M ${x1} ${y1} L ${x2} ${y2} A ${outerRadius.value} ${outerRadius.value} 0 ${largeArc} 1 ${x3} ${y3} L ${x4} ${y4} A ${innerRadius.value} ${innerRadius.value} 0 ${largeArc} 0 ${x1} ${y1} Z`
  }
  
  const getItemPosition = (index: number) => {
    const itemCount = currentMenu.value.length
    const angleStep = (2 * Math.PI) / itemCount
    const angle = (index * angleStep) + (angleStep / 2) - Math.PI / 2
    const radius = (innerRadius.value + outerRadius.value) / 2 // 精确居中在 sector 中间
    
    return {
      x: center.value + radius * Math.cos(angle),
      y: center.value + radius * Math.sin(angle)
    }
  }
  
  const setSelected = (index: number) => {
    selectedIndex.value = index
  }
  
  const selectItem = (item: MenuItem, index: number) => {
    selectedIndex.value = index
    if (item.action) {
        item.action()
    }
    emit('clicked', item)
    if (props.closeOnClick) {
        closeMenu()
    }
}
  
  const handleCenterClick = () => {
    closeMenu()
    console.log("关闭了选项")
  }
  
  const handleKeydown = (event: KeyboardEvent) => {
    const itemCount = currentMenu.value.length
    
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault()
        selectedIndex.value = (selectedIndex.value - 1 + itemCount) % itemCount
        break
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault()
        selectedIndex.value = (selectedIndex.value + 1) % itemCount
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        selectItem(currentMenu.value[selectedIndex.value], selectedIndex.value)
        break
      case 'Escape':
      case 'Backspace':
        event.preventDefault()
        if (menuLevel.value > 0) {
          handleCenterClick()
        } else {
          closeMenu()
        }
        break
    }
  }
  
  const openMenu = () => {
    isOpen.value = true
    isClosing.value = false
    menuLevel.value = 0
    menuStack.value = []
    selectedIndex.value = 0
    emit('opened')
    
    nextTick(() => {
      overlayRef.value?.focus()
    })
  }
  
  const closeMenu = () => {
    isClosing.value = true
    
    // Calculate total animation time based on number of sectors
    const totalAnimationTime = (currentMenu.value.length * 0.06 + 0.3) * 1000
    
    setTimeout(() => {
      isOpen.value = false
      isClosing.value = false
      menuLevel.value = 0
      menuStack.value = []
      selectedIndex.value = 0
      emit('closed')
    }, totalAnimationTime)
  }
  
  // Expose methods for parent component
  defineExpose({
    open: openMenu,
    close: closeMenu
  })
  
  // Auto-open for demo
  onMounted(() => {
    openMenu()
  })
  </script>
  
  <style lang="scss" scoped>
  
  .radial-menu-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: transparent;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    outline: none;
    -webkit-app-region: no-drag;
  }
  
  .radial-menu-container {
    position: relative;
  }
  
  .radial-menu-svg {
    overflow: visible;
  }
  
  // Transparent center circle
    .center-circle-transparent {
    fill: transparent;
    stroke-width: 2;
    cursor: pointer;
    transition: all 0.2s ease;
    animation: centerAppear 0.3s ease-out forwards;
    animation-delay: 0.1s;
    opacity: 0;
    transform: scale(0.5);
    transform-origin: center;
  }
  
  // Center circle
  .center-circle {
    fill: rgba(180, 140, 90, 1);
    stroke: rgba(180, 140, 90, 1);
    stroke-width: 2;
    cursor: pointer;
    transition: all 0.2s ease;
    animation: centerAppear 0.3s ease-out forwards;
    animation-delay: 0.1s;
    opacity: 0;
    transform: scale(0.5);
    transform-origin: center;
    
    &:hover {
      fill: rgba(190, 200, 215, 1);;
    }
  }
  
  // Menu sectors - Sequential opening animation
  .menu-sector {
    fill: rgba(94, 80, 80, 0.7);
    stroke: rgba(245, 248, 250, 0.95); // Same as background color
    stroke-width: 2; // This creates the uniform gap
    cursor: pointer;
    transition: all 0.2s ease;
    transform-origin: center;
    animation: sectorOpen 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    animation-delay: var(--animation-delay);
    opacity: 0;
    transform: scale(0) rotate(-90deg);
    
    &:hover,
    &.selected {
        fill: rgba(75, 85, 99, 0.9);
        stroke: rgba(245, 248, 250, 0.95);
        stroke-width: 2;
    }
  }
  
  // Sequential opening animations
  @keyframes sectorOpen {
    0% {
      opacity: 0;
      transform: scale(0) rotate(-90deg);
    }
    50% {
      opacity: 0.7;
      transform: scale(0.8) rotate(-20deg);
    }
    100% {
      opacity: 1;
      transform: scale(1) rotate(0deg);
    }
  }
  
  @keyframes backgroundAppear {
    0% {
      opacity: 0;
      transform: scale(0.3);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  @keyframes centerAppear {
    0% {
      opacity: 0;
      transform: scale(0.5);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  // Sequential closing animations
  .closing .menu-sector {
    animation: sectorClose 0.4s ease-in forwards;
    animation-delay: var(--close-delay);
  }
  
  .closing .menu-label {
    animation: contentClose 0.3s ease-in forwards;
    animation-delay: var(--close-delay);
  }
  
  .closing .submenu-indicator {
    animation: contentClose 0.3s ease-in forwards;
    animation-delay: var(--close-delay);
  }
  
  .closing .center-text {
    animation: contentClose 0.2s ease-in forwards;
    animation-delay: 0s;
  }

  .closing .center-circle-transparent {
    animation: contentClose 0.25s ease-in forwards;
    animation-delay: 0.05s;
  }
  
  .closing .menu-background {
    animation: backgroundClose 0.3s ease-in forwards;
    animation-delay: 0.15s;
  }
  
  @keyframes sectorClose {
    0% {
      opacity: 1;
      transform: scale(1) rotate(0deg);
    }
    50% {
      opacity: 0.5;
      transform: scale(0.6) rotate(30deg);
    }
    100% {
      opacity: 0;
      transform: scale(0) rotate(90deg);
    }
  }
  
  @keyframes contentClose {
    0% {
      opacity: 1;
      transform: scale(1);
    }
    100% {
      opacity: 0;
      transform: scale(0.3);
    }
  }
  
  @keyframes backgroundClose {
    0% {
      opacity: 1;
      transform: scale(1);
    }
    100% {
      opacity: 0;
      transform: scale(0.3);
    }
  }
  
  // Menu icons
  .menu-icon {
    font-size: 18px;
    fill: rgb(255, 255, 255);;
    font-weight: bold;
    transition: all 0.2s ease;
    pointer-events: none;
    animation: contentAppear 0.4s ease-out forwards;
    animation-delay: var(--animation-delay);
    opacity: 0;
    transform: scale(0.5);
    text-anchor: middle;
    dominant-baseline: middle;
    
    &.selected {
      fill: (255, 255, 255, 1);;
      font-size: 20px;
    }
  }
  
  // Menu labels - now centered in sectors
  .menu-label {
    font-size: 16px;
    font-weight: 600;
    fill: rgb(252, 252, 252);;
    font-family: 'Arial', sans-serif;
    transition: all 0.2s ease;
    pointer-events: none;
    animation: contentAppear 0.4s ease-out forwards;
    animation-delay: var(--animation-delay);
    opacity: 0;
    transform: scale(0.5);
    text-anchor: middle;
    dominant-baseline: middle;
    
    &.selected {
      fill: (255, 255, 255, 1);;
      font-size: 14px;
      font-weight: 700;
    }
  }
  
  @keyframes contentAppear {
    0% {
      opacity: 0;
      transform: scale(0.5);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  // Submenu indicators
  .submenu-indicator {
    fill: rgba(250, 180, 90, 1);;
    stroke: rgba(180, 140, 90, 1);;
    stroke-width: 1;
    transition: all 0.2s ease;
    animation: contentAppear 0.4s ease-out forwards;
    animation-delay: var(--animation-delay);
    opacity: 0;
    transform: scale(0.5);
    
    &.selected {
      fill: (255, 255, 255, 1);;
      stroke: rgba(240, 100, 100, 1);;
      stroke-width: 1.5;
    }
  }
  
  // Center text
  .center-text {
    font-size: 16px;
    font-weight: bold;
    fill: rgb(92, 71, 45);;
    text-anchor: middle;
    dominant-baseline: central;
    cursor: pointer;
    transition: all 0.2s ease;
    pointer-events: all;
    animation: contentAppear 0.3s ease-out forwards;
    animation-delay: 0.2s;
    opacity: 0;
    transform: scale(0.5);
    
    &:hover {
      fill: rgba(190, 200, 215, 1);;
      font-size: 26px;
    }
  }
  
  // Keyboard navigation visual feedback
  .radial-menu-overlay:focus-visible {
    outline: none;
  }
  
  // Responsive design
  @media (max-width: 768px) {
    .menu-label {
      font-size: 10px;
    }
    
    .menu-icon {
      font-size: 16px;
      
      &.selected {
        font-size: 18px;
      }
    }
  }
  
  // Reduced motion support
  @media (prefers-reduced-motion: reduce) {
    .radial-menu-container,
    .menu-sector,
    .menu-icon,
    .menu-label,
    .submenu-indicator,
    .center-text,
    .center-circle,
    .menu-background {
      animation: none !important;
      transition: none;
      opacity: 1 !important;
      transform: none !important;
    }
  }
  </style>