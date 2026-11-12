<script lang="ts">
	import { onMount } from "svelte";
	import { fetchMediaKit } from "../lib/api";
	import { theme } from "../lib/theme.svelte";
	import type { MediaKit } from "../lib/types";
	import Collabs from "../components/Collabs.svelte";
	import ThemeToggle from "../components/ThemeToggle.svelte";
	import About from "../components/media-kit/About.svelte";
	import Contact from "../components/media-kit/Contact.svelte";
	import Intro from "../components/media-kit/Intro.svelte";
	import Panel from "../components/media-kit/Panel.svelte";
	import ProfileImage from "../components/media-kit/ProfileImage.svelte";
	import Services from "../components/media-kit/Services.svelte";
	import Stream from "../components/media-kit/Stream.svelte";
	import TwitchLocations from "../components/media-kit/TwitchLocations.svelte";

	const knownContentKeys = new Set([
		"brand_name",
		"tagline",
		"email",
		"profile_image_url",
		"profile_image_light_url",
		"about",
		"services",
		"stream_schedule",
	]);

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
	let brandName = $derived(content.brand_name || "RythonDev");
	let profileImage = $derived(
		(theme.current === "light"
			? content.profile_image_light_url || content.profile_image_url
			: content.profile_image_url || content.profile_image_light_url) ||
			twitch?.profile_image_url,
	);
	let extraContent = $derived(
		Object.entries(content)
			.filter(([key, value]) => !knownContentKeys.has(key) && value)
			.sort(([a], [b]) => a.localeCompare(b)),
	);

	function titleCase(key: string): string {
		return key
			.split("_")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
	}

	let startYear = "2026";
	let copyrightDate = $state(`${new Date().getFullYear()}`);

	(() => {
		if (copyrightDate != startYear) {
			copyrightDate = `${startYear}-${copyrightDate}`;
		}
	})();
</script>

<ThemeToggle class="fixed top-4 right-4 z-50" />

<div class="min-h-screen overflow-x-hidden">
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
		<main>
			<header
				class="mx-auto flex w-full max-w-5xl flex-col items-center gap-10 px-6 pt-16 sm:flex-row sm:gap-12 sm:pt-20"
			>
				{#if profileImage}
					<ProfileImage src={profileImage} alt={brandName} />
				{/if}
				<Intro
					name={brandName}
					tagline={content.tagline ?? ""}
					{platforms}
					{twitch}
				/>
			</header>

			<div
				class="mx-auto grid w-full max-w-5xl grid-cols-1 gap-8 px-4 pt-12 sm:px-6 lg:grid-cols-2"
			>
				<div class="flex min-w-0 flex-col gap-8">
					<About about={content.about ?? ""} />
					<TwitchLocations locations={twitchLocations} />
				</div>
				<div class="flex min-w-0 flex-col gap-8">
					<Stream schedule={content.stream_schedule ?? ""} {twitch} />
					<Contact email={content.email ?? ""} />
					{#if collabs.length}
						<Panel title="Collaborations">
							<div>
								<Collabs items={collabs} />
							</div>
						</Panel>
					{/if}
					{#each extraContent as [key, value] (key)}
						<Panel title={titleCase(key)}>
							<p class="wrap-break-word whitespace-pre-line">
								{value}
							</p>
						</Panel>
					{/each}
					<Services services={content.services ?? ""} />
				</div>
			</div>
		</main>
		<footer
			class="flex w-full flex-col items-center justify-center gap-2 py-16 text-sm text-zinc-500 dark:text-zinc-400"
		>
			<div class="text-center">
				Copyright © {copyrightDate} Ryan Lee. All Rights Reserved.
			</div>
			<div class="text-center">
				<a
					href="https://git.rython.dev/rythondev/media-kit"
					target="_blank"
					class="underline hover:text-cyan-600 dark:hover:text-cyan-300"
				>
					Source Code
				</a>
			</div>
		</footer>
	{/if}
</div>
