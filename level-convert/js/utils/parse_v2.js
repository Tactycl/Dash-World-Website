import { loadJSON } from "./utils.js";
import Color3 from "../classes/Color3.js";
import Vector3 from "../classes/Vector3.js";
import Vector2 from "../classes/Vector2.js";

const properties = await loadJSON("/level-convert/json/dw2Properties.json");
const objectMapping = await loadJSON("/level-convert/json/objectMapping.json");
const objectMetadata = await loadJSON("/level-convert/json/objectMetadata.json");
const objectOffsets = await loadJSON("/level-convert/json/objectOffsets.json");
const nonImportableObjects = await loadJSON("/level-convert/json/nonImportableObjects.json");

export function jsonToDW2v2(d) {
    return JSON.stringify(d);
}