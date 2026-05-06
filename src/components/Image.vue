<template>
  <img :src="imageUrl"/>
</template>

<script setup lang="ts">
import { onMounted, onUpdated } from "vue";
import defaultImgUrl from "../assets/images/defaultImage.png"
import { logger } from "@common";

let imageUrl = defaultImgUrl

const props = defineProps(["src"])

onMounted(() => {
  setImageUrl();
})

onUpdated(() => {
  setImageUrl();
})

function checkIfImageExists(src: string) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = function () {
      resolve(true);
    }
    img.onerror = function () {
      reject(false);
    }
    img.src = src;
  })
}
function setImageUrl() {
  if (props.src) {
    if (props.src.indexOf('assets/') != -1) {
      // Assign directly in case of assets
      imageUrl = props.src;
    } else if (props.src.startsWith('http')) {
      // If starts with http, it is web url check for existence and assign
      checkIfImageExists(props.src).then(() => {
        imageUrl = props.src;
      }).catch(() => {
        logger.warn("Image doesn't exist", props.src);
      })
    }
  }
}
</script>
