<script lang="ts">
	import type { Snippet } from "svelte";

	let {
		title,
		children,
		class: className = "",
	}: {
		title: string;
		children: Snippet;
		class?: string;
	} = $props();
</script>

<section class="w-full {className}">
	<h2
		class="mb-2 px-1 text-3xl font-bold tracking-tight text-neutral-900 dark:text-white"
	>
		{title}
	</h2>
	<div
		class="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_8px_30px_-12px_rgba(6,182,212,0.25)] dark:border-zinc-800 dark:bg-neutral-900 dark:shadow-black/40"
	>
		{@render children()}
	</div>
</section>
