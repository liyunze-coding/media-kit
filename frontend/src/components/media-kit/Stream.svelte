<script lang="ts">
	import type { TwitchData } from "../../lib/types";
	import {
		formatCount,
		formatTimeAgo,
		formatTwitchDuration,
	} from "../../lib/format";
	import { platformImageMap } from "../../lib/platforms";
	import Panel from "./Panel.svelte";

	let {
		schedule = "",
		twitch = null,
	}: {
		schedule?: string;
		twitch?: TwitchData | null;
	} = $props();

	let live = $derived(Boolean(twitch?.live));
	let twitchUrl = $derived(`https://twitch.tv/${twitch?.login ?? ""}`);
	let lastStream = $derived(twitch?.last_stream ?? null);
	let lastStreamAgo = $derived(formatTimeAgo(lastStream?.started_at));
	let lastStreamMeta = $derived(
		[lastStream?.game_name, formatTwitchDuration(lastStream?.duration)]
			.filter(Boolean)
			.join(" · "),
	);
	let liveFor = $derived(
		formatTimeAgo(twitch?.started_at).replace(" ago", ""),
	);
	let updatedAgo = $derived(
		twitch?.updated_at
			? formatTimeAgo(new Date(twitch.updated_at * 1000).toISOString())
			: "",
	);
	let statusMessage = $derived(
		twitch && twitch.found === false ? (twitch.message ?? "") : "",
	);
</script>

{#if live || lastStream || schedule || statusMessage}
	<Panel title="Stream">
		<div class="flex flex-col gap-4">
			{#if live}
				<a
					class="flex items-center gap-3"
					href={twitchUrl}
					target="_blank"
					rel="noreferrer"
				>
					<span class="relative flex h-3 w-3 shrink-0">
						<span
							class="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75"
						></span>
						<span
							class="relative inline-flex h-3 w-3 rounded-full bg-red-500"
						></span>
					</span>
					<div class="min-w-0 flex-1">
						<div
							class="text-xs font-semibold tracking-[0.08em] uppercase"
							style:color={platformImageMap.twitch.color}
						>
							Live now on Twitch{liveFor && liveFor !== "just now"
								? ` · ${liveFor}`
								: ""}
						</div>
						<div
							class="truncate font-semibold"
							title={twitch?.title ?? ""}
						>
							{twitch?.title || "Streaming now"}
						</div>
						{#if twitch?.game_name}
							<div
								class="truncate text-sm text-zinc-500 dark:text-zinc-400"
							>
								{twitch.game_name}
							</div>
						{/if}
					</div>
				</a>
			{:else if lastStream}
				<a
					class="flex items-center gap-3"
					href={lastStream.url || twitchUrl}
					target="_blank"
					rel="noreferrer"
				>
					<span
						class="h-3 w-3 shrink-0 rounded-full bg-zinc-400 dark:bg-zinc-600"
					></span>
					<div class="min-w-0 flex-1">
						<div
							class="text-xs font-semibold tracking-[0.08em] text-zinc-500 uppercase dark:text-zinc-400"
						>
							Last stream{lastStreamAgo
								? ` · ${lastStreamAgo}`
								: ""}
						</div>
						<div
							class="truncate font-semibold"
							title={lastStream.title ?? ""}
						>
							{lastStream.title || "Offline"}
						</div>
						{#if lastStreamMeta}
							<div
								class="truncate text-sm text-zinc-500 dark:text-zinc-400"
							>
								{lastStreamMeta}
							</div>
						{/if}
					</div>
				</a>
			{:else if statusMessage}
				<div class="text-sm text-zinc-500 dark:text-zinc-400">
					{statusMessage}
				</div>
			{/if}

			{#if !live && schedule}
				<div
					class="flex items-start gap-3 border-t border-zinc-200 pt-4 first:border-t-0 first:pt-0 dark:border-zinc-800"
				>
					<img
						src={platformImageMap.twitch.image}
						alt="Twitch"
						width="24"
						class="mt-0.5 shrink-0"
					/>
					<div class="min-w-0">
						<div class="text-sm text-zinc-500 dark:text-zinc-400">
							Stream schedule
						</div>
						<div class="whitespace-pre-line">{schedule}</div>
					</div>
				</div>
			{/if}
		</div>
	</Panel>
{/if}
