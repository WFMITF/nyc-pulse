<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import * as d3 from 'd3'

const props = defineProps({
  mapFeatures: { type: Array, default: () => [] },
  selectedIndustry: { type: String, default: '' },
  currentIndustryInfo: { type: Object, default: null },
  salaryLookup: { type: Object, default: () => ({}) },
  scoreBenchmark: { type: Number, default: 1 },
  brushedZips: { type: Array, default: () => [] },
  hoveredZip: { type: String, default: null }
})

const emit = defineEmits(['hover'])

const containerRef = ref(null)
const chartRef = ref(null)

const svgWidth = ref(560)
const svgHeight = 390
const margin = { top: 24, right: 24, bottom: 60, left: 68 }

let resizeObserver = null

function getIndustryCount(feature) {
  const industries = feature?.properties?.industries ?? {}

  if (props.selectedIndustry === '__all__') {
    return Object.values(industries).reduce((sum, v) => sum + (Number(v) || 0), 0)
  }

  return Number(industries?.[props.selectedIndustry] ?? 0)
}


function getRent(feature) {
  return Number(feature?.properties?.rent)
}

function getRawPotential(feature) {
  const industries = feature?.properties?.industries ?? {}

  if (props.selectedIndustry === '__all__') {
    let total = 0

    for (const [code, rawCount] of Object.entries(industries)) {
      const count = Number(rawCount) || 0
      const annual = Number(props.salaryLookup?.[code]?.annual_salary ?? 0)

      if (count > 0 && annual > 0) {
        total += count * annual
      }
    }

    return total
  }

  return getIndustryCount(feature) * Number(props.currentIndustryInfo?.annual_salary ?? 0)
}

function getScore(feature) {
  const raw = getRawPotential(feature)
  const benchmark = Number(props.scoreBenchmark) || 1
  if (!Number.isFinite(raw) || raw <= 0) return 0
  const score = 100 * Math.log1p(raw) / Math.log1p(benchmark)
  return Math.max(0, Math.min(100, score))
}

const filteredData = computed(() => {
  if (!props.currentIndustryInfo?.annual_salary) return []

  let data = props.mapFeatures.map((f) => {
    const zip = f.properties.primary_zip
    const rent = getRent(f)
    const count = getIndustryCount(f)
    const score = getScore(f)

    return { zip, rent, count, score }
  }).filter((d) =>
    Number.isFinite(d.rent) &&
    d.rent > 0 &&
    Number.isFinite(d.count) &&
    d.count > 0 &&
    Number.isFinite(d.score) &&
    d.score > 0
  )

  if (props.brushedZips.length > 0) {
    data = data.filter((d) => props.brushedZips.includes(d.zip))
  }

  return data
})

function updateSize() {
  if (!containerRef.value) return
  const w = containerRef.value.clientWidth
  svgWidth.value = Math.max(480, w > 0 ? w - 2 : 560)
}

function renderChart() {
  const svg = d3.select(chartRef.value)
  svg.attr('width', svgWidth.value).attr('height', svgHeight)
  svg.selectAll('*').remove()

  const data = filteredData.value

  if (!data.length) {
    svg.append('text')
      .attr('x', svgWidth.value / 2)
      .attr('y', svgHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#7d7268')
      .style('font-size', '14px')
      .text(props.brushedZips.length ? '当前框选区域没有有效数据点' : '当前行业下暂无可绘制的有效区域')
    return
  }

  let [xMin, xMax] = d3.extent(data, (d) => d.rent)
  if (xMin === xMax) {
    xMin -= 300
    xMax += 300
  }

  const xPad = Math.max(100, (xMax - xMin) * 0.08)

  const x = d3.scaleLinear()
    .domain([Math.max(0, xMin - xPad), xMax + xPad])
    .range([margin.left, svgWidth.value - margin.right])

  let [yMin, yMax] = d3.extent(data, (d) => d.score)

  if (yMin === yMax) {
    yMin = Math.max(0, yMin - 8)
    yMax = Math.min(100, yMax + 8)
  }

  const yPad = Math.max(4, (yMax - yMin) * 0.18)
  const yDomainMin = Math.max(0, yMin - yPad)
  const yDomainMax = Math.min(100, yMax + yPad)

  const y = d3.scalePow()
    .exponent(0.82)
    .domain([yDomainMin, yDomainMax])
    .range([svgHeight - margin.bottom, margin.top])

  const tickCount = Math.max(4, Math.floor((svgWidth.value - margin.left - margin.right) / 90))

    const yTicks = d3.ticks(yDomainMin, yDomainMax, 5)

  svg.append('g')
    .attr('class', 'grid-lines')
    .selectAll('line')
    .data(yTicks)
    .join('line')
    .attr('x1', margin.left)
    .attr('x2', svgWidth.value - margin.right)
    .attr('y1', (d) => y(d))
    .attr('y2', (d) => y(d))
    .attr('stroke', 'rgba(35, 95, 135, 0.12)')
    .attr('stroke-width', 1)

  const xAxis = svg.append('g')
    .attr('transform', `translate(0,${svgHeight - margin.bottom})`)
    .call(
      d3.axisBottom(x)
        .ticks(tickCount)
        .tickSizeOuter(0)
        .tickFormat(d3.format('$,.0f'))
    )

  xAxis.selectAll('text')
    .attr('fill', '#6b6259')
    .style('font-size', '12.5px')

  xAxis.selectAll('path,line')
    .attr('stroke', 'rgba(92, 84, 76, 0.26)')

    const yAxis = svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(
      d3.axisLeft(y)
        .tickValues(yTicks)
        .tickSizeOuter(0)
    )

  yAxis.selectAll('text')
    .attr('fill', '#6b6259')
    .style('font-size', '12.5px')

  yAxis.selectAll('path,line')
    .attr('stroke', 'rgba(92, 84, 76, 0.26)')

  svg.append('g')
    .selectAll('circle')
    .data(data, (d) => d.zip)
    .join('circle')
    .attr('cx', (d) => x(d.rent))
    .attr('cy', (d) => y(d.score))
    .attr('r', (d) => d.zip === props.hoveredZip ? 8 : 5.8)
    .attr('fill', (d) => d.zip === props.hoveredZip ? 'rgba(18, 84, 126, 0.86)' : 'rgba(42, 102, 140, 0.72)')
    .attr('stroke', (d) => d.zip === props.hoveredZip ? '#ffffff' : 'rgba(255,255,255,0.86)')
    .attr('stroke-width', (d) => d.zip === props.hoveredZip ? 2 : 1.2)
    .on('mouseenter', (_, d) => emit('hover', d.zip))
    .on('mouseleave', () => emit('hover', null))

  svg.append('text')
    .attr('x', svgWidth.value / 2)
    .attr('y', svgHeight - 16)
    .attr('text-anchor', 'middle')
    .attr('font-size', 13)
    .attr('fill', '#5f5851')
    .text('月租金 ($)')

  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -svgHeight / 2)
    .attr('y', 22)
    .attr('text-anchor', 'middle')
    .attr('font-size', 13)
    .attr('fill', '#5f5851')
    .text('机会分数')
}

onMounted(() => {
  updateSize()
  renderChart()

  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      updateSize()
      renderChart()
    })
    resizeObserver.observe(containerRef.value)
  }
})

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})

watch(filteredData, () => {
  renderChart()
}, { deep: true })

watch(() => props.hoveredZip, () => {
  renderChart()
})
</script>

<template>
  <div ref="containerRef" class="stats-card-shell">
    <div class="stats-head">
      <div>
        <div class="stats-kicker">Scatter View</div>
        <h4>生活成本 与 经济机会</h4>
      </div>
      <p v-if="brushedZips.length" class="hint">
        Showing {{ brushedZips.length }} brushed ZIPs
      </p>
    </div>

    <p class="stats-description">
      横轴为月租金，纵轴为薪资加权机会分数。悬浮任一点可与地图联动。
    </p>

    <svg ref="chartRef"></svg>
  </div>
</template>