<template>
    <div id="about">
        <div class="item" v-for="(item, index) in data" :key="index" :title="item.title || ''">
            <div class="word" v-if="item.top">
                <p v-html="item.top" ></p>
                <a target="_blank" :href="item.href">
                    <p :title="item.ptitle">{{ item.bottom }}</p>
                </a>
            </div>
            <div class="icon" v-if="!item.top">
                <a target="_blank" :href="item.href" v-html="item.icon"></a>
            </div>
            <div class="icon" v-if="item.top" v-html="item.icon"></div>
        </div>
    </div>
</template>

<script>
export default {
    name: "ContactInformation",
    data() {
        return {
            data: [
                          ]
        }
    },
    async mounted() {
        const content = await fetch("/contactinf.json")
          this.data=await content.json();
    },

}
</script>

<style>
#about {
    position: fixed;
    height: 240px;
    width: 60px;
    background-color: #56abe2;
    right: 1px;
    top: calc(50% - 120px);
    z-index: 9999;
    display: flex;
    flex-direction: column;
}

#about p {
    margin: 0;
    padding: 0;
}

#about .item {
    width: 60px;
    height: 60px;
    border-bottom: 1px solid #ccc;
    border-left: 1px solid #fff;
    border-top: 1px solid transparent;
    cursor: pointer;
    position: relative;
}

#about .item:first-child,
#about .item:first-child .word {
    border-top-color: #fff;
}

#about .item:hover {
    background-color: #7abde8;
}

#about .item .word {
    position: absolute;
    right: 60px;
    height: 180px;
    top: -1px;
    background-color: #7abde8;
    border-bottom: 1px solid #ccc;
    border-left: 1px solid #fff;
    border-top: 1px solid transparent;
    /* cursor: text; */
    width: 0;
    overflow: hidden;
    border-width: 0;
    transition: all 0.5s linear;
}
#about .item .word img{
    width: 80%;
}

#about .item a {
    text-decoration: none;
    color: #fff;
}

#about .item:hover .word {
    width: 180px;
    border-width: 1px;
    border-top-color: #fff;
}

#about .item .word a p:hover {
    text-decoration: underline;
    color: blue;
}

#about .item .word p {
    line-height: 30px;
    color: #fff;
    font-size: 13px;
    text-align: center;
}

#about .item.tel .word p {
    font-size: 12px;
}

#about .item .icon,
#about .item .icon a {
    width: 70%;
    height: 70%;
    position: absolute;
    top: 15%;
    left: 15%;
}

#about .item .icon svg {
    width: 100%;
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
}
</style>