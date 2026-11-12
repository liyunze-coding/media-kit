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

<div
	class="flex flex-row items-start justify-center gap-x-4 gap-y-8 sm:gap-x-8"
>
	<PlatformCard
		name="Twitch"
		handle={twitch?.display_name || twitch?.login || ""}
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
