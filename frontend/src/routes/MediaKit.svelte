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
    <main class="grid grid-cols-2 max-w-6xl mx-auto pt-20 pb-10 gap-10">
        <div class="">
            <div class="px-5">
                <div class="flex justify-end items-start">
                    {#if content.profile_image_url}
                        <img
                            class="shrink-0 rounded-xl object-cover shadow-cyan-300 shadow-lg"
                            src={content.profile_image_url}
                            alt={content.brand_name ?? "Profile image"}
                            width="300"
                        />
                    {/if}
                </div>
                <div class="mt-6 grid grid-cols-2 gap-4">
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
        <div class="flex flex-col justify-start items-start gap-5">
            <div
                class="border-cyan-300 border-2 rounded-lg translate-y-2 w-fit"
            >
                <div
                    class="-translate-x-20 px-5 py-5 text-4xl bg-cyan-300 text-black rounded-xl -translate-y-2"
                >
                    Hi there, I'm <br />
                    <b>RythonDev</b>
                </div>
            </div>
            <div class="mt-5">
                <div class="text-white font-bold text-4xl mb-2">About Me</div>
                <p>
                    {content.about ?? ""}
                </p>
            </div>
            <div>
                <div class="text-white font-bold text-4xl mb-2">
                    Collaborations
                </div>
                <Collabs />
            </div>
        </div>
    </main>
{/if}

<style>
</style>
