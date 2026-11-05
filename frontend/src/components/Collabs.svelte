<script lang="ts">
    import AnimatedTooltip from "./ui/AnimatedTooltip/AnimatedTooltip.svelte";

    const people = [
        {
            id: 1,
            name: "ProtonPass",
            image: "/images/collaborations/proton-pass.webp",
            url: "https://proton.me/pass",
        },
        {
            id: 2,
            name: "ProtonVPN",
            image: "/images/collaborations/proton-vpn.webp",
            url: "https://protonvpn.com/",
        },
        {
            id: 3,
            name: "Brick",
            image: "/images/collaborations/brick.webp",
            url: "https://getbrick.com/",
        },
        {
            id: 4,
            name: "Focumon",
            image: "/images/collaborations/focumon.webp",
            url: "https://www.focumon.com/landing",
        },
    ];
</script>

<AnimatedTooltip items={people} />
