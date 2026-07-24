# CustomDraw 组件重设计

## 概述

重写 `CustomDraw.vue` 组件，实现基于高德地图的自定义多边形和圆形绘制功能。

## 需求

### 多边形绘制
1. 点击"绘制多边形"按钮进入绘制模式
2. 每次点击地图添加一个顶点，显示圆形标记
3. 顶点之间显示连接线
4. 双击最后一个点闭合多边形
5. 闭合后显示完整多边形，支持编辑/删除

### 圆形绘制
1. 点击"绘制圆形"按钮进入绘制模式
2. 点击确定圆心位置，显示圆心标记
3. 移动鼠标显示预览圆形，半径随鼠标移动变化
4. 再次点击确认创建圆形

### 视觉反馈
- 顶点：蓝色圆形标记（半径6px）
- 连接线：蓝色虚线（宽度2px）
- 闭合后：半透明蓝色填充（rgba(51,136,255,0.3)）
- 圆心：红色圆形标记（半径6px）
- 半径线：红色虚线（宽度1px）
- 预览圆形：半透明红色边框（宽度2px）
- 半径数值：显示在圆形旁边

## 技术方案

### 组件结构

```vue
<template>
  <div v-if="active" class="draw-tip">
    <span>{{ tipText }}</span>
    <button class="draw-tip__cancel" @click="cancel">取消</button>
  </div>
</template>
```

### 状态管理

```typescript
type Mode = "circle" | "polygon" | null;

// 圆形草稿
type CircleDraft = {
  center: [number, number];
  centerLngLat: LngLatInstance;
  centerMarker: MarkerInstance;
  preview: CircleMarkerInstance;
  radiusLabel: MarkerInstance | null;
  radius: number;
  committed: boolean;
};

// 多边形草稿
type PolygonDraft = {
  vertexMarkers: MarkerInstance[];
  path: [number, number][];
  polygon: PolygonInstance;
  edgeLine: PolylineInstance;
};
```

### 事件处理

```typescript
// 地图点击事件
function onMapClick(e: MapMouseEvent) {
  if (mode === "circle") handleCircleClick(e);
  else if (mode === "polygon") handlePolygonClick(e);
}

// 地图移动事件
function onMapMove(e: MapMouseEvent) {
  if (mode === "circle") handleCircleMove(e);
  else if (mode === "polygon") handlePolygonMove(e);
}

// 地图双击事件
function onMapDblclick() {
  if (mode === "polygon" && polygonDraft && polygonDraft.path.length >= 3) {
    finishPolygon();
  }
}
```

### 样式系统

```typescript
const baseStyle = {
  strokeColor: "#3388ff",
  strokeWeight: 2,
  strokeOpacity: 0.9,
  fillColor: "#3388ff",
  fillOpacity: 0.3,
};
```

## 实现细节

### 多边形绘制流程

1. **开始绘制**：调用 `start("polygon")` 进入绘制模式
2. **添加顶点**：每次点击地图添加一个顶点，显示圆形标记
3. **移动预览**：鼠标移动时显示连接线
4. **闭合多边形**：
   - 双击最后一个点闭合
   - 或点击第一个点闭合（距离小于12像素）
5. **完成绘制**：移除辅助图形，创建正式多边形

### 圆形绘制流程

1. **开始绘制**：调用 `start("circle")` 进入绘制模式
2. **确定圆心**：点击地图确定圆心位置，显示圆心标记
3. **调整半径**：移动鼠标调整半径，显示预览圆形和半径数值
4. **完成绘制**：再次点击确认创建圆形

### 视觉反馈实现

#### 顶点标记
```typescript
function makeVertexDot(): string {
  return `<div style="width:12px;height:12px;border-radius:50%;background:#fff;border:2px solid #3388ff;box-shadow:0 0 3px rgba(0,0,0,.3);pointer-events:none"></div>`;
}
```

#### 圆心标记
```typescript
function makeCenterDot(): string {
  return `<div style="width:14px;height:14px;border-radius:50%;background:#3388ff;border:2px solid #fff;box-shadow:0 0 3px rgba(0,0,0,.4);pointer-events:none"></div>`;
}
```

#### 半径数值标签
```typescript
function makeRadiusLabel(radius: number): string {
  const text = radius >= 1000 ? `${(radius / 1000).toFixed(2)}km` : `${Math.round(radius)}m`;
  return `<div style="background:rgba(255,255,255,0.9);padding:2px 6px;border-radius:3px;font-size:12px;color:#333;white-space:nowrap;pointer-events:none">${text}</div>`;
}
```

## 接口定义

### Props

```typescript
interface Props {
  map: MapInstance;
  amap: AMapStatic;
}
```

### Emits

```typescript
interface Emits {
  (e: "drawn", overlay: CircleInstance | PolygonInstance, type: "Circle" | "Polygon"): void;
  (e: "cancel"): void;
}
```

### Exposed Methods

```typescript
interface ExposedMethods {
  startCircle: () => void;
  startPolygon: () => void;
  cancel: () => void;
}
```

## 测试用例

### 多边形绘制测试

1. **基本绘制**：点击3个点，双击闭合，验证多边形创建成功
2. **点击起点闭合**：点击3个点，点击第一个点闭合，验证多边形创建成功
3. **取消绘制**：点击取消按钮，验证绘制被取消
4. **最少点数**：点击2个点，双击，验证多边形未创建

### 圆形绘制测试

1. **基本绘制**：点击圆心，移动鼠标，点击确认，验证圆形创建成功
2. **最小半径**：点击圆心，移动鼠标使半径小于1米，点击确认，验证圆形未创建
3. **取消绘制**：点击取消按钮，验证绘制被取消

## 样式规范

### 工具栏样式

```css
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
```

### 取消按钮样式

```css
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
```

## 性能优化

1. **使用 CircleMarker 预览**：圆形预览使用 `CircleMarker` 而非 `Circle`，避免高频重绘
2. **减少 DOM 操作**：顶点标记和半径标签使用 HTML 字符串而非动态创建
3. **事件清理**：组件销毁时清理所有事件监听和图形

## 兼容性

- 支持现代浏览器（Chrome, Firefox, Safari, Edge）
- 支持移动端触摸事件
- 支持高德地图 JS API 2.0

## 安全性

- 不暴露敏感信息
- 不执行恶意代码
- 防止 XSS 攻击（使用 HTML 转义）

## 维护性

- 代码结构清晰，易于理解
- 类型定义完整，支持 TypeScript
- 注释详细，便于维护
- 单一职责原则，每个函数只做一件事
