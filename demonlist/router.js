class HashRouter {
	constructor(rootSelector) {
		this.routes = [];
		this.root = document.querySelector(rootSelector);

		window.addEventListener("hashchange", () => this.resolve());
		window.addEventListener("load", () => this.resolve());
	}

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

				await this.loadTemplate(route.template, params, route.onLoad);
				return;
			}
		}

		this.root.innerHTML = `<h2 id="errorRouterNotification">404 - Not Found</h2>`;
	}

	async loadTemplate(templatePath, params, onLoad) {
		try {
			const res = await fetch(templatePath);
			if (res.status >= 300) {
				throw Error(`Fetch status is not success (${res.status})`);
			}

			const html = await res.text();
			this.root.innerHTML = html;
			onLoad(params);

		} catch(err) {
			console.error("Failed to load fragment:", err);
			this.root.innerHTML = `<h2 id="errorRouterNotification">Error loading page</h2>`;
		}
	}
}