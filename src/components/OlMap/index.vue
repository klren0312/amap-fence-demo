<template>
  <div class="ol-map">
    <div id="map" class="map" style="height: 100vh; width: 100vw;"></div>
    <div class="toolbar">
      <button @click="drawPolygon">绘制多边形</button>
      <button @click="drawCircle">绘制圆形</button>
      <button :disabled="!drawing" @click="removeActiveDraw">取消编辑</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import 'ol/ol.css'
import { onMounted, onUnmounted, ref } from "vue";
import TileLayer from "ol/layer/Tile";
import { XYZ } from "ol/source";
import { Map as OlMap, View } from "ol";
import { fromLonLat } from "ol/proj";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Style, Fill, Stroke } from "ol/style";
import Overlay from "ol/Overlay";
import Draw from "ol/interaction/Draw";
import gcj02Mecator from "./gcj02Mecator.ts";

const drawing = ref(false);

const source = new VectorSource();
const vectorLayer = new VectorLayer({ source });

let map: OlMap | null = null;
let activeDraw: Draw | null = null;

// 存储每个图形的删除按钮覆盖物（以 feature id 为 key，id 为字符串，可穿透 Vue 响应式代理）
const overlayMap = new Map<string, Overlay>();

const defaultStyle = new Style({
  fill: new Fill({ color: "rgba(51,136,255,0.3)" }),
  stroke: new Stroke({ color: "#3388ff", width: 2 }),
});

onMounted(() => {
  const gaodeMapLayer = new TileLayer({
    source: new XYZ({
      url: "http://wprd0{1-4}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=1&style=7",
      projection:gcj02Mecator,
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
</script>

<style scoped>
.ol-map {
  position: relative;
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