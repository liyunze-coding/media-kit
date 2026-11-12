export function formatCount(value: number | undefined | null): string {
	if (value == null) return "—";
	if (value >= 1_000_000) {
		const millions = value / 1_000_000;
		return `${millions >= 100 ? Math.round(millions) : millions.toFixed(1).replace(/\.0$/, "")}M`;
	}
	if (value >= 1_000) {
		const thousands = value / 1_000;
		return `${thousands >= 100 ? Math.round(thousands) : thousands.toFixed(1).replace(/\.0$/, "")}K`;
	}
	return value.toLocaleString();
}

export function formatTimeAgo(iso: string | null | undefined): string {
	if (!iso) return "";
	const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
	if (Number.isNaN(seconds)) return "";
	const units: [number, string][] = [
		[60 * 60 * 24 * 365, "year"],
		[60 * 60 * 24 * 30, "month"],
		[60 * 60 * 24 * 7, "week"],
		[60 * 60 * 24, "day"],
		[60 * 60, "hour"],
		[60, "minute"],
	];
	for (const [size, unit] of units) {
		const count = Math.floor(seconds / size);
		if (count >= 1) return `${count} ${unit}${count === 1 ? "" : "s"} ago`;
	}
	return "just now";
}

/** Formats a Twitch duration such as "3h21m5s" as "3h 21m". */
export function formatTwitchDuration(value: string | null | undefined): string {
	if (!value) return "";
	const hours = Number(value.match(/(\d+)h/)?.[1] ?? 0);
	const minutes = Number(value.match(/(\d+)m/)?.[1] ?? 0);
	if (hours && minutes) return `${hours}h ${minutes}m`;
	if (hours) return `${hours}h`;
	return `${minutes}m`;
}
