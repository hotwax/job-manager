<template>
  <ion-select :interface-options="customPopoverOptions" interface="popover">
    <ion-select-option value="a">Every 5 minutes</ion-select-option>
    <ion-select-option value="b">Every 15 minutes</ion-select-option>
    <ion-select-option value="c">Hourly</ion-select-option>
    <ion-select-option value="d">Daily</ion-select-option>
    <ion-select-option value="e">Disabled</ion-select-option>
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
      header: 'Import new orders',
      showBackdrop: false
    };
    return {
      customPopoverOptions
    }
 }
});
</script>