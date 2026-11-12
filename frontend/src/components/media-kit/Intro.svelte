<script lang="ts">
	import type { Platform, TwitchData } from "../../lib/types";
	import Platforms from "./Platforms.svelte";

	let {
		name = "RythonDev",
		tagline = "",
		platforms = [],
		twitch = null,
	}: {
		name?: string;
		tagline?: string;
		platforms?: Platform[];
		twitch?: TwitchData | null;
	} = $props();
</script>

<div class="min-w-0 text-center sm:text-left">
	<h1
		class="text-5xl font-bold tracking-tight wrap-break-word text-neutral-900 sm:text-6xl lg:text-7xl dark:text-white"
	>
		{name}
	</h1>
	{#if tagline}
		<p class="mt-4 text-lg text-zinc-600 sm:text-xl dark:text-zinc-300">
			{tagline}
		</p>
	{/if}
	<div class="mt-8">
		<Platforms {platforms} {twitch} />
	</div>
</div>
