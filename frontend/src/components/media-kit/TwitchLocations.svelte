<script lang="ts">
	import type { TwitchLocation } from "../../lib/types";
	import { platformImageMap } from "../../lib/platforms";

	let { locations = [] }: { locations?: TwitchLocation[] } = $props();

	let sorted = $derived(
		[...locations]
			.filter((location) => location.percent > 0)
			.sort((a, b) => b.percent - a.percent),
	);
	function formatPercent(value: number): string {
		return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
	}
</script>

{#if sorted.length}
	<section class="w-full">
		<div
			class="mb-3 text-right text-3xl font-bold text-neutral-900 sm:text-3xl dark:text-white"
		>
			Twitch Views by Location
		</div>
		<ul
			class="space-y-3 rounded-2xl border border-zinc-200 bg-neutral-50 p-5 dark:border-zinc-800 dark:bg-neutral-900"
		>
			{#each sorted as location (location.id)}
				<li
					class="grid grid-cols-[minmax(0,8rem)_1fr_3.5rem] items-center gap-3 text-sm"
				>
					<span class="truncate" title={location.country}>
						{location.country}
					</span>
					<div class="h-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
						<div
							class="h-full rounded-full"
							style:width={`${Math.min(location.percent, 100)}%`}
							style:background-color={platformImageMap.twitch
								.color}
						></div>
					</div>
					<span class="text-right font-semibold tabular-nums">
						{formatPercent(location.percent)}
					</span>
				</li>
			{/each}
		</ul>
	</section>
{/if}
