<script lang="ts">
  import { onMount } from 'svelte'
  import { fetchMediaKit } from '../lib/api'
  import type { MediaKit } from '../lib/types'

  let data = $state<MediaKit | null>(null)
  let error = $state('')

  onMount(async () => {
    try {
      data = await fetchMediaKit()
    } catch (err) {
      error = err instanceof Error ? err.message : 'Something went wrong'
    }
  })

  const content = $derived(data?.content ?? {})
  const platforms = $derived(data?.platforms ?? [])
  const twitch = $derived(data?.twitch ?? null)
  const twitchLogin = $derived(twitch?.login ?? '')

  function formatCount(value: number | undefined | null): string {
    if (value == null) return '—'
    if (value >= 1_000_000) {
      const millions = value / 1_000_000
      return `${millions >= 100 ? Math.round(millions) : millions.toFixed(1).replace(/\.0$/, '')}M`
    }
    if (value >= 1_000) {
      const thousands = value / 1_000
      return `${thousands >= 100 ? Math.round(thousands) : thousands.toFixed(1).replace(/\.0$/, '')}K`
    }
    return value.toLocaleString()
  }
</script>

{#if error}
  <main class="mx-auto w-full max-w-[920px] px-6 pt-12 pb-[72px]">
    <div class="mt-6 rounded-[10px] bg-red-600/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
      {error}
    </div>
  </main>
{:else if !data}
  <main class="mx-auto w-full max-w-[920px] px-6 pt-12 pb-[72px]">
    <div class="py-8 text-gray-500 dark:text-gray-400">Loading…</div>
  </main>
{:else}
  <main class="mx-auto w-full max-w-[920px] px-6 pt-12 pb-[72px]">
    <header class="pt-6 pb-2">
      <p class="mb-3 text-xs font-semibold tracking-[0.14em] uppercase text-gray-500 dark:text-gray-400">
        Media kit
      </p>
      <h1 class="text-[clamp(36px,8vw,52px)] leading-[1.05] font-semibold tracking-tight">
        {content.brand_name ?? 'RythonDev'}
      </h1>
      {#if content.tagline}
        <p class="mt-4 text-xl text-gray-500 dark:text-gray-400">{content.tagline}</p>
      {/if}
    </header>

    <section class="mt-14 border-t border-gray-200 pt-8 dark:border-zinc-800">
      <h2 class="text-xl font-semibold tracking-tight">About</h2>
      <p class="mt-4 max-w-[640px] text-lg leading-relaxed text-gray-500 dark:text-gray-400">
        {content.about ?? ''}
      </p>
      {#if content.email}
        <a
          class="mt-4 inline-block text-violet-600 dark:text-violet-400"
          href="mailto:{content.email}">{content.email}</a
        >
      {/if}
    </section>

    <section class="mt-14 border-t border-gray-200 pt-8 dark:border-zinc-800">
      <h2 class="text-xl font-semibold tracking-tight">Twitch</h2>
      {#if twitch?.configured && twitch?.found}
        <div class="mt-6 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4">
          <div
            class="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-neutral-50 p-5 dark:border-zinc-800 dark:bg-neutral-900"
          >
            <span class="text-sm text-gray-500 dark:text-gray-400">Followers</span>
            <span class="text-3xl font-semibold tracking-tight">{formatCount(twitch?.followers)}</span>
          </div>
          <div
            class="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-neutral-50 p-5 dark:border-zinc-800 dark:bg-neutral-900"
          >
            <span class="text-sm text-gray-500 dark:text-gray-400">Status</span>
            <span
              class="text-3xl font-semibold tracking-tight {twitch?.live
                ? 'text-green-600 dark:text-green-400'
                : ''}"
            >
              {twitch?.live ? 'LIVE' : 'Offline'}
            </span>
          </div>
          {#if twitch?.live}
            <div
              class="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-neutral-50 p-5 dark:border-zinc-800 dark:bg-neutral-900"
            >
              <span class="text-sm text-gray-500 dark:text-gray-400">Viewers</span>
              <span class="text-3xl font-semibold tracking-tight">{formatCount(twitch?.viewer_count)}</span>
            </div>
          {/if}
        </div>

        {#if twitch?.live && twitch?.title}
          <p class="mt-5">
            {twitch.title}
            {#if twitch.game_name}
              <span class="text-gray-500 dark:text-gray-400">— {twitch.game_name}</span>
            {/if}
          </p>
        {/if}

        <a
          class="mt-6 inline-block rounded-[10px] bg-neutral-900 px-[18px] py-2.5 text-sm font-medium text-white dark:bg-neutral-50 dark:text-neutral-950"
          href="https://twitch.tv/{twitchLogin}"
          target="_blank"
          rel="noreferrer"
        >
          Watch on Twitch
        </a>
      {:else}
        <p class="text-gray-500 dark:text-gray-400">{twitch?.message ?? 'Twitch stats are unavailable.'}</p>
      {/if}
    </section>

    <section class="mt-14 border-t border-gray-200 pt-8 dark:border-zinc-800">
      <h2 class="text-xl font-semibold tracking-tight">Platforms</h2>
      <div class="mt-6 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        {#each platforms as platform (platform.name)}
          <a
            class="flex flex-col gap-1 rounded-2xl border border-gray-200 bg-neutral-50 p-5 transition-colors hover:border-violet-600 dark:border-zinc-800 dark:bg-neutral-900 dark:hover:border-violet-400"
            href={platform.url}
            target="_blank"
            rel="noreferrer"
          >
            <span class="text-sm font-semibold tracking-[0.08em] uppercase text-gray-500 dark:text-gray-400">
              {platform.name}
            </span>
            <span class="text-base">{platform.handle}</span>
            <span class="mt-2 text-2xl font-semibold tracking-tight">
              {formatCount(platform.followers)} followers
            </span>
          </a>
        {/each}
      </div>
    </section>

    <footer class="mt-16 border-t border-gray-200 pt-6 text-sm text-gray-500 dark:border-zinc-800 dark:text-gray-400">
      <a href="#/admin" class="hover:text-neutral-900 dark:hover:text-neutral-50">Admin</a>
    </footer>
  </main>
{/if}
