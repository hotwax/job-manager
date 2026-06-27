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
      <main v-if="graph" class="graph-builder">
        <ion-card>
          <ion-list class="graph-metadata-list">
            <ion-item detail button @click="openEntityModal">
              <ion-label>
                <p>{{ translate("Primary Entity") }}</p>
                {{ graph.metadata.primaryEntityName || translate("Select Entity") }}
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-input
                :value="graph.metadata.documentName"
                :label="translate('Name')"
                label-placement="stacked"
                @ionInput="updateMetadata('documentName', $event.detail.value || '')"
              />
            </ion-item>
            <ion-item>
              <ion-input
                :value="graph.metadata.documentTitle"
                :label="translate('Title')"
                label-placement="stacked"
                @ionInput="updateMetadata('documentTitle', $event.detail.value || '')"
              />
            </ion-item>
            <ion-buttons>
              <ion-button fill="clear" slot="end" @click="openAdvancedMetadataModal" :aria-label="translate('Advanced Metadata')">
                <ion-icon slot="icon-only" :icon="optionsOutline" />
              </ion-button>
            </ion-buttons>
          </ion-list>
        </ion-card>

        <section class="graph-workspace">
          <section class="graph-canvas-panel">
            <div class="graph-canvas" :style="canvasStyle">
              <svg class="graph-edges" :viewBox="`0 0 ${canvasSize.width} ${canvasSize.height}`" preserveAspectRatio="none">
                <g v-for="edge in graph.edges" :key="edge.edgeId" @click="selectEdge(edge.edgeId)">
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
          </section>

          <aside class="graph-inspector">
            <ion-list v-if="selectedNode">
              <ion-item-divider color="light">
                <ion-label>{{ translate("Entity") }}</ion-label>
              </ion-item-divider>
              <ion-item>
                <ion-label>
                  <h2>{{ selectedNode.label }}</h2>
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
                  <h2>{{ field.outputName }}</h2>
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
                  <h2>{{ selectedEdge.alias || selectedEdge.relationshipName }}</h2>
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
                  <h2>{{ getConditionExpression(condition) }}</h2>
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
                  <h2>{{ translate("Select a node, edge, or field") }}</h2>
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
              <ion-label>{{ translate("Issues") }} ({{ graph.validationIssues.length }})</ion-label>
            </ion-segment-button>
            <ion-segment-button value="fields" layout="icon-start">
              <ion-icon :icon="listOutline" />
              <ion-label>{{ translate("Fields") }} ({{ graph.fields.length }})</ion-label>
            </ion-segment-button>
            <ion-segment-button value="conditions" layout="icon-start">
              <ion-icon :icon="filterOutline" />
              <ion-label>{{ translate("Conditions") }} ({{ graph.conditions.length }})</ion-label>
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
              <ion-label>{{ translate("Recent Exports") }} ({{ exportHistory.length }})</ion-label>
            </ion-segment-button>
          </ion-segment>

          <ion-list v-if="bottomPanel === 'issues'">
            <ion-item v-for="issue in graph.validationIssues" :key="issue.code + issue.targetId">
              <ion-label>
                <h2>{{ issue.severity }}</h2>
                <p>{{ issue.message }}</p>
              </ion-label>
            </ion-item>
            <ion-item v-if="!graph.validationIssues.length">
              <ion-label>{{ translate("No validation issues.") }}</ion-label>
            </ion-item>
          </ion-list>

          <div v-else-if="bottomPanel === 'fields'" class="fields-form">
            <DataDocumentFormView embedded />
          </div>

          <ion-list v-else-if="bottomPanel === 'conditions'">
            <ion-item
              v-for="condition in graph.conditions"
              :key="condition.conditionSeqId || condition.fieldNameAlias"
              button
              @click="openCondition(condition)"
            >
              <ion-icon slot="start" :icon="filterOutline" />
              <ion-label>
                <h2>{{ getConditionExpression(condition) }}</h2>
                <p>{{ translate("Target") }}: {{ getConditionTargetLabel(condition) }}</p>
                <p v-if="getConditionValue(condition) !== ''">{{ translate("Field Value") }}: {{ getConditionValue(condition) }}</p>
                <p v-if="condition.toFieldNameAlias">{{ translate("To Field") }}: {{ condition.toFieldNameAlias }}</p>
                <p v-if="condition.postQuery">{{ translate("Post Query") }}: {{ condition.postQuery }}</p>
              </ion-label>
            </ion-item>
            <p class="empty-state" v-if="!graph.conditions.length">
              {{ translate("No conditions") }}
            </p>
          </ion-list>

          <div v-else-if="bottomPanel === 'preview'" class="preview-panel">
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
                  <h2>{{ translate("Preview failed") }}</h2>
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
              <ion-list v-if="scheduledExports.length">
                <ion-list-header>{{ translate("Scheduled email exports") }}</ion-list-header>
                <ion-item v-for="job in scheduledExports" :key="job.jobName">
                  <ion-label>
                    <h2>{{ job.toEmailAddress || job.jobName }}</h2>
                    <p>{{ job.cronDescription || job.cronExpression }}</p>
                    <p v-if="job.nextExecutionDateTime">{{ translate("Next") }}: {{ getDateAndTime(job.nextExecutionDateTime) }}</p>
                    <p v-if="job.paused === 'Y'"><ion-text color="warning">{{ translate("Paused") }}</ion-text></p>
                  </ion-label>
                  <ion-button slot="end" fill="clear" :aria-label="translate('Pause or resume schedule')" @click="togglePause(job)">
                    <ion-icon slot="icon-only" :icon="job.paused === 'Y' ? playOutline : pauseOutline" />
                  </ion-button>
                </ion-item>
              </ion-list>
            </div>
          </div>

          <ion-list v-else-if="bottomPanel === 'usage'">
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
              <ion-note class="ion-text-wrap">{{ translate("Exports run the full document (with its conditions) and include up to 10,000 rows.") }}</ion-note>
            </ion-item>
            <DataDocumentExportList :messages="exportHistory" :empty-message="translate('No recent exports.')" />
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
          <ion-text color="medium">{{ translate("Loading graph builder.") }}</ion-text>
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

      <ion-modal ref="fieldModal">
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button @click="closeFieldModal">
                <ion-icon slot="icon-only" :icon="closeOutline" />
              </ion-button>
            </ion-buttons>
            <ion-title>{{ translate("Select Field") }}</ion-title>
          </ion-toolbar>
          <ion-toolbar>
            <ion-searchbar
              ref="fieldSearchbar"
              v-model="fieldQueryString"
              :placeholder="translate('Search fields')"
              role="combobox"
              aria-expanded="true"
              :aria-controls="fieldPickerNavigation.listId"
              :aria-activedescendant="fieldPickerNavigation.activeDescendant.value"
              @keydown="fieldPickerNavigation.handleInputKeydown"
            />
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <div v-if="utilStore.getFetchStatus.entityFields === 'pending'" class="ion-text-center ion-padding">
            <ion-spinner name="crescent" />
            <p>{{ translate("Fetching fields...") }}</p>
          </div>
          <ion-list v-else :id="fieldPickerNavigation.listId" role="listbox">
            <ion-item
              v-for="field in filteredEntityFields"
              :key="field.name"
              v-bind="fieldPickerNavigation.getItemAttributes(field, getGraphFieldPickerIndex(field))"
              :ref="(element) => fieldPickerNavigation.setItemRef(getGraphFieldPickerIndex(field), element)"
              @keydown="fieldPickerNavigation.handleItemKeydown($event, getGraphFieldPickerIndex(field))"
            >
              <ion-checkbox
                :checked="selectedGraphFieldNames.includes(field.name)"
                @ionChange="toggleGraphField(field.name, $event.detail.checked)"
              >
                {{ field.name }}
              </ion-checkbox>
            </ion-item>
            <ion-item v-if="!filteredEntityFields.length">
              <ion-label class="ion-text-center">
                <p>{{ translate("No fields found for this entity.") }}</p>
              </ion-label>
            </ion-item>
          </ion-list>
        </ion-content>
        <ion-footer>
          <ion-toolbar>
            <ion-buttons slot="end">
              <ion-button :strong="true" :disabled="!selectedGraphFieldNames.length" @click="confirmGraphFieldSelection">
                {{ selectedGraphFieldNames.length ? `${translate("Save")} (${selectedGraphFieldNames.length})` : translate("Save") }}
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-footer>
      </ion-modal>

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
                <h2>{{ relationship.title || relationship.relationshipName }}</h2>
                <p>{{ relationship.relationshipName }}</p>
                <p>{{ relationship.relatedEntityName }} · {{ relationship.type || translate("unknown") }}</p>
              </ion-label>
            </ion-item>
            <ion-item v-if="!filteredActiveEntityRelationships.length">
              <ion-label>
                <h2>{{ translate("No relationships loaded") }}</h2>
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
                <h2>{{ selectedRelationship.title || selectedRelationship.relationshipName }}</h2>
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
                <h2>{{ translate("Generated path") }}</h2>
                <p>{{ relatedRelationshipPath || translate("Enter a relationship path, then choose a field.") }}</p>
              </ion-label>
            </ion-item>
            <ion-item v-if="selectedRelationship">
              <ion-label>
                <h2>{{ translate("Join") }}</h2>
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
                <h2>{{ relatedEntityName }}</h2>
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
                  <h2>{{ field.fieldName }}</h2>
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

      <ion-modal ref="conditionModal">
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button @click="closeConditionModal">
                <ion-icon slot="icon-only" :icon="closeOutline" />
              </ion-button>
            </ion-buttons>
            <ion-title>{{ isEditingCondition ? translate("Edit Condition") : translate("Add Condition") }}</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <ion-list v-if="activeCondition">
            <ion-item>
              <ion-input
                v-model="activeCondition.fieldNameAlias"
                :label="translate('Field Alias')"
                label-placement="stacked"
              />
            </ion-item>
            <ion-item>
              <ion-select
                v-model="activeCondition.operator"
                :label="translate('Operator')"
                label-placement="stacked"
                interface="popover"
              >
                <ion-select-option v-for="operator in operators" :key="operator.value" :value="operator.value">
                  {{ translate(operator.label) }}
                </ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-select
                v-if="activeConditionValueOptions"
                v-model="activeCondition.fieldValue"
                :label="translate('Value')"
                :placeholder="activeConditionValueOptions.label || translate('Select value')"
                label-placement="stacked"
                interface="popover"
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
                v-model="activeCondition.fieldValue"
                :label="translate('Value')"
                label-placement="stacked"
              />
            </ion-item>
            <ion-item>
              <ion-input
                v-model="activeCondition.toFieldNameAlias"
                :label="translate('To Field Alias')"
                label-placement="stacked"
              />
            </ion-item>
            <ion-item>
              <ion-select
                v-model="activeCondition.postQuery"
                :label="translate('Post Query')"
                label-placement="stacked"
                interface="popover"
              >
                <ion-select-option value="N">
                  {{ translate("N") }}
                </ion-select-option>
                <ion-select-option value="Y">
                  {{ translate("Y") }}
                </ion-select-option>
              </ion-select>
            </ion-item>
          </ion-list>
        </ion-content>
        <ion-footer>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button v-if="isEditingCondition" color="danger" fill="clear" @click="removeActiveCondition">
                {{ translate("Remove") }}
              </ion-button>
            </ion-buttons>
            <ion-buttons slot="end">
              <ion-button fill="clear" @click="closeConditionModal()">{{ translate("Cancel") }}</ion-button>
              <ion-button :strong="true" @click="closeConditionModal(true)">
                {{ isEditingCondition ? translate("Save changes") : translate("Add") }}
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-footer>
      </ion-modal>

      <ion-modal ref="advancedMetadataModal">
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button @click="closeAdvancedMetadataModal">
                <ion-icon slot="icon-only" :icon="closeOutline" />
              </ion-button>
            </ion-buttons>
            <ion-title>{{ translate("Advanced Metadata") }}</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <ion-list>
            <ion-item>
              <ion-input
                :value="graph.metadata.dataDocumentId"
                :readonly="!isNew"
                :label="translate('Data Document ID')"
                label-placement="stacked"
                @ionInput="updateMetadata('dataDocumentId', $event.detail.value || '')"
              />
            </ion-item>
            <ion-item>
              <ion-input
                :value="graph.metadata.indexName"
                :label="translate('Index Name')"
                label-placement="stacked"
                @ionInput="updateMetadata('indexName', $event.detail.value || '')"
              />
            </ion-item>
            <ion-item>
              <ion-input
                :value="graph.metadata.manualDataServiceName"
                :label="translate('Manual Data Service')"
                label-placement="stacked"
                @ionInput="updateMetadata('manualDataServiceName', $event.detail.value || '')"
              />
            </ion-item>
          </ion-list>
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
  IonSpinner,
  IonListHeader,
  IonText,
  IonTitle,
  IonToggle,
  IonToolbar,
  modalController,
  onIonViewWillEnter
} from "@ionic/vue";
import { addOutline, alertCircleOutline, arrowBackOutline, checkmarkCircleOutline, closeOutline, cloudDownloadOutline, cloudUploadOutline, filterOutline, gitBranchOutline, informationCircleOutline, listOutline, optionsOutline, pauseOutline, playOutline, saveOutline, statsChartOutline, timeOutline, warningOutline } from "ionicons/icons";
import { computed, ref, watch } from "vue";
import router from "../router"

import { commonUtil, translate } from "@common";
import { useDataDocumentGraphStore } from "@/store/dataDocumentGraph";
import { useDataDocumentStore } from "@/store/dataDocuments";
import DataDocumentExportList from "@/components/DataDocumentExportList.vue";
import DataDocumentPreviewTable from "@/components/DataDocumentPreviewTable.vue";
import ScheduleEmailExportModal from "@/components/ScheduleEmailExportModal.vue";
import DataDocumentFormView from "@/views/DataDocumentFormView.vue";
import { getDateAndTime, showToast } from "@/utils";
import { useUtilStore } from "@/store/util";
import type { GraphCondition, GraphEdge, GraphField } from "@/utils/dataDocumentGraph";
import { DATA_DOCUMENT_FUNCTIONS, getDataDocumentFunctionLabel } from "@/utils/dataDocumentGraph";
import { getConditionValueOptionSource } from "@/utils/conditionValueOptions";
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
const fieldModal = ref();
const fieldSearchbar = ref();
const fieldQueryString = ref("");
const relatedFieldModal = ref();
const relatedFieldSearchbar = ref();
const advancedMetadataModal = ref();
const conditionModal = ref();
const relatedFieldQueryString = ref("");
const relatedFieldStep = ref<"relationship" | "confirm" | "fields">("relationship");
// Field pickers are multi-select: collect chosen field names, then add them on an explicit save.
const selectedGraphFieldNames = ref<string[]>([]);
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

const graph = computed(() => graphStore.getGraph);
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
const graphHasErrors = computed(() => graph.value?.validationIssues.some((issue) => issue.severity === "error"));
const canvasSize = computed(() => ({
  width: Math.max(980, 360 + (graph.value?.nodes.length || 1) * 220),
  height: Math.max(520, 180 + (graph.value?.nodes.length || 1) * 80)
}));
const canvasStyle = computed(() => ({
  width: `${canvasSize.value.width}px`,
  height: `${canvasSize.value.height}px`
}));

const getNodePosition = (nodeId: string) => {
  const node = graph.value?.nodes.find((item) => item.nodeId === nodeId);
  if (!node) return { x: 40, y: 180 };
  if (node.isPrimary) return { x: 40, y: Math.round(canvasSize.value.height / 2) - 48 };
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
const entityFields = computed(() => activeFieldEntityName.value ? utilStore.getEntityFields(activeFieldEntityName.value) : []);
const filteredEntityFields = computed(() => {
  const query = fieldQueryString.value.trim().toLowerCase();
  console.log('entityFields', entityFields.value)
  if (!query) return entityFields.value;
  return entityFields.value.filter((field: any) => field.name.toLowerCase().includes(query));
});
const getGraphFieldPickerIndex = (field: any) => filteredEntityFields.value.findIndex((item: any) => item.name === field.name);
const fieldPickerNavigation = useKeyboardListNavigation<any>({
  items: filteredEntityFields,
  inputRef: fieldSearchbar,
  listId: "data-document-graph-field-picker",
  getItemId: (field) => `data-document-graph-field-option-${getSafeDomId(field.name)}`,
  onSelect: (field) => toggleGraphField(field.name, !selectedGraphFieldNames.value.includes(field.name))
});
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

const openCondition = (condition: any) => {
  // Edit a copy so changes only apply to the graph when the user saves the modal.
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

const selectEntity = (entity: string) => {
  updateMetadata("primaryEntityName", entity);
  utilStore.fetchEntityFields(entity);
  selectedTarget.value = { kind: "node", id: "node:root" };
  closeEntityModal();
};

const closeEntityModal = () => {
  entityModal.value.$el.dismiss();
};

const openGraphFieldModal = async () => {
  fieldQueryString.value = "";
  selectedGraphFieldNames.value = [];
  fieldPickerNavigation.resetNavigation();
  if(selectedNode.value?.entityName) {
    await utilStore.fetchEntityFields(selectedNode.value?.entityName);
  }
  fieldModal.value.$el.present();
};


const toggleGraphField = (fieldName: string, checked: boolean) => {
  selectedGraphFieldNames.value = checked
    ? [...new Set([...selectedGraphFieldNames.value, fieldName])]
    : selectedGraphFieldNames.value.filter((name) => name !== fieldName);
};

const confirmGraphFieldSelection = () => {
  const nodeId = selectedNode.value?.nodeId || "node:root";
  let addedField;
  for (const fieldName of selectedGraphFieldNames.value) {
    addedField = graphStore.addField(nodeId, fieldName);
  }
  if (addedField) {
    selectedTarget.value = { kind: "field", id: addedField.fieldSeqId || addedField.fieldPath };
  }
  closeFieldModal();
};

const closeFieldModal = () => {
  fieldModal.value.$el.dismiss();
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

const openAdvancedMetadataModal = () => {
  advancedMetadataModal.value.$el.present();
};

const closeAdvancedMetadataModal = () => {
  advancedMetadataModal.value.$el.dismiss();
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
  // Fresh object (no id) so this is treated as a new condition, with no stale carry-over.
  activeCondition.value = { ...blankCondition(), fieldNameAlias: selectedField.value.outputName };
  conditionModal.value.$el.present();
};

const removeActiveCondition = () => {
  const conditionId = activeCondition.value?.conditionSeqId || activeCondition.value?.localId;
  if(conditionId) {
    graphStore.removeCondition(conditionId);
  }
  closeConditionModal();
};

const closeConditionModal = (save = false) => {
  if(save) {
    const condition = { ...activeCondition.value };
    const existingId = condition.conditionSeqId || condition.localId;

    const duplicateExists = (graph.value?.conditions || []).some((item: any) => {
      const isSelf = existingId && (item.conditionSeqId === existingId || item.localId === existingId);
      if (isSelf) return false;

      return item.fieldNameAlias === condition.fieldNameAlias &&
        item.operator === condition.operator &&
        (item.fieldValue || '') === (condition.fieldValue || '') &&
        (item.toFieldNameAlias || '') === (condition.toFieldNameAlias || '') &&
        (item.postQuery || 'N') === (condition.postQuery || 'N');
    });

    if (duplicateExists) {
      showToast(translate("Condition already exists"));
      return;
    }

    const isExisting = !!existingId && (graph.value?.conditions || []).some((item: any) => (
      item.conditionSeqId === existingId || item.localId === existingId
    ));
    if(isExisting) {
      graphStore.updateCondition(existingId, condition);
    } else {
      graphStore.addCondition(condition);
    }
  }
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
  } catch (error) {
    showToast(translate("Failed to save data document graph."));
  }
};

const runPreview = async () => {
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

watch([fieldQueryString, activeFieldEntityName], () => {
  fieldPickerNavigation.resetNavigation();
});

watch([relatedFieldQueryString, relatedFieldStep, relatedEntityName, activeRelationshipEntityName], () => {
  relatedFieldPickerNavigation.resetNavigation();
});

onIonViewWillEnter(async () => {
  // Deep-link the active segment from ?segment= (catalog Run→preview, History→exports).
  // Done here, not at ref init, because Ionic caches/reuses the page across navigations.
  const segment = router.currentRoute.value.query.segment as string;
  if (SEGMENT_VALUES.includes(segment)) bottomPanel.value = segment;
  utilStore.fetchEnumerations();
  utilStore.fetchStatuses();
  // Read the LIVE route id (not the captured snapshot) so a cached re-enter after the
  // in-place first-save fetches the real document, never the literal "new".
  const currentId = router.currentRoute.value.params.id as string;
  if(currentId === "new") {
    graphStore.startNewGraph();
  } else {
    await graphStore.fetchGraph(currentId);
    if (graph.value?.metadata.primaryEntityName) {
      await utilStore.fetchEntityFields(graph.value.metadata.primaryEntityName);
    }
    // Surface scheduled email exports for this document in the Preview segment.
    dataDocumentStore.fetchScheduledExports(currentId);
  }
});
</script>

<style scoped>
.graph-builder {
  min-height: 100%;
}

.preview-rows-input {
  max-width: 110px;
}

.graph-metadata-list {
  display: grid;
  grid-template-columns: 1fr auto auto min-content;
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
