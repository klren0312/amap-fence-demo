# Task 3: 重写圆形绘制逻辑

## Task Description

重写 `src/components/AmapMap/CustomDraw.vue` 中的圆形绘制逻辑。

## Files

- Modify: `src/components/AmapMap/CustomDraw.vue:113-212`

## Interfaces

- Consumes: 高德地图 JS API 2.0
- Produces: `handleCircleClick`, `handleCircleMove`, `finishCircle`, `makeCenterDot`, `makeRadiusLabel` 函数

## Steps

### Step 1: 重写 handleCircleClick 函数

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

### Step 2: 重写 handleCircleMove 函数

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

### Step 3: 重写 finishCircle 函数

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

### Step 4: 重写 makeCenterDot 函数

```typescript
function makeCenterDot(): string {
  return `<div style="width:14px;height:14px;border-radius:50%;background:#3388ff;border:2px solid #fff;box-shadow:0 0 3px rgba(0,0,0,.4);pointer-events:none"></div>`;
}
```

### Step 5: 添加 makeRadiusLabel 函数

```typescript
function makeRadiusLabel(radius: number): string {
  const text = radius >= 1000 ? `${(radius / 1000).toFixed(2)}km` : `${Math.round(radius)}m`;
  return `<div style="background:rgba(255,255,255,0.9);padding:2px 6px;border-radius:3px;font-size:12px;color:#333;white-space:nowrap;pointer-events:none">${text}</div>`;
}
```

## Acceptance Criteria

1. 能够点击确定圆心位置
2. 能够移动鼠标调整半径
3. 能够再次点击确认创建圆形
4. 圆心显示圆形标记
5. 预览圆形显示为蓝色虚线
6. 半径数值显示在圆形旁边
7. 最小半径为1米
