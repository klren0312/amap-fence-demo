/**
 * bmap-draw 模块声明
 * 该库为 UMD 打包，未提供类型声明，这里补充默认导出的类型。
 */
declare module "bmap-draw" {
  import type { BmapDrawModule } from "./bdmap";

  // 场景
  export const DrawScene: BmapDrawModule["DrawScene"];

  // 绘制
  export const MarkerDraw: BmapDrawModule["MarkerDraw"];
  export const PolylineDraw: BmapDrawModule["PolylineDraw"];
  export const PolygonDraw: BmapDrawModule["PolygonDraw"];
  export const RectDraw: BmapDrawModule["RectDraw"];
  export const CircleDraw: BmapDrawModule["CircleDraw"];
  export const DrawControl: BmapDrawModule["DrawControl"];

  // 编辑
  export const MarkerEdit: BmapDrawModule["MarkerEdit"];
  export const PolylineEdit: BmapDrawModule["PolylineEdit"];
  export const PolygonEdit: BmapDrawModule["PolygonEdit"];
  export const RectEdit: BmapDrawModule["RectEdit"];
  export const CircleEdit: BmapDrawModule["CircleEdit"];

  // 选择
  export const Select: BmapDrawModule["Select"];
  export const MapSelect: BmapDrawModule["MapSelect"];

  // 移动
  export const PolylineMove: BmapDrawModule["PolylineMove"];
  export const PolygonMove: BmapDrawModule["PolygonMove"];

  // 测量
  export const Measure: BmapDrawModule["Measure"];
  export const AreaMeasure: BmapDrawModule["AreaMeasure"];
  export const DistanceMeasure: BmapDrawModule["DistanceMeasure"];

  // 计算
  export const CutCalculate: BmapDrawModule["CutCalculate"];
  export const UnionCalculate: BmapDrawModule["UnionCalculate"];
  export const MoveCalculate: BmapDrawModule["MoveCalculate"];
  export const CorrectPoint: BmapDrawModule["CorrectPoint"];
  export const GeoCalculator: BmapDrawModule["GeoCalculator"];

  // 枚举
  export const ActionStatus: BmapDrawModule["ActionStatus"];
  export const OperateEventType: BmapDrawModule["OperateEventType"];
  export const DrawingType: BmapDrawModule["DrawingType"];
  export const DrawStatus: BmapDrawModule["DrawStatus"];

  // 事件
  export const Operate: BmapDrawModule["Operate"];
  export const MeasureEvent: BmapDrawModule["MeasureEvent"];
}
