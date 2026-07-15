# 省市区域加载为 Fence 图形 — 设计文档

日期：2026-07-14
状态：已批准（待实现）

## 目标

在现有围栏绘制页面中，增加“按省市区域生成图形”的能力：用户从下拉框选择省、再选择市，系统自动加载该市的行政边界并作为 fence 图形添加到地图上，与手绘图形行为完全一致（可删除、带删除按钮）。

## 行为约定（已与用户确认）

- 选择省/市后：**加载行政区边界为图形**（不是仅高亮、不是裁剪手绘范围）。
- 数据来源：**阿里 DataV GeoAtlas 在线接口**（需联网）。
- 粒度：**省 + 市 两级联动**。
- 叠加策略：**新增，不清空**原有图形。

## UI 变更

在 `src/components/HelloWorld.vue` 的 `.toolbar` 中新增两个 `<select>` 下拉框：

1. 省下拉（`provinceSelect`）：页面加载时填充全国省份列表。
2. 市下拉（`citySelect`）：初始为空/禁用；选择省后加载该省下属市并填充；选择市后触发边界加载。

级联规则：
- 省变化时，重置市下拉为占位项并清空其内容。
- 市变化时，加载所选市的边界 GeoJSON。

加载中的下拉显示“加载中…”，加载失败显示提示（如 `alert` 或 console + 下拉恢复）。

## 数据接口

- 全国省份列表：`GET https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json`
  - 返回 FeatureCollection，每条 feature 的 `properties.adcode`（省编码）、`properties.name`（省名）。
- 某省下属市：`GET https://geo.datav.aliyun.com/areas_v3/bound/{省adcode}_full.json`
  - 同样结构，feature 的 `properties.adcode` / `properties.name` 为市级。
- 某市边界：`GET https://geo.datav.aliyun.com/areas_v3/bound/{市adcode}_full.json`
  - 返回该市的边界 FeatureCollection（通常 1 条 feature，geometry 为 MultiPolygon/Polygon）。

## 加载与投影

使用 OpenLayers 的 `ol/format/GeoJSON`：

```ts
import GeoJSON from "ol/format/GeoJSON";

const features = new GeoJSON().readFeatures(data, {
  dataProjection: "EPSG:4326",   // GeoJSON 原始坐标系（WGS84）
  featureProjection: "EPSG:3857" // 地图视图坐标系
});
source.addFeatures(features);
```

- DataV 数据为 EPSG:4326，地图视图为 EPSG:3857，必须做投影转换，否则位置错位。
- `source.addFeatures` 触发现有 `addfeature` 监听 → 自动为每个边界 feature 调用 `addDeleteButton`，因此删除按钮、删除逻辑、清理逻辑全部复用，无需额外处理。

## 状态设计

- `provinces: { name: string; adcode: string }[]` — 省列表。
- `cities: { name: string; adcode: string }[]` — 当前省下属市列表。
- `selectedProvince: string`（adcode） / `selectedCity: string`（adcode）。
- `loading: boolean` — 加载市列表或边界时的状态，用于禁用下拉/显示文案。

## 错误处理

- `fetch` 失败（网络/接口异常）：恢复下拉、打印错误日志，并以 `alert` 提示用户“加载失败，请检查网络”。
- 接口返回结构异常（无 features）：提示“未获取到边界数据”。

## 涉及文件

仅 `src/components/HelloWorld.vue`：
- `<template>`：toolbar 增加两个 `<select>`。
- `<script setup>`：新增 province/city 状态、两个 `onMounted` 之外的加载函数（`loadProvinces`、`loadCities`、`loadCityBoundary`）、`fetch` 逻辑、GeoJSON 解析。
- 不引入新 npm 依赖（GeoJSON 格式解析由 `ol` 自带）。

## 验收标准

1. 页面打开后省下拉自动填充全国省份。
2. 选择省后，市下拉填充该省下属市。
3. 选择市后，地图出现该市行政边界多边形，且带有删除按钮；点击删除按钮可移除该边界图形。
4. 加载省市边界不会清空已有手绘/边界图形。
5. 加载失败时给出明确提示，页面不崩溃。
6. `vue-tsc -b` 类型检查通过。

## 非目标（YAGNI）

- 不实现省+市+区三级。
- 不实现离线本地 GeoJSON。
- 不实现“裁剪手绘范围到省市边界”模式。
- 不修改地图底图或既有手绘交互。
