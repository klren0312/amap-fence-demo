<template>
  <div class="bd-map">
    <div ref="mapContainer" class="bd-map__canvas"></div>

    <div class="bd-map__toolbar" role="toolbar" aria-label="围栏绘制工具">
      <button
        type="button"
        :class="{ 'is-active': drawingType === 'polygon' }"
        :disabled="!ready"
        @click="drawPolygon"
      >
        绘制多边形      </button>
      <button
        type="button"
        :class="{ 'is-active': drawingType === 'circle' }"
        :disabled="!ready"
        @click="drawCircle"
      >
        绘制圆形
      </button>
      <button
        type="button"
        :disabled="!drawingType && !editingType"
        @click="finishCurrentOperation"
      >
        {{ editingType ? "完成编辑" : "取消绘制" }}
      </button>
    </div>

    <div v-if="loading" class="bd-map__status">地图加载中...</div>
    <div v-else-if="errorMessage" class="bd-map__status bd-map__status--error">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import type {
  BMapGLStatic,
  BmapDrawModule,
  DrawCompleteEvent,
  DrawInstance,
  DrawSceneInstance,
  EditableOverlay,
  MapInstance,
  OperateCancelEvent,
  OperateCompleteEvent,
} from "./bdmap";

type DrawingType = "polygon" | "circle";

const emit = defineEmits<{
  ready: [map: MapInstance];
  drawComplete: [event: DrawCompleteEvent & { type: DrawingType }];
  loadError: [error: Error];
}>();

const BAIDU_MAP_SCRIPT_ID = "baidu-map-gl-script";
const BAIDU_MAP_CALLBACK = "__onBaiduMapGlLoaded";
const BAIDU_MAP_TIMEOUT = 15_000;
const BAIDU_MAP_KEY = import.meta.env.VITE_BD_KEY as string | undefined;

const mapContainer = ref<HTMLDivElement | null>(null);
const loading = ref(true);
const ready = ref(false);
const errorMessage = ref("");
const drawingType = ref<DrawingType | null>(null);
const editingType = ref<DrawingType | null>(null);

let map: MapInstance | null = null;
let drawLibrary: BmapDrawModule | null = null;
let drawScene: DrawSceneInstance | null = null;
let polygonDraw: DrawInstance | null = null;
let circleDraw: DrawInstance | null = null;
let polygonEditor: DrawInstance | null = null;
let circleEditor: DrawInstance | null = null;
let activeDraw: DrawInstance | null = null;
let activeEditor: DrawInstance | null = null;
let editingOverlay: EditableOverlay | null = null;
let overlayClickHandler: ((event: unknown) => void) | null = null;
let disposed = false;

let baiduMapPromise: Promise<BMapGLStatic> | null = null;
let drawLibraryPromise: Promise<BmapDrawModule> | null = null;

function getBMapGL(): BMapGLStatic | null {
  const candidate = (window as typeof window & { BMapGL?: BMapGLStatic }).BMapGL;
  return candidate && typeof candidate.Map === "function" ? candidate : null;
}

function waitForBMapGL(timeout = BAIDU_MAP_TIMEOUT): Promise<BMapGLStatic> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const sdk = getBMapGL();
      if (sdk) {
        window.clearInterval(timer);
        resolve(sdk);
        return;
      }

      if (Date.now() - startedAt >= timeout) {
        window.clearInterval(timer);
        reject(new Error("百度地图加载超时"));
      }
    }, 50);
  });
}

function loadBaiduMap(): Promise<BMapGLStatic> {
  const loadedSdk = getBMapGL();
  if (loadedSdk) return Promise.resolve(loadedSdk);
  if (baiduMapPromise) return baiduMapPromise;

  if (!BAIDU_MAP_KEY) {
    return Promise.reject(new Error("缺少 VITE_BD_KEY 配置"));
  }

  baiduMapPromise = new Promise<BMapGLStatic>((resolve, reject) => {
    const callbackWindow = window as typeof window & Record<string, unknown>;
    callbackWindow[BAIDU_MAP_CALLBACK] = () => undefined;

    let script = document.getElementById(BAIDU_MAP_SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = BAIDU_MAP_SCRIPT_ID;
      script.src = `https://api.map.baidu.com/api?type=webgl&v=1.0&ak=${encodeURIComponent(BAIDU_MAP_KEY)}&callback=${BAIDU_MAP_CALLBACK}`;
      script.async = true;
      document.head.appendChild(script);
    }

    script.addEventListener("error", () => reject(new Error("百度地图脚本加载失败")), {
      once: true,
    });
    waitForBMapGL().then(resolve, reject);
  }).catch((error: unknown) => {
    baiduMapPromise = null;
    throw error;
  });

  return baiduMapPromise;
}

async function loadDrawLibrary(): Promise<BmapDrawModule> {
  if (!drawLibraryPromise) {
    drawLibraryPromise = import("bmap-draw").then(
      (module) => module as unknown as BmapDrawModule,
    );
  }
  return drawLibraryPromise;
}

onMounted(async () => {
  try {
    const sdk = await loadBaiduMap();
    const library = await loadDrawLibrary();
    if (disposed || !mapContainer.value) return;

    map = new sdk.Map(mapContainer.value);
    map.centerAndZoom(new sdk.Point(117.23, 31.82), 9);
    map.enableScrollWheelZoom(true);

    drawLibrary = library;
    drawScene = new library.DrawScene(map, { noLimit: true });
    polygonDraw = new library.PolygonDraw(drawScene, {
      autoViewport: true,
      hideTip: false,
      isSeries: false,
      skipEditing: true,
      enableCalculate: true
    });
    circleDraw = new library.CircleDraw(drawScene, {
      autoViewport: true,
      hideTip: false,
      isSeries: false,
      skipEditing: true,
      enableCalculate: true
    });
    polygonEditor = new library.PolygonEdit(drawScene);
    circleEditor = new library.CircleEdit(drawScene);
    drawScene.addEventListener(
      library.OperateEventType.COMPLETE,
      (event: unknown) => handleSceneComplete(event as OperateCompleteEvent),
    );
    drawScene.addEventListener(library.OperateEventType.CANCEL, (e: unknown) => {
      const overlay = (e as OperateCancelEvent).target.overlay
      drawScene?.removeOverlay(overlay)
    });
    ready.value = true;
    emit("ready", map);
  } catch (error: unknown) {
    const loadError = error instanceof Error ? error : new Error("百度地图加载失败");
    errorMessage.value = loadError.message;
    emit("loadError", loadError);
    console.error(loadError);
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  disposed = true;
  cancelDraw();
  stopEdit();
  map?.destroy();
  map = null;
  drawScene = null;
  polygonDraw = null;
  circleDraw = null;
  polygonEditor = null;
  circleEditor = null;
});

function startDraw(type: DrawingType) {
  if (!drawLibrary || !drawScene) return;

  cancelDraw();
  stopEdit();
  const draw = type === "polygon" ? polygonDraw : circleDraw;
  if (!draw) return;

  activeDraw = draw;
  drawingType.value = type;
  draw.open();
}

function handleSceneComplete(event: unknown) {
  if (!drawLibrary) return;
  console.log(event)
  const { from, overlay } = (event as OperateCompleteEvent).target;
  if (from === drawLibrary.ActionStatus.DRAW_ON_MAP) {
    const type = drawingType.value;
    if (!activeDraw || !type) return;

    // 场景可能转发底层操作事件；先清状态，确保每次绘制只处理一次。
    activeDraw = null;
    drawingType.value = null;
    bindOverlayClick(overlay, () => startEdit(type, overlay));
    emit("drawComplete", { type, overlay });
    return;
  }

  if (from === drawLibrary.ActionStatus.EDIT_ON_MAP) {
    activeEditor = null;
    editingOverlay = null;
    editingType.value = null;
  }
}

function bindOverlayClick(overlay: EditableOverlay, handler: (event: unknown) => void) {
  if (!overlay) return;
  unbindOverlayClick();
  overlayClickHandler = handler;
  overlay.addEventListener("click", handler);
}

function unbindOverlayClick() {
  if (editingOverlay && overlayClickHandler) {
    editingOverlay.removeEventListener("click", overlayClickHandler);
  }
  overlayClickHandler = null;
}

function drawPolygon() {
  startDraw("polygon");
}

function drawCircle() {
  startDraw("circle");
}

function cancelDraw() {
  const draw = activeDraw;
  activeDraw = null;
  drawingType.value = null;
  draw?.closeAll();
}

function startEdit(type: DrawingType, overlay: EditableOverlay) {
  if (!drawLibrary || !drawScene || editingOverlay === overlay) return;
  console.log('type', type, 'overlay', overlay)
  cancelDraw();
  stopEdit();
  const editor = type === "polygon" ? polygonEditor : circleEditor;
  if (!editor) return;

  try {
    unbindOverlayClick();
    activeEditor = editor;
    editingOverlay = overlay;
    editingType.value = type;
    editor.open(overlay);
  } catch (error) {
    activeEditor = null;
    editingOverlay = null;
    editingType.value = null;
    console.error("开启图形编辑失败", error);
  }
}

function stopEdit() {
  const editor = activeEditor;
  activeEditor = null;
  editingOverlay = null;
  editingType.value = null;
  unbindOverlayClick();

  try {
    editor?.close();
  } catch (error) {
    console.warn("关闭图形编辑失败", error);
  }
}

function finishCurrentOperation() {
  if (editingType.value) {
    stopEdit();
  } else {
    cancelDraw();
  }
}

defineExpose({
  drawPolygon,
  drawCircle,
});
</script>

<style scoped>
.bd-map {
  position: relative;
  isolation: isolate;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #eef1f4;
}

.bd-map__canvas {
  position: absolute;
  z-index: 0;
  inset: 0;
}

.bd-map__toolbar {
  position: absolute;
  z-index: 1000;
  top: 12px;
  left: 12px;
  display: flex;
  gap: 8px;
  padding: 8px;
  border: 1px solid #d8dde3;
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 2px 8px rgb(0 0 0 / 12%);
}

.bd-map__toolbar button {
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid #c8ced6;
  border-radius: 4px;
  background: #fff;
  color: #25313d;
  cursor: pointer;
  font: inherit;
}

.bd-map__toolbar button:hover:not(:disabled) {
  border-color: #1677ff;
  color: #0958d9;
}

.bd-map__toolbar button.is-active {
  border-color: #1677ff;
  background: #eaf3ff;
  color: #0958d9;
}

.bd-map__toolbar button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.bd-map__status {
  position: absolute;
  z-index: 1001;
  top: 50%;
  left: 50%;
  padding: 10px 14px;
  border-radius: 4px;
  background: rgb(255 255 255 / 94%);
  color: #485563;
  box-shadow: 0 2px 8px rgb(0 0 0 / 12%);
  transform: translate(-50%, -50%);
}

.bd-map__status--error {
  border: 1px solid #ffccc7;
  color: #b42318;
}
</style>




