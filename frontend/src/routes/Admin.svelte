<script lang="ts">
	import { onMount } from "svelte";
	import {
		clearStoredToken,
		fetchAdminState,
		getStoredToken,
		updateCollabs,
		updateContent,
		updatePlatforms,
		verifyAdmin,
	} from "../lib/api";
	import type { Collab, Platform } from "../lib/types";

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

	onMount(async () => {
		if (getStoredToken()) {
			await loadState();
		} else {
			loading = false;
		}
	});

	function titleCase(key: string): string {
		return key
			.split("_")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
	}

	async function loadState() {
		loading = true;
		error = "";
		try {
			const state = await fetchAdminState();
			content = state.content;
			platforms = state.platforms;
			collabs = state.collabs ?? [];
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
		message = "";
		error = "";
	}

	async function handleSaveContent() {
		error = "";
		message = "";
		try {
			content = await updateContent(content);
			message = "Content saved";
		} catch (err) {
			error =
				err instanceof Error ? err.message : "Unable to save content";
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

<main class="mx-auto w-full max-w-230 px-6 pt-12 pb-18">
	<header class="flex items-start justify-between gap-6">
		<div>
			<p
				class="mb-3 text-xs font-semibold tracking-[0.14em] uppercase text-gray-500 dark:text-gray-400"
			>
				CMS
			</p>
			<h1
				class="text-[clamp(36px,8vw,52px)] leading-[1.05] font-semibold tracking-tight"
			>
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
			{#if authed}
				<button
					class="cursor-pointer rounded-[10px] border border-gray-200 bg-transparent px-4 py-2.5 text-sm font-medium text-neutral-900 transition-opacity hover:opacity-85 dark:border-zinc-800 dark:text-neutral-50"
					onclick={handleLogout}
				>
					Log out
				</button>
			{/if}
		</div>
	</header>

	{#if loading}
		<div class="py-8 text-gray-500 dark:text-gray-400">Loading…</div>
	{:else if !authed}
		<form class="mt-10 max-w-100" onsubmit={handleLogin}>
			<h2 class="mb-2 text-xl font-semibold tracking-tight">Sign in</h2>
			<p class="text-gray-500 dark:text-gray-400">
				Enter the admin credentials configured for this instance.
			</p>

			<label
				class="flex flex-col gap-2 text-sm text-gray-500 dark:text-gray-400"
			>
				<span>Username</span>
				<input
					class="w-full rounded-[10px] border border-gray-200 bg-white px-3 py-2.5 text-neutral-900 outline-none focus:border-violet-600 dark:border-zinc-800 dark:bg-neutral-950 dark:text-neutral-50 dark:focus:border-violet-400"
					bind:value={username}
					autocomplete="username"
					required
				/>
			</label>

			<label
				class="flex flex-col gap-2 text-sm text-gray-500 dark:text-gray-400"
			>
				<span>Password</span>
				<input
					class="w-full rounded-[10px] border border-gray-200 bg-white px-3 py-2.5 text-neutral-900 outline-none focus:border-violet-600 dark:border-zinc-800 dark:bg-neutral-950 dark:text-neutral-50 dark:focus:border-violet-400"
					bind:value={password}
					type="password"
					autocomplete="current-password"
					required
				/>
			</label>

			{#if error}
				<div
					class="mt-6 rounded-[10px] bg-red-600/10 px-4 py-3 text-sm text-red-600 dark:text-red-400"
				>
					{error}
				</div>
			{/if}

			<button
				class="cursor-pointer rounded-[10px] border border-transparent bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-85 dark:bg-neutral-50 dark:text-neutral-950"
				type="submit"
			>
				Sign in
			</button>
		</form>
	{:else}
		<div class="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2 md:items-start">
			<section class="border-t border-gray-200 pt-8 dark:border-zinc-800">
				<div class="mb-5 flex items-center justify-between gap-4">
					<h2 class="text-xl font-semibold tracking-tight">
						Text content
					</h2>
					<button
						class="cursor-pointer rounded-[10px] border border-transparent bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-85 dark:bg-neutral-50 dark:text-neutral-950"
						onclick={handleSaveContent}
					>
						Save content
					</button>
				</div>

				<div class="grid grid-cols-1 gap-4">
					{#each Object.keys(content) as key}
						<label
							class="flex flex-col gap-2 text-sm text-gray-500 dark:text-gray-400"
						>
							<span>{titleCase(key)}</span>
							{#if key === "about" || key === "services"}
								<textarea
									class="w-full resize-y rounded-[10px] border border-gray-200 bg-white px-3 py-2.5 text-neutral-900 outline-none focus:border-violet-600 dark:border-zinc-800 dark:bg-neutral-950 dark:text-neutral-50 dark:focus:border-violet-400"
									rows={key === "services" ? 6 : 4}
									bind:value={content[key]}></textarea>
							{:else if key === "profile_image_url"}
								<div class="flex items-start gap-4">
									<input
										class="w-full rounded-[10px] border border-gray-200 bg-white px-3 py-2.5 text-neutral-900 outline-none focus:border-violet-600 dark:border-zinc-800 dark:bg-neutral-950 dark:text-neutral-50 dark:focus:border-violet-400"
										bind:value={content[key]}
									/>
									{#if content[key]}
										<img
											class="h-16 w-16 shrink-0 rounded-full border border-gray-200 object-cover dark:border-zinc-800"
											src={content[key]}
											alt="Profile preview"
										/>
									{/if}
								</div>
							{:else}
								<input
									class="w-full rounded-[10px] border border-gray-200 bg-white px-3 py-2.5 text-neutral-900 outline-none focus:border-violet-600 dark:border-zinc-800 dark:bg-neutral-950 dark:text-neutral-50 dark:focus:border-violet-400"
									bind:value={content[key]}
								/>
							{/if}
						</label>
					{/each}
				</div>
			</section>

			<section class="border-t border-gray-200 pt-8 dark:border-zinc-800">
				<div class="mb-5 flex items-center justify-between gap-4">
					<h2 class="text-xl font-semibold tracking-tight">
						Follower counts
					</h2>
					<button
						class="cursor-pointer rounded-[10px] border border-transparent bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-85 dark:bg-neutral-50 dark:text-neutral-950"
						onclick={handleSavePlatforms}
					>
						Save platforms
					</button>
				</div>

				<div
					class="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5"
				>
					{#each platforms as platform, index (platform.name)}
						<div
							class="rounded-2xl border border-gray-200 bg-neutral-50 p-5 dark:border-zinc-800 dark:bg-neutral-900"
						>
							<div class="mb-4 text-sm font-semibold">
								{titleCase(platform.name)}
							</div>
							<div class="grid grid-cols-1 gap-4">
								<label
									class="flex flex-col gap-2 text-sm text-gray-500 dark:text-gray-400"
								>
									<span>Handle</span>
									<input
										class="w-full rounded-[10px] border border-gray-200 bg-white px-3 py-2.5 text-neutral-900 outline-none focus:border-violet-600 dark:border-zinc-800 dark:bg-neutral-950 dark:text-neutral-50 dark:focus:border-violet-400"
										bind:value={platform.handle}
									/>
								</label>
								<label
									class="flex flex-col gap-2 text-sm text-gray-500 dark:text-gray-400"
								>
									<span>URL</span>
									<input
										class="w-full rounded-[10px] border border-gray-200 bg-white px-3 py-2.5 text-neutral-900 outline-none focus:border-violet-600 dark:border-zinc-800 dark:bg-neutral-950 dark:text-neutral-50 dark:focus:border-violet-400"
										bind:value={platform.url}
									/>
								</label>
								<label
									class="flex flex-col gap-2 text-sm text-gray-500 dark:text-gray-400"
								>
									<span>Followers</span>
									<input
										class="w-full rounded-[10px] border border-gray-200 bg-white px-3 py-2.5 text-neutral-900 outline-none focus:border-violet-600 dark:border-zinc-800 dark:bg-neutral-950 dark:text-neutral-50 dark:focus:border-violet-400"
										type="number"
										min="0"
										step="1"
										bind:value={platform.followers}
									/>
								</label>
							</div>
						</div>
					{/each}
				</div>
			</section>

			<section
				class="border-t border-gray-200 pt-8 md:col-span-2 dark:border-zinc-800"
			>
				<div class="mb-5 flex items-center justify-between gap-4">
					<h2 class="text-xl font-semibold tracking-tight">
						Collaborations
					</h2>
					<div class="flex items-center gap-3">
						<button
							class="cursor-pointer rounded-[10px] border border-gray-200 bg-transparent px-4 py-2.5 text-sm font-medium text-neutral-900 transition-opacity hover:opacity-85 dark:border-zinc-800 dark:text-neutral-50"
							onclick={addCollab}
						>
							Add
						</button>
						<button
							class="cursor-pointer rounded-[10px] border border-transparent bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-85 dark:bg-neutral-50 dark:text-neutral-950"
							onclick={handleSaveCollabs}
						>
							Save collaborations
						</button>
					</div>
				</div>

				{#if collabs.length === 0}
					<p class="text-sm text-gray-500 dark:text-gray-400">
						No collaborations yet.
					</p>
				{:else}
					<div class="grid grid-cols-1 gap-5">
						{#each collabs as collab, index (collab.id)}
							<div
								class="rounded-2xl border border-gray-200 bg-neutral-50 p-5 dark:border-zinc-800 dark:bg-neutral-900"
							>
								<div
									class="mb-4 flex items-center justify-between gap-3"
								>
									<div class="text-sm font-semibold">
										{collab.name || "New collaboration"}
									</div>
									<div class="flex items-center gap-2">
										<button
											class="cursor-pointer rounded-[10px] border border-gray-200 bg-transparent px-3 py-1.5 text-sm text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:text-neutral-50"
											disabled={index === 0}
											onclick={() => moveCollab(index, -1)}
										>
											Up
										</button>
										<button
											class="cursor-pointer rounded-[10px] border border-gray-200 bg-transparent px-3 py-1.5 text-sm text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:text-neutral-50"
											disabled={index === collabs.length - 1}
											onclick={() => moveCollab(index, 1)}
										>
											Down
										</button>
										<button
											class="cursor-pointer rounded-[10px] border border-gray-200 bg-transparent px-3 py-1.5 text-sm text-red-600 dark:border-zinc-800 dark:text-red-400"
											onclick={() => removeCollab(index)}
										>
											Remove
										</button>
									</div>
								</div>
								<div
									class="grid grid-cols-1 gap-4 md:grid-cols-3"
								>
									<label
										class="flex flex-col gap-2 text-sm text-gray-500 dark:text-gray-400"
									>
										<span>Name</span>
										<input
											class="w-full rounded-[10px] border border-gray-200 bg-white px-3 py-2.5 text-neutral-900 outline-none focus:border-violet-600 dark:border-zinc-800 dark:bg-neutral-950 dark:text-neutral-50 dark:focus:border-violet-400"
											bind:value={collab.name}
										/>
									</label>
									<label
										class="flex flex-col gap-2 text-sm text-gray-500 dark:text-gray-400"
									>
										<span>Image URL</span>
										<div class="flex items-center gap-3">
											<input
												class="w-full rounded-[10px] border border-gray-200 bg-white px-3 py-2.5 text-neutral-900 outline-none focus:border-violet-600 dark:border-zinc-800 dark:bg-neutral-950 dark:text-neutral-50 dark:focus:border-violet-400"
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
									<label
										class="flex flex-col gap-2 text-sm text-gray-500 dark:text-gray-400"
									>
										<span>URL</span>
										<input
											class="w-full rounded-[10px] border border-gray-200 bg-white px-3 py-2.5 text-neutral-900 outline-none focus:border-violet-600 dark:border-zinc-800 dark:bg-neutral-950 dark:text-neutral-50 dark:focus:border-violet-400"
											bind:value={collab.url}
										/>
									</label>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>
		</div>

		{#if message}
			<div
				class="mt-6 rounded-[10px] bg-green-600/10 px-4 py-3 text-sm text-green-600 dark:text-green-400"
			>
				{message}
			</div>
		{/if}
		{#if error}
			<div
				class="mt-6 rounded-[10px] bg-red-600/10 px-4 py-3 text-sm text-red-600 dark:text-red-400"
			>
				{error}
			</div>
		{/if}
	{/if}
</main>
