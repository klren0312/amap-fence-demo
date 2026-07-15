# 省市区域加载为 Fence 图形 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在围栏绘制页增加省/市两级联动下拉，选择市后自动加载其行政边界并作为 fence 图形加入地图，与手绘图形行为一致。

**Architecture:** 仅改动 `src/components/HelloWorld.vue`。模板新增两个级联 `<select>`；脚本新增省/市状态与三个加载函数，通过阿里 DataV GeoAtlas 在线接口获取 GeoJSON，用 `ol/format/GeoJSON` 做坐标投影后 `source.addFeatures(...)`。复用现有 `addfeature` 监听，边界图形自动获得删除按钮。

**Tech Stack:** Vue 3 `<script setup>`、OpenLayers 10（`ol/format/GeoJSON`）、TypeScript、Vite。无新 npm 依赖。

## 测试与验证说明（项目无单测框架）

本仓库未安装任何单元测试运行器（无 vitest/jest）。因此本计划**不使用 TDD 单测**，每个任务的验证门槛为：

- 类型检查：`node_modules/.bin/vue-tsc -b`（等价于 `npm run build` 的检查阶段），必须无错误。
- 手动验证：`npm run dev` 启动后，在浏览器中按任务验收点操作，确认行为正确且无 console 报错。

每个任务末尾都给出对应的 `vue-tsc -b` 命令与期望输出，以及浏览器验收动作。

## Global Constraints

- 数据来源：阿里 DataV 在线接口 `https://geo.datav.aliyun.com/areas_v3/bound/{adcode}_full.json`（需联网）。
- 投影：GeoJSON 为 EPSG:4326，地图视图为 EPSG:3857，必须用 `ol/format/GeoJSON` 的 `featureProjection: "EPSG:3857"` 转换，否则位置错位。
- 叠加策略：新增不清空；选择省时重置市下拉。
- 删除交互：复用现有 `addfeature` 监听与 `addDeleteButton`，边界图形自动带删除按钮，无需额外处理。
- 仅改动 `src/components/HelloWorld.vue`，不引入新依赖。
- `vue-tsc -b` 必须全程零错误。

---

### Task 1: 新增省/市下拉 UI 与状态、加载省份列表

**Files:**
- Modify: `src/components/HelloWorld.vue`（template 的 `.toolbar`、script 顶部 import 与状态、onMounted 内调用）

**Interfaces:**
- 本任务产出：`provinces`(ref)、`selectedProvince`(ref)、`loading`(ref)、`loadProvinces()`，供 Task 2/3 使用。
- 本任务消费：现有 `onMounted`（在其内调用 `loadProvinces()`）。

- [ ] **Step 1: 模板新增两个级联 select**

在 `<div class="toolbar">` 内、`删除最后一个` 按钮之前插入：

```html
    <select :disabled="loading" v-model="selectedProvince" @change="onProvinceChange">
      <option value="">选择省份</option>
      <option v-for="p in provinces" :key="p.adcode" :value="p.adcode">{{ p.name }}</option>
    </select>
    <select :disabled="loading || !selectedProvince" v-model="selectedCity" @change="onCityChange">
      <option value="">选择城市</option>
      <option v-for="c in cities" :key="c.adcode" :value="c.adcode">{{ c.name }}</option>
    </select>
```

- [ ] **Step 2: 脚本新增 import 与状态**

在 `import { onMounted, onUnmounted } from "vue";` 改为引入 `ref`：

```ts
import { onMounted, onUnmounted, ref } from "vue";
```

在 `import Draw from "ol/interaction/Draw";` 之后新增：

```ts
import GeoJSON from "ol/format/GeoJSON";

interface AreaOption {
  name: string;
  adcode: string;
}

const provinces = ref<AreaOption[]>([]);
const cities = ref<AreaOption[]>([]);
const selectedProvince = ref("");
const selectedCity = ref("");
const loading = ref(false);
```

- [ ] **Step 3: 实现 loadProvinces 并在 onMounted 调用**

在 `addDeleteButton` 函数之前（或脚本任意顶层位置）新增：

```ts
async function loadProvinces() {
  try {
    loading.value = true;
    const res = await fetch("https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json");
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    provinces.value = (data.features || []).map((f: any) => ({
      name: f.properties.name,
      adcode: String(f.properties.adcode),
    }));
  } catch (e) {
    console.error("加载省份失败", e);
    alert("加载省份失败，请检查网络");
  } finally {
    loading.value = false;
  }
}
```

在 `onMounted(() => {` 块内、创建地图代码之前新增一行调用：

```ts
  loadProvinces();
```

- [ ] **Step 4: 类型检查验证**

Run: `node_modules/.bin/vue-tsc -b`
Expected: 无输出（零错误）。此时 `onProvinceChange` / `onCityChange` 尚未定义，类型检查会报这两个函数不存在 —— 属预期，Task 2/3 补完后消失。若只想验证本任务的结构，可临时注释掉两个 `@change` 绑定的函数名后再跑；正常流程下直接继续 Task 2。

- [ ] **Step 5: 浏览器手动验证**

Run: `npm run dev`，打开页面。
验收：toolbar 出现“选择省份”“选择城市”两个下拉；省份下拉在加载后填充全国省份；城市下拉初始为空且禁用。确认无 console 报错。

---

### Task 2: 省级变化时加载下属市（级联）

**Files:**
- Modify: `src/components/HelloWorld.vue`（新增 `onProvinceChange`，复用 `cities`/`selectedCity` 状态）

**Interfaces:**
- 本任务产出：`onProvinceChange()`，供模板 `selectedProvince` 的 `@change` 调用。
- 本任务消费：`provinces`/`selectedProvince`/`cities`/`selectedCity`/`loading`（Task 1 已建立）。

- [ ] **Step 1: 实现 onProvinceChange**

在 `loadProvinces` 函数之后新增：

```ts
async function onProvinceChange() {
  cities.value = [];
  selectedCity.value = "";
  if (!selectedProvince.value) return;
  try {
    loading.value = true;
    const res = await fetch(
      `https://geo.datav.aliyun.com/areas_v3/bound/${selectedProvince.value}_full.json`
    );
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    cities.value = (data.features || []).map((f: any) => ({
      name: f.properties.name,
      adcode: String(f.properties.adcode),
    }));
  } catch (e) {
    console.error("加载城市失败", e);
    alert("加载城市失败，请检查网络");
  } finally {
    loading.value = false;
  }
}
```

- [ ] **Step 2: 类型检查验证**

Run: `node_modules/.bin/vue-tsc -b`
Expected: 仍可能报 `onCityChange` 未定义（Task 3 补）。若只想本任务通过，可临时把城市 select 的 `@change="onCityChange"` 改为 `@change="onProvinceChange"` 跑一次，确认零错误后再改回。正常流程直接继续 Task 3。

- [ ] **Step 3: 浏览器手动验证**

Run: `npm run dev`。
验收：选择一个省后，城市下拉被填充该省下属市，且自动启用；切换省时城市下拉内容刷新、已选城市被清空。

---

### Task 3: 选择市后加载边界并作为 fence 图形加入地图

**Files:**
- Modify: `src/components/HelloWorld.vue`（新增 `onCityChange`，使用 `GeoJSON` 与 `source.addFeatures`）

**Interfaces:**
- 本任务产出：`onCityChange()`，供模板 `selectedCity` 的 `@change` 调用。
- 本任务消费：`selectedCity`/`loading`/`source`（`VectorSource` 实例）、`GeoJSON`（Task 1 已 import）。

- [ ] **Step 1: 实现 onCityChange**

在 `onProvinceChange` 函数之后新增：

```ts
async function onCityChange() {
  if (!selectedCity.value) return;
  try {
    loading.value = true;
    const res = await fetch(
      `https://geo.datav.aliyun.com/areas_v3/bound/${selectedCity.value}_full.json`
    );
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const features = new GeoJSON().readFeatures(data, {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:3857",
    });
    if (!features.length) {
      alert("未获取到边界数据");
      return;
    }
    source.addFeatures(features);
  } catch (e) {
    console.error("加载边界失败", e);
    alert("加载边界失败，请检查网络");
  } finally {
    loading.value = false;
  }
}
```

- [ ] **Step 2: 类型检查验证**

Run: `node_modules/.bin/vue-tsc -b`
Expected: 无输出（零错误）。此时三个函数与两个下拉全部定义完毕。

- [ ] **Step 3: 浏览器手动验证**

Run: `npm run dev`。
验收：
1. 选择某省→某市后，地图上出现该市行政边界多边形。
2. 边界图形自动带删除按钮，点击可移除。
3. 加载边界不会清空已有手绘/边界图形。
4. 断网或接口异常时，弹出“加载失败”提示且页面不崩溃。

- [ ] **Step 4: 整体回归**

Run: `npm run build`
Expected：`vue-tsc -b && vite build` 全部通过，产物正常生成。
