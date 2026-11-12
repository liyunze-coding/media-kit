<script lang="ts">
    let { services = "" }: { services?: string } = $props();

    let items = $derived(
        services
            .split("\n")
            .map((service) => service.trim())
            .filter(Boolean),
    );
</script>

{#if items.length}
    <section class="w-full">
        <div
            class="mb-3 text-3xl font-bold text-neutral-900 sm:text-3xl dark:text-white"
        >
            Services
        </div>
        <div class="">
            <ul
                class="list-disc space-y-2 pl-5 marker:text-cyan-600 dark:marker:text-cyan-300"
            >
                {#each items as service}
                    <li>{service}</li>
                {/each}
            </ul>
        </div>
    </section>
{/if}
