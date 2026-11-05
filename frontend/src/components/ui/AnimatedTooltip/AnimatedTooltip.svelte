<script lang="ts">
    import {
        Motion,
        useTransform,
        AnimatePresence,
        useMotionValue,
        useSpring,
    } from "svelte-motion";

    export let items: {
        id: number;
        name: string;
        image: string;
        url: string;
    }[];

    let hoveredIndex: number | null = null;
    const springConfig = { stiffness: 100, damping: 5 };
    const x = useMotionValue(0); // going to set this value on mouse move
    // rotate the tooltip
    const rotate = useSpring(
        useTransform(x, [-100, 100], [-45, 45]),
        springConfig,
    );
    // translate the tooltip
    const translateX = useSpring(
        useTransform(x, [-100, 100], [-50, 50]),
        springConfig,
    );
    const handleMouseMove = (event: MouseEvent) => {
        // @ts-ignore
        const halfWidth = event.target?.offsetWidth / 2;
        x.set(event.offsetX - halfWidth); // set the x value, which is then used in transform and rotate
    };
</script>

<div class="group flex flex-row pl-2">
    {#each items as item, idx (item.name)}
        <div class="relative mr-5">
            <AnimatePresence show={true}>
                {#if hoveredIndex === item.id}
                    <Motion
                        let:motion
                        initial={{ opacity: 0, y: 20, scale: 0.6 }}
                        animate={{
                            opacity: 1,
                            y: 0,
                            scale: 1,
                            transition: {
                                type: "spring",
                                stiffness: 260,
                                damping: 10,
                            },
                        }}
                        exit={{ opacity: 0, y: 20, scale: 0.6 }}
                        style={{
                            translateX: translateX,
                            rotate: rotate,
                            whiteSpace: "nowrap",
                        }}
                    >
                        <div
                            use:motion
                            id="tooltip-{item.id}"
                            role="tooltip"
                            class="absolute left-1/2 -top-10 z-50 flex -translate-x-1/2 flex-col items-center justify-center rounded-md bg-gray-700 px-4 py-2 text-xs shadow-xl"
                        >
                            <div
                                class="absolute inset-x-10 -bottom-px z-30 h-px w-[20%] bg-linear-to-r from-transparent via-emerald-500 to-transparent"
                            ></div>
                            <div
                                class="absolute -bottom-px left-10 z-30 h-px w-[40%] bg-linear-to-r from-transparent via-sky-500 to-transparent"
                            ></div>
                            <div
                                class="relative z-30 whitespace-nowrap text-base font-bold text-white"
                            >
                                {item.name}
                            </div>
                        </div>
                    </Motion>
                {/if}
            </AnimatePresence>
            <a
                href={item.url}
                target="_blank"
                class="relative m-0 h-14 w-14 cursor-pointer rounded-full border-0 bg-transparent p-0 transition duration-500 group-hover:z-30 group-hover:scale-105"
                on:mousemove={handleMouseMove}
                on:mouseenter={() => (hoveredIndex = item.id)}
                on:mouseleave={() => (hoveredIndex = null)}
                on:focus={() => (hoveredIndex = item.id)}
                on:blur={() => (hoveredIndex = null)}
                aria-describedby={hoveredIndex === item.id
                    ? `tooltip-${item.id}`
                    : undefined}
            >
                <img
                    height={100}
                    width={100}
                    src={item.image}
                    alt={item.name}
                    class="m-0! h-10 w-10 rounded-lg object-cover object-top p-0!"
                />
            </a>
        </div>
    {/each}
</div>
