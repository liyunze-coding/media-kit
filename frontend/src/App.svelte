<script lang="ts">
  import Admin from './routes/Admin.svelte'
  import MediaKit from './routes/MediaKit.svelte'

  let route = $state(window.location.hash || '#/')

  function onHashChange() {
    route = window.location.hash || '#/'
  }
</script>

<svelte:window onhashchange={onHashChange} />

{#if route.startsWith('#/admin')}
  <Admin />
{:else}
  <MediaKit />
{/if}
