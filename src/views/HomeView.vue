<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import * as d3 from 'd3'
import MapChart from '../components/MapChart.vue'
import StatsChart from '../components/StatsChart.vue'
import ControlPanel from '../components/ControlPanel.vue'

const masterData = ref(null)
const selectedIndustry = ref('')
const hoveredZip = ref(null)
const brushedZips = ref([])

onMounted(async () => {
  try {
    const data = await d3.json(`${import.meta.env.BASE_URL}nyc_master_data.json`)
    masterData.value = data
  } catch (error) {
    console.error('数据加载失败，请检查文件路径:', error)
  }
})

const handleIndustryChange = (newCode) => {
  selectedIndustry.value = newCode
  brushedZips.value = []
  hoveredZip.value = null
}

const handleMapBrush = (zipList) => {
  brushedZips.value = zipList
}

const handleHover = (zip) => {
  hoveredZip.value = zip
}

const salaryLookup = computed(() => {
  const lookup = {}

  for (const ind of masterData.value?.industries_meta ?? []) {
    const code = String(ind?.naics_code ?? '').trim()
    const annual = Number(ind?.annual_salary)
    const monthly = Number(ind?.monthly_salary)

    if (!code) continue
    if (/^(nan|null|undefined)$/i.test(code)) continue
    if (!Number.isFinite(annual) || annual <= 0) continue

    lookup[code] = {
      annual_salary: annual,
      monthly_salary: Number.isFinite(monthly) && monthly > 0 ? monthly : annual / 12
    }
  }

  return lookup
})

const allIndustryInfo = computed(() => {
  if (!masterData.value) return null

  const features = masterData.value.mapData?.features ?? []
  let totalCount = 0
  let totalWeightedAnnual = 0

  for (const feature of features) {
    const industries = feature?.properties?.industries ?? {}

    for (const [code, rawCount] of Object.entries(industries)) {
      const count = Number(rawCount) || 0
      const annual = Number(salaryLookup.value[code]?.annual_salary ?? 0)

      if (count > 0 && annual > 0) {
        totalCount += count
        totalWeightedAnnual += count * annual
      }
    }
  }

  if (!totalCount || !Number.isFinite(totalWeightedAnnual)) return null

  const annualSalary = totalWeightedAnnual / totalCount

  return {
    naics_code: '__all__',
    title: 'All Industries',
    annual_salary: annualSalary,
    monthly_salary: annualSalary / 12
  }
})

const availableIndustries = computed(() => {
  if (!masterData.value) return []

  const features = masterData.value.mapData?.features ?? []
  const rawIndustries = masterData.value.industries_meta ?? []
  const byCode = new Map()

  for (const ind of rawIndustries) {
    const code = String(ind?.naics_code ?? '').trim()
    const title = String(ind?.title ?? '').replace(/\s+/g, ' ').trim()
    const annual = Number(ind?.annual_salary)
    const monthlyRaw = Number(ind?.monthly_salary)
    const monthly = Number.isFinite(monthlyRaw) && monthlyRaw > 0 ? monthlyRaw : annual / 12

    if (!code || !title) continue
    if (/^(nan|null|undefined)$/i.test(code)) continue
    if (/^(nan|null|undefined)$/i.test(title)) continue
    if (!Number.isFinite(annual) || annual <= 0) continue
    if (!Number.isFinite(monthly) || monthly <= 0) continue

    const hasAnyValidZip = features.some((f) => {
      const rent = Number(f?.properties?.rent)
      const count = Number(f?.properties?.industries?.[code] ?? 0)
      return Number.isFinite(rent) && rent > 0 && Number.isFinite(count) && count > 0
    })

    if (!hasAnyValidZip) continue

    const normalized = {
      naics_code: code,
      title,
      annual_salary: annual,
      monthly_salary: monthly
    }

    const existing = byCode.get(code)
    if (!existing || normalized.annual_salary > existing.annual_salary) {
      byCode.set(code, normalized)
    }
  }

  const list = Array.from(byCode.values())
    .filter((d) => !['00', '000', '__all__'].includes(String(d.naics_code)))
    .sort((a, b) =>
      a.naics_code.localeCompare(b.naics_code, undefined, { numeric: true })
    )

  if (allIndustryInfo.value) {
    list.unshift(allIndustryInfo.value)
  }

  return list
})

watch(
  availableIndustries,
  (list) => {
    if (!list.length) {
      selectedIndustry.value = ''
      return
    }

    if (!list.some((d) => d.naics_code === selectedIndustry.value)) {
      const total = list.find((d) => d.naics_code === '__all__')
      selectedIndustry.value = total?.naics_code ?? list[0].naics_code
    }
  },
  { immediate: true }
)

const currentIndustryInfo = computed(() => {
  if (!selectedIndustry.value) return null
  return availableIndustries.value.find((d) => d.naics_code === selectedIndustry.value) || null
})

const scoreBenchmark = computed(() => {
  if (!masterData.value) return 1

  const features = masterData.value.mapData?.features ?? []
  const values = []

  for (const feature of features) {
    const industries = feature.properties?.industries || {}

    if (selectedIndustry.value === '__all__') {
      let rawTotal = 0

      for (const [code, rawCount] of Object.entries(industries)) {
        const count = Number(rawCount) || 0
        const annual = Number(salaryLookup.value[code]?.annual_salary ?? 0)

        if (count > 0 && annual > 0) {
          rawTotal += count * annual
        }
      }

      if (rawTotal > 0) values.push(rawTotal)
    } else {
      const raw =
        (Number(industries[selectedIndustry.value]) || 0) *
        (Number(salaryLookup.value[selectedIndustry.value]?.annual_salary) || 0)

      if (raw > 0) values.push(raw)
    }
  }

  if (!values.length) return 1

  values.sort(d3.ascending)
  const p95 = d3.quantile(values, 0.95)
  return p95 || d3.max(values) || 1
})

const brushedLabel = computed(() => {
  return brushedZips.value.length
    ? `${brushedZips.value.length} ZIPs selected`
    : 'No active selection'
})

const activeMapFeatures = computed(() => {
  const features = masterData.value?.mapData?.features ?? []

  if (!brushedZips.value.length) return features

  const brushedSet = new Set(brushedZips.value.map((zip) => String(zip)))
  return features.filter((feature) =>
    brushedSet.has(String(feature?.properties?.primary_zip ?? ''))
  )
})

function getSelectedMonthlySalary() {
  const monthly = Number(currentIndustryInfo.value?.monthly_salary)
  return Number.isFinite(monthly) && monthly > 0 ? monthly : null
}

function getFeatureAffordabilityRatio(feature) {
  const rent = Number(feature?.properties?.rent)
  const monthlySalary = getSelectedMonthlySalary()

  if (!Number.isFinite(rent) || rent <= 0 || !monthlySalary) return null
  return rent / monthlySalary
}

function getFeatureOpportunityCount(feature) {
  const industries = feature?.properties?.industries || {}

  if (selectedIndustry.value === '__all__') {
    return Object.values(industries).reduce((sum, rawCount) => {
      return sum + (Number(rawCount) || 0)
    }, 0)
  }

  return Number(industries[selectedIndustry.value]) || 0
}

function getCurrentAnnualSalary() {
  if (selectedIndustry.value !== '__all__') {
    const annual = Number(currentIndustryInfo.value?.annual_salary)
    return Number.isFinite(annual) && annual > 0 ? annual : null
  }

  const features = activeMapFeatures.value
  let totalCount = 0
  let totalWeightedAnnual = 0

  for (const feature of features) {
    const industries = feature?.properties?.industries ?? {}

    for (const [code, rawCount] of Object.entries(industries)) {
      const count = Number(rawCount) || 0
      const annual = Number(salaryLookup.value[code]?.annual_salary ?? 0)

      if (count > 0 && annual > 0) {
        totalCount += count
        totalWeightedAnnual += count * annual
      }
    }
  }

  if (!totalCount || !Number.isFinite(totalWeightedAnnual)) return null
  return totalWeightedAnnual / totalCount
}

function classifyPressure(avgRatio) {
  if (!Number.isFinite(avgRatio)) {
    return {
      tone: '灰色或中性色为主',
      level: '暂时难以稳定判断'
    }
  }

  if (avgRatio >= 0.72) {
    return {
      tone: '整体偏暖',
      level: '较高'
    }
  }

  if (avgRatio <= 0.48) {
    return {
      tone: '整体偏冷',
      level: '较低'
    }
  }

  return {
    tone: '冷暖较均衡',
    level: '中等'
  }
}

function classifyOpportunityDensity(coverage) {
  if (!Number.isFinite(coverage) || coverage <= 0) {
    return {
      density: '较稀疏',
      level: '较少'
    }
  }

  if (coverage >= 0.62) {
    return {
      density: '较密集',
      level: '较多'
    }
  }

  if (coverage <= 0.32) {
    return {
      density: '较稀疏',
      level: '较少'
    }
  }

  return {
    density: '适中',
    level: '适中'
  }
}

function classifySalaryLevel(annualSalary) {
  const salarySamples = availableIndustries.value
    .filter((item) => String(item?.naics_code) !== '__all__')
    .map((item) => Number(item?.annual_salary))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort(d3.ascending)

  if (!Number.isFinite(annualSalary) || annualSalary <= 0 || !salarySamples.length) {
    return {
      size: '中等',
      level: '中等'
    }
  }

  const p33 = d3.quantile(salarySamples, 0.33) ?? salarySamples[0]
  const p66 = d3.quantile(salarySamples, 0.66) ?? salarySamples[salarySamples.length - 1]

  if (annualSalary >= p66) {
    return {
      size: '偏大',
      level: '较高'
    }
  }

  if (annualSalary <= p33) {
    return {
      size: '偏小',
      level: '较低'
    }
  }

  return {
    size: '中等',
    level: '中等'
  }
}

const scatterInsight = computed(() => {
  const features = activeMapFeatures.value
  const industryName =
    selectedIndustry.value === '__all__'
      ? '全行业视图'
      : (currentIndustryInfo.value?.title || '当前行业')

  const scopePrefix = brushedZips.value.length ? '当前选中区域内，' : ''
  const ratios = features
    .map(getFeatureAffordabilityRatio)
    .filter((value) => Number.isFinite(value))

  const opportunityCounts = features
    .map(getFeatureOpportunityCount)
    .filter((value) => Number.isFinite(value))

  const activeOpportunityCount = opportunityCounts.filter((value) => value > 0)
  const avgRatio = ratios.length ? d3.mean(ratios) : NaN
  const pressureInfo = classifyPressure(avgRatio)

  const bubbleCoverage = features.length ? activeOpportunityCount.length / features.length : 0
  const opportunityInfo = classifyOpportunityDensity(bubbleCoverage)

  const annualSalary = getCurrentAnnualSalary()
  const salaryInfo = classifySalaryLevel(annualSalary)
  const salaryLabel = selectedIndustry.value === '__all__' ? '综合薪资水平' : '薪资水平'

  const paragraphs = []

  if (Number.isFinite(avgRatio)) {
    paragraphs.push(
      `${scopePrefix}${industryName}中，地图着色${pressureInfo.tone}，反映出当前范围内的住房压力总体${pressureInfo.level}。`
    )
  } else {
    paragraphs.push(
      `${scopePrefix}${industryName}中，地图中可用于判断住房压力的有效数据较少，当前范围内暂时难以形成稳定结论。`
    )
  }

  if (activeOpportunityCount.length) {
    paragraphs.push(
      `地图上气泡分布${opportunityInfo.density}，说明该行业在当前范围内的就业机会总体${opportunityInfo.level}；气泡整体${salaryInfo.size}，反映出${salaryLabel}总体${salaryInfo.level}。`
    )
  } else {
    paragraphs.push(
      `当前范围内可见气泡较少，说明可观察到的就业机会总体较少；结合当前行业表现，${salaryLabel}总体${salaryInfo.level}。`
    )
  }

  if (brushedZips.value.length && features.length <= 6) {
    paragraphs.push('当前选中范围较小，这一结果更适合用于局部比较。')
  }

  return {
    kicker: 'Current Snapshot',
    title: brushedZips.value.length ? '局部区域摘要' : '全局视图摘要',
    paragraphs
  }
})
</script>

<template>
  <div v-if="masterData" class="page-shell">
    <header class="topbar topbar-title-fixed">
    <div class="topbar-title-row">
        <div class="topbar-title-shell">
        <div class="eyebrow">NYC LIVEABILITY PULSE</div>

        <h1 class="hero-title">
            <span class="hero-title-main">城市脉动：纽约宜居度多维评估系统</span>
            <span class="hero-title-sub">纽约生活成本与经济活力图谱</span>
        </h1>

        <p class="topbar-subtitle">
            基于 ZIP Code 的住房成本压力与职业机会联动视图。底图表示房租负担水平，散点图与圆圈共同表示薪资加权机会分数。
        </p>
        </div>

        <RouterLink class="doc-link-button" to="/documentation">
        说明文档
        </RouterLink>
    </div>
    </header>

    <section class="topbar-panels">
      <div class="topbar-panels-grid">
        <div class="control-area-card">
          <div class="control-area-kicker">Control Area</div>

          <ControlPanel
            :industries="availableIndustries"
            :currentIndustry="currentIndustryInfo"
            :currentIndustryCode="selectedIndustry"
            @changeIndustry="handleIndustryChange"
          />

          <div class="selection-status-card">
            <div class="selection-status-label">Selection Status</div>
            <div class="selection-status-value">{{ brushedLabel }}</div>
          </div>
        </div>

        <div class="guide-area-card">
          <div class="guide-area-grid">
            <div class="header-legend-card">
              <div class="legend-title">Map Legend</div>

              <div class="legend-block">
                <div class="legend-gradient"></div>
                <div class="legend-scale">
                  <span>高负担</span>
                  <span>低负担</span>
                </div>
              </div>

              <div class="legend-circle-row">
                <div class="legend-bubble-demo" aria-hidden="true">
                  <span class="legend-bubble legend-bubble-sm"></span>
                  <span class="legend-bubble legend-bubble-md"></span>
                  <span class="legend-bubble legend-bubble-lg"></span>
                </div>
                <span>气泡面积 = 薪资加权机会分数(考虑企业数量和薪资水平)</span>
              </div>

              <p class="legend-note">
                地图反映租住压力；气泡与散点图联合表达机会大小。
              </p>
              <p class="legend-note">注：地图中灰色部分数据有缺失</p>
            </div>

            <div class="header-read-card">
              <div class="guide-kicker">How to read</div>

              <div class="guide-block">
                <strong>房租负担水平</strong>
                <p>
                  地图颜色由月租金 / 月薪计算。颜色越偏暖，表示该职业在该区域承担房租的压力越高。
                </p>
              </div>

              <div class="guide-block">
                <strong>地图交互</strong>
                <p>按住 Shift 并按住鼠标左键拖动可进行框选。
                先松 Shift 即取消框选。</p>
                <p>只要 ZIP 区域与刷选框相交，就会被选中并同步筛选散点图。</p>
                <p>按 Esc 或点击地图空白处可清空当前框选。</p>
                <p>普通左键拖动为地图平移，滚轮为地图缩放。</p>
                <p>鼠标悬浮可显示详细信息。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <main class="dashboard-shell">
      <section class="map-stage">
        <MapChart
          :geoData="masterData.mapData"
          :selectedIndustry="selectedIndustry"
          :currentIndustryInfo="currentIndustryInfo"
          :salaryLookup="salaryLookup"
          :scoreBenchmark="scoreBenchmark"
          :brushedZips="brushedZips"
          :hoveredZip="hoveredZip"
          @brush="handleMapBrush"
          @hover="handleHover"
        />

        <div class="map-scatter-overlay">
        <div class="chart-summary-card">
            <div class="chart-summary-kicker">{{ scatterInsight.kicker }}</div>
            <div class="chart-summary-title">{{ scatterInsight.title }}</div>

            <p
            v-for="(paragraph, index) in scatterInsight.paragraphs"
            :key="index"
            class="chart-summary-text"
            >
            {{ paragraph }}
            </p>
        </div>

        <div class="chart-card-inline chart-card-floating">
            <StatsChart
            :mapFeatures="masterData.mapData.features"
            :selectedIndustry="selectedIndustry"
            :currentIndustryInfo="currentIndustryInfo"
            :salaryLookup="salaryLookup"
            :scoreBenchmark="scoreBenchmark"
            :brushedZips="brushedZips"
            :hoveredZip="hoveredZip"
            @hover="handleHover"
            />
        </div>
        </div>

        <div class="floating-hover-chip" v-if="hoveredZip">
          ZIP {{ hoveredZip }}
        </div>
      </section>
    </main>
  </div>

  <div v-else class="loading-shell">
    <div class="loading-topbar skeleton"></div>

    <div class="loading-main-card">
      <div class="skeleton skeleton-line skeleton-lg"></div>
      <div class="skeleton skeleton-line"></div>
      <div class="skeleton skeleton-toolbar"></div>
      <div class="skeleton skeleton-row"></div>
      <div class="skeleton skeleton-map"></div>
    </div>
  </div>
</template>