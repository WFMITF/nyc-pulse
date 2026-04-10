import { ref } from 'vue'

export function useMapBrush(props, emit, tooltipApi) {
  const isShiftPressed = ref(false)
  const isPrimaryPointerDown = ref(false)

  let svg = null
  let rootLayer = null
  let brushLayer = null
  let brushBehavior = null
  let suppressBrushEvent = false

  let getSelectionZips = () => []
  let updateInteractionStyles = () => {}
  let isBlankMapPointer = () => false

  let pointerDownPosition = null
  let movedSincePointerDown = false
  let ignoreBackgroundClickUntil = 0

  // 当前是否处于一次刷选拖拽中
  let brushGestureInProgress = false
  // 是否在本次刷选过程中“先松了 Shift，再松鼠标”
  let didReleaseShiftDuringBrush = false
  // 最近一次非空选框
  let lastNonNullSelection = null
  // 最近一次预览命中的 ZIP
  let previewSelectedZips = []

  const CLICK_MOVE_THRESHOLD = 6
  const CLICK_SUPPRESS_MS = 180

  function bindBrushContext(context) {
    svg = context.svg
    rootLayer = context.rootLayer
    brushLayer = context.brushLayer
    brushBehavior = context.brushBehavior
    getSelectionZips = context.getSelectionZips
    updateInteractionStyles = context.updateInteractionStyles
    isBlankMapPointer = context.isBlankMapPointer
  }

  function hasActiveBrushSelection() {
    return props.brushedZips.length > 0
  }

  function applyShiftState(next, options = {}) {
    const { skipInteractivity = false } = options
    const normalized = !!next

    if (isShiftPressed.value === normalized) return

    isShiftPressed.value = normalized

    if (!skipInteractivity) {
      setBrushInteractivity()
    }
  }

  function syncModifierState(event) {
    if (!event || typeof event.shiftKey !== 'boolean') {
      return isShiftPressed.value
    }

    const next = !!event.shiftKey

    // 正在刷选且鼠标还按着时，不允许普通 move / brush 事件改写 Shift 状态
    // Shift 的真实释放只认全局 keydown / keyup
    if (brushGestureInProgress && isPrimaryPointerDown.value) {
      return isShiftPressed.value
    }

    applyShiftState(next)
    return isShiftPressed.value
  }

  function markIgnoreBackgroundClick(duration = CLICK_SUPPRESS_MS) {
    ignoreBackgroundClickUntil = Math.max(ignoreBackgroundClickUntil, Date.now() + duration)
  }

  function shouldIgnoreBackgroundClick() {
    return Date.now() < ignoreBackgroundClickUntil
  }

  function resetPointerGestureState() {
    pointerDownPosition = null
    movedSincePointerDown = false
  }

  function resetBrushGestureState() {
    brushGestureInProgress = false
    didReleaseShiftDuringBrush = false
    lastNonNullSelection = null
    previewSelectedZips = []
  }

  function cloneSelection(selection) {
    if (!selection) return null

    return [
      [selection[0][0], selection[0][1]],
      [selection[1][0], selection[1][1]]
    ]
  }

  function syncBrushVisualClear() {
    if (!brushLayer || !brushBehavior) return
    suppressBrushEvent = true
    brushLayer.call(brushBehavior.move, null)
  }

  function clearBrushVisualOnly() {
    syncBrushVisualClear()
    setBrushInteractivity()
  }

  function clearBrushSelection(silent = false) {
    clearBrushVisualOnly()
    updateInteractionStyles([])

    if (!silent) {
      emit('brush', [])
    }
  }

  function setBrushInteractivity() {
    if (!brushLayer || !svg || !rootLayer) return

    const shouldShowBrushLayer = isShiftPressed.value

    brushLayer.style('display', shouldShowBrushLayer ? null : 'none')
    brushLayer.style('pointer-events', shouldShowBrushLayer ? 'all' : 'none')

    brushLayer.selectAll('.overlay')
      .style('pointer-events', shouldShowBrushLayer ? 'all' : 'none')
      .style('cursor', shouldShowBrushLayer ? 'crosshair' : 'default')

    brushLayer.selectAll('.selection, .handle')
      .style('pointer-events', 'none')
      .style('cursor', 'default')

    rootLayer.style('pointer-events', shouldShowBrushLayer ? 'none' : null)
    svg.classed('brush-enabled', shouldShowBrushLayer)

    if (shouldShowBrushLayer) {
      tooltipApi.hideTooltipImmediately()
    }
  }

  function brushed(event) {
    const sourceEvent = event?.sourceEvent || event
    syncModifierState(sourceEvent)

    if (event.type === 'start') {
      brushGestureInProgress = true
      didReleaseShiftDuringBrush = false
      lastNonNullSelection = null
      previewSelectedZips = []
    }

    if (suppressBrushEvent) {
      if (event.type === 'end') {
        suppressBrushEvent = false
        resetBrushGestureState()
        setBrushInteractivity()
      }
      return
    }

    if (event.selection) {
      lastNonNullSelection = cloneSelection(event.selection)
      previewSelectedZips = getSelectionZips(lastNonNullSelection)

      // 如果这次已经被判定为“Shift 先松开”，那 end 阶段不要再刷一遍预览高亮
      if (!(event.type === 'end' && didReleaseShiftDuringBrush)) {
        updateInteractionStyles(previewSelectedZips)
      }
    } else if (event.type !== 'end') {
      previewSelectedZips = []
      updateInteractionStyles(props.brushedZips)
    }

    if (event.type === 'end') {
      markIgnoreBackgroundClick(220)

      const finalSelection = didReleaseShiftDuringBrush
        ? null
        : cloneSelection(event.selection ?? lastNonNullSelection)

      const finalSelected = finalSelection
        ? getSelectionZips(finalSelection)
        : []

      if (finalSelection) {
        emit('brush', finalSelected)
        clearBrushVisualOnly()
        updateInteractionStyles(finalSelected)
      } else {
        clearBrushVisualOnly()
        updateInteractionStyles(props.brushedZips)
      }

      resetBrushGestureState()
      setBrushInteractivity()
      return
    }

    setBrushInteractivity()
  }

  function handleKeyDown(event) {
    if (event.key === 'Shift') {
      applyShiftState(true)
      return
    }

    if (event.key === 'Escape' && hasActiveBrushSelection()) {
      clearBrushSelection()
    }
  }

  function handleKeyUp(event) {
    if (event.key !== 'Shift') return

    // 只有“鼠标还按着的时候松开 Shift”，才算这次刷选取消
    if (brushGestureInProgress && isPrimaryPointerDown.value) {
      didReleaseShiftDuringBrush = true
      applyShiftState(false, { skipInteractivity: true })
      return
    }

    applyShiftState(false)
  }

  function handlePointerDown(event) {
    syncModifierState(event)

    if (event.button === 0) {
      isPrimaryPointerDown.value = true
      pointerDownPosition = {
        x: event.clientX,
        y: event.clientY
      }
      movedSincePointerDown = false
    }
  }

  function handlePointerMove(event) {
    syncModifierState(event)

    if (!isPrimaryPointerDown.value || !pointerDownPosition) return

    const dx = event.clientX - pointerDownPosition.x
    const dy = event.clientY - pointerDownPosition.y
    const dist2 = dx * dx + dy * dy

    if (dist2 >= CLICK_MOVE_THRESHOLD * CLICK_MOVE_THRESHOLD) {
      movedSincePointerDown = true
    }
  }

  function handlePointerUp(event) {
    if (event.button !== 0) return

    if (!brushGestureInProgress) {
      syncModifierState(event)
    }

    if (movedSincePointerDown) {
      markIgnoreBackgroundClick()
    }

    isPrimaryPointerDown.value = false
    resetPointerGestureState()

    if (!brushGestureInProgress) {
      setBrushInteractivity()
    }
  }

  function handleWindowBlur() {
    isPrimaryPointerDown.value = false
    resetPointerGestureState()
    resetBrushGestureState()
    applyShiftState(false)
  }

  function handleVisibilityChange() {
    if (typeof document !== 'undefined' && document.hidden) {
      isPrimaryPointerDown.value = false
      resetPointerGestureState()
      resetBrushGestureState()
      applyShiftState(false)
    }
  }

  function handleMapBackgroundClick(event) {
    syncModifierState(event)

    if (shouldIgnoreBackgroundClick()) return
    if (isShiftPressed.value) return
    if (event.button !== 0) return
    if (!hasActiveBrushSelection()) return
    if (!isBlankMapPointer(event)) return

    clearBrushSelection()
  }

  return {
    isShiftPressed,
    bindBrushContext,
    syncModifierState,
    setBrushInteractivity,
    clearBrushVisualOnly,
    clearBrushSelection,
    brushed,
    handleKeyDown,
    handleKeyUp,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWindowBlur,
    handleVisibilityChange,
    handleMapBackgroundClick
  }
}