<template>
    <div id="main">
        <div id="cesiumContainer">
            <div id="slider"></div>
        </div>
        <div class="cesium-viewer-timelineContainer" style="right: 29px; left: 0px;">
            <div class="cesium-timeline-main" id="timecontainer1" onmousedown="timemoveHander_mousemove(event)"
                onmousemove="timemoveHander_mousemove(event)" onmouseup="timemoveHander_mouseup(event)"
                onmouseout="timemoveHander_mouseup(event)">
                <div class="cesium-timeline-bar" style="background-color: blue" id="timebar1">
                </div>
                <div class="cesium-timeline-bar" style="background-color: red" id="timebar2">
                </div>
                <div class="cesium-timeline-trackContainer" style="height: 27px;">
                    <canvas class="cesium-timeline-tracks" width="1382" height="1" style="height: 1px;"></canvas>
                </div>
                <div class="cesium-timeline-needle" style="left: 418px;"></div>
            </div>

        </div>
        <div class="timelable" id="timelable_left">
        </div>
        <div class="timelable" id="timelable_right">
        </div>
        <CoordinateDisplay :coordinate=mouseCoordinate />
    </div>
</template>

<script>
import * as Cesium from 'cesium';
import MVTImageryProvider from 'mvt-imagery-provider';
import GoogleImageryProvider from '/src/js/GoogleImageryProvider'
import CoordinateDisplay from './CoordinateDisplay.vue';
import ContactInformation from './ContactInformation.vue';
import { PolygonDrawer, PolylineDrawer } from '/src/js/cesiumMeasure';

export default {
    name: "MapDisplayComp",

    data() {
        return {
            cesiumViewer: undefined,
            mouseCoordinate: {
                lat: null,
                lon: null,
                height: null,
                eyeHeight: null
            },
            lastaddedtimesArray: null,
            currenttimestrleft: "2099/01/01",
            currenttimestrright: "1901/01/01",
        }
    },
    components: {
        CoordinateDisplay,
        ContactInformation,
    },
    async mounted() {
        this.init();
        document.getElementById("coordinateDisplay").style.bottom = "30px";
    },
    methods: {
        async init() {
            this.serverurl = "https://map.earthg.cn:8311/"

            this.cesiumViewer = new Cesium.Viewer('cesiumContainer', {
                timeline: false, //时间轴控件
                animation: false,//动画控件
                geocoder: false, // 搜索控件
                homeButton: false, // 主页控件
                terrainProvider: await Cesium.CesiumTerrainProvider.fromUrl("https://map.earthg.cn:8311/dem/"),
                infoBox: false,
                sceneModePicker: false,//投影方式按钮
                baseLayerPicker: false,// 图层选择按钮
                navigationHelpButton: false,//帮助助手按钮
                fullscreenButton: false, // 全屏按钮
                shadows: false,
                scene3DOnly: false,
                selectionIndicator: false,
                baseLayer: new Cesium.ImageryLayer(new GoogleImageryProvider({ baseurl: "https://map.earthg.cn:8311/getTileImage?x={x}&y={y}&z={z}", addone: true }))
            });
            this.cesiumViewer.camera.setView({
                destination: Cesium.Cartesian3.fromDegrees(105.40, 30.67, 300000.0),
            });
            //显示鼠标坐标
            this.cesiumViewer.screenSpaceEventHandler.setInputAction((event) => {
                var cartesian = this.cesiumViewer.scene.pickPosition(event.endPosition);
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

            window.onresize = function () {
                this.dealSizeChanged();
                resizeTimeControl();
            }
            this.LoadTimesToControl = function (timesarray) {
                if (timesarray == undefined) {
                    console.log("重置时间控件");
                    timesarray = this.lastaddedtimesArray;
                }
                else
                    this.lastaddedtimesArray = timesarray;
                if (timesarray == undefined || timesarray.length <= 1) {
                    var container = document.getElementsByClassName("cesium-viewer-timelineContainer")[0];
                    container.style.visibility = "hidden";

                    document.getElementById("timelable_left").style.visibility = "hidden";
                    var rightcontrol = document.getElementById("timelable_right");
                    if (rightcontrol != undefined)
                        rightcontrol.style.visibility = "hidden";

                    var coordis = document.getElementById("coordinateDisplay");
                    coordis.style.bottom = "0px";
                    coordis.style.right = "29px";
                    this.SetTimeValues("timebar1", []);
                    if (document.getElementById("timebar2") != undefined)
                        this.SetTimeValues("timebar2", []);
                }
                else {
                    var container = document.getElementsByClassName("cesium-viewer-timelineContainer")[0];
                    container.style.visibility = "visible";
                    document.getElementById("timelable_left").style.visibility = "visible";
                    if (rightcontrol != undefined)
                        rightcontrol.style.visibility = "visible";
                    var coordis = document.getElementById("coordinateDisplay");
                    coordis.style.bottom = "29px";
                    coordis.style.right = "0px";
                    this.SetTimeValues("timebar1", timesarray, timesarray.length - 1);
                    if (document.getElementById("timebar2") != undefined)
                        this.SetTimeValues("timebar2", timesarray, 0);
                }
            };
            this.SetTimeValues = function (tagid, timevalues, wantindex) {

                var container = document.getElementById(tagid);
                while (container.childNodes.length > 0)
                    container.removeChild(container.childNodes[0]);
                if (timevalues.length == 0)
                    return;
                var times = new Array();
                var wantedtime = Date.parse("2099/01/01");
                if (tagid == "timebar1") {
                    wantedtime = Date.parse(this.currenttimestrleft);
                }
                else {
                    wantedtime = Date.parse(this.currenttimestrright);
                }
                var mindis = Number.MAX_VALUE;
                for (var i = 0; i < timevalues.length; i++) {
                    //部分浏览器不识别-格式的时间字符
                    timevalues[i] = timevalues[i].replace("-", "/");
                    times[i] = Date.parse(timevalues[i]);
                    var chavalue = Math.abs(times[i] - wantedtime);
                    if (chavalue < mindis) {
                        wantindex = i;
                        mindis = chavalue;
                    }
                }
                //总时间
                var timelength = times[times.length - 1] - times[0];
                //控件宽度
                var controllength = container.clientWidth;
                //总共可用的长度
                var displaylength = controllength - blank_length * 2;
                //单个时间的长度
                var timecelllength = displaylength / timelength;

                var lastaddx = -100;
                for (var i = 0; i < times.length; i++) {
                    var currenttime = times[i];
                    var addtime = currenttime - times[0];
                    //从最左边开始，此时间的位置
                    var addlength = addtime * timecelllength;
                    //显示的短线
                    var ticMain = document.createElement("span");
                    ticMain.className = "cesium-timeline-ticMain";
                    ticMain.style.left = (blank_length + addlength) + "px";
                    ticMain.tagtime = times[i];

                    container.appendChild(ticMain);

                    var labelcontent = new Date(times[i]).Format("yyyy/MM/dd hh:mm:ss");
                    if (addlength - lastaddx >= 100 || i == times.length - 1) {
                        var ticlabel = document.createElement("span");
                        ticlabel.className = "cesium-timeline-ticLabel";
                        ticlabel.style.left = (addlength + blank_length / 2) + "px";
                        ticlabel.appendChild(document.createTextNode(new Date(times[i]).Format("yyyy/MM/dd")));
                        container.appendChild(ticlabel);
                        lastaddx = addlength;
                    }
                    else {
                        ticMain.className = "cesium-timeline-ticSub";
                    }
                    ticMain.tiptext = labelcontent;
                    ticMain.onmouseenter = function () { this.showCurretTimeText(this, "visible") };
                    ticMain.onmouseleave = function () { this.showCurretTimeText(this, "hidden") };

                    if (i == wantindex) {
                        var timemoveHander = document.createElement("span");
                        timemoveHander.className = "cesium-timeline-icon16";
                        timemoveHander.style.left = (addlength + blank_length - 8) + "px";
                        if (tagid == "timebar1") {
                            this.currenttimestrleft = labelcontent;
                            this.showCurretTimeText("timelable_left", true, labelcontent);
                        }
                        else {
                            this.currenttimestrright = labelcontent;
                            this.showCurretTimeText("timelable_right", true, labelcontent);
                        }
                        container.appendChild(timemoveHander);
                    }
                }
            };
            var blank_length = 68;
            this.showCurretTimeText = function (tagid, showorhidden, discontent) {
                var label = document.getElementById(tagid);
                if (showorhidden) {
                    label.innerText = discontent;
                    label.style.visibility = "visible";
                }
                else
                    label.style.visibility = "hidden";

            };

            this.timemoveHander_mousemove = function (event) {
                if (event.buttons == 0)
                    return;

                var mousedownx = event.clientX;
                var sender = null;
                var slider = document.getElementById('slider');

                if (slider == undefined || mousedownx <= slider.offsetLeft) {
                    sender = document.getElementById("timebar1");
                }
                else {
                    sender = document.getElementById("timebar2");
                    mousedownx -= slider.offsetLeft;
                }
                var handler = sender.getElementsByClassName("cesium-timeline-icon16")[0];
                if (handler != undefined)
                    handler.style.left = (mousedownx - 8) + "px";
            };
            this.dealSizeChanged = function () {
                var slider = document.getElementById('slider');
                if (slider == undefined) {
                    LoadTimesToControl();
                }
                else {
                    var arg = new Object();
                    arg.buttons = 1;
                    arg.type = "mouseup";
                    arg.clientX = slider.offsetLeft;
                    timemoveHander_mouseup(arg);
                }
            }

            this.timemoveHander_mouseup = function (event) {
                if (event.type == "mouseout" && event.buttons == 0)
                    return;
                //分隔控件
                var slider = document.getElementById('slider');
                var mousedownx = event.screenX;
                var sender = null;
                var x = event.clientX;
                var tagleft = true;
                if (slider == undefined || mousedownx <= slider.offsetLeft) {
                    sender = document.getElementById("timebar1");
                }
                else {
                    sender = document.getElementById("timebar2");
                    x -= slider.offsetLeft;
                    tagleft = false;
                }

                var handler = sender.getElementsByClassName("cesium-timeline-icon16")[0];
                if (handler == undefined)
                    return;
                //查找最近的一个时间点
                var ticMainArray = sender.getElementsByClassName("cesium-timeline-ticMain");

                var nearestNode = ticMainArray[0];
                var neardis = Math.abs(parseFloat(nearestNode.style.left.replace("px", "")) - x);
                for (var i = 1; i < ticMainArray.length; i++) {
                    var currentdis = Math.abs(parseFloat(ticMainArray[i].style.left.replace("px", "")) - x);
                    if (currentdis < neardis) {
                        neardis = currentdis;
                        nearestNode = ticMainArray[i];
                    }
                }
                ticMainArray = sender.getElementsByClassName("cesium-timeline-ticSub");
                for (var i = 0; i < ticMainArray.length; i++) {
                    var currentdis = Math.abs(parseFloat(ticMainArray[i].style.left.replace("px", "")) - x);
                    if (currentdis < neardis) {
                        neardis = currentdis;
                        nearestNode = ticMainArray[i];
                    }
                }
                handler.style.left = (parseFloat(nearestNode.style.left.replace("px", "")) - 8) + "px";
                var selectedtime = nearestNode.tagtime;
                if (sender.currenttime == selectedtime)
                    return;
                sender.currenttime = selectedtime;

                var currenttimestr = new Date(selectedtime).Format("yyyy/MM/dd hh:mm:ss");
                if (tagleft)
                    this.currenttimestrleft = currenttimestr;
                else
                    this.currenttimestrright = currenttimestr;

                this.showCurretTimeText(tagleft ? "timelable_left" : "timelable_right", true, currenttimestr);

                var imageryLayers = viewer.imageryLayers;
                var currentlayer = imageryLayers._layers[tagleft ? 0 : 1];
                imageryLayers.remove(currentlayer, false);
                currentlayer._imageryProvider.baseurl = serverurl + 'getTileImage?x={x}&y={y}&z={z}&time=' + currenttimestr;
                imageryLayers.add(currentlayer, tagleft ? 0 : 1);
            };
            Date.prototype.Format = function (fmt) { //author: meizz   
                var o = {
                    "M+": this.getMonth() + 1,                 //月份   
                    "d+": this.getDate(),                    //日   
                    "h+": this.getHours(),                   //小时   
                    "m+": this.getMinutes(),                 //分   
                    "s+": this.getSeconds(),                 //秒   
                    "q+": Math.floor((this.getMonth() + 3) / 3), //季度   
                    "S": this.getMilliseconds()             //毫秒   
                };
                if (/(y+)/.test(fmt))
                    fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
                for (var k in o)
                    if (new RegExp("(" + k + ")").test(fmt))
                        fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
                return fmt;
            };
            this.resizeTimeControl = function () {
                var slider = document.getElementById('slider');
                //1是左边的，2是右边的
                var timebar1 = document.getElementById("timebar1");
                var timebar2 = document.getElementById("timebar2");
                timebar1.style.right = (slider.parentElement.offsetWidth - slider.offsetLeft) + "px";
                timebar1.style.width = slider.offsetLeft + "px";

                timebar2.style.left = slider.offsetLeft + "px";
                timebar2.style.width = (slider.parentElement.offsetWidth - slider.offsetLeft) + "px";

                var label_left = document.getElementById("timelable_left");
                label_left.style.right = (slider.parentElement.offsetWidth - slider.offsetLeft + 10) + "px";
                var label_right = document.getElementById("timelable_right");
                label_right.style.left = (slider.offsetLeft + 10) + "px";
                //重新加载时间
                this.LoadTimesToControl();
            }
            this.initspliteView = function () {
                var viewer = this.cesiumViewer;
                //右边的图层
                var rightlayer = new GoogleImageryProvider({ baseurl: "https://map.earthg.cn:8311/getTileImage?x={x}&y={y}&z={z}&time=1920-12-30 10:00:00", addone: true });
                var layers = viewer.imageryLayers;
                var earthAtNight = layers.addImageryProvider(rightlayer);
                earthAtNight.splitDirection = Cesium.SplitDirection.RIGHT; // Only show to the left of the slider.

                var slider = document.getElementById('slider');
                viewer.scene.imagerySplitPosition = (slider.offsetLeft) / slider.parentElement.offsetWidth;
                var handler = new Cesium.ScreenSpaceEventHandler(slider);
                var moveActive = false;
                function move(movement) {
                    if (!moveActive) {
                        return;
                    }
                    var relativeOffset = movement.endPosition.x;
                    var splitPosition = (slider.offsetLeft + relativeOffset) / slider.parentElement.offsetWidth;
                    slider.style.left = 100.0 * splitPosition + '%';
                    viewer.scene.imagerySplitPosition = splitPosition;
                    this.resizeTimeControl();
                }

                this.resizeTimeControl();

                handler.setInputAction(function () {
                    moveActive = true;
                }, Cesium.ScreenSpaceEventType.LEFT_DOWN);
                handler.setInputAction(function () {
                    moveActive = true;
                }, Cesium.ScreenSpaceEventType.PINCH_START);

                handler.setInputAction(move, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
                handler.setInputAction(move, Cesium.ScreenSpaceEventType.PINCH_MOVE);

                handler.setInputAction(function () {
                    moveActive = false;
                }, Cesium.ScreenSpaceEventType.LEFT_UP);
                handler.setInputAction(function () {
                    moveActive = false;
                }, Cesium.ScreenSpaceEventType.PINCH_END);
            }

            this.camerachanged = async function (percentage) {
                var extent = this.getCurrentExtent(this);
                if (extent == null)
                    return;
                var region = window.lastgetlevel + "," + extent.xmin + "," + extent.ymin + "," + extent.xmax + "," + extent.ymax;
                var res = await fetch(this.serverurl + "/getUsableTimes?regionandlevel=" + region);
                if (!res.ok) {
                    throw new Error('Network response was not ok');
                }
                var timestr = await res.text(); // 获取字符串格式的响应
                console.log(timestr)
                var timesarray = timestr.split('|');

                this.LoadTimesToControl(timesarray);
            }
            this.getCurrentExtent = function (sender) {
                var viewer = this.cesiumViewer;
                // 范围对象
                var extent = {};

                // 得到当前三维场景
                var scene = viewer.scene;

                // 得到当前三维场景的椭球体
                var ellipsoid = scene.globe.ellipsoid;
                var canvas = scene.canvas;

                // canvas左上角
                var car3_lt = viewer.camera.pickEllipsoid(new Cesium.Cartesian2(0, 0), ellipsoid);
                // canvas左下角
                var car3_lb = viewer.camera.pickEllipsoid(new Cesium.Cartesian2(0, canvas.height), ellipsoid);
                // canvas右下角
                var car3_rb = viewer.camera.pickEllipsoid(new Cesium.Cartesian2(canvas.width, canvas.height), ellipsoid);
                // canvas右上角
                var car3_rt = viewer.camera.pickEllipsoid(new Cesium.Cartesian2(canvas.width, 0), ellipsoid);
                var checkstep = 5;

                if (!car3_lt) {
                    var xIndex = 0;
                    var yIndex = 0;
                    do {
                        yIndex += checkstep; xIndex += checkstep;
                        car3_lt = viewer.camera.pickEllipsoid(new Cesium.Cartesian2(xIndex, yIndex), ellipsoid);
                    } while (!car3_lt && xIndex < canvas.width && yIndex < canvas.height);
                }
                if (!car3_lb) {
                    var xIndex = 0;
                    var yIndex = canvas.height;
                    do {
                        xIndex += checkstep; yIndex -= checkstep;
                        car3_lb = viewer.camera.pickEllipsoid(new Cesium.Cartesian2(xIndex, yIndex), ellipsoid);
                    } while (!car3_lb && xIndex < canvas.width && yIndex > 0);
                }
                if (!car3_rt) {
                    var xIndex = canvas.width;
                    var yIndex = 0;
                    do {
                        xIndex -= checkstep; yIndex += checkstep;
                        car3_rt = viewer.camera.pickEllipsoid(new Cesium.Cartesian2(xIndex, yIndex), ellipsoid);
                    } while (!car3_rt && xIndex > 0 && yIndex < canvas.height);
                }

                if (!car3_rb) {
                    var xIndex = canvas.width;
                    var yIndex = canvas.height;
                    do {
                        xIndex -= checkstep; yIndex -= checkstep;
                        car3_rb = viewer.camera.pickEllipsoid(new Cesium.Cartesian2(xIndex, yIndex), ellipsoid);
                    } while (!car3_rb && xIndex > 0 && yIndex > 0);
                }
                // 当canvas左上角和右下角全部在椭球体上
                if (car3_lt && car3_rb && car3_rt && car3_lb) {
                    var carto_lt = ellipsoid.cartesianToCartographic(car3_lt);
                    var carto_lb = ellipsoid.cartesianToCartographic(car3_lb);
                    var carto_rt = ellipsoid.cartesianToCartographic(car3_rt);
                    var carto_rb = ellipsoid.cartesianToCartographic(car3_rb);
                    var l1 = Cesium.Math.toDegrees(carto_lt.longitude);
                    var l2 = Cesium.Math.toDegrees(carto_lb.longitude);
                    var l3 = Cesium.Math.toDegrees(carto_rt.longitude);
                    var l4 = Cesium.Math.toDegrees(carto_rb.longitude);
                    var b1 = Cesium.Math.toDegrees(carto_lt.latitude);
                    var b2 = Cesium.Math.toDegrees(carto_lb.latitude);
                    var b3 = Cesium.Math.toDegrees(carto_rt.latitude);
                    var b4 = Cesium.Math.toDegrees(carto_rb.latitude);
                    extent.xmin = Math.min(l1, l2, l3, l4);
                    extent.ymin = Math.min(b1, b2, b3, b4)
                    extent.xmax = Math.max(l1, l2, l3, l4);
                    extent.ymax = Math.max(b1, b2, b3, b4)
                    return extent;
                }
                else
                    return null;


            }
            this.initspliteView(this);
            this.LoadTimesToControl([]);
            this.resizeTimeControl();
            this.cesiumViewer.camera.changed.addEventListener(this.camerachanged, this);

        },


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
#slider {
     position: absolute;
     left: 50%;
     top: 0px;
     background-color: #4cff00;
     width: 3px;
     height: 100%;
     z-index: 9999;
 }

     #slider:hover {
         cursor: ew-resize;
     }
</style>
