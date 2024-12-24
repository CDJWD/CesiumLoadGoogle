<template>
    <div id="layerControl" :style="{ width: isCollapsed ? '30px' : '250px' }">
        <div class="head">
            <img class="img" :style="rotateStyle" @click="collapse" src="/layer_expand.png">
        </div>
        <div v-for="(item, index) in layerSet" :key="item.name" class="layerItem" v-show="isChildrenVisible">
            <img v-if="item.state" class="selectedImg" @click="layerSelectChange(index, false)" src="/layer_selected.png">
            <img v-if="!item.state" class="selectedImg" @click="layerSelectChange(index, true)" src="/layer_check_box.png">
            <div class="layerName">{{ item.name }}</div>
            <img v-if="item.jump && item.state" class="jumpImg" @click="layerJump(index)" src="/layer_position.png">
        </div>
    </div>
</template>

<script>
export default {
    name: "LayerControl",
    props: {
        layerSet: {
            type: Array,
            default: null
        }
    },
    computed: {
        rotateStyle() {
            return {
                transition: 'transform 0.5s ease-in-out',
                transform: `rotate(${this.isCollapsed ? 180 : 0}deg)`,
            };
        },
    },
    methods: {
        layerSelectChange(index, state) {
            this.$emit("selectChange", index, state);
        },
        layerJump(index) {
            console.log("跳转" + index)
            this.$emit("jump", index);
        },
        collapse() {
            this.isCollapsed = !this.isCollapsed;
            if (!this.isCollapsed) {
                setTimeout(() => {
                    this.isChildrenVisible = true; // 延迟后设置为显示  
                }, 300);
            } else {
                this.isChildrenVisible = false;
            }
        }
    },
    data() {
        return {
            isCollapsed: false,
            isChildrenVisible: true,
        }
    }
}
</script>

<style scoped>
#layerControl {
    z-index: 100;
    background: white;
    position: absolute;
    left: 15px;
    top: 50%;
    transform: translateY(-50%);
    border-radius: 6px;
    border: 1px solid #4299FF;
    transition: width 0.5s ease;
    overflow: hidden;
}

.head {
    border-bottom: 1px solid #4299FF;
    position: relative;
    height: 25px;
}

.img {
    width: 20px;
    height: 20px;
    right: 5px;
    bottom: 2px;
    position: absolute;
    cursor: pointer;
}

.img.ratate {
    transform: rotate(180deg);
}


.layerItem {
    display: flex;
    height: 50px;
    align-items: center;
    transition: visibility 0.2s ease-in-out;
}

.selectedImg {
    width: 26px;
    height: 26px;
    margin-left: 10px;
    cursor: pointer;
}

.layerName {
    width: 184px;
    font-size: 20px;
    padding-left: 5px;
}

.jumpImg {
    width: 30px;
    height: 30px;
    cursor: pointer;
}


.hidden {
    visibility: hidden;
}
</style>