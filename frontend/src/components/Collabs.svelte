<script lang="ts">
	import type { Collab } from "../lib/types";
	import AnimatedTooltip from "./ui/AnimatedTooltip/AnimatedTooltip.svelte";

	let { items = [] }: { items?: Collab[] } = $props();
</script>

<AnimatedTooltip {items} />
