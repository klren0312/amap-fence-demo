<template>
  <div class="add-by-coords">
    <div class="abc-block">
      <div class="abc-title">按坐标添加圆形</div>
      <div class="abc-row">
        <label>经度 <input v-model="circleLon" type="number" step="any" placeholder="如 117.23" /></label>
        <label>纬度 <input v-model="circleLat" type="number" step="any" placeholder="如 31.82" /></label>
      </div>
      <div class="abc-row">
        <label>半径 <input v-model="circleRadius" type="number" step="any" min="0" placeholder="如 1000" /></label>
        <select v-model="circleUnit">
          <option value="m">米</option>
          <option value="km">千米</option>
        </select>
        <button class="abc-primary" @click="emitCircle">添加圆形</button>
      </div>
    </div>

    <div class="abc-block">
      <div class="abc-title">按坐标添加多边形</div>
      <div class="abc-row">
        <label>顶点数 <input v-model.number="polyVertexCount" type="number" min="3" /></label>
      </div>
      <div v-for="(row, i) in polyRows" :key="i" class="abc-vertex-row">
        <span class="abc-index">{{ i + 1 }}</span>
        <label class="abc-full">
          经纬度（逗号分隔）
          <input v-model="row.value" placeholder="117.23,31.82" />
        </label>
      </div>
      <div class="abc-row" v-if="polyRows.length">
        <button class="abc-primary" @click="emitPolygon">添加多边形</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";

export interface CircleInput {
  type: "circle";
  center: [number, number];
  radius: number;
}

export interface PolygonInput {
  type: "polygon";
  path: [number, number][];
}

export type GeoInput = CircleInput | PolygonInput;

const emit = defineEmits<{
  (e: "add", input: GeoInput): void;
}>();

// 圆形
const circleLon = ref("");
const circleLat = ref("");
const circleRadius = ref("");
const circleUnit = ref<"m" | "km">("m");

// 多边形
const polyVertexCount = ref<number | null>(null);
const polyRows = ref<{ value: string }[]>([]);

// 顶点数变化时动态增减输入框，保留已填写内容
watch(polyVertexCount, (n) => {
  const count = Math.max(0, Math.floor(Number(n) || 0));
  const rows = polyRows.value;
  if (count > rows.length) {
    for (let i = rows.length; i < count; i++) rows.push({ value: "" });
  } else if (count < rows.length) {
    rows.splice(count);
  }
});

function emitCircle() {
  const lon = parseFloat(circleLon.value);
  const lat = parseFloat(circleLat.value);
  const r = parseFloat(circleRadius.value);
  if (isNaN(lon) || isNaN(lat) || isNaN(r) || r <= 0) {
    alert("请输入有效的中心点经纬度和正半径");
    return;
  }
  const radiusMeters = circleUnit.value === "km" ? r * 1000 : r;
  emit("add", { type: "circle", center: [lon, lat], radius: radiusMeters });
}

function emitPolygon() {
  const points: [number, number][] = [];
  for (const row of polyRows.value) {
    const parts = String(row.value).split(/[\s,;]+/).filter(Boolean);
    const lon = parseFloat(parts[0]);
    const lat = parseFloat(parts[1]);
    if (parts.length < 2 || isNaN(lon) || isNaN(lat)) {
      alert("请按「经度,纬度」格式填写所有顶点");
      return;
    }
    points.push([lon, lat]);
  }
  if (points.length < 3) {
    alert("请输入至少 3 个顶点");
    return;
  }
  emit("add", { type: "polygon", path: points });
}
</script>

<style scoped>
.add-by-coords {
  position: absolute;
  top: 64px;
  left: 10px;
  z-index: 1000;
  width: 280px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #fff;
  padding: 10px;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  font-size: 13px;
}

.abc-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}

.abc-block:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.abc-title {
  font-weight: bold;
}

.abc-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.abc-row label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: #555;
}

.abc-textarea-label {
  width: 100%;
}

.abc-vertex-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.abc-vertex-row .abc-index {
  width: 16px;
  flex: none;
  font-size: 12px;
  color: #888;
  text-align: right;
}

.abc-vertex-row label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: #555;
}

.abc-vertex-row input {
  width: 92px;
  padding: 4px 6px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 13px;
}

.abc-vertex-row .abc-full {
  width: 100%;
}

.abc-vertex-row .abc-full input {
  width: 100%;
  box-sizing: border-box;
}

.abc-row input {
  width: 110px;
  padding: 4px 6px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 13px;
}

.abc-row textarea {
  margin-top: 2px;
  padding: 4px 6px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 13px;
  resize: vertical;
  font-family: inherit;
  box-sizing: border-box;
}

.abc-row select {
  padding: 4px 6px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 13px;
}

.abc-primary {
  padding: 6px 12px;
  border: 1px solid #2d8cf0;
  border-radius: 4px;
  background: #2d8cf0;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
}

.abc-primary:hover {
  background: #1c7fd4;
}
</style>
