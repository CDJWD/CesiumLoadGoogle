import * as Cesium from "cesium";

/**
 * 绘制折线
 */
export class PolylineDrawer {
  _cache = new Map(); //缓存
  _viewer = null;  //视图
  _dataSource = null; //自定义数据源
  _handler = null; //鼠标事件
  _activtityEntityData = null; //当前绘制图形的数据
  _activtityEntity = null; //当前绘制的图形实体
  _polylineStyle = {};   // 多边形样式
  _measure = false;       //是否测量
  _showPoint = true;      //是否显示端点
  _pointStyle = {};      //点样式
  _labelStyle = {}         //标签样式

  /**
   * @param {Object} option 
   * @param {Object} option.viewer          //cesium视图
   * @param {object} option.polylineStyle   //线的样式
   * @param {string} option.polylineStyle.color       //线的颜色
   * @param {number} option.polylineStyle.width       //线的宽度
   * @param {boolean} option.showPoint                //是否显示端点
   * @param {Object} option.pointStyle                //端点样式
   * @param {number} option.pointStyle.pixelSize      //大小
   * @param {string} option.pointStyle.color          //填充颜色
   * @param {string} option.pointStyle.outlineColor   //包裹线的颜色
   * @param {number} option.pointStyle.outlineWidth   //包裹线的宽度
   * @param {boolean} option.measure                  //是否测量线段长度
   * @param {object} option.labelStyle                //线段长度展示的样式
   * @param {boolean} option.labelStyle.showBackground  //是否显示背景
   * @param {string} option.labelStyle.backgroundColor  //背景颜色
   * @param {string} option.labelStyle.fillColor        //字体颜色
   * @param {string} option.labelStyle.font             //字体样式
   */
  constructor(option) {
    if (!option.viewer) {
      throw new Error('viewer is required');
    }
    this._viewer = option.viewer;
    this._dataSource = new Cesium.CustomDataSource('polyline-drawer');
    this._viewer.dataSources.add(this._dataSource);
    this._polylineStyle = option.polylineStyle || {};
    this._showPoint = typeof option.showPoint === 'boolean' ? option.showPoint : false;
    this._pointStyle = option.pointStyle || {};
    this._measure = typeof option.measure === 'boolean' ? option.measure : false;
    this._labelStyle = option.labelStyle || {};
  }

  /**
 * 开始绘图
 */
  start() {
    this._viewer.canvas.style.cursor = "crosshair";
    if (!this._handler || this._handler.isDestroyed()) {
      this._handler = new Cesium.ScreenSpaceEventHandler(this._viewer.scene.canvas);
    }
    // 鼠标左键单击画点
    this._handler.setInputAction(this._leftClickHandler.bind(this), Cesium.ScreenSpaceEventType.LEFT_CLICK)
    // 鼠标移动
    this._handler.setInputAction(this._mouseMoveHandler.bind(this), Cesium.ScreenSpaceEventType.MOUSE_MOVE)
    // 单击鼠标右键结束画面
    this._handler.setInputAction(this._rightClickHandler.bind(this), Cesium.ScreenSpaceEventType.RIGHT_CLICK)
  }
  /**
*  鼠标左键处理函数 
*/
  _leftClickHandler(event) {
    let position = this._getPosition(this._viewer, event.position)
    if (Cesium.defined(position)) {
      if (this._activtityEntityData === null) {
        let polylineEntity = new Cesium.Entity({
          name: "折线",
          polyline: {
            width: typeof this._polylineStyle.lineWidth === "number" ? this._polylineStyle.lineWidth : 1,
            material: Cesium.Color.fromCssColorString(this._polylineStyle.color || "#fff")
          },
        });
        this._cache.set(polylineEntity.id, { positions: [], labels: [] });
        let polylineData = this._cache.get(polylineEntity.id);
        polylineEntity.polyline.positions = new Cesium.CallbackProperty(() => { return polylineData.positions; }, false);
        this._dataSource.entities.add(polylineEntity);
        polylineData.positions.push(position.clone());
        this._activtityEntity = polylineEntity;
        this._activtityEntityData = polylineData
      }
      if (this._measure || this._showPoint) {
        let pointInfor = new Cesium.Entity({
          name: "点",
          position: position,
        })
        if (this._measure) {
          let length = 0;
          if (this._activtityEntityData.positions.length >= 2) {
            length = this._calculatePolylineLength(this._activtityEntityData.positions);
          }
          let lableTxt = length > 0 ? (length > 1000 ? (length / 1000).toFixed(2) + '千米' : (length/1).toFixed(2) + "米") : null;
          pointInfor.label = this._createLabel(lableTxt);
        }
        if (this._showPoint) {
          pointInfor.point = this._createPoint();
        }
        this._dataSource.entities.add(pointInfor);
        this._activtityEntityData.labels.push(position)
      }
      this._activtityEntityData.positions.push(position)
    }
  }
  /**
   * 鼠标右键处理函数
   * @returns 
   */
  _rightClickHandler() {
    if (this._activtityEntityData === null)
      return
    else if (this._activtityEntityData.positions.length <= 2) {
      this._cache.delete(this._activtityEntity.id)
      this._dataSource.entities.remove(this._activtityEntity)
    } else {
      this._activtityEntityData.positions.pop();
    }
    this._activtityEntityData = null;
    this._activtityEntity = null;
  }
  /**
   * 鼠标移动时的处理函数
   * @param {*} event 
   */
  _mouseMoveHandler(event) {
    if (this._activtityEntityData != null) {
      let position = this._getPosition(this._viewer, event.endPosition)
      if (position) {
        this._activtityEntityData.positions.splice(this._activtityEntityData.positions.length - 1, 1, position);
      }
    }
  }
  /**
   * 创建label对象
   * @param {string} text 
   */
  _createLabel(text) {
    return new Cesium.LabelGraphics({
      text: text,
      showBackground: typeof this._labelStyle.showBackground === 'boolean' ? this._labelStyle.showBackground : true,
      backgroundColor: Cesium.Color.fromCssColorString(this._labelStyle.backgroundColor || "#000000"),
      fillColor: Cesium.Color.fromCssColorString(this._labelStyle.fillColor || "#fff"),
      font: this._labelStyle.font || "14px",
      horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    })
  }
  /**
   * 创建点
   * @returns 
   */
  _createPoint() {
    return new Cesium.PointGraphics({
      show: true,
      pixelSize: typeof this._pointStyle.pixelSize === "number" ? this._pointStyle.pixelSize : 8,
      color: Cesium.Color.fromCssColorString(this._pointStyle.color || "#fff"),
      outlineColor: Cesium.Color.fromCssColorString(this._pointStyle.color || "#000"),
      outlineWidth: typeof this._pointStyle.outlineColor === "number" ? this._pointStyle.pixelSize : 0,
    })
  }
  /**
 * 获取屏幕上点对应的坐标
 * @param {Cesium.Viewer} viewer 视图
 * @param {Cesium.Cartesian2} position 鼠标位置
 * @return {Cesium.Cartesian3} 鼠标点击位置的坐标
 */
  _getPosition(viewer, position) {
    let ray = viewer.camera.getPickRay(position);
    return viewer.scene.globe.pick(ray, viewer.scene);
  }
  /**
   * 通过线的坐标算出其总长度
   * @param {Array} positions 
   * @returns 
   */
  _calculatePolylineLength(positions) {
    let distance = 0
    for (let i = 0; i < positions.length - 1; i++) {
      let point1cartographic = Cesium.Cartographic.fromCartesian(positions[i], Cesium.Ellipsoid.WGS84)
      let point2cartographic = Cesium.Cartographic.fromCartesian(positions[i + 1], Cesium.Ellipsoid.WGS84)
      let geodesic = new Cesium.EllipsoidGeodesic()
      geodesic.setEndPoints(point1cartographic, point2cartographic)
      let s = geodesic.surfaceDistance
      s = Math.sqrt(
        Math.pow(s, 2) +
        Math.pow(point2cartographic.height - point1cartographic.height, 2)
      )
      distance = distance + s
    }
    return distance.toFixed(2)
  }

  /**
 * 结束绘画
 */
  close() {
    this._viewer.canvas.style.cursor = "default";
    if (this._handler && !this._handler.isDestroyed()) {
      this._handler.destroy();
    }
    this.clear()
  }
  /**
* 清理页面绘制的多边形
*/
  clear() {
    this._dataSource.entities.removeAll();
    this._activtityEntity = null
    this._activtityEntityData = null
  }
}

/**
 * 绘制多边形
 */
export class PolygonDrawer {
  _cache = new Map(); //缓存
  _viewer = null;  //视图
  _dataSource = null; //自定义数据源
  _handler = null; //鼠标事件
  _activtityEntityData = null; //当前绘制多边形的数据
  _activtityEntity = null; //当前绘制的多边形实体
  _polygonStyle = {};   // 多边形样式
  _measure = true;        //是否测量面积
  _labelStyle = {};        //测量面积显示设置

  /**
   * @param {object} option 
   * @param {Object} option.viewer                    //cesium视图
   * @param {object} option.polygonStyle              //多边形显示样式
   * @param {string} option.polygonStyle.fillColor    //多边形填充颜色
   * @param {boolean} option.measure                  //是否测量多边形面积
   * @param {object} option.labelStyle                //多边形测量面积显示设置,只有当option.measure=true时改设置才生效
   * @param {boolean} option.labelStyle.showBackground  //是否显示背景
   * @param {string} option.labelStyle.backgroundColor  //背景颜色
   * @param {string} option.labelStyle.fillColor        //字体颜色
   * @param {string} option.labelStyle.font             //字体css样式
   */
  constructor(option) {
    if (!option.viewer) {
      throw new Error('viewer is required');
    }
    this._viewer = option.viewer
    this._dataSource = new Cesium.CustomDataSource('polygon-drawer')
    this._viewer.dataSources.add(this._dataSource);
    this._polygonStyle = option.polygonStyle || {};
    this._measure = typeof option.measure === "boolean" ? option.measure : false;
    this._labelStyle = option.labelStyle || {};
  }
  /**
   * 开始绘图
   */
  start() {
    this._viewer.canvas.style.cursor = "crosshair";
    if (!this._handler || this._handler.isDestroyed()) {
      this._handler = new Cesium.ScreenSpaceEventHandler(this._viewer.scene.canvas);
    }
    // 鼠标左键单击画点
    this._handler.setInputAction(this._leftClickHandler.bind(this), Cesium.ScreenSpaceEventType.LEFT_CLICK)
    // 鼠标移动
    this._handler.setInputAction(this._mouseMoveHandler.bind(this), Cesium.ScreenSpaceEventType.MOUSE_MOVE)
    // 单击鼠标右键结束画面
    this._handler.setInputAction(this._rightClickHandler.bind(this), Cesium.ScreenSpaceEventType.RIGHT_CLICK)
  }
  /**
   *  左键处理函数 
   */
  _leftClickHandler(event) {
    let position = this._getPosition(this._viewer, event.position)
    if (Cesium.defined(position)) {
      if (this._activtityEntityData === null) {
        let cesiumEntity = new Cesium.Entity({
          name: "多边形",
          polyline: {
            material: Cesium.Color.fromCssColorString(this._polygonStyle.fillColor || "#fff"),
          },
          polygon: {
            material: Cesium.Color.fromCssColorString(this._polygonStyle.fillColor || "#fff"),
          },
          label: {
            font: this._labelStyle.font || "24px",
            showBackground: typeof this._labelStyle.showBackground === "boolean" ? this._labelStyle.showBackground : false,
            backgroundColor: Cesium.Color.fromCssColorString(this._labelStyle.backgroundColor || "#000"),
            fillColor: Cesium.Color.fromCssColorString(this._labelStyle.fillColor || "#fff"),
            show: false,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          },
        });
        this._cache.set(cesiumEntity.id, { positions: [], polygonHierarchy: null });
        let polygonState = this._cache.get(cesiumEntity.id);
        cesiumEntity.polyline.positions = new Cesium.CallbackProperty(() => { return polygonState.positions; }, false);
        polygonState.polygonHierarchy = new Cesium.PolygonHierarchy();
        cesiumEntity.polygon.hierarchy = new Cesium.CallbackProperty(() => { return polygonState.polygonHierarchy; }, false);
        polygonState.positions.push(position.clone());
        polygonState.polygonHierarchy.positions.push(position.clone());
        this._activtityEntity = cesiumEntity;
        this._activtityEntityData = polygonState;
        this._dataSource.entities.add(cesiumEntity);
      } else if (this._activtityEntityData.positions.length >= 2) {
        this._activtityEntity.polyline.show = false;
      }
      this._activtityEntityData.positions.push(position)
      this._activtityEntityData.polygonHierarchy.positions.push(position)
    }
  }
  /**
   * 
   * @returns 鼠标右击事件处理函数
   */
  _rightClickHandler() {
    if (this._activtityEntityData === null)
      return
    else if (this._activtityEntityData.positions.length <= 3) {
      this._cache.delete(this._activtityEntity.id)
      this._dataSource.entities.remove(this._activtityEntity)
    } else {
      this._activtityEntityData.positions.pop();
      this._activtityEntityData.polygonHierarchy.positions.pop();
      if (this._measure) {
        this._activtityEntity.position = this._getPolygonCenter(this._activtityEntity.polygon)
        this._activtityEntity.label.text = this.getArea(this._activtityEntityData.polygonHierarchy.positions);
      }
      this._activtityEntity.label.show = true;
    }
    this._activtityEntityData = null;
    this._activtityEntity = null;
  }
  /**
   * 鼠标移动处理函数
   * @param {*} event 
   */
  _mouseMoveHandler(event) {
    if (this._activtityEntityData != null) {
      let position = this._getPosition(this._viewer, event.endPosition)
      if (position) {
        this._activtityEntityData.positions.splice(this._activtityEntityData.positions.length - 1, 1, position);
        this._activtityEntityData.polygonHierarchy.positions.splice(this._activtityEntityData.positions.length - 1, 1, position);
      }
    }
  }
  /**
   * 添加鼠标点击事件的位置
   * @param {Cesium.Viewer} viewer 视图
   * @param {Cesium.Cartesian2} position 鼠标位置
   * @return {Cesium.Cartesian3} 鼠标点击位置的坐标
   */
  _getPosition(viewer, position) {
    let ray = viewer.camera.getPickRay(position);
    return viewer.scene.globe.pick(ray, viewer.scene);
  }

  // 计算多边形面积
  getArea(points) {
    var area = 0
    // 拆分三角曲面
    for (var i = 0; i < points.length - 2; i++) {
      var j = (i + 1) % points.length
      var k = (i + 2) % points.length
      var totalAngle = this.Angle(points[i], points[j], points[k])

      var dis_temp1 = this.distance(points[i], points[j])
      var dis_temp2 = this.distance(points[j], points[k])
      area += dis_temp1 * dis_temp2 * Math.abs(Math.sin(totalAngle))
    }
    return area > 1000000 ? (area / 1000000.0).toFixed(2) + "k㎡" : ( area > 10000 ? (area / 10000.0).toFixed(2) + "hm²" : area.toFixed(2) + "㎡")
  }
  /*方向*/
  Bearing(from, to) {
    from = Cesium.Cartographic.fromCartesian(from);
    to = Cesium.Cartographic.fromCartesian(to);

    var lat1 = from.latitude;
    var lon1 = from.longitude;
    var lat2 = to.latitude;
    var lon2 = to.longitude;
    var angle = -Math.atan2(Math.sin(lon1 - lon2) * Math.cos(lat2), Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon1 - lon2));
    if (angle < 0) {
      angle += Math.PI * 2.0;
    }
    var degreesPerRadian = 180.0 / Math.PI; //弧度转化为角度

    angle = angle * degreesPerRadian; //角度
    return angle;
  }
  /*角度*/
  Angle(p1, p2, p3) {
    var bearing21 = this.Bearing(p2, p1);
    var bearing23 = this.Bearing(p2, p3);
    var angle = bearing21 - bearing23;
    if (angle < 0) {
      angle += 360;
    }
    return angle;
  }

  distance(point1, point2) {
    var point1cartographic = Cesium.Cartographic.fromCartesian(point1);
    var point2cartographic = Cesium.Cartographic.fromCartesian(point2);
    /**根据经纬度计算出距离**/
    var geodesic = new Cesium.EllipsoidGeodesic();
    geodesic.setEndPoints(point1cartographic, point2cartographic);
    var s = geodesic.surfaceDistance;
    //返回两点之间的距离
    s = Math.sqrt(Math.pow(s, 2) + Math.pow(point2cartographic.height - point1cartographic.height, 2));
    return s;
  }
  /**
   * 结束绘画
   */
  close() {
    this._viewer.canvas.style.cursor = "default";
    if (this._handler && !this._handler.isDestroyed()) {
      this._handler.destroy();
    }
    this.clear()
  }
  /**
   * 清理页面绘制的多边形
   */
  clear() {
    this._dataSource.entities.removeAll();
    this._activtityEntity = null
    this._activtityEntityData = null
  }

  _getPolygonCenter(polygon) {
    const positions = polygon.hierarchy.getValue(Cesium.JulianDate.now()).positions;
    return Cesium.BoundingSphere.fromPoints(positions).center;
  }
}