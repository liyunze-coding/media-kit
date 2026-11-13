<script lang="ts">
    import { formatCount } from "../../lib/format";
    import { metricLabel, platformImageMap } from "../../lib/platforms";

    let {
        name,
        handle,
        href,
        followers,
    }: {
        name: string;
        handle: string;
        href: string;
        followers?: number | null;
    } = $props();

    let deco = $derived(platformImageMap[name.toLowerCase()]);
</script>

{#if deco}
    <a
        class="group flex flex-col items-start text-center px-2 py-2"
        {href}
        target="_blank"
        rel="noreferrer"
        title={`${name}${handle ? ` · ${handle}` : ""}`}
    >
        <div class="flex w-full items-center justify-center">
            <div class="relative transition duration-300 group-hover:scale-105">
                <img
                    src={deco.image}
                    alt=""
                    aria-hidden="true"
                    class={[
                        name === "tiktok" && "dark:invert",
                        "absolute inset-0 h-12 w-12 scale-105 opacity-60 blur-md group-hover:opacity-90 group-hover:blur-lg sm:h-14 sm:w-14 dark:brightness-120",
                    ]}
                />
                <img
                    src={deco.image}
                    alt={name}
                    class="relative h-12 w-12 sm:h-14 sm:w-14"
                />
            </div>
        </div>
        <div class="">
            <div class="flex flex-col">
                <div
                    class="mt-3 text-3xl font-bold tracking-tight text-neutral-900 tabular-nums sm:text-4xl dark:text-white"
                >
                    {formatCount(followers)}
                </div>
                <div
                    class="text-[0.7rem] tracking-[0.12em] text-zinc-500 uppercase dark:text-zinc-400"
                >
                    {metricLabel(name)}
                </div>
            </div>
        </div>
    </a>
{/if}
