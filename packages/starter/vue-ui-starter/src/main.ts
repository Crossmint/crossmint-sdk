import { createRouter, createWebHashHistory } from "vue-router";
import { createApp } from "vue/dist/vue.esm-bundler";

import App from "./App.vue";
import PayWithCC from "./components/PayWithCC.vue";

const About = { template: "<div>About</div>" };

const routes = [
    { path: "/", component: App },
    { path: "/checkout", component: PayWithCC },
];

const router = createRouter({
    history: createWebHashHistory(),
    routes,
});

const app = createApp({});

app.use(router);

app.mount("#app");
