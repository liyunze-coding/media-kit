<script lang="ts">
	import { onMount } from "svelte";
	import { fetchMediaKit } from "../lib/api";
	import type { MediaKit } from "../lib/types";
	import Card from "../components/Card.svelte";
	import Collabs from "../components/Collabs.svelte";

	let data = $state<MediaKit | null>(null);
	let error = $state("");

	onMount(async () => {
		try {
			data = await fetchMediaKit();
		} catch (err) {
			error = err instanceof Error ? err.message : "Something went wrong";
		}
	});

	let content = $derived(data?.content ?? {});
	let platforms = $derived(data?.platforms ?? []);
	let collabs = $derived(data?.collabs ?? []);
	let services = $derived(
		(content.services ?? "")
			.split("\n")
			.map((service) => service.trim())
			.filter(Boolean)
			.slice(0, 6),
	);
	let twitch = $derived(data?.twitch);
	// let twitchLogin = $derived(twitch?.login ?? "");

	type platformDecoType = {
		image: string;
		color?: string | null;
	};

	let platformImageMap: Record<string, platformDecoType> = {
		twitch: {
			image: "/images/logos/twitch.svg",
			color: "#8E60F5",
		},
		youtube: {
			image: "/images/logos/youtube.svg",
			color: "#FF0000",
		},
		instagram: {
			image: "/images/logos/instagram.svg",
			color: "#E1306C",
		},
		tiktok: {
			image: "/images/logos/tiktok.svg",
			color: "#FFFFFF",
		},
	};
	function formatCount(value: number | undefined | null): string {
		if (value == null) return "—";
		if (value >= 1_000_000) {
			const millions = value / 1_000_000;
			return `${millions >= 100 ? Math.round(millions) : millions.toFixed(1).replace(/\.0$/, "")}M`;
		}
		if (value >= 1_000) {
			const thousands = value / 1_000;
			return `${thousands >= 100 ? Math.round(thousands) : thousands.toFixed(1).replace(/\.0$/, "")}K`;
		}
		return value.toLocaleString();
	}
</script>

{#if error}
	<main class="mx-auto w-full max-w-230 px-6 pt-12 pb-18">
		<div
			class="mt-6 rounded-[10px] bg-red-600/10 px-4 py-3 text-sm text-red-600 dark:text-red-400"
		>
			{error}
		</div>
	</main>
{:else if !data}
	<main class="mx-auto w-full max-w-230 px-6 pt-12 pb-18">
		<div class="py-8 text-gray-500 dark:text-gray-400">Loading…</div>
	</main>
{:else}
	<main
		class="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-4 pt-8 pb-10 sm:px-6 lg:grid-cols-2 lg:px-0 lg:pt-20"
	>
		{#if content.profile_image_url}
			<div class="flex justify-center lg:hidden">
				<img
					class="h-auto w-full max-w-75 rounded-xl object-cover shadow-lg shadow-cyan-300"
					src={content.profile_image_url}
					alt={content.brand_name ?? "Profile image"}
					width="300"
				/>
			</div>
		{/if}
		<div class="order-2 lg:order-1">
			<div class="lg:px-5">
				<div class="hidden items-start justify-end lg:flex">
					{#if content.profile_image_url}
						<img
							class="h-auto w-full max-w-75 shrink-0 rounded-xl object-cover shadow-lg shadow-cyan-300"
							src={content.profile_image_url}
							alt={content.brand_name ?? "Profile image"}
							width="300"
						/>
					{/if}
				</div>
				<div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
					<!-- Twitch -->
					<Card
						className="flex flex-col gap-1 rounded-2xl border p-5 transition-colors border-zinc-800 bg-neutral-900"
						href={`https://twitch.tv/${twitch?.login}`}
						target="_blank"
						rel="noreferrer"
						color={platformImageMap["twitch"].color}
					>
						<div
							class="flex flex-row justify-start items-start gap-3"
						>
							<img
								src={platformImageMap["twitch"].image}
								alt="Twitch"
								width="40"
							/>
							<div>
								<span
									class="text-sm font-semibold tracking-[0.08em] uppercase text-white"
								>
									Twitch
								</span>
								<br />
								<span class="text-base"
									>{twitch?.display_name}</span
								>
								<div
									class="mt-2 text-2xl font-semibold tracking-tight"
								>
									{formatCount(twitch?.followers)}
									<span class="text-sm">followers</span>
								</div>
							</div>
						</div>
					</Card>
					{#each platforms as platform (platform.name)}
						<Card
							className="flex flex-col gap-1 rounded-2xl border p-5 transition-colors border-zinc-800 bg-neutral-900"
							href={platform.url}
							target="_blank"
							rel="noreferrer"
							color={platformImageMap[platform.name]?.color}
						>
							<div
								class="flex flex-row justify-start items-start gap-3"
							>
								<img
									src={platformImageMap[platform.name].image}
									alt="Twitch"
									width="48"
								/>
								<div>
									<span
										class="text-sm font-semibold tracking-[0.08em] uppercase text-white"
									>
										{platform.name}
									</span>
									<br />
									<span class="text-base"
										>{platform.handle}</span
									>
									<div
										class="mt-2 text-2xl font-semibold tracking-tight"
									>
										{formatCount(platform.followers)}
										<span class="text-sm">
											{#if platform.name != "youtube"}
												followers
											{:else}
												subscribers
											{/if}
										</span>
									</div>
								</div>
							</div>
						</Card>
					{/each}
				</div>
			</div>
		</div>
		<!-- 2nd column -->
		<div
			class="order-1 flex min-w-0 flex-col items-start justify-start gap-5 lg:order-2"
		>
			<div
				class="w-full translate-y-2 rounded-lg border-2 border-cyan-300 sm:w-fit"
			>
				<div
					class="-translate-y-2 rounded-xl bg-cyan-300 px-5 py-5 text-3xl text-black sm:-translate-x-8 sm:text-4xl lg:-translate-x-20"
				>
					Hi there, I'm <br />
					<b>RythonDev</b>
				</div>
				{#if content.tagline}
					<p class="text-xl px-5 text-cyan-300 pb-2">
						{content.tagline}
					</p>
				{/if}
			</div>
			<div class="mt-5">
				<div class="mb-2 text-3xl font-bold text-white sm:text-4xl">
					About Me
				</div>
				<p class="wrap-break-word">
					{content.about ?? ""}
				</p>
			</div>
			{#if collabs.length}
				<div>
					<div class="mb-2 text-3xl font-bold text-white sm:text-4xl">
						Collaborations
					</div>
					<Collabs items={collabs} />
				</div>
			{/if}
			{#if services.length}
				<section class="w-full">
					<div class="mb-3 text-3xl font-bold text-white sm:text-4xl">
						Services
					</div>
					<div
						class="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-x-8"
					>
						<ul
							class="list-disc space-y-2 pl-5 marker:text-cyan-300"
						>
							{#each services.slice(0, 3) as service}
								<li>{service}</li>
							{/each}
						</ul>
						<ul
							class="list-disc space-y-2 pl-5 marker:text-cyan-300"
						>
							{#each services.slice(3, 6) as service}
								<li>{service}</li>
							{/each}
						</ul>
					</div>
				</section>
			{/if}
		</div>
	</main>
{/if}

<style>
</style>
