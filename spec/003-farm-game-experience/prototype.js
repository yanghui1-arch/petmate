;(() => {
    'use strict'
    const $ = (selector) => document.querySelector(selector)
    const crops = [
        {
            id: 'wheat',
            name: '小麦',
            minutes: 30,
            price: 4,
            yield: 3,
            sell: 2,
            exp: 2,
            level: 1,
            description: '金色麦穗随风摇摆，适合短暂休息时照料。'
        },
        {
            id: 'carrot',
            name: '胡萝卜',
            minutes: 120,
            price: 10,
            yield: 3,
            sell: 6,
            exp: 8,
            level: 1,
            description: '把清甜藏进泥土里，等待一篮橙色的收获。'
        },
        {
            id: 'potato',
            name: '土豆',
            minutes: 240,
            price: 20,
            yield: 4,
            sell: 9,
            exp: 16,
            level: 2,
            description: '朴实的小土豆，总能带来踏实的收成。'
        },
        {
            id: 'tomato',
            name: '番茄',
            minutes: 360,
            price: 30,
            yield: 4,
            sell: 14,
            exp: 24,
            level: 3,
            description: '绿叶里藏着红彤彤的果实，是小镇厨房的最爱。'
        },
        {
            id: 'strawberry',
            name: '草莓',
            minutes: 480,
            price: 40,
            yield: 5,
            sell: 15,
            exp: 32,
            level: 4,
            description: '耐心等待，就能收获甜甜的小草莓。'
        },
        {
            id: 'pumpkin',
            name: '南瓜',
            minutes: 720,
            price: 60,
            yield: 3,
            sell: 38,
            exp: 48,
            level: 5,
            description: '圆滚滚的南瓜，适合睡一觉后回来收获。'
        }
    ]
    const levels = [0, 40, 160, 420, 900, 1700, 2900, 4500, 6600, 9300]
    const positions = Array.from({ length: 12 }, (_, id) => ({
        x: 665 + (id % 4) * 168 - Math.floor(id / 4) * 168,
        y: 425 + (id % 4) * 60 + Math.floor(id / 4) * 60
    }))
    // Place the live field inside the reference background's surrounding path.
    // Apply the same transform to field art, hit areas, and action effects.
    const fieldFrame = { scale: 0.9, x: 130, y: 37.5 }
    let state,
        modal = null,
        tab = 'seeds',
        seedTarget = null,
        hoverId = null,
        hoverTimer = null,
        toastTimer = null
    let sound = false,
        audio = null,
        lastFocused = null
    const pending = new Set()
    let revision = 0
    const cropById = (id) => crops.find((crop) => crop.id === id)
    const level = () => Math.max(1, levels.findLastIndex((threshold) => state.exp >= threshold) + 1)
    const unlocked = () => (level() >= 5 ? 12 : level() >= 3 ? 9 : 6)
    const stage = (plant) => {
        if (!plant) return -1
        const progress = Math.min(1, Math.max(0, 1 - (plant.endAt - Date.now()) / plant.duration))
        return progress >= 1 ? 3 : progress >= 0.5 ? 2 : progress >= 0.1 ? 1 : 0
    }
    const clock = (milliseconds) => {
        const seconds = Math.max(0, Math.ceil(milliseconds / 1000))
        if (seconds < 60) return `${seconds} 秒`
        const minutes = Math.ceil(seconds / 60)
        return minutes >= 60
            ? `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分钟`
            : `${minutes} 分钟`
    }
    // Measured atlas regions: generated artwork has uneven row padding.
    // Crop each CSS background to its artwork region, avoiding adjacent-cell bleed.
    const atlasRegion = (x, y, width, height, file = 'farm-atlas.png') =>
        `background-image:url('assets/${file}');background-size:${100 / width}% ${100 / height}%;background-position:${(x * 100) / (1 - width)}% ${height === 1 ? 0 : (y * 100) / (1 - height)}%`
    const objectStyle = (id) =>
        id === 'soil'
            ? atlasRegion(0.003, 0.023, 0.243, 0.127)
            : id === 'grass'
              ? atlasRegion(0.252, 0.018, 0.247, 0.129)
              : id === 'barrel'
                ? atlasRegion(0.55, 0.002, 0.161, 0.143)
                : atlasRegion(0.766, 0.007, 0.23, 0.144)
    const cropArt = window.FarmCropArt.icon
    const iconFrames = [
        [16, 16, 348, 390],
        [380, 40, 330, 352],
        [741, 56, 342, 340],
        [1111, 72, 332, 331],
        [38, 445, 293, 289],
        [374, 419, 360, 312],
        [774, 439, 286, 295],
        [1120, 429, 313, 295],
        [10, 770, 310, 267],
        [410, 743, 323, 280],
        [780, 761, 264, 299],
        [1084, 741, 351, 305]
    ]
    const iconSvg = (id) => {
        const [x, y, w, h] = iconFrames[id]
        return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><svg width="${w}" height="${h}" overflow="hidden"><image href="assets/farm-icons.png" x="${-x}" y="${-y}" width="1448" height="1086"/></svg></svg>`
    }
    const iconArt = (id, extra = '') =>
        `<span class="ui-art ${extra}" aria-hidden="true">${iconSvg(id)}</span>`
    const lockSvg =
        '<svg viewBox="0 0 22 25" aria-hidden="true"><path d="M6 10V7a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" stroke-width="3"/><rect x="2" y="10" width="18" height="13" rx="4" fill="currentColor"/><path d="M11 14v5" stroke="#fff2ce" stroke-width="2"/></svg>'
    const scenePoint = (point) => {
        const r = $('#world').getBoundingClientRect()
        return {
            x: r.x + ((fieldFrame.x + point.x * fieldFrame.scale) * r.width) / 1600,
            y: r.y + ((fieldFrame.y + point.y * fieldFrame.scale) * r.height) / 900
        }
    }
    const orderReady = (order) =>
        !order.deliveredAt &&
        Object.entries(order.needs).every(([id, count]) => state.produce[id] >= count)
    function initialState() {
        const now = Date.now(),
            plant = (id, remaining, watered = false) => ({
                id,
                duration: cropById(id).minutes * 60000,
                endAt: now + remaining * 60000,
                watered
            })
        return {
            cash: 702,
            exp: 240,
            tutorial: 3,
            seeds: { wheat: 12, carrot: 8, potato: 5, tomato: 3, strawberry: 0, pumpkin: 0 },
            produce: { wheat: 1, carrot: 0, potato: 0, tomato: 0, strawberry: 0, pumpkin: 0 },
            harvests: { wheat: 3, carrot: 0, potato: 0, tomato: 0, strawberry: 0, pumpkin: 0 },
            plots: [
                plant('wheat', -1),
                plant('carrot', -1),
                plant('wheat', 14),
                null,
                plant('tomato', 128, true),
                plant('potato', -1),
                plant('carrot', 84),
                null,
                plant('tomato', -1),
                null,
                null,
                null
            ],
            orders: [
                {
                    id: 1,
                    title: '晨间的第一篮收获',
                    needs: { wheat: 3, carrot: 3 },
                    cash: 30,
                    exp: 30
                },
                { id: 2, title: '小镇厨房的补给', needs: { potato: 4 }, cash: 45, exp: 30 },
                { id: 3, title: '甜甜的番茄酱', needs: { tomato: 4, wheat: 3 }, cash: 78, exp: 55 }
            ]
        }
    }
    function resize() {
        const scale = Math.max(innerWidth / 1600, innerHeight / 900)
        document.documentElement.style.setProperty('--scale', String(scale))
        hideHover()
        closeSeedPicker()
    }
    function updateHud() {
        $('#cash').textContent = state.cash.toLocaleString('zh-CN')
        const current = level(),
            lower = levels[current - 1],
            upper = levels[current] ?? lower
        $('#level-number').textContent = current
        $('#exp-text').textContent =
            upper > lower ? `${state.exp - lower}/${upper - lower}` : '已达最高等级'
        $('#exp-fill').style.width =
            `${upper > lower ? Math.min(100, ((state.exp - lower) / (upper - lower)) * 100) : 100}%`
        const ready = state.orders.filter(orderReady).length
        $('#order-badge').hidden = !ready
        $('#order-badge').textContent = ready
        $('#orders').setAttribute('aria-label', `农场订单${ready ? `，${ready}份可交付` : ''}`)
    }
    function buildPlots() {
        const { scale, x, y } = fieldFrame
        $('#plots').style.transform = `matrix(${scale},0,0,${scale},${x},${y})`
        $('#crop-layer').style.transform = `matrix(${scale},0,0,${scale},${x},${y})`
        $('#crop-layer').replaceChildren()
        $('#plot-targets').setAttribute('transform', `matrix(${scale} 0 0 ${scale} ${x} ${y})`)
        $('#plots').innerHTML = positions
            .map(
                (p, id) =>
                    `<div id="plot-${id}" class="plot-visual" style="left:${p.x}px;top:${p.y}px;z-index:${Math.round(p.y)}"><span class="atlas-art plot-bed"></span><span class="ready-glint" hidden>✦</span><span class="plot-lock" hidden>${lockSvg}<span></span></span></div>`
            )
            .join('')
        $('#plot-targets').innerHTML = positions
            .map(
                (p, id) =>
                    `<polygon id="hit-${id}" class="plot-hit" data-plot="${id}" points="${window.FarmCropArt.footprint.map((corner) => `${p.x + corner.x},${p.y + corner.y}`).join(' ')}" tabindex="0" role="button" aria-label="地块 ${id + 1}"/>`
            )
            .join('')
        document.querySelectorAll('.plot-hit').forEach((node) => {
            const id = Number(node.dataset.plot)
            node.addEventListener('pointerenter', (event) => hoverPlot(id, event))
            node.addEventListener('pointermove', (event) => moveCursor(id, event))
            node.addEventListener('pointerleave', () => hideHover())
            node.addEventListener('focus', () => hoverPlot(id, null))
            node.addEventListener('blur', () => hideHover())
            node.addEventListener('click', () => clickPlot(id))
            node.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    clickPlot(id)
                }
            })
        })
    }
    function updatePlots() {
        state.plots.forEach((plant, id) => {
            const root = $(`#plot-${id}`),
                locked = id >= unlocked(),
                phase = stage(plant),
                bed = root.querySelector('.plot-bed'),
                target = $(`#hit-${id}`)
            bed.style.cssText = objectStyle(locked ? 'grass' : 'soil')
            const key = plant && !locked ? `${plant.id}:${phase}` : ''
            if (root.dataset.cropKey !== key) {
                document
                    .querySelectorAll(`.crop-root[data-plot="${id}"]`)
                    .forEach((node) => node.remove())
                if (key) {
                    const point = positions[id]
                    $('#crop-layer').insertAdjacentHTML(
                        'beforeend',
                        window.FarmCropArt.slots
                            .map((slot, index) =>
                                window.FarmCropArt.plant(
                                    plant.id,
                                    phase,
                                    point.x + slot.x,
                                    point.y + slot.y,
                                    id,
                                    index
                                )
                            )
                            .join('')
                    )
                }
                root.dataset.cropKey = key
            }
            root.classList.toggle('mature', !locked && phase === 3)
            root.classList.toggle('watered', !!plant?.watered && !locked)
            root.classList.toggle('is-pending', pending.has(id))
            target.classList.toggle('is-pending', pending.has(id))
            root.querySelector('.ready-glint').hidden = locked || phase !== 3
            root.querySelector('.plot-lock').hidden = !locked
            root.querySelector('.plot-lock span').textContent = `Lv.${id >= 9 ? 5 : 3}`
            target.setAttribute(
                'aria-label',
                locked
                    ? `地块 ${id + 1}，等级 ${id >= 9 ? 5 : 3} 解锁`
                    : plant
                      ? `${cropById(plant.id).name}，${phase === 3 ? '可收获' : plant.watered ? '已浇水' : '可浇水'}`
                      : `空地 ${id + 1}，选择种子`
            )
            target.style.cursor = locked || (plant?.watered && phase !== 3) ? 'default' : 'none'
            document.querySelectorAll(`.crop-root[data-plot="${id}"]`).forEach((node) => {
                node.classList.toggle('mature', phase === 3)
                node.classList.toggle('is-pending', pending.has(id))
                node.classList.toggle('just-planted', root.classList.contains('just-planted'))
                const art = node.querySelector('.crop-art')
                art.style.cursor = target.style.cursor
                art.style.pointerEvents = pending.has(id) ? 'none' : 'auto'
            })
        })
        if (hoverId !== null && !$('#tooltip').hidden) fillTooltip(hoverId)
    }
    function hideHover() {
        clearTimeout(hoverTimer)
        hoverTimer = null
        if (hoverId !== null) {
            $(`#plot-${hoverId}`)?.classList.remove('is-hovered')
            $(`#hit-${hoverId}`)?.classList.remove('is-hovered')
        }
        hoverId = null
        $('#tooltip').hidden = true
        $('#cursor').hidden = true
    }
    function hoverPlot(id, event) {
        hideHover()
        if (modal || seedTarget !== null) return
        hoverId = id
        $(`#plot-${id}`).classList.add('is-hovered')
        $(`#hit-${id}`).classList.add('is-hovered')
        if (event) moveCursor(id, event)
        hoverTimer = setTimeout(() => {
            if (hoverId !== id || modal || seedTarget !== null) return
            fillTooltip(id)
            $('#tooltip').hidden = false
            positionFloating($('#tooltip'), $(`#hit-${id}`).getBoundingClientRect(), false)
        }, 250)
    }
    function fillTooltip(id) {
        const plant = state.plots[id],
            locked = id >= unlocked(),
            content = locked
                ? `<strong>尚未开垦的土地</strong><span class="muted">农场达到 Lv.${id >= 9 ? 5 : 3} 免费开放</span>`
                : !plant
                  ? '<strong>空闲的田地</strong><span class="muted">可以开始新一轮种植</span>'
                  : (() => {
                        const crop = cropById(plant.id),
                            phase = stage(plant),
                            progress = Math.min(
                                100,
                                Math.max(0, (1 - (plant.endAt - Date.now()) / plant.duration) * 100)
                            )
                        return `<strong>${crop.name}</strong>${phase === 3 ? `<span class="ready">可收获 ×${crop.yield}</span>` : `<div class="detail-line"><span>${['已播种', '幼苗', '生长中'][phase]}</span><span>${clock(plant.endAt - Date.now())}</span></div><div class="mini-progress"><i style="width:${progress}%"></i></div><div class="detail-line"><span>预计收成 ×${crop.yield}</span><span>${plant.watered ? '已浇水' : '可浇水'}</span></div>`}`
                    })()
        $('#tooltip').innerHTML = content
    }
    function moveCursor(id, event) {
        if (modal || seedTarget !== null || event.pointerType === 'touch') return
        const node = $('#cursor'),
            plant = state.plots[id],
            locked = id >= unlocked(),
            index = !plant ? 8 : stage(plant) === 3 ? 7 : 9
        node.firstElementChild.className = ''
        node.firstElementChild.innerHTML = locked
            ? `<span class="lock-cursor">${lockSvg}</span>`
            : iconArt(index)
        node.hidden = locked || (!!plant?.watered && stage(plant) !== 3)
        if (!node.hidden) {
            const hotspots = {
                    7: [40 / 313, 276 / 295],
                    8: [295 / 310, 250 / 267],
                    9: [23 / 323, 154 / 280]
                },
                [hx, hy] = hotspots[index],
                [, , w, h] = iconFrames[index],
                scale = 42 / Math.max(w, h)
            node.style.width = `${w * scale}px`
            node.style.height = `${h * scale}px`
            node.style.left = `${event.clientX - hx * w * scale}px`
            node.style.top = `${event.clientY - hy * h * scale}px`
        }
    }
    function positionFloating(node, bounds, isPicker) {
        const width = node.offsetWidth,
            height = node.offsetHeight
        let x = bounds.x + bounds.width / 2 - width / 2,
            y = bounds.y - height - 12
        if (y < 115) y = bounds.bottom + 10
        x = Math.max(12, Math.min(innerWidth - width - 12, x))
        y = Math.max(115, Math.min(innerHeight - height - (isPicker ? 22 : 12), y))
        node.style.left = `${x}px`
        node.style.top = `${y}px`
    }
    function clickPlot(id) {
        if (modal || pending.has(id)) return
        if (id >= unlocked()) {
            toast(`农场达到 Lv.${id >= 9 ? 5 : 3} 后开放这块土地`)
            return
        }
        const plant = state.plots[id]
        if (!plant) openSeedPicker(id)
        else if (stage(plant) === 3) harvest(id)
        else if (!plant.watered) water(id)
    }
    function openSeedPicker(id) {
        hideHover()
        seedTarget = id
        const picker = $('#seed-picker')
        picker.innerHTML = `<header class="popover-heading"><h2>这块田，种点什么？</h2><button class="close-button" aria-label="关闭选种">×</button></header><div class="seed-grid">${crops
            .map((crop) => {
                const locked = crop.level > level(),
                    stock = state.seeds[crop.id],
                    teaching = crop.id === 'wheat' && state.tutorial > 0
                return `<button class="seed-card" data-seed="${crop.id}" ${locked ? 'disabled' : ''}><span class="stock">×${stock}</span>${cropArt(crop.id)}<strong>${crop.name}</strong><small>${locked ? `Lv.${crop.level} 解锁` : stock ? clock((teaching ? 5 : crop.minutes) * 60000) : '种子不足'}</small>${locked ? '' : teaching ? `<small class="tutorial">教学剩余 ${state.tutorial} 次</small>` : !stock ? '<small class="refill">去补货</small>' : ''}</button>`
            })
            .join('')}</div>`
        picker.hidden = false
        picker.querySelector('.close-button').onclick = closeSeedPicker
        picker
            .querySelectorAll('[data-seed]')
            .forEach((button) => (button.onclick = () => chooseSeed(button.dataset.seed)))
        positionFloating(picker, $(`#hit-${id}`).getBoundingClientRect(), true)
    }
    function closeSeedPicker() {
        seedTarget = null
        $('#seed-picker').hidden = true
    }
    function chooseSeed(cropId) {
        const id = seedTarget,
            crop = cropById(cropId)
        if (id === null || crop.level > level()) return
        if (!state.seeds[cropId]) {
            closeSeedPicker()
            openStore('seeds')
            openTrade('buySeed', cropId)
            return
        }
        closeSeedPicker()
        withPlot(id, () => {
            if (state.plots[id] || !state.seeds[cropId] || id >= unlocked()) return false
            const teaching = cropId === 'wheat' && state.tutorial > 0,
                duration = (teaching ? 5 : crop.minutes) * 60000
            state.seeds[cropId]--
            if (teaching) state.tutorial--
            state.plots[id] = { id: cropId, duration, endAt: Date.now() + duration, watered: false }
            $(`#plot-${id}`).classList.add('just-planted')
            setTimeout(() => $(`#plot-${id}`).classList.remove('just-planted'), 550)
            localGain(id, `${crop.name} · 已播种`)
            tone(460)
            return true
        })
    }
    function withPlot(id, action) {
        if (pending.has(id) || id >= unlocked()) return
        const startedRevision = revision
        hideHover()
        pending.add(id)
        updatePlots()
        setTimeout(() => {
            if (startedRevision !== revision) return
            try {
                action()
            } finally {
                pending.delete(id)
                updateHud()
                updatePlots()
            }
        }, 160)
    }
    function water(id) {
        withPlot(id, () => {
            const plant = state.plots[id]
            if (!plant || plant.watered || stage(plant) === 3) return
            plant.watered = true
            plant.endAt = Math.max(Date.now(), plant.endAt - plant.duration * 0.2)
            localGain(id, '已浇水 · 成长加速')
            const point = scenePoint(positions[id])
            for (let n = 0; n < 5; n++) {
                const drop = document.createElement('span')
                drop.className = 'water-drop'
                drop.textContent = '●'
                drop.style.cssText = `left:${point.x + (n - 2) * 12}px;top:${point.y - 20}px;--drift:${(n - 2) * 16}px;animation-delay:${n * 0.045}s`
                $('#effects').append(drop)
                setTimeout(() => drop.remove(), 1100)
            }
            tone(750)
        })
    }
    function harvest(id) {
        withPlot(id, () => {
            const plant = state.plots[id]
            if (!plant || stage(plant) !== 3) return
            const crop = cropById(plant.id),
                before = level()
            state.plots[id] = null
            state.produce[crop.id] += crop.yield
            state.harvests[crop.id] += crop.yield
            state.exp += crop.exp
            localGain(id, `${crop.name} +${crop.yield} 经验 +${crop.exp}`)
            fly(crop.id, positions[id], $('#backpack'))
            tone(660)
            if (level() > before) toast(`农场升级到 Lv.${level()}，有新的作物和土地等你探索！`)
        })
    }
    function localGain(id, text) {
        const point = scenePoint(positions[id])
        const node = document.createElement('div')
        node.className = 'local-gain'
        node.textContent = text
        node.style.cssText = `left:${point.x}px;top:${point.y - 35}px`
        $('#effects').append(node)
        setTimeout(() => node.remove(), 1350)
    }
    function fly(cropId, from, to) {
        const node = document.createElement('div')
        node.className = 'reward-flight'
        node.innerHTML = cropArt(cropId)
        const point = scenePoint(from),
            end = to.getBoundingClientRect()
        node.style.left = `${point.x - 27}px`
        node.style.top = `${point.y - 70}px`
        $('#effects').append(node)
        requestAnimationFrame(() =>
            requestAnimationFrame(() => {
                node.style.transform = `translate(${end.x + end.width / 2 - point.x}px,${end.y + end.height / 2 - point.y + 50}px) scale(.3)`
                node.style.opacity = '.2'
            })
        )
        setTimeout(() => {
            node.remove()
            const target = to.querySelector('.portrait') ?? to.querySelector('.round-button') ?? to
            target.classList.add('pop')
            setTimeout(() => target.classList.remove('pop'), 450)
        }, 760)
    }
    function toast(message) {
        clearTimeout(toastTimer)
        $('#toast').textContent = message
        $('#toast').hidden = false
        toastTimer = setTimeout(() => {
            $('#toast').hidden = true
        }, 2000)
    }
    function tone(frequency) {
        if (!sound) return
        try {
            audio ??= new (window.AudioContext || window.webkitAudioContext)()
            const oscillator = audio.createOscillator(),
                gain = audio.createGain()
            oscillator.type = 'sine'
            oscillator.frequency.value = frequency
            gain.gain.setValueAtTime(0.035, audio.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.13)
            oscillator.connect(gain).connect(audio.destination)
            oscillator.start()
            oscillator.stop(audio.currentTime + 0.14)
        } catch {
            sound = false
        }
    }
    function openPanel(kind) {
        lastFocused = document.activeElement
        closeSeedPicker()
        hideHover()
        modal = kind
        $('#overlay').hidden = false
        renderPanel()
        $('#panel .close-button').focus({ preventScroll: true })
    }
    function closePanel() {
        modal = null
        $('#overlay').hidden = true
        lastFocused?.focus?.({ preventScroll: true })
    }
    function panelShell(title, icon, content) {
        $('#panel').innerHTML =
            `<header class="panel-header"><h2 id="panel-title">${icon !== null ? iconArt(icon) : ''}${title}</h2><button class="close-button" aria-label="关闭面板">×</button></header>${content}`
        $('#panel .close-button').onclick = closePanel
    }
    function renderPanel() {
        if (modal === 'orders') renderOrders()
        else if (modal === 'backpack') renderBackpack()
        else if (modal === 'store') renderStore()
        else if (modal === 'codex') renderCodex()
        else if (modal === 'settings') renderSettings()
        else if (modal === 'level') renderLevel()
        else if (modal?.startsWith('trade')) renderTrade()
    }
    function renderOrders() {
        panelShell(
            '小镇订单',
            1,
            `<p class="panel-subtitle">田里的收获，正好是邻居们需要的。凑齐后就能交付。</p><div class="order-cards">${state.orders
                .map(
                    (order) =>
                        `<article class="order-card ${orderReady(order) ? 'ready' : ''} ${order.deliveredAt ? 'cooldown' : ''}" data-order="${order.id}"><h3>${order.title}</h3>${
                            order.deliveredAt
                                ? '<p class="panel-subtitle">已经送达 · 新订单正在准备中</p>'
                                : `<div class="requirements">${Object.entries(order.needs)
                                      .map(
                                          ([id, count]) =>
                                              `<span class="requirement ${state.produce[id] >= count ? 'enough' : ''}">${cropArt(id)}<strong>${cropById(id).name}<br>${state.produce[id]} / ${count}</strong></span>`
                                      )
                                      .join(
                                          ''
                                      )}</div><div class="order-bottom"><span class="order-reward">金币 +${order.cash} 经验 +${order.exp}</span><button class="action-button" data-deliver="${order.id}" ${orderReady(order) ? '' : 'disabled'}>交付订单</button></div>`
                        }</article>`
                )
                .join('')}</div>`
        )
        $('#panel')
            .querySelectorAll('[data-deliver]')
            .forEach((button) => (button.onclick = () => deliver(Number(button.dataset.deliver))))
    }
    function deliver(id) {
        const order = state.orders.find((o) => o.id === id)
        if (!orderReady(order)) return
        Object.entries(order.needs).forEach(([crop, count]) => {
            state.produce[crop] -= count
        })
        state.cash += order.cash
        state.exp += order.exp
        order.deliveredAt = Date.now()
        updateHud()
        updatePlots()
        renderOrders()
        toast(`订单已送达 · 金币 +${order.cash} · 经验 +${order.exp}`)
        tone(880)
    }
    function renderTabs(items) {
        return `<div class="tabs">${items.map(([id, name]) => `<button class="tab-button ${tab === id ? 'active' : ''}" data-tab="${id}">${name}</button>`).join('')}</div>`
    }
    function bindTabs() {
        document.querySelectorAll('#panel [data-tab]').forEach(
            (button) =>
                (button.onclick = () => {
                    tab = button.dataset.tab
                    renderPanel()
                })
        )
    }
    function renderBackpack() {
        const content =
            renderTabs([
                ['seeds', '种子'],
                ['produce', '作物']
            ]) +
            '<div class="item-grid">' +
            crops
                .map((crop) => {
                    const locked = crop.level > level(),
                        teaching = tab === 'seeds' && crop.id === 'wheat' && state.tutorial > 0
                    return `<article class="item-card ${locked ? 'locked' : ''}">${cropArt(crop.id)}<span class="quantity">×${state[tab][crop.id]}</span><h3>${crop.name}</h3><p>${tab === 'seeds' ? clock((teaching ? 5 : crop.minutes) * 60000) : '每个可售 ' + crop.sell + ' 金币'}${teaching ? '<br>教学剩余 ' + state.tutorial + ' 次' : ''}</p><button class="action-button" data-inventory="${crop.id}" ${(tab === 'produce' && !state.produce[crop.id]) || locked ? 'disabled' : ''}>${locked ? 'Lv.' + crop.level + ' 解锁' : tab === 'seeds' ? '补充种子' : '出售'}</button></article>`
                })
                .join('') +
            '</div>'
        panelShell('农场背包', 2, content)
        bindTabs()
        $('#panel')
            .querySelectorAll('[data-inventory]')
            .forEach(
                (button) =>
                    (button.onclick = () =>
                        openTrade(tab === 'seeds' ? 'buySeed' : 'sell', button.dataset.inventory))
            )
    }
    function openStore(category = 'seeds') {
        tab = category
        openPanel('store')
    }
    function renderStore() {
        const items = crops.map(
            (crop) =>
                `<article class="item-card ${crop.level > level() ? 'locked' : ''}">${cropArt(crop.id)}<h3>${crop.name}种子</h3><p>${clock(crop.minutes * 60000)} · 库存 ${state.seeds[crop.id]}</p><button class="action-button" data-buy="${crop.id}" ${crop.level > level() ? 'disabled' : ''}>${crop.level > level() ? 'Lv.' + crop.level + ' 解锁' : crop.price + ' 金币'}</button></article>`
        )
        panelShell(
            '农场小铺',
            5,
            '<p class="panel-subtitle">挑一点新的种子，把下一篮收获带回家。</p><div class="item-grid">' +
                items.join('') +
                '</div>'
        )
        $('#panel')
            .querySelectorAll('[data-buy]')
            .forEach((button) => (button.onclick = () => openTrade('buySeed', button.dataset.buy)))
    }
    let trade = null
    function openTrade(kind, id) {
        trade = { kind, id, count: 1 }
        modal = 'trade'
        renderTrade()
    }
    function renderTrade() {
        const { kind, id } = trade,
            crop = cropById(id),
            price = kind === 'sell' ? crop.sell : crop.price,
            max = kind === 'sell' ? state.produce[id] : Math.floor(state.cash / price),
            name = crop
                ? crop.name + (kind === 'buySeed' ? '种子' : '')
                : id === 'barrel'
                  ? '木桶'
                  : '长椅'
        trade.count = Math.max(1, Math.min(trade.count, Math.max(1, max)))
        panelShell(
            kind === 'sell' ? '出售收获' : '带回农场',
            kind === 'sell' ? 2 : 5,
            `<div class="trade-details">${crop ? cropArt(id) : iconArt(id === 'barrel' ? 10 : 11)}<div><h3>${name}</h3><p>每份 ${price} 金币</p><p>${kind === 'sell' ? `背包中有 ${max} 份` : `当前金币 ${state.cash}`}</p></div></div><div class="stepper"><button data-step="-1" aria-label="减少数量">−</button><input id="trade-count" type="number" value="${trade.count}" min="1" max="${Math.max(1, max)}" aria-label="交易数量"/><button data-step="1" aria-label="增加数量">+</button></div><p class="trade-total">${kind === 'sell' ? '获得' : '合计'} ${price * trade.count} 金币</p><div class="trade-confirm"><button class="action-button" id="trade-confirm" ${max === 0 ? 'disabled' : ''}>${max === 0 ? '金币不足' : kind === 'sell' ? '确认出售' : '确认购买'}</button></div>`
        )
        $('#panel')
            .querySelectorAll('[data-step]')
            .forEach(
                (button) =>
                    (button.onclick = () => {
                        trade.count = Math.max(
                            1,
                            Math.min(max, trade.count + Number(button.dataset.step))
                        )
                        renderTrade()
                    })
            )
        $('#trade-count').onchange = (event) => {
            trade.count = Math.max(1, Math.min(max, Math.floor(Number(event.target.value) || 1)))
            renderTrade()
        }
        $('#trade-confirm').onclick = confirmTrade
    }
    function confirmTrade() {
        const { kind, id, count } = trade,
            crop = cropById(id),
            price = kind === 'sell' ? crop.sell : crop.price
        if (kind === 'sell') {
            if (state.produce[id] < count) return
            state.produce[id] -= count
            state.cash += price * count
        } else {
            if (state.cash < price * count || (crop && crop.level > level())) return
            state.cash -= price * count
            state.seeds[id] += count
        }
        updateHud()
        toast(kind === 'sell' ? `已出售 · 金币 +${price * count}` : '已经放进农场背包')
        modal = kind === 'sell' ? 'backpack' : 'store'
        tab = kind === 'sell' ? 'produce' : 'seeds'
        renderPanel()
        tone(900)
    }
    function renderCodex() {
        panelShell(
            '作物图鉴',
            3,
            `<p class="panel-subtitle">每一次收获，都留下一页关于农场的小故事。</p><div class="item-grid">${crops.map((crop) => `<article class="item-card ${crop.level > level() ? 'locked' : ''}">${cropArt(crop.id)}<h3>${crop.name}</h3><span class="codex-label">${crop.level > level() ? `Lv.${crop.level} 解锁` : state.harvests[crop.id] ? '已点亮' : '等待第一次收获'}</span><p>${crop.description}</p><p>累计收获 ${state.harvests[crop.id]} · ${clock(crop.minutes * 60000)}</p><div class="codex-stage-list">${[0, 1, 2, 3].map((phase) => cropArt(crop.id, phase)).join('')}</div></article>`).join('')}</div>`
        )
    }
    function renderLevel() {
        panelShell(
            '农场的成长',
            null,
            `<div class="level-display"><span class="level-medal">${level()}</span><p>每一份收获，都让农场更热闹一点。</p></div><div class="unlock-list"><div class="unlock-item"><strong>Lv.3</strong><span>番茄 · 开放至 9 块土地</span></div><div class="unlock-item"><strong>Lv.4</strong><span>草莓种子</span></div><div class="unlock-item"><strong>Lv.5</strong><span>南瓜 · 开放至 12 块土地</span></div></div>`
        )
    }
    function renderSettings() {
        panelShell(
            '农场设置',
            6,
            `<div class="setting-line"><span>轻柔音效<small>种植、浇水与收获时的一点小回应</small></span><button id="sound-toggle" class="action-button ${sound ? '' : 'secondary'}">${sound ? '已开启' : '已关闭'}</button></div><div class="setting-line"><span>看看成熟的农场<small>让正在生长的作物立刻成熟，体验收获</small></span><button id="mature-demo" class="action-button secondary">全部成熟</button></div><div class="setting-line"><span>重新开始体验<small>恢复原型的示例田地、种子和金币</small></span><button id="reset-demo" class="action-button secondary">重置原型</button></div><p class="empty-copy">这里只是独立体验原型。<br>不会读取或改变 Petmate 的真实进度。</p>`
        )
        $('#sound-toggle').onclick = () => {
            sound = !sound
            renderSettings()
            tone(700)
        }
        $('#mature-demo').onclick = () => {
            state.plots.forEach((plant) => {
                if (plant) plant.endAt = Date.now() - 1
            })
            closePanel()
            updatePlots()
            toast('田里的作物都成熟了，去收下这一篮好心情')
        }
        $('#reset-demo').onclick = () => {
            closePanel()
            reset()
            toast('新的农场，准备好啦')
        }
    }
    function reset() {
        revision++
        pending.clear()
        state = initialState()
        $('#effects').replaceChildren()
        closeSeedPicker()
        hideHover()
        clearTimeout(toastTimer)
        $('#toast').hidden = true
        buildPlots()
        updateHud()
        updatePlots()
    }
    document.querySelectorAll('[data-icon]').forEach((node) => {
        const id = Number(node.dataset.icon)
        node.innerHTML = iconSvg(id)
    })
    $('#profile').onclick = () => openPanel('level')
    $('#crop-layer').addEventListener('pointerover', (event) => {
        const node = event.target.closest('.crop-root')
        if (node && hoverId !== Number(node.dataset.plot))
            hoverPlot(Number(node.dataset.plot), event)
    })
    $('#crop-layer').addEventListener('pointermove', (event) => {
        const node = event.target.closest('.crop-root')
        if (node) moveCursor(Number(node.dataset.plot), event)
    })
    $('#crop-layer').addEventListener('pointerout', (event) => {
        const next = event.relatedTarget?.closest?.('[data-plot]')
        if (!next || Number(next.dataset.plot) !== hoverId) hideHover()
    })
    $('#crop-layer').addEventListener('click', (event) => {
        const node = event.target.closest('.crop-root')
        if (node) clickPlot(Number(node.dataset.plot))
    })
    $('#coins').onclick = () => openStore()
    $('#settings').onclick = () => openPanel('settings')
    $('#orders').onclick = () => openPanel('orders')
    $('#backpack').onclick = () => {
        tab = 'seeds'
        openPanel('backpack')
    }
    $('#codex').onclick = () => openPanel('codex')
    $('#overlay').onclick = (event) => {
        if (event.target === $('#overlay')) closePanel()
    }
    $('#game').addEventListener('click', (event) => {
        if (event.target.closest('button,.panel,.seed-picker,.plot-hit,.crop-art')) return
        closeSeedPicker()
    })
    document.addEventListener('contextmenu', (event) => {
        if (event.target.closest('input')) return
        event.preventDefault()
        if (modal) {
            closePanel()
            return
        }
        closeSeedPicker()
        hideHover()
    })
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (modal) closePanel()
            else if (seedTarget !== null) closeSeedPicker()
            hideHover()
        }
        if (event.key === 'Tab' && modal) {
            const focusables = [...$('#panel').querySelectorAll('button:not(:disabled),input')]
            const first = focusables[0],
                last = focusables.at(-1)
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault()
                last.focus()
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault()
                first.focus()
            }
        }
    })
    window.addEventListener('resize', resize)
    window.addEventListener('blur', hideHover)
    resize()
    reset()
    setInterval(() => {
        if (!document.hidden) updatePlots()
    }, 1000)
})()
