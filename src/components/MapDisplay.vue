<template>
    <div id="main">
        <div id="cesiumContainer" sandbox="allow-scripts"></div>
        <CoordinateDisplay :coordinate=mouseCoordinate />
        <LayerControl :layerSet="layerSet" @selectChange="layerSelectChangeHandle" @jump="layerJumpHandle" />
        <ContactInformation />
        <LocalSearch :Viewer="cesiumViewer" />
        <FloatingToolbar :tools="tools" @selected="toolSelectHandle"></FloatingToolbar>
    </div>
</template>

<script>
import * as Cesium from 'cesium';
import MVTImageryProvider from 'mvt-imagery-provider';
import GoogleImageryProvider from '@/js/GoogleImageryProvider'
import CoordinateDisplay from './CoordinateDisplay.vue';
import LayerControl from './LayerControl.vue';
import ContactInformation from './ContactInformation.vue';
import FloatingToolbar from './FloatingToolbar.vue';
import { PolygonDrawer, PolylineDrawer } from '@/js/cesiumMeasure';
import GCMercatorTilingScheme from '@/js/GCMercatorTilingScheme';
import LocalSearch from './localSearch.vue';

export default {
    name: "MapDisplay",

    data() {
        return {
            cesiumViewer: undefined,
            layerSet: [],
            mouseCoordinate: {
                lat: null,
                lon: null,
                height: null,
                eyeHeight: null
            },
            polylineDrawer: null,
            polygonDrawer: null,
            tools: [{
                key: 1,
                title: "测距离",
                icon: "/tool_measuring_distance.png"
            }, {
                key: 2,
                title: "测面积",
                icon: "/tool_measuring_area.png"
            }, {
                key: 3,
                title: "清空页面",
                icon: "/tool_clear.png"
            }, {
                key: 4,
                title: "取消测量",
                icon: "/tool_del.png"
            }]

        }
    },
    components: {
        CoordinateDisplay,
        LayerControl,
        LocalSearch ,
        ContactInformation,
        FloatingToolbar
    },
    async mounted() {
        this.layerSet = await this.getLayerList();
        this.init();
    },
    methods: {
        async init() {
            Cesium.Ion.defaultAccessToken =
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJmNjJjMzY0OS1hZGQxLTRiZmYtYWYwNS03NmIyM2MwMDgwZDAiLCJpZCI6MTIzMTgsInNjb3BlcyI6WyJhc3IiLCJnYyJdLCJpYXQiOjE1NjA4NDQ3Mjd9.OLTL_rs2gAi2R9zoztBHcJPDHnVl2Q7OZxRtZhoCeZE";
            this.cesiumViewer = new Cesium.Viewer('cesiumContainer', {
                timeline: false, //时间轴控件
                animation: false,//动画控件
                geocoder: false, // 搜索控件
                homeButton: false, // 主页控件
                terrainProvider: await Cesium.CesiumTerrainProvider.fromUrl("http://map.earthg.cn:8311/dem?tk=A43D27703BFD4C268A18A6F0AF060927"),
                infoBox: false,
                sceneModePicker: false,//投影方式按钮
                baseLayerPicker: false,// 图层选择按钮
                navigationHelpButton: false,//帮助助手按钮
                fullscreenButton: false, // 全屏按钮
                shadows: false,
                scene3DOnly: false,
                selectionIndicator: false,
                baseLayer: new Cesium.ImageryLayer(new GoogleImageryProvider({ baseurl: "http://map.earthg.cn:8311/getTileImage?x={x}&y={y}&z={z}&tk=A43D27703BFD4C268A18A6F0AF060927", addone: true }))
            });
            this.cesiumViewer.camera.setView({
                destination: Cesium.Cartesian3.fromDegrees(105.40, 30.67, 3000000.0),
            });
            //显示鼠标坐标
            this.cesiumViewer.screenSpaceEventHandler.setInputAction((event) => {
                // let ray = this.cesiumViewer.camera.getPickRay(event.endPosition);
                // let cartesian = this.cesiumViewer.scene.globe.pick(ray, this.cesiumViewer.scene);
                var cartesian =   this.cesiumViewer.scene.pickPosition(event.endPosition);
                // var cartesian = this.cesiumViewer.camera.pickEllipsoid(event.endPosition, this.cesiumViewer.scene.globe.ellipsoid);
                if (Cesium.defined(cartesian)) {
                    let cartographicPosition = this.cesiumViewer.scene.globe.ellipsoid.cartesianToCartographic(cartesian);
                    this.mouseCoordinate.lat = parseFloat((cartographicPosition.latitude / Math.PI * 180).toFixed(6))
                    this.mouseCoordinate.lon = parseFloat((cartographicPosition.longitude / Math.PI * 180).toFixed(6))
                    this.mouseCoordinate.height = cartographicPosition.height.toFixed(1)
                    var he = Math.sqrt(this.cesiumViewer.scene.camera.positionWC.x * this.cesiumViewer.scene.camera.positionWC.x +
                        this.cesiumViewer.scene.camera.positionWC.y * this.cesiumViewer.scene.camera.positionWC.y +
                        this.cesiumViewer.scene.camera.positionWC.z * this.cesiumViewer.scene.camera.positionWC.z);
                    var he2 = Math.sqrt(cartesian.x * cartesian.x + cartesian.y * cartesian.y + cartesian.z * cartesian.z);
                    this.mouseCoordinate.eyeHeight = he - he2;
                }
            }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
            this.addLayer()
            this.polylineDrawer = new PolylineDrawer({
                viewer: this.cesiumViewer,
                showPoint: true,
                pointStyle: {
                    pixelSize: 8,
                    color: "#ADFF2F",
                    outlineColor: "#000",
                    outlineWidth: 2
                },
                measure: true,
            })
            this.polygonDrawer = new PolygonDrawer({
                viewer: this.cesiumViewer,
                polygonStyle: {
                    fillColor: "#ffff0088",
                    outlineWidth: 2,
                    outlineColor: "#ffff0088"
                },
                measure: true,
                labelStyle: {
                    fillColor: "#00ff00"
                }
            })
        },
        async getLayerList() {
            const content = await fetch("/layers.json")
            return await content.json();
        }
        ,
        addLayer() {
            for (let index = 0; index < this.layerSet.length; index++) {
                let element = this.layerSet[index];
                if (!element.hidden) {
                    if (element.type === 1) {
                        this.addMapboxTitle(element)
                    } else if (element.type === 2) {
                        this.add3DLayer(element)
                    } else if (element.type === 3) {
                        this.addGodeMap(element)
                    }
                }
            }
        },
        addMapboxTitle(element) {
            MVTImageryProvider.fromUrl('/streets-v11.json')
                .then(provider => {
                    element.tileset = this.cesiumViewer.imageryLayers.addImageryProvider(provider)
                    if (!element.state) {
                        this.cesiumViewer.imageryLayers.remove(element.tileset, false)
                    }
                });
        },
        addGodeMap(element) {
            let provider = new Cesium.UrlTemplateImageryProvider({
                url: element.url,
                tilingScheme: new Cesium.WebMercatorTilingScheme(),
                // tilingScheme: new GCMercatorTilingScheme(),
                maximumLevel: 18, // 根据高德地图的可用级别设置  
                rectangle: new Cesium.Rectangle(180, 0, 0, 90) // 覆盖全球  
            });
            element.tileset = this.cesiumViewer.imageryLayers.addImageryProvider(provider);
            if (!element.state) {
                this.cesiumViewer.imageryLayers.remove(element.tileset, false)
            }
        },
        add3DLayer(element) {
            if (element.state) {
                Cesium.Cesium3DTileset.fromUrl(element.url).then(tileset => {
                    if (element.min) {
                        tileset.style = new Cesium.Cesium3DTileStyle(
                            {
                                color: {
                                    conditions: this.buildConditions(element.min, element.max),
                                }
                            });
                    }
                    if (element.heightoffset) {
                        var boundingSphere = tileset.boundingSphere;
                        //中心经纬度
                        var cartographic = Cesium.Cartographic.fromCartesian(boundingSphere.center);
                        //偏移后的坐标
                        var surface = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, cartographic.height);
                        var offset = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, cartographic.height + element.heightoffset);
                        //偏移量
                        var translation = Cesium.Cartesian3.subtract(offset, surface, new Cesium.Cartesian3());
                        tileset.modelMatrix = Cesium.Matrix4.fromTranslation(translation);
                    }
                    element.tileset = tileset
                    this.cesiumViewer.scene.primitives.add(tileset)
                })
            }
        },
        buildConditions(min, max) {
            var ans = [];
            var step = (max - min) / 100;
            for (var current = max; current >= min; current -= step) {
                var condition = "${z} >= " + current;
                var c = this.getColorByHeight(current, min, max);
                ans.push([condition, c]);

            }
            ans.push(["true", "color('brown')"]);
            return ans;
        },
        getColorByHeight(height, minElevation, maxElevation) {

            if (height < minElevation) {
                return "color('blue')";
            } else if (height > maxElevation) {
                return "color('red')";
            } else {

                var t = (height - minElevation) / (maxElevation - minElevation);
                var hue = (1 - t) * 240.0 / 360.0;
                var color = Cesium.Color.fromHsl(hue, 1.0, 0.5);

                return color.toCssColorString();
            }
        },
        layerSelectChangeHandle(index, state) {
            let element = this.layerSet[index];
            if (!state) {
                if (element.type == 1 || element.type === 3) {
                    this.cesiumViewer.imageryLayers.remove(element.tileset, false)
                } else {
                    this.cesiumViewer.scene.primitives.remove(element.tileset)
                }
            } else {
                if (element.type == 1 || element.type === 3) {
                    this.cesiumViewer.imageryLayers.add(element.tileset)
                } else if (element.type == 2) {
                    element.state = true;
                    this.add3DLayer(element);
                }
            }
            element.state = state
        },
        layerJumpHandle(index) {
            let element = this.layerSet[index];
            if (element.state) {
                this.cesiumViewer.zoomTo(element.tileset).then(res => {
                    if (res) {
                        console.log("跳转成功")
                    } else {
                        console.log("跳转失败")
                    }
                    console.log(res)
                })
            }
        },
        toolSelectHandle(key) {
            if (key === 1) {
                if (this.toolType === 2) {
                    this.polygonDrawer.close()
                }
                this.polylineDrawer.start()
                this.toolType = 1;
            } else if (key === 2) {
                if (this.toolType === 1) {
                    this.polylineDrawer.close()
                }
                this.polygonDrawer.start()
                this.toolType = 2;
            } else if (key === 3) {
                if (this.toolType === 1) {
                    this.polylineDrawer.clear()
                } else if (this.toolType === 2) {
                    this.polygonDrawer.clear()
                }
            } else if (key === 4) {
                if (this.toolType === 1) {
                    this.polylineDrawer.close()
                } else if (this.toolType === 2) {
                    this.polygonDrawer.close()
                }
                this.toolType = 0;
            }
        }
    }
}
</script>

<style>
#main {
    position: relative;
    width: 100vw;
    height: 100vh;
}

#cesiumContainer {
    width: 100%;
    height: 100%;
}

.cesium-widget-credits {
    display: none !important;
}
</style>