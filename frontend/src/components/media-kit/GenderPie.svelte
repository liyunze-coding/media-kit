<script lang="ts">
	import { formatPercent, genderColors } from "../../lib/chart";
	import type { AudienceGender } from "../../lib/types";
	import Panel from "./Panel.svelte";

	let { genders = [] }: { genders?: AudienceGender[] } = $props();

	const RADIUS = 40;
	const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

	let slices = $derived.by(() => {
		const visibleGenders = genders.filter((entry) => entry.percent > 0);
		const colors = genderColors(genders);
		const total = visibleGenders.reduce(
			(sum, entry) => sum + entry.percent,
			0,
		);
		const scale = total > 100 ? 100 / total : 1;
		let offset = 0;
		return visibleGenders.map((entry) => {
			const length = (entry.percent * scale * CIRCUMFERENCE) / 100;
			const slice = {
				...entry,
				color: colors.get(entry.gender)!,
				length,
				offset,
			};
			offset += length;
			return slice;
		});
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

{#if slices.length}
	<Panel title="Audience Gender">
		<div
			class="flex flex-col items-center gap-6 sm:flex-row"
			use:revealOnce
		>
			<svg
				viewBox="0 0 100 100"
				class="size-36 shrink-0 -rotate-90"
				role="img"
				aria-label="Audience gender breakdown"
			>
				<circle
					cx="50"
					cy="50"
					r={RADIUS}
					fill="none"
					stroke-width="18"
					class="stroke-zinc-200 dark:stroke-zinc-800"
				/>
				{#each slices as slice (slice.id)}
					<circle
						cx="50"
						cy="50"
						r={RADIUS}
						fill="none"
						stroke={slice.color}
						stroke-width="18"
						stroke-dasharray="{visible
							? slice.length
							: 0} {CIRCUMFERENCE}"
						stroke-dashoffset={-slice.offset}
						class="transition-[stroke-dasharray] duration-1000 ease-out motion-reduce:transition-none"
					/>
				{/each}
			</svg>
			<ul class="w-full space-y-2 text-sm">
				{#each slices as slice (slice.id)}
					<li class="flex items-center justify-start gap-3">
						<span class="flex min-w-0 items-center gap-2">
							<span
								class="size-3 shrink-0 rounded-full"
								style:background-color={slice.color}
							></span>
							<span class="truncate">{slice.gender}</span>
						</span>
						<span class="font-semibold tabular-nums">
							{formatPercent(slice.percent)}
						</span>
					</li>
				{/each}
			</ul>
		</div>
	</Panel>
{/if}
