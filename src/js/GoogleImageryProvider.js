import * as Cesium from "cesium";

export default class GoogleImageryProvider{
    constructor(option){
        this.credit = new Cesium.Credit(option.credit || "", false);
        this.tilingScheme = new Cesium.GeographicTilingScheme({
            numberOfLevelZeroTilesX: 2,
            numberOfLevelZeroTilesY: 1
        });
        this.tileWidth = 256;
        this.tileHeight = 256;
        this.fileExtension = option.fileExtension || "jpg";
        this.proxy = new Cesium.DefaultProxy("");
        this.tileDiscardPolicy = undefined;
        this.minimumLevel = 1;
        this.maximumLevel = 20
        this.rectangle = new Cesium.Rectangle(0 - Math.PI, 0 - Math.PI / 2, Math.PI, Math.PI / 2);
        this.ready = true;
        this.baseurl = option.baseurl;
        this.needaddone = option.addone;
    }
    requestImage(x,y,level){
        if (this.needaddone) { x += 1; y += 1; level += 1; }

        var tempuri = this.baseurl;
        x -= 1;
        var height = Math.pow(2, level);
        y = height - y;
        if (height >= 4)
            y -= height / 4;
        if (tempuri.replace == null)
            tempuri = this.baseurl;
        var url = tempuri.replace("{x}", x);
        url = url.replace("{y}", y);
        url = url.replace("{z}", level);
        return Cesium.ImageryProvider.loadImage(this, url);
    }
}

