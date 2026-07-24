<template>
  <div v-if="active" class="draw-tip">
    <span>{{ tipText }}</span>
    <button class="draw-tip__cancel" @click="cancel">取消</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount } from "vue";
import type {
  AMapStatic,
  MapInstance,
  CircleInstance,
  PolygonInstance,
  MapMouseEvent,
  MarkerInstance,
  PolylineInstance,
  PixelInstance,
  LngLatInstance,
} from "./amap";

const props = defineProps<{
  map: MapInstance;
  amap: AMapStatic;
}>();

const emit = defineEmits<{
  (e: "drawn", overlay: CircleInstance | PolygonInstance, type: "Circle" | "Polygon"): void;
  (e: "cancel"): void;
}>();

type Mode = "circle" | "polygon" | null;
const active = ref(false);
const tipText = ref("");

// ─── 圆形草稿 ───
// 预览阶段用 Circle（米制半径），clickable:false 使点击穿透到地图，完成时复用该 Circle
type CircleDraft = {
  center: [number, number];
  centerLngLat: LngLatInstance;
  centerMarker: MarkerInstance;   // 圆心小圆点
  preview: CircleInstance;        // AMap.Circle 做预览（米制半径，与成品一致）
  radius: number;                 // 当前半径（米）
  committed: boolean;
};

// ─── 多边形草稿 ───
type PolygonDraft = {
  vertexMarkers: MarkerInstance[];
  path: [number, number][];
  polygon: PolygonInstance;
  edgeLine: PolylineInstance;
};

let mode: Mode = null;
let circleDraft: CircleDraft | null = null;
let polygonDraft: PolygonDraft | null = null;

function cleanup() {
  if (circleDraft) {
    circleDraft.centerMarker.setMap(null);
    circleDraft.preview.setMap(null);
    circleDraft = null;
  }
  if (polygonDraft) {
    polygonDraft.vertexMarkers.forEach((m) => m.setMap(null));
    polygonDraft.polygon.setMap(null);
    polygonDraft.edgeLine.setMap(null);
    polygonDraft = null;
  }
  props.map.off("click", onMapClick);
  props.map.off("mousemove", onMapMove);
  props.map.off("dblclick", onMapDblclick);
  props.map.setDefaultCursor("default");
  mode = null;
  active.value = false;
}

onBeforeUnmount(cleanup);

const baseStyle = {
  strokeColor: "#3388ff",
  strokeWeight: 2,
  strokeOpacity: 0.9,
  fillColor: "#3388ff",
  fillOpacity: 0.3,
};

function start(nextMode: "circle" | "polygon") {
  cleanup();
  mode = nextMode;
  active.value = true;
  tipText.value =
    nextMode === "circle"
      ? "点击地图选择圆心"
      : "点击地图添加顶点，点击起点或双击完成";
  props.map.setDefaultCursor("crosshair");
  props.map.on("click", onMapClick);
  props.map.on("mousemove", onMapMove);
  props.map.on("dblclick", onMapDblclick);
}

function onMapClick(e: MapMouseEvent) {
  if (mode === "circle") handleCircleClick(e);
  else if (mode === "polygon") handlePolygonClick(e);
}

function onMapMove(e: MapMouseEvent) {
  if (mode === "circle") handleCircleMove(e);
  else if (mode === "polygon") handlePolygonMove(e);
}

// ═══════════════════════ 圆形 ═══════════════════════

function handleCircleClick(e: MapMouseEvent) {
  if (!circleDraft) {
    const lng = e.lnglat.getLng();
    const lat = e.lnglat.getLat();
    const centerLngLat = new props.amap.LngLat(lng, lat);

    // 圆心小圆点标记
    const centerMarker = new props.amap.Marker({
      position: centerLngLat,
      map: props.map,
      content: makeCenterDot(),
      offset: new props.amap.Pixel(-7, -7),
      anchor: "center",
      clickable: false,
      bubble: true,
    });

    // 预览用 Circle：米制半径，与最终成品一致，clickable:false 让点击穿透到地图
    const preview = new props.amap.Circle({
      center: centerLngLat,
      radius: 0,
      strokeColor: "#3388ff",
      strokeWeight: 2,
      strokeOpacity: 0.9,
      fillColor: "#3388ff",
      fillOpacity: 0.3,
      strokeStyle: "dashed",
      bubble: true,
      clickable: false,
      zIndex: 100,
    });
    preview.setMap(props.map);

    circleDraft = {
      center: [lng, lat],
      centerLngLat,
      centerMarker,
      preview,
      radius: 0,
      committed: false,
    };
    tipText.value = "移动鼠标确定半径，再次点击完成";
    return;
  }
  if (!circleDraft.committed) {
    finishCircle();
  }
}

function handleCircleMove(e: MapMouseEvent) {
  if (!circleDraft) return;
  const mouseLngLat = new props.amap.LngLat(e.lnglat.getLng(), e.lnglat.getLat());
  const radius = circleDraft.centerLngLat.distance(mouseLngLat);
  circleDraft.radius = radius;
  circleDraft.preview.setRadius(radius);
}

function finishCircle() {
  if (!circleDraft || circleDraft.committed) return;
  const draft = circleDraft;
  draft.committed = true;

  const radius = draft.radius;
  if (radius < 1) {
    draft.committed = false;
    return;
  }

  // 移除圆心辅助标记
  draft.centerMarker.setMap(null);

  // 复用预览 Circle 作为最终成品，切换为实线样式并开启交互
  draft.preview.setOptions({
    strokeStyle: "solid",
    bubble: false,
    clickable: true,
  });

  const circle = draft.preview;
  circleDraft = null;
  cleanup();
  emit("drawn", circle, "Circle");
}

function makeCenterDot(): string {
  return `<div style="width:14px;height:14px;border-radius:50%;background:#3388ff;border:2px solid #fff;box-shadow:0 0 3px rgba(0,0,0,.4);pointer-events:none"></div>`;
}

// ═══════════════════════ 多边形 ═══════════════════════

function handlePolygonClick(e: MapMouseEvent) {
  const lng = e.lnglat.getLng();
  const lat = e.lnglat.getLat();

  if (!polygonDraft) {
    const marker = new props.amap.Marker({
      position: [lng, lat],
      map: props.map,
      content: makeVertexDot(),
      offset: new props.amap.Pixel(-6, -6),
      anchor: "center",
      clickable: false,
      bubble: true,
    });
    const polyPath: [number, number][] = [[lng, lat]];
    const polygon = new props.amap.Polygon({
      path: polyPath.map((p) => new props.amap.LngLat(p[0], p[1])),
      map: props.map,
      ...baseStyle,
      bubble: true,
    });
    const edgeLine = new props.amap.Polyline({
      path: polyPath.map((p) => new props.amap.LngLat(p[0], p[1])),
      map: props.map,
      strokeColor: "#3388ff",
      strokeWeight: 2,
      strokeOpacity: 0.9,
      strokeStyle: "dashed",
      bubble: true,
    });
    polygonDraft = { vertexMarkers: [marker], path: polyPath, polygon, edgeLine };
    tipText.value = "继续点击添加顶点，点击起点或双击完成";
    return;
  }

  if (polygonDraft.path.length >= 3 && nearStartVertex(lng, lat)) {
    finishPolygon();
    return;
  }

  polygonDraft.path.push([lng, lat]);
  polygonDraft.vertexMarkers.push(
    new props.amap.Marker({
      position: [lng, lat],
      map: props.map,
      content: makeVertexDot(),
      offset: new props.amap.Pixel(-6, -6),
      anchor: "center",
      clickable: false,
      bubble: true,
    }),
  );
  polygonDraft.polygon.setPath(
    polygonDraft.path.map((p) => new props.amap.LngLat(p[0], p[1])),
  );
}

function handlePolygonMove(e: MapMouseEvent) {
  if (!polygonDraft || !polygonDraft.path.length) return;
  const last = polygonDraft.path[polygonDraft.path.length - 1];
  polygonDraft.edgeLine.setPath([
    new props.amap.LngLat(last[0], last[1]),
    new props.amap.LngLat(e.lnglat.getLng(), e.lnglat.getLat()),
  ]);
}

function finishPolygon() {
  if (!polygonDraft) return;
  if (polygonDraft.path.length < 3) return;
  const draft = polygonDraft;
  polygonDraft = null;
  const polygon = draft.polygon;
  draft.vertexMarkers.forEach((m) => m.setMap(null));
  draft.edgeLine.setMap(null);
  // 完成后把 polygon 恢复为可交互
  polygon.setOptions({ bubble: false, clickable: true });
  cleanup();
  emit("drawn", polygon, "Polygon");
}

function onMapDblclick() {
  if (mode === "polygon" && polygonDraft && polygonDraft.path.length >= 3) {
    finishPolygon();
  }
}

function nearStartVertex(lng: number, lat: number): boolean {
  const start = polygonDraft!.vertexMarkers[0].getPosition();
  if (!start) return false;
  const pa = props.map.lngLatToContainer([start.getLng(), start.getLat()]) as PixelInstance;
  const pb = props.map.lngLatToContainer([lng, lat]) as PixelInstance;
  const dx = pa.getX() - pb.getX();
  const dy = pa.getY() - pb.getY();
  return Math.sqrt(dx * dx + dy * dy) < 12;
}

function makeVertexDot(): string {
  return `<div style="width:12px;height:12px;border-radius:50%;background:#fff;border:2px solid #3388ff;box-shadow:0 0 3px rgba(0,0,0,.3);pointer-events:none"></div>`;
}

function cancel() {
  cleanup();
  emit("cancel");
}

defineExpose({ startCircle: () => start("circle"), startPolygon: () => start("polygon"), cancel });
</script>

<style scoped>
.draw-tip {
  position: absolute;
  top: 60px;
  left: 10px;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  padding: 8px 12px;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  font-size: 14px;
  color: #333;
}

.draw-tip__cancel {
  padding: 4px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #f8f8f8;
  cursor: pointer;
  font-size: 13px;
}

.draw-tip__cancel:hover {
  background: #e8e8e8;
}
</style>
