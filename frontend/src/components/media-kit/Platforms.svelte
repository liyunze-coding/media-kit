<script lang="ts">
	import type { Platform, TwitchData } from "../../lib/types";
	import PlatformCard from "./PlatformCard.svelte";

	let {
		platforms = [],
		twitch = null,
		twitchAvgReach = null,
	}: {
		platforms?: Platform[];
		twitch?: TwitchData | null;
		twitchAvgReach?: number | null;
	} = $props();
</script>

	<div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
		<PlatformCard
			name="Twitch"
			handle={twitch?.display_name ?? ""}
			href={`https://twitch.tv/${twitch?.login ?? ""}`}
			followers={twitch?.followers}
			avgReach={twitchAvgReach}
		/>
	{#each platforms as platform (platform.name)}
		<PlatformCard
			name={platform.name}
			handle={platform.handle}
			href={platform.url}
			followers={platform.followers}
			avgReach={platform.avg_reach}
		/>
	{/each}
</div>
