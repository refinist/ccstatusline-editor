<script setup lang="ts">
import { computed } from 'vue';

// One powerline separator / cap glyph, drawn as an SVG shape instead of the
// raw U+E0Bx character — those live in a private-use font area that needs a
// patched (Nerd/Powerline) font the visitor probably hasn't installed. The
// shape stretches to the full line height so it meets the adjacent segment
// backgrounds seamlessly, exactly like a terminal cell.
//   fill = the glyph itself (a segment's background color)
//   base = the color behind it (the neighbouring segment's background)
const props = defineProps<{ glyph: string; fill?: string; base?: string }>();

// Shapes in a 10×20 box, stretched (preserveAspectRatio="none") to 1ch × line
// height. Solid arrows are filled; the "thin" variants are stroked chevrons.
// Each solid shape's flat vertical edge must sit flush against the adjacent
// segment's background, but 1ch is almost never a whole device pixel, so that
// edge gets antialiased against whatever is *behind* the glyph and shows up
// as a hairline seam. The paths therefore overshoot the joining edge by 0.5
// units (0.05ch): the overdraw lands on the neighbouring segment, which is
// the same color, so it stays invisible while covering the seam. Requires
// overflow-visible on the <svg>.
const SHAPES: Record<string, { d: string; stroke?: boolean }> = {
  '\uE0B0': { d: 'M-0.5 0 L0 0 L10 10 L0 20 L-0.5 20 Z' }, // right solid triangle (joins left)
  '\uE0B2': { d: 'M10.5 0 L10 0 L0 10 L10 20 L10.5 20 Z' }, // left solid triangle (joins right)
  '\uE0B4': {
    d: 'M-0.5 0 L0 0 C6 0 10 4.5 10 10 C10 15.5 6 20 0 20 L-0.5 20 Z'
  }, // right half-circle (joins left)
  '\uE0B6': {
    d: 'M10.5 0 L10 0 C4 0 0 4.5 0 10 C0 15.5 4 20 10 20 L10.5 20 Z'
  }, // left half-circle (joins right)
  '\uE0B1': { d: 'M0.75 0 L9.25 10 L0.75 20', stroke: true }, // right thin chevron
  '\uE0B3': { d: 'M9.25 0 L0.75 10 L9.25 20', stroke: true }, // left thin chevron
  // Cap-only shapes (ccstatusline's start/end-cap presets):
  '\uE0B8': { d: 'M-0.5 0 L0 0 L10 20 L-0.5 20 Z' }, // lower-left triangle (end cap, joins left)
  '\uE0BA': { d: 'M0 20 L10 0 L10.5 0 L10.5 20 Z' }, // lower-right triangle (start cap, joins right)
  '\uE0BC': { d: 'M-0.5 0 L10 0 L0 20 L-0.5 20 Z' }, // upper-left triangle / diagonal (end cap, joins left)
  '\uE0BE': { d: 'M0 0 L10.5 0 L10.5 20 L10 20 Z' } // upper-right triangle / diagonal (start cap, joins right)
};
const shape = computed(() => SHAPES[props.glyph]);
</script>

<template>
  <span
    class="relative inline-flex shrink-0 items-center self-stretch whitespace-pre"
    :class="shape ? 'w-[1ch]' : ''"
    :style="base ? { backgroundColor: base } : undefined"
    aria-hidden="true"
  >
    <svg
      v-if="shape"
      class="absolute inset-0 h-full w-full overflow-visible"
      viewBox="0 0 10 20"
      preserveAspectRatio="none"
    >
      <path
        :d="shape.d"
        :fill="shape.stroke ? 'none' : (fill ?? 'currentColor')"
        :stroke="shape.stroke ? (fill ?? 'currentColor') : 'none'"
        stroke-width="1.5"
      />
    </svg>
    <!-- Unknown glyph string (custom cap chars, etc.) → render it as text. -->
    <span v-else :style="fill ? { color: fill } : undefined">{{ glyph }}</span>
  </span>
</template>
