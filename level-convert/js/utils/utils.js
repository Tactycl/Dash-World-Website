export async function loadJSON(url) {
  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) {
      throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
    }

    return await res.json();

  } catch (err) {
    console.error("loadJSON error:", err);
    throw err;
  }
}