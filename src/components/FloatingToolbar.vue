<template>
    <div v-if="this.tools" class="tools">
        <div class="tool_wrap" v-for="item in tools" :key="item.key">
            <img :src="item.icon" class="menu-icon"  @click="toolSelect(item.key)" :title="item.title">
        </div>
    </div>
</template>

<script>
export default {
    name: "FloatingToolbar",
    props: {
        tools: {
            type: Array,
            default: null
        }
    },
    data() {
        return {

        }
    },
    methods: {
        toolSelect(index) {
            this.$emit("selected", index)
        }
    }
}
</script>

<style>
.tools {
    position: absolute;
    top: 50px;
    right: 50px;
    height: 50px;
    z-index: 99;
    display: block;
    align-items: center;
    display: flex;
    background-color: white;
    padding-right: 10px;
    padding-left: 10px;
}

.tool_wrap {
    width: 50px;
    height: 50px;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
}

.menu-icon {
    margin: auto;
    width: 30px;
    height: 30px;
    cursor: pointer;
}
</style>