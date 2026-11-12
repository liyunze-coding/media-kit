<script lang="ts">
	let { about = "" }: { about?: string } = $props();
</script>

<div class="mt-5">
	<div
		class="mb-2 text-3xl font-bold text-neutral-900 sm:text-3xl dark:text-white"
	>
		About Me
	</div>
	<p class="wrap-break-word">
		{about}
	</p>
</div>
