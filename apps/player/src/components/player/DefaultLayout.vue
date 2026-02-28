<script setup lang="ts">
import BackwardIcon from '@/components/player/icons/BackwardIcon.vue'
import ForwardIcon from '@/components/player/icons/ForwardIcon.vue'
import PlayIcon from '@/components/player/icons/PlayIcon.vue'
</script>

<template>
  <div slot="centered-chrome" class="center">
    <media-play-button id="center">
      <PlayIcon />
    </media-play-button>
  </div>

  <media-control-bar>
    <div class="media-controls">
      <div class="media-time-controls">
        <media-time-range />
      </div>

      <div class="media-controls-details">
        <div>
          <media-play-button id="left">
            <PlayIcon />
          </media-play-button>
          <media-seek-backward-button seekoffset="10">
            <BackwardIcon />
          </media-seek-backward-button>
          <media-seek-forward-button seekoffset="10">
            <ForwardIcon />
          </media-seek-forward-button>
        </div>

        <div>
          <media-time-display showduration class="noselect" />
        </div>
      </div>
    </div>
  </media-control-bar>
</template>

<style scoped>
.center {
  width: 100%;
  height: 100%;
}

.media-controls {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: var(--size-2);
}

.media-controls-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.media-time-controls {
  display: flex;
  justify-content: space-between;
  width: 100%;
  height: var(--size-6);
}

.media-controls-details > div {
  display: flex;
  align-items: center;
  gap: var(--size-1);
}

.noselect {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}
</style>
