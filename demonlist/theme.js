const copyrightYearSpan = document.getElementById("copyrightYear");
copyrightYearSpan.innerText = new Date().getFullYear();

var currentTheme = "dark";

const themeButton = document.getElementById("themeButton");
const themeIcon = document.getElementById("themeIcon");
const themeLabel = document.getElementById("themeLabel");

const DW_THEME_KEY = "dw_theme";
const THEME_ICONS = {
	"dark": "/img/dark.svg",
	"light": "/img/light.svg",
	"system": "/img/system.svg",
};

function normalizeString(str) {
	if (!str) return str;
	return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function reloadTheme() {
	const theme = localStorage.getItem(DW_THEME_KEY) || "system";
	const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
	const finalTheme = theme === "system" ? (prefersDark ? "dark" : "light") : theme;
	document.documentElement.setAttribute("data-theme", finalTheme);
	themeLabel.innerText = normalizeString(theme);
	themeIcon.src = THEME_ICONS[theme];
	currentTheme = theme;
}
reloadTheme();

function setTheme(theme) {
	currentTheme = theme;
	localStorage.setItem(DW_THEME_KEY, theme);
	reloadTheme();
}

themeButton.addEventListener("click", () => {
	switch (currentTheme) {
		case "dark":
			setTheme("light");
			break;

		case "light":
			setTheme("system");
			break;

		case "system":
			setTheme("dark");
			break;
	}
});