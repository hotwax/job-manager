<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/data-documents" />
        </ion-buttons>
        <ion-title>{{ translate("Graph Builder") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="saveGraph" :disabled="!graph || graphHasErrors">
            <ion-icon slot="start" :icon="saveOutline" />
            {{ translate("Save") }}
          </ion-button>
          <ion-button @click="queueExport" :disabled="!graph?.dataDocumentId">
            <ion-icon slot="start" :icon="cloudUploadOutline" />
            {{ translate("Export") }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main v-if="graphStore.status !== 'error'" class="graph-builder" :aria-busy="!graph" :aria-label="graph ? undefined : translate('Loading graph builder.')">
        <DataDocumentMetadata :summary="summary" @open-entity-modal="openEntityModal" @save="saveGraph" />

        <section class="graph-workspace">
          <section class="graph-canvas-panel">
            <div v-if="graph && hasPrimaryEntity" class="graph-canvas" :style="canvasStyle">
              <svg class="graph-edges" :viewBox="`0 0 ${canvasSize.width} ${canvasSize.height}`" preserveAspectRatio="none">
                <g v-for="edge in graph.edges" :key="edge.edgeId" class="graph-edge" @click="selectEdge(edge.edgeId)">
                  <line
                    :x1="getNodeCenter(edge.fromNodeId).x"
                    :y1="getNodeCenter(edge.fromNodeId).y"
                    :x2="getNodeCenter(edge.toNodeId).x"
                    :y2="getNodeCenter(edge.toNodeId).y"
                    :class="{ selected: selectedTarget.kind === 'edge' && selectedTarget.id === edge.edgeId }"
                  />
                  <text :x="getEdgeLabelPoint(edge).x" :y="getEdgeLabelPoint(edge).y">
                    {{ edge.alias || edge.relationshipTitle || edge.relationshipName }}
                  </text>
                </g>
              </svg>

              <button
                v-for="node in graph.nodes"
                :key="node.nodeId"
                type="button"
                class="graph-node"
                :class="{ primary: node.isPrimary, selected: selectedTarget.kind === 'node' && selectedTarget.id === node.nodeId }"
                :style="getNodeStyle(node.nodeId)"
                @click="selectNode(node.nodeId)"
              >
                <span>{{ node.label }}</span>
                <small>{{ node.entityName }}</small>
                <strong>{{ node.fieldCount }} {{ translate("fields") }}</strong>
                <strong v-if="node.conditionCount">{{ node.conditionCount }} {{ translate("conditions") }}</strong>
              </button>
            </div>
            <div v-else-if="graph" class="empty-state graph-empty-state hydrate">
              <ion-icon :icon="gitBranchOutline" color="medium" size="large" />
              <p><strong>{{ translate("Start with a primary entity") }}</strong></p>
              <p>{{ translate("Every data document is built from one entity. Choose it to start adding fields and conditions.") }}</p>
              <ion-button @click="openEntityModal">
                {{ translate("Select Entity") }}
              </ion-button>
            </div>
            <div v-else class="graph-canvas" :style="canvasStyle" aria-hidden="true">
              <div class="graph-node primary graph-node-ghost" :style="ghostNodeStyle">
                <span v-if="ghostLabel">{{ ghostLabel }}</span>
                <ion-skeleton-text v-else :animated="true" style="width: 70%" />
                <small v-if="summary?.primaryEntityName">{{ summary.primaryEntityName }}</small>
                <ion-skeleton-text v-else :animated="true" style="width: 90%" />
                <ion-skeleton-text :animated="true" style="width: 40%" />
              </div>
            </div>
          </section>

          <aside class="graph-inspector" :class="{ hydrate: graph }" :aria-busy="!graph">
            <SkeletonList v-if="!graph" :rows="4" />
            <ion-list v-else-if="!hasPrimaryEntity">
              <ion-item>
                <ion-label class="ion-text-wrap">
                  {{ translate("Nothing to configure yet") }}
                  <p>{{ translate("The inspector shows the selected node, relationship or field once a primary entity is chosen.") }}</p>
                </ion-label>
              </ion-item>
            </ion-list>
            <ion-list v-else-if="selectedNode">
              <ion-item-divider color="light">
                <ion-label>{{ translate("Entity") }}</ion-label>
              </ion-item-divider>
              <ion-item>
                <ion-label>
                  {{ selectedNode.label }}
                  <p>{{ selectedNode.entityName }}</p>
                  <p>{{ selectedNode.relationshipType || translate("unknown") }}</p>
                </ion-label>
              </ion-item>
              <ion-item-divider color="light">
                <ion-label>{{ translate("Configure entity") }}</ion-label>
              </ion-item-divider>
              <ion-item button @click="openRelatedFieldModal">
                <ion-icon slot="start" :icon="gitBranchOutline" />
                <ion-label>
                  {{ translate("Add related field") }}
                  <p>{{ translate("Create a related node from a relationship path.") }}</p>
                </ion-label>
              </ion-item>
              <ion-item-divider color="light">
                <ion-label>{{ translate("Fields") }}</ion-label>
                <ion-button fill="clear" slot="end" @click="openGraphFieldModal">
                  <ion-label>{{ translate("Add") }}</ion-label>
                  <ion-icon :icon="addOutline" />
                </ion-button>
              </ion-item-divider>
              <ion-item v-for="field in selectedNodeFields" :key="field.fieldSeqId || field.fieldPath" button @click="selectField(field.fieldSeqId || field.fieldPath)">
                <ion-label>
                  {{ field.outputName }}
                  <p>{{ field.fieldPath }}</p>
                </ion-label>
                <ion-badge v-if="field.functionName" slot="end" color="tertiary">{{ functionLabel(field.functionName) }}</ion-badge>
                <ion-badge v-if="getFieldConditionCount(field)" slot="end" color="warning">
                  <ion-icon :icon="filterOutline" />
                  {{ getFieldConditionCount(field) }}
                </ion-badge>
              </ion-item>
            </ion-list>

            <ion-list v-else-if="selectedEdge">
              <ion-item-divider color="light">
                <ion-label>{{ translate("Relationship") }}</ion-label>
              </ion-item-divider>
              <ion-item>
                <ion-label>
                  {{ selectedEdge.alias || selectedEdge.relationshipName }}
                  <p>{{ selectedEdge.pathText }}</p>
                  <p>{{ selectedEdge.relationshipType }}</p>
                </ion-label>
              </ion-item>
            </ion-list>

            <ion-list v-else-if="selectedField">
              <ion-item-divider color="light">
                <ion-label>{{ translate("Field") }}</ion-label>
              </ion-item-divider>
              <ion-item>
                <ion-input
                  :value="selectedField.fieldPath"
                  :label="translate('Field Path')"
                  label-placement="stacked"
                  @ionInput="updateSelectedField({ fieldPath: $event.detail.value || '' })"
                />
              </ion-item>
              <ion-item>
                <ion-input
                  :value="selectedField.fieldNameAlias"
                  :label="translate('Alias')"
                  label-placement="stacked"
                  @ionInput="updateSelectedField({ fieldNameAlias: $event.detail.value || '' })"
                />
              </ion-item>
              <ion-item>
                <ion-input
                  :value="selectedField.sequenceNum"
                  type="number"
                  :label="translate('Sequence')"
                  label-placement="stacked"
                  @ionInput="updateSelectedField({ sequenceNum: Number($event.detail.value || 0) })"
                />
              </ion-item>
              <ion-item>
                <ion-toggle
                  :checked="selectedField.sortable === 'Y'"
                  @ionChange="updateSelectedField({ sortable: $event.detail.checked ? 'Y' : 'N' })"
                >
                  {{ translate("Sortable") }}
                </ion-toggle>
              </ion-item>
              <ion-item>
                <ion-toggle
                  :checked="selectedField.defaultDisplay !== 'N'"
                  @ionChange="updateSelectedField({ defaultDisplay: $event.detail.checked ? 'Y' : 'N' })"
                >
                  {{ translate("Display") }}
                </ion-toggle>
              </ion-item>
              <ion-item lines="none">
                <ion-segment :value="fieldRole(selectedField)" @ionChange="setFieldRole($event.detail.value)">
                  <ion-segment-button value="dimension">
                    <ion-label>{{ translate("Dimension") }}</ion-label>
                  </ion-segment-button>
                  <ion-segment-button value="measure">
                    <ion-label>{{ translate("Measure") }}</ion-label>
                  </ion-segment-button>
                </ion-segment>
              </ion-item>
              <ion-item v-if="selectedField.functionName">
                <ion-select
                  :label="translate('Aggregation')"
                  label-placement="stacked"
                  interface="popover"
                  :value="selectedField.functionName"
                  @ionChange="updateSelectedField({ functionName: $event.detail.value })"
                >
                  <ion-select-option v-for="fn in dataDocumentFunctions" :key="fn.value" :value="fn.value">
                    {{ translate(fn.label) }}
                  </ion-select-option>
                </ion-select>
              </ion-item>
              <ion-item v-if="selectedField.functionName" lines="none">
                <ion-note class="ion-text-wrap">
                  {{ translate("Aggregated across rows. Fields without a measure group the results.") }}
                </ion-note>
              </ion-item>
              <ion-item-divider color="light">
                <ion-label>{{ translate("Conditions") }}</ion-label>
                <ion-button fill="clear" slot="end" @click="openConditionModal">
                  <ion-label>{{ translate("Add") }}</ion-label>
                  <ion-icon :icon="addOutline" />
                </ion-button>
              </ion-item-divider>
              <ion-item
                v-for="condition in selectedFieldConditions"
                :key="condition.conditionSeqId || condition.fieldNameAlias"
                button
                @click="openCondition(condition)"
              >
                <ion-icon slot="start" :icon="filterOutline" color="warning" />
                <ion-label>
                  {{ getConditionExpression(condition) }}
                  <p v-if="getConditionValue(condition) !== ''">{{ translate("Field Value") }}: {{ getConditionValue(condition) }}</p>
                  <p v-if="condition.toFieldNameAlias">{{ translate("To Field") }}: {{ condition.toFieldNameAlias }}</p>
                  <p v-if="condition.postQuery">{{ translate("Post Query") }}: {{ condition.postQuery }}</p>
                </ion-label>
              </ion-item>
              <p class="empty-state" v-if="!selectedFieldConditions.length">
                {{ translate("No conditions") }}
              </p>
            </ion-list>

            <ion-list v-else>
              <ion-item>
                <ion-label>
                  {{ translate("Select a node, edge, or field") }}
                  <p>{{ translate("The inspector edits the selected graph element.") }}</p>
                </ion-label>
              </ion-item>
            </ion-list>
          </aside>
        </section>

        <section class="graph-bottom">
          <ion-segment scrollable :value="bottomPanel" @ionChange="setSegment(String($event.detail.value || 'issues'))">
            <ion-segment-button value="issues" layout="icon-start">
              <ion-icon :icon="warningOutline" />
              <ion-label>{{ tabLabel("Issues", graph ? panelIssues.length : undefined) }}</ion-label>
            </ion-segment-button>
            <ion-segment-button value="fields" layout="icon-start">
              <ion-icon :icon="listOutline" />
              <ion-label>{{ tabLabel("Fields", graph?.fields.length) }}</ion-label>
            </ion-segment-button>
            <ion-segment-button value="conditions" layout="icon-start">
              <ion-icon :icon="filterOutline" />
              <ion-label>{{ tabLabel("Conditions", graph?.conditions.length) }}</ion-label>
            </ion-segment-button>
            <ion-segment-button value="preview" layout="icon-start">
              <ion-icon :icon="playOutline" />
              <ion-label>{{ translate("Preview") }}</ion-label>
            </ion-segment-button>
            <ion-segment-button value="usage" layout="icon-start">
              <ion-icon :icon="gitBranchOutline" />
              <ion-label>{{ translate("Usage") }}</ion-label>
            </ion-segment-button>
            <ion-segment-button value="exports" layout="icon-start">
              <ion-icon :icon="cloudDownloadOutline" />
              <ion-label>{{ tabLabel("Recent Exports", exportHistoryStatus === "ready" ? exportHistory.length : undefined) }}</ion-label>
            </ion-segment-button>
          </ion-segment>

          <SkeletonList v-if="bottomPanelLoading" />
          <ion-list v-else-if="bottomPanel === 'issues'" class="hydrate">
            <ion-item v-for="issue in panelIssues" :key="issue.code + issue.targetId">
              <ion-label>
                {{ issue.severity }}
                <p>{{ issue.message }}</p>
              </ion-label>
              <ion-button
                v-if="issue.code === 'unsaved_changes'"
                slot="end"
                fill="clear"
                :disabled="graphHasErrors"
                @click="saveGraph"
              >
                <ion-icon slot="start" :icon="saveOutline" />
                {{ translate("Save") }}
              </ion-button>
            </ion-item>
            <ion-item v-if="!panelIssues.length">
              <ion-label>{{ translate("No validation issues.") }}</ion-label>
            </ion-item>
          </ion-list>

          <div v-else-if="bottomPanel === 'fields'" class="fields-form hydrate">
            <DataDocumentFormView embedded />
          </div>

          <ion-list v-else-if="bottomPanel === 'conditions'" class="hydrate">
            <ion-item
              v-for="condition in graph?.conditions"
              :key="condition.conditionSeqId || condition.fieldNameAlias"
              button
              @click="openCondition(condition)"
            >
              <ion-icon slot="start" :icon="filterOutline" />
              <ion-label>
                {{ getConditionExpression(condition) }}
                <p>{{ translate("Target") }}: {{ getConditionTargetLabel(condition) }}</p>
                <p v-if="getConditionValue(condition) !== ''">{{ translate("Field Value") }}: {{ getConditionValue(condition) }}</p>
                <p v-if="condition.toFieldNameAlias">{{ translate("To Field") }}: {{ condition.toFieldNameAlias }}</p>
                <p v-if="condition.postQuery">{{ translate("Post Query") }}: {{ condition.postQuery }}</p>
              </ion-label>
              <ion-button
                slot="end"
                fill="clear"
                color="danger"
                :aria-label="translate('Remove condition')"
                @click.stop="removeCondition(condition)"
              >
                <ion-icon slot="icon-only" :icon="trashOutline" />
              </ion-button>
            </ion-item>
            <p v-if="!graph?.conditions.length" class="empty-state">
              {{ translate("No conditions") }}
            </p>
          </ion-list>

          <div v-else-if="bottomPanel === 'preview'" class="preview-panel hydrate">
            <ion-list>
              <ion-item lines="none">
                <ion-button @click="runPreview" :disabled="!graph?.dataDocumentId || previewStatus === 'loading'">
                  <ion-spinner v-if="previewStatus === 'loading'" slot="start" name="crescent" />
                  <ion-icon v-else slot="start" :icon="playOutline" />
                  {{ previewStatus === 'loading' ? translate("Running...") : translate("Preview") }}
                </ion-button>
                <ion-input
                  slot="end"
                  type="number"
                  fill="outline"
                  :label="translate('Rows')"
                  label-placement="stacked"
                  :value="pageSize"
                  min="1"
                  class="preview-rows-input"
                  @ionInput="pageSize = Math.max(1, Number($event.detail.value) || 25)"
                />
              </ion-item>

              <ion-item v-if="previewStatus === 'loading'" lines="none">
                <ion-spinner slot="start" name="crescent" />
                <ion-label>{{ translate("Running preview against the saved document...") }}</ion-label>
              </ion-item>
              <ion-item v-else-if="previewStatus === 'error'" lines="none">
                <ion-icon slot="start" :icon="alertCircleOutline" color="danger" />
                <ion-label class="ion-text-wrap">
                  {{ translate("Preview failed") }}
                  <p>{{ previewError }}</p>
                </ion-label>
              </ion-item>
              <ion-item v-else-if="previewStatus === 'success'" lines="none">
                <ion-icon slot="start" :icon="previewRows.length ? checkmarkCircleOutline : informationCircleOutline" :color="previewRows.length ? 'success' : 'medium'" />
                <ion-label class="ion-text-wrap">
                  <template v-if="!previewRows.length">{{ translate("No rows matched this query.") }}</template>
                  <template v-else-if="previewCapped">{{ translate("Showing the first") }} {{ previewRows.length }} {{ translate("rows (preview cap) — run an export for the full result.") }}</template>
                  <template v-else>{{ previewRows.length }} {{ translate("records") }}</template>
                </ion-label>
              </ion-item>
            </ion-list>

            <DataDocumentPreviewTable
              v-if="previewRows.length"
              :rows="previewRows"
              :file-name="graph?.dataDocumentId"
              can-export
              @run-export="queueExport"
            />

            <div class="schedule-section">
              <ion-button expand="block" fill="outline" :disabled="!graph?.dataDocumentId" @click="openScheduleModal">
                <ion-icon slot="start" :icon="timeOutline" />
                {{ translate("Schedule email export") }}
              </ion-button>
              <ion-list v-if="scheduledExports.length" class="hydrate">
                <ion-list-header>{{ translate("Scheduled email exports") }}</ion-list-header>
                <ion-item v-for="job in scheduledExports" :key="job.jobName">
                  <ion-label>
                    {{ job.toEmailAddress || job.jobName }}
                    <p>{{ job.cronDescription || job.cronExpression }}</p>
                    <p v-if="job.nextExecutionDateTime">{{ translate("Next") }}: {{ getDateAndTime(job.nextExecutionDateTime) }}</p>
                    <p v-if="job.paused === 'Y'"><ion-text color="warning">{{ translate("Paused") }}</ion-text></p>
                  </ion-label>
                  <ion-button slot="end" fill="clear" :aria-label="translate('Pause or resume schedule')" @click="togglePause(job)">
                    <ion-icon slot="icon-only" :icon="job.paused === 'Y' ? playOutline : pauseOutline" />
                  </ion-button>
                </ion-item>
              </ion-list>
              <SkeletonList v-else-if="scheduledExportsStatus === 'loading'" :rows="1" />
            </div>
          </div>

          <ion-list v-else-if="bottomPanel === 'usage'" class="hydrate">
            <ion-item-divider color="light">
              <ion-label>{{ translate("Related feeds") }}</ion-label>
            </ion-item-divider>
            <ion-item
              v-for="feed in relatedFeeds"
              :key="feed.dataFeedId || feed.dataDocumentId"
              button
              @click="openFeed(feed)"
            >
              <ion-label>{{ feed.dataFeedId || feed.feedName || feed.dataDocumentId }}</ion-label>
            </ion-item>
            <ion-item v-if="!relatedFeeds.length">
              <ion-label>{{ translate("No related feeds.") }}</ion-label>
            </ion-item>
            <ion-item-divider color="light">
              <ion-label>{{ translate("Related jobs") }}</ion-label>
            </ion-item-divider>
            <ion-item v-for="job in relatedJobs" :key="job.jobName || job.jobId">
              <ion-label>{{ job.jobName || job.jobId }}</ion-label>
            </ion-item>
            <ion-item v-if="!relatedJobs.length">
              <ion-label>{{ translate("No related jobs.") }}</ion-label>
            </ion-item>
          </ion-list>

          <template v-else>
            <ion-item lines="none">
              <ion-note class="ion-padding-top ion-text-wrap">
                {{ translate("Exports run the full document (with its conditions) and include up to 10,000 rows.") }}
              </ion-note>
            </ion-item>
            <SkeletonList v-if="exportHistoryStatus === 'loading'" />
            <DataDocumentExportList
              v-else
              class="hydrate"
              :messages="exportHistory"
              :empty-message="exportHistoryStatus === 'error' ? translate('Could not load recent exports.') : translate('No recent exports.')"
            />
            <ion-list>
              <ion-item button @click="router.push('/data-document-export-history')">
                <ion-label>{{ translate("View export history") }}</ion-label>
              </ion-item>
            </ion-list>
          </template>
        </section>
      </main>

      <ion-card v-else>
        <ion-card-content>
          <ion-text color="danger">
            {{ translate("Failed to load this data document.") }}
          </ion-text>
          <ion-button fill="clear" @click="retryLoad">
            {{ translate("Retry") }}
          </ion-button>
        </ion-card-content>
      </ion-card>

      <ion-modal ref="entityModal">
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button @click="closeEntityModal">
                <ion-icon slot="icon-only" :icon="closeOutline" />
              </ion-button>
            </ion-buttons>
            <ion-title>{{ translate("Select Primary Entity") }}</ion-title>
          </ion-toolbar>
          <ion-toolbar>
            <ion-searchbar
              ref="entitySearchbar"
              v-model="entityQueryString"
              :placeholder="translate('Search entities')"
              role="combobox"
              aria-expanded="true"
              :aria-controls="entityPickerNavigation.listId"
              :aria-activedescendant="entityPickerNavigation.activeDescendant.value"
              @keydown="entityPickerNavigation.handleInputKeydown"
            />
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <ion-radio-group :value="graph?.metadata.primaryEntityName">
            <ion-list :id="entityPickerNavigation.listId" role="listbox">
              <template v-for="entityGroup in groupedEntities" :key="entityGroup.packageName">
                <ion-item-divider color="light">
                  <ion-label>{{ entityGroup.packageName }}</ion-label>
                </ion-item-divider>
                <ion-item
                  v-for="entity in entityGroup.entities"
                  :key="getEntityValue(entity)"
                  v-bind="entityPickerNavigation.getItemAttributes(entity, getEntityKeyboardIndex(entity))"
                  :ref="(element) => entityPickerNavigation.setItemRef(getEntityKeyboardIndex(entity), element)"
                  button
                  @click="selectEntity(getEntityValue(entity))"
                  @keydown="entityPickerNavigation.handleItemKeydown($event, getEntityKeyboardIndex(entity))"
                >
                  <ion-radio :value="getEntityValue(entity)" label-placement="end" justify="start">{{ getEntityLabel(entity) }}</ion-radio>
                </ion-item>
              </template>
            </ion-list>
          </ion-radio-group>
        </ion-content>
      </ion-modal>

      <DataDocumentFieldPicker
        v-model:is-open="fieldPickerOpen"
        :entity-name="activeFieldEntityName"
        @confirm="addGraphFields"
      />

      <ion-modal ref="relatedFieldModal">
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button @click="closeRelatedFieldModal">
                <ion-icon slot="icon-only" :icon="closeOutline" />
              </ion-button>
            </ion-buttons>
            <ion-title>{{ translate("Add Related Field") }}</ion-title>
          </ion-toolbar>
          <ion-progress-bar :value="relatedFieldProgress" />
          <ion-toolbar v-if="relatedFieldStep !== 'confirm'">
            <ion-searchbar
              ref="relatedFieldSearchbar"
              v-model="relatedFieldQueryString"
              :placeholder="relatedFieldStep === 'relationship' ? translate('Search relationships') : translate('Search fields')"
              role="combobox"
              aria-expanded="true"
              :aria-controls="relatedFieldPickerNavigation.listId"
              :aria-activedescendant="relatedFieldPickerNavigation.activeDescendant.value"
              @keydown="relatedFieldPickerNavigation.handleInputKeydown"
            />
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <ion-list v-if="relatedFieldStep === 'relationship'" :id="relatedFieldPickerNavigation.listId" role="listbox">
            <ion-item-divider color="light">
              <ion-label>
                {{ translate("Select related entity") }}
                <p>{{ translate("Choose the relationship that reaches the entity you want to query.") }}</p>
              </ion-label>
            </ion-item-divider>
            <ion-item
              v-for="relationship in filteredActiveEntityRelationships"
              :key="relationship.relationshipName"
              v-bind="relatedFieldPickerNavigation.getItemAttributes(getRelatedFieldPickerOption('relationship', relationship.relationshipName), getRelatedFieldPickerIndex('relationship', relationship.relationshipName))"
              :ref="(element) => relatedFieldPickerNavigation.setItemRef(getRelatedFieldPickerIndex('relationship', relationship.relationshipName), element)"
              button
              @click="selectRelationship(relationship)"
              @keydown="relatedFieldPickerNavigation.handleItemKeydown($event, getRelatedFieldPickerIndex('relationship', relationship.relationshipName))"
            >
              <ion-label>
                {{ relationship.title || relationship.relationshipName }}
                <p>{{ relationship.relationshipName }}</p>
                <p>{{ relationship.relatedEntityName }} · {{ relationship.type || translate("unknown") }}</p>
              </ion-label>
            </ion-item>
            <ion-item v-if="!filteredActiveEntityRelationships.length">
              <ion-label>
                {{ translate("No relationships loaded") }}
                <p>{{ translate("No relationship metadata is available for this entity.") }}</p>
              </ion-label>
            </ion-item>
          </ion-list>

          <ion-list v-else-if="relatedFieldStep === 'confirm'">
            <ion-item-divider color="light">
              <ion-label>
                {{ translate("Confirm relationship") }}
                <p>{{ translate("Review the target entity and generated path before choosing fields.") }}</p>
              </ion-label>
            </ion-item-divider>
            <ion-item v-if="selectedRelationship">
              <ion-label>
                {{ selectedRelationship.title || selectedRelationship.relationshipName }}
                <p>{{ selectedRelationship.relationshipName }}</p>
                <p>{{ selectedRelationship.relatedEntityName }} · {{ selectedRelationship.type || translate("unknown") }}</p>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-input
                v-model="relatedRelationshipPath"
                :label="translate('Relationship Path')"
                label-placement="stacked"
                :placeholder="translate('product or orderHeader:statusItem')"
              />
            </ion-item>
            <ion-item>
              <ion-input
                v-model="relatedEntityName"
                :label="translate('Target Entity')"
                label-placement="stacked"
                :placeholder="translate('Select a relationship first')"
                @ionInput="fetchRelatedEntityFields"
              />
            </ion-item>
            <ion-item>
              <ion-label>
                {{ translate("Generated path") }}
                <p>{{ relatedRelationshipPath || translate("Enter a relationship path, then choose a field.") }}</p>
              </ion-label>
            </ion-item>
            <ion-item v-if="selectedRelationship">
              <ion-label>
                {{ translate("Join") }}
                <p>{{ selectedRelationshipJoinSummary }}</p>
              </ion-label>
            </ion-item>
            <ion-item lines="none">
              <ion-button fill="clear" @click="relatedFieldStep = 'relationship'">{{ translate("Back") }}</ion-button>
              <ion-button slot="end" :disabled="!relatedRelationshipPath || !relatedEntityName" @click="confirmRelatedFieldPath">
                {{ translate("Choose fields") }}
              </ion-button>
            </ion-item>
          </ion-list>

          <div v-if="relatedFieldStep === 'fields' && utilStore.getFetchStatus.entityFields === 'pending'" class="ion-text-center ion-padding">
            <ion-spinner name="crescent" />
            <p>{{ translate("Fetching fields...") }}</p>
          </div>
          <template v-else-if="relatedFieldStep === 'fields'">
            <ion-item button lines="full" @click="relatedFieldStep = 'confirm'">
              <ion-icon slot="start" :icon="arrowBackOutline" />
              <ion-label>
                {{ relatedEntityName }}
                <p>{{ relatedRelationshipPath }}</p>
              </ion-label>
            </ion-item>
            <ion-list :id="relatedFieldPickerNavigation.listId" role="listbox">
            <ion-item-divider color="light">
              <ion-label>
                {{ translate("Choose fields") }}
                <p>{{ translate("Select one or more fields to add to the data document.") }}</p>
              </ion-label>
            </ion-item-divider>
            <ion-item
              v-for="field in filteredRelatedEntityFields"
              :key="field.fieldName"
              v-bind="relatedFieldPickerNavigation.getItemAttributes(getRelatedFieldPickerOption('field', field.fieldName), getRelatedFieldPickerIndex('field', field.fieldName))"
              :ref="(element) => relatedFieldPickerNavigation.setItemRef(getRelatedFieldPickerIndex('field', field.fieldName), element)"
              @keydown="relatedFieldPickerNavigation.handleItemKeydown($event, getRelatedFieldPickerIndex('field', field.fieldName))"
            >
              <ion-checkbox
                :checked="selectedRelatedFieldNames.includes(field.fieldName)"
                @ionChange="toggleRelatedField(field.fieldName, $event.detail.checked)"
              >
                <ion-label>
                  {{ field.fieldName }}
                  <p>{{ [relatedRelationshipPath, field.fieldName].filter(Boolean).join(":") }}</p>
                  <p v-if="field.description">{{ field.description }}</p>
                </ion-label>
              </ion-checkbox>
            </ion-item>
            <ion-item v-if="relatedEntityName && !filteredRelatedEntityFields.length">
              <ion-label class="ion-text-center">
                <p>{{ translate("No fields found for this entity.") }}</p>
              </ion-label>
            </ion-item>
          </ion-list>
          </template>
        </ion-content>
        <ion-footer v-if="relatedFieldStep === 'fields'">
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button fill="clear" @click="relatedFieldStep = 'confirm'">{{ translate("Back") }}</ion-button>
            </ion-buttons>
            <ion-buttons slot="end">
              <ion-button :strong="true" :disabled="!selectedRelatedFieldNames.length" @click="confirmRelatedFieldSelection">
                {{ selectedRelatedFieldNames.length ? `${translate("Save")} (${selectedRelatedFieldNames.length})` : translate("Save") }}
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-footer>
      </ion-modal>

      <ion-modal ref="conditionModal" @willDismiss="conditionSubmitted = false">
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button @click="closeConditionModal()">
                <ion-icon slot="icon-only" :icon="closeOutline" />
              </ion-button>
            </ion-buttons>
            <ion-title>{{ isEditingCondition ? translate("Edit Condition") : translate("Add Condition") }}</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <ion-list v-if="activeCondition" class="condition-fields">
            <ion-input
              v-model="activeCondition.fieldNameAlias"
              :label="translate('Field Alias')"
              label-placement="floating"
              fill="outline"
            />
            <ion-select
              v-model="activeCondition.operator"
              :label="translate('Operator')"
              label-placement="floating"
              fill="outline"
              interface="popover"
            >
              <ion-select-option v-for="operator in operators" :key="operator.value" :value="operator.value">
                {{ translate(operator.label) }}
              </ion-select-option>
            </ion-select>
            <ion-select
              v-if="activeConditionValueOptions"
              :value="activeCondition.fieldValue"
              :label="translate('Value')"
              :placeholder="activeConditionValueOptions.label || translate('Select value')"
              label-placement="floating"
              fill="outline"
              interface="popover"
              :class="{ 'ion-invalid ion-touched': conditionSubmitted && isOperatorValueInvalid }"
              :error-text="translate('Value is required')"
              @ionChange="activeCondition.fieldValue = $event.detail.value ?? ''"
            >
              <ion-select-option
                v-for="option in activeConditionValueOptions.options"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </ion-select-option>
            </ion-select>
            <ion-input
              v-else
              :value="activeCondition.fieldValue"
              :label="translate('Value')"
              label-placement="floating"
              fill="outline"
              :class="{ 'ion-invalid ion-touched': conditionSubmitted && isOperatorValueInvalid }"
              :error-text="translate('Value is required')"
              @ionInput="activeCondition.fieldValue = $event.detail.value || ''"
            />
            <ion-input
              v-model="activeCondition.toFieldNameAlias"
              :label="translate('To Field Alias')"
              label-placement="floating"
              fill="outline"
            />
            <ion-select
              v-model="activeCondition.postQuery"
              :label="translate('Post Query')"
              label-placement="floating"
              fill="outline"
              interface="popover"
            >
              <ion-select-option value="N">
                {{ translate("N") }}
              </ion-select-option>
              <ion-select-option value="Y">
                {{ translate("Y") }}
              </ion-select-option>
            </ion-select>
          </ion-list>

          <ion-fab slot="fixed" vertical="bottom" horizontal="end">
            <ion-fab-button
              :aria-label="isEditingCondition ? translate('Save changes') : translate('Add')"
              @click="closeConditionModal(true)"
            >
              <ion-icon :icon="saveOutline" />
            </ion-fab-button>
          </ion-fab>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCheckbox,
  IonContent,
  IonFab,
  IonFabButton,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonPage,
  IonProgressBar,
  IonRadio,
  IonRadioGroup,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonSkeletonText,
  IonSpinner,
  IonListHeader,
  IonText,
  IonTitle,
  IonToggle,
  IonToolbar,
  alertController,
  modalController,
  onIonViewDidLeave,
  onIonViewWillEnter
} from "@ionic/vue";
import { addOutline, alertCircleOutline, arrowBackOutline, checkmarkCircleOutline, closeOutline, cloudDownloadOutline, cloudUploadOutline, filterOutline, gitBranchOutline, informationCircleOutline, listOutline, trashOutline, pauseOutline, playOutline, saveOutline, statsChartOutline, timeOutline, warningOutline } from "ionicons/icons";
import { computed, ref, watch } from "vue";
import router from "../router"

import { commonUtil, translate } from "@common";
import { useDataDocumentGraphStore } from "@/store/dataDocumentGraph";
import { useDataDocumentStore } from "@/store/dataDocuments";
import DataDocumentExportList from "@/components/DataDocumentExportList.vue";
import DataDocumentFieldPicker from "@/components/DataDocumentFieldPicker.vue";
import DataDocumentMetadata from "@/components/DataDocumentMetadata.vue";
import DataDocumentPreviewTable from "@/components/DataDocumentPreviewTable.vue";
import ScheduleEmailExportModal from "@/components/ScheduleEmailExportModal.vue";
import SkeletonList from "@/components/SkeletonList.vue";
import DataDocumentFormView from "@/views/DataDocumentFormView.vue";
import { getDateAndTime, showToast } from "@/utils";
import { useUtilStore } from "@/store/util";
import { getConditionValueOptionSource } from "@/utils/conditionValueOptions";
import type { GraphCondition, GraphEdge, GraphField } from "@/utils/dataDocumentGraph";
import { DATA_DOCUMENT_FUNCTIONS, getDataDocumentFunctionLabel, getLabel, isConditionValueMissing } from "@/utils/dataDocumentGraph";
import { getEntityLabel, getEntitySearchText, getEntityValue, groupEntityOptions } from "@/utils/entityOptions";
import type { EntityOption } from "@/utils/entityOptions";
import { useKeyboardListNavigation } from "@/utils/keyboardListNavigation";

const route = router.currentRoute.value;
const graphStore = useDataDocumentGraphStore();
const dataDocumentStore = useDataDocumentStore();
const utilStore = useUtilStore();

const selectedTarget = ref<{ kind: "node" | "edge" | "field"; id: string }>({ kind: "node", id: "node:root" });
const selectedFields = ref<string[]>([]);
const SEGMENT_VALUES = ["issues", "fields", "conditions", "preview", "usage", "exports"];
const bottomPanel = ref("issues");
const pageSize = ref(25);

// Switch the active segment and reflect it in the URL (?segment=) so the catalog deep-links
// (Run→preview, History→exports), refresh, and the post-save redirect stay in sync. A
// query-only replace does not re-run onIonViewWillEnter, so it won't refetch the graph.
const setSegment = (segment: string) => {
  bottomPanel.value = SEGMENT_VALUES.includes(segment) ? segment : "issues";
  router.replace({ query: { ...router.currentRoute.value.query, segment: bottomPanel.value } });
};
const entityModal = ref();
const entitySearchbar = ref();
const entityQueryString = ref("");
const fieldPickerOpen = ref(false);
const relatedFieldModal = ref();
const relatedFieldSearchbar = ref();
const conditionModal = ref();
const relatedFieldQueryString = ref("");
const relatedFieldStep = ref<"relationship" | "confirm" | "fields">("relationship");
// Field pickers are multi-select: collect chosen field names, then add them on an explicit save.
const selectedRelatedFieldNames = ref<string[]>([]);
const relatedRelationshipPath = ref("");
const relatedEntityName = ref("");
const selectedRelationship = ref<any>();
const activeCondition = ref<Record<string, any>>({
  conditionSeqId: "",
  fieldNameAlias: "",
  operator: "equals",
  fieldValue: "",
  toFieldNameAlias: "",
  postQuery: "N",
});

const operators = [
  { value: "equals", label: "Equals" },
  { value: "not-equals", label: "Not equals" },
  { value: "contains", label: "Contains" },
  { value: "starts-with", label: "Starts with" },
  { value: "in", label: "In list" },
  { value: "empty", label: "Is empty" },
  { value: "not-empty", label: "Is not empty" },
  { value: "greater", label: "Greater than" },
  { value: "greater-equals", label: "Greater than or equal" },
  { value: "less", label: "Less than" },
  { value: "less-equals", label: "Less than or equal" },
  { value: "between", label: "Between" }
];

// The store holds one graph for whichever document last claimed it, so render it only once it is
// loaded for the document this page is showing. Until then the page shows loading or an error.
const graph = computed(() => graphStore.status === "ready" ? graphStore.getGraph : undefined);
// The document this page is for. Read once here so the first paint has it, then again on every enter.
const documentKey = ref(String(router.currentRoute.value.params.id ?? ""));
// What the catalog already knows about this document: enough to preview the top card and the root
// node while the rest loads. Matched by id, so it can only ever be this document's own record.
const summary = computed(() => documentKey.value && documentKey.value !== "new"
  ? dataDocumentStore.getDataDocuments.find((item: any) => item.dataDocumentId === documentKey.value)
  : undefined);
const ghostLabel = computed(() => summary.value?.primaryEntityName ? getLabel(summary.value.primaryEntityName) : "");
const hasPrimaryEntity = computed(() => !!graph.value?.metadata.primaryEntityName);
// Reactive to the live route so it flips to false in place after the first save replaces
// /data-documents/new/graph with /data-documents/{id}/graph (same route record).
const isNew = computed(() => router.currentRoute.value.params.id === "new");
const previewRows = computed(() => dataDocumentStore.getPreviewRows);
// dataDocumentView returns no total — if we got back a full page, the result is capped at
// pageSize and there are likely more rows (only an export returns the complete set).
const previewCapped = computed(() => previewRows.value.length >= pageSize.value);
const previewStatus = computed(() => dataDocumentStore.getPreviewStatus);
const previewError = computed(() => dataDocumentStore.getPreviewError);
const relatedFeeds = computed(() => dataDocumentStore.getRelatedFeeds);
const relatedJobs = computed(() => dataDocumentStore.getRelatedJobs);
const exportHistory = computed(() => dataDocumentStore.getExportHistory);
const scheduledExports = computed(() => dataDocumentStore.getScheduledExports);
const exportHistoryStatus = computed(() => dataDocumentStore.getExportHistoryStatus);
const scheduledExportsStatus = computed(() => dataDocumentStore.getScheduledExportsStatus);
// The tabs read from different requests. The graph tabs wait for the document; Preview is static
// controls, and Recent Exports has a placeholder of its own that waits for its own request.
const bottomPanelLoading = computed(() => !["preview", "exports"].includes(bottomPanel.value) && !graph.value);
// A count is only shown once it is known, so it appears in place instead of reading "(0)" first.
const tabLabel = (label: string, count?: number) => count === undefined ? translate(label) : `${translate(label)} (${count})`;
const graphHasErrors = computed(() => graph.value?.validationIssues.some((issue) => issue.severity === "error"));
// An unsaved draft is session state (store.isDirty), not a property of the persisted graph, so
// it is prepended here rather than taught to projectDataDocumentGraph. It stays a warning: a
// dirty draft must never block Save the way an "error" issue does.
const panelIssues = computed(() => {
  const issues = [...(graph.value?.validationIssues || [])];

  if(graphStore.isDirty) {
    issues.unshift({
      code: "unsaved_changes",
      severity: "warning",
      message: translate("This data document has unsaved changes. Save them to apply."),
      targetKind: "document",
      targetId: graph.value?.dataDocumentId || "new"
    });
  }

  return issues;
});
const canvasSize = computed(() => ({
  width: Math.max(980, 360 + (graph.value?.nodes.length || 1) * 220),
  height: Math.max(520, 180 + (graph.value?.nodes.length || 1) * 80)
}));
const canvasStyle = computed(() => ({
  width: `${canvasSize.value.width}px`,
  height: `${canvasSize.value.height}px`
}));
// Where the root node sits, shared with the placeholder so the real one lands exactly on it.
const primaryNodePosition = computed(() => ({ x: 40, y: Math.round(canvasSize.value.height / 2) - 48 }));
const ghostNodeStyle = computed(() => ({
  transform: `translate(${primaryNodePosition.value.x}px, ${primaryNodePosition.value.y}px)`
}));

const getNodePosition = (nodeId: string) => {
  const node = graph.value?.nodes.find((item) => item.nodeId === nodeId);
  if (!node) return { x: 40, y: 180 };
  if(node.isPrimary) {
    return primaryNodePosition.value;
  }
  const depth = node.relationshipPath.length;
  const siblingIndex = graph.value?.nodes
    .filter((item) => !item.isPrimary && item.relationshipPath.length === depth)
    .findIndex((item) => item.nodeId === nodeId) || 0;
  return {
    x: 80 + depth * 260,
    y: 80 + siblingIndex * 132
  };
};

const getNodeCenter = (nodeId: string) => {
  const position = getNodePosition(nodeId);
  return { x: position.x + 96, y: position.y + 44 };
};

const getNodeStyle = (nodeId: string) => {
  const position = getNodePosition(nodeId);
  return {
    transform: `translate(${position.x}px, ${position.y}px)`
  };
};

const getEdgeLabelPoint = (edge: GraphEdge) => {
  const start = getNodeCenter(edge.fromNodeId);
  const end = getNodeCenter(edge.toNodeId);
  return {
    x: Math.round((start.x + end.x) / 2),
    y: Math.round((start.y + end.y) / 2) - 8
  };
};

const selectedNode = computed(() => selectedTarget.value.kind === "node"
  ? graph.value?.nodes.find((node) => node.nodeId === selectedTarget.value.id)
  : undefined);
const selectedEdge = computed(() => selectedTarget.value.kind === "edge"
  ? graph.value?.edges.find((edge) => edge.edgeId === selectedTarget.value.id)
  : undefined);
const selectedField = computed(() => selectedTarget.value.kind === "field"
  ? graph.value?.fields.find((field) => field.fieldSeqId === selectedTarget.value.id || field.fieldPath === selectedTarget.value.id)
  : undefined);
const selectedNodeFields = computed(() => graph.value?.fields.filter((field) => field.nodeId === selectedNode.value?.nodeId) || []);
const selectedFieldConditions = computed(() => selectedField.value ? getConditionsForField(selectedField.value) : []);
const entities = computed<EntityOption[]>(() => utilStore.getEntities);
const filteredEntities = computed(() => {
  const query = entityQueryString.value.trim().toLowerCase();
  if(!query) return entities.value;
  return entities.value.filter((entity) => getEntitySearchText(entity).includes(query));
});
const groupedEntities = computed(() => groupEntityOptions(filteredEntities.value));
const entityKeyboardItems = computed(() => groupedEntities.value.flatMap((entityGroup) => entityGroup.entities));
const getSafeDomId = (value: string) => value.replace(/[^A-Za-z0-9_-]/g, "-");
const getEntityKeyboardIndex = (entity: EntityOption) => entityKeyboardItems.value.findIndex((item) => (
  getEntityValue(item) === getEntityValue(entity)
));
const entityPickerNavigation = useKeyboardListNavigation<EntityOption>({
  items: entityKeyboardItems,
  inputRef: entitySearchbar,
  listId: "data-document-graph-entity-picker",
  getItemId: (entity) => `data-document-graph-entity-option-${getSafeDomId(getEntityValue(entity))}`,
  onSelect: (entity) => selectEntity(getEntityValue(entity))
});
const activeFieldEntityName = computed(() => selectedNode.value?.entityName || graph.value?.metadata.primaryEntityName || "");
const relatedEntityFields = computed(() => relatedEntityName.value ? utilStore.getEntityFields(relatedEntityName.value) : []);
const activeRelationshipEntityName = computed(() => selectedNode.value?.entityName || graph.value?.metadata.primaryEntityName || "");
const activeEntityRelationships = computed(() => activeRelationshipEntityName.value ? utilStore.getEntityRelationships(activeRelationshipEntityName.value) : []);
const filteredActiveEntityRelationships = computed(() => {
  const query = relatedFieldQueryString.value.trim().toLowerCase();
  if (!query) return activeEntityRelationships.value;
  return activeEntityRelationships.value.filter((relationship: any) => (
    relationship.relationshipName?.toLowerCase().includes(query) ||
    relationship.title?.toLowerCase().includes(query) ||
    relationship.relatedEntityName?.toLowerCase().includes(query)
  ));
});
const filteredRelatedEntityFields = computed(() => {
  const query = relatedFieldQueryString.value.trim().toLowerCase();
  const fields = relatedEntityFields.value.map((field: any) => typeof field === "string" ? { fieldName: field, description: "" } : field);
  if (!query) return fields;
  return fields.filter((field: any) => (
    field.fieldName.toLowerCase().includes(query) ||
    field.description?.toLowerCase().includes(query)
  ));
});
type RelatedFieldPickerOption = {
  kind: "relationship" | "field";
  key: string;
  item: any;
};

const relatedFieldPickerItems = computed<RelatedFieldPickerOption[]>(() => {
  if (relatedFieldStep.value === "relationship") {
    return filteredActiveEntityRelationships.value.map((relationship: any) => ({
      kind: "relationship" as const,
      key: relationship.relationshipName,
      item: relationship
    }));
  }

  if (relatedFieldStep.value === "fields") {
    return filteredRelatedEntityFields.value.map((field: any) => ({
      kind: "field" as const,
      key: field.fieldName,
      item: field
    }));
  }

  return [];
});

const getRelatedFieldPickerIndex = (kind: RelatedFieldPickerOption["kind"], key: string) => relatedFieldPickerItems.value.findIndex((option) => (
  option.kind === kind && option.key === key
));

const getRelatedFieldPickerOption = (kind: RelatedFieldPickerOption["kind"], key: string) => {
  return relatedFieldPickerItems.value.find((option) => option.kind === kind && option.key === key) || { kind, key, item: {} };
};

const relatedFieldPickerNavigation = useKeyboardListNavigation<RelatedFieldPickerOption>({
  items: relatedFieldPickerItems,
  inputRef: relatedFieldSearchbar,
  listId: "data-document-graph-related-field-picker",
  getItemId: (option) => `data-document-graph-related-field-option-${option.kind}-${getSafeDomId(option.key)}`,
  onSelect: (option) => {
    if (option.kind === "relationship") {
      selectRelationship(option.item);
    } else {
      toggleRelatedField(option.item.fieldName, !selectedRelatedFieldNames.value.includes(option.item.fieldName));
    }
  }
});
const selectedRelationshipJoinSummary = computed(() => {
  const keyMaps = selectedRelationship.value?.keyMaps || [];
  if (!keyMaps.length) return translate("Join keys unavailable.");
  return keyMaps.map((keyMap: any) => `${keyMap.fieldName} = ${keyMap.relatedFieldName}`).join(", ");
});
const relatedFieldProgress = computed(() => {
  if (relatedFieldStep.value === "relationship") return 1 / 3;
  if (relatedFieldStep.value === "confirm") return 2 / 3;
  return 1;
});

const selectNode = (nodeId: string) => {
  selectedTarget.value = { kind: "node", id: nodeId };
};

const selectEdge = (edgeId: string) => {
  selectedTarget.value = { kind: "edge", id: edgeId };
};

const selectField = (fieldId: string) => {
  selectedTarget.value = { kind: "field", id: fieldId };
};

const getConditionValue = (condition: GraphCondition) => {
  const value = condition.fieldValue ?? condition.sourceRecord?.value ?? condition.toFieldNameAlias ?? "";
  return value === null || value === undefined ? "" : String(value);
};

const getConditionExpression = (condition: GraphCondition) => {
  return [condition.fieldNameAlias, condition.operator, getConditionValue(condition)]
    .filter((value) => value !== undefined && value !== null && value !== "")
    .join(" ");
};

const getConditionTargetLabel = (condition: GraphCondition) => {
  if (condition.targetKind === "field") {
    const field = graph.value?.fields.find((item) => (
      item.fieldSeqId === condition.targetId ||
      item.fieldPath === condition.targetId ||
      item.outputName === condition.fieldNameAlias ||
      item.fieldNameAlias === condition.fieldNameAlias
    ));
    return field?.outputName || condition.fieldNameAlias || translate("Field");
  }
  return translate(condition.targetKind || "Document");
};

const getFieldConditionCount = (field: GraphField) => {
  return getConditionsForField(field).length;
};

const getConditionsForField = (field: GraphField) => {
  return graph.value?.conditions.filter((condition) => (
    condition.targetId === field.fieldSeqId ||
    condition.targetId === field.fieldPath ||
    condition.fieldNameAlias === field.outputName ||
    condition.fieldNameAlias === field.fieldNameAlias ||
    condition.fieldNameAlias === field.fieldPath
  )) || [];
};

const getConditionField = (condition: any) => graph.value?.fields.find((field) => (
  field.fieldSeqId === condition.targetId ||
  field.fieldPath === condition.targetId ||
  field.outputName === condition.fieldNameAlias ||
  field.fieldNameAlias === condition.fieldNameAlias ||
  field.fieldName === condition.fieldNameAlias ||
  field.fieldPath === condition.fieldNameAlias
));

const getRelationshipSegments = (fieldPath: string) => {
  const segments = String(fieldPath || "").split(":");
  segments.pop();
  return segments.filter(Boolean);
};

const getRelationship = (entityName: string, relationshipName: string) => (
  utilStore.getEntityRelationships(entityName).find((relationship: any) => (
    relationship.relationshipName === relationshipName ||
    relationship.shortAlias === relationshipName ||
    relationship.title === relationshipName
  ))
);

const getFieldEntityName = (field: any) => {
  let entityName = graph.value?.metadata.primaryEntityName || "";
  if (!entityName || !field?.fieldPath) return entityName;

  for (const segment of getRelationshipSegments(field.fieldPath)) {
    const relationship = getRelationship(entityName, segment);
    if (!relationship?.relatedEntityName) return entityName;
    entityName = relationship.relatedEntityName;
  }

  return entityName;
};

const getConditionValueOptions = (condition: any) => {
  const field = getConditionField(condition);
  const entityName = getFieldEntityName(field);

  if (!field || !entityName) return undefined;

  return getConditionValueOptionSource({
    condition,
    fields: [field],
    relationships: utilStore.getEntityRelationships(entityName),
    enumerations: utilStore.getEnumerations,
    statuses: utilStore.getStatuses
  });
};

const activeConditionValueOptions = computed(() => getConditionValueOptions(activeCondition.value));

const isOperatorValueInvalid = computed(() => {
  if (!activeCondition.value?.fieldNameAlias || !activeCondition.value?.operator) return false;
  return isConditionValueMissing(activeCondition.value.operator, activeCondition.value.fieldValue);
});

const conditionSubmitted = ref(false);

const openCondition = (condition: any) => {
  // Edit a copy so changes only apply to the graph when the user saves the modal.
  conditionSubmitted.value = false;
  activeCondition.value = { ...blankCondition(), ...condition };
  conditionModal.value.$el.present();
};

const openFeed = (feed: any) => {
  const dataFeedId = feed.dataFeedId || feed.feedName || feed;
  if (dataFeedId) router.push(`/data-document-feeds/${encodeURIComponent(dataFeedId)}`);
};

const updateMetadata = (field: string, value: any) => {
  graphStore.updateMetadata({ [field]: value });
};

const openEntityModal = async () => {
  entityQueryString.value = "";
  entityPickerNavigation.resetNavigation();
  await utilStore.fetchEntities();
  entityModal.value.$el.present();
};

const selectEntity = async (entity: string) => {
  if (graph.value && (graph.value.fields.length > 0 || graph.value.conditions.length > 0)) {
    const alert = await alertController.create({
      header: translate("Change Primary Entity?"),
      message: translate("You already have fields and conditions defined. Changing the primary entity will clear the current configuration. Do you wish to proceed?"),
      buttons: [
        {
          text: translate("Keep Configuration"),
          role: "cancel",
          handler: () => {
            closeEntityModal();
          }
        },
        {
          text: translate("Clear Configuration"),
          role: "confirm",
          handler: () => {
            updateMetadata("primaryEntityName", entity);
            utilStore.fetchEntityFields(entity);
            selectedTarget.value = { kind: "node", id: "node:root" };
            closeEntityModal();
          }
        }
      ]
    });
    await alert.present();
  } else {
    updateMetadata("primaryEntityName", entity);
    utilStore.fetchEntityFields(entity);
    selectedTarget.value = { kind: "node", id: "node:root" };
    closeEntityModal();
  }
};

const closeEntityModal = () => {
  entityModal.value.$el.dismiss();
};

const openGraphFieldModal = () => {
  fieldPickerOpen.value = true;
};

const addGraphFields = (fieldNames: string[]) => {
  const nodeId = selectedNode.value?.nodeId || "node:root";
  let addedField;
  for (const fieldName of fieldNames) {
    addedField = graphStore.addField(nodeId, fieldName);
  }
  if (addedField) {
    selectedTarget.value = { kind: "field", id: addedField.fieldSeqId || addedField.fieldPath };
  }
};

const openRelatedFieldModal = async () => {
  relatedFieldQueryString.value = "";
  relatedFieldStep.value = "relationship";
  relatedFieldPickerNavigation.resetNavigation();
  relatedRelationshipPath.value = selectedNode.value?.relationshipPath.join(":") || "";
  relatedEntityName.value = "";
  selectedRelationship.value = undefined;
  if (activeRelationshipEntityName.value) {
    await utilStore.fetchEntityRelationships(activeRelationshipEntityName.value);
  }
  relatedFieldModal.value.$el.present();
};

const selectRelationship = async (relationship: any) => {
  selectedRelationship.value = relationship;
  const currentPath = selectedNode.value?.relationshipPath || [];
  relatedRelationshipPath.value = [...currentPath, relationship.relationshipName].filter(Boolean).join(":");
  relatedEntityName.value = relationship.relatedEntityName || "";
  relatedFieldQueryString.value = "";
  relatedFieldStep.value = "confirm";
  relatedFieldPickerNavigation.resetNavigation();
};

const confirmRelatedFieldPath = async () => {
  if (relatedEntityName.value) {
    await utilStore.fetchEntityFields(relatedEntityName.value);
  }
  relatedFieldQueryString.value = "";
  selectedRelatedFieldNames.value = [];
  relatedFieldStep.value = "fields";
  relatedFieldPickerNavigation.resetNavigation();
};

const fetchRelatedEntityFields = () => {
  const entityName = relatedEntityName.value.trim();
  if (entityName) {
    utilStore.fetchEntityFields(entityName);
  }
};


const toggleRelatedField = (fieldName: string, checked: boolean) => {
  selectedRelatedFieldNames.value = checked
    ? [...new Set([...selectedRelatedFieldNames.value, fieldName])]
    : selectedRelatedFieldNames.value.filter((name) => name !== fieldName);
};

const confirmRelatedFieldSelection = () => {
  const relationshipPath = relatedRelationshipPath.value.trim().replace(/^:+|:+$/g, "");
  if (!relationshipPath) {
    showToast(translate("Relationship path is required."));
    return;
  }
  let addedField;
  for (const fieldName of selectedRelatedFieldNames.value) {
    addedField = graphStore.addFieldPath(`${relationshipPath}:${fieldName}`, fieldName);
  }
  if (addedField) {
    selectedTarget.value = { kind: "field", id: addedField.fieldSeqId || addedField.fieldPath };
  }
  closeRelatedFieldModal();
};

const closeRelatedFieldModal = () => {
  relatedFieldModal.value.$el.dismiss();
};

const updateSelectedField = (patch: Record<string, any>) => {
  if (!selectedField.value) return;
  graphStore.updateField(selectedField.value.fieldSeqId, selectedField.value.fieldPath, patch);
};

const dataDocumentFunctions = DATA_DOCUMENT_FUNCTIONS;
const functionLabel = (functionName?: string) => getDataDocumentFunctionLabel(functionName, true);

// A field is a "measure" when it carries an aggregate functionName; otherwise it is a
// "dimension" that groups the rows. Switching to measure defaults to count (works on any type).
const fieldRole = (field?: { functionName?: string }) => (field?.functionName ? "measure" : "dimension");
const setFieldRole = (role: string | undefined) => {
  if (!selectedField.value) return;
  if (role === "measure") {
    if (!selectedField.value.functionName) updateSelectedField({ functionName: "count" });
  } else {
    updateSelectedField({ functionName: "" });
  }
};

// True when the condition modal is editing a condition that already exists on the graph
// (drives the "Save changes" vs "Add" footer label).
const isEditingCondition = computed(() => {
  const conditionId = activeCondition.value?.conditionSeqId || activeCondition.value?.localId;
  return !!conditionId && (graph.value?.conditions || []).some((item: any) => (
    item.conditionSeqId === conditionId || item.localId === conditionId
  ));
});

const blankCondition = () => ({
  fieldNameAlias: "",
  operator: "equals",
  fieldValue: "",
  toFieldNameAlias: "",
  postQuery: "N"
});

const openConditionModal = () => {
  if(!selectedField.value) return;
  conditionSubmitted.value = false;
  // Fresh object (no id) so this is treated as a new condition, with no stale carry-over.
  activeCondition.value = { ...blankCondition(), fieldNameAlias: selectedField.value.outputName };
  conditionModal.value.$el.present();
};

const removeCondition = (condition: any) => {
  graphStore.removeCondition(condition.localId || condition.conditionSeqId || "");
};

const closeConditionModal = (save: boolean = false) => {
  if (save) {
    conditionSubmitted.value = true;
    if (isOperatorValueInvalid.value) {
      return;
    }
    const condition = { ...activeCondition.value };
    const existingId = condition.conditionSeqId || condition.localId;
    const isExisting = !!existingId && (graph.value?.conditions || []).some((item: any) => (
      item.conditionSeqId === existingId || item.localId === existingId
    ));
    if(isExisting) {
      graphStore.updateCondition(existingId, condition);
    } else {
      graphStore.addCondition(condition);
    }
  }
  conditionSubmitted.value = false;
  conditionModal.value.$el.dismiss();
};


const buildQuery = () => ({
  selectedFields: selectedFields.value,
  filters: graph.value?.conditions.map((condition) => ({
    fieldNameAlias: condition.fieldNameAlias,
    operator: condition.operator,
    value: condition.fieldValue
  })) || [],
  sort: [],
  distinct: false,
  pageSize: pageSize.value
});

const saveGraph = async () => {
  try {
    await graphStore.saveGraph();
    showToast(translate("Data document graph saved."));
    if (isNew.value && graph.value?.dataDocumentId) {
      router.replace(`/data-documents/${graph.value.dataDocumentId}/graph?segment=${bottomPanel.value}`);
    }

    return true;
  } catch (error) {
    showToast(translate("Failed to save data document graph."));

    return false;
  }
};

// runPreview POSTs only the dataDocumentId, so the server previews the saved definition.
// With a dirty graph that quietly returns rows for the old one, which reads as the preview
// ignoring the edit rather than as previewing something else.
const confirmPreviewWithUnsavedChanges = async () => {
  const alert = await alertController.create({
    header: translate("Unsaved changes"),
    message: translate("The preview runs against the saved data document, so your unsaved changes will not show up in the results."),
    buttons: [
      { text: translate("Cancel"), role: "cancel" },
      { text: translate("Preview anyway"), role: "preview" },
      { text: translate("Save"), role: "save" }
    ]
  });
  await alert.present();
  const { role } = await alert.onDidDismiss();

  if(role === "save") { return saveGraph(); }

  return role === "preview";
};

const runPreview = async () => {
  if(graphStore.isDirty && !(await confirmPreviewWithUnsavedChanges())) { return; }

  await dataDocumentStore.runPreview(graph.value?.dataDocumentId as string, buildQuery());
};

const openScheduleModal = async () => {
  const dataDocumentId = graph.value?.dataDocumentId as string;
  if (!dataDocumentId) return;
  const modal = await modalController.create({ component: ScheduleEmailExportModal });
  modal.present();
  const { data, role } = await modal.onDidDismiss();
  if (role !== "confirm" || !data) return;
  try {
    await dataDocumentStore.scheduleEmailExport({
      dataDocumentId,
      toEmailAddress: data.toEmailAddress,
      ccAddresses: data.ccAddresses,
      cronExpression: data.cronExpression
    });
    showToast(translate("Email export scheduled."));
  } catch (error) {
    showToast(translate("Failed to schedule the email export."));
  }
};

const togglePause = async (job: any) => {
  const dataDocumentId = graph.value?.dataDocumentId as string;
  try {
    await dataDocumentStore.setExportSchedulePaused(job.jobName, job.paused !== "Y", dataDocumentId);
    showToast(job.paused === "Y" ? translate("Schedule resumed.") : translate("Schedule paused."));
  } catch (error) {
    showToast(translate("Failed to update the schedule."));
  }
};

const queueExport = async () => {
  const dataDocumentId = graph.value?.dataDocumentId as string;
  try {
    await dataDocumentStore.queueExport(dataDocumentId);
    commonUtil.showToast(translate("Data document export queued."));
    // Track status in the background; Recent Exports updates live as it polls.
    dataDocumentStore.pollExportHistory(dataDocumentId);
  } catch(err) {
    commonUtil.showToast(translate(`Failed to queue data document export for ${graph.value?.dataDocumentId}`))
  }
};

watch(graph, (currentGraph) => {
  if (!currentGraph) return;
  selectedFields.value = currentGraph.fields
    .filter((field) => field.defaultDisplay !== "N")
    .map((field) => field.outputName);
}, { immediate: true });

watch(entityQueryString, () => {
  entityPickerNavigation.resetNavigation();
});

watch([relatedFieldQueryString, relatedFieldStep, relatedEntityName, activeRelationshipEntityName], () => {
  relatedFieldPickerNavigation.resetNavigation();
});

// Each time this page takes the store it gets a new ticket, and leaving releases the store only if
// that ticket is still the one it holds. Ionic keeps this page cached after leaving it, and a page
// entered right after (another document, or the id a first save just created) may already own the store.
let claimant: symbol | undefined;

const enterDocument = async (key: string) => {
  claimant = Symbol(key);
  documentKey.value = key;
  if(key === "new") {
    graphStore.startNewGraph(claimant);

    return;
  }
  // Start what only needs the id or the catalog's record beside the document request, and let each
  // region fill in when its own data lands: the document (with its exports and scheduled exports,
  // started inside the store) and, when the catalog already named the entity, its definition.
  const loading = graphStore.fetchGraph(key, { claimant });
  const previewEntity = summary.value?.primaryEntityName;
  if(previewEntity) {
    void utilStore.fetchEntityFields(previewEntity);
  }
  await loading;
  // The load failed, or the store was handed to another page while it ran.
  if(graphStore.status !== "ready" || graphStore.owner !== key) {
    return;
  }
  const entityName = graph.value?.metadata.primaryEntityName;
  if(entityName && entityName !== previewEntity) {
    void utilStore.fetchEntityFields(entityName);
  }
};

const retryLoad = () => enterDocument(router.currentRoute.value.params.id as string);

onIonViewWillEnter(async () => {
  // Deep-link the active segment from ?segment= (catalog Run→preview, History→exports).
  // Done here, not at ref init, because Ionic caches/reuses the page across navigations.
  const segment = router.currentRoute.value.query.segment as string;
  if (SEGMENT_VALUES.includes(segment)) bottomPanel.value = segment;
  utilStore.fetchEnumerations();
  utilStore.fetchStatuses();
  // Read the LIVE route id (not the captured snapshot) so a cached re-enter after the
  // in-place first-save fetches the real document, never the literal "new".
  await enterDocument(router.currentRoute.value.params.id as string);
});

onIonViewDidLeave(() => {
  if(claimant) {
    graphStore.release(claimant);
  }
});
</script>

<style scoped>
.graph-builder {
  min-height: 100%;
}


/* Outlined controls stacked in a modal, matching CreateJobModal's .job-detail-fields. */
.condition-fields > ion-input,
.condition-fields > ion-select {
  margin-block-end: var(--spacer-sm);
}

/* The Save FAB is fixed over the content, so the last control needs room to clear it. */
.condition-fields {
  padding-block-end: var(--spacer-2xl);
}

.preview-rows-input {
  max-width: 110px;
  margin-top: var(--spacer-xs);
  margin-bottom: var(--spacer-xs);
}

.graph-workspace {
  display: flex;
  height: 500px;
}

.graph-inspector {
  flex: 0 0 280px;
  overflow: auto;
  border-inline-start: 1px solid var(--ion-color-light);
}

.graph-canvas-panel {
  flex: 1 1 auto;
  overflow: auto;
  background:
    linear-gradient(90deg, rgba(var(--ion-text-color-rgb, 0, 0, 0), 0.08) 1px, transparent 1px),
    linear-gradient(rgba(var(--ion-text-color-rgb, 0, 0, 0), 0.08) 1px, transparent 1px);
  background-size: 28px 28px;
}

.graph-canvas {
  position: relative;
  min-width: 100%;
}

.graph-edges {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.graph-edges line {
  stroke: var(--ion-color-medium);
  stroke-width: 2;
}

.graph-edges line.selected {
  stroke: var(--ion-color-primary);
  stroke-width: 4;
}

.graph-edges text {
  fill: var(--ion-text-color);
  font-size: 12px;
  paint-order: stroke;
  stroke: var(--ion-background-color, #FFF);
  stroke-width: 4px;
  text-anchor: middle;
  cursor: pointer;
}

.graph-node {
  position: absolute;
  width: 192px;
  min-height: 88px;
  border: 1px solid var(--ion-color-light-shade);
  border-radius: 10px;
  background: var(--ion-background-color, #FFF);
  box-shadow: 0 8px 20px rgba(var(--ion-color-dark-rgb, 15, 23, 42), 0.12);
  color: var(--ion-text-color);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  text-align: start;
}

.graph-node.primary {
  border-color: var(--ion-color-primary);
}

.graph-node.selected {
  outline: 3px solid rgba(var(--ion-color-primary-rgb, 56, 128, 255), 0.28);
}


.graph-node span {
  font-weight: 700;
}

.graph-node-subtitle {
  font-size: 11px;
  color: var(--ion-color-medium);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.graph-node strong {
  color: var(--ion-color-primary);
  font-size: 12px;
}

.graph-bottom {
  border-top: 1px solid var(--ion-color-light-shade);
  background: var(--ion-background-color);
}

/* Regions pop in as their data lands: a short fade and rise. Related nodes and their edges only
   fade, because an inline transform is what places a node. Off for people who ask for less motion. */
@keyframes hydrate-in {
  from {
    opacity: 0;
    transform: translateY(var(--spacer-2xs));
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes hydrate-fade {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.hydrate {
  animation: hydrate-in 0.24s ease-out backwards;
}

/* The root node is already on screen as a placeholder and resolves in place. Everything the document
   adds around it is new to the canvas. */
.graph-node:not(.primary),
.graph-edge {
  animation: hydrate-fade 0.24s ease-out backwards;
}

/* The placeholder node only marks where the real one will land. */
.graph-node-ghost {
  cursor: default;
  pointer-events: none;
}

.graph-empty-state {
  height: 100%;
}

@media (prefers-reduced-motion: reduce) {
  .hydrate,
  .graph-node:not(.primary),
  .graph-edge {
    animation: none;
  }
}

@media (max-width: 900px) {
  .graph-workspace {
    display: block;
  }

  .graph-inspector {
    border: 0;
    border-bottom: 1px solid var(--ion-color-light-shade);
    max-height: 360px;
  }

  .graph-canvas-panel {
    min-height: 520px;
  }
}

</style>
