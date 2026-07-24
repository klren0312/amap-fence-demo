# CustomDraw 组件重设计实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重写 CustomDraw.vue 组件，实现基于高德地图的自定义多边形和圆形绘制功能

**Architecture:** 完全自定义绘制逻辑，使用高德地图 JS API 2.0，支持多边形点击添加顶点、双击闭合，圆形点击确定圆心、移动调整半径、点击确认

**Tech Stack:** Vue 3, TypeScript, 高德地图 JS API 2.0

## Global Constraints

- Vue 3.5.39+
- TypeScript 6.0.2+
- 高德地图 JS API 2.0
- Vite 8.1.1+
- 不使用任何第三方 UI 库

---

## 文件结构

- **修改:** `src/components/AmapMap/CustomDraw.vue` - 主要绘制组件
- **修改:** `src/components/AmapMap/amap.d.ts` - 类型定义（如需要）

---

## Task 1: 准备工作

**Files:**
- Create: 无
- Modify: `src/components/AmapMap/CustomDraw.vue`
- Test: 无（手动测试）

**Interfaces:**
- Consumes: 高德地图 JS API 2.0
- Produces: 更新后的 CustomDraw.vue 组件

- [ ] **Step 1: 分析现有代码**

读取 `src/components/AmapMap/CustomDraw.vue` 文件，了解当前实现。

```bash
cat src/components/AmapMap/CustomDraw.vue
```

- [ ] **Step 2: 理解类型定义**

读取 `src/components/AmapMap/amap.d.ts` 文件，了解类型定义。

```bash
cat src/components/AmapMap/amap.d.ts
```

- [ ] **Step 3: 准备开发环境**

启动开发服务器，确保项目可以正常运行。

```bash
pnpm dev
```

---

## Task 2: 重写多边形绘制逻辑

**Files:**
- Modify: `src/components/AmapMap/CustomDraw.vue:214-294`

**Interfaces:**
- Consumes: 高德地图 JS API 2.0
- Produces: `handlePolygonClick`, `handlePolygonMove`, `finishPolygon`, `nearStartVertex`, `makeVertexDot` 函数

- [ ] **Step 1: 重写 handlePolygonClick 函数**

```typescript
function handlePolygonClick(e: MapMouseEvent) {
  const lng = e.lnglat.getLng();
  const lat = e.lnglat.getLat();

  if (!polygonDraft) {
    // 创建第一个顶点
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

  // 检查是否点击起点闭合
  if (polygonDraft.path.length >= 3 && nearStartVertex(lng, lat)) {
    finishPolygon();
    return;
  }

  // 添加新顶点
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
```

- [ ] **Step 2: 重写 handlePolygonMove 函数**

```typescript
function handlePolygonMove(e: MapMouseEvent) {
  if (!polygonDraft || !polygonDraft.path.length) return;
  const last = polygonDraft.path[polygonDraft.path.length - 1];
  polygonDraft.edgeLine.setPath([
    new props.amap.LngLat(last[0], last[1]),
    new props.amap.LngLat(e.lnglat.getLng(), e.lnglat.getLat()),
  ]);
}
```

- [ ] **Step 3: 重写 finishPolygon 函数**

```typescript
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
```

- [ ] **Step 4: 重写 nearStartVertex 函数**

```typescript
function nearStartVertex(lng: number, lat: number): boolean {
  const start = polygonDraft!.vertexMarkers[0].getPosition();
  if (!start) return false;
  const pa = props.map.lngLatToContainer([start.getLng(), start.getLat()]) as PixelInstance;
  const pb = props.map.lngLatToContainer([lng, lat]) as PixelInstance;
  const dx = pa.getX() - pb.getX();
  const dy = pa.getY() - pb.getY();
  return Math.sqrt(dx * dx + dy * dy) < 12;
}
```

- [ ] **Step 5: 重写 makeVertexDot 函数**

```typescript
function makeVertexDot(): string {
  return `<div style="width:12px;height:12px;border-radius:50%;background:#fff;border:2px solid #3388ff;box-shadow:0 0 3px rgba(0,0,0,.3);pointer-events:none"></div>`;
}
```

---

## Task 3: 重写圆形绘制逻辑

**Files:**
- Modify: `src/components/AmapMap/CustomDraw.vue:113-212`

**Interfaces:**
- Consumes: 高德地图 JS API 2.0
- Produces: `handleCircleClick`, `handleCircleMove`, `finishCircle`, `makeCenterDot`, `makeRadiusLabel` 函数

- [ ] **Step 1: 重写 handleCircleClick 函数**

```typescript
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

    // 预览用 CircleMarker：纯像素绘制，不触发几何管线，不拦截地图 click，
    // setRadius 可任意放大缩小，无高频 rAF 报错
    const preview = new props.amap.CircleMarker({
      center: centerLngLat,
      radius: 0,
      strokeColor: "#3388ff",
      strokeWeight: 2,
      strokeOpacity: 0.9,
      fillColor: "#3388ff",
      fillOpacity: 0.3,
      // strokeStyle 在 CircleMarkerOptions 类型中被注释掉了，运行时仍可用
      bubble: true,
      zIndex: 100,
    } as any);
    (preview as any).setStyle && (preview as any).setStyle({ strokeStyle: "dashed" });
    preview.setMap(props.map);

    // 半径数值标签
    const radiusLabel = new props.amap.Marker({
      position: centerLngLat,
      map: props.map,
      content: makeRadiusLabel(0),
      offset: new props.amap.Pixel(10, -10),
      anchor: "center",
      clickable: false,
      bubble: true,
    });

    circleDraft = {
      center: [lng, lat],
      centerLngLat,
      centerMarker,
      preview,
      radiusLabel,
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
```

- [ ] **Step 2: 重写 handleCircleMove 函数**

```typescript
function handleCircleMove(e: MapMouseEvent) {
  if (!circleDraft) return;
  const mouseLngLat = new props.amap.LngLat(e.lnglat.getLng(), e.lnglat.getLat());
  const radius = circleDraft.centerLngLat.distance(mouseLngLat);
  circleDraft.radius = radius;

  // 把米制半径换算为屏幕像素半径，供 CircleMarker 使用
  const centerPixel = props.map.lngLatToContainer(circleDraft.center) as PixelInstance;
  const edgePixel = props.map.lngLatToContainer([e.lnglat.getLng(), e.lnglat.getLat()]) as PixelInstance;
  const pixelRadius = Math.max(0, Math.sqrt(
    (centerPixel.getX() - edgePixel.getX()) ** 2 +
    (centerPixel.getY() - edgePixel.getY()) ** 2,
  ));
  circleDraft.preview.setRadius(pixelRadius);

  // 更新半径数值标签位置和内容
  if (circleDraft.radiusLabel) {
    circleDraft.radiusLabel.setPosition(mouseLngLat);
    circleDraft.radiusLabel.setContent(makeRadiusLabel(radius));
  }
}
```

- [ ] **Step 3: 重写 finishCircle 函数**

```typescript
function finishCircle() {
  if (!circleDraft || circleDraft.committed) return;
  const draft = circleDraft;
  draft.committed = true;

  const radius = draft.radius;
  if (radius < 1) {
    draft.committed = false;
    return;
  }

  // 移除草稿辅助图形
  draft.centerMarker.setMap(null);
  draft.preview.setMap(null);
  if (draft.radiusLabel) {
    draft.radiusLabel.setMap(null);
  }

  // 用 AMap.Circle 构造正式图形入库（米制半径，可编辑）
  const circle = new props.amap.Circle({
    center: draft.centerLngLat,
    radius,
    ...baseStyle,
    strokeStyle: "solid",
  });
  circle.setMap(props.map);

  circleDraft = null;
  cleanup();
  emit("drawn", circle, "Circle");
}
```

- [ ] **Step 4: 重写 makeCenterDot 函数**

```typescript
function makeCenterDot(): string {
  return `<div style="width:14px;height:14px;border-radius:50%;background:#3388ff;border:2px solid #fff;box-shadow:0 0 3px rgba(0,0,0,.4);pointer-events:none"></div>`;
}
```

- [ ] **Step 5: 添加 makeRadiusLabel 函数**

```typescript
function makeRadiusLabel(radius: number): string {
  const text = radius >= 1000 ? `${(radius / 1000).toFixed(2)}km` : `${Math.round(radius)}m`;
  return `<div style="background:rgba(255,255,255,0.9);padding:2px 6px;border-radius:3px;font-size:12px;color:#333;white-space:nowrap;pointer-events:none">${text}</div>`;
}
```

---

## Task 4: 更新类型定义

**Files:**
- Modify: `src/components/AmapMap/amap.d.ts`

**Interfaces:**
- Consumes: 高德地图 JS API 2.0
- Produces: 更新后的类型定义

- [ ] **Step 1: 添加 CircleMarkerInstance 类型**

```typescript
export type CircleMarkerInstance = AMap.CircleMarker;
```

- [ ] **Step 2: 更新 CircleDraft 类型**

```typescript
type CircleDraft = {
  center: [number, number];
  centerLngLat: LngLatInstance;
  centerMarker: MarkerInstance;
  preview: CircleMarkerInstance;
  radiusLabel: MarkerInstance | null;
  radius: number;
  committed: boolean;
};
```

---

## Task 5: 测试验证

**Files:**
- Test: 手动测试

**Interfaces:**
- Consumes: 更新后的 CustomDraw.vue 组件
- Produces: 测试结果

- [ ] **Step 1: 测试多边形绘制**

1. 点击"绘制多边形"按钮
2. 点击地图添加3个顶点
3. 双击闭合多边形
4. 验证多边形创建成功

- [ ] **Step 2: 测试点击起点闭合**

1. 点击"绘制多边形"按钮
2. 点击地图添加3个顶点
3. 点击第一个点闭合多边形
4. 验证多边形创建成功

- [ ] **Step 3: 测试圆形绘制**

1. 点击"绘制圆形"按钮
2. 点击地图确定圆心
3. 移动鼠标调整半径
4. 点击确认创建圆形
5. 验证圆形创建成功，半径数值显示正确

- [ ] **Step 4: 测试取消绘制**

1. 点击"绘制多边形"按钮
2. 点击取消按钮
3. 验证绘制被取消

- [ ] **Step 5: 测试最小半径**

1. 点击"绘制圆形"按钮
2. 点击地图确定圆心
3. 移动鼠标使半径小于1米
4. 点击确认
5. 验证圆形未创建

---

## Task 6: 代码优化

**Files:**
- Modify: `src/components/AmapMap/CustomDraw.vue`

**Interfaces:**
- Consumes: 更新后的 CustomDraw.vue 组件
- Produces: 优化后的代码

- [ ] **Step 1: 优化性能**

1. 使用 `CircleMarker` 预览圆形，避免高频重绘
2. 减少 DOM 操作，使用 HTML 字符串而非动态创建
3. 确保组件销毁时清理所有事件监听和图形

- [ ] **Step 2: 代码审查**

1. 检查代码结构是否清晰
2. 检查类型定义是否完整
3. 检查注释是否详细

- [ ] **Step 3: 提交代码**

```bash
git add src/components/AmapMap/CustomDraw.vue src/components/AmapMap/amap.d.ts
git commit -m "feat: 重写 CustomDraw 组件，实现自定义多边形和圆形绘制"
```
