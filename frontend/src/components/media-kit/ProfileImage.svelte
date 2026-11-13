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
        class="aspect-square w-44 rounded-full object-cover shadow-lg sm:w-56 shadow-black/55 dark:shadow-cyan-300/50"
        {src}
        {alt}
        width="224"
        height="224"
    />
</div>
