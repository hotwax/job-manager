import * as Comlink from "comlink";
import { createPayloadParser } from "@/workers/payloadParser";

Comlink.expose(createPayloadParser());
