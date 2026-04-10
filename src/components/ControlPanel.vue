<script setup>
const props = defineProps({
  industries: { type: Array, default: () => [] },
  currentIndustry: { type: Object, default: null },
  currentIndustryCode: { type: String, default: '' }
})

const emit = defineEmits(['changeIndustry'])

const onChange = (event) => {
  emit('changeIndustry', event.target.value)
}

const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(val ?? 0)
}
</script>

<template>
  <div class="toolbar-panel">
    <div class="toolbar-select-group">
      <label>职业 / 行业</label>
      <select :value="currentIndustryCode" @change="onChange">
        <option
          v-for="ind in industries"
          :key="ind.naics_code"
          :value="ind.naics_code"
        >
          {{ ind.title }}
        </option>
      </select>
    </div>

    <div class="toolbar-profile" v-if="currentIndustry && currentIndustry.annual_salary">
      <div class="toolbar-stat">
        <span class="label">Annual Salary</span>
        <span class="value">{{ formatCurrency(currentIndustry.annual_salary) }}</span>
      </div>

      <div class="toolbar-stat">
        <span class="label">Monthly Salary</span>
        <span class="value">{{ formatCurrency(currentIndustry.monthly_salary) }}</span>
      </div>
    </div>
  </div>
</template>