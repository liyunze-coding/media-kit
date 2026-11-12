<script lang="ts">
    import Panel from "./Panel.svelte";

    let { email = "" }: { email?: string } = $props();

    let copied = $state(false);
    let copyTimer: ReturnType<typeof setTimeout> | undefined;

    async function copyEmail() {
        try {
            await navigator.clipboard.writeText(email);
        } catch {
            return;
        }
        copied = true;
        clearTimeout(copyTimer);
        copyTimer = setTimeout(() => (copied = false), 2000);
    }
</script>

{#if email}
    <Panel title="Work With Me">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="min-w-0">
                <div class="text-sm text-zinc-500 dark:text-zinc-400">
                    Business inquiries
                </div>
                <a
                    class="block truncate text-lg font-semibold text-cyan-700 hover:underline dark:text-cyan-300"
                    href={`mailto:${email}`}
                >
                    {email}
                </a>
            </div>
            <div class="flex items-center gap-2">
                <button
                    class="cursor-pointer rounded-full border border-zinc-300 px-4 py-2 text-sm transition-colors hover:border-cyan-500 dark:border-zinc-700 dark:hover:border-cyan-400"
                    onclick={copyEmail}
                >
                    {copied ? "Copied!" : "Copy"}
                </button>
                <a
                    class="rounded-full bg-cyan-400 px-4 py-2 text-sm font-bold text-neutral-900 transition-opacity hover:opacity-85"
                    href={`mailto:${email}`}
                >
                    Email me
                </a>
            </div>
        </div>
    </Panel>
{/if}
