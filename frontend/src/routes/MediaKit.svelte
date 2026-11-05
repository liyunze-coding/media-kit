<script lang="ts">
    import { onMount } from "svelte";
    import { fetchMediaKit } from "../lib/api";
    import type { MediaKit, Platform } from "../lib/types";

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
    let twitch = $derived(data?.twitch);
    // let twitchLogin = $derived(twitch?.login ?? "");

    let platformImageMap: Record<string, string> = {
        twitch: "/images/logos/twitch.svg",
        youtube: "/images/logos/youtube.svg",
        instagram: "/images/logos/instagram.svg",
        tiktok: "/images/logos/tiktok.svg",
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
    <main class="grid grid-cols-2 max-w-6xl mx-auto pt-20">
        <div class="">
            <div class="px-5">
                {#if content.profile_image_url}
                    <img
                        class="shrink-0 rounded-xl w-full object-cover shadow-cyan-300 shadow-lg"
                        src={content.profile_image_url}
                        alt={content.brand_name ?? "Profile image"}
                        width="300"
                    />
                {/if}
                <div class="mt-6 grid grid-cols-2 gap-4">
                    <!-- Twitch -->
                    <a
                        class="flex flex-col gap-1 rounded-2xl border border-gray-200 bg-neutral-50 p-5 transition-colors hover:border-violet-600 dark:border-zinc-800 dark:bg-neutral-900 dark:hover:border-violet-400"
                        href={`https://twitch.tv/${twitch?.login}`}
                        target="_blank"
                        rel="noreferrer"
                    >
                        <div
                            class="flex flex-row justify-start items-start gap-3"
                        >
                            <img
                                src={platformImageMap["twitch"]}
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
                    </a>
                    {#each platforms as platform (platform.name)}
                        <a
                            class="flex flex-col gap-1 rounded-2xl border border-gray-200 bg-neutral-50 p-5 transition-colors hover:border-violet-600 dark:border-zinc-800 dark:bg-neutral-900 dark:hover:border-violet-400"
                            href={platform.url}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <div
                                class="flex flex-row justify-start items-start gap-3"
                            >
                                <img
                                    src={platformImageMap[platform.name]}
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
                        </a>
                    {/each}
                </div>
            </div>
        </div>
        <div class="">
            <div class="border-cyan border-2 rounded-lg py-2 px-2">
                <div
                    class="-translate-x-20 px-5 py-5 text-4xl bg-cyan-300 text-black rounded-xl"
                >
                    Hi there, I'm <br />
                    <b>RythonDev</b>
                </div>
            </div>
        </div>
    </main>
{/if}

<style>
</style>
