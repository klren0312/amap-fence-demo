/**
 * bmap-draw 类型定义
 * 基于 bmap-draw@1.0.40 实际导出 API（参考 example.jsx）
 */

/* ────────────── 百度地图 BMapGL 基础类型 ────────────── */

export interface BMapGLStatic {
  Map: new (container: string | HTMLElement) => MapInstance;
  Point: new (lng: number, lat: number) => PointInstance;
  GeoJSONLayer: new (id: string, options?: GeoJSONLayerOptions) => GeoJSONLayerInstance;
  Marker: new (point: PointInstance, opts?: Record<string, unknown>) => MarkerInstance;
  Polygon: new (points: PointInstance[], opts?: Record<string, unknown>) => PolygonInstance;
  Polyline: new (points: PointInstance[], opts?: Record<string, unknown>) => PolylineInstance;
  Projection: {
    convertLL2MC(point: PointInstance): PointInstance;
  };
}

export interface PointInstance {
  lng: number;
  lat: number;
}

export interface GeoJSONLayerOptions {
  dataSource?: unknown;
  polylineStyle?: Record<string, unknown>;
  polygonStyle?: Record<string, unknown>;
  markerStyle?: Record<string, unknown>;
}

export interface GeoJSONLayerInstance {
  overlayData: OverlayDataArray;
  addOverlay(overlay: EditableOverlay | EditableOverlay[]): void;
  removeOverlay(overlay: EditableOverlay | EditableOverlay[]): void;
  resetStyle(): void;
  clearData(): void;
  pickOverlays(target: unknown): EditableOverlay[];
}

export interface OverlayDataArray extends Array<EditableOverlay> {
  push(...items: EditableOverlay[]): number;
}

export interface MapInstance {
  centerAndZoom(center: PointInstance | string, zoom: number): void;
  enableScrollWheelZoom(enable?: boolean): void;
  setMapStyleV2(options: { styleId: string }): void;
  addGeoJSONLayer(layer: GeoJSONLayerInstance): void;
  getCenter(): PointInstance;
  getZoom(): number;
  destroy(): void;
  platform?: {
    style: {
      cursor: string;
    };
  };
}

export interface EditableOverlay {
  addEventListener(event: string, callback: (event: unknown) => void): void;
  removeEventListener(event: string, callback: (event: unknown) => void): void;
  toGeoJSON(): GeoJSONFeature;
  setOptions(options: Record<string, unknown>): void;
  setPath?(path: PointInstance[]): void;
  getPath?(): PointInstance[];
  getPosition?(): PointInstance;
}

export interface MarkerInstance extends EditableOverlay {
  setPoint(point: PointInstance): void;
}

export interface PolygonInstance extends EditableOverlay {}

export interface PolylineInstance extends EditableOverlay {}

export interface GeoJSONFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: unknown[];
  };
  properties?: Record<string, unknown>;
}

/* ────────────── bmap-draw 绘制场景 ────────────── */

export interface DrawSceneInstance {
  map: MapInstance;
  currentStatus: string;
  config: {
    defaultCursor: string;
  };
  addEventListener(event: string, callback: (event: unknown) => void): void;
  removeOverlay(overlay: EditableOverlay | EditableOverlay[]): void;
  clearData(): void;
  attachSnapSource(source: OverlayDataArray): void;
  instances?: EditableOverlay[];
}

export interface DrawSceneOptions {
  labelOptions?: Record<string, unknown>;
  activeIcon?: string;
  baseOpts?: Record<string, unknown>;
  drawCursor?: string;
  noLimit?: boolean;
}

/* ────────────── bmap-draw 绘制/编辑实例 ────────────── */

export interface DrawInstance {
  open(target?: EditableOverlay | Record<string, unknown>): void;
  close(callback?: () => void): void;
  closeAll(callback?: () => void): void;
  isOpen?: boolean;
}

/* ────────────── bmap-draw 事件类型 ────────────── */

export interface DrawCompleteEvent {
  overlay: EditableOverlay;
}

export interface OperateCompleteEvent {
  target: {
    from: string;
    overlay: EditableOverlay;
    mouseTarget?: unknown;
    latlng?: PointInstance;
  };
}

export interface OperateCancelEvent extends OperateCompleteEvent {}

/* ────────────── bmap-draw 枚举常量 ────────────── */

export interface ActionStatusMap {
  DRAW_ON_MAP: "draw-on-map";
  EDIT_ON_MAP: "edit-on-map";
  SELECT_ON_MAP: "select-on-map";
  MOVE_ON_MAP: "move-on-map";
  DRAW_NO_MAP: "draw-no-map";
  SELECT_NO_MAP: "select-no-map";
  DRAW_ON_MAP_CANCEL: "draw-on-map-cancel";
  EDIT_ON_MAP_CANCEL: "edit-on-map-cancel";
  SELECT_ON_MAP_CANCEL: "select-on-map-cancel";
  MOVE_ON_MAP_CANCEL: "move-on-map-cancel";
}

export interface OperateEventTypeMap {
  COMPLETE: "operate-ok";
  CANCEL: "operate-cancel";
  CHANGE: "operate-change";
  CLICK: "mouse-click";
  RIGHTCLICK: "right-click";
  MOVE: "mouse-move";
}

export interface DrawingTypeMap {
  DRAWING_POINT: "point";
  DRAWING_MARKER: "marker";
  DRAWING_POLYLINE: "polyline";
  DRAWING_POLYGON: "polygon";
  DRAWING_CIRCLE: "circle";
  DRAWING_RECTANGLE: "rectangle";
}

export interface DrawStatusMap {
  STATUS_FREE: string;
  STATUS_DRAWING: string;
  STATUS_EDITER: string;
  STATUS_MOVE: string;
}

/* ────────────── bmap-draw 工具类 ────────────── */

export interface GeoCalculatorStatic {
  intersect(overlays: OverlayDataArray | EditableOverlay[], feature: GeoJSONFeature): EditableOverlay[];
}

export interface CutCalculateInstance {
  polygonCutByLine(polygon: GeoJSONFeature, line: GeoJSONFeature): { geojsonRes: unknown };
  lineCutByPoly(line: GeoJSONFeature, polygon: GeoJSONFeature): { geojsonRes: unknown };
}

export interface UnionCalculateInstance {
  union(features: GeoJSONFeature[]): GeoJSONFeature;
}

export interface MoveCalculateInstance {}

export interface CorrectPointInstance {}

/* ────────────── 构造函数签名 ────────────── */

type DrawConstructor = new (
  scene: DrawSceneInstance,
  options?: Record<string, unknown>,
) => DrawInstance;

type EditConstructor = new (
  scene: DrawSceneInstance,
  options?: Record<string, unknown>,
) => DrawInstance;

type MeasureConstructor = new (
  map: MapInstance,
  options?: Record<string, unknown>,
) => unknown;

/* ────────────── bmap-draw 模块总接口 ────────────── */

export interface BmapDrawModule {
  // 场景
  DrawScene: new (map: MapInstance, options?: DrawSceneOptions) => DrawSceneInstance;

  // 绘制
  MarkerDraw: DrawConstructor;
  PolylineDraw: DrawConstructor;
  PolygonDraw: DrawConstructor;
  RectDraw: DrawConstructor;
  CircleDraw: DrawConstructor;
  DrawControl: DrawConstructor;

  // 编辑
  MarkerEdit: EditConstructor;
  PolylineEdit: EditConstructor;
  PolygonEdit: EditConstructor;
  RectEdit: EditConstructor;
  CircleEdit: EditConstructor;

  // 选择
  Select: DrawConstructor;
  MapSelect: DrawConstructor;

  // 移动
  PolylineMove: DrawConstructor;
  PolygonMove: DrawConstructor;

  // 测量
  Measure: MeasureConstructor;
  AreaMeasure: MeasureConstructor;
  DistanceMeasure: MeasureConstructor;

  // 计算
  CutCalculate: new () => CutCalculateInstance;
  UnionCalculate: new () => UnionCalculateInstance;
  MoveCalculate: new () => MoveCalculateInstance;
  CorrectPoint: new () => CorrectPointInstance;
  GeoCalculator: GeoCalculatorStatic;

  // 枚举
  ActionStatus: ActionStatusMap;
  OperateEventType: OperateEventTypeMap;
  DrawingType: DrawingTypeMap;
  DrawStatus: DrawStatusMap;

  // 事件
  Operate: unknown;
  MeasureEvent: unknown;
}
