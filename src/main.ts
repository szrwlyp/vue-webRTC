import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import { router } from "./router/index";
import { createPinia } from "pinia";
// 引入 Vconsole
import Vconsole from "vconsole";
// 所有环境均使用
new Vconsole();

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);
app.use(router);
app.mount("#app");
