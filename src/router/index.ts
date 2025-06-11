import { createRouter, createWebHistory } from "vue-router";

const routes = [
  {
    path: "/",
    component: () => import("@/views/index.vue"),
  },
  { path: "/test1", component: () => import("@/views/test1.vue") },
  { path: "/test", component: () => import("@/views/test.vue") },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
