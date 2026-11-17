<script lang="ts">
	import { onMount } from "svelte";
	import { fly } from "svelte/transition";
	import {
		clearStoredToken,
		fetchAdminState,
		getStoredToken,
		updateCollabs,
		updateContent,
		updatePlatforms,
		updateAudienceAgeGenders,
		updateAudienceGenders,
		updateTwitchLocations,
		uploadImage,
		verifyAdmin,
	} from "../lib/api";
	import { genderColors } from "../lib/chart";
	import type {
		AudienceAgeGender,
		AudienceGender,
		Collab,
		Platform,
		TwitchLocation,
	} from "../lib/types";
	import ThemeToggle from "../components/ThemeToggle.svelte";

	let authed = $state(false);
	let loading = $state(true);
	let message = $state("");
	let error = $state("");
	let username = $state("");
	let password = $state("");

	let content = $state<Record<string, string>>({});
	let platforms = $state<Platform[]>([]);
	let collabs = $state<Collab[]>([]);
	let nextCollabId = -1;
	let twitchLocations = $state<TwitchLocation[]>([]);
	let nextLocationId = -1;
	let uploadingKey = $state<string | null>(null);
	let locationTotal = $derived(
		twitchLocations.reduce(
			(sum, location) => sum + (Number(location.percent) || 0),
			0,
		),
	);
	let audienceGenders = $state<AudienceGender[]>([]);
	let nextGenderId = -1;
	let audienceAgeGenders = $state<AudienceAgeGender[]>([]);
	let nextAgeGenderId = -1;
	let genderTotal = $derived(
		audienceGenders.reduce(
			(sum, entry) => sum + (Number(entry.percent) || 0),
			0,
		),
	);
	let ageGenderTotal = $derived(
		audienceAgeGenders.reduce(
			(sum, entry) => sum + (Number(entry.percent) || 0),
			0,
		),
	);
	let defaultGenderColors = $derived(genderColors(audienceGenders));
	let genderOptions = $derived(
		audienceGenders.map((entry) => entry.gender.trim()).filter(Boolean),
	);

	onMount(async () => {
		if (getStoredToken()) {
			await loadState();
		} else {
			loading = false;
		}
	});

	const labelClass =
		"flex flex-col gap-2 text-sm text-gray-500 dark:text-gray-400";
	const controlClass =
		"w-full rounded-[10px] border border-gray-200 bg-white px-3 py-2.5 text-neutral-900 outline-none focus:border-cyan-600 dark:border-zinc-800 dark:bg-neutral-950 dark:text-neutral-50 dark:focus:border-cyan-400";
	const cardClass =
		"rounded-2xl border border-gray-200 bg-neutral-50 p-5 dark:border-zinc-800 dark:bg-neutral-900";
	const primaryClass =
		"cursor-pointer rounded-[10px] border border-transparent bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-85 dark:bg-neutral-50 dark:text-neutral-950";
	const secondaryClass =
		"cursor-pointer rounded-[10px] border border-gray-200 bg-transparent px-4 py-2.5 text-sm font-medium text-neutral-900 transition-opacity hover:opacity-85 dark:border-zinc-800 dark:text-neutral-50";
	const dangerClass =
		"cursor-pointer rounded-[10px] border border-gray-200 bg-transparent px-3 py-2.5 text-sm text-red-600 dark:border-zinc-800 dark:text-red-400";
	const platformRowClass =
		"grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[7.5rem_minmax(0,1fr)_minmax(0,1.3fr)_7.5rem] lg:items-center lg:gap-3";

	const contentLabels: Record<string, string> = {
		brand_name: "Brand name",
		tagline: "Tagline",
		email: "Email",
		profile_image_url: "PFP dark mode",
		profile_image_light_url: "PFP light mode",
		about: "About",
		services: "Services",
		stream_schedule: "Stream schedule",
	};
	const primaryContentKeys = ["brand_name", "tagline", "email"] as const;
	const longContentKeys = ["about", "services", "stream_schedule"] as const;
	const profileImageKeys = [
		"profile_image_url",
		"profile_image_light_url",
	] as const;
	const reservedContentKeys = new Set<string>([
		...profileImageKeys,
		...primaryContentKeys,
		...longContentKeys,
	]);
	let draggedPlatform = $state<number | null>(null);

	function movePlatform(from: number, to: number) {
		if (from === to) return;
		const next = [...platforms];
		const [moved] = next.splice(from, 1);
		next.splice(to, 0, moved);
		platforms = next;
	}
	let extraContentKeys = $derived(
		Object.keys(content)
			.filter((key) => !reservedContentKeys.has(key))
			.sort(),
	);

	function titleCase(key: string): string {
		return (
			contentLabels[key] ??
			key
				.split("_")
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(" ")
		);
	}

	async function loadState() {
		loading = true;
		error = "";
		try {
			const state = await fetchAdminState();
			content = state.content;
			platforms = state.platforms;
			collabs = state.collabs ?? [];
			twitchLocations = state.twitch_locations ?? [];
			audienceGenders = state.audience_genders ?? [];
			audienceAgeGenders = state.audience_age_genders ?? [];
			saved = serialize();
			authed = true;
		} catch (err) {
			authed = false;
			error =
				err instanceof Error
					? err.message
					: "Unable to load admin state";
		} finally {
			loading = false;
		}
	}

	async function handleLogin(event: SubmitEvent) {
		event.preventDefault();
		error = "";
		message = "";

		if (await verifyAdmin(username, password)) {
			password = "";
			await loadState();
		} else {
			error = "Invalid credentials";
		}
	}

	function handleLogout() {
		clearStoredToken();
		authed = false;
		content = {};
		platforms = [];
		collabs = [];
		twitchLocations = [];
		audienceGenders = [];
		audienceAgeGenders = [];
		saved = serialize();
		message = "";
		error = "";
	}

	function serialize() {
		return {
			content: JSON.stringify(content),
			platforms: JSON.stringify(platforms),
			collabs: JSON.stringify(collabs),
			twitchLocations: JSON.stringify(twitchLocations),
			audienceGenders: JSON.stringify(audienceGenders),
			audienceAgeGenders: JSON.stringify(audienceAgeGenders),
		};
	}
	type Section = keyof ReturnType<typeof serialize>;

	let saved = $state(serialize());
	let current = $derived(serialize());
	let dirtySections = $derived(
		(Object.keys(current) as Section[]).filter(
			(section) => current[section] !== saved[section],
		),
	);
	let saving = $state(false);

	function markSaved(section: Section) {
		saved[section] = serialize()[section];
	}

	function resetChanges() {
		content = JSON.parse(saved.content);
		platforms = JSON.parse(saved.platforms);
		collabs = JSON.parse(saved.collabs);
		twitchLocations = JSON.parse(saved.twitchLocations);
		audienceGenders = JSON.parse(saved.audienceGenders);
		audienceAgeGenders = JSON.parse(saved.audienceAgeGenders);
	}

	const savers: Record<Section, () => Promise<void>> = {
		content: async () => {
			const payload = Object.fromEntries(
				Object.entries(content).map(([key, value]) => [
					key,
					String(value ?? ""),
				]),
			);
			content = await updateContent(payload);
		},
		platforms: async () => {
			platforms = await updatePlatforms(
				platforms.map((platform) => ({
					...platform,
					followers: Number(platform.followers) || 0,
				})),
			);
		},
		collabs: async () => {
			collabs = await updateCollabs(collabs);
		},
		twitchLocations: async () => {
			twitchLocations = await updateTwitchLocations(twitchLocations);
		},
		audienceGenders: async () => {
			audienceGenders = await updateAudienceGenders(audienceGenders);
		},
		audienceAgeGenders: async () => {
			audienceAgeGenders =
				await updateAudienceAgeGenders(audienceAgeGenders);
		},
	};

	async function saveChanges() {
		if (saving) return;
		error = "";
		message = "";
		saving = true;
		try {
			for (const section of dirtySections) {
				await savers[section]();
				markSaved(section);
			}
			message = "Changes saved";
		} catch (err) {
			error =
				err instanceof Error ? err.message : "Unable to save changes";
		} finally {
			saving = false;
		}
	}

	async function saveProfileImage(key: string, url: string) {
		const result = await updateContent({ [key]: url });
		content[key] = result[key] ?? "";
		const savedContent = JSON.parse(saved.content);
		savedContent[key] = content[key];
		saved.content = JSON.stringify(savedContent);
	}

	async function handleProfileImageUpload(key: string, event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = "";
		if (!file) return;

		error = "";
		message = "";
		uploadingKey = key;
		try {
			await saveProfileImage(key, await uploadImage(file));
			message = "Profile picture updated";
		} catch (err) {
			error =
				err instanceof Error ? err.message : "Unable to upload image";
		} finally {
			uploadingKey = null;
		}
	}

	async function handleProfileImageRemove(key: string) {
		error = "";
		message = "";
		try {
			await saveProfileImage(key, "");
			message = "Profile picture removed";
		} catch (err) {
			error =
				err instanceof Error ? err.message : "Unable to remove image";
		}
	}

	function addCollab() {
		collabs = [
			...collabs,
			{ id: nextCollabId--, name: "", image: "", url: "" },
		];
	}

	function removeCollab(index: number) {
		collabs = collabs.filter((_, i) => i !== index);
	}

	function moveCollab(index: number, direction: -1 | 1) {
		const target = index + direction;
		if (target < 0 || target >= collabs.length) return;
		const next = [...collabs];
		[next[index], next[target]] = [next[target], next[index]];
		collabs = next;
	}

	function addLocation() {
		twitchLocations = [
			...twitchLocations,
			{ id: nextLocationId--, country: "", percent: 0 },
		];
	}

	function removeLocation(index: number) {
		twitchLocations = twitchLocations.filter((_, i) => i !== index);
	}

	function addGender() {
		audienceGenders = [
			...audienceGenders,
			{ id: nextGenderId--, gender: "", percent: 0, color: null },
		];
	}

	function removeGender(index: number) {
		audienceGenders = audienceGenders.filter((_, i) => i !== index);
	}

	function addAgeGender() {
		const last = audienceAgeGenders.at(-1);
		audienceAgeGenders = [
			...audienceAgeGenders,
			{
				id: nextAgeGenderId--,
				age_range: last?.age_range ?? "",
				gender: genderOptions[0] ?? "",
				percent: 0,
			},
		];
	}

	let draggedAgeGender = $state<number | null>(null);

	function moveAgeGender(from: number, to: number) {
		if (from === to) return;
		const next = [...audienceAgeGenders];
		const [moved] = next.splice(from, 1);
		next.splice(to, 0, moved);
		audienceAgeGenders = next;
	}

	function removeAgeGender(index: number) {
		audienceAgeGenders = audienceAgeGenders.filter((_, i) => i !== index);
	}
</script>

<main class="mx-auto w-full max-w-6xl px-4 pt-10 pb-32 sm:px-6">
	<header class="flex flex-wrap items-start justify-between gap-4">
		<div>
			<a class="text-4xl font-bold dark:text-neutral-50" href="/">
				Media Kit
			</a>
		</div>
		<div class="flex items-center gap-3">
			<ThemeToggle />
			{#if authed}
				<button class={secondaryClass} onclick={handleLogout}>
					Log out
				</button>
			{/if}
		</div>
	</header>

	{#if loading}
		<div
			class="mt-10 flex animate-pulse flex-col gap-10"
			aria-busy="true"
			aria-label="Loading"
		>
			{#each [0, 1] as _}
				<section
					class="border-t border-gray-200 pt-8 dark:border-zinc-800"
				>
					<div
						class="mb-5 h-7 w-40 rounded bg-gray-200 dark:bg-zinc-800"
					></div>
					<div class="flex flex-col gap-4">
						{#each [0, 1, 2] as _}
							<div class="flex flex-col gap-2">
								<div
									class="h-4 w-24 rounded bg-gray-200 dark:bg-zinc-800"
								></div>
								<div
									class="h-10 w-full rounded-[10px] bg-gray-200 dark:bg-zinc-800"
								></div>
							</div>
						{/each}
					</div>
				</section>
			{/each}
		</div>
	{:else if !authed}
		<form class="mt-10 flex max-w-sm flex-col gap-4" onsubmit={handleLogin}>
			<div>
				<h2 class="text-xl font-semibold tracking-tight">Sign in</h2>
				<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
					Enter the admin credentials configured for this instance.
				</p>
			</div>

			<label class={labelClass}>
				<span>Username</span>
				<input
					class={controlClass}
					bind:value={username}
					autocomplete="username"
					required
				/>
			</label>

			<label class={labelClass}>
				<span>Password</span>
				<input
					class={controlClass}
					bind:value={password}
					type="password"
					autocomplete="current-password"
					required
				/>
			</label>

			{#if error}
				<div
					class="rounded-[10px] bg-red-600/10 px-4 py-3 text-sm text-red-600 dark:text-red-400"
				>
					{error}
				</div>
			{/if}

			<button class="{primaryClass} self-start" type="submit">
				Sign in
			</button>
		</form>
	{:else}
		<div class="mt-10 flex flex-col gap-10">
			<section class="border-t border-gray-200 pt-8 dark:border-zinc-800">
				<div
					class="mb-5 flex flex-wrap items-end justify-between gap-3"
				>
					<div>
						<h2 class="text-xl font-semibold tracking-tight">
							Profile
						</h2>
						<p
							class="mt-1 text-sm text-gray-500 dark:text-gray-400"
						>
							Name, bio, and services shown on the media kit.
						</p>
					</div>
				</div>

				<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
					{#each primaryContentKeys as key}
						{#if key in content}
							<label class={labelClass}>
								<span>{titleCase(key)}</span>
								<input
									class={controlClass}
									bind:value={content[key]}
								/>
							</label>
						{/if}
					{/each}
				</div>

				<div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
					{#each profileImageKeys as key}
						<div class={labelClass}>
							<span>
								{titleCase(key)}
								{#if key === "profile_image_light_url"}
									<span class="font-normal text-gray-400">
										· falls back to dark mode
									</span>
								{/if}
							</span>
							<div class="flex items-center gap-3">
								{#if content[key]}
									<img
										class="h-12 w-12 shrink-0 rounded-full border border-gray-200 object-cover dark:border-zinc-800"
										src={content[key]}
										alt=""
									/>
								{:else}
									<div
										class="h-12 w-12 shrink-0 rounded-full border border-dashed border-gray-300 dark:border-zinc-700"
									></div>
								{/if}
								<label
									class="{secondaryClass} {uploadingKey ===
									key
										? 'pointer-events-none opacity-50'
										: ''}"
								>
									{uploadingKey === key
										? "Uploading…"
										: content[key]
											? "Replace"
											: "Upload"}
									<input
										class="sr-only"
										type="file"
										accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
										disabled={uploadingKey !== null}
										onchange={(event) =>
											handleProfileImageUpload(
												key,
												event,
											)}
									/>
								</label>
								{#if content[key]}
									<button
										class={dangerClass}
										disabled={uploadingKey !== null}
										onclick={() =>
											handleProfileImageRemove(key)}
									>
										Remove
									</button>
								{/if}
							</div>
						</div>
					{/each}
				</div>

				<div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
					{#each longContentKeys as key}
						{#if key in content}
							<label class={labelClass}>
								<span>
									{titleCase(key)}
									{#if key === "services"}
										<span class="font-normal text-gray-400">
											· one per line
										</span>
									{:else if key === "stream_schedule"}
										<span class="font-normal text-gray-400">
											· shown when offline
										</span>
									{/if}
								</span>
								<textarea
									class="{controlClass} resize-y"
									rows={key === "services" ? 6 : 5}
									bind:value={content[key]}></textarea>
							</label>
						{/if}
					{/each}
				</div>

				{#if extraContentKeys.length}
					<div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
						{#each extraContentKeys as key}
							<label class={labelClass}>
								<span>{titleCase(key)}</span>
								<input
									class={controlClass}
									bind:value={content[key]}
								/>
							</label>
						{/each}
					</div>
				{/if}
			</section>

			<section class="border-t border-gray-200 pt-8 dark:border-zinc-800">
				<div
					class="mb-5 flex flex-wrap items-end justify-between gap-3"
				>
					<div>
						<h2 class="text-xl font-semibold tracking-tight">
							Platforms
						</h2>
						<p
							class="mt-1 text-sm text-gray-500 dark:text-gray-400"
						>
							Twitch followers update from Twitch. Drag platform
							names to reorder, then save.
						</p>
					</div>
				</div>

				<div
					class="mb-2 hidden grid-cols-[7.5rem_minmax(0,1fr)_minmax(0,1.3fr)_7.5rem] gap-3 px-5 text-xs font-medium tracking-wide text-gray-500 uppercase lg:grid dark:text-gray-400"
				>
					<span>Platform</span>
					<span>Handle</span>
					<span>URL</span>
					<span>Followers</span>
				</div>

				<div class="flex flex-col gap-3">
					<div class="{cardClass} {platformRowClass}">
						<div
							class="text-sm font-semibold sm:col-span-2 lg:col-span-1"
						>
							Twitch
						</div>
						<div class="{labelClass} min-w-0">
							<span class="lg:sr-only">Handle</span>
							<div
								class="{controlClass} flex items-center text-gray-400"
							>
								From Twitch
							</div>
						</div>
						<div class="{labelClass} min-w-0">
							<span class="lg:sr-only">URL</span>
							<div
								class="{controlClass} flex items-center text-gray-400"
							>
								From Twitch
							</div>
						</div>
						<div class="{labelClass} min-w-0">
							<span class="lg:sr-only">Followers</span>
							<div
								class="{controlClass} flex items-center text-gray-400"
							>
								Live
							</div>
						</div>
					</div>

					{#each platforms as platform, index (platform.name)}
						<div
							role="listitem"
							class="{cardClass} {platformRowClass} transition-opacity"
							class:opacity-50={draggedPlatform === index}
							ondragover={(event) => {
								if (draggedPlatform === null) return;
								event.preventDefault();
								movePlatform(draggedPlatform, index);
								draggedPlatform = index;
							}}
							ondrop={(event) => event.preventDefault()}
						>
							<div
								class="flex cursor-grab items-center gap-2 text-sm font-semibold select-none active:cursor-grabbing sm:col-span-2 lg:col-span-1"
								draggable="true"
								role="button"
								tabindex="-1"
								aria-label="Drag to reorder {titleCase(
									platform.name,
								)}"
								ondragstart={(event) => {
									draggedPlatform = index;
									event.dataTransfer?.setData(
										"text/plain",
										platform.name,
									);
									if (event.dataTransfer)
										event.dataTransfer.effectAllowed =
											"move";
								}}
								ondragend={() => (draggedPlatform = null)}
							>
								<span class="text-gray-400" aria-hidden="true"
									>⋮⋮</span
								>
								{titleCase(platform.name)}
							</div>
							<label class="{labelClass} min-w-0">
								<span class="lg:sr-only">Handle</span>
								<input
									class={controlClass}
									bind:value={platforms[index].handle}
								/>
							</label>
							<label class="{labelClass} min-w-0">
								<span class="lg:sr-only">URL</span>
								<input
									class={controlClass}
									bind:value={platforms[index].url}
								/>
							</label>
							<label class="{labelClass} min-w-0">
								<span class="lg:sr-only">
									{platform.name.toLowerCase() === "youtube"
										? "Subscribers"
										: "Followers"}
								</span>
								<input
									class={controlClass}
									type="number"
									min="0"
									step="1"
									bind:value={platforms[index].followers}
								/>
							</label>
						</div>
					{/each}
				</div>
			</section>

			<section class="border-t border-gray-200 pt-8 dark:border-zinc-800">
				<div
					class="mb-5 flex flex-wrap items-end justify-between gap-3"
				>
					<div>
						<h2 class="text-xl font-semibold tracking-tight">
							Collaborations
						</h2>
						<p
							class="mt-1 text-sm text-gray-500 dark:text-gray-400"
						>
							Order here is the order on the media kit.
						</p>
					</div>
					<div class="flex items-center gap-2">
						<button class={secondaryClass} onclick={addCollab}>
							Add
						</button>
					</div>
				</div>

				{#if collabs.length === 0}
					<p class="text-sm text-gray-500 dark:text-gray-400">
						No collaborations yet.
					</p>
				{:else}
					<div
						class="mb-2 hidden grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto] gap-3 px-5 text-xs font-medium tracking-wide text-gray-500 uppercase md:grid dark:text-gray-400"
					>
						<span>Name</span>
						<span>Image</span>
						<span>URL</span>
						<span class="sr-only">Actions</span>
					</div>
					<div class="flex flex-col gap-3">
						{#each collabs as collab, index (collab.id)}
							<div
								class="{cardClass} grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto] md:items-center md:gap-3"
							>
								<label class="{labelClass} min-w-0">
									<span class="md:sr-only">Name</span>
									<input
										class={controlClass}
										bind:value={collab.name}
									/>
								</label>
								<label class="{labelClass} min-w-0">
									<span class="md:sr-only">Image</span>
									<div class="flex items-center gap-3">
										<input
											class={controlClass}
											bind:value={collab.image}
										/>
										{#if collab.image}
											<img
												class="h-10 w-10 shrink-0 rounded-lg border border-gray-200 object-cover dark:border-zinc-800"
												src={collab.image}
												alt=""
											/>
										{/if}
									</div>
								</label>
								<label class="{labelClass} min-w-0">
									<span class="md:sr-only">URL</span>
									<input
										class={controlClass}
										bind:value={collab.url}
									/>
								</label>
								<div class="flex items-center gap-2">
									<button
										class="{secondaryClass} px-3 disabled:cursor-not-allowed disabled:opacity-40"
										disabled={index === 0}
										onclick={() => moveCollab(index, -1)}
									>
										Up
									</button>
									<button
										class="{secondaryClass} px-3 disabled:cursor-not-allowed disabled:opacity-40"
										disabled={index === collabs.length - 1}
										onclick={() => moveCollab(index, 1)}
									>
										Down
									</button>
									<button
										class={dangerClass}
										onclick={() => removeCollab(index)}
									>
										Remove
									</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>

			<section class="border-t border-gray-200 pt-8 dark:border-zinc-800">
				<div
					class="mb-5 flex flex-wrap items-end justify-between gap-3"
				>
					<div>
						<h2 class="text-xl font-semibold tracking-tight">
							Locations
						</h2>
						<p
							class="mt-1 text-sm {locationTotal > 100
								? 'text-red-600 dark:text-red-400'
								: 'text-gray-500 dark:text-gray-400'}"
						>
							Twitch views by country · {Math.round(
								locationTotal * 10,
							) / 10}%
						</p>
					</div>
					<div class="flex items-center gap-2">
						<button class={secondaryClass} onclick={addLocation}>
							Add
						</button>
					</div>
				</div>

				{#if twitchLocations.length === 0}
					<p class="text-sm text-gray-500 dark:text-gray-400">
						No locations yet.
					</p>
				{:else}
					<div
						class="mb-2 hidden grid-cols-[minmax(0,1fr)_8rem_auto] gap-3 px-5 text-xs font-medium tracking-wide text-gray-500 uppercase sm:grid dark:text-gray-400"
					>
						<span>Country</span>
						<span>Percent</span>
						<span class="sr-only">Actions</span>
					</div>
					<div class="flex flex-col gap-3">
						{#each twitchLocations as location, index (location.id)}
							<div
								class="{cardClass} grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_8rem_auto] sm:items-center sm:gap-3"
							>
								<label class="{labelClass} min-w-0">
									<span class="sm:sr-only">Country</span>
									<input
										class={controlClass}
										placeholder="United States"
										bind:value={location.country}
									/>
								</label>
								<label class="{labelClass} min-w-0">
									<span class="sm:sr-only">Percent</span>
									<input
										class={controlClass}
										type="number"
										min="0"
										max="100"
										step="0.1"
										bind:value={location.percent}
									/>
								</label>
								<button
									class={dangerClass}
									onclick={() => removeLocation(index)}
								>
									Remove
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</section>

			<section class="border-t border-gray-200 pt-8 dark:border-zinc-800">
				<div
					class="mb-5 flex flex-wrap items-end justify-between gap-3"
				>
					<div>
						<h2 class="text-xl font-semibold tracking-tight">
							Gender
						</h2>
						<p
							class="mt-1 text-sm {genderTotal > 100
								? 'text-red-600 dark:text-red-400'
								: 'text-gray-500 dark:text-gray-400'}"
						>
							Audience gender pie chart · {Math.round(
								genderTotal * 10,
							) / 10}%
						</p>
					</div>
					<div class="flex items-center gap-2">
						<button class={secondaryClass} onclick={addGender}>
							Add
						</button>
					</div>
				</div>

				{#if audienceGenders.length === 0}
					<p class="text-sm text-gray-500 dark:text-gray-400">
						No gender data yet.
					</p>
				{:else}
					<div
						class="mb-2 hidden grid-cols-[minmax(0,1fr)_8rem_5rem_auto] gap-3 px-5 text-xs font-medium tracking-wide text-gray-500 uppercase sm:grid dark:text-gray-400"
					>
						<span>Gender</span>
						<span>Percent</span>
						<span>Color</span>
						<span class="sr-only">Actions</span>
					</div>
					<div class="flex flex-col gap-3">
						{#each audienceGenders as entry, index (entry.id)}
							<div
								class="{cardClass} grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_8rem_5rem_auto] sm:items-center sm:gap-3"
							>
								<label class="{labelClass} min-w-0">
									<span class="sm:sr-only">Gender</span>
									<input
										class={controlClass}
										placeholder="Male"
										bind:value={entry.gender}
									/>
								</label>
								<label class="{labelClass} min-w-0">
									<span class="sm:sr-only">Percent</span>
									<input
										class={controlClass}
										type="number"
										min="0"
										max="100"
										step="0.1"
										bind:value={entry.percent}
									/>
								</label>
								<label class="{labelClass} min-w-0">
									<span class="sm:sr-only">Color</span>
									<input
										class="h-11 w-full cursor-pointer rounded-[10px] border border-gray-200 bg-transparent p-1 dark:border-zinc-800"
										type="color"
										value={entry.color ||
											defaultGenderColors.get(
												entry.gender,
											) ||
											"#06b6d4"}
										oninput={(event) =>
											(entry.color = (
												event.currentTarget as HTMLInputElement
											).value)}
									/>
								</label>
								<button
									class={dangerClass}
									onclick={() => removeGender(index)}
								>
									Remove
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</section>

			<section class="border-t border-gray-200 pt-8 dark:border-zinc-800">
				<div
					class="mb-5 flex flex-wrap items-end justify-between gap-3"
				>
					<div>
						<h2 class="text-xl font-semibold tracking-tight">
							Age &amp; Gender
						</h2>
						<p
							class="mt-1 text-sm {ageGenderTotal > 100
								? 'text-red-600 dark:text-red-400'
								: 'text-gray-500 dark:text-gray-400'}"
						>
							Share of total audience per age range and gender ·
							{Math.round(ageGenderTotal * 10) / 10}%
						</p>
					</div>
					<div class="flex items-center gap-2">
						<button class={secondaryClass} onclick={addAgeGender}>
							Add
						</button>
					</div>
				</div>

				{#if audienceAgeGenders.length === 0}
					<p class="text-sm text-gray-500 dark:text-gray-400">
						No age data yet.
					</p>
				{:else}
					<div
						class="mb-2 hidden grid-cols-[minmax(0,1fr)_minmax(0,1fr)_8rem_auto] gap-3 px-5 text-xs font-medium tracking-wide text-gray-500 uppercase sm:grid dark:text-gray-400"
					>
						<span>Age range</span>
						<span>Gender</span>
						<span>Percent</span>
						<span class="sr-only">Actions</span>
					</div>
					<div class="flex flex-col gap-3">
						{#each audienceAgeGenders as entry, index (entry.id)}
							<div
								role="listitem"
								class="{cardClass} grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_8rem_auto] sm:items-center sm:gap-3"
								class:opacity-50={draggedAgeGender === index}
								ondragover={(event) => {
									if (draggedAgeGender === null) return;
									event.preventDefault();
									moveAgeGender(draggedAgeGender, index);
									draggedAgeGender = index;
								}}
								ondrop={(event) => event.preventDefault()}
							>
								<div class="flex min-w-0 items-center gap-2">
									<span
										class="cursor-grab text-gray-400 select-none active:cursor-grabbing"
										draggable="true"
										role="button"
										tabindex="-1"
										aria-label="Drag to reorder"
										ondragstart={(event) => {
											draggedAgeGender = index;
											event.dataTransfer?.setData(
												"text/plain",
												String(entry.id),
											);
											if (event.dataTransfer)
												event.dataTransfer.effectAllowed =
													"move";
										}}
										ondragend={() =>
											(draggedAgeGender = null)}>⋮⋮</span
									>
									<label class="{labelClass} min-w-0 flex-1">
										<span class="sm:sr-only">Age range</span
										>
										<input
											class={controlClass}
											placeholder="18-24"
											bind:value={entry.age_range}
										/>
									</label>
								</div>
								<label class="{labelClass} min-w-0">
									<span class="sm:sr-only">Gender</span>
									<select
										class={controlClass}
										bind:value={entry.gender}
									>
										{#if entry.gender && !genderOptions.includes(entry.gender)}
											<option value={entry.gender}>
												{entry.gender}
											</option>
										{/if}
										{#each genderOptions as option}
											<option value={option}>
												{option}
											</option>
										{/each}
									</select>
								</label>
								<label class="{labelClass} min-w-0">
									<span class="sm:sr-only">Percent</span>
									<input
										class={controlClass}
										type="number"
										min="0"
										max="100"
										step="0.1"
										bind:value={entry.percent}
									/>
								</label>
								<button
									class={dangerClass}
									onclick={() => removeAgeGender(index)}
								>
									Remove
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</section>
		</div>

		{#if dirtySections.length}
			<div
				class="fixed inset-x-4 bottom-6 z-40 mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-2xl bg-neutral-900 px-5 py-3 text-white shadow-2xl ring-1 ring-black/10 dark:bg-zinc-800 dark:ring-white/10"
				role="region"
				aria-label="Unsaved changes"
				transition:fly={{ y: 80, duration: 200 }}
			>
				<span class="text-sm font-medium">
					Careful — you have unsaved changes!
				</span>
				<div class="flex items-center gap-2">
					<button
						class="cursor-pointer rounded-[10px] px-3 py-2 text-sm font-medium text-white/80 hover:underline disabled:opacity-50"
						disabled={saving}
						onclick={resetChanges}
					>
						Reset
					</button>
					<button
						class="cursor-pointer rounded-[10px] bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-500 disabled:cursor-wait disabled:opacity-60"
						disabled={saving}
						onclick={saveChanges}
					>
						{saving ? "Saving…" : "Save Changes"}
					</button>
				</div>
			</div>
		{/if}

		{#if message || error}
			<div
				class="fixed right-6 z-50 flex max-w-sm flex-col gap-2 {dirtySections.length
					? 'bottom-28'
					: 'bottom-6'}"
				role="status"
				aria-live="polite"
			>
				{#if message}
					<div
						class="rounded-[10px] bg-green-600 px-4 py-3 text-sm font-medium text-white shadow-lg"
					>
						{message}
					</div>
				{/if}
				{#if error}
					<div
						class="rounded-[10px] bg-red-600 px-4 py-3 text-sm font-medium text-white shadow-lg"
					>
						{error}
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</main>
