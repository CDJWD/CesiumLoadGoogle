let terrainProvider;

self.onmessage = function(event) {
    const { type, index, worldPosition, dir } = event.data;

    if (type === 'init') {
        // 初始化地形提供者
        terrainProvider = event.data.terrainProvider;
    } else if (type === 'process') {
        // 创建射线
        const ray = new Cesium.Ray(worldPosition, dir);

        // 使用地形提供者进行计算
        terrainProvider.readyPromise.then(() => {
            const intersection = terrainProvider.pick(ray, scene);
            let result;
            if (intersection) {
                const cartographic = Cesium.Cartographic.fromCartesian(intersection);
                cartographic.height += 2.0; // 增加2米
                result = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, cartographic.height);
            } else {
                result = worldPosition;
            }

            // 发送结果回主线程
            self.postMessage({ index, result });
        });
    }
};