<script setup>
</script>

<template>
  <div class="page-shell">
    <header class="topbar topbar-title-fixed">
      <div class="topbar-title-row">
        <div class="topbar-title-shell">
          <div class="eyebrow">DOCUMENTATION</div>

          <h1 class="hero-title">
            <span class="hero-title-main">说明文档</span>
            <span class="hero-title-sub">Visualization Notes</span>
          </h1>

          <p class="topbar-subtitle">
            这是说明文档页面。你之后可以在这里补充项目背景、数据来源、交互方式、指标定义等内容。
          </p>
        </div>

        <RouterLink class="doc-link-button" to="/">
          返回可视化
        </RouterLink>
      </div>
    </header>

    <main class="dashboard-shell">
      <section class="guide-area-card">
        <div class="guide-kicker">Overview</div>

        <div class="guide-block">
          <strong>页面说明</strong>
          <p>当前页面用于展示可视化系统的文字说明。</p>
        </div>

        <div class="guide-block">
          <strong>后续可补充内容</strong>
          <p>你可以在这里继续加入系统介绍、地图图例解释、刷选逻辑说明、数据处理流程等内容。</p>
        </div>
      </section>
    </main>
  </div>
</template>