import { alertController } from "@ionic/vue";
import type { RouteLocationNormalized } from "vue-router";

import { translate } from "@common";
import { useDataDocumentGraphStore } from "@/store/dataDocumentGraph";
import { showToast } from "@/utils";

const DATA_DOCUMENT_BUILDER_ROUTES = ["DataDocumentGraphBuilder"];

// Kept outside the router registration so the Ionic outlet leave behavior can be
// exercised directly while every save still goes through the store's single-flight contract.
export const guardUnsavedDataDocumentGraph = async (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized
) => {
  const leavingBuilder = DATA_DOCUMENT_BUILDER_ROUTES.includes(from.name as string);
  const enteringSameDoc = DATA_DOCUMENT_BUILDER_ROUTES.includes(to.name as string) && to.params.id === from.params.id;
  if (!leavingBuilder || enteringSameDoc) return true;

  const graphStore = useDataDocumentGraphStore();
  const awaitGraphSave = async () => {
    try {
      await graphStore.saveGraph();
      return true;
    } catch (error) {
      showToast(translate("Failed to save data document graph."));
      return false;
    }
  };
  if (graphStore.isSaving) return awaitGraphSave();
  if (!graphStore.isDirty) return true;

  const alert = await alertController.create({
    header: translate("Unsaved changes"),
    message: translate("You have unsaved changes to this data document. Save them before leaving?"),
    buttons: [
      { text: translate("Cancel"), role: "cancel" },
      { text: translate("Discard"), role: "discard" },
      { text: translate("Save"), role: "save" }
    ]
  });
  await alert.present();
  const { role } = await alert.onDidDismiss();
  if (role === "save") return awaitGraphSave();
  if (role === "discard") {
    graphStore.discardDraft();
    return true;
  }
  return false;
};
