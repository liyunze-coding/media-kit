<script lang="ts">
	import { colorFor, formatPercent, genderColors } from "../../lib/chart";
	import type { AudienceAgeGender, AudienceGender } from "../../lib/types";
	import Panel from "./Panel.svelte";

	let {
		rows = [],
		genders = [],
	}: { rows?: AudienceAgeGender[]; genders?: AudienceGender[] } = $props();

	let chart = $derived.by(() => {
		const colors = genderColors(genders);
		const groups = new Map<string, { gender: string; percent: number }[]>();
		for (const row of rows) {
			if (row.percent <= 0) continue;
			colorFor(colors, row.gender);
			const segments = groups.get(row.age_range) ?? [];
			segments.push({ gender: row.gender, percent: row.percent });
			groups.set(row.age_range, segments);
		}
		const bars = [...groups].map(([ageRange, segments]) => ({
			ageRange,
			segments,
			total: segments.reduce((sum, segment) => sum + segment.percent, 0),
		}));
		const used = new Set(
			bars.flatMap((bar) => bar.segments.map((s) => s.gender)),
		);
		const legend = [...colors].filter(([gender]) => used.has(gender));
		return { bars, colors, legend };
	});
	let visible = $state(false);

	function revealOnce(node: Element) {
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					visible = true;
					observer.disconnect();
				}
			},
			{ threshold: 0.2 },
		);
		observer.observe(node);
		return { destroy: () => observer.disconnect() };
	}
</script>

{#if chart.bars.length}
	<Panel title="Audience Age & Gender">
		<div use:revealOnce>
			<ul class="space-y-4">
				{#each chart.bars as bar (bar.ageRange)}
					<li class="text-sm">
						<div
							class="mb-1.5 flex items-baseline justify-between gap-3"
						>
							<span class="truncate">{bar.ageRange}</span>
							<span class="font-semibold tabular-nums">
								{formatPercent(bar.total)}
							</span>
						</div>
						<div
							class="h-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
						>
							<div
								class="flex h-full overflow-hidden rounded-full transition-[width] duration-1000 ease-out motion-reduce:transition-none"
								style:width={visible
									? `${Math.min(bar.total, 100)}%`
									: "0%"}
							>
								{#each bar.segments as segment}
									<div
										class="h-full"
										style:width="{(segment.percent /
											bar.total) *
											100}%"
										style:background-color={chart.colors.get(
											segment.gender,
										)}
										title="{segment.gender}: {formatPercent(
											segment.percent,
										)}"
									></div>
								{/each}
							</div>
						</div>
					</li>
				{/each}
			</ul>
			<div class="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs">
				{#each chart.legend as [gender, color] (gender)}
					<span class="flex items-center gap-2">
						<span
							class="size-2.5 rounded-full"
							style:background-color={color}
						></span>
						{gender}
					</span>
				{/each}
			</div>
		</div>
	</Panel>
{/if}
