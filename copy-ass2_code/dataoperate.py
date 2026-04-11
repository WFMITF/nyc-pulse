import os
import json
import pandas as pd
import re

# ==========================================
# 1. 路径配置 (使用相对于代码文件的路径)
# ==========================================
# 获取当前代码文件(dataoperate.py)所在的 code 目录
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# 向上退一级到根目录，然后再进入 dataset 目录 (即 ass/dataset)
DATASET_DIR = os.path.abspath(os.path.join(BASE_DIR, '../dataset'))

FILE_RENT = os.path.join(DATASET_DIR, 'houserent_zipcode.xlsx')
FILE_QCEW = os.path.join(DATASET_DIR, 'qcew_quarter_2025_3.xlsx')
FILE_ZBP  = os.path.join(DATASET_DIR, 'industry_zipcode_raw.txt')
FILE_GEO  = os.path.join(DATASET_DIR, 'area_zipcode_raw.geojson')
FILE_OUTPUT = os.path.join(DATASET_DIR, 'nyc_master_data.json')
FILE_TITLES = os.path.join(DATASET_DIR, 'industry_titles.csv')

# ==========================================
# 模块 A: 行业薪资数据计算 (更新为 3 位精度)
# ==========================================
print("📊 处理 QCEW 行业薪资数据 (3位子类精度)...")
df_qcew = pd.read_excel(FILE_QCEW)
df_qcew.columns = df_qcew.columns.str.strip()
df_qcew['NAICS'] = df_qcew['NAICS'].astype(str).str.strip()

# 【关键改动】: 过滤出 3 位 NAICS 代码，同时保留 '00' 总计
# 这样系统就会抓取如 '511', '722' 等更具体的子类薪资
df_qcew = df_qcew[(df_qcew['NAICS'].str.len() == 3) | (df_qcew['NAICS'] == '00')]

# 核心计算逻辑不变...
df_qcew['AVG_EMP'] = (df_qcew['MNTH1EMP'] + df_qcew['MNTH2EMP'] + df_qcew['MNTH3EMP']) / 3
df_qcew = df_qcew[df_qcew['AVG_EMP'] > 0]
df_qcew['annual_salary'] = (df_qcew['TOTWAGE'] / df_qcew['AVG_EMP']) * 4
df_qcew['monthly_salary'] = df_qcew['annual_salary'] / 12

# 【名称匹配】: 依然使用字典，它会自动根据 3 位代码找到 3 位对应的名称
df_titles = pd.read_csv(FILE_TITLES)
df_titles.columns = df_titles.columns.str.strip()
title_mapping = dict(zip(df_titles['industry_code'].astype(str).str.strip(), df_titles['industry_title'].astype(str)))
title_mapping['00'] = "Total, All Industries"

df_qcew['raw_title'] = df_qcew['NAICS'].map(title_mapping)

def clean_title(title):
    title = str(title)
    # 正则表达式支持 2-3 位数字前缀的清洗
    title = re.sub(r'^(NAICS\s+\d+:?\s*|\d+\s+)', '', title)
    return title.strip()

df_qcew['clean_title'] = df_qcew['raw_title'].apply(clean_title)

# 导出 meta
df_industries = df_qcew[['NAICS', 'clean_title', 'annual_salary', 'monthly_salary']].copy()
df_industries = df_industries.rename(columns={'NAICS': 'naics_code', 'clean_title': 'title'})
industries_list = df_industries.to_dict(orient='records')


# ==========================================
# 模块 B: 房租数据切片 (Zillow Rent Data)
# 目的: 获取各邮编最新的月租金基准
# ==========================================
print("🏠 处理 Zillow 房租数据...")
df_rent = pd.read_excel(FILE_RENT)
df_rent['RegionName'] = df_rent['RegionName'].astype(str).str.split('.').str[0].str.zfill(5)

# 提取纽约市，并拿到最后一列 (如 2026/2/28)
latest_month_col = df_rent.columns[-1]
df_rent_nyc = df_rent[df_rent['City'] == 'New York'][['RegionName', latest_month_col]]
df_rent_nyc = df_rent_nyc.rename(columns={'RegionName': 'zip', latest_month_col: 'rent'})

rent_dict = df_rent_nyc.set_index('zip')['rent'].to_dict()


# ==========================================
# 模块 C: 企业分布聚合 (ZBP Data)
# 目的: 获取各邮编下，与 QCEW 对齐的各行业企业数量
# ==========================================
print("🏢 处理 ZBP 企业分布数据...")
df_zbp = pd.read_csv(FILE_ZBP, dtype={'zip': str, 'naics': str})
df_zbp['zip'] = df_zbp['zip'].str.zfill(5)

# 过滤纽约市邮编 (10xxx, 11xxx)
df_zbp_nyc = df_zbp[df_zbp['zip'].str.startswith(('10', '11'))].copy()

# 【核心桥梁】: 将 ZBP 的 NAICS 格式转换成 QCEW 的格式
def map_zbp_to_qcew_naics(n):
    n_str = str(n).strip()
    if n_str == '------': return '00'
    
    # 【关键改动】: 截取前 3 位。
    # 这样 ZBP 里的 6 位详细代码(如 511210) 会被归类到 3 位的 511(软件出版业) 下
    if len(n_str) >= 3:
        return n_str[:3]
    return None

df_zbp_nyc['naics_clean'] = df_zbp_nyc['naics'].apply(map_zbp_to_qcew_naics)
df_zbp_nyc = df_zbp_nyc.dropna(subset=['naics_clean'])
df_zbp_nyc['est'] = pd.to_numeric(df_zbp_nyc['est'], errors='coerce').fillna(0)

zbp_dict = {}
for zip_code, group in df_zbp_nyc.groupby('zip'):
    zbp_dict[zip_code] = group.set_index('naics_clean')['est'].to_dict()


# ==========================================
# 模块 D: 地理空间合并与压缩 (GeoJSON)
# ==========================================
print("🗺️ 注入地图数据并压缩边界...")
with open(FILE_GEO, 'r', encoding='utf-8') as f:
    geojson_data = json.load(f)

# 辅助函数：将多边形坐标截断为5位小数，大幅减小 JSON 体积
def round_coordinates(coords, precision=5):
    if isinstance(coords, list):
        if len(coords) > 0 and isinstance(coords[0], (int, float)):
            return [round(c, precision) for c in coords]
        else:
            return[round_coordinates(c, precision) for c in coords]
    return coords

valid_features =[]
for feature in geojson_data['features']:
    props = feature['properties']
    zcta = props.get('modzcta') or props.get('zcta')
    if not zcta:
        continue
    
    primary_zip = str(zcta).split(',')[0].strip().zfill(5)
    
    # 注入房租
    rent_val = rent_dict.get(primary_zip, None)
    props['rent'] = rent_val if pd.notna(rent_val) else None 
    
    # 注入该邮编的行业企业分布
    props['industries'] = zbp_dict.get(primary_zip, {})
    props['primary_zip'] = primary_zip
    
    # 压缩坐标精度
    feature['geometry']['coordinates'] = round_coordinates(feature['geometry']['coordinates'], 5)
    valid_features.append(feature)

geojson_data['features'] = valid_features


# ==========================================
# 模块 E: 导出 Master JSON
# ==========================================
print("📦 正在导出前端专用 Master JSON...")
master_data = {
    "industries_meta": industries_list, # 前端下拉菜单及算薪水用的元数据
    "mapData": geojson_data             # D3 绘图所需的所有空间和业务数据
}

with open(FILE_OUTPUT, 'w', encoding='utf-8') as f:
    # ensure_ascii=False 保证中英文字符正常，separators 压缩不必要的空格
    json.dump(master_data, f, separators=(',', ':'), ensure_ascii=False)

print(f"最终文件已保存至: {FILE_OUTPUT}")
print(f"一共处理了 {len(industries_list)} 个行业大类，合并了 {len(valid_features)} 个纽约邮编。")