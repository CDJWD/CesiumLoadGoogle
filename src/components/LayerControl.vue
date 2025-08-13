<template>
    <div id="layerControl" :style="{ width: isCollapsed ? '100px' : '250px' }">
        <div class="head">
            图层列表： <img class="img" :style="rotateStyle" @click="collapse" src="/layer_expand.png">
        </div>
        <!-- 渲染图层项目，支持层级结构 -->
        <div v-for="(item, index) in layerSet" :key="item.name" v-show="!item.hidden && isChildrenVisible">
            <div class="layerItem">
                <div class="iconCol">

                </div>

                <!-- 统一宽度的复选框区域 -->
                <div class="checkboxCol">
                    <!--选中状态-->
                    <img v-if="item.type !== 22 && item.state" class="selectedImg"
                        @click="layerSelectChange(index, false)" src="/layer_selected.png">
                    <!--未选中状态-->
                    <img v-if="item.type !== 22 && !item.state" class="selectedImg"
                        @click="layerSelectChange(index, true)" src="/layer_check_box.png">
                    <!-- 文件夹 -->
                    <img v-if="item.children && item.children.length > 0" class="folderImg" @click="toggleFolder(index)"
                        :src="folderStates[index] ? '/folder_expand.png' : '/folder_close.png'">
                </div>

                <div class="layerName">{{ item.name }}</div>
                <img v-if="item.jump && item.state" class="jumpImg" @click="layerJump(index)" src="/layer_position.png">
            </div>

            <!-- 如果有子项且当前文件夹已展开，渲染子项 -->
            <div v-if="item.children && item.children.length > 0 && folderStates[index]">
                <div v-for="(childItem, childIndex) in item.children" :key="childItem.name" v-show="!childItem.hidden"
                    class="layerItem childLayer">
                    <div class="indentLine"></div>

                    <!-- 子项图标列保持一致 -->
                    <div class="iconCol"></div>

                    <!-- 子项复选框区域 -->
                    <div class="checkboxCol">
                        <img v-if="childItem.state" class="selectedImg"
                            @click="childLayerSelectChange(index, childIndex, false)" src="/layer_selected.png">
                        <img v-if="!childItem.state" class="selectedImg"
                            @click="childLayerSelectChange(index, childIndex, true)" src="/layer_check_box.png">
                    </div>

                    <div class="layerName">{{ childItem.name }}</div>
                    <img v-if="childItem.jump && childItem.state" class="jumpImg"
                        @click="childLayerJump(index, childIndex)" src="/layer_position.png">
                </div>
            </div>
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
    created() {
        if (this.layerSet) {
            this.folderStates = this.layerSet.map(() => true);
        }
    },
    watch: {
        layerSet: {
            handler(newVal) {
                if (newVal) {
                    this.folderStates = newVal.map(() => true);
                }
            },
            immediate: true
        }
    },
    methods: {
        layerSelectChange(index, state) {
            this.$emit("selectChange", index, state);
        },
        childLayerSelectChange(parentIndex, childIndex, state) {
            this.$emit("selectChange", childIndex, state, parentIndex);
        },
        layerJump(index) {
            console.log("跳转" + index);
            this.$emit("jump", index);
        },
        childLayerJump(parentIndex, childIndex) {
            console.log("跳转子图层" + parentIndex + "-" + childIndex);
            this.$emit("jump", childIndex, parentIndex);
        },
        toggleFolder(index) {
            this.folderStates[index] = !this.folderStates[index];
        },
        collapse() {
            this.isCollapsed = !this.isCollapsed;
            if (!this.isCollapsed) {
                setTimeout(() => {
                    this.isChildrenVisible = true;
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
            folderStates: []
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

/* 新增固定宽度的列 */
.iconCol {
    width: 20px;
    display: flex;
    justify-content: center;
}

.checkboxCol {
    width: 20px;
    display: flex;
    justify-content: center;
}

.folderImg {
    width: 20px;
    height: 20px;
    cursor: pointer;
    transition: transform 0.3s;
}

.rotate90 {
    transform: rotate(-90deg);
}

.img.ratate {
    transform: rotate(180deg);
}

.layerItem {
    display: flex;
    height: 22px;
    align-items: center;
    transition: visibility 0.2s ease-in-out;
}

.childLayer {
    padding-left: 15px;
    position: relative;
    background-color: #f9f9f9;
}

.indentLine {
    position: absolute;
    left: 15px;
    top: 0;
    height: 100%;
    width: 1px;
    background-color: #ddd;
}

.selectedImg {
    width: 20px;
    height: 20px;
    cursor: pointer;
}

.layerName {
    flex: 1;
    font-size: 20px;
    padding-left: 5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.jumpImg {
    width: 20px;
    height: 20px;
    margin-right: 5px;
    cursor: pointer;
}

.hidden {
    visibility: hidden;
}
</style>