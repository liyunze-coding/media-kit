<script lang="ts">
	let {
		src,
		alt,
		class: className = "",
	}: {
		src: string;
		alt: string;
		class?: string;
	} = $props();
</script>

<div class="shrink-0 {className}">
	<img
		class="aspect-square w-44 rounded-full border-[5px] border-cyan-400 object-cover shadow-lg shadow-cyan-400/30 sm:w-56 dark:shadow-cyan-400/15"
		{src}
		{alt}
		width="224"
		height="224"
	/>
</div>
