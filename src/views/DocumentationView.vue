<template>
  <div class="doc-page">
    <div class="doc-container">
      <header class="hero">
        <p class="eyebrow">Project Documentation</p>
        <h1>城市脉动：纽约宜居度多维评估系统</h1>
        <h2>——纽约生活成本与经济活力图谱</h2>
        <p class="hero-desc">
          本项目围绕纽约市不同邮编区域中的住房成本、就业机会与行业薪资之间的空间关系展开，
          通过交互式可视化帮助用户探索“哪里工作多、哪里工资高、哪里房租压力更大”这一现实问题。
        </p>
      </header>

      <section class="doc-section">
        <h3>1. 我的可视化方案试图解答什么问题</h3>
        <p>
          本项目以纽约市 ZIP Code 为统一分析单元，综合整合租金、行业薪资、企业分布和地理边界数据，
          试图回答一个具有现实意义的问题：不同产业在纽约各区域的就业机会、薪资水平和住房成本之间，
          究竟呈现出怎样的空间关系。
        </p>
        <p>
          我希望这个项目不仅展示“哪里房租高、哪里机会多”，更进一步揭示：
          某一类职业在纽约不同区域中，到底“挣不挣得到钱”，又“住不住得起房”。
          用户切换行业后，可以观察不同产业在城市空间中的分布差异，并结合局部区域刷选，
          深入比较纽约内部不同区域的机会与压力错位现象。
        </p>
      </section>

      <section class="doc-section">
        <h3>2. 数据来源与预处理</h3>
        <p>
          为了保证多源数据能够稳定关联，我最终选择使用 ZIP Code 作为统一分析单位，
          而不是街区名称或社区名称。原因在于邮编在不同数据源之间更容易匹配，
          同时也便于在地图层面进行空间比较。
        </p>
        <p>
          项目主要使用了以下几类数据：纽约各邮编区域的租金数据、行业薪资数据、
          企业分布数据以及纽约邮编区边界地图数据。后续我还补充了行业代码和行业名称对照表，
          并将行业分类细化到 3 位 NAICS 代码，以提升行业切换分析时的精度。
        </p>
        <p>
          在预处理阶段，我将流程拆分为多个模块：行业薪资清洗、租金数据切片、
          企业分布聚合、GeoJSON 边界压缩，以及最终的主数据导出。
          最终生成统一的 <code>nyc_master_data.json</code>，供前端页面直接读取，
          以减少运行时计算负担并保证交互流畅性。
        </p>
      </section>

      <section class="doc-section">
        <h3>3. 设计决策的依据</h3>

        <h4>3.1 为什么选择“分层地图 + 联动散点图”</h4>
        <p>
          我最终采用“分层地图主视图 + 统计散点图辅助视图”的结构，而不是只做单一地图或单一统计图。
          地图适合表达空间分布，但不擅长精确比较变量关系；散点图适合展示变量之间的关系，
          但缺乏城市空间语境。因此，我将两者联动，让用户既能从地图看到空间格局，
          又能从统计视图看到区域之间的关系差异。
        </p>

        <h4>3.2 为什么地图底色表示住房压力</h4>
        <p>
          在最初构思中，我考虑过直接用底图颜色表示租金绝对值，但后来放弃了。
          因为单独谈租金高低并不足以说明一个区域是否“难以居住”，真正关键的是它与收入之间的关系。
          因此，我最终让底图颜色表达的是住房负担水平，也就是租金放到行业收入语境中之后的压力状态。
          这样，地图底色就不再只是“贵不贵”，而是更贴近本项目主题的“住不住得起”。
        </p>

        <h4>3.3 为什么圆圈表示经济机会</h4>
        <p>
          上层圆圈图层用于表示区域的经济机会与财富潜力。最初我考虑让圆圈大小仅表示企业数量，
          但很快发现这一方案过于粗糙，因为企业数量只能反映密度，不能反映机会质量。
          因此我引入了企业数量与行业薪资结合的思路，使圆圈既表达机会聚集，也体现收入支撑能力。
          这样，底图和圆圈之间就形成了清晰的阅读逻辑：底色看住房压力，气泡看经济机会。
        </p>

        <h4>3.4 为什么加入刷选、缩放、悬浮和 Current Snapshot</h4>
        <p>
          本项目的交互不是装饰性的，而是直接参与分析过程。地图支持缩放和平移，
          便于观察纽约局部区域的细碎空间结构；支持 Shift + 左键拖动刷选，
          以便将地图上的局部区域过滤到散点图中进行更深入比较；支持悬浮提示与跨视图高亮，
          帮助用户在空间位置与统计关系之间建立对照；此外，我还加入了 Current Snapshot 文本模块，
          用简短语言总结当前视图状态，降低用户的阅读门槛。
        </p>
      </section>

      <section class="doc-section">
        <h3>4. 页面迭代过程</h3>
        <p>
          本项目并不是一次性完成的，而是经过了明显的多轮迭代。初版主要用于验证数据加载、
          地图绘制和行业筛选是否能够跑通；中间版重点处理布局问题、补充缺失功能并修复刷选 bug；
          最终版则进一步优化了色彩、图例位置、散点图布局、阅读辅助模块和说明文档入口。
        </p>

        <div class="image-block">
          <img :src="earlyImg" alt="项目初版界面" />
          <p class="caption">图 1：项目初版界面。此阶段主要完成数据加载、基础布局与交互框架搭建。</p>
        </div>

        <div class="image-block">
          <img :src="middleImg" alt="项目中间版界面" />
          <p class="caption">图 2：项目中间版界面。此阶段重点进行了布局优化、功能补充与刷选逻辑修复。</p>
        </div>

        <div class="image-block">
          <img :src="finalImg" alt="项目最终版界面" />
          <p class="caption">图 3：项目最终版界面。此阶段完成了配色、空间布局、Current Snapshot 与说明文档入口等优化。</p>
        </div>
      </section>

      <section class="doc-section">
        <h3>5. 外部资源与技术工具</h3>
        <p>
          本项目的数据主要来源于 Zillow 租金研究数据、纽约州行业工资数据、美国 Census 商业分布数据、
          以及纽约市 MODZCTA 地图边界数据。为了完成行业维度标准化，我还结合了 NAICS 行业代码与名称对照表。
        </p>
        <p>
          技术实现方面，我使用 Vue 3 与 Vite 搭建前端项目结构，使用 D3.js 实现地图、比例圆、
          散点图、缩放、刷选和动画更新，使用 Python 完成前期数据清洗与主数据导出，
          最终通过 GitHub Pages 完成在线部署。
        </p>
      </section>

      <section class="doc-section">
        <h3>6. 开发流程与工时</h3>
        <p>
          按有效工时估算，本项目总投入约 25 小时左右。前期主要完成数据收集、指标设计、
          数据清洗和初版界面搭建；中后期则集中用于页面优化、交互 bug 修复以及 GitHub Pages 部署。
        </p>
        <p>
          其中，耗时最多的两个环节分别是：第一，多源数据之间的对齐与清洗；
          第二，地图缩放、刷选、联动和 tooltip 等交互功能之间的冲突调试。
          相比静态图表，交互页面的真正难点在于不同模块之间会互相影响，因此细节调试花费了大量时间。
        </p>
      </section>

      <section class="doc-section">
        <h3>7. 人机协作过程的真实说明</h3>
        <p>
          本项目的选题、数据口径、指标定义、页面结构和最终取舍由我主导完成。
          在开发过程中，我将生成式 AI 作为辅助开发工具使用，而不是直接替代我的设计判断。
        </p>
        <p>
          在前期，我与 Gemini 讨论了选题收敛、核心叙事与说明文档框架；
          在后期，我与 ChatGPT 主要围绕数据结构整理、D3 绘图实现、刷选与缩放逻辑修复、
          tooltip 细节调整、布局优化和 GitHub Pages 部署问题展开协作。
          这些协作提升了我的开发效率，但项目的核心方向、分析逻辑与最终整合判断仍由我负责。
        </p>
      </section>

      <section class="doc-section">
        <h3>8. 项目总结</h3>
        <p>
          这个项目让我更深入地理解了交互可视化的完整流程：从问题定义、数据清洗、视觉编码和交互设计，
          到界面组织、部署与说明文档撰写，它们实际上构成了一个相互耦合的系统。
        </p>
        <p>
          我最终没有追求过度复杂或花哨的表现形式，而是聚焦于一个明确问题：
          纽约的经济机会与住房成本如何共同塑造不同职业的空间处境。
          我希望这个项目不仅是一张可视化作品，更是一个能让用户主动探索、
          主动比较并形成判断的交互分析工具。
        </p>
      </section>
    </div>
  </div>
</template>

<script setup>
const base = import.meta.env.BASE_URL
const earlyImg = `${base}documentation/stage-early.png`
const middleImg = `${base}documentation/stage-middle.png`
const finalImg = `${base}documentation/stage-final.png`
</script>

<style scoped>
.doc-page {
  min-height: 100vh;
  background: #f6f7fb;
  color: #1f2937;
  padding: 40px 20px 64px;
}

.doc-container {
  max-width: 980px;
  margin: 0 auto;
}

.hero {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 32px 32px 28px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
  margin-bottom: 28px;
}

.eyebrow {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
}

.hero h1 {
  margin: 0;
  font-size: 34px;
  line-height: 1.25;
  color: #0f172a;
}

.hero h2 {
  margin: 10px 0 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.5;
  color: #334155;
}

.hero-desc {
  margin: 18px 0 0;
  font-size: 17px;
  line-height: 1.9;
  color: #475569;
}

.doc-section {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 28px 30px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
  margin-bottom: 22px;
}

.doc-section h3 {
  margin: 0 0 16px;
  font-size: 24px;
  line-height: 1.4;
  color: #0f172a;
}

.doc-section h4 {
  margin: 22px 0 10px;
  font-size: 18px;
  line-height: 1.5;
  color: #1e293b;
}

.doc-section p {
  margin: 0 0 14px;
  font-size: 16px;
  line-height: 1.95;
  color: #334155;
}

.doc-section p:last-child {
  margin-bottom: 0;
}

code {
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 0.95em;
}

.image-block {
  margin-top: 20px;
}

.image-block + .image-block {
  margin-top: 28px;
}

.image-block img {
  display: block;
  width: 100%;
  border-radius: 14px;
  border: 1px solid #dbe3ee;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  background: #fff;
}

.caption {
  margin-top: 10px !important;
  font-size: 14px !important;
  line-height: 1.8 !important;
  color: #64748b !important;
}

@media (max-width: 768px) {
  .doc-page {
    padding: 20px 12px 40px;
  }

  .hero,
  .doc-section {
    padding: 22px 18px;
    border-radius: 14px;
  }

  .hero h1 {
    font-size: 26px;
  }

  .hero h2 {
    font-size: 17px;
  }

  .doc-section h3 {
    font-size: 20px;
  }

  .doc-section h4 {
    font-size: 17px;
  }

  .doc-section p,
  .hero-desc {
    font-size: 15px;
    line-height: 1.85;
  }
}
</style>