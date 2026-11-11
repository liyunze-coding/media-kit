<script lang="ts">
	import Card from "../Card.svelte";
	import { formatCount } from "../../lib/format";
	import { metricLabel, platformImageMap } from "../../lib/platforms";

	let {
		name,
		handle,
		href,
		followers,
		avgReach = null,
	}: {
		name: string;
		handle: string;
		href: string;
		followers?: number | null;
		avgReach?: number | null;
	} = $props();

	let deco = $derived(platformImageMap[name.toLowerCase()]);
</script>

{#if deco}
	<Card
		className="flex flex-col gap-1 rounded-2xl border p-5 transition-colors border-zinc-800 bg-neutral-900"
		{href}
		target="_blank"
		rel="noreferrer"
		color={deco.color}
	>
		<div class="flex flex-row items-center gap-3">
			<img src={deco.image} alt={name} width="40" />
			<div>
				<span
					class="text-sm font-semibold tracking-[0.08em] text-white uppercase"
				>
					{name}
				</span>
				<br />
				<span class="text-base">{handle}</span>
			</div>
		</div>
		<div class="mt-4 grid grid-cols-2 gap-3">
			<div>
				<div class="text-2xl font-semibold tracking-tight">
					{formatCount(followers)}
				</div>
				<div class="text-sm text-zinc-400">{metricLabel(name)}</div>
			</div>
			<div title="Average reach (previous 30 days)">
				<div class="text-2xl font-semibold tracking-tight">
					{formatCount(avgReach)}
				</div>
				<div class="text-sm leading-tight text-zinc-400">
					avg reach
					<span class="block text-xs whitespace-nowrap">prev. 30 days</span>
				</div>
			</div>
		</div>
	</Card>
{/if}
