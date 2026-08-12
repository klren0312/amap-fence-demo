/**
 * 项目对高德 JS API 的类型桥接：
 *
 * - amap-jsapi-v2-types 通过 tsconfig 的 `types` 全局注册了 `AMap` 命名空间，
 *   本文件不再重复声明高德类型，转而把 AMapLoader.load 修正为返回该命名空间类型，
 *   并补全 amap-jsapi-v2-types 未覆盖、但项目用到的部分：
 *     1. AMapLoader.load 返回类型收窄为 `typeof AMap`；
 *     2. DistrictSearch / Geocoder 插件及其查询结果（官方类型未提供）；
 *     3. 把「未在命名空间里导出建子」的插件类挂到 AMap 命名空间上，
 *        使 `new AMap.DistrictSearch()` / `new AMap.Geocoder()` 拿得到构造器类型。
 */

/**
 * amap-jsapi-loader 自带的 d.ts 把 load 声明为 Promise<any>，
 * 这里收窄为官方 AMap 命名空间类型，供调用方获得类型提示。
 */
declare module "@amap/amap-jsapi-loader" {
  export default class AMapLoader {
    static load(config: {
      key: string;
      version: string;
      plugins?: string[];
      AMapUI?: { version?: string; plugins?: string[] };
      Loca?: { version?: string };
    }): Promise<typeof AMap>;
  }
}

// 高德 AMapLoader.load 返回的是 `typeof AMap`（命名空间），项目内部沿用此类型别名。
export type AMapStatic = typeof AMap;
export type MapInstance = AMap.Map;

export type CircleInstance = AMap.Circle;
export type PolygonInstance = AMap.Polygon;

/**
 * 矢量覆盖物通用选项（clickable 等）补充。
 *
 * amap-jsapi-v2-types 的 `CircleOptions` 是 type alias 且未声明 `clickable`、
 * `map` 等运行时由覆盖物插件提供的通用矢量属性，导致 `new AMap.Circle({ clickable })`
 * 触发多余属性检查报错。这里定义通用矢量选项接口，并通过交叉类型导出 `DrawCircleOptions`，
 * 供绘制组件传入含 clickable 的构造参数时使用（详见 CustomDraw.vue）。
 */
export interface VectorOverlayOptions {
  /** 指定该覆盖物是否可点击触发事件，运行时由覆盖物插件提供，官方类型未声明 */
  clickable?: boolean;
  /** 覆盖物关联的地图实例 */
  map?: AMap.Map;
  /** 覆盖物是否可见 */
  visible?: boolean;
}

/** 绘制圆形时使用的完整选项类型（官方 CircleOptions + 通用矢量属性） */
export type DrawCircleOptions = AMap.CircleOptions & VectorOverlayOptions;
export type PolylineInstance = AMap.Polyline;
export type MarkerInstance = AMap.Marker;
export type PixelInstance = AMap.Pixel;
export type LngLatLike = AMap.LngLatLike;

export type CircleEditorInstance = AMap.CircleEditor;
export type PolygonEditorInstance = AMap.PolygonEditor;
export type MouseToolInstance = AMap.MouseTool;

export type LngLatInstance = AMap.LngLat;
export type GeometryUtilNamespace = AMap.GeometryUtil;

/**
 * Geocoder 插件：地理编码（地址 -> 经纬度）。
 * amap-jsapi-v2-types 未提供此插件类型，这里补全项目用到的部分。
 */
export interface AddressComponent {
  province: string;
  city: string | string[];
  district: string;
  township?: string;
  town?: string;
  [key: string]: unknown;
}

export interface GeocodeItem {
  formattedAddress: string;
  addressComponent: AddressComponent;
  location: { lng: number; lat: number };
  level?: string;
  [key: string]: unknown;
}

export interface GeocodeResult {
  info: string;
  status: string;
  geocodes: GeocodeItem[];
  [key: string]: unknown;
}

export interface GeocoderInstance {
  /** 地址 -> 经纬度（正向地理编码） */
  getLocation(
    address: string,
    callback: (status: string, result: GeocodeResult) => void,
  ): void;
  /** 经纬度 -> 地址（逆向地理编码） */
  getAddress(
    lnglat: [number, number] | LngLatInstance,
    callback: (status: string, result: {
      info: string;
      regeocode: {
        formattedAddress: string;
        addressComponent: AddressComponent;
        [key: string]: unknown;
      };
    }) => void,
  ): void;
  setCity(city: string): void;
  [key: string]: unknown;
}

export interface GeocoderOptions {
  city?: string;
  citylimit?: boolean;
  [key: string]: unknown;
}

/**
 * 行政区划查询返回结果。
 */
export interface DistrictInfo {
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
  boundaries?: [number, number][][];
}

export interface DistrictResult {
  status: string;
  info: string;
  districtList: DistrictInfo[];
}

/**
 * DistrictSearch 插件：行政区查询。
 * amap-jsapi-v2-types 未提供此插件类型，这里补全项目用到的部分。
 */
export interface DistrictSearchInstance {
  search(
    adcode: string,
    callback: (status: string, result: DistrictResult) => void,
  ): void;
  setSearchType(type: number): void;
  setLevel(level: string): void;
  setSubdistrict(subdistrict: number): void;
  setExtensions(extensions: string): void;
  [key: string]: unknown;
}

export interface DistrictSearchOptions {
  subdistrict?: number;
  extensions?: string;
  level?: string;
  showbiz?: boolean;
  [key: string]: unknown;
}

export interface DrawEvent {
  obj: CircleInstance | PolygonInstance;
  [key: string]: unknown;
}

export interface MapMouseEvent {
  lnglat: LngLatInstance;
  [key: string]: unknown;
}

/**
 * 项目级围栏图形项。
 */
export type ShapeType = "Circle" | "Polygon";

export interface ShapeItem {
  id: string;
  name: string;
  type: ShapeType;
  overlay: CircleInstance | PolygonInstance;
}

declare global {
  namespace AMap {
    // amap-jsapi-v2-types 未把这两个插件类挂到命名空间，
    // 这里补上，使 `new AMap.DistrictSearch()` / `new AMap.Geocoder()` 可用。
    export interface DistrictSearchConstructor {
      new (options?: DistrictSearchOptions): DistrictSearchInstance;
    }
    export const DistrictSearch: DistrictSearchConstructor;

    export interface GeocoderConstructor {
      new (options?: GeocoderOptions): GeocoderInstance;
    }
    export const Geocoder: GeocoderConstructor;
  }
}
