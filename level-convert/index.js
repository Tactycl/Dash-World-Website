import { parse_level } from "./js/utils/level_parser.js"

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");

function handleFile(file) {
    if (file && file.type === "text/plain") {
        const reader = new FileReader();
        reader.onload = e => {
            parse_level(e.target.result);
        };
        reader.readAsText(file);
    }
}

["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
    dropZone.addEventListener(eventName, e => e.preventDefault());
    document.body.addEventListener(eventName, e => e.preventDefault());
});

["dragenter", "dragover"].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add("dragover"));
});

["dragleave", "drop"].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove("dragover"));
});

dropZone.addEventListener("drop", e => {
    const file = e.dataTransfer.files[0];
    handleFile(file);
});

dropZone.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", e => {
    const file = e.target.files[0];
    handleFile(file);
    fileInput.value = "";
});