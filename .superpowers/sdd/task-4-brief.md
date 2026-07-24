# Task 4: 更新类型定义

## Task Description

更新 `src/components/AmapMap/amap.d.ts` 中的类型定义。

## Files

- Modify: `src/components/AmapMap/amap.d.ts`

## Interfaces

- Consumes: 高德地图 JS API 2.0
- Produces: 更新后的类型定义

## Steps

### Step 1: 添加 CircleMarkerInstance 类型

```typescript
export type CircleMarkerInstance = AMap.CircleMarker;
```

### Step 2: 更新 CircleDraft 类型

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

## Acceptance Criteria

1. 类型定义完整
2. 类型定义正确
3. 类型定义与代码一致
