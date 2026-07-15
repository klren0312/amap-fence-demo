<template>
  <div class="shape-panel">
    <div class="shape-panel-header">图形列表（{{ shapes.length }}）</div>
    <ul class="shape-list">
      <li v-for="s in shapes" :key="s.id" class="shape-item">
        <div class="shape-row">
          <span class="shape-name" :title="s.name">{{ s.name }}</span>
          <span class="shape-type">{{ typeLabel(s.type) }}</span>
        </div>
        <div class="shape-actions">
          <button @click="emit('locate', s)">定位</button>
          <button
            @click="emit('toggleEdit', s)"
            :disabled="editingId !== null && editingId !== s.id"
          >{{ editingId === s.id ? "完成" : "编辑" }}</button>
          <button @click="toggle(s.id)">坐标</button>
          <button @click="copyCoords(s)">复制</button>
          <button class="danger" @click="emit('delete', s)">删除</button>
        </div>
        <pre v-if="expanded[s.id]" class="shape-coords">{{ coordText(s) }}</pre>
      </li>
    </ul>
    <div v-if="shapes.length === 0" class="shape-empty">暂无图形</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

export interface ShapeItem {
  id: string;
  name: string;
  type: string;
  overlay: any;
}

const props = defineProps<{ shapes: ShapeItem[]; editingId?: string | null }>();
const emit = defineEmits<{
  (e: "locate", item: ShapeItem): void;
  (e: "toggleEdit", item: ShapeItem): void;
  (e: "delete", item: ShapeItem): void;
}>();

const TYPE_LABELS: Record<string, string> = {
  Polygon: "多边形",
  Circle: "圆形",
  MultiPolygon: "多多边形",
  Point: "点",
  LineString: "线",
  MultiLineString: "多线",
};

const expanded = ref<Record<string, boolean>>({});

function typeLabel(type: string): string {
  return TYPE_LABELS[type] || type;
}

// 圆形返回 { center, radius(米) }；多边形等返回顶点 coordinates
function getCoords(item: ShapeItem): any {
  const overlay = item.overlay;
  if (item.type === "Circle") {
    const c = overlay.getCenter();
    return { type: "Circle", center: { lng: c.getLng(), lat: c.getLat() }, radius: overlay.getRadius() };
  }
  const path = overlay.getPath();
  return {
    type: item.type,
    coordinates: path.map((p: any) => ({ lng: p.getLng(), lat: p.getLat() })),
  };
}

// GCJ-02 转 WGS84
const PI = Math.PI;
const EE = 0.00669342162296594323;

function gcj02ToWgs84(lng: number, lat: number): [number, number] {
  if (Math.abs(lng - 104.4962) < 0.01 && Math.abs(lat - 35.9583) < 0.01) {
    return [lng, lat];
  }
  let dlat = _transformLat(lng - 105.0, lat - 35.0);
  let dlng = _transformLng(lng - 105.0, lat - 35.0);
  const radlat = (lat / 180.0) * PI;
  let magic = Math.sin(radlat);
  magic = 1 - EE * magic * magic;
  const sqrtmagic = Math.sqrt(magic);
  dlat = (dlat * 180.0) / (((16704128.48075235 * (1 - 0.00335652794728454)) / (magic * sqrtmagic)) * PI);
  dlng = (dlng * 180.0) / ((16704128.48075235 * sqrtmagic / (1 - EE * magic * magic)) * PI);
  const mgLat = lat + dlat;
  const mgLng = lng + dlng;
  return [lng * 2 - mgLng, lat * 2 - mgLat];
}

function _transformLat(x: number, y: number): number {
  let ret =
    -100.0 +
    2.0 * x +
    3.0 * y +
    0.2 * y * y +
    0.1 * x * y +
    0.2 * Math.sqrt(Math.abs(x));
  ret += ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0;
  ret += ((20.0 * Math.sin(y * PI) + 40.0 * Math.sin((y / 3.0) * PI)) * 2.0) / 3.0;
  ret += ((160.0 * Math.sin((y / 12.0) * PI) + 320 * Math.sin((y * PI) / 30.0)) * 2.0) / 3.0;
  return ret;
}

function _transformLng(x: number, y: number): number {
  let ret =
    300.0 +
    x +
    2.0 * y +
    0.1 * x * x +
    0.1 * x * y +
    0.1 * Math.sqrt(Math.abs(x));
  ret += ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0;
  ret += ((20.0 * Math.sin(x * PI) + 40.0 * Math.sin((x / 3.0) * PI)) * 2.0) / 3.0;
  ret += ((150.0 * Math.sin((x / 12.0) * PI) + 300.0 * Math.sin((x / 30.0) * PI)) * 2.0) / 3.0;
  return ret;
}

function coordText(item: ShapeItem): string {
  const coords = getCoords(item);
  if (!coords) return "无坐标";
  return JSON.stringify(_convertToWgs84(coords), null, 2);
}

function _convertToWgs84(obj: any): any {
  if (obj.center && typeof obj.center.lng === "number" && typeof obj.center.lat === "number") {
    const [lng, lat] = gcj02ToWgs84(obj.center.lng, obj.center.lat);
    return { ...obj, center: { lng, lat } };
  }
  if (obj.coordinates && Array.isArray(obj.coordinates)) {
    return {
      ...obj,
      coordinates: obj.coordinates.map((c: any) => {
        if (typeof c.lng === "number" && typeof c.lat === "number") {
          const [lng, lat] = gcj02ToWgs84(c.lng, c.lat);
          return { lng, lat };
        }
        if (Array.isArray(c)) {
          return c.map(_convertToWgs84);
        }
        return c;
      }),
    };
  }
  return obj;
}

async function copyCoords(item: ShapeItem) {
  const coords = getCoords(item);
  if (!coords) return;
  try {
    await navigator.clipboard.writeText(JSON.stringify(_convertToWgs84(coords)));
    alert("坐标已复制到剪贴板");
  } catch {
    alert("复制失败，请手动复制");
  }
}

function toggle(id: string) {
  expanded.value[id] = !expanded.value[id];
}
</script>

<style scoped>
.shape-panel {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1000;
  width: 280px;
  max-height: calc(100vh - 20px);
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.shape-panel-header {
  padding: 10px 12px;
  font-weight: bold;
  border-bottom: 1px solid #eee;
  background: #f8f8f8;
}

.shape-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
}

.shape-item {
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
}

.shape-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.shape-name {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.shape-type {
  flex: none;
  font-size: 12px;
  color: #888;
  background: #eee;
  border-radius: 3px;
  padding: 1px 6px;
}

.shape-actions {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}

.shape-actions button {
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #f8f8f8;
  cursor: pointer;
  font-size: 12px;
}

.shape-actions button:hover {
  background: #e8e8e8;
}

.shape-actions .danger {
  color: #fff;
  background: #ff4444;
  border-color: #ff4444;
}

.shape-actions .danger:hover {
  background: #e03333;
}

.shape-coords {
  margin: 8px 0 0;
  padding: 8px;
  max-height: 160px;
  overflow: auto;
  background: #f6f6f6;
  border-radius: 4px;
  font-size: 11px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-all;
}

.shape-empty {
  padding: 16px 12px;
  color: #999;
  text-align: center;
}
</style>
