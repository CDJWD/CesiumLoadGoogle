<template>
    <div id="main">
        <div id="cesiumContainer" sandbox="allow-scripts"></div>
        <CoordinateDisplay :coordinate=mouseCoordinate />
        <LayerControl :layerSet="layerSet" @selectChange="layerSelectChangeHandle" @jump="layerJumpHandle" />
        <ContactInformation  style="visibility: hidden;"/>
        <LocalSearch :Viewer="cesiumViewer" />
        <FloatingToolbar :tools="tools" @selected="toolSelectHandle"></FloatingToolbar>
    </div>
</template>

<script>
import * as Cesium from 'cesium';
import MVTImageryProvider from 'mvt-imagery-provider';
import GoogleImageryProvider from '/src/js/GoogleImageryProvider'
import CoordinateDisplay from './CoordinateDisplay.vue';
import LayerControl from './LayerControl.vue';
import ContactInformation from './ContactInformation.vue';
import FloatingToolbar from './FloatingToolbar.vue';
import { PolygonDrawer, PolylineDrawer } from '/src/js/cesiumMeasure';
import LocalSearch from './localSearch.vue';
import config from '../config.js';
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
            }],
            lastPickTime: 0,
            pickThrottleTime: 100,
            boundingSphereEntities: null,
            waterSimulationDataSource: null,
            // 帧率监控相关
            frameRateMonitor: {
                fps: 0,
                frameCount: 0,
                lastTime: 0,
                targetFPS: 144,
                isMonitoring: false
            }
        }
    },
    components: {
        CoordinateDisplay,
        LayerControl,
        LocalSearch,
        ContactInformation,
        FloatingToolbar,
    },
    async mounted() {
        this.layerSet = await this.getLayerList();
        this.init();
    },
    methods: {
        async init() {

            this.serverurl = config.server.mainImg;
            this.cesiumViewer = new Cesium.Viewer('cesiumContainer', {
                timeline: false, //时间轴控件
                animation: false,//动画控件
                geocoder: false, // 搜索控件
                homeButton: false, // 主页控件
                terrainProvider: await Cesium.CesiumTerrainProvider.fromUrl(config.server.terrain),
                infoBox: false,
                sceneModePicker: false,//投影方式按钮
                baseLayerPicker: false,// 图层选择按钮
                navigationHelpButton: false,//帮助助手按钮
                fullscreenButton: false, // 全屏按钮
                shadows: false,
                scene3DOnly: false,
                selectionIndicator: false,
                baseLayer: new Cesium.ImageryLayer(new GoogleImageryProvider({ baseurl:this.serverurl + "/getTileImage?x={x}&y={y}&z={z}", addone: true }))
            });
            
          
            
            this.cesiumViewer.scene.globe.showWireframe = true;
           
            // 显示帧率信息
            // 显示地形瓦片包围球
            // this.cesiumViewer.scene.globe.maximumScreenSpaceError = 2;
            console.log(this.cesiumViewer.scene.globe.maximumScreenSpaceError)
            // 显示帧率
            this.cesiumViewer.scene.debugShowFramesPerSecond = true;

            this.cesiumViewer.clock.shouldAnimate = false;  // 自动播放
            this.cesiumViewer.clock.multiplier = 2;      // 正常时间流速
            this.cesiumViewer.scene.globe.depthTestAgainstTerrain = true;
            this.cesiumViewer.camera.setView({
                destination: Cesium.Cartesian3.fromDegrees(105.40, 30.67, 3000000.0),
            });
           
            // 添加节流变量
            this.lastPickTime = 0;
            this.pickThrottleTime = 200; // 每100毫秒最多执行一次拾取

            //显示鼠标坐标（添加节流控制）
            this.cesiumViewer.screenSpaceEventHandler.setInputAction((event) => {
                const now = Date.now();
                // 如果距离上次拾取时间不足阈值，则跳过本次拾取
                if (now - this.lastPickTime < this.pickThrottleTime) {
                    return;
                }
                this.lastPickTime = now;

                // 首先尝试拾取3DTiles或地形
                let position = null;


                const pickedObject = this.cesiumViewer.scene.pick(event.endPosition);

                if (Cesium.defined(pickedObject)) {
                    // 如果拾取到了3DTiles或实体
                    position = this.cesiumViewer.scene.pickPosition(event.endPosition);
                    // console.log("从3DTiles或实体拾取到位置")
                } else {
                    // 如果没有拾取到3DTiles或实体，则尝试拾取地形
                    const ray = this.cesiumViewer.camera.getPickRay(event.endPosition);
                    if (Cesium.defined(ray)) {
                        position = this.cesiumViewer.scene.globe.pick(ray, this.cesiumViewer.scene);
                        // console.log("从地形拾取到位置")
                    }
                }

                // 如果3DTiles和地形都没拾取到，则拾取椭球体表面
                if (!Cesium.defined(position)) {
                    position = this.cesiumViewer.camera.pickEllipsoid(event.endPosition, this.cesiumViewer.scene.globe.ellipsoid);
                }

                // 计算坐标
                if (Cesium.defined(position)) {
                    let cartographicPosition = this.cesiumViewer.scene.globe.ellipsoid.cartesianToCartographic(position);
                    this.mouseCoordinate.lat = parseFloat((cartographicPosition.latitude / Math.PI * 180).toFixed(6));
                    this.mouseCoordinate.lon = parseFloat((cartographicPosition.longitude / Math.PI * 180).toFixed(6));
                    this.mouseCoordinate.height = cartographicPosition.height.toFixed(1);

                    var he = Math.sqrt(this.cesiumViewer.scene.camera.positionWC.x * this.cesiumViewer.scene.camera.positionWC.x +
                        this.cesiumViewer.scene.camera.positionWC.y * this.cesiumViewer.scene.camera.positionWC.y +
                        this.cesiumViewer.scene.camera.positionWC.z * this.cesiumViewer.scene.camera.positionWC.z);
                    var he2 = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);
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
                    if (element.type === 22) {
                        this.addFolder(element)
                    }
                    //3Dtiles图层
                    else if (element.type === 2) {
                        this.add3DLayer(element)
                    }

                    //普通web墨卡托图层
                    else if (element.type === 3) {
                        this.addGodeMap(element)
                    }
                    //kml图层
                    else if (element.type == 10) {
                        this.addKML(element)
                    }
                }
            }
        },
        async addKML(element) {
            if (!element.state) {
                if (element.tileset)
                    this.cesiumViewer.dataSources.remove(element.tileset)
            }
            else {
                if (element.tileset) {
                    this.cesiumViewer.dataSources.add(element.tileset);
                }
                else {
                    var kmlDataSource = new Cesium.KmlDataSource();
                    var viewer = this.cesiumViewer;

                    // 加载并添加到 Viewer
                    kmlDataSource.load(element.url)
                        .then(function (dataSource) {
                            viewer.dataSources.add(kmlDataSource);
                            // viewer.zoomTo(kmlDataSource)
                            element.tileset = kmlDataSource;
                        })
                        .catch(function (error) {
                            // 处理加载错误
                            console.error('Error loading KML file:', error);
                        });


                }
            }

        },
       
        addGodeMap(element) {
            if (!element.tileset) {
                let provider = new Cesium.UrlTemplateImageryProvider({
                    url: element.url,
                    tilingScheme: new Cesium.WebMercatorTilingScheme(),
                    maximumLevel: 18, // 根据高德地图的可用级别设置  
                });
                element.tileset = this.cesiumViewer.imageryLayers.addImageryProvider(provider);
                element.tileset.alpha = 1.0;             // 确保完全不透明
                element.tileset.brightness = 1.0;        // 正常亮度
                element.tileset.contrast = 1.0;          // 正常对比度
                element.tileset.hue = 0.0;               // 无色相偏移
                element.tileset.saturation = 1.0;        // 正常饱和度
                element.tileset.gamma = 1.0;             // 正常伽马值
            }
            if (!element.state) {
                this.cesiumViewer.imageryLayers.remove(element.tileset, false)
            }
        },
        async addFolder(element) {
            if (!element.state) return;
            for (let index = 0; index < element.children.length; index++) {
                let child = element.children[index];
                this.add3DLayer(child)
            }
        },
        async add3DLayer(element) {
            if (!element.state) return;

            try {
                const tileset = await Cesium.Cesium3DTileset.fromUrl(element.url);
                tileset.maximumScreenSpaceError = 8;
                //  tileset.debugShowBoundingVolume = true;
                // 设置样式
                if (element.min != null && element.max != null) {
                    tileset.style = new Cesium.Cesium3DTileStyle({
                        color: {
                            conditions: this.buildConditions(element.min, element.max)
                        }
                    });
                }

                // 处理高度偏移
                if (element.heightoffset) {
                    const boundingSphere = tileset.boundingSphere;
                    const cartographic = Cesium.Cartographic.fromCartesian(boundingSphere.center);
                    // 将cartographic转换为经纬度
                    const longitude = Cesium.Math.toDegrees(cartographic.longitude);
                    const latitude = Cesium.Math.toDegrees(cartographic.latitude);
                    const height = cartographic.height;

                    // 计算模型中心点与目标点的距离
                    const targetPoint = Cesium.Cartesian3.fromDegrees(longitude, latitude, height+element.heightoffset);
                    const distance = Cesium.Cartesian3.subtract(targetPoint, boundingSphere.center, new Cesium.Cartesian3());

              
                    tileset.modelMatrix = Cesium.Matrix4.fromTranslation(distance);
                }

                // 设置性能优化参数
                tileset.dynamicScreenSpaceError = true;

                // 添加到场景
                this.cesiumViewer.scene.primitives.add(tileset);
                element.tileset = tileset;
                return;
                // 处理上一个tileset
                if (element.lasttileset) {
                    setTimeout(() => {
                        this.cesiumViewer.scene.primitives.remove(element.lasttileset);
                        element.lasttileset = tileset;
                    }, 300);
                }

                // 处理动态加载
                if (element.url.includes('8081')) {
                    const currentIndex = parseFloat(element.url.slice(-11, -5));
                    const nextIndex = (currentIndex + 60);
                    element.url = `http://127.0.0.1:8081/${nextIndex}.json`;
                    console.log(element.url)
                    setTimeout(() => {
                        this.add3DLayer(element);
                    }, 500);
                }

            } catch (error) {
                console.error('加载3D图层失败:', error);
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
        layerSelectChangeHandle(index, state, parentIndex) {
            let element = null;
            if (!parentIndex)
                element = this.layerSet[index];
            else
                element = this.layerSet[parentIndex].children[index];
            if (!state) {
                if (element.type == 1 || element.type === 3) {
                    this.cesiumViewer.imageryLayers.remove(element.tileset, false)
                } else if (element.type == 2) {
                    this.cesiumViewer.scene.primitives.remove(element.tileset)
                } else if (element.type == 10) {
                    element.tileset = false;
                    this.cesiumViewer.dataSources.remove(element.tileset)
                    console.log("移除KML")
                }
            } else {
                if (element.type == 1 || element.type === 3) {
                    this.cesiumViewer.imageryLayers.add(element.tileset)
                } else if (element.type == 2) {
                    element.state = true;
                    this.add3DLayer(element);
                }
                else if (element.type == 10) {
                    element.state = true;
                    this.addKML(element);

                }
            }
            element.state = state
        },
        layerJumpHandle(index, parentIndex) {
            let element = null;
            if (!parentIndex)
                element = this.layerSet[index];
            else
                element = this.layerSet[parentIndex].children[index];
            if (element.state) {
                if (!element.tileset) {
                    alert("tartget not find")
                    return;
                }

                // 使用flyToBoundingSphere并设置75度俯视角
                const boundingSphere = element.tileset.boundingSphere;

                // 计算75度俯视角（而非90度垂直视角）
                const pitchRadians = -75 * (Math.PI / 180);  // 转换75度为弧度

                // 由于视角倾斜，增加距离倍数确保模型完全在视野内
                const distanceMultiplier = 4.0;  // 增加倍数补偿倾斜视角

                this.cesiumViewer.camera.flyToBoundingSphere(boundingSphere, {
                    offset: new Cesium.HeadingPitchRange(
                        0,                   // heading: 朝向北方
                        pitchRadians,        // pitch: 75度俯视角
                        boundingSphere.radius * distanceMultiplier  // 距离：调整为更合适的距离
                    ),
                    duration: 2,             // 飞行时间(秒)
                    complete: function () {
                        console.log("跳转成功");
                    },
                    cancel: function () {
                        console.log("跳转取消");
                    },
                    fail: function () {
                        console.log("跳转失败");
                    }
                });
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

/* 帧率显示样式 */
.frame-rate-display {
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 10px 15px;
    border-radius: 8px;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    z-index: 1000;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.fps-counter {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 5px;
}

.fps-label {
    font-weight: bold;
    color: #ccc;
}

.fps-value {
    font-weight: bold;
    font-size: 16px;
    min-width: 40px;
    text-align: center;
}

.fps-excellent {
    color: #00ff00;
}

.fps-good {
    color: #ffff00;
}

.fps-fair {
    color: #ff8800;
}

.fps-poor {
    color: #ff0000;
}

.target-fps {
    font-size: 12px;
    color: #aaa;
    text-align: center;
}
</style>