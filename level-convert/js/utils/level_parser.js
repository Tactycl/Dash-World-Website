import { gdToJson } from "./gd_to_json.js"
import { jsonToDW2v1 } from "./parse_v1.js"
import { jsonToDW2v2 } from "./parse_v2.js"

function downloadTextFile(filename, content) {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
}

export function parse_level(data, parserVer) {
    try {
        const json_data = gdToJson(data);
        if (!json_data) {
            throw new Error("Failed to generate json level data");
        }

        let level_data;
        if (parserVer === 2) {
            level_data = jsonToDW2v2(json_data);

        } else {
            level_data = jsonToDW2v1(json_data);
        }

        if (!level_data) {
            throw new Error("Failed to generate new level data");
        }

        downloadTextFile("parsed.txt", level_data);

    } catch (err) {
        console.error("Encountered an unexpected error:", err)
    }
}