<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import * as d3 from 'd3'
import { useMapMetrics } from '../composables/useMapMetrics'
import { useMapTooltip } from '../composables/useMapTooltip'
import { useMapBrush } from '../composables/useMapBrush'
import { isBlankMapPointer, getSelectionZipsFromFeatures } from '../utils/mapSelection'

const props = defineProps({
  geoData: { type: Object, required: true },
  selectedIndustry: { type: String, default: '' },
  currentIndustryInfo: { type: Object, default: null },
  salaryLookup: { type: Object, default: () => ({}) },
  scoreBenchmark: { type: Number, default: 1 },
  brushedZips: { type: Array, default: () => [] },
  hoveredZip: { type: String, default: null }
})

const emit = defineEmits(['brush', 'hover'])

const svgRef = ref(null)

const width = 1120
const height = 900

let svg = null
let rootLayer = null
let zipLayer = null
let dotsLayer = null
let brushLayer = null
let projection = null
let path = null
let zoomBehavior = null
let brushBehavior = null
let colorScale = null

const metrics = useMapMetrics(props)
const tooltipApi = useMapTooltip(props, emit, svgRef, metrics)
const brushApi = useMapBrush(props, emit, tooltipApi)

const {
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
} = tooltipApi

function getCurrentTransform() {
  return d3.zoomTransform(svgRef.value)
}

function getSelectionZips(selection) {
  return getSelectionZipsFromFeatures(
    selection,
    props.geoData?.features ?? [],
    path,
    getCurrentTransform()
  )
}

function updateBaseVisuals() {
  if (!props.geoData || !props.currentIndustryInfo) return

  const validCircleFeatures = props.geoData.features.filter(metrics.hasValidCircleFeature)
  metrics.setRadiusScaleFromFeatures(validCircleFeatures)

  zipLayer.selectAll('.zip-path')
    .attr('fill', (d) => {
      const ratio = metrics.getAffordabilityRatio(d)
      if (ratio == null) return '#e6e1e4'
      return colorScale(Math.max(0.18, Math.min(1.08, ratio)))
    })

  const circles = dotsLayer.selectAll('circle')
    .data(validCircleFeatures, (d) => d.properties.primary_zip)

  circles.join(
    (enter) => enter.append('circle')
      .attr('cx', (d) => path.centroid(d)[0])
      .attr('cy', (d) => path.centroid(d)[1])
      .attr('r', 0)
      .call((sel) =>
        sel.transition().duration(280).attr('r', (d) => metrics.getBubbleRadius(metrics.getScore(d)))
      ),
    (update) => update
      .transition()
      .duration(280)
      .attr('cx', (d) => path.centroid(d)[0])
      .attr('cy', (d) => path.centroid(d)[1])
      .attr('r', (d) => metrics.getBubbleRadius(metrics.getScore(d))),
    (exit) => exit.transition().duration(160).attr('r', 0).remove()
  )

  dotsLayer.selectAll('circle')
    .attr('fill', (d) => d.properties.primary_zip === props.hoveredZip ? 'rgba(214, 106, 77, 0.88)' : 'rgba(255, 255, 255, 0.08)')
    .attr('stroke', (d) => d.properties.primary_zip === props.hoveredZip ? '#8f2f1c' : '#2a668c')
    .attr('stroke-width', (d) => d.properties.primary_zip === props.hoveredZip ? 3.2 : 1.8)
    .on('mouseenter', (event, d) => showTooltip(event, d, d3.pointer))
    .on('mousemove', (event) => moveTooltip(event, d3.pointer))
    .on('mouseleave', scheduleHideTooltip)

  updateInteractionStyles()
}

function updateInteractionStyles(overrideBrushed = null) {
  if (!zipLayer || !dotsLayer) return

  const activeBrushed = overrideBrushed ?? props.brushedZips
  const brushedSet = new Set(activeBrushed)

  zipLayer.selectAll('.zip-path')
    .attr('opacity', (d) => {
      const zip = d.properties.primary_zip
      if (!activeBrushed.length) return 0.98
      return brushedSet.has(zip) ? 1 : 0.26
    })
    .attr('stroke', (d) => {
      const zip = d.properties.primary_zip
      if (zip === props.hoveredZip) return '#8f442c'
      if (brushedSet.has(zip)) return '#9d4e33'
      return 'rgba(255,255,255,0.84)'
    })
    .attr('stroke-width', (d) => {
      const zip = d.properties.primary_zip
      if (zip === props.hoveredZip) return 2.4
      if (brushedSet.has(zip)) return 2.1
      return 0.9
    })

  dotsLayer.selectAll('circle')
    .attr('fill', (d) => {
      const zip = d.properties.primary_zip
      if (zip === props.hoveredZip) return 'rgba(214, 106, 77, 0.88)'
      if (brushedSet.has(zip)) return 'rgba(42, 102, 140, 0.22)'
      return 'rgba(255, 255, 255, 0.08)'
    })
    .attr('stroke', (d) => {
      const zip = d.properties.primary_zip
      if (zip === props.hoveredZip) return '#8f2f1c'
      if (brushedSet.has(zip)) return '#1b5d87'
      return '#2a668c'
    })
    .attr('stroke-width', (d) => {
      const zip = d.properties.primary_zip
      if (zip === props.hoveredZip) return 3.2
      if (brushedSet.has(zip)) return 2
      return 1.8
    })
    .attr('opacity', (d) => {
      const zip = d.properties.primary_zip
      if (zip === props.hoveredZip) return 1
      if (!activeBrushed.length) return 0.82
      return brushedSet.has(zip) ? 0.94 : 0.14
    })
    .attr('filter', (d) => {
      const zip = d.properties.primary_zip
      return zip === props.hoveredZip ? 'drop-shadow(0 0 10px rgba(214, 106, 77, 0.55))' : null
    })
}

function initMap() {
  svg = d3.select(svgRef.value)
    .attr('viewBox', [0, 0, width, height])

  svg.selectAll('*').remove()

  projection = d3.geoMercator().fitExtent(
    [
      [width * 0.33, 28],
      [width - 28, height - 28]
    ],
    props.geoData
  )

  path = d3.geoPath().projection(projection)

  colorScale = d3.scaleSequential()
    .domain([0.18, 1.08])
    .interpolator(
      d3.interpolateRgbBasis([
        '#3C9BC9',
        '#65BDBA',
        '#B0D6A9',
        '#FEE199',
        '#FDCD94',
        '#FAA26F',
        '#F97F5F',
        '#FC757B'
      ])
    )

  rootLayer = svg.append('g').attr('class', 'root-layer')
  zipLayer = rootLayer.append('g').attr('class', 'zip-layer')
  dotsLayer = rootLayer.append('g').attr('class', 'dots-layer')
  brushLayer = svg.append('g').attr('class', 'brush-layer')

  zipLayer.selectAll('path')
    .data(props.geoData.features)
    .join('path')
    .attr('class', 'zip-path')
    .attr('d', path)
    .on('mouseenter', (event, d) => showTooltip(event, d, d3.pointer))
    .on('mousemove', (event) => moveTooltip(event, d3.pointer))
    .on('mouseleave', scheduleHideTooltip)

  zoomBehavior = d3.zoom()
    .scaleExtent([0.24, 8.5])
    .filter((event) => {
      brushApi.syncModifierState(event)

      if (event.shiftKey) return false
      if (event.type === 'wheel') return true
      if (event.type === 'mousedown') return event.button === 0
      return false
    })
    .on('start', () => {
      if (!brushApi.isShiftPressed.value) {
        svg.classed('is-panning', true)
      }
    })
    .on('zoom', (event) => {
      rootLayer.attr('transform', event.transform)
    })
    .on('end', () => {
      svg.classed('is-panning', false)
    })

  svg.call(zoomBehavior)
  svg.on('dblclick.zoom', null)
  svg.on('click.clear-selection', brushApi.handleMapBackgroundClick)

  brushBehavior = d3.brush()
  .keyModifiers(false)
  .filter((event) => {
    brushApi.syncModifierState(event)
    return !!event.shiftKey && (!('button' in event) || event.button === 0)
  })
  .extent([[0, 0], [width, height]])
  .on('start brush end', brushApi.brushed)

  brushLayer.call(brushBehavior)

  brushApi.bindBrushContext({
    svg,
    rootLayer,
    brushLayer,
    brushBehavior,
    getSelectionZips,
    updateInteractionStyles,
    isBlankMapPointer: (event) => isBlankMapPointer(event, svgRef.value)
  })

  updateBaseVisuals()
  updateInteractionStyles()
  brushApi.clearBrushVisualOnly()
}

onMounted(() => {
  initMap()

  window.addEventListener('keydown', brushApi.handleKeyDown)
  window.addEventListener('keyup', brushApi.handleKeyUp)
  window.addEventListener('pointerdown', brushApi.handlePointerDown)
  window.addEventListener('pointermove', brushApi.handlePointerMove)
  window.addEventListener('pointerup', brushApi.handlePointerUp)
  window.addEventListener('blur', brushApi.handleWindowBlur)
  document.addEventListener('visibilitychange', brushApi.handleVisibilityChange)
})

onBeforeUnmount(() => {
  clearTooltipTimer()

  if (svg) {
    svg.on('click.clear-selection', null)
  }

  window.removeEventListener('keydown', brushApi.handleKeyDown)
  window.removeEventListener('keyup', brushApi.handleKeyUp)
  window.removeEventListener('pointerdown', brushApi.handlePointerDown)
  window.removeEventListener('pointermove', brushApi.handlePointerMove)
  window.removeEventListener('pointerup', brushApi.handlePointerUp)
  window.removeEventListener('blur', brushApi.handleWindowBlur)
  document.removeEventListener('visibilitychange', brushApi.handleVisibilityChange)
})

watch(
  () => props.selectedIndustry,
  () => {
    brushApi.clearBrushSelection(true)
    updateBaseVisuals()
  }
)

watch(
  () => [
    props.currentIndustryInfo?.annual_salary,
    props.currentIndustryInfo?.monthly_salary,
    props.scoreBenchmark
  ],
  () => {
    updateBaseVisuals()
  }
)

watch(
  () => props.brushedZips.join('|'),
  () => {
    if (!props.brushedZips.length) {
      brushApi.clearBrushVisualOnly()
      updateInteractionStyles([])
      return
    }

    updateInteractionStyles()
  }
)

watch(
  () => props.hoveredZip,
  () => {
    if (brushApi.isShiftPressed.value) {
      hideTooltipImmediately()
    }
    updateInteractionStyles()
  }
)
</script>

<template>
  <div class="map-panel">
    <svg ref="svgRef" class="map-svg"></svg>

    <div
      v-if="tooltip.visible"
      class="map-tooltip"
      :style="{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }"
    >
      <div class="tooltip-title">ZIP {{ tooltip.zip }}</div>
      <div><strong>Rent</strong> {{ formatCurrency(tooltip.rent) }}</div>
      <div><strong>Establishments</strong> {{ tooltip.count }}</div>
      <div><strong>Industry Salary</strong> {{ formatCurrency(tooltip.annualSalary) }}</div>
      <div><strong>Rent / Salary</strong> {{ formatPercent(tooltip.ratio) }}</div>
      <div><strong>Wage-weighted Total</strong> {{ formatCompactCurrency(tooltip.rawPotential) }}</div>
      <div><strong>Opportunity Score</strong> {{ formatScore(tooltip.score) }}</div>
    </div>
  </div>
</template>