<script lang="ts">
	let { about = "" }: { about?: string } = $props();
</script>

<div class="mt-5">
	<div class="mb-2 text-3xl font-bold text-white sm:text-3xl">About Me</div>
	<p class="wrap-break-word">
		{about}
	</p>
</div>
