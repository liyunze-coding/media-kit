<script lang="ts">
    type Props = {
        children: any;
        className: string;
        href: string;
        target?: string | null;
        rel?: string | null;
        color?: string | null;
    };
    let {
        children,
        className,
        href,
        target = "_blank",
        rel = "noreferrer",
        color = "purple",
    }: Props = $props();

    const accentColor = $derived(color?.trim() ? color : "purple");
</script>

<a
    {href}
    {target}
    {rel}
    class={`${className} card`}
    style:--primary-color={accentColor}
>
    {@render children?.()}
</a>

<style>
    .card {
        position: relative;
        border: 1px solid rgb(255 255 255 / 5%);
        border-radius: 1.5rem;
        padding: 1rem;
    }

    .card:after {
        content: "";
        height: 50px;
        width: 1px;
        position: absolute;
        left: -1px;
        top: 65%;
        transition: top, opacity;
        transition-duration: 600ms;
        transition-timing-function: ease;
        background: linear-gradient(
            transparent,
            var(--primary-color),
            transparent
        );
        opacity: 0;
    }

    .card:hover:after {
        top: 25%;
        opacity: 1;
    }

    @media (max-width: 700px) {
        .card {
            width: 100%;
            min-width: 0;
            margin: 0;
            padding: 0.75rem;
            border-radius: 1rem;
        }
    }
</style>
