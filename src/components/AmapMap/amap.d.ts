/**
 * 高德地图 JS API 类型声明（按需）
 * 补充项目中使用的 API 类型，减少 any 使用
 */

declare module "@amap/amap-jsapi-loader" {
  export default class AMapLoader {
    static load(config: {
      key: string;
      version: string;
      plugins: string[];
    }): Promise<typeof import("AMap")>;
  }
}

/**
 * 高德地图类型（从 @amap/amap-jsapi-loader 加载）
 * 这里只声明项目中用到的类型
 */
export interface AMapStatic {
  Map: new (container: string | HTMLElement, options?: MapOptions) => MapInstance;
  MouseTool: new (map: MapInstance) => MouseToolInstance;
  DistrictSearch: new (options?: DistrictSearchOptions) => DistrictSearchInstance;
  Geocoder: new (options?: GeocoderOptions) => GeocoderInstance;
  Circle: new (options: CircleOptions) => CircleInstance;
  Polygon: new (options: PolygonOptions) => PolygonInstance;
  CircleEditor: new (map: MapInstance, overlay: CircleInstance) => CircleEditorInstance;
  PolygonEditor: new (map: MapInstance, overlay: PolygonInstance) => PolygonEditorInstance;
  GeometryUtil: typeof GeometryUtilNamespace;
}

export interface MapOptions {
  zoom?: number;
  center?: [number, number];
  [key: string]: unknown;
}

export interface MapInstance {
  on(event: string, callback: (...args: unknown[]) => void): void;
  setFitView(
    overlays: unknown[],
    animate?: boolean,
    margin?: [number, number, number, number],
  ): void;
  setZoomAndCenter(zoom: number, center: [number, number]): void;
  destroy(): void;
  [key: string]: unknown;
}

export interface MouseToolInstance {
  on(event: string, callback: (...args: unknown[]) => void): void;
  close(isRemove?: boolean): void;
  polygon(options: Record<string, unknown>): void;
  circle(options: Record<string, unknown>): void;
  [key: string]: unknown;
}

export interface DistrictSearchOptions {
  subdistrict?: number;
  extensions?: string;
  [key: string]: unknown;
}

export interface DistrictSearchInstance {
  search(adcode: string, callback: (status: string, result: DistrictResult) => void): void;
  [key: string]: unknown;
}

export interface GeocoderOptions {
  [key: string]: unknown;
}

export interface GeocoderInstance {
  [key: string]: unknown;
}

export interface CircleOptions {
  center: [number, number];
  radius: number;
  [key: string]: unknown;
}

export interface PolygonOptions {
  path: string[][] | number[][];
  [key: string]: unknown;
}

export interface CircleInstance {
  getRadius(): number;
  getCenter(): LngLatInstance;
  setMap(map: unknown): void;
  setOptions(options: Record<string, unknown>): void;
  on(event: string, callback: (...args: unknown[]) => void): void;
  off(event: string, callback?: (...args: unknown[]) => void): void;
  [key: string]: unknown;
}

export interface PolygonInstance {
  getPath(): LngLatInstance[];
  setMap(map: unknown): void;
  setOptions(options: Record<string, unknown>): void;
  on(event: string, callback: (...args: unknown[]) => void): void;
  off(event: string, callback?: (...args: unknown[]) => void): void;
  [key: string]: unknown;
}

export interface CircleEditorInstance {
  open(): void;
  close(): void;
  [key: string]: unknown;
}

export interface PolygonEditorInstance {
  open(): void;
  close(): void;
  [key: string]: unknown;
}

export interface LngLatInstance {
  lng: number;
  lat: number;
  getLng(): number;
  getLat(): number;
}

export namespace GeometryUtilNamespace {
  function distanceToLine(lnglat: LngLatInstance, lnglat1: LngLatInstance, lnglat2: LngLatInstance): number;
  function getClosestOnLine(lnglat: LngLatInstance, path: LngLatInstance[]): LngLatInstance;
  function getDistance(start: LngLatInstance, end: LngLatInstance): number;
  function getAveragePosition(lnglats: LngLatInstance[]): LngLatInstance;
  function getArea(path: LngLatInstance[]): number;
  function getLength(path: LngLatInstance[]): number;
  function pointIsAtOneSide(
    lnglat: LngLatInstance,
    lnglat1: LngLatInstance,
    lnglat2: LngLatInstance,
  ): boolean;
  function isPointInRing(lnglat: LngLatInstance, ring: LngLatInstance[]): boolean;
  function getIntersection(
    line1Start: LngLatInstance,
    line1End: LngLatInstance,
    line2Start: LngLatInstance,
    line2End: LngLatInstance,
  ): LngLatInstance | null;
}

export interface DistrictResult {
  status: string;
  districtList: Array<{
    name: string;
    adcode: string;
    citycodes?: string[];
    center?: string;
    level: "country" | "province" | "city" | "district";
    districtList: Array<{
      name: string;
      adcode: string;
      center?: string;
      level: "city" | "district";
      districtList?: Array<{
        name: string;
        adcode: string;
        center?: string;
        level: "district" | "street";
      }>;
    }>;
    boundaries?: string[][][];
  }>;
}

export interface DrawEvent {
  obj: CircleInstance | PolygonInstance;
  [key: string]: unknown;
}

export interface MapMouseEvent {
  lnglat: LngLatInstance;
  [key: string]: unknown;
}
