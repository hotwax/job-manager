<template>
  <ion-select :interface-options="customPopoverOptions" interface="popover">
    <ion-select-option value="brown">Every 5 minutes</ion-select-option>
    <ion-select-option value="blonde">Every 15 minutes</ion-select-option>
    <ion-select-option value="black">Hourly</ion-select-option>
    <ion-select-option value="red">Daily</ion-select-option>
    <ion-select-option value="red">Disabled</ion-select-option>
  </ion-select>
</template>

<script lang="ts">
import { IonSelect, IonSelectOption } from '@ionic/vue';
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'DurationPopover',
  components: {
    IonSelect,
    IonSelectOption
  },
 setup(){
    const customPopoverOptions: any = {
      header: 'Title',
      showBackdrop: false
    };
    return {
      customPopoverOptions
    }
 }
});
</script>
<style scoped>

</style>
