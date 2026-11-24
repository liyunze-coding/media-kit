<script lang="ts">
    import { formatCount } from "../../lib/format";
    import { platformDisplayName, platformImageMap } from "../../lib/platforms";
    import type { MonthlyViews } from "../../lib/types";
    import Panel from "./Panel.svelte";

    let { entries = [] }: { entries?: MonthlyViews[] } = $props();

    let visibleEntries = $derived(
        entries.filter((entry) => entry.views > 0),
    );
    let total = $derived(
        visibleEntries.reduce((sum, entry) => sum + entry.views, 0),
    );
    let visible = $state(false);

    function revealOnce(node: HTMLElement) {
        const observer = new IntersectionObserver(
            (observed) => {
                if (observed.some((entry) => entry.isIntersecting)) {
                    visible = true;
                    observer.disconnect();
                }
            },
            { threshold: 0.2 },
        );
        observer.observe(node);
        return { destroy: () => observer.disconnect() };
    }
</script>

{#if total > 0}
    <Panel title="Past 30 Days Views">
        <div use:revealOnce>
            <div class="flex items-baseline justify-between gap-3">
                <span
                    class="text-xs font-semibold tracking-[0.08em] text-zinc-500 uppercase dark:text-zinc-400"
                >
                    Total views
                </span>
                <span
                    class="text-3xl font-bold tracking-tight text-neutral-900 tabular-nums sm:text-4xl dark:text-white"
                    title="{total.toLocaleString()} views"
                >
                    {formatCount(total)}
                </span>
            </div>

            <ul
                class="mt-4 space-y-4 border-t border-zinc-200 pt-4 dark:border-zinc-800"
            >
                {#each visibleEntries as entry (entry.platform)}
                    {@const deco = platformImageMap[entry.platform.toLowerCase()]}
                    {@const share = (entry.views / total) * 100}
                    <li class="text-sm">
                        <div
                            class="mb-1.5 flex items-center justify-between gap-3"
                        >
                            <span class="flex min-w-0 items-center gap-2">
                                {#if deco}
                                    <img
                                        src={deco.image}
                                        alt=""
                                        aria-hidden="true"
                                        class="size-5 shrink-0"
                                    />
                                {/if}
                                <span class="truncate">
                                    {platformDisplayName(entry.platform)}
                                </span>
                            </span>
                            <span
                                class="font-semibold tabular-nums"
                                title="{entry.views.toLocaleString()} views"
                            >
                                {formatCount(entry.views)}
                            </span>
                        </div>
                        <div
                            class="h-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
                        >
                            <div
                                class="h-full rounded-full text-neutral-900 transition-[width] duration-1000 ease-out motion-reduce:transition-none dark:text-white"
                                style:background-color={deco?.color || "currentColor"}
                                style:width={visible ? `${share}%` : "0%"}
                            ></div>
                        </div>
                    </li>
                {/each}
            </ul>
        </div>
    </Panel>
{/if}
