import { loadJSON } from "./utils.js";
import Color3 from "../classes/Color3.js";
import Vector3 from "../classes/Vector3.js";
import Vector2 from "../classes/Vector2.js";

const properties = await loadJSON("/level-convert/json/dw2Properties.json");
const objectMapping = await loadJSON("/level-convert/json/objectMapping.json");
const objectMetadata = await loadJSON("/level-convert/json/objectMetadata.json");
const objectOffsets = await loadJSON("/level-convert/json/objectOffsets.json");
const nonImportableObjects = await loadJSON("/level-convert/json/nonImportableObjects.json");

function findZOrder(zLayer, zOrder) {
    const range = properties.zOrders[zLayer] ?? null;
    if (!range) {
        return 0;
    }
    return (range[0] + range[1]) * 0.5 + zOrder
}

function patternEscape(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeString(s) {
    let newStr = String(s);
    for (const [target, replacement] of properties.escapeValues) {
        const pattern = new RegExp(patternEscape(target), "g");
        newStr = newStr.replace(pattern, replacement);
    }
    return newStr;
}

function getColorByChannel(data, channel) {
    if (!data.colors) return null;

    for (const color of data.colors) {
        if (color.channel === channel) {
            return Color3.fromRGB(color.r, color.g, color.b);
        }
    }

    return null;
}

function getNumericChannels(data) {
    const result = [];

    if (!data.colors) return result;
    for (const color of data.colors) {
        const ch = color.channel;
        const r = color.r, g = color.g, b = color.b;

        if (Number.isInteger(ch) && (r !== 255 || g !== 255 || b !== 255)) {
            result.push(Color3.fromRGB(r, g, b));
        }
    }

    return result;
}

function layOutDataOfValue(value) {
    let typeTag = "";
    let values = [];

    if (value instanceof Color3) {
        typeTag = "c3";
        values.push(value.toHex());

    } else if (value instanceof Vector3) {
        typeTag = "v3";
        values.push(value.x, value.y, value.z);

    } else if (typeof value === "boolean") {
        typeTag = "b";
        values.push(value ? "true" : "false");

    } else if (typeof value === "string") {
        typeTag = "s";
        values.push(escapeString(value));

    } else if (typeof value === "number") {
        values.push(value);

    } else if (Array.isArray(value)) {
        typeTag = "a";
        values = value.map(v => layOutDataOfValue(v));

    } else if (value && typeof value === "object") {
        typeTag = "d";
        const newValues = [];
        for (const [k, v] of Object.entries(value)) {
            const keyStr = escapeString(String(k));
            const valStr = layOutDataOfValue(v);
            newValues.push(`${keyStr};${valStr}`);
        }
        values = newValues;

    } else {
        throw new TypeError(`Unsupported value type: ${typeof value}`);
    }

    const prefix = typeTag ? typeTag + ":" : "";
    return prefix + values.join(",");
}

function layOutBlockObject(block) {
    const data = [];
    for (let i = 0; i < properties.blockSettings.length; i++) {
        const key = properties.blockSettings[i];
        data.push("b" + (i + 1));
        data.push(layOutDataOfValue(block[key]));
    }
    return data.join("~");
}

function rotatePoint(vec2, rDegrees, flipX = false, flipY = false) {
    const x = flipX ? -vec2.x : vec2.x;
    const y = flipY ? -vec2.y : vec2.y;

    const r = rDegrees * (Math.PI / 180);
    const cosR = Math.cos(r);
    const sinR = Math.sin(r);

    return new Vector2(
        x * cosR - y * sinR,
        x * sinR + y * cosR
    );
}

export function jsonToDW2v1(d) {
    const LEVEL_SETTINGS = {};
    const GAME_OBJECTS = [];

    let bgId = d.properties.background ?? 0;
    if (bgId === 0) bgId = 1;

    let gId = d.properties.ground ?? 0;
    if (gId === 0) gId = 1;

    let lId = d.properties.alternateLine ?? 0;
    if (lId === 0) lId = 1;

    LEVEL_SETTINGS.gameplaySpeed = (d.properties.speed ?? 1) + 1;
    LEVEL_SETTINGS.gamemode = (properties.gamemodeMapping.indexOf(d.properties.gamemode ?? "cube") ?? 0) + 1;
    LEVEL_SETTINGS.songId = 102731560381318;
    LEVEL_SETTINGS.songOffset = d.properties.songOffset ?? 0;
    LEVEL_SETTINGS.bgId = bgId;
    LEVEL_SETTINGS.gId = gId;
    LEVEL_SETTINGS.lId = lId;

    LEVEL_SETTINGS.bgColor = getColorByChannel(d.properties, "BG") ?? Color3.fromRGB(40, 125, 255);
    LEVEL_SETTINGS.gColor = getColorByChannel(d.properties, "G") ?? Color3.fromRGB(0, 102, 255);
    LEVEL_SETTINGS.g2Color = getColorByChannel(d.properties, "G2") ?? Color3.fromRGB(0, 102, 255);
    LEVEL_SETTINGS.lColor = getColorByChannel(d.properties, "Line") ?? Color3.fromRGB(255, 255, 255);
    LEVEL_SETTINGS.objColor = getColorByChannel(d.properties, "Obj") ?? Color3.fromRGB(255, 255, 255);
    LEVEL_SETTINGS["3dlColor"] = getColorByChannel(d.properties, "3DL") ?? Color3.fromRGB(255, 255, 255);

    LEVEL_SETTINGS.colorChannels = getNumericChannels(d.properties);
    LEVEL_SETTINGS.startMini = d.properties.startMini ?? false;
    LEVEL_SETTINGS.twoPlayer = d.properties.twoPlayer ?? false;
    LEVEL_SETTINGS.flipGravity = d.properties.flipGravity ?? false;
    LEVEL_SETTINGS.dualMode = d.properties.startDual ?? false;

    for (const object of d.objects) {
        const objId = object.id ?? 1;
        if (nonImportableObjects.includes(objId)) continue;

        const newId = objectMapping[objId] ?? null;
        if (!newId) continue;

        const meta = objectMetadata[newId.toString()] ?? null;
        if (!meta) continue;
        
        const offsetData = objectOffsets[newId.toString()] ?? [0, 0];

        const rotation = -(object.rotation ?? 0);
        const offset = rotatePoint(
            new Vector2(offsetData[0] ?? 0, offsetData[1] ?? 0),
            rotation,
            object.flipX ?? false,
            object.flipY ?? false
        );

        const baseCol = object.baseCol ?? meta.DefaultBaseColorId ?? 1000;
        const decorCol = object.decorCol ?? meta.DefaultDetailColorId ?? 1;

        const objectData = {
            toolbox_id: newId,
            position: new Vector3(
                (object.x ?? 15) / 30 - 0.5 + offset.x,
                (object.y ?? 15) / 30 - 0.5 + offset.y,
                0
            ),
            rotation: rotation,
            opacity: 1,
            scaleX: (object.scaleX ?? 1) * (object.scale ?? 1),
            scaleY: (object.scaleY ?? 1) * (object.scale ?? 1),
            flipX: object.flipX ? -1 : 1,
            flipY: object.flipY ? -1 : 1,
            triggerData: {},
            group_ids: object.triggerGroups ?? [],
            basecolor_id: properties.colorChannels[baseCol] ?? baseCol,
            detailcolor_id: properties.colorChannels[decorCol] ?? decorCol,
            editor_layer: object.layer ?? 0,
            zorder: findZOrder(meta.zLayer ?? "T1", meta.zOrder ?? 2)
        };

        if ([29, 30, 104, 105, 221, 743, 744, 899].includes(objId)) {
            let id = -3;
            if (objId === 30) {
                id = -4;

            } else if (objId === 104) {
                id = -6;

            } else if (objId === 105) {
                id = -7;

            } else if (objId === 221) {
                id = 1;
                
            } else if (objId === 744) {
                id = -8;

            } else if (objId === 743 || objId === 899) {
                const colorId = object.color ?? 1;
                id = properties.colorChannels[colorId] ?? colorId;
            }

            objectData.triggerData = {
                color: Color3.fromRGB(object.red ?? 255, object.green ?? 255, object.blue ?? 255),
                pcol1: object.pCol1 ?? false,
                pcol2: object.pCol2 ?? false,
                duration: object.duration ?? 0.5,
                id: id,
                opacity: object.opacity ?? 1.0,
                blending: object.blending ?? false,
                touch: object.touchTriggered ?? false,
                spawn: object.spawnTriggered ?? false,
                multi: object.multiTriggered ?? false,
            };

        } else if (objId === 1007) {
            objectData.triggerData = {
                group_id: object.targetGroupID ?? 0,
                duration: object.duration ?? 0.5,
                opacity: object.opacity ?? 1.0,
                touch: object.touchTriggered ?? false,
                spawn: object.spawnTriggered ?? false,
                multi: object.multiTriggered ?? false,
            };

        } else if (objId === 1761) {
            const colorId = object.color ?? 1;
            objectData.triggerData = {
                color: Color3.fromRGB(object.red ?? 255, object.green ?? 255, object.blue ?? 255),
                pcol1: object.pCol1 ?? false,
                pcol2: object.pCol2 ?? false,
                fadein: object.duration ?? 0,
                hold: object.hold ?? 0,
                fadeout: object.fadeout ?? 0,
                id: properties.colorChannels[colorId] ?? colorId,
                opacity: object.opacity ?? 1.0,
                blending: object.blending ?? false,
                touch: object.touchTriggered ?? false,
                spawn: object.spawnTriggered ?? false,
                multi: object.multiTriggered ?? false,
            };

        } else if (objId === 901) {
            objectData.triggerData = {
                moveX: (object.moveX / 3) ?? 0,
                moveY: (object.moveY / 3) ?? 0,
                lockX_player: object.followX ?? false,
                lockY_player: object.followY ?? false,
                lockX_camera: false,
                lockY_camera: false,
                duration: object.duration ?? 0,
                easing: (properties.easingMapping.indexOf(object.easing ?? "None") ?? 0) + 1,
                easing_rate: object.easingRate ?? 2,
                group_id: object.targetGroupID ?? 0,
            };
        }

        GAME_OBJECTS.push(objectData);
    }

    const data = [];
    for (let i = 0; i < properties.levelSettings.length; i++) {
        const key = properties.levelSettings[i];
        data.push("k" + (i + 1));
        data.push(layOutDataOfValue(LEVEL_SETTINGS[key]));
    }
    data.push("k" + (properties.levelSettings.length + 1));

    const blockData = GAME_OBJECTS.map(layOutBlockObject);
    data.push(blockData.join("+"));

    const rawStr = "v1//" + data.join("|");
    const compressed = pako.deflate(rawStr);
    const encoded = btoa(String.fromCharCode(...compressed));

    return encoded;
}