# Task 6: 代码优化

## Task Description

优化代码，修复Task 5中发现的问题。

## Files

- Modify: `src/components/AmapMap/CustomDraw.vue`
- Modify: `src/components/AmapMap/amap.d.ts`
- Modify: `src/components/AmapMap/index.vue`

## Interfaces

- Consumes: 更新后的 CustomDraw.vue 组件
- Produces: 优化后的代码

## Steps

### Step 1: 修复类型定义不一致

更新 `src/components/AmapMap/amap.d.ts` 中的 CircleDraft 类型，使其与 CustomDraw.vue 中的实际类型一致。

```typescript
type CircleDraft = {
  center: [number, number];
  centerLngLat: LngLatInstance;
  centerMarker: MarkerInstance;
  preview: CircleInstance;
  radius: number;
  committed: boolean;
};
```

### Step 2: 移除残留的 console.log

移除 `src/components/AmapMap/index.vue:273` 中的 console.log 调试日志。

### Step 3: 代码审查

1. 检查代码结构是否清晰
2. 检查类型定义是否完整
3. 检查注释是否详细

### Step 4: 提交代码

```bash
git add src/components/AmapMap/CustomDraw.vue src/components/AmapMap/amap.d.ts src/components/AmapMap/index.vue
git commit -m "feat: 重写 CustomDraw 组件，实现自定义多边形和圆形绘制"
```

## Acceptance Criteria

1. 类型定义与代码一致
2. 没有残留的 console.log
3. 代码结构清晰
4. 类型定义完整
5. 注释详细
