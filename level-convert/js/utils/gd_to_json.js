import { loadJSON } from "./utils.js";

const objProps = await loadJSON("/level-convert/json/objectProperties.json");
const initProps = await loadJSON("/level-convert/json/initialProperties.json");
const colorProps = await loadJSON("/level-convert/json/colorProperties.json");

function base64UrlToBase64(base64Url) {
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    return base64;
}

function base64ToUint8Array(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

function uint8ArrayToString(data) {
    return new TextDecoder('utf-8').decode(data);
}

function decodeAndInflate(base64UrlData) {
    const cleanedBase64 = base64UrlToBase64(base64UrlData.replace(/\s+/g, ''));
    const compressedData = base64ToUint8Array(cleanedBase64);
    const decompressedData = pako.inflate(compressedData);
    return uint8ArrayToString(decompressedData);
}

function base64ToUtf8String(b64) {
	b64 = b64.replace(/-/g, "+").replace(/_/g, "/");
	while (b64.length % 4) b64 += "=";

	const binary = atob(b64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

	return new TextDecoder("utf-8").decode(bytes);
}

function convertKS38(kS38) {
	let splitKS38 = kS38.split("|").filter(x => x != "");
	let array = [];
	
	for (let value of splitKS38) {
		let valueSplit = value.split("_");
		let colorObj = {};

		for (let i = 0; i < valueSplit.length; i += 2) {
			let property = valueSplit[i];
			let theValue = valueSplit[i + 1];

			if (colorProps.values[valueSplit[i]]) {
				property = colorProps.values[valueSplit[i]][0];

				switch (colorProps.values[valueSplit[i]][1]) {
					case "list":
						theValue = colorProps[property + "s"][theValue];
						break;
					case "channel":
						theValue = colorProps.channels[theValue] ? colorProps.channels[theValue] : Number(theValue);
						break;
					case "number":
						theValue = Number(theValue);
						break;
					case "bool":
						theValue = theValue != "0";
						break;
					case "hsv":
						let hsv = theValue.split("a");
						hsv = {
							hue: Number(hsv[0]),
							saturation: Number(hsv[1]),
							brightness: Number(hsv[2]),
							saturationMode: Number(hsv[3]) == 1 ? "Additive" : "Multiplicative",
							brightnessMode: Number(hsv[4]) == 1 ? "Additive" : "Multiplicative"
						}
						theValue = hsv;
						break;
				}

				colorObj[property] = theValue;
			}
		}

		array.push(colorObj);
	}

	return array;
}

function parseObj(obj, splitter, nameArr) {
	let splitObj = obj.split(splitter);
	let parsedObj = {};

	for (let i = 0; i < splitObj.length; i += 2) {
		let property = splitObj[i];
		let value = splitObj[i + 1];

		if (nameArr.values[splitObj[i]]) {
			property = nameArr.values[splitObj[i]][0];
			
			switch (nameArr.values[splitObj[i]][1]) {
				case "list":
					value = nameArr[property + "s"][value];
					break;
				case "number":
					value = Number(value);
					break;
				case "channel":
					value = nameArr.channels[value] ? nameArr.channels[value] : Number(value);
					break;
				case "font":
					value = Number(value) + 1;
					break;
				case "bool":
					value = value != "0";
					break;
				case "string":
					value = base64ToUtf8String(value);
					break;
				case "array":
					value = value.split(".").map(x => Number(x));
					break;
				case "hsv":
					let hsv = value.split("a");
					hsv = {
						hue: Number(hsv[0]),
						saturation: Number(hsv[1]),
						brightness: Number(hsv[2]),
						saturationMode: Number(hsv[3]) == 1 ? "Additive" : "Multiplicative",
						brightnessMode: Number(hsv[4]) == 1 ? "Additive" : "Multiplicative"
					}
					value = hsv;
					break;
				case "extra-legacy-color":
					let colorInfo = property.split("-");

					if (colorInfo[2] == "blend")
						value = value != "0";
					else if (colorInfo[2] == "pcol")
						value = colorProps.pColors[value];
					else
						value = Number(value);
					break;
				case "legacy-color":
					let colorObj = value.split("_");
					let newColorObj = {};

					for (let j = 0; j < colorObj.length; j += 2) {
						let theProperty = colorObj[j];
						let theValue = colorObj[j + 1];

						if (colorProps.values[colorObj[j]]) {
							theProperty = colorProps.values[colorObj[j]][0];

							switch (colorProps.values[colorObj[j]][1]) {
								case "list":
									theValue = colorProps[theProperty + "s"][theValue];
									break;
								case "channel":
									theValue = colorProps.channels[theValue] ? colorProps.channels[theValue] : Number(theValue);
									break;
								case "number":
									theValue = Number(theValue);
									break;
								case "bool":
									theValue = theValue != "0";
									break;
								case "hsv":
									let hsv = theValue.split("a");
									hsv = {
										hue: Number(hsv[0]),
										saturation: Number(hsv[1]),
										brightness: Number(hsv[2]),
										saturationMode: Number(hsv[3]) == 1 ? "Additive" : "Multiplicative",
										brightnessMode: Number(hsv[4]) == 1 ? "Additive" : "Multiplicative"
									}
									theValue = hsv;
									break;
							}

							newColorObj[theProperty] = theValue;
						}
					}

					value = newColorObj;
					break;
				case "colors":
					value = convertKS38(value);
					break;
			}

			parsedObj[property] = value;
		}
	}

	return parsedObj;
}

function convertLegacy(obj) {
	let newObj = {
		colors: [],
		...obj
	}

	if (obj.colors) return obj;

	for (let prop of Object.keys(obj)) {
		if (prop.includes("legacy")) {
			let colorInfo = prop.split("-");
			let theObj = {};

			if (colorInfo[2]) {
				if (!newObj.colors.find(x => x.channel == colorInfo[1])) {
					theObj = {
						channel: isNaN(colorInfo[1]) ? colorInfo[1] : Number(colorInfo[1]),
						opacity: 1
					}
				} else
					theObj = newObj.colors.find(x => x.channel == colorInfo[1]);

				if (colorInfo[2] == "blend")
					theObj.blending = obj[prop];
				else if (colorInfo[2] == "pcol")
					theObj.pColor = obj[prop];
				else
					theObj[colorInfo[2]] = obj[prop];
			
				if (!newObj.colors.find(x => x.channel == colorInfo[1]))
					newObj.colors.push(theObj);
				else
					newObj.colors.splice(newObj.colors.findIndex(x => x.channel == colorInfo[1]), 1, theObj);
			} else {
				theObj = {
					...obj[prop],
					channel: isNaN(colorInfo[1]) ? colorInfo[1] : Number(colorInfo[1]),
					opacity: 1
				}

				newObj.colors.push(theObj);
			}

			delete newObj[prop];
		}
	}

	return newObj;
}

export function gdToJson(data) {
    if (!data.startsWith("kS")) data = decodeAndInflate(data).toString();

    let properties = convertLegacy(parseObj(data.split(";")[0], ",", initProps));
    let array = data.split(";").slice(1).filter(x => x != "");
    
    let objects = [];
    for (let object of array)
        objects.push(parseObj(object, ",", objProps));

    properties.count = objects.length;
    return {
        properties,
        objects
    }
}