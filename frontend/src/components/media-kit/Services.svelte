<script lang="ts">
    import Panel from "./Panel.svelte";

    let { services = "" }: { services?: string } = $props();

    let items = $derived(
        services
            .split("\n")
            .map((service) => service.trim())
            .filter(Boolean),
    );
</script>

{#if items.length}
    <Panel title="Services">
        <ul
            class="list-disc space-y-2 pl-5 marker:text-cyan-500 dark:marker:text-cyan-400"
        >
            {#each items as service}
                <li>{service}</li>
            {/each}
        </ul>
    </Panel>
{/if}
