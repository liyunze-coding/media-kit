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
