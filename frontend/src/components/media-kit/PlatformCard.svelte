<script lang="ts">
	import Card from "../Card.svelte";
	import { formatCount } from "../../lib/format";
	import { metricLabel, platformImageMap } from "../../lib/platforms";

	let {
		name,
		handle,
		href,
		followers,
	}: {
		name: string;
		handle: string;
		href: string;
		followers?: number | null;
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
		<div class="flex flex-row items-start justify-start gap-3">
			<img src={deco.image} alt={name} width="40" />
			<div>
				<span
					class="text-sm font-semibold tracking-[0.08em] text-white uppercase"
				>
					{name}
				</span>
				<br />
				<span class="text-base">{handle}</span>
				<div class="mt-2 text-2xl font-semibold tracking-tight">
					{formatCount(followers)}
					<span class="text-sm">{metricLabel(name)}</span>
				</div>
			</div>
		</div>
	</Card>
{/if}
