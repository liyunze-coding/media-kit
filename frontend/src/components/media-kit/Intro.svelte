<script lang="ts">
	let {
		name = "RythonDev",
		tagline = "",
	}: {
		name?: string;
		tagline?: string;
	} = $props();
</script>

<div
	class="w-full translate-y-2 rounded-lg border-2 border-cyan-500 sm:w-fit dark:border-cyan-300"
>
	<div
		class="-translate-y-2 rounded-xl bg-cyan-300 px-5 py-5 text-3xl text-black sm:-translate-x-8 sm:text-3xl lg:-translate-x-20"
	>
		Hi there, I'm <br />
		<b>{name}</b>
	</div>
	{#if tagline}
		<p class="px-5 pb-2 text-xl text-cyan-700 dark:text-cyan-300">
			{tagline}
		</p>
	{/if}
</div>
