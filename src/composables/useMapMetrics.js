import * as d3 from 'd3'

export function useMapMetrics(props) {
  let radiusScale = null

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

  function getAnnualSalary() {
    return Number(props.currentIndustryInfo?.annual_salary ?? 0)
  }

  function getMonthlySalary() {
    return Number(props.currentIndustryInfo?.monthly_salary ?? 0)
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

    return getIndustryCount(feature) * getAnnualSalary()
  }

  function getScore(feature) {
    const raw = getRawPotential(feature)
    const benchmark = Number(props.scoreBenchmark) || 1

    if (!Number.isFinite(raw) || raw <= 0) return 0

    const score = 100 * Math.log1p(raw) / Math.log1p(benchmark)
    return Math.max(0, Math.min(100, score))
  }

  function getAffordabilityRatio(feature) {
    const rent = getRent(feature)
    const monthlySalary = getMonthlySalary()

    if (!Number.isFinite(rent) || rent <= 0) return null
    if (!Number.isFinite(monthlySalary) || monthlySalary <= 0) return null

    return rent / monthlySalary
  }

  function hasValidCircleFeature(feature) {
    const raw = getRawPotential(feature)
    return Number.isFinite(raw) && raw > 0
  }

  function setRadiusScaleFromFeatures(features) {
    const positiveScores = (features ?? [])
      .filter(hasValidCircleFeature)
      .map((feature) => getScore(feature))
      .filter((value) => Number.isFinite(value) && value > 0)

    const currentMinScore = d3.min(positiveScores) ?? 0
    const currentMaxScore = d3.max(positiveScores) ?? 1

    if (currentMaxScore <= currentMinScore) {
      radiusScale = d3.scaleLinear()
        .domain([0, Math.max(1, currentMaxScore)])
        .range([0, 40])
        .clamp(true)
      return
    }

    radiusScale = d3.scalePow()
      .exponent(1.2)
      .domain([currentMinScore, currentMaxScore])
      .range([8, 44])
      .clamp(true)
  }

  function getBubbleRadius(score) {
    if (!radiusScale || !Number.isFinite(score) || score <= 0) return 0
    return radiusScale(score)
  }

  return {
    getIndustryCount,
    getRent,
    getAnnualSalary,
    getMonthlySalary,
    getRawPotential,
    getScore,
    getAffordabilityRatio,
    hasValidCircleFeature,
    setRadiusScaleFromFeatures,
    getBubbleRadius
  }
}