import { createApp } from 'vue';
import Comp from './Comp.vue';

const app = createApp(Comp);
app.config.globalProperties.lastgetlevel = 0;
app.mount('#comp');