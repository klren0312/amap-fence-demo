<template>
  <div class="toolbar">
    <button @click="emit('draw-polygon')">绘制多边形</button>
    <button @click="emit('draw-circle')">绘制圆形</button>
    <button :disabled="!drawing" @click="emit('cancel-draw')">取消编辑</button>
    <select v-model="provinceProxy" :disabled="loading" @change="onProvinceChange">
      <option value="">选择省份</option>
      <option v-for="p in provinces" :key="p.adcode" :value="p.adcode">{{ p.name }}</option>
    </select>
    <select v-model="cityProxy" :disabled="loading || !selectedProvince" @change="onCityChange">
      <option value="">选择城市</option>
      <option v-for="c in cities" :key="c.adcode" :value="c.adcode">{{ c.name }}</option>
    </select>
    <button :disabled="loading || !selectedProvince" @click="emit('add-boundary', selectedProvince)">
      添加该区域
    </button>
  </div>
</template>

<script setup lang="ts">
interface AreaOption {
  name: string;
  adcode: string;
}

const props = defineProps<{
  provinces: AreaOption[];
  cities: AreaOption[];
  selectedProvince: string;
  selectedCity: string;
  loading: boolean;
  drawing: boolean;
}>();

const emit = defineEmits<{
  (e: "draw-polygon"): void;
  (e: "draw-circle"): void;
  (e: "cancel-draw"): void;
  (e: "province-change"): void;
  (e: "city-change"): void;
  (e: "add-boundary", adcode: string): void;
}>();

const provinceProxy = defineModel<string>("selectedProvince", { required: true });
const cityProxy = defineModel<string>("selectedCity", { required: true });

function onProvinceChange() {
  emit("province-change");
}

function onCityChange() {
  emit("city-change");
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

.toolbar button:hover:not(:disabled) {
  background: #e8e8e8;
}

.toolbar button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
