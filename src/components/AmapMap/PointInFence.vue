<template>
  <div class="point-test">
    <div class="pt-header">点是否在围栏内</div>
    <div class="pt-row">
      <input v-model.trim="lng" class="pt-input" type="number" step="0.0001" placeholder="经度" />
      <input v-model.trim="lat" class="pt-input" type="number" step="0.0001" placeholder="纬度" />
      <button @click="test">判断</button>
    </div>
    <div v-if="result" class="pt-result" :class="{ inside: result.inside }">
      {{ result.inside ? "在围栏内" : "不在围栏内" }}
      <span v-if="result.inside">（{{ result.name }}）</span>
      <span v-else-if="hasShape">（共 {{ shapes.length }} 个围栏）</span>
      <span v-else>（暂无围栏）</span>
    </div>
    <div v-if="error" class="pt-error">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type {
  CircleInstance,
  PolygonInstance,
  GeometryUtilNamespace,
  ShapeType,
} from "./amap";

export interface ShapeItem {
  id: string;
  name: string;
  type: ShapeType;
  overlay: CircleInstance | PolygonInstance;
}

const props = defineProps<{
  shapes: ShapeItem[];
  geometryUtil: GeometryUtilNamespace | null;
}>();

const lng = ref("");
const lat = ref("");
const result = ref<{ inside: boolean; name?: string } | null>(null);
const error = ref("");
const hasShape = ref(false);

function test() {
  result.value = null;
  error.value = "";
  const x = Number(lng.value);
  const y = Number(lat.value);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    error.value = "请输入有效的经纬度";
    return;
  }
  const pt: [number, number] = [x, y];
  const list = props.shapes;
  hasShape.value = list.length > 0;
  if (!list.length) {
    result.value = { inside: false };
    return;
  }

  const GeometryUtil = props.geometryUtil;
  for (const s of list) {
    if (s.type === "Circle") {
      // 圆形：判断点到圆心距离是否小于等于半径
      const c = (s.overlay as CircleInstance).getCenter();
      const center: [number, number] = [c.getLng(), c.getLat()];
      const d = GeometryUtil ? GeometryUtil.distance(center, pt) : Number.MAX_VALUE;
      const radius = (s.overlay as CircleInstance).getRadius();
      if (d <= radius) {
        result.value = { inside: true, name: s.name };
        return;
      }
    } else {
      // 多边形：判断点是否在环内
      const path = (s.overlay as PolygonInstance).getPath();
      const flat = Array.isArray(path[0]) ? (path[0] as unknown[]) : path;
      const ring = flat.map((p) => {
        const ll = p as { getLng: () => number; getLat: () => number };
        return [ll.getLng(), ll.getLat()] as [number, number];
      });
      const inside = GeometryUtil ? GeometryUtil.isPointInRing(pt, ring) : false;
      if (inside) {
        result.value = { inside: true, name: s.name };
        return;
      }
    }
  }
  result.value = { inside: false };
}
</script>

<style scoped>
.point-test {
  position: absolute;
  bottom: 10px;
  left: 10px;
  z-index: 1000;
  width: 240px;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  padding: 10px;
}

.pt-header {
  font-weight: bold;
  margin-bottom: 8px;
}

.pt-row {
  display: flex;
  gap: 6px;
}

.pt-input {
  width: 80px;
  padding: 5px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 13px;
}

.point-test button {
  padding: 5px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #f8f8f8;
  cursor: pointer;
  font-size: 13px;
}

.point-test button:hover {
  background: #e8e8e8;
}

.pt-result {
  margin-top: 8px;
  font-size: 13px;
  color: #d93025;
}

.pt-result.inside {
  color: #1a8f3c;
}

.pt-error {
  margin-top: 8px;
  font-size: 12px;
  color: #d93025;
}
</style>
