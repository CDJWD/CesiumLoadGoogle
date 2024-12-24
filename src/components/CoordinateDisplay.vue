<template>
  <div id="coordinateDisplay">
    <div>海拔高度：<span>{{ coordinate.height || "--" }}</span>米</div>
    <div>经度：<span class="angle">{{ coordinate.lon || "--" }}</span>°，纬度：<span class="angle">{{ coordinate.lat || "--"
        }}</span>°
    </div>
    <div>视角海拔高度:{{ eyeHeight }}</div>
  </div>
</template>

<script>
export default {
  name: "CoordinateDisplay",
  props: {
    coordinate: {
      type: Object,
      default: function () {
        return {}
      }
    }
  },
  computed: {
    eyeHeight() {
      if (!this.coordinate.eyeHeight) {
        return "--"
      } else if (Math.abs(this.coordinate.eyeHeight) < 1000) {
        return parseFloat(this.coordinate.eyeHeight).toFixed(1) + "米";
      } else {
        return parseFloat(this.coordinate.eyeHeight / 1000).toFixed(1) + "公里";
      }
    }
  }
}
</script>

<style scoped>
#coordinateDisplay {
  width: 100%;
  height: 30px;
  position: absolute;
  bottom: 5px;
  left: 0px;
  display: flex;
  justify-content: space-between;
  padding-left: 40px;
  padding-right: 40px;
  color: white;
  font-size: 18px;
  line-height: 26px;
  z-index: 900;
  box-sizing: border-box;
}
</style>