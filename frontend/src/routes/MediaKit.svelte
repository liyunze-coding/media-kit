<script lang="ts">
	import { onMount } from "svelte";
	import { fetchMediaKit } from "../lib/api";
	import type { MediaKit } from "../lib/types";
	import Collabs from "../components/Collabs.svelte";
	import About from "../components/media-kit/About.svelte";
	import Contact from "../components/media-kit/Contact.svelte";
	import Intro from "../components/media-kit/Intro.svelte";
	import Platforms from "../components/media-kit/Platforms.svelte";
	import ProfileImage from "../components/media-kit/ProfileImage.svelte";
	import Services from "../components/media-kit/Services.svelte";
	import TwitchLocations from "../components/media-kit/TwitchLocations.svelte";

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
	let twitch = $derived(data?.twitch);
	let twitchLocations = $derived(data?.twitch_locations ?? []);
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
				<ProfileImage
					src={content.profile_image_url}
					alt={content.brand_name ?? "Profile image"}
				/>
			</div>
		{/if}
		<div class="order-2 lg:order-1">
			<div class="lg:px-5">
				<div class="hidden items-start justify-end lg:flex">
					{#if content.profile_image_url}
						<ProfileImage
							src={content.profile_image_url}
							alt={content.brand_name ?? "Profile image"}
						/>
					{/if}
				</div>
				<Platforms
					{platforms}
					{twitch}
					twitchAvgReach={Number(content.twitch_avg_reach) || 0}
				/>
				<div class="mt-10">
					<TwitchLocations locations={twitchLocations} />
				</div>
			</div>
		</div>
		<div
			class="order-1 flex min-w-0 flex-col items-start justify-start gap-5 lg:order-2"
		>
			<Intro name="RythonDev" tagline={content.tagline ?? ""} />
			<About about={content.about ?? ""} />
			<Contact
				email={content.email ?? ""}
				schedule={content.stream_schedule ?? ""}
				{twitch}
			/>
			{#if collabs.length}
				<div>
					<div class="mb-2 text-3xl font-bold text-white sm:text-3xl">
						Collaborations
					</div>
					<Collabs items={collabs} />
				</div>
			{/if}
			<Services services={content.services ?? ""} />
		</div>
	</main>
{/if}
