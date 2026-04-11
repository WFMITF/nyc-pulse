<script setup>
const base = import.meta.env.BASE_URL

const stageEarly = `${base}documentation/stage-early.png`
const stageMiddle = `${base}documentation/stage-middle.png`
const stageFinal = `${base}documentation/stage-final.png`
</script>

<template>
  <div class="page-shell">
    <header class="topbar topbar-title-fixed">
      <div class="topbar-title-row">
        <div class="topbar-title-shell">
          <div class="eyebrow">NYC LIVEABILITY PULSE</div>

          <h1 class="hero-title">
            <span class="hero-title-main">项目说明文档</span>
            <span class="hero-title-sub">Documentation & Design Notes</span>
          </h1>

          <p class="topbar-subtitle">
            本页面用于说明本项目所解答的问题、数据来源、设计决策、交互实现、开发流程与人机协作情况，
            与主可视化页面共同构成完整的课程作业提交内容。
          </p>
        </div>

        <RouterLink class="doc-link-button" to="/">
          返回可视化
        </RouterLink>
      </div>
    </header>

    <section class="topbar-panels">
        <div class="topbar-panels-grid doc-topbar-panels-grid">
            <div class="control-area-card doc-top-card">
            <div class="control-area-kicker">Document Scope</div>

            <div class="guide-block">
                <strong>页面用途</strong>
                <p>
                本页面提供项目背景、数据处理、视觉编码、交互逻辑、开发流程与总结说明，
                用于补充主页面无法完整承载的文字信息。
                </p>
            </div>
            </div>

            <div class="guide-area-card doc-top-card">
            <div class="guide-kicker">How to read</div>

            <div class="guide-block">
                <strong>与主页面关系</strong>
                <p>
                主页面负责交互探索，本页面负责说明“为什么这样做、数据从哪里来、开发中做了哪些权衡”。
                </p>
            </div>
            </div>
        </div>
        </section>
    <section class="guide-area-card doc-focus-section">
      <div class="chart-summary-kicker">Project Focus</div>
      <div class="chart-summary-title">项目聚焦问题</div>

      <div class="doc-focus-grid">
        <div class="guide-block">
          <strong>核心主题</strong>
          <p>
            聚焦纽约市不同行业的薪资数据、各行业在各 ZIP Code 区域中的住房压力与经济机会之间，
            呈现出怎样的空间关系。
          </p>
        </div>

        <div class="guide-block">
          <strong>分析目标</strong>
          <p>
            不只展示“哪里房租高、哪里工作多”，更进一步回答：
            某类职业在纽约到底“挣不挣得到钱”，又“住不住得起房”。
          </p>
        </div>
      </div>
    </section>

    <main class="dashboard-shell doc-main">
      <section class="guide-area-card doc-section">
        <div class="chart-summary-kicker">01 / Research Question</div>
        <div class="chart-summary-title">我的可视化方案试图解答什么问题</div>

        <p class="doc-paragraph">
          本项目围绕纽约市宜居度这一大主题下的一个具体问题展开：<b>纽约市的经济活力与生活成本</b>。借助不同产业在纽约各邮编区域中的就业机会、
          薪资水平与住房成本之间的数据，<b>交互式地分析</b>可视化数据呈现出怎样的空间关系，可以得到什么初步结论。
        </p>
        <p class="doc-paragraph">
          希望通过交互式可视化，不仅展示“哪里房租高、哪里工作多”，更进一步回答：
          某一类职业在纽约的不同区域，到底“挣不挣得到钱”，又“住不住得起房”。
        </p>
        <p class="doc-paragraph">
          因此，本项目不是一个单纯展示地理分布的地图，而是一个允许用户<b><font color=orchid>切换行业、缩放地图、刷选局部区域、
          联动查看散点分布</font></b>的探索工具，用来观察纽约这座城市中“经济机会”与“生活成本”的错位与重合。
        </p>
      </section>

      <section class="guide-area-card doc-section">
        <div class="chart-summary-kicker">02 / Data</div>
        <div class="chart-summary-title">数据来源与预处理</div>

        <p class="doc-paragraph">
          为了保证多源数据能够稳定关联，我最终选择使用 <b>ZIP Code</b> 作为统一分析单位，而不是街区名称或社区名称。
          原因在于邮编在不同数据源之间是唯一的，更容易匹配，也便于在地图层面进行空间比较。
        </p>
        <p class="doc-paragraph">
          项目主要整合了四类数据：纽约各邮编区域的租金数据、行业薪资数据、企业分布数据以及纽约邮编区边界地图数据。
          后续还补充了行业代码与行业名称对照表，并将行业层级细化到 3 位 NAICS 代码，以提升行业切换分析时的精度。
        </p>
        <p class="doc-paragraph">
          数据源见 05 外部资源与技术工具一节
        </p>
        <p class="doc-paragraph">
          在预处理阶段，我将流程拆分为多个模块，利用<code>dataoperate.py</code>，包括行业薪资清洗、租金数据切片、企业分布聚合、
          GeoJSON 边界压缩，以及最终主数据导出。最终生成统一的 <code>nyc_master_data.json</code>
          供前端直接读取，以减少运行时计算负担并保证交互流畅。
        </p>
      </section>

      <section class="guide-area-card doc-section">
        <div class="chart-summary-kicker">03 / Design Decisions</div>
        <div class="chart-summary-title">设计决策的依据</div>

        <div class="doc-subsection">
          <h3 class="doc-subtitle">3.1 为什么选择“分层地图 + 联动散点图”</h3>
          <p class="doc-paragraph">
            地图适合表达空间分布，但不擅长精确比较变量关系；散点图适合展示变量之间的关系，
            但缺乏城市空间语境。因此我将<b>地图作为主视图、散点图作为辅助视图</b>，通过联动把空间分布与统计关系连接起来。
          </p>
        </div>

        <div class="doc-subsection">
          <h3 class="doc-subtitle">3.2 为什么地图底色表示住房压力</h3>
          <p class="doc-paragraph">
            最初我考虑过直接用底图颜色表示租金绝对值，但后来放弃了。因为单独谈租金高低并不足以说明一个区域是否“难以居住”，
            真正关键的是它与收入之间的关系。因此我最终让底图颜色表达的是住房负担水平，也就是租金放到行业收入语境中的压力状态。
            这里我用<b>租金/薪资</b>反应住房负担水平，颜色越暖表示房租负担压力越大，颜色越冷表示房租负担压力越小。
          </p>
        </div>

        <div class="doc-subsection">
          <h3 class="doc-subtitle">3.3 为什么圆圈表示经济机会</h3>
          <p class="doc-paragraph">
            上层圆圈图层用于表示区域的经济机会与财富潜力。若只用企业数量，最多只能反映商业密度，不能反映机会质量。
            因此我引入<b>机会指数</b>，利用<b>企业数量与行业薪资</b>来反映机会指数，使圆圈既表达机会聚集，也体现收入支撑能力。
            企业数量越多，薪资水平越高，圆圈越大。
            这样，底图和圆圈之间形成了清晰的阅读逻辑：底色看住房压力，气泡看经济机会。
          </p>
        </div>

        <div class="doc-subsection">
          <h3 class="doc-subtitle">3.4 为什么加入刷选、缩放、悬浮和 Current Snapshot</h3>
          <p class="doc-paragraph">
            本项目的交互目的是直接参与分析过程，引人入胜的探索体验。
            地图支持<font color=orchid><b>缩放和平移</b></font>，便于观察纽约局部区域；
            支持 <font color=orchid><b>Shift + 左键拖动刷选</b></font>，将<font color=orchid><b>局部区域同步过滤到散点图</b></font>；
            同时支持<font color=orchid><b>悬浮于散点图上某个数据点</b></font>，同步联动至地图上，相应的<font color=orchid><b>气泡变色</b></font>，维持散点图和地图的<font color=orchid><b>双向联动</b></font>；
            支持地图上<font color=orchid><b>悬浮提示与跨视图高亮</b></font>，帮助用户在空间位置与统计关系之间建立对照；
            此外还加入了 <font color=orchid><b>Current Snapshot 文本摘要</b></font>，用<font color=orchid><b>自然语言概括当前视图状态</b></font>，降低阅读门槛。
          </p>
        </div>
      </section>

      <section class="guide-area-card doc-section">
        <div class="chart-summary-kicker">04 / Iteration</div>
        <div class="chart-summary-title">页面迭代过程</div>

        <p class="doc-paragraph">
          本项目并不是一次性完成的，而是经过了多轮迭代。初版主要用于验证数据加载、地图绘制和行业筛选是否能够跑通；
          中间版重点处理布局问题、补充缺失功能并修复刷选 bug；最终版则进一步优化了色彩、图例位置、散点图布局、
          阅读辅助模块和说明文档入口。
        </p>

        <div class="doc-image-block">
          <img class="doc-image" :src="stageEarly" alt="项目初版界面" />
          <p class="doc-image-caption">
            图 1：项目初版界面。此阶段主要完成数据加载、基础布局与交互框架搭建。
          </p>
        </div>

        <div class="doc-image-block">
          <img class="doc-image" :src="stageMiddle" alt="项目中间版界面" />
          <p class="doc-image-caption">
            图 2：项目中间版界面。此阶段重点进行了布局优化、功能补充与刷选逻辑修复。
          </p>
        </div>

        <div class="doc-image-block">
          <img class="doc-image" :src="stageFinal" alt="项目最终版界面" />
          <p class="doc-image-caption">
            图 3：项目最终版界面。此阶段完成了配色、空间布局、Current Snapshot 与说明文档入口等优化。
          </p>
        </div>
      </section>

      <section class="guide-area-card doc-section">
        <div class="chart-summary-kicker">05 / Data Sources</div>
        <div class="chart-summary-title">外部数据来源</div>

        <div class="doc-source-list">
            <div class="doc-source-item">
            <div class="doc-source-name">1. 租金与房价数据：纽约邮编与最近房租数据</div>
            <p class="doc-paragraph">
                数据源：
                <a
                href="https://www.zillow.com/research/data/"
                target="_blank"
                rel="noopener noreferrer"
                class="doc-inline-link"
                >
                Zillow Research Data
                </a>
            </p>
            </div>

            <div class="doc-source-item">
            <div class="doc-source-name">2. 行业代码 + 企业数 + 所发工资总额</div>
            <p class="doc-paragraph">
                数据源：
                <a
                href="https://zh.dol.ny.gov/quarterly-census-employment-and-wages"
                target="_blank"
                rel="noopener noreferrer"
                class="doc-inline-link"
                >
                New York State Department of Labor - Quarterly Census of Employment and Wages
                </a>
            </p>
            </div>

            <div class="doc-source-item">
            <div class="doc-source-name">3. 地图边界数据</div>
            <p class="doc-paragraph">
                数据源：
                <a
                href="https://data.cityofnewyork.us/Health/Modified-Zip-Code-Tabulation-Areas-MODZCTA-Map/5fzm-kpwv"
                target="_blank"
                rel="noopener noreferrer"
                class="doc-inline-link"
                >
                NYC Open Data - Modified Zip Code Tabulation Areas (MODZCTA) Map
                </a>
            </p>
            </div>

            <div class="doc-source-item">
            <div class="doc-source-name">4. 商业分布数据：纽约邮编 + 行业 + 个数</div>
            <p class="doc-paragraph">
                数据源：
                <a
                href="https://www.census.gov/data/datasets/2023/econ/cbp/2023-cbp.html"
                target="_blank"
                rel="noopener noreferrer"
                class="doc-inline-link"
                >
                U.S. Census Bureau - County Business Patterns
                </a>
            </p>
            </div>

            <div class="doc-source-item">
            <div class="doc-source-name">5. NAICS 代码和行业名称对照表</div>
            <p class="doc-paragraph">
                数据源：
                <a
                href="https://data.bls.gov/cew/doc/titles/industry/industry_titles.csv"
                target="_blank"
                rel="noopener noreferrer"
                class="doc-inline-link"
                >
                BLS Industry Titles CSV
                </a>
            </p>
            <p class="doc-paragraph">
                本项目的数据主要来源于 Zillow 租金研究数据、纽约州行业工资数据、美国 Census 商业分布数据、
                以及纽约市 MODZCTA 地图边界数据。为了完成行业维度标准化，我还结合了 NAICS 行业代码与名称对照表。
            </p>
            <p class="doc-paragraph">
                技术实现方面，我使用 <font color=orchid><b>Vue 3 与 Vite </b></font>搭建前端项目结构，使用 <font color=orchid><b>D3.js </b></font>实现<b>地图、比例圆、
                散点图、缩放、刷选和动画更新</b>，使用 <font color=orchid><b>Python </b></font>完成<b>前期数据清洗与主数据导出</b>，
                最终通过 <font color=orchid><b>GitHub Pages</b></font> 完成在线部署。
            </p>
            </div>
        </div>
        </section>

      <section class="guide-area-card doc-section">
        <div class="chart-summary-kicker">06 / Workflow</div>
        <div class="chart-summary-title">开发流程与工时</div>

        <p class="doc-paragraph">
          按有效工时估算，本项目总投入约 25 小时左右。前期主要完成<b>数据收集、指标设计、数据清洗和初版界面搭建</b>；
          中后期则集中于<b>页面优化、交互 bug 修复以及 GitHub Pages 部署</b>。
          <p>26.4.9（约6h）：进行数据收集、整理、清晰，页面布局的初步构想。</p>
          <p>26.4.10（约16h）：进行交互可视化页面的开发，修改刷选功能的bug，调整页面布局，添加项目说明文档，GitHub Pages部署。</p>
          <p>26.4.11（约3h）：进行页面布局的优化，项目文档内容的撰写。</p>
        </p>
        <p class="doc-paragraph">
          其中，耗时最多的两个环节分别是：第一，页面布局的优化；第二，地图缩放、刷选、
          联动和 tooltip 等交互功能之间的冲突调试。在ai的帮助下，现在的难点已经转向细节调试，
          因为ai无法完全理解并执行我们的想法和对页面的功能设计，因而花费了大量时间。
        </p>
      </section>

      <section class="guide-area-card doc-section">
        <div class="chart-summary-kicker">07 / Human-AI Collaboration</div>
        <div class="chart-summary-title">人机协作过程的说明</div>

        <p class="doc-paragraph">
          本项目的<b>选题、数据口径、指标定义、页面结构和最终取舍由我主导</b>完成。
          在开发过程中，我将<b>生成式 AI 作为辅助开发工具使用，而不是直接替代我的设计判断</b>。
        </p>
        <p class="doc-paragraph">
          前期我与<b> Gemini </b>讨论了选题收敛、核心叙事与说明文档框架；后期我与 <b>ChatGPT </b>主要围绕数据结构整理、
          D3 绘图实现、刷选与缩放逻辑修复、tooltip 细节调整、布局优化和 GitHub Pages 部署问题展开协作。
          这些协作提高了开发效率，但项目的核心方向、分析逻辑与最终整合判断仍由我负责。
        </p>
      </section>

      <section class="guide-area-card doc-section">
        <div class="chart-summary-kicker">08 / Conclusion</div>
        <div class="chart-summary-title">项目总结</div>

        <p class="doc-paragraph">
          这个项目让我更深入地理解了交互可视化的完整流程：从问题定义、数据清洗、视觉编码和交互设计，
          到界面组织、部署与说明文档撰写，它们实际上构成了一个相互耦合的系统。
        </p>
        <p class="doc-paragraph">
          在页面设计的思路上，我没有选择过度复杂或花哨的表现形式，而是聚焦于我要解决的问题：
          纽约宜居度————经济活力与生活成本。
          我希望这个项目不仅是一张可视化作品，更是一个能让用户主动探索、主动比较并形成判断的交互分析工具。
        </p>
        <p class="doc-paragraph">
          作为我独立完成的一个（自认为）较高完整度的可视化作品，这个项目是一次走出舒适区的艰难尝试。
          在两天的（对我而言）高强度开发中，我不断学习前端框架。
          但正是这些困难，极大拓宽了我的技术边界。
          在这个过程中，我掌握了利用 Python 对空间地理数据（GeoJSON）与多维统计表格进行对齐、降维与预处理的能力。
          深刻理解了 Vue 3 响应式状态管理与 D3.js 原生 DOM 操作之间的生命周期协同策略。
          实现了 Brushing & Linking（刷选联动）等多视图协同技术，提升了复杂信息的视觉表达力。
          学会了如何与大语言模型进行高效的 Prompt 工程交互，利用 AI 辅助快速定位 Bug 与重构代码。
          这次实践让我深刻感受到，可视化不仅仅是前端技术这么简单，更是理解数据的有效工具。
          未来，我希望能将这些交互式可视化技术应用到更广泛的实际业务场景中，用数据交互的功能去发现隐藏在数据之间的更多信息，解决真正有价值的现实问题。
        </p>
      </section>
    </main>
  </div>
</template>

<style scoped>
.doc-main {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.doc-topbar-panels-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: stretch;
}

.doc-top-card {
  height: 100%;
}

.doc-top-card.selection-status-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}

@media (max-width: 1280px) {
  .doc-topbar-panels-grid {
    grid-template-columns: 1fr;
  }
}

.doc-focus-section {
  margin: 0 4px 14px;
  padding: 14px 16px;
  border-radius: 18px;
}

.doc-focus-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  align-items: start;
}

.doc-subsection + .doc-subsection {
  margin-top: 14px;
}

.doc-paragraph + .doc-paragraph {
  margin-top: 10px;
}

.doc-image-block {
  margin-top: 18px;
  text-align: center;
}

.doc-image-block + .doc-image-block {
  margin-top: 22px;
}

.doc-image {
  display: block;
  width: 50%;
  margin: 0 auto;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.42);
  box-shadow: 0 14px 30px rgba(92, 79, 69, 0.1);
  background: rgba(255, 255, 255, 0.6);
}

.doc-image-caption {
  margin: 10px auto 0;
  width: 50%;
  color: #726a63;
  font-size: 0.84rem;
  line-height: 1.6;
  text-align: center;
}

code {
  padding: 2px 6px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.58);
  color: #4b433d;
  font-size: 0.92em;
}

.guide-area-grid-single {
  grid-template-columns: 1fr;
}

.doc-section {
  padding: 18px 20px;
}

.doc-subtitle {
  margin: 0 0 8px;
  color: #403933;
  font-size: 1.12rem;
  line-height: 1.45;
  font-weight: 650;
}

.doc-paragraph {
  margin: 0;
  color: #665d56;
  font-size: 1.02rem;
  line-height: 1.9;
}

.doc-top-card .control-area-kicker,
.doc-top-card .selection-status-label,
.doc-top-card .guide-kicker {
  font-size: 0.9rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #968a80;
  margin-bottom: 10px;
}

.doc-top-card .guide-block strong,
.doc-top-card .selection-status-value {
  display: block;
  color: #403933;
  font-size: 1.16rem;
  line-height: 1.45;
  font-weight: 650;
}

.doc-top-card .guide-block p {
  margin: 8px 0 0;
  color: #665d56;
  font-size: 1rem;
  line-height: 1.72;
}

.doc-focus-section .chart-summary-kicker,
.doc-section .chart-summary-kicker {
  font-size: 0.82rem;
  letter-spacing: 0.12em;
}

.doc-focus-section .chart-summary-title,
.doc-section .chart-summary-title {
  font-size: 1.28rem;
  line-height: 1.35;
}

.doc-focus-section .guide-block strong {
  display: block;
  margin-bottom: 6px;
  color: #403933;
  font-size: 1.16rem;
  line-height: 1.45;
  font-weight: 650;
}

.doc-focus-section .guide-block p {
  margin: 0;
  color: #665d56;
  font-size: 1rem;
  line-height: 1.72;
}

.doc-image-caption {
  margin: 10px auto 0;
  width: 50%;
  color: #726a63;
  font-size: 0.92rem;
  line-height: 1.68;
  text-align: center;
}

@media (max-width: 920px) {
  .doc-focus-grid {
    grid-template-columns: 1fr;
  }

  .doc-section {
    padding: 14px;
  }

  .doc-subtitle {
    font-size: 1.02rem;
  }

  .doc-paragraph {
    font-size: 0.94rem;
    line-height: 1.8;
  }

  .doc-top-card .control-area-kicker,
  .doc-top-card .selection-status-label,
  .doc-top-card .guide-kicker {
    font-size: 0.82rem;
  }

  .doc-top-card .guide-block strong,
  .doc-top-card .selection-status-value,
  .doc-focus-section .guide-block strong,
  .doc-focus-section .chart-summary-title,
  .doc-section .chart-summary-title {
    font-size: 1.04rem;
  }

  .doc-top-card .guide-block p,
  .doc-focus-section .guide-block p {
    font-size: 0.94rem;
    line-height: 1.68;
  }

  .doc-image,
  .doc-image-caption {
    width: 100%;
  }

  .doc-focus-section {
    margin: 0 2px 12px;
    padding: 14px;
  }
}

</style>