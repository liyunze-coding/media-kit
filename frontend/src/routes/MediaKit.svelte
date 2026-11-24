<script lang="ts">
	import { onMount } from "svelte";
	import { toPng } from "html-to-image";
	import { fetchMediaKit } from "../lib/api";
	import { theme } from "../lib/theme.svelte";
	import type { MediaKit } from "../lib/types";
	import Collabs from "../components/Collabs.svelte";
	import ThemeToggle from "../components/ThemeToggle.svelte";
	import About from "../components/media-kit/About.svelte";
	import Contact from "../components/media-kit/Contact.svelte";
	import Intro from "../components/media-kit/Intro.svelte";
	import MonthlyViews from "../components/media-kit/MonthlyViews.svelte";
	import Panel from "../components/media-kit/Panel.svelte";
	import ProfileImage from "../components/media-kit/ProfileImage.svelte";
	import Services from "../components/media-kit/Services.svelte";
	import Stream from "../components/media-kit/Stream.svelte";
	import TwitchLocations from "../components/media-kit/TwitchLocations.svelte";
	import GenderPie from "../components/media-kit/GenderPie.svelte";
	import AgeGenderBars from "../components/media-kit/AgeGenderBars.svelte";

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
	let monthlyViews = $derived(data?.monthly_views ?? []);
	let collabs = $derived(data?.collabs ?? []);
	let twitch = $derived(data?.twitch);
	let twitchLocations = $derived(data?.twitch_locations ?? []);
	let audienceGenders = $derived(data?.audience_genders ?? []);
	let audienceAgeGenders = $derived(data?.audience_age_genders ?? []);
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

	let mainEl = $state<HTMLElement | null>(null);
	let downloading = $state(false);

	async function downloadImage() {
		if (!mainEl || downloading) return;
		downloading = true;
		try {
			const dataUrl = await toPng(mainEl, {
				pixelRatio: 2,
				backgroundColor: getComputedStyle(document.body)
					.backgroundColor,
				cacheBust: true,
			});
			const link = document.createElement("a");
			link.download = `${brandName}-media-kit.png`;
			link.href = dataUrl;
			link.click();
		} catch (err) {
			console.error("Failed to generate image", err);
		} finally {
			downloading = false;
		}
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
		<main
			class="flex justify-center items-center"
			aria-busy="true"
			aria-label="Loading"
		>
			<div class="w-full max-w-5xl animate-pulse pb-5 lg:pb-12 lg:px-10">
				<header
					class="flex w-full flex-col items-center gap-10 px-6 pt-16 sm:flex-row sm:gap-12 sm:pt-20"
				>
					<div
						class="size-40 shrink-0 rounded-full bg-gray-200 dark:bg-zinc-800"
					></div>
					<div
						class="flex w-full flex-col items-center gap-4 sm:items-start"
					>
						<div
							class="h-10 w-64 rounded-lg bg-gray-200 dark:bg-zinc-800"
						></div>
						<div
							class="h-5 w-80 max-w-full rounded bg-gray-200 dark:bg-zinc-800"
						></div>
						<div class="flex gap-3">
							{#each Array(4) as _}
								<div
									class="size-8 rounded-full bg-gray-200 dark:bg-zinc-800"
								></div>
							{/each}
						</div>
					</div>
				</header>
				<div
					class="grid w-full grid-cols-1 gap-8 px-4 pt-12 sm:px-6 lg:grid-cols-2"
				>
					{#each [0, 1] as _}
						<div class="flex flex-col gap-8">
							{#each [0, 1] as _}
								<div
									class="h-48 rounded-[10px] bg-gray-200 dark:bg-zinc-800"
								></div>
							{/each}
						</div>
					{/each}
				</div>
			</div>
		</main>
	{:else}
		<main class="flex justify-center items-center">
			<div class="pb-5 lg:pb-12 lg:px-10" bind:this={mainEl}>
				<header
					class="mx-auto flex w-full max-w-5xl flex-col items-center lg:items-start gap-10 px-6 pt-16 lg:flex-row lg:gap-12 lg:pt-20"
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
					class="mx-auto grid w-full h-full max-w-5xl grid-cols-1 gap-8 px-4 pt-12 sm:px-6 lg:grid-cols-2"
				>
					<div
						class="flex min-w-0 flex-col justify-between items-start gap-8"
					>
						<About about={content.about ?? ""} />
						<MonthlyViews entries={monthlyViews} />
						<TwitchLocations locations={twitchLocations} />
						<GenderPie genders={audienceGenders} />
					</div>
					<div class="flex min-w-0 flex-col justify-between gap-8">
						<Contact email={content.email ?? ""} {downloading} />
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
						<Stream
							schedule={content.stream_schedule ?? ""}
							{twitch}
						/>

						<AgeGenderBars
							rows={audienceAgeGenders}
							genders={audienceGenders}
						/>
					</div>
				</div>
			</div>
		</main>
		<div class="justify-center hidden lg:flex">
			<button
				type="button"
				onclick={downloadImage}
				disabled={downloading}
				class="cursor-pointer rounded-[10px] bg-cyan-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-500 disabled:cursor-wait disabled:opacity-60"
			>
				{downloading ? "Generating…" : "Download as Image"}
			</button>
		</div>
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
