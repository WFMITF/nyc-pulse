import { reactive } from 'vue'

export function useMapTooltip(props, emit, svgRef, metrics) {
  let hideTimer = null

  const tooltip = reactive({
    visible: false,
    x: 0,
    y: 0,
    zip: '',
    rent: null,
    count: 0,
    annualSalary: null,
    ratio: null,
    rawPotential: null,
    score: null
  })

  function getViewportSize() {
    const rect = svgRef.value?.getBoundingClientRect()
    return {
      width: rect?.width || 1120,
      height: rect?.height || 900
    }
  }

  function formatCurrency(val) {
    if (val == null || !Number.isFinite(val)) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val)
  }

  function formatCompactCurrency(val) {
    if (val == null || !Number.isFinite(val)) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(val)
  }

  function formatPercent(val) {
    if (val == null || !Number.isFinite(val)) return 'N/A'
    return `${(val * 100).toFixed(1)}%`
  }

  function formatScore(val) {
    if (val == null || !Number.isFinite(val)) return 'N/A'
    return val.toFixed(1)
  }

  function setTooltipPositionFromPointer(mx, my) {
    const viewport = getViewportSize()
    const tooltipWidth = 286
    const tooltipHeight = 230
    const gap = 64
    const edge = 16

    let x = mx + gap
    let y = my - tooltipHeight - gap

    if (x + tooltipWidth > viewport.width - edge) {
      x = mx - tooltipWidth - gap
    }

    if (x < edge) {
      x = Math.max(edge, Math.min(mx - tooltipWidth / 2, viewport.width - tooltipWidth - edge))
    }

    if (y < edge) {
      y = my + gap
    }

    if (y + tooltipHeight > viewport.height - edge) {
      y = Math.max(edge, viewport.height - tooltipHeight - edge)
    }

    tooltip.x = x
    tooltip.y = y
  }

  function showTooltip(event, feature, pointerFactory) {
    clearTimeout(hideTimer)

    const [mx, my] = pointerFactory(event, svgRef.value)
    const zip = feature.properties.primary_zip

    tooltip.visible = true
    setTooltipPositionFromPointer(mx, my)
    tooltip.zip = zip
    tooltip.rent = metrics.getRent(feature)
    tooltip.count = metrics.getIndustryCount(feature)
    tooltip.annualSalary = metrics.getAnnualSalary()
    tooltip.ratio = metrics.getAffordabilityRatio(feature)
    tooltip.rawPotential = metrics.getRawPotential(feature)
    tooltip.score = metrics.getScore(feature)

    if (props.hoveredZip !== zip) {
      emit('hover', zip)
    }
  }

  function moveTooltip(event, pointerFactory) {
    if (!tooltip.visible) return

    const [mx, my] = pointerFactory(event, svgRef.value)
    setTooltipPositionFromPointer(mx, my)
  }

  function hideTooltipImmediately() {
    clearTimeout(hideTimer)
    tooltip.visible = false
    if (props.hoveredZip !== null) {
      emit('hover', null)
    }
  }

  function scheduleHideTooltip() {
    clearTimeout(hideTimer)
    hideTimer = setTimeout(() => {
      tooltip.visible = false
      if (props.hoveredZip !== null) emit('hover', null)
    }, 40)
  }

  function clearTooltipTimer() {
    clearTimeout(hideTimer)
  }

  return {
    tooltip,
    formatCurrency,
    formatCompactCurrency,
    formatPercent,
    formatScore,
    showTooltip,
    moveTooltip,
    scheduleHideTooltip,
    hideTooltipImmediately,
    clearTooltipTimer
  }
}