<template>
  <img :src="imageUrl"/>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { mapGetters } from "vuex";

export default defineComponent({
  name: "Image",
  props: ['src'],
  computed: {
    ...mapGetters({
      baseUrl: "user/getBaseUrl"
    })
  },
  mounted() {
    this.setImageUrl();
  },
  updated() {
    this.setImageUrl();
  },
  data() {
    return {
      imageUrl: require("@/assets/images/defaultImage.png")
    }
  },
  methods: {
    checkIfImageExists(src: string) {
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
    },
    setImageUrl() {
      if (this.src) {
        if (this.src.indexOf('assets/') != -1) {
          // Assign directly in case of assets
          this.imageUrl = this.src;
        } else if (this.src.startsWith('http')) {
          // If starts with http, it is web url check for existence and assign
          this.checkIfImageExists(this.src).then(() => {
            this.imageUrl = this.src;
          }).catch(() => {
            this.$log.warn("Image doesn't exist", this.src);
          })
        } else {
          const imageUrl = this.baseUrl.replace("/api", "").concat(this.src)
          this.checkIfImageExists(imageUrl).then(() => {
            this.imageUrl = imageUrl;
          }).catch(() => {
            this.$log.warn("Image doesn't exist", imageUrl);
          })
        }
      }
    }
  },
});
</script>
