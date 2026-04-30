export class HashRouter {
	constructor(rootSelector) {
		this.routes = [];
		this.root = document.querySelector(rootSelector);
		this.templateCache = new Map();
		this.currentTemplate = null;

		window.addEventListener("hashchange", () => this.resolve());
		window.addEventListener("load", () => this.resolve());
	}

	getRoot() { return this.root; }

	add(path, options) {
		const paramNames = [];
		const regexPath = path.replace(/:([^/]+)/g, (_, key) => {
			paramNames.push(key);
			return "([^/]+)";
		});

		const regex = new RegExp(`^${regexPath}$`);
		this.routes.push({
			regex,
			paramNames,
			template: options.template,
			onLoad: options.onLoad || (() => {})
		});
	}

	getHashParts() {
		const hash = location.hash.slice(1) || "/";

		const [path, queryString] = hash.split("?");
		const query = {};

		if (queryString) {
			const params = new URLSearchParams(queryString);
			for (const [key, value] of params.entries()) {
				query[key] = value;
			}
		}

		return { path, query };
	}

	async resolve() {
		const { path, query } = this.getHashParts();

		for (const route of this.routes) {
			const match = path.match(route.regex);
			if (match) {
				const params = {};

				route.paramNames.forEach((name, i) => {
					params[name] = match[i + 1];
				});

				// Merge route params + query params
				const allParams = { ...params, ...query };

				if (this.currentTemplate === route.template) {
					route.onLoad(false, allParams);
				} else {
					await this.loadTemplate(route.template, allParams, route.onLoad);
				}
				return;
			}
		}

		this.root.innerHTML = `<h2 id="errorRouterNotification">404 - Not Found</h2>`;
	}

	async loadTemplate(templatePath, params, onLoad) {
		try {
			if (this.currentTemplate) {
				const fragment = document.createDocumentFragment();
				while (this.root.firstChild) {
					fragment.appendChild(this.root.firstChild);
				}
				this.templateCache.set(this.currentTemplate, fragment);
			}

			if (this.templateCache.has(templatePath)) {
				this.root.innerHTML = "";
				this.root.appendChild(this.templateCache.get(templatePath));
				this.currentTemplate = templatePath;
				onLoad(false, params);
				return;
			}

			const res = await fetch(templatePath);
			if (res.status >= 300) {
				throw Error(`Fetch status is not success (${res.status})`);
			}
			
			const html = await res.text();
			this.root.innerHTML = html;
			this.currentTemplate = templatePath;
			onLoad(true, params);

		} catch(err) {
			console.error("Failed to load fragment:", err);
			this.root.innerHTML = `<h2 id="errorRouterNotification">Error loading page</h2>`;
		}
	}
}