/**
 * @file 组合操作
*/

import { createRef, useEffect, useState } from 'react';
import { Button, Tooltip } from 'antd';
import 'antd/dist/antd.css';

import { MODEL, normalStyle, activeStyle, iconActive, text, labelOptions, baseOpts } from './helper';
import {
    DrawScene,
    MarkerDraw,
    RectDraw,
    PolylineDraw,
    PolygonDraw,
    MarkerEdit,
    PolylineEdit,
    PolygonEdit,
    Select,
    CutCalculate,
    UnionCalculate,
    ActionStatus,
    DrawStatus,
    PolylineMove,
    PolygonMove,
    GeoCalculator,
    CorrectPoint,
    DrawingType,
    OperateEventType
} from 'bmap-draw';

const mapRef = createRef();

const PoyDemo = () => {
    const [sceneSelectStatus, setSelectStatus] = useState(null);
    const [modelStatus, setModelStatus] = useState(null);
    const [selectInstance, setSelect] = useState(null);

    useEffect(() => {
        // 初始化地图
        const map = new BMapGL.Map(mapRef.current);
        map.centerAndZoom(new BMapGL.Point(116.41248, 39.927893), 13);
        map.setMapStyleV2({ styleId: 'c95c1f9ab40e5ba30b3b0be8fc3464d8' });
        map.enableScrollWheelZoom();

        // 初始化绘制场景类
        const scene = new DrawScene(map, {
            labelOptions: labelOptions,
            activeIcon: iconActive,
            baseOpts: baseOpts,
            drawCursor: 'url("' + require('./cursor.svg') + '") 40 53, crosshair'
        });

        // 初始化选择类
        const select = new Select(scene, {
            type: DrawingType.DRAWING_POINT,
            isSeries: true,
            enableSnap: true,
            graphicOpts: {
                fillColor: 'yellow'
            }
        });
        setSelect(select);
        const cut = new CutCalculate(); // 实例化裁切类
        const union = new UnionCalculate(); // 实例化合并类

        const editLine = new PolylineEdit(scene);
        const editPoly = new PolygonEdit(scene);
        const editMarker = new MarkerEdit(scene);
        const drawMarker = new MarkerDraw(scene, { isSeries: true });
        const drawPolyLine = new PolylineDraw(scene, { isSeries: true });
        const drawPoly = new PolygonDraw(scene, { isSeries: true });
        const moveline = new PolylineMove(scene);
        const moveFill = new PolygonMove(scene);

        let selectedOverlay = [];
        let polyLayer = new BMapGL.GeoJSONLayer('poly', {
            dataSource: null,
            polylineStyle: normalStyle,
            polygonStyle: normalStyle,
            markerStyle: normalStyle
        });
        map.addGeoJSONLayer(polyLayer);
        scene.attachSnapSource(polyLayer.overlayData);

        // 场景绑定事件
        scene.addEventListener(OperateEventType.COMPLETE, e => {
            console.log(e, e.target)
            switch (e.target.from) {
                case ActionStatus.DRAW_ON_MAP:
                    // 绘制图形存储与样式处理
                    polyLayer.overlayData.push(e.target.overlay);
                    if (e.target.overlay instanceof BMapGL.Marker) {
                        return;
                    }
                    selectedOverlay = [e.target.overlay];
                    setActiveStyle(selectedOverlay[0]);
                    break;
                case ActionStatus.EDIT_ON_MAP:
                    selectedOverlay.length = 0;
                    polyLayer.resetStyle();
                    break;
                case ActionStatus.SELECT_NO_MAP:
                    polyLayer.resetStyle();
                    let result = [];
                    if (e.target.overlay instanceof BMapGL.Marker) {
                        result = polyLayer.pickOverlays(e.target.mouseTarget);
                    } else {
                        result = GeoCalculator.intersect(polyLayer.overlayData, e.target.overlay.toGeoJSON());
                    }
                    if (window.event.altKey) {
                        selectedOverlay = [...selectedOverlay, ...(result || [])];
                    } else {
                        selectedOverlay = result || [];
                    }
                    selectedOverlay.forEach(item => {
                        item.setOptions(activeStyle);
                    });
                    break;
                case ActionStatus.SELECT_ON_MAP:
                    setModelStatus(MODEL.POINT_SELECT);

                    try {
                        let result = null;
                        if (selectedOverlay[0] instanceof BMapGL.Polygon) {
                            result = cut.polygonCutByLine(selectedOverlay[0].toGeoJSON(), e.target.overlay.toGeoJSON()).geojsonRes;
                        }
                        if (selectedOverlay[0] instanceof BMapGL.Polyline) {
                            result = cut.lineCutByPoly(selectedOverlay[0].toGeoJSON(), e.target.overlay.toGeoJSON()).geojsonRes;
                        }
                        if (result) {
                            // 移除处理数据
                            let index = polyLayer.overlayData.findIndex(item => {
                                return item === selectedOverlay[0];
                            });
                            polyLayer.overlayData.splice(index, 1);
                            map.removeOverlay(selectedOverlay[0]);
                            polyLayer.addOverlay(result);

                            selectedOverlay.length = 0;
                        }
                    } catch (error) {

                    } finally {
                        scene.clearSelectDrawData(); // 清除选择数据
                    }
                    break;
                case ActionStatus.MOVE_ON_MAP:
                    setModelStatus(MODEL.POINT_SELECT);

                    // 如果是复制需要，重新写数据
                    if (e.target.model === PolylineMove.MODEL.COPY) {
                        polyLayer.addOverlay(e.target.overlay.toGeoJSON());

                    }
                    break;
                default:
                    break;
            }
        });
        scene.addEventListener(OperateEventType.CANCEL, e => {
            switch (e.target.from) {
                case ActionStatus.EDIT_ON_MAP_CANCEL:
                    selectedOverlay.length = 0;
                    polyLayer.resetStyle();
                    break;
                case ActionStatus.SELECT_ON_MAP_CANCEL:
                    selectedOverlay.length = 0;
                    polyLayer.resetStyle();
                    scene.clearSelectDrawData();
                    break;
                default:
                    break;
            }
        });

        function setActiveStyle(overlay) {
            polyLayer.resetStyle();
            overlay.setOptions(activeStyle);
        }

        function unionPoly() {
            // 判断选择数据是否为面
            let match = true;
            let input = [];
            selectedOverlay.forEach(item => {
                if (!(item instanceof BMapGL.Polygon)) {
                    match = false;
                } else {
                    input.push(item.toGeoJSON());
                }
            });
            if (!match) {
                alert('需要选择数据均为多边形数据');
                return;
            }
            let result = union.polygonUnion(input).geojsonRes;
            // 成功则清除选择数据，添加新数据
            if (result) {
                polyLayer.removeOverlay(selectedOverlay);
                scene.removeOverlay(selectedOverlay);
                selectedOverlay.length = 0;
                polyLayer.addOverlay(result);

            } else {
                alert('操作的多边形数据需要相交或者相邻');
            }
        }

        // --- 绑定ui的操作方法 ---
        let uiOpe = {
            // 绘制
            openDrawPoint: () => {
                if (selectedOverlay.length !== 0) {
                    selectedOverlay.length = 0;
                    polyLayer.resetStyle();
                }
                setModelStatus(MODEL.DRAW_POINT);
                select.close();
                drawMarker.open();
            },
            openDrawLine: () => {
                if (selectedOverlay.length !== 0) {
                    selectedOverlay.length = 0;
                    polyLayer.resetStyle();
                }
                setModelStatus(MODEL.DRAW_LINE);
                select.close();
                drawPolyLine.open();
            },
            openDrawFill: () => {
                if (selectedOverlay.length !== 0) {
                    selectedOverlay.length = 0;
                    polyLayer.resetStyle();
                }
                setModelStatus(MODEL.DRAW_FILL);
                select.close();
                drawPoly.open();
            },
            // 选择
            openPointSelect: () => {
                setModelStatus(MODEL.POINT_SELECT);
            },
            openRectSelect: () => {
                setModelStatus(MODEL.RECT_SELECT);
            },
            openFillSelect: () => {
                setModelStatus(MODEL.FILL_SELECT);
            },
            // 编辑
            openEdit: () => {
                if (selectedOverlay.length !== 0) {
                    switch (selectedOverlay[0].toString()) {
                        case 'Marker':
                            editMarker.open(selectedOverlay[0]);
                            break;
                        case 'Polyline':
                            editLine.open(selectedOverlay[0]);
                            break;
                        case 'Polygon':
                            editPoly.open(selectedOverlay[0]);
                            break;
                        default:
                            break;
                    }
                } else {
                    alert('请选择图形');
                }
                setModelStatus(MODEL.POINT_SELECT);
            },
            // 移动
            openMoveLine: (which) => {
                setModelStatus(MODEL.EDIT);
                select.close();

                if (selectedOverlay.length === 1 && selectedOverlay[0] instanceof BMapGL.Polyline) {
                    if (which === 0) {
                        moveline.setCurrentModel(PolylineMove.MODEL.MOVE);
                    } else {
                        moveline.setCurrentModel(PolylineMove.MODEL.COPY);
                    }
                    moveline.open(selectedOverlay[0]);
                } else {
                    alert('请选择一个线图形');
                }
            },
            openMoveFill: (which) => {
                setModelStatus(MODEL.EDIT);
                select.close();

                if (selectedOverlay.length === 1 && selectedOverlay[0] instanceof BMapGL.Polygon) {
                    if (which === 0) {
                        moveFill.setCurrentModel(PolygonMove.MODEL.MOVE);
                    } else {
                        moveFill.setCurrentModel(PolygonMove.MODEL.COPY);
                    }
                    moveFill.open(selectedOverlay[0]);
                } else {
                    alert('请选择一个面图形');
                }
            },
            // 裁切
            openClip: () => {
                setModelStatus(MODEL.CLIP);
                select.close();

                if (selectedOverlay.length !== 0) {
                    const drawline = new PolylineDraw(scene, {
                        isSelectDraw: true,
                        isSeries: false
                    });
                    drawline.open();
                } else {
                    alert('请选择图形');
                }
            },
            // 合并
            openUnion: () => {
                if (selectedOverlay.length >= 2) {
                    unionPoly();
                } else {
                    alert('请选择至少2个多边形图形');
                }
                setModelStatus(MODEL.POINT_SELECT);
            },
            // 删除
            openDel: () => {
                if (selectedOverlay.length !== 0) {
                    polyLayer.removeOverlay(selectedOverlay);
                    scene.removeOverlay(selectedOverlay);
                    selectedOverlay.length = 0;
                } else {
                    alert('请选择图形');
                }
                setModelStatus(MODEL.POINT_SELECT);
            },
            clear: () => {
                polyLayer.clearData();
                scene.clearData();
                selectedOverlay.length = 0;
            }
        };
        uiOpe.openPointSelect();
        setSelectStatus(uiOpe);
        setModelStatus(MODEL.POINT_SELECT);
    }, []);
    useEffect(() => {
        if (!selectInstance) {
            return;
        }
        switch (modelStatus) {
            case MODEL.POINT_SELECT:
                selectInstance.open({
                    type: DrawingType.DRAWING_POINT
                });
                break;
            case MODEL.RECT_SELECT:
                selectInstance.open({
                    type: DrawingType.DRAWING_RECTANGLE
                });
                break;
            case MODEL.FILL_SELECT:
                selectInstance.open({
                    type: DrawingType.DRAWING_POLYGON
                });
                break;
            default:
                break;
        }
    }, [modelStatus]);
    return (
        <div>
            <div style={{ padding: 8 }}>
                <Button style={{ margin: 5 }} disabled={modelStatus === MODEL.DRAW_POINT} onClick={() => sceneSelectStatus.openDrawPoint()}>点绘制</Button>
                <Button style={{ margin: 5 }} disabled={modelStatus === MODEL.DRAW_LINE} onClick={() => sceneSelectStatus.openDrawLine()}>线绘制</Button>
                <Button style={{ margin: 5 }} disabled={modelStatus === MODEL.DRAW_FILL} onClick={() => sceneSelectStatus.openDrawFill()}>面绘制</Button>
                <Tooltip placement="bottom" title={text}>
                    <Button style={{ margin: 5 }} disabled={modelStatus === MODEL.POINT_SELECT} onClick={() => sceneSelectStatus.openPointSelect()}>点选</Button>
                </Tooltip>
                <Button style={{ margin: 5 }} disabled={modelStatus === MODEL.RECT_SELECT} onClick={() => sceneSelectStatus.openRectSelect()}>框选</Button>
                <Button style={{ margin: 5 }} disabled={modelStatus === MODEL.FILL_SELECT} onClick={() => sceneSelectStatus.openFillSelect()}>多边形选</Button>
                <br />
                <Button style={{ margin: 5 }} disabled={modelStatus === MODEL.MOVE} onClick={() => sceneSelectStatus.openMoveLine(0)}>线移动</Button>
                <Button style={{ margin: 5 }} disabled={modelStatus === MODEL.COPY} onClick={() => sceneSelectStatus.openMoveLine(1)}>线复制</Button>
                <Button style={{ margin: 5 }} disabled={modelStatus === MODEL.MOVE} onClick={() => sceneSelectStatus.openMoveFill(0)}>面移动</Button>
                <Button style={{ margin: 5 }} disabled={modelStatus === MODEL.COPY} onClick={() => sceneSelectStatus.openMoveFill(1)}>面复制</Button>

                <Button style={{ margin: 5 }} disabled={modelStatus === MODEL.EDIT} onClick={() => sceneSelectStatus.openEdit()}>编辑</Button>
                <Button style={{ margin: 5 }} disabled={modelStatus === MODEL.CLIP} onClick={() => sceneSelectStatus.openClip()}>切割</Button>
                <Button style={{ margin: 5 }} disabled={modelStatus === MODEL.UNION} onClick={() => sceneSelectStatus.openUnion()}>合并</Button>

                <Button style={{ margin: 5 }} onClick={() => sceneSelectStatus.openDel()}>删除</Button>
                <Button style={{ margin: 5 }} onClick={() => sceneSelectStatus.clear()}>清除</Button>
            </div>
            <div ref={mapRef} style={{ width: 'auto', height: 450, position: 'relative' }} />
        </div>
    );
};

export default PoyDemo;