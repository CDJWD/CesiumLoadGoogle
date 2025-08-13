// 配置文件
export const config = {
    // 服务器地址配置
    server: {
        // 主服务器地址
        mainImg: "http://117.172.255.147:8312",
        // 历史数据服务器地址
        historyImg: "http://117.172.255.147:8314",
        // 地形数据服务器
        terrain: "http://117.172.255.147:8312/dem/",
    },
    
    // 地图配置
    map: {
        // 初始视角
        initialView: {
            longitude: 104.07,
            latitude: 30.67,
            height: 30000.0
        }
    },
    
    // 时间轴配置
    timeline: {
        blankLength: 68
    }
};

// 导出默认配置
export default config; 