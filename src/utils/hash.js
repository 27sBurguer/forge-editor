function hashString(value) {
	let hash = 5381;
	const text = String(value || "");

	for (let index = 0; index < text.length; index += 1) {
		hash = ((hash * 33) + text.charCodeAt(index)) >>> 0;
	}

	return hash.toString(16).toUpperCase().padStart(8, "0");
}

module.exports = { hashString };
