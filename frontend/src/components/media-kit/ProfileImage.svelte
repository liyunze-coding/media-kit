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

<img
	class="h-auto w-full max-w-75 rounded-xl object-cover shadow-lg shadow-cyan-500/60 dark:shadow-cyan-300 {className}"
	{src}
	{alt}
	width="300"
/>
