<script lang="ts">
	let { services = "" }: { services?: string } = $props();

	let items = $derived(
		services
			.split("\n")
			.map((service) => service.trim())
			.filter(Boolean)
			.slice(0, 6),
	);
</script>

{#if items.length}
	<section class="w-full">
		<div class="mb-3 text-3xl font-bold text-white sm:text-3xl">
			Services
		</div>
		<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-x-8">
			<ul class="list-disc space-y-2 pl-5 marker:text-cyan-300">
				{#each items.slice(0, 3) as service}
					<li>{service}</li>
				{/each}
			</ul>
			<ul class="list-disc space-y-2 pl-5 marker:text-cyan-300">
				{#each items.slice(3, 6) as service}
					<li>{service}</li>
				{/each}
			</ul>
		</div>
	</section>
{/if}
