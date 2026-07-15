# Vue 3 + TypeScript + Vite

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about the recommended Project Setup and IDE Support in the [Vue Docs TypeScript Guide](https://vuejs.org/guide/typescript/overview.html#project-setup).

```vue
<template>
  <div id="map" class="map" style="height: 100vh; width: 100vw;"></div>
  <div class="toolbar">
    <button @click="drawPolygon">绘制多边形</button>
    <button @click="drawCircle">绘制圆形</button>
    <button :disabled="!drawing" @click="removeActiveDraw">取消编辑</button>
    <select :disabled="loading" v-model="selectedProvince" @change="onProvinceChange">
      <option value="">选择省份</option>
      <option v-for="p in provinces" :key="p.adcode" :value="p.adcode">{{ p.name }}</option>
    </select>
    <select :disabled="loading || !selectedProvince" v-model="selectedCity" @change="onCityChange">
      <option value="">选择城市</option>
      <option v-for="c in cities" :key="c.adcode" :value="c.adcode">{{ c.name }}</option>
    </select>
    <button :disabled="loading || !selectedProvince" @click="addProvinceBoundary">添加该省</button>
  </div>

  <AddByCoords @add="onAddByCoords" />

  <ShapeList :shapes="shapes" @locate="locateShape" @delete="removeFeature" />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import TileLayer from "ol/layer/Tile";
import { XYZ } from "ol/source";
import { Map as OlMap, View } from "ol";
import { getUid } from "ol/util";
import { fromLonLat } from "ol/proj";
// import { getCenter } from "ol/extent";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Style, Fill, Stroke } from "ol/style";
import Overlay from "ol/Overlay";
import Draw from "ol/interaction/Draw";
import GeoJSON from "ol/format/GeoJSON";
import Feature from "ol/Feature";
import AddByCoords from "./AddByCoords.vue";
import ShapeList, { type ShapeItem } from "./ShapeList.vue";

interface AreaOption {
  name: string;
  adcode: string;
}

const provinces = ref<AreaOption[]>([]);
const cities = ref<AreaOption[]>([]);
const selectedProvince = ref("");
const selectedCity = ref("");
const loading = ref(false);
const drawing = ref(false);

const source = new VectorSource();
const vectorLayer = new VectorLayer({ source });

let map: OlMap | null = null;
let activeDraw: Draw | null = null;

// 存储每个图形的删除按钮覆盖物（以 feature id 为 key，id 为字符串，可穿透 Vue 响应式代理）
const overlayMap = new Map<string, Overlay>();
// let shapeSeq = 0;

// 图形列表（数据由本组件维护，UI 由 ShapeList 组件渲染）
const shapes = ref<ShapeItem[]>([]);

function locateShape(feature: any) {
  const geom = feature.getGeometry();
  if (geom && map) {
    map.getView().fit(geom, { padding: [60, 60, 60, 60], duration: 500, maxZoom: 14 });
  }
}

function addShapeItem(feature: any) {
  const geom = feature.getGeometry();
  const type = geom ? geom.getType() : "未知";
  const name = feature.get("name") || `图形 ${shapes.value.length + 1}`;
  shapes.value.push({ id: String(getUid(feature)), name, type, feature });
}

function removeShapeItem(feature: any) {
  const id = String(getUid(feature));
  shapes.value = shapes.value.filter((s) => s.id !== id);
}

const defaultStyle = new Style({
  fill: new Fill({ color: "rgba(51,136,255,0.3)" }),
  stroke: new Stroke({ color: "#3388ff", width: 2 }),
});

// 删除指定图形
function removeFeature(feature: any) {
  source.removeFeature(feature);
  const id = feature.getId() || "";
  const overlay = overlayMap.get(id);
  if (overlay && map) {
    map.removeOverlay(overlay);
    overlayMap.delete(id);
  }
}

// 为图形添加删除按钮
// function addDeleteButton(feature: any) {
//   const featureId = feature.getId() || `shape-${++shapeSeq}`;
//   feature.setId(featureId);
  
//   // 获取图形的中心点
//   const geometry = feature.getGeometry();
//   if (!geometry) return;
  
//   const center = getCenter(geometry.getExtent());
  
//   // 创建删除按钮元素
//   const buttonDiv = document.createElement("div");
//   buttonDiv.className = "delete-button";
//   buttonDiv.innerHTML = "×";
//   buttonDiv.title = "删除此图形";
//   buttonDiv.style.cssText = `
//     width: 24px;
//     height: 24px;
//     border-radius: 50%;
//     background: #ff4444;
//     color: white;
//     border: 2px solid white;
//     cursor: pointer;
//     display: flex;
//     align-items: center;
//     justify-content: center;
//     font-size: 16px;
//     font-weight: bold;
//     box-shadow: 0 2px 4px rgba(0,0,0,0.3);
//     transition: transform 0.2s;
//   `;
//   buttonDiv.onmouseover = () => {
//     buttonDiv.style.transform = "scale(1.2)";
//   };
//   buttonDiv.onmouseout = () => {
//     buttonDiv.style.transform = "scale(1)";
//   };
//   buttonDiv.onclick = () => {
//     removeFeature(feature);
//   };
  
//   // 创建覆盖物
//   const overlay = new Overlay({
//     element: buttonDiv,
//     positioning: "center-center",
//     offset: [0, 0],
//   });
  
//   overlay.setPosition(center);
//   overlayMap.set(featureId, overlay);
//   map?.addOverlay(overlay);
// }

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

async function onCityChange() {
  if (!selectedCity.value) return;
  await loadBoundary(selectedCity.value);
}

async function addProvinceBoundary() {
  if (!selectedProvince.value) return;
  await loadBoundary(selectedProvince.value);
}

async function loadBoundary(adcode: string) {
  try {
    loading.value = true;
    const res = await fetch(
      `https://geo.datav.aliyun.com/areas_v3/bound/${adcode}.json`
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

onMounted(() => {
  loadProvinces();
  const gaodeMapLayer = new TileLayer({
    source: new XYZ({
      url: "http://wprd0{1-4}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=1&style=7",
      wrapX: false,
    }),
  });

  map = new OlMap({
    target: "map",
    layers: [gaodeMapLayer, vectorLayer],
    view: new View({
      center: fromLonLat([117.23, 31.82]),
      zoom: 9,
      projection: "EPSG:3857",
    }),
  });

  vectorLayer.setStyle(defaultStyle);

  // 监听图形添加/删除事件
  source.on("addfeature", (e) => {
    // addDeleteButton(e.feature);
    addShapeItem(e.feature);
  });
  source.on("removefeature", (e) => {
    removeShapeItem(e.feature);
  });
});

onUnmounted(() => {
  removeActiveDraw();
  // 清理所有覆盖物
  overlayMap.forEach((overlay) => {
    map?.removeOverlay(overlay);
  });
  overlayMap.clear();
});

function removeActiveDraw() {
  if (activeDraw && map) {
    map.removeInteraction(activeDraw);
    activeDraw = null;
  }
  drawing.value = false;
}

function drawPolygon() {
  removeActiveDraw();
  const draw = new Draw({
    type: "Polygon",
    source,
  });
  map?.addInteraction(draw);
  activeDraw = draw;
  drawing.value = true;
}

function drawCircle() {
  removeActiveDraw();
  const draw = new Draw({
    type: "Circle",
    source,
  });
  map?.addInteraction(draw);
  activeDraw = draw;
  drawing.value = true;
}

// function deleteLast() {
//   const feats = source.getFeatures();
//   if (feats.length > 0) {
//     removeFeature(feats[feats.length - 1]);
//   }
// }

// function deleteAll() {
//   source.getFeatures().forEach((feature) => {
//     removeFeature(feature);
//   });
// }

// 由 AddByCoords 组件按坐标创建图形后添加到地图
function onAddByCoords(feature: Feature) {
  source.addFeature(feature);
}
</script>

<style scoped>
.toolbar {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1000;
  display: flex;
  gap: 8px;
  background: #fff;
  padding: 10px;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.toolbar button {
  padding: 6px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #f8f8f8;
  cursor: pointer;
  font-size: 14px;
}

.toolbar button:hover {
  background: #e8e8e8;
}

.delete-button {
  width: 24px !important;
  height: 24px !important;
  border-radius: 50% !important;
  background: #ff4444 !important;
  color: white !important;
  border: 2px solid white !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 16px !important;
  font-weight: bold !important;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3) !important;
  transition: transform 0.2s !important;
  pointer-events: auto !important;
}

.delete-button:hover {
  transform: scale(1.2) !important;
}
</style>

```