<script lang="ts">
	import { onMount } from "svelte";
	import {
		clearStoredToken,
		fetchAdminState,
		getStoredToken,
		updateCollabs,
		updateContent,
		updatePlatforms,
		updateTwitchLocations,
		uploadImage,
		verifyAdmin,
	} from "../lib/api";
	import type { Collab, Platform, TwitchLocation } from "../lib/types";
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
	const platformRank: Record<string, number> = {
		instagram: 0,
		tiktok: 1,
		youtube: 2,
	};

	let orderedPlatforms = $derived(
		[...platforms].sort((a, b) => {
			const left = platformRank[a.name.toLowerCase()] ?? 50;
			const right = platformRank[b.name.toLowerCase()] ?? 50;
			if (left !== right) return left - right;
			return a.name.localeCompare(b.name);
		}),
	);
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
		message = "";
		error = "";
	}

	async function handleSaveContent() {
		error = "";
		message = "";
		try {
			const payload = Object.fromEntries(
				Object.entries(content).map(([key, value]) => [
					key,
					String(value ?? ""),
				]),
			);
			content = await updateContent(payload);
			message = "Content saved";
		} catch (err) {
			error =
				err instanceof Error ? err.message : "Unable to save content";
		}
	}

	async function saveProfileImage(key: string, url: string) {
		const saved = await updateContent({ [key]: url });
		content[key] = saved[key] ?? "";
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

	async function handleSaveCollabs() {
		error = "";
		message = "";
		try {
			collabs = await updateCollabs(collabs);
			message = "Collaborations saved";
		} catch (err) {
			error =
				err instanceof Error
					? err.message
					: "Unable to save collaborations";
		}
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

	async function handleSaveLocations() {
		error = "";
		message = "";
		try {
			twitchLocations = await updateTwitchLocations(twitchLocations);
			message = "Twitch locations saved";
		} catch (err) {
			error =
				err instanceof Error
					? err.message
					: "Unable to save Twitch locations";
		}
	}

	async function handleSavePlatforms() {
		error = "";
		message = "";
		try {
			const payload = platforms.map((platform) => ({
				...platform,
				followers: Number(platform.followers) || 0,
			}));
			platforms = await updatePlatforms(payload);
			message = "Platforms saved";
		} catch (err) {
			error =
				err instanceof Error ? err.message : "Unable to save platforms";
		}
	}
</script>

<main class="mx-auto w-full max-w-6xl px-4 pt-10 pb-16 sm:px-6">
	<header class="flex flex-wrap items-start justify-between gap-4">
		<div>
			<p
				class="mb-2 text-xs font-semibold tracking-[0.14em] uppercase text-gray-500 dark:text-gray-400"
			>
				CMS
			</p>
			<h1 class="text-3xl font-semibold tracking-tight sm:text-3xl">
				RythonDev media kit
			</h1>
		</div>
		<div class="flex items-center gap-3">
			<a
				class="text-sm text-gray-500 hover:text-neutral-900 dark:text-gray-400 dark:hover:text-neutral-50"
				href="#/"
			>
				View media kit
			</a>
			<ThemeToggle />
			{#if authed}
				<button class={secondaryClass} onclick={handleLogout}>
					Log out
				</button>
			{/if}
		</div>
	</header>

	{#if loading}
		<div class="py-8 text-gray-500 dark:text-gray-400">Loading…</div>
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
					<button class={primaryClass} onclick={handleSaveContent}>
						Save
					</button>
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
											handleProfileImageUpload(key, event)}
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
							Twitch followers update from Twitch.
						</p>
					</div>
					<button class={primaryClass} onclick={handleSavePlatforms}>
						Save
					</button>
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

					{#each orderedPlatforms as platform (platform.name)}
						{@const index = platforms.findIndex(
							(item) => item.name === platform.name,
						)}
						<div class="{cardClass} {platformRowClass}">
							<div
								class="text-sm font-semibold sm:col-span-2 lg:col-span-1"
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
						<button
							class={primaryClass}
							onclick={handleSaveCollabs}
						>
							Save
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
						<button
							class={primaryClass}
							onclick={handleSaveLocations}
						>
							Save
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
		</div>

		{#if message || error}
			<div
				class="fixed right-6 bottom-6 z-50 flex max-w-sm flex-col gap-2"
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
