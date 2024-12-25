<template>
    <div>
        <!-- 查询框容器，固定在左上角 -->
        <div class="fixed-query-box">
            <input type="checkbox" v-model="searchOnline">在线搜索 <input type="text" v-model="query"
                placeholder="请输入查询内容" />
            <button @click="search">查询</button>
            <button @click="search_clear">清除</button>
        </div>
        <div id="result"></div>
    </div>
</template>

<script>
import * as Cesium from 'cesium';
export default {
    data() {
        return {
            query: '',  // 查询框的输入内容
            searchOnline: true,
            lastDraw: null
        };
    },
    props: {
        Viewer: {
            default: null
        },

    },
    methods: {
        getPolygonBounds(polygonHierarchy) {
            let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;

            polygonHierarchy.positions.forEach(cartesian => {
                const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
                const lon = Cesium.Math.toDegrees(cartographic.longitude);
                const lat = Cesium.Math.toDegrees(cartographic.latitude);
                if (lon < minLon) minLon = lon;
                if (lon > maxLon) maxLon = lon;
                if (lat < minLat) minLat = lat;
                if (lat > maxLat) maxLat = lat;
            });

            return { minLon, maxLon, minLat, maxLat };
        }
        ,
        search_clear(){
            clearSearchResult();

        },
        search() {
            if (this.searchOnline) {
                this.search_online();
                return;
            }
            var serverurl = 'http://map.earthg.cn:8311/search?key=';
            serverurl += this.query;
            const resultDiv = document.getElementById('result');
            fetch(serverurl).then(async (response) => {
                const locations = await response.json();
                if (locations.length < 1) {
                    clearSearchResult();
                    alert("没有找到目标")
                    return;
                }
                resultDiv.innerHTML = '';
                resultDiv.style.visibility = 'visible';
                locations.forEach(((tag) => {
                    var pss = []
                    tag.Points.forEach((element) => {
                        var ps = []
                        element.forEach(point => {
                            var p = Cesium.Cartesian3.fromDegrees(point.X, point.Y);
                            ps.push(p);
                        })
                        if (pss.length > 0) {
                            if (ps.length > pss[0].length)
                                pss.unshift(ps)
                            else
                                pss.push(ps)
                        }
                        else pss.push(ps)
                    });
                    var holes = [];
                    for (var i = 1; i < pss.length; i++)
                        holes.push(new Cesium.PolygonHierarchy(pss[i]));
                    var PolygonHierarchy = new Cesium.PolygonHierarchy(pss[0], holes)
                    resultDiv.innerHTML = '';
                    resultDiv.style.visibility = 'visible';
                    // 遍历并显示每个搜索结果
                    const resultItem = document.createElement('div');
                    resultItem.classList.add('result-item');

                    const link = document.createElement('a');
                    link.onclick = this.resultClik_online;
                    link.href = "#"
                    link.textContent = tag.Name;
                    link.PolygonHierarchy = PolygonHierarchy;
                    const address = document.createElement('p');
                    address.textContent = `地址: ${tag.Name}`;

                    // 将信息添加到每个搜索项中
                    resultItem.appendChild(link);
                    resultItem.appendChild(address);
                    // resultItem.appendChild(location);
                    // 将搜索项添加到结果区域
                    resultDiv.appendChild(resultItem);


                }))

            })
        },
        resultClik_online(sender) {
            if (this.lastDraw) {
                this.Viewer.entities.remove(this.lastDraw);
                this.lastDraw = undefined;
            }
            //高德的搜索结果
            if (sender.target.location) {
                const [longitude, latitude] = sender.target.location.split(',').map(Number);
                var wgs84 = gcj02ToWgs84(longitude, latitude);
                this.Viewer.camera.flyTo({
                    destination: Cesium.Rectangle.fromDegrees(
                        wgs84.lng - 0.01,  // 最左边经度
                        wgs84.lat - 0.01,  // 最底部纬度
                        wgs84.lng + 0.01,  // 最右边经度
                        wgs84.lat + 0.01   // 最顶部纬度
                    ),
                    duration: 1, // 飞行时间为 1秒
                });
            }
            //本地搜索结果
            if (sender.target.PolygonHierarchy) {

                var PolygonHierarchy = sender.target.PolygonHierarchy;

                this.lastDraw = this.Viewer.entities.add({
                    polygon: {
                        hierarchy: PolygonHierarchy,  // 设置多边形的边界
                        material: new Cesium.ColorMaterialProperty(Cesium.Color.TRANSPARENT.withAlpha(0.3)),  // 设置透明的填充
                        outline: true,  // 启用边框
                        outlineColor: Cesium.Color.RED,  // 设置边框颜色为红色
                        outlineWidth: 3,  // 设置边框宽度
                        // 设置为虚线边框
                        outlineDashPattern: [16, 8],  // 设置虚线的长短，16 是实线部分的长度，8 是空白部分的长度
                        height: 0,  // 设置多边形的高度为 0，使其贴地
                        clampToGround: true  // 使其贴合地面
                    }
                });
                // 4. 计算多边形的边界 (最小/最大经纬度)

                // 获取多边形的边界
                const bounds = this.getPolygonBounds(PolygonHierarchy);
                this.Viewer.camera.flyTo({
                    destination: Cesium.Rectangle.fromDegrees(
                        bounds.minLon,  // 最左边经度
                        bounds.minLat,  // 最底部纬度
                        bounds.maxLon,  // 最右边经度
                        bounds.maxLat   // 最顶部纬度
                    ),
                    duration: 1, // 飞行时间为 1秒
                });
            }
        },
        search_online() {
            var apiKey = "26a78a177ac493846d49c3aa786f0341";
            const resultDiv = document.getElementById('result');

            fetch(`https://restapi.amap.com/v3/place/text?key=${apiKey}&keywords=${encodeURIComponent(this.query)}&output=JSON`)
                .then(response => response.json())
                .then(data => {

                    if (data.status === '1' && data.pois && data.pois.length > 0) {
                        resultDiv.innerHTML = '';
                        resultDiv.style.visibility = 'visible';
                        // 遍历并显示每个搜索结果
                        data.pois.forEach(item => {
                            const resultItem = document.createElement('div');
                            resultItem.classList.add('result-item');

                            const link = document.createElement('a');
                            link.onclick = this.resultClik_online;
                            link.href = "#"
                            link.textContent = item.name;
                            link.location = item.location;
                            const address = document.createElement('p');
                            address.textContent = `地址: ${item.address}`;

                            // const location = document.createElement('p');
                            // location.textContent = `经纬度: ${item.location}`;

                            // 将信息添加到每个搜索项中
                            resultItem.appendChild(link);
                            resultItem.appendChild(address);
                            // resultItem.appendChild(location);
                            // 将搜索项添加到结果区域
                            resultDiv.appendChild(resultItem);
                        });
                    } else {
                        clearSearchResult();
                        alert('未找到相关地点');
                    }
                })
                .catch(error => {
                    clearSearchResult();

                    console.error('请求失败:', error);
                });
        }
    }
}
const EARTH_RADIUS = 6378137.0;
function clearSearchResult() {

    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '';
    resultDiv.style.visibility = 'hidden';
}
// 逆地球坐标系转换（GCJ-02 -> WGS-84）
function gcj02ToWgs84(lng, lat) {
    // 如果坐标在中国以外，直接返回原坐标
    if (outOfChina(lng, lat)) {
        return { lng, lat };
    }

    const dLat = transformLat(lng - 105.0, lat - 35.0);
    const dLng = transformLng(lng - 105.0, lat - 35.0);
    const radLat = lat / 180.0 * Math.PI;
    const magic = Math.sin(radLat);
    const sqrtMagic = Math.sqrt(1 - magic * magic);
    const offsetLat = (dLat * 180.0) / ((EARTH_RADIUS * (1 - 0.006693421622965943)) / (sqrtMagic * sqrtMagic) * Math.PI);
    const offsetLng = (dLng * 180.0) / (EARTH_RADIUS / sqrtMagic * Math.PI);

    const wgsLat = lat - offsetLat;
    const wgsLng = lng - offsetLng;

    return { lng: wgsLng, lat: wgsLat };
}

// 判断坐标是否在中国境内
function outOfChina(lng, lat) {
    if (lng < 72.004 || lng > 137.8347) return true;
    if (lat < 0.8293 || lat > 55.8271) return true;
    return false;
}

// 火星坐标系 (GCJ-02) 的经纬度转换 (具体的公式可以参考高德API的文档)
function transformLat(x, y) {
    const pi = 3.14159265358979324;
    const a = 6378245.0;
    const ee = 0.00669342162296594323;
    let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * pi) + 20.0 * Math.sin(2.0 * x * pi)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(y * pi) + 40.0 * Math.sin(y / 3.0 * pi)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(y / 12.0 * pi) + 320.0 * Math.sin(y * pi / 30.0)) * 2.0 / 3.0;
    return ret;
}

function transformLng(x, y) {
    const pi = 3.14159265358979324;
    const a = 6378245.0;
    const ee = 0.00669342162296594323;
    let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * pi) + 20.0 * Math.sin(2.0 * x * pi)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(x * pi) + 40.0 * Math.sin(x / 3.0 * pi)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(x / 12.0 * pi) + 300.0 * Math.sin(x / 30.0 * pi)) * 2.0 / 3.0;
    return ret;
}
</script>

<style scoped>
/* 设置查询框固定在左上角 */
.fixed-query-box {
    position: fixed;
    top: 3px;
    /* 距离屏幕顶部10px */
    left: 3px;
    /* 距离屏幕左侧10px */
    padding: 10px;
    background-color: #fff;
    /* 背景色可以根据需要调整 */
    border: 1px solid #ccc;
    /* 边框样式 */
    z-index: 1000;
    /* 确保查询框位于页面内容之上 */
}


.fixed-query-box input {
    margin-right: 30px;
    height: 24px;
    /* 输入框和按钮之间的间距 */
}

.fixed-query-box button {
    padding: 3px 6px;
    cursor: pointer;
}

#result {
    position: absolute;
    top: 42px;
    left: 3px;
    background-color: #FFF;
    border: 1px solid #ccc;
    padding: 10px;
    width: 365px;
    margin-top: 20px;
    overflow-y: auto;
    max-height: 400px;
    z-index: 1000;
    visibility: hidden;
}

.result-item {
    margin: 10px 0;
    padding: 10px;
    border-bottom: 1px solid #eee;
}

.result-item:last-child {
    border-bottom: none;
}

.result-item p {
    font-size: smaller;
}


.result-item a {
    font-size: medium;
    font-weight: bold;
    color: #007BFF;
    text-decoration: none;
}

.result-item a:hover {
    text-decoration: underline;
}
</style>