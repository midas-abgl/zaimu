import cors from "@elysiajs/cors";
import Elysia from "elysia";
import { GlobalPlugin } from "./global";
import { OpenAPI } from "./openapi";

export const app = new Elysia().use([cors(), GlobalPlugin, OpenAPI]).get("/health", () => ({ status: "ok" }));
