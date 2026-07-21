<template>
  <div class="track-panel">
    <div class="track-header">
      <span class="track-title">轨迹回放</span>
      <span class="track-progress-text">{{ progress }}%</span>
    </div>

    <input
      class="track-range"
      type="range"
      :min="0"
      :max="100"
      :value="progress"
      @pointerdown="onRangePress"
      @input="onRangeInput"
      @pointerup="onRangeUp"
    />

    <div class="track-controls">
      <button @click="reset">重置</button>
      <button class="track-primary" @click="togglePlay">
        {{ isPlaying ? "暂停" : "播放" }}
      </button>
      <button @click="stopAnim">停止</button>
      <label class="track-speed">
        倍速
        <select v-model.number="speed" @change="onSpeedChange">
          <option :value="0.5">0.5x</option>
          <option :value="1">1x</option>
          <option :value="2">2x</option>
          <option :value="4">4x</option>
          <option :value="8">8x</option>
        </select>
      </label>
      <button @click="close">退出回放</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import type {
  AMapStatic,
  MapInstance,
  PolylineInstance,
  MarkerInstance,
} from "./amap";

const props = defineProps<{
  map: MapInstance | null;
  amap: AMapStatic | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const track: [number, number][] = [[116.478935,39.997761],[116.478939,39.997825],[116.478912,39.998549],[116.478912,39.998549],[116.478998,39.998555],[116.478998,39.998555],[116.479282,39.99856],[116.479658,39.998528],[116.480151,39.998453],[116.480784,39.998302],[116.480784,39.998302],[116.481149,39.998184],[116.481573,39.997997],[116.481863,39.997846],[116.482072,39.997718],[116.482362,39.997718],[116.483633,39.998935],[116.48367,39.998968],[116.484648,39.999861]]

const isPlaying = ref(false);
const speed = ref(1);
const progress = ref(0);
const wasPlaying = ref(false);

let fullLine: PolylineInstance | null = null;
let traveledLine: PolylineInstance | null = null;
let marker: MarkerInstance | null = null;
let _map: MapInstance | null = null;
let started = false;
let seeking = false;

onMounted(() => {
  if (!props.map || !props.amap) return;
  _map = props.map;
  const A = props.amap;
  const m = props.map;

  (A as any).plugin("AMap.MoveAnimation", () => {
    fullLine = new A.Polyline({
      path: track,
      strokeColor: "#9aa3b2",
      strokeWeight: 4,
      strokeStyle: "dashed",
      strokeOpacity: 0.8,
      map: m,
    });

    traveledLine = new A.Polyline({
      map: m,
      strokeColor: "#3388ff",
      strokeWeight: 6,
      strokeOpacity: 0.95,
    });

    marker = new A.Marker({
      map: m,
      position: track[0],
      icon: "https://a.amap.com/jsapi_demos/static/demo-center-v2/car.png",
      offset: new A.Pixel(-13, -26),
    });

    marker.on("moving", (e: any) => {
      if (seeking) return;
      traveledLine?.setPath(e.passedPath);
      const pct = Math.min(100, Math.round((e.passedPath.length / track.length) * 100));
      progress.value = pct;
      _map?.setCenter(e.target.getPosition(),true)
        
    });

    marker.on("moveend", () => {
      isPlaying.value = false;
    });

    m.setFitView([fullLine], false, [60, 60, 60, 60]);
  });
});

onUnmounted(() => {
  try {
    marker?.stopMove();
    marker?.setMap(null);
    fullLine?.setMap(null);
    traveledLine?.setMap(null);
  } catch (e) {
    console.error("清理轨迹回放 overlay 失败", e);
  }
  marker = null;
  fullLine = null;
  traveledLine = null;
  _map = null;
});

function playFrom(idx: number) {
  if (!marker || !_map) return;
  const remaining = track.slice(idx);
  if (remaining.length < 2) return;
  marker.setPosition(track[idx]);
  traveledLine?.setPath(track.slice(0, idx + 1));
  marker.moveAlong(remaining, {
    duration: Math.max(50, 500 / speed.value),
    autoRotation: true,
    aniInterval: 0,
  });
  isPlaying.value = true;
  started = true;
}

function togglePlay() {
  if (!marker || !_map) return;
  if (isPlaying.value) {
    marker.pauseMove();
    isPlaying.value = false;
  } else if (!started || progress.value >= 100) {
    playFrom(0);
  } else {
    marker.resumeMove();
    isPlaying.value = true;
  }
}

function stopAnim() {
  if (!marker) return;
  marker.stopMove();
  started = false;
  isPlaying.value = false;
  marker.setPosition(track[0]);
  traveledLine?.setPath([track[0]]);
  progress.value = 0;
}

function reset() {
  stopAnim();
}

function close() {
  stopAnim();
  emit("close");
}

function onSpeedChange() {
  if (!isPlaying.value) return;
  marker?.pauseMove();
  const idx = Math.round((progress.value / 100) * (track.length - 1));
  playFrom(idx);
}

function onRangePress() {
  if (isPlaying.value && marker) {
    marker.pauseMove();
    wasPlaying.value = true;
  }
  seeking = true;
}

function onRangeInput(e: Event) {
  const val = Number((e.target as HTMLInputElement).value);
  progress.value = val;
  const idx = Math.round((val / 100) * (track.length - 1));
  marker?.setPosition(track[idx]);
  traveledLine?.setPath(track.slice(0, idx + 1));
}

function onRangeUp() {
  if (wasPlaying.value) {
    wasPlaying.value = false;
    const idx = Math.round((progress.value / 100) * (track.length - 1));
    playFrom(idx);
  }
  seeking = false;
}
</script>

<style scoped>
.track-panel {
  position: absolute;
  top: 64px;
  left: 10px;
  z-index: 1000;
  width: 320px;
  background: #fff;
  padding: 10px;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
}

.track-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.track-title {
  font-weight: bold;
}

.track-progress-text {
  color: #555;
  font-size: 12px;
}

.track-range {
  width: 100%;
}

.track-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.track-controls button {
  padding: 6px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #f8f8f8;
  cursor: pointer;
  font-size: 13px;
}

.track-controls button:hover:not(:disabled) {
  background: #e8e8e8;
}

.track-controls button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.track-primary {
  border-color: #2d8cf0 !important;
  background: #2d8cf0 !important;
  color: #fff !important;
}

.track-primary:hover:not(:disabled) {
  background: #1c7fd4 !important;
}

.track-speed {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #555;
}

.track-speed select {
  padding: 4px 6px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 13px;
}
</style>
