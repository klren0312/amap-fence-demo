# Task 2: 重写多边形绘制逻辑

## Task Description

重写 `src/components/AmapMap/CustomDraw.vue` 中的多边形绘制逻辑。

## Files

- Modify: `src/components/AmapMap/CustomDraw.vue:214-294`

## Interfaces

- Consumes: 高德地图 JS API 2.0
- Produces: `handlePolygonClick`, `handlePolygonMove`, `finishPolygon`, `nearStartVertex`, `makeVertexDot` 函数

## Steps

### Step 1: 重写 handlePolygonClick 函数

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

### Step 2: 重写 handlePolygonMove 函数

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

### Step 3: 重写 finishPolygon 函数

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

### Step 4: 重写 nearStartVertex 函数

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

### Step 5: 重写 makeVertexDot 函数

```typescript
function makeVertexDot(): string {
  return `<div style="width:12px;height:12px;border-radius:50%;background:#fff;border:2px solid #3388ff;box-shadow:0 0 3px rgba(0,0,0,.3);pointer-events:none"></div>`;
}
```

## Acceptance Criteria

1. 能够点击添加多边形顶点
2. 能够双击闭合多边形
3. 能够点击起点闭合多边形
4. 顶点显示圆形标记
5. 连接线显示为蓝色虚线
6. 闭合后显示完整多边形
