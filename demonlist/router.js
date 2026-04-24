class HashRouter {
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

	getHashPath() {
		return location.hash.slice(1) || "/";
	}

	async resolve() {
		const path = this.getHashPath();
		for (const route of this.routes) {
			const match = path.match(route.regex);
			if (match) {
				const params = {};
				route.paramNames.forEach((name, i) => {
					params[name] = match[i + 1];
				});

				if (this.currentTemplate == route.template) {
					route.onLoad(false, params);

				} else {
					await this.loadTemplate(route.template, params, route.onLoad);
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