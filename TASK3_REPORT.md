# Task 3 Report: 重写圆形绘制逻辑

## 实现内容

重写 `src/components/AmapMap/CustomDraw.vue` 中的圆形绘制逻辑。

### 核心变更

1. **预览图形从 CircleMarker → Circle**：
   - 旧逻辑：用 `AMap.CircleMarker`（像素圆，最大半径 64px）做预览，再把像素距离换算为米构造最终 `AMap.Circle`
   - 新逻辑：直接用 `AMap.Circle`（米制半径）做预览，`clickable: false` 使点击穿透到地图
   - 好处：预览与成品完全一致，无像素/米制转换误差，无 64px 上限

2. **半径更新简化**：
   - 旧逻辑：`lngLatToContainer` 获取像素坐标 → 手动算像素距离 → `setRadius(像素)`
   - 新逻辑：`centerLngLat.distance(mouseLngLat)` 直接算米制距离 → `setRadius(米)`
   - 移除了 `lngLatToContainer` 和手动像素换算

3. **完成时复用预览 Circle**：
   - 旧逻辑：移除预览 → 新建 Circle → 设置样式
   - 新逻辑：移除圆心标记 → 预览 Circle 切换 `strokeStyle: "solid"`, `bubble: false`, `clickable: true`
   - 减少一次对象创建

### 修改的文件

- `src/components/AmapMap/CustomDraw.vue`

## 测试结果

- `vue-tsc --noEmit` 通过，无类型错误
- `vite build` 成功

## 自我发现

无问题。代码更简洁，逻辑更清晰。
