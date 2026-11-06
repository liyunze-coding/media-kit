<script lang="ts">
	import type { Platform, TwitchData } from "../../lib/types";
	import PlatformCard from "./PlatformCard.svelte";

	let {
		platforms = [],
		twitch = null,
	}: {
		platforms?: Platform[];
		twitch?: TwitchData | null;
	} = $props();
</script>

	<div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
		<PlatformCard
			name="Twitch"
			handle={twitch?.display_name ?? ""}
			href={`https://twitch.tv/${twitch?.login ?? ""}`}
			followers={twitch?.followers}
		/>
	{#each platforms as platform (platform.name)}
		<PlatformCard
			name={platform.name}
			handle={platform.handle}
			href={platform.url}
			followers={platform.followers}
		/>
	{/each}
</div>
