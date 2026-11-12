<script lang="ts">
	import Panel from "./Panel.svelte";

	let { about = "" }: { about?: string } = $props();
</script>

{#if about}
	<Panel title="About Me">
		<p class="text-lg leading-snug wrap-break-word whitespace-pre-line">
			{about}
		</p>
	</Panel>
{/if}
