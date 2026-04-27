async function fetch_url(url, payload = {}, headers = { "Content-Type": "application/json" }, method = "POST") {
	try {
		const response = await fetch(url, {
			method: method,
			headers: headers,
			body: JSON.stringify(payload)
		});

		if (!response.ok) {
			throw new Error(`API error: ${response.status} ${response.statusText}`);
		}

		const data = await response.json();
		return data;

	} catch (error) {
		console.error("Failed to fetch:", error);
		return null;
	}
}

function splitCamelCase(str) {
	return str.replace(/(?!^)([A-Z])/g, ' $1');
}

function getVideoData(url) {
	const ytRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
	const vimeoRegex = /vimeo\.com\/(\d+)/;
	const bilibiliRegex = /bilibili\.com\/video\/([a-zA-Z0-9]+)/;

	let match;

	if ((match = url.match(ytRegex))) return { type: "YouTube", id: match[1] };
	if ((match = url.match(vimeoRegex))) return { type: "Vimeo", id: match[1] };
	if ((match = url.match(bilibiliRegex))) return { type: "BiliBili", id: match[1] };

	return null;
}

function getVideoUrl(video, timestamp = 0) {
	if (!video) return null;

	switch (video.type) {
		case "YouTube":
			return `https://www.youtube.com/watch?v=${video.id}&t=${timestamp}`;
		case "Vimeo":
			return `https://vimeo.com/${video.id}#t=${timestamp}s`;
		case "BiliBili":
			return `https://www.bilibili.com/video/${video.id}?t=${timestamp}`;
		default:
			return null;
	}
}

function getEmbedLink(video, timestamp = 0) {
	if (!video) return null;

	switch (video.type) {
		case "YouTube":
			return `https://www.youtube.com/embed/${video.id}?start=${timestamp}`;
		case "Vimeo":
			return `https://player.vimeo.com/video/${video.id}#t=${timestamp}s`;
		case "BiliBili":
			return `https://player.bilibili.com/player.html?bvid=${video.id}&page=1&t=${timestamp}`;
		default:
			return null;
	}
}

async function getThumbnailLink(video) {
	if (!video) return null;

	switch (video.type) {
		case "YouTube":
			const base = `https://img.youtube.com/vi/${video.id}`;
			const maxRes = `${base}/maxresdefault.jpg`;

			try {
				const res = await fetch(maxRes, { method: "HEAD" });
				if (res.ok) return maxRes;
			} catch (_) { }
			return `${base}/hqdefault.jpg`;

		case "Vimeo":
			const vData = await fetch_url(
				`https://vimeo.com/api/v2/video/${video.id}.json`,
				{},
				{},
				"GET"
			);
			return vData?.[0]?.thumbnail_large ?? null;

		case "BiliBili":
			const bData = await fetch_url(
				`https://api.bilibili.com/x/web-interface/view?bvid=${video.id}`,
				{},
				{},
				"GET"
			);
			return bData?.data?.pic ?? null;

		default:
			return null;
	}
}

function loadVideoIFrame(iframe, video, timestamp = 0) {
	const embed = getEmbedLink(video, timestamp);
	if (embed && iframe) {
		iframe.src = embed;
		iframe.setAttribute("frameBorder", "0");
		iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share");
		iframe.setAttribute("allowFullscreen", true);
	}
}

function getDateStringFromDate(date) {
	const months = [
		"January", "February", "March", "April", "May", "June",
		"July", "August", "September", "October", "November", "December"
	];

	const day = String(date.getDate());
	const dayLastChar = day.charAt(day.length - 1);
	const daySuffix = dayLastChar == 1 ? "st" : (dayLastChar == 2 ? "nd" : (dayLastChar == 3 ? "rd" : "th"));

	return `${day}${daySuffix} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function getCommaNumber(number) {
	return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatDuration(seconds) {
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;

	if (minutes > 0) {
		return `${minutes}m ${remainingSeconds}s`;
	}

	return `${remainingSeconds}s`;
}