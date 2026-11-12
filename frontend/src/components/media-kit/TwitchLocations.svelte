<script lang="ts">
	import type { TwitchLocation } from "../../lib/types";
	import Panel from "./Panel.svelte";

	let { locations = [] }: { locations?: TwitchLocation[] } = $props();

	let sorted = $derived(
		[...locations]
			.filter((location) => location.percent > 0)
			.sort((a, b) => b.percent - a.percent),
	);
	let visible = $state(false);

	function revealOnce(node: HTMLElement) {
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

	function formatPercent(value: number): string {
		return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
	}
</script>

{#if sorted.length}
	<Panel title="Twitch Views by Location">
		<ul class="space-y-4" use:revealOnce>
			{#each sorted as location (location.id)}
				<li class="text-sm">
					<div class="mb-1.5 flex items-baseline justify-between gap-3">
						<span class="truncate" title={location.country}>
							{location.country}
						</span>
						<span class="font-semibold tabular-nums">
							{formatPercent(location.percent)}
						</span>
					</div>
					<div
						class="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
					>
						<div
							class="h-full rounded-full bg-cyan-500 transition-[width] duration-1000 ease-out motion-reduce:transition-none dark:bg-cyan-400"
							style:width={visible ? `${Math.min(location.percent, 100)}%` : "0%"}
						></div>
					</div>
				</li>
			{/each}
		</ul>
	</Panel>
{/if}
