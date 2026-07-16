<template>
  <div class="map-wrapper">
    <div id="amap" class="map"></div>

    <MapToolbar
      v-model:selectedProvince="selectedProvince"
      v-model:selectedCity="selectedCity"
      :provinces="provinces"
      :cities="cities"
      :loading="loading"
      :drawing="drawing"
      @draw-polygon="drawPolygon"
      @draw-circle="drawCircle"
      @cancel-draw="cancelDraw"
      @province-change="onProvinceChange"
      @city-change="onCityChange"
      @add-boundary="addSelectedBoundary"
    />

    <MapSearch :geocoder="geocoder" @select="searchMoveTo" />

    <PointInFence :shapes="shapes" :geometry-util="geometryUtil" />

    <AddByCoords @add="onAddByCoords" />

    <ShapeList
      :shapes="shapes"
      :editing-id="editingId"
      @locate="locateShape"
      @delete="removeOverlay"
      @toggle-edit="toggleEdit"
    />
    <div class="point-view">经度：{{ currentLng }}，纬度：{{ currentLat }}</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import AMapLoader from "@amap/amap-jsapi-loader";
import type {
  AMapStatic,
  MapInstance,
  MouseToolInstance,
  DistrictSearchInstance,
  GeocoderInstance,
  CircleInstance,
  PolygonInstance,
  CircleEditorInstance,
  PolygonEditorInstance,
  DrawEvent,
  MapMouseEvent,
  DistrictResult,
} from "../types/amap";
import AddByCoords from "./AddByCoords.vue";
import ShapeList, { type ShapeItem } from "./ShapeList.vue";
import MapToolbar from "./MapToolbar.vue";
import MapSearch from "./MapSearch.vue";
import PointInFence from "./PointInFence.vue";

const AMAP_KEY = import.meta.env.VITE_AMAP_KEY;
const AMAP_SECURITY = import.meta.env.VITE_AMAP_SECURITY;

// 行政区划选项（省份/城市）
interface AreaOption {
  name: string;
  adcode: string;
}

// 通过经纬度坐标添加图形时的入参
interface GeoInput {
  type: "circle" | "polygon";
  center?: [number, number];
  radius?: number;
  path?: [number, number][];
}

// 省份列表
const provinces = ref<AreaOption[]>([]);
// 城市列表
const cities = ref<AreaOption[]>([]);
// 当前选中的省份 adcode
const selectedProvince = ref("");
// 当前选中的城市 adcode
const selectedCity = ref("");
// 行政区划查询（省市联动）加载中状态
const loading = ref(false);
// 是否正在使用鼠标工具绘制图形
const drawing = ref(false);

// 高德 JS API 全局对象
let AMap: AMapStatic | null = null;
// 地图实例
let map: MapInstance | null = null;
// 鼠标绘制工具实例
let mouseTool: MouseToolInstance | null = null;
// 行政区划查询实例
let district: DistrictSearchInstance | null = null;
// 地理编码（地址解析）实例
let geocoder: GeocoderInstance | null = null;
// 几何计算工具（围栏包含判断等）
let geometryUtil: typeof import("../types/amap").GeometryUtilNamespace | null =
  null;
// 当前激活的图形编辑器（保证同时只有一个）
let activeEditor: CircleEditorInstance | PolygonEditorInstance | null = null;
// 当前正在编辑的图形 id
const editingId = ref<string | null>(null);

// 所有已添加的图形列表
const shapes = ref<ShapeItem[]>([]);
// 图形自增序号，用于生成唯一 id
let seq = 0;

const currentLng = ref(0);
const currentLat = ref(0);

onMounted(async () => {
  // 配置高德安全密钥
  (window as any)._AMapSecurityConfig = { securityJsCode: AMAP_SECURITY };
  try {
    // 加载高德地图及所需插件
    AMap = await AMapLoader.load({
      key: AMAP_KEY,
      version: "2.0",
      plugins: [
        "AMap.MouseTool",
        "AMap.DistrictSearch",
        "AMap.CircleEditor",
        "AMap.PolygonEditor",
        "AMap.Geocoder",
        "AMap.GeometryUtil",
      ],
    });
  } catch (e) {
    console.error("高德地图加载失败:", e);
    alert("高德地图加载失败，请检查网络和 Key 配置");
    return;
  }

  // 初始化地图
  map = new AMap!.Map("amap", {
    zoom: 9,
    center: [117.23, 31.82],
  });
  map.on("mousemove", (e) => {
    currentLng.value = (e as MapMouseEvent).lnglat.lng;
    currentLat.value = (e as MapMouseEvent).lnglat.lat;
  });

  // 初始化鼠标绘制工具，监听绘制完成事件
  mouseTool = new AMap!.MouseTool(map);
  mouseTool.on("draw", (e) => {
    const overlay = (e as DrawEvent).obj;
    // 有 getRadius 方法说明是圆形，否则为多边形
    const type: "Circle" | "Polygon" = overlay.getRadius ? "Circle" : "Polygon";
    // 从DrawEvent事件对象中提取overlay实例，确保类型正确
    const item = makeItem(overlay, type)
    shapes.value.push(item);
    overlay.on("click", () => {
      if (editingId.value !== item.id) startEdit(item);
    });
    drawing.value = false;
    // 绘制完成后立即停止绘制工具，避免误触再次落笔
    mouseTool!.close(false);
  });

  // 初始化行政区划查询（subdistrict:1 取下级，extensions:all 返回边界坐标）
  district = new AMap!.DistrictSearch({ subdistrict: 1, extensions: "all" });
  // 初始化地理编码实例，用于地址搜索
  geocoder = new AMap!.Geocoder({});
  // 几何计算工具，用于判断点是否在围栏内
  geometryUtil = AMap!.GeometryUtil;
  loadProvinces();
});

onUnmounted(() => {
  // 组件销毁时关闭绘制工具并销毁地图，防止内存泄漏
  mouseTool?.close(true);
  map?.destroy();
});

// 根据图形类型返回统一的描边/填充样式
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

// 生成一个图形列表项（含唯一 id 与展示名称）
function makeItem(
  overlay: CircleInstance | PolygonInstance,
  type: "Circle" | "Polygon",
  name?: string,
): ShapeItem {
  const label =
    name ||
    `${type === "Circle" ? "圆形" : "多边形"} ${shapes.value.length + 1}`;
  return { id: `shape-${++seq}`, name: label, type, overlay };
}

// 将图形添加到地图与列表，并绑定点击进入编辑的监听
function addOverlay(
  overlay: CircleInstance | PolygonInstance,
  type: "Circle" | "Polygon",
  name?: string,
) {
  // 新增图形时结束其他编辑，保证同时只有一个编辑器
  stopEdit();
  overlay.setMap(map);
  overlay.setOptions(styleFor(type));
  const item = makeItem(overlay, type, name);
  // 点击地图上的图形直接进入编辑模式
  overlay.on("click", () => {
    console.log(item.id, editingId.value)
    if (editingId.value !== item.id) startEdit(item);
  });
  shapes.value.push(item);
}

// 开启多边形绘制
function drawPolygon() {
  cancelDraw();
  mouseTool!.polygon(styleFor("Polygon"));
  drawing.value = true;
}

// 开启圆形绘制
function drawCircle() {
  cancelDraw();
  mouseTool!.circle(styleFor("Circle"));
  drawing.value = true;
}

// 取消当前绘制（不保留已落笔的图形）
function cancelDraw() {
  mouseTool?.close(false);
  drawing.value = false;
}

// 缩放并平移地图以显示指定图形
function locateShape(item: ShapeItem) {
  map!.setFitView([item.overlay], false, [60, 60, 60, 60]);
}

// 地址搜索结果选中后，移动地图中心到该坐标
function searchMoveTo(location: [number, number]) {
  map!.setZoomAndCenter(10, location);
}

// 开始编辑指定图形（圆形用 CircleEditor，多边形用 PolygonEditor）
function startEdit(item: ShapeItem) {
  stopEdit();
  editingId.value = item.id;
  if (item.type === "Circle") {
    activeEditor = new AMap!.CircleEditor(
      map as MapInstance,
      item.overlay as CircleInstance,
    );
  } else {
    activeEditor = new AMap!.PolygonEditor(
      map as MapInstance,
      item.overlay as PolygonInstance,
    );
  }
  activeEditor.open();
}

// 关闭当前编辑器并清空编辑状态
function stopEdit() {
  if (activeEditor) {
    activeEditor.close();
    activeEditor = null;
  }
  editingId.value = null;
}

// 列表中的编辑/完成按钮：在编辑与停止之间切换
function toggleEdit(item: ShapeItem) {
  if (editingId.value === item.id) {
    stopEdit();
  } else {
    startEdit(item);
  }
}

// 从地图和列表移除图形，并清理点击监听
function removeOverlay(item: ShapeItem) {
  if (editingId.value === item.id) stopEdit();
  try {
    item.overlay.off("click");
    item.overlay.setMap(null);
  } catch (e) {
    console.error("移除图形失败", e);
  }
  shapes.value = shapes.value.filter((s) => s.id !== item.id);
}

// 根据坐标输入（经纬度/半径/路径）创建圆形或多边形
function onAddByCoords(input: GeoInput) {
  if (input.type === "circle" && input.center && input.radius) {
    const [lng, lat] = input.center;
    const circle = new AMap!.Circle({
      center: [lng, lat],
      radius: input.radius,
      ...styleFor("Circle"),
    });
    addOverlay(circle, "Circle", `圆形 (${lng.toFixed(4)}, ${lat.toFixed(4)})`);
  } else if (input.type === "polygon" && input.path) {
    const path = input.path.map(([lng, lat]) => [lng, lat]);
    const poly = new AMap!.Polygon({ path, ...styleFor("Polygon") });
    const [lng, lat] = input.path[0];
    addOverlay(
      poly,
      "Polygon",
      `多边形 (${lng.toFixed(4)}, ${lat.toFixed(4)})`,
    );
  }
}

// 加载全国省份列表
function loadProvinces() {
  loading.value = true;
  district!.search("100000", (status: string, result: DistrictResult) => {
    loading.value = false;
    if (status === "complete" && result.districtList?.[0]?.districtList) {
      provinces.value = result.districtList[0].districtList.map((d) => ({
        name: d.name,
        adcode: d.adcode,
      }));
    }
  });
}

// 省份切换：清空城市并加载该省下辖市
function onProvinceChange() {
  cities.value = [];
  selectedCity.value = "";
  if (!selectedProvince.value) return;
  loading.value = true;
  district!.search(
    selectedProvince.value,
    (status: string, result: DistrictResult) => {
      loading.value = false;
      const children = result.districtList?.[0]?.districtList;
      if (status === "complete" && children) {
        cities.value = children.map((d) => ({
          name: d.name,
          adcode: d.adcode,
        }));
      }
    },
  );
}

// 城市切换：选中后直接添加该城市边界
function onCityChange() {
  if (selectedCity.value) addSelectedBoundary(selectedCity.value);
}

// 根据 adcode 查询行政区划边界并绘制为多边形
function addSelectedBoundary(adcode: string) {
  if (!adcode) return;
  loading.value = true;
  district!.search(adcode, (status: string, result: DistrictResult) => {
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
    // boundaries 中最后一组为该区域自身完整外轮廓，其余为下属子级（市/区）轮廓。
    // 只绘制区域自身完整轮廓，避免把每个子级都当成一个独立图形画出来。
    const poly = new AMap!.Polygon({
      path: boundaries[boundaries.length - 1],
      ...styleFor("Polygon"),
    });
    addOverlay(poly, "Polygon", name);
  });
}
</script>

<style scoped>
.map-wrapper {
  position: relative;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.map {
  position: absolute;
  inset: 0;
}

.point-view {
  position: fixed;
  bottom: 20px;
  right: 20px;
  color: #333;
  font-weight: bold;
  font-size: 16px;
}
</style>
