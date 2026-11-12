<script lang="ts">
	import type { TwitchData } from "../../lib/types";
	import {
		formatCount,
		formatTimeAgo,
		formatTwitchDuration,
	} from "../../lib/format";
	import { platformImageMap } from "../../lib/platforms";

	let {
		email = "",
		schedule = "",
		twitch = null,
	}: {
		email?: string;
		schedule?: string;
		twitch?: TwitchData | null;
	} = $props();

	let copied = $state(false);
	let copyTimer: ReturnType<typeof setTimeout> | undefined;

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

	async function copyEmail() {
		try {
			await navigator.clipboard.writeText(email);
		} catch {
			return;
		}
		copied = true;
		clearTimeout(copyTimer);
		copyTimer = setTimeout(() => (copied = false), 2000);
	}
</script>

{#if email || live || lastStream || schedule}
	<section class="w-full">
		<div
			class="mb-3 text-3xl font-bold text-neutral-900 sm:text-3xl dark:text-white"
		>
			Work With Me
		</div>
		<div
			class="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-neutral-50 p-5 dark:border-zinc-800 dark:bg-neutral-900"
		>
			{#if email}
				<div class="flex flex-wrap items-center justify-between gap-3">
					<div class="min-w-0">
						<div class="text-sm text-zinc-500 dark:text-zinc-400">
							Business inquiries
						</div>
						<a
							class="block truncate text-lg font-semibold text-cyan-700 hover:underline dark:text-cyan-300"
							href={`mailto:${email}`}
						>
							{email}
						</a>
					</div>
					<div class="flex items-center gap-2">
						<button
							class="cursor-pointer rounded-lg border border-zinc-300 px-3 py-2 text-sm transition-colors hover:border-cyan-600 dark:border-zinc-700 dark:hover:border-cyan-300"
							onclick={copyEmail}
						>
							{copied ? "Copied!" : "Copy"}
						</button>
						<a
							class="rounded-lg bg-cyan-300 px-3 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-85"
							href={`mailto:${email}`}
						>
							Email me
						</a>
					</div>
				</div>
			{/if}

			{#if live}
				<a
					class="flex items-center gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800 first:border-t-0 first:pt-0"
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
							<div class="truncate text-sm text-zinc-500 dark:text-zinc-400">
								{twitch.game_name}
							</div>
						{/if}
					</div>
					{#if twitch?.viewer_count != null}
						<div class="shrink-0 text-right">
							<div class="font-semibold tabular-nums">
								{formatCount(twitch.viewer_count)}
							</div>
							<div class="text-xs text-zinc-500 dark:text-zinc-400">watching</div>
						</div>
					{/if}
				</a>
			{:else if lastStream}
				<a
					class="flex items-center gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800 first:border-t-0 first:pt-0"
					href={lastStream.url || twitchUrl}
					target="_blank"
					rel="noreferrer"
				>
					<span class="h-3 w-3 shrink-0 rounded-full bg-zinc-400 dark:bg-zinc-600"
					></span>
					<div class="min-w-0 flex-1">
						<div
							class="text-xs font-semibold tracking-[0.08em] text-zinc-500 dark:text-zinc-400 uppercase"
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
							<div class="truncate text-sm text-zinc-500 dark:text-zinc-400">
								{lastStreamMeta}
							</div>
						{/if}
					</div>
					{#if lastStream.view_count != null}
						<div class="shrink-0 text-right">
							<div class="font-semibold tabular-nums">
								{formatCount(lastStream.view_count)}
							</div>
							<div class="text-xs text-zinc-500 dark:text-zinc-400">views</div>
						</div>
					{/if}
				</a>
			{/if}

			{#if !live && schedule}
				<div
					class="flex items-start gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800 first:border-t-0 first:pt-0"
				>
					<img
						src={platformImageMap.twitch.image}
						alt="Twitch"
						width="24"
						class="mt-0.5 shrink-0"
					/>
					<div class="min-w-0">
						<div class="text-sm text-zinc-500 dark:text-zinc-400">Stream schedule</div>
						<div class="whitespace-pre-line">{schedule}</div>
					</div>
				</div>
			{/if}
		</div>
	</section>
{/if}
