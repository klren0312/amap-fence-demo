<template>
  <div id="amap" class="map" style="height: 100vh; width: 100vw"></div>

  <div class="toolbar">
    <button @click="drawPolygon">绘制多边形</button>
    <button @click="drawCircle">绘制圆形</button>
    <button :disabled="!drawing" @click="cancelDraw">取消编辑</button>
    <select v-model="selectedProvince" :disabled="loading" @change="onProvinceChange">
      <option value="">选择省份</option>
      <option v-for="p in provinces" :key="p.adcode" :value="p.adcode">{{ p.name }}</option>
    </select>
    <select v-model="selectedCity" :disabled="loading || !selectedProvince" @change="onCityChange">
      <option value="">选择城市</option>
      <option v-for="c in cities" :key="c.adcode" :value="c.adcode">{{ c.name }}</option>
    </select>
    <button :disabled="loading || !selectedProvince" @click="addSelectedBoundary(selectedProvince)">
      添加该区域
    </button>
  </div>

  <AddByCoords @add="onAddByCoords" />

  <ShapeList :shapes="shapes" :editing-id="editingId" @locate="locateShape" @delete="removeOverlay" @toggle-edit="toggleEdit" />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import AMapLoader from "@amap/amap-jsapi-loader";
import AddByCoords from "./AddByCoords.vue";
import ShapeList, { type ShapeItem } from "./ShapeList.vue";

// TODO: 替换为你的高德 JS API Key 与安全密钥（securityJsCode）
const AMAP_KEY = import.meta.env.VITE_AMAP_KEY;
const AMAP_SECURITY = import.meta.env.VITE_AMAP_SECURITY;

interface AreaOption {
  name: string;
  adcode: string;
}

interface GeoInput {
  type: "circle" | "polygon";
  center?: [number, number];
  radius?: number;
  path?: [number, number][];
}

const provinces = ref<AreaOption[]>([]);
const cities = ref<AreaOption[]>([]);
const selectedProvince = ref("");
const selectedCity = ref("");
const loading = ref(false);
const drawing = ref(false);

let AMap: any = null;
let map: any = null;
let mouseTool: any = null;
let district: any = null;
let activeEditor: any = null;
const editingId = ref<string | null>(null);

const shapes = ref<ShapeItem[]>([]);
let seq = 0;

function styleFor(type: "Circle" | "Polygon") {
  return {
    strokeColor: "#3388ff",
    strokeWeight: 2,
    strokeOpacity: 0.9,
    fillColor: "#3388ff",
    fillOpacity: 0.3,
    ...(type === "Circle" ? { strokeStyle: "solid" as const } : {}),
  };
}

function makeItem(overlay: any, type: "Circle" | "Polygon", name?: string): ShapeItem {
  const label = name || `${type === "Circle" ? "圆形" : "多边形"} ${shapes.value.length + 1}`;
  return { id: `shape-${++seq}`, name: label, type, overlay };
}

function addOverlay(overlay: any, type: "Circle" | "Polygon", name?: string) {
  // 新增图形时结束其他编辑，保证同时只有一个编辑器
  stopEdit();
  overlay.setMap(map);
  overlay.setOptions(styleFor(type));
  shapes.value.push(makeItem(overlay, type, name));
}

function drawPolygon() {
  cancelDraw();
  mouseTool.polygon(styleFor("Polygon"));
  drawing.value = true;
}

function drawCircle() {
  cancelDraw();
  mouseTool.circle(styleFor("Circle"));
  drawing.value = true;
}

function cancelDraw() {
  mouseTool?.close(false);
  drawing.value = false;
}

function locateShape(item: ShapeItem) {
  map.setFitView([item.overlay], false, [60, 60, 60, 60]);
}

function startEdit(item: ShapeItem) {
  stopEdit();
  editingId.value = item.id;
  if (item.type === "Circle") {
    activeEditor = new AMap.CircleEditor(map, item.overlay);
  } else {
    activeEditor = new AMap.PolygonEditor(map, item.overlay);
  }
  activeEditor.open();
}

function stopEdit() {
  if (activeEditor) {
    activeEditor.close();
    activeEditor = null;
  }
  editingId.value = null;
}

function toggleEdit(item: ShapeItem) {
  if (editingId.value === item.id) {
    stopEdit();
  } else {
    startEdit(item);
  }
}

function removeOverlay(item: ShapeItem) {
  if (editingId.value === item.id) stopEdit();
  try {
    item.overlay.setMap(null);
  } catch (e) {
    console.error("移除图形失败", e);
  }
  shapes.value = shapes.value.filter((s) => s.id !== item.id);
}

function onAddByCoords(input: GeoInput) {
  if (input.type === "circle" && input.center && input.radius) {
    const [lng, lat] = input.center;
    const circle = new AMap.Circle({
      center: [lng, lat],
      radius: input.radius,
      ...styleFor("Circle"),
    });
    addOverlay(circle, "Circle", `圆形 (${lng.toFixed(4)}, ${lat.toFixed(4)})`);
  } else if (input.type === "polygon" && input.path) {
    const path = input.path.map(([lng, lat]) => [lng, lat]);
    const poly = new AMap.Polygon({ path, ...styleFor("Polygon") });
    const [lng, lat] = input.path[0];
    addOverlay(poly, "Polygon", `多边形 (${lng.toFixed(4)}, ${lat.toFixed(4)})`);
  }
}

function loadProvinces() {
  loading.value = true;
  district.search("100000", (status: string, result: any) => {
    loading.value = false;
    if (status === "complete" && result.districtList?.[0]?.districtList) {
      provinces.value = result.districtList[0].districtList.map((d: any) => ({
        name: d.name,
        adcode: d.adcode,
      }));
    }
  });
}

function onProvinceChange() {
  cities.value = [];
  selectedCity.value = "";
  if (!selectedProvince.value) return;
  loading.value = true;
  district.search(selectedProvince.value, (status: string, result: any) => {
    loading.value = false;
    const children = result.districtList?.[0]?.districtList;
    if (status === "complete" && children) {
      cities.value = children.map((d: any) => ({ name: d.name, adcode: d.adcode }));
    }
  });
}

function onCityChange() {
  if (selectedCity.value) addSelectedBoundary(selectedCity.value);
}

function addSelectedBoundary(adcode: string) {
  if (!adcode) return;
  loading.value = true;
  district.search(adcode, (status: string, result: any) => {
    loading.value = false;
    if (status !== "complete") {
      alert("加载边界失败，请检查网络");
      return;
    }
    const districtInfo = result.districtList?.[0];
    const boundaries = districtInfo?.boundaries;
    if (!boundaries || !boundaries.length) {
      alert("未获取到边界数据");
      return;
    }
    const name = districtInfo.name;
    boundaries.forEach((path: any[], i: number) => {
      const poly = new AMap.Polygon({ path, ...styleFor("Polygon") });
      const suffix = boundaries.length > 1 ? ` (${i + 1})` : "";
      addOverlay(poly, "Polygon", `${name}${suffix}`);
    });
  });
}

onMounted(async () => {
  (window as any)._AMapSecurityConfig = { securityJsCode: AMAP_SECURITY };
  AMap = await AMapLoader.load({
    key: AMAP_KEY,
    version: "2.0",
    plugins: ["AMap.MouseTool", "AMap.DistrictSearch", "AMap.CircleEditor", "AMap.PolygonEditor"],
  });

  map = new AMap.Map("amap", {
    zoom: 9,
    center: [117.23, 31.82],
  });

  mouseTool = new AMap.MouseTool(map);
  mouseTool.on("draw", (e: any) => {
    const overlay = e.obj;
    const type: "Circle" | "Polygon" = overlay.getRadius ? "Circle" : "Polygon";
    shapes.value.push(makeItem(overlay, type));
    drawing.value = false;
    // 绘制完成后立即停止绘制工具，避免误触再次落笔
    mouseTool.close(false);
  });

  district = new AMap.DistrictSearch({ subdistrict: 1, extensions: "all" });
  loadProvinces();
});

onUnmounted(() => {
  mouseTool?.close(true);
  map?.destroy();
});
</script>

<style scoped>
.map {
  position: absolute;
  inset: 0;
}

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

.toolbar button:hover:not(:disabled) {
  background: #e8e8e8;
}

.toolbar button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
