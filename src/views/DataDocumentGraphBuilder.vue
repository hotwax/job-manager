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
                {{ translate("Primary Entity") }}
                <p>{{ graph.metadata.primaryEntityName || translate("Select Entity") }}</p>
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
              <ion-item-divider>
                <ion-label>{{ translate("Entity") }}</ion-label>
              </ion-item-divider>
              <ion-item>
                <ion-label>
                  <h2>{{ selectedNode.label }}</h2>
                  <p>{{ selectedNode.entityName }}</p>
                  <p>{{ selectedNode.relationshipType || translate("unknown") }}</p>
                </ion-label>
              </ion-item>
              <ion-item-divider>
                <ion-label>{{ translate("Configure entity") }}</ion-label>
              </ion-item-divider>
              <ion-item button @click="openGraphFieldModal">
                <ion-icon slot="start" :icon="addOutline" />
                <ion-label>{{ translate("Add field") }}</ion-label>
              </ion-item>
              <ion-item button @click="openRelatedFieldModal">
                <ion-icon slot="start" :icon="gitBranchOutline" />
                <ion-label>
                  {{ translate("Add related field") }}
                  <p>{{ translate("Create a related node from a relationship path.") }}</p>
                </ion-label>
              </ion-item>
              <ion-item-divider>
                <ion-label>{{ translate("Fields") }}</ion-label>
              </ion-item-divider>
              <ion-item v-for="field in selectedNodeFields" :key="field.fieldSeqId || field.fieldPath" button @click="selectField(field.fieldSeqId || field.fieldPath)">
                <ion-label>
                  <h2>{{ field.outputName }}</h2>
                  <p>{{ field.fieldPath }}</p>
                </ion-label>
                <ion-badge v-if="getFieldConditionCount(field)" slot="end" color="warning">
                  <ion-icon :icon="filterOutline" />
                  {{ getFieldConditionCount(field) }}
                </ion-badge>
              </ion-item>
            </ion-list>

            <ion-list v-else-if="selectedEdge">
              <ion-item-divider>
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
              <ion-item-divider>
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
              <ion-item>
                <ion-input
                  :value="selectedField.functionName"
                  :label="translate('Function')"
                  label-placement="stacked"
                  @ionInput="updateSelectedField({ functionName: $event.detail.value || '' })"
                />
              </ion-item>
              <ion-item-divider>
                <ion-label>{{ translate("Configure field") }}</ion-label>
              </ion-item-divider>
              <ion-item button @click="addConditionToSelection">
                <ion-icon slot="start" :icon="filterOutline" />
                <ion-label>{{ translate("Add condition") }}</ion-label>
              </ion-item>
              <ion-item-divider>
                <ion-label>{{ translate("Conditions") }}</ion-label>
              </ion-item-divider>
              <ion-item
                v-for="condition in selectedFieldConditions"
                :key="condition.conditionSeqId || condition.fieldNameAlias"
                button
                @click="openCondition(condition.conditionSeqId)"
              >
                <ion-icon slot="start" :icon="filterOutline" color="warning" />
                <ion-label>
                  <h2>{{ getConditionExpression(condition) }}</h2>
                  <p v-if="getConditionValue(condition) !== ''">{{ translate("Field Value") }}: {{ getConditionValue(condition) }}</p>
                  <p v-if="condition.toFieldNameAlias">{{ translate("To Field") }}: {{ condition.toFieldNameAlias }}</p>
                  <p v-if="condition.postQuery">{{ translate("Post Query") }}: {{ condition.postQuery }}</p>
                </ion-label>
              </ion-item>
              <ion-item v-if="!selectedFieldConditions.length">
                <ion-label>{{ translate("No conditions.") }}</ion-label>
              </ion-item>
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
          <ion-segment scrollable :value="bottomPanel" @ionChange="bottomPanel = String($event.detail.value || 'issues')">
            <ion-segment-button value="issues" layout="icon-start">
              <ion-icon :icon="filterOutline" />
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

          <ion-list v-else-if="bottomPanel === 'fields'">
            <ion-item v-for="field in graph.fields" :key="field.fieldSeqId || field.fieldPath" button @click="selectField(field.fieldSeqId || field.fieldPath)">
              <ion-checkbox
                slot="start"
                :checked="selectedFields.includes(field.outputName)"
                @ionChange="toggleSelectedField(field.outputName, $event.detail.checked)"
              />
              <ion-label>
                <h2>{{ field.outputName }}</h2>
                <p>{{ field.fieldPath }}</p>
              </ion-label>
              <ion-badge v-if="getFieldConditionCount(field)" slot="end" color="warning">
                <ion-icon :icon="filterOutline" />
                {{ getFieldConditionCount(field) }}
              </ion-badge>
            </ion-item>
          </ion-list>

          <ion-list v-else-if="bottomPanel === 'conditions'">
            <ion-item
              v-for="condition in graph.conditions"
              :key="condition.conditionSeqId || condition.fieldNameAlias"
              button
              @click="openCondition(condition.conditionSeqId)"
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
            <ion-item v-if="!graph.conditions.length">
              <ion-label>{{ translate("No conditions.") }}</ion-label>
            </ion-item>
          </ion-list>

          <ion-list v-else-if="bottomPanel === 'preview'">
            <ion-button @click="runPreview" :disabled="!graph?.dataDocumentId">
              <ion-icon slot="start" :icon="playOutline" />
              {{ translate("Preview") }}
            </ion-button>
            <ion-item v-for="(row, index) in previewRows" :key="index">
              <ion-label>
                <h2>{{ translate("Record") }} {{ index + 1 }}</h2>
                <p v-for="field in Object.keys(row)" :key="field">
                  <strong>{{ field }}:</strong> {{ row[field] }}
                </p>
              </ion-label>
            </ion-item>
          </ion-list>

          <ion-list v-else-if="bottomPanel === 'usage'">
            <ion-item-divider>
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
            <ion-item-divider>
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
            <ion-searchbar v-model="entityQueryString" :placeholder="translate('Search entities')" />
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <ion-radio-group :value="graph?.metadata.primaryEntityName" @ionChange="selectEntity($event.detail.value)">
            <ion-list>
              <ion-item v-for="entity in filteredEntities" :key="entity">
                <ion-radio :value="entity" label-placement="end" justify="start">{{ entity }}</ion-radio>
              </ion-item>
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
            <ion-buttons slot="end">
              <ion-button :disabled="!activeFieldEntityName" @click="refreshActiveFieldEntity">
                <ion-icon slot="icon-only" :icon="refreshOutline" />
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
          <ion-toolbar>
            <ion-searchbar v-model="fieldQueryString" :placeholder="translate('Search fields')" />
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <div v-if="utilStore.getFetchStatus.entityFields === 'pending'" class="ion-text-center ion-padding">
            <ion-spinner name="crescent" />
            <p>{{ translate("Fetching fields...") }}</p>
          </div>
          <ion-list v-else>
            <ion-item v-for="field in filteredEntityFields" :key="field.fieldName" button @click="selectGraphField(field)">
              <ion-label>
                <h2>{{ field.fieldName }}</h2>
                <p v-if="field.description">{{ field.description }}</p>
              </ion-label>
            </ion-item>
            <ion-item v-if="!filteredEntityFields.length">
              <ion-label class="ion-text-center">
                <p>{{ translate("No fields found for this entity.") }}</p>
              </ion-label>
            </ion-item>
          </ion-list>
        </ion-content>
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
              v-model="relatedFieldQueryString"
              :placeholder="relatedFieldStep === 'relationship' ? translate('Search relationships') : translate('Search fields')"
            />
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <ion-list v-if="relatedFieldStep === 'relationship'">
            <ion-item-divider>
              <ion-label>
                {{ translate("Select related entity") }}
                <p>{{ translate("Choose the relationship that reaches the entity you want to query.") }}</p>
              </ion-label>
            </ion-item-divider>
            <ion-item v-for="relationship in filteredActiveEntityRelationships" :key="relationship.relationshipName" button @click="selectRelationship(relationship)">
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
            <ion-item-divider>
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
              <ion-button slot="end" fill="clear" :disabled="!relatedEntityName" @click="refreshRelatedEntityFields">
                <ion-icon slot="icon-only" :icon="refreshOutline" />
              </ion-button>
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
            <ion-list>
            <ion-item-divider>
              <ion-label>
                {{ translate("Choose one field") }}
                <p>{{ translate("Selecting a field adds it to the data document and closes this modal.") }}</p>
              </ion-label>
            </ion-item-divider>
            <ion-item v-for="field in filteredRelatedEntityFields" :key="field.fieldName" button @click="selectRelatedGraphField(field)">
              <ion-label>
                <h2>{{ field.fieldName }}</h2>
                <p>{{ [relatedRelationshipPath, field.fieldName].filter(Boolean).join(":") }}</p>
                <p v-if="field.description">{{ field.description }}</p>
              </ion-label>
            </ion-item>
            <ion-item v-if="relatedEntityName && !filteredRelatedEntityFields.length">
              <ion-label class="ion-text-center">
                <p>{{ translate("No fields found for this entity.") }}</p>
              </ion-label>
            </ion-item>
          </ion-list>
          </template>
        </ion-content>
      </ion-modal>

      <ion-modal ref="conditionModal">
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button @click="closeConditionModal">
                <ion-icon slot="icon-only" :icon="closeOutline" />
              </ion-button>
            </ion-buttons>
            <ion-title>{{ translate("Edit Condition") }}</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <ion-list v-if="activeCondition">
            <ion-item>
              <ion-input
                :value="activeCondition.fieldNameAlias"
                :label="translate('Field Alias')"
                label-placement="stacked"
                @ionInput="updateActiveCondition({ fieldNameAlias: $event.detail.value || '' })"
              />
            </ion-item>
            <ion-item>
              <ion-select
                :value="activeCondition.operator"
                :label="translate('Operator')"
                label-placement="stacked"
                interface="popover"
                @ionChange="updateActiveCondition({ operator: $event.detail.value })"
              >
                <ion-select-option v-for="operator in operators" :key="operator.value" :value="operator.value">
                  {{ translate(operator.label) }}
                </ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-input
                :value="activeCondition.fieldValue"
                :label="translate('Value')"
                label-placement="stacked"
                @ionInput="updateActiveCondition({ fieldValue: $event.detail.value || '' })"
              />
            </ion-item>
            <ion-item lines="none">
              <ion-button color="danger" fill="clear" @click="removeActiveCondition">
                {{ translate("Remove condition") }}
              </ion-button>
              <ion-button slot="end" @click="closeConditionModal">
                {{ translate("Done") }}
              </ion-button>
            </ion-item>
          </ion-list>
        </ion-content>
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
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonList,
  IonModal,
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
  IonText,
  IonTitle,
  IonToggle,
  IonToolbar,
  onIonViewWillEnter
} from "@ionic/vue";
import { addOutline, arrowBackOutline, closeOutline, cloudDownloadOutline, cloudUploadOutline, filterOutline, gitBranchOutline, listOutline, optionsOutline, playOutline, refreshOutline, saveOutline } from "ionicons/icons";
import { computed, ref, watch } from "vue";
import router from "../router"

import { commonUtil, translate } from "@common";
import { useDataDocumentGraphStore } from "@/store/useDataDocumentGraphStore";
import { useDataDocumentStore } from "@/store/useDataDocumentStore";
import DataDocumentExportList from "@/components/DataDocumentExportList.vue";
import { showToast } from "@/utils";
import { useUtilStore } from "@/store/util";
import type { GraphCondition, GraphEdge, GraphField } from "@/utils/dataDocumentGraph";

const route = router.currentRoute.value;
const graphStore = useDataDocumentGraphStore();
const dataDocumentStore = useDataDocumentStore();
const utilStore = useUtilStore();

const selectedTarget = ref<{ kind: "node" | "edge" | "field"; id: string }>({ kind: "node", id: "node:root" });
const selectedFields = ref<string[]>([]);
const bottomPanel = ref("issues");
const pageSize = ref(25);
const entityModal = ref();
const entityQueryString = ref("");
const fieldModal = ref();
const fieldQueryString = ref("");
const relatedFieldModal = ref();
const advancedMetadataModal = ref();
const conditionModal = ref();
const relatedFieldQueryString = ref("");
const relatedFieldStep = ref<"relationship" | "confirm" | "fields">("relationship");
const relatedRelationshipPath = ref("");
const relatedEntityName = ref("");
const selectedRelationship = ref<any>();
const activeConditionId = ref("");

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
const isNew = computed(() => route.name === "CreateDataDocumentGraph");
const previewRows = computed(() => dataDocumentStore.getPreviewRows);
const relatedFeeds = computed(() => dataDocumentStore.getRelatedFeeds);
const relatedJobs = computed(() => dataDocumentStore.getRelatedJobs);
const exportHistory = computed(() => dataDocumentStore.getExportHistory);
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
const activeCondition = computed(() => graph.value?.conditions.find((condition) => condition.conditionSeqId === activeConditionId.value));
const selectedNodeFields = computed(() => graph.value?.fields.filter((field) => field.nodeId === selectedNode.value?.nodeId) || []);
const selectedFieldConditions = computed(() => selectedField.value ? getConditionsForField(selectedField.value) : []);
const entities = computed(() => utilStore.getEntities);
const filteredEntities = computed(() => {
  const query = entityQueryString.value.trim().toLowerCase();
  if (!query) return entities.value;
  return entities.value.filter((entity: string) => entity.toLowerCase().includes(query));
});
const activeFieldEntityName = computed(() => selectedNode.value?.entityName || graph.value?.metadata.primaryEntityName || "");
const entityFields = computed(() => activeFieldEntityName.value ? utilStore.getEntityFields(activeFieldEntityName.value) : []);
const filteredEntityFields = computed(() => {
  const query = fieldQueryString.value.trim().toLowerCase();
  const fields = entityFields.value.map((field: any) => typeof field === "string" ? { fieldName: field, description: "" } : field);
  if (!query) return fields;
  return fields.filter((field: any) => (
    field.fieldName.toLowerCase().includes(query) ||
    field.description?.toLowerCase().includes(query)
  ));
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

const openCondition = (conditionId?: string) => {
  if (!conditionId) return;
  activeConditionId.value = conditionId;
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
  if (activeFieldEntityName.value) {
    await utilStore.fetchEntityFields(activeFieldEntityName.value);
  }
  fieldModal.value.$el.present();
};

const refreshActiveFieldEntity = () => {
  if (activeFieldEntityName.value) {
    utilStore.fetchEntityFields(activeFieldEntityName.value, true);
  }
};

const selectGraphField = (field: any) => {
  const addedField = graphStore.addField(selectedNode.value?.nodeId || "node:root", field.fieldName);
  if (addedField) {
    selectedTarget.value = { kind: "field", id: addedField.fieldSeqId || addedField.fieldPath || field.fieldName };
  }
  closeFieldModal();
};

const closeFieldModal = () => {
  fieldModal.value.$el.dismiss();
};

const openRelatedFieldModal = async () => {
  relatedFieldQueryString.value = "";
  relatedFieldStep.value = "relationship";
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
};

const confirmRelatedFieldPath = async () => {
  if (relatedEntityName.value) {
    await utilStore.fetchEntityFields(relatedEntityName.value);
  }
  relatedFieldQueryString.value = "";
  relatedFieldStep.value = "fields";
};

const fetchRelatedEntityFields = () => {
  const entityName = relatedEntityName.value.trim();
  if (entityName) {
    utilStore.fetchEntityFields(entityName);
  }
};

const refreshRelatedEntityFields = () => {
  const entityName = relatedEntityName.value.trim();
  if (entityName) {
    utilStore.fetchEntityFields(entityName, true);
  }
};

const selectRelatedGraphField = (field: any) => {
  const relationshipPath = relatedRelationshipPath.value.trim().replace(/^:+|:+$/g, "");
  if (!relationshipPath) {
    showToast(translate("Relationship path is required."));
    return;
  }
  const fieldPath = `${relationshipPath}:${field.fieldName}`;
  const addedField = graphStore.addFieldPath(fieldPath, field.fieldName);
  if (addedField) {
    selectedTarget.value = { kind: "field", id: addedField.fieldSeqId || addedField.fieldPath || fieldPath };
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

const addConditionToSelection = () => {
  if (!selectedField.value) return;
  const condition = graphStore.addCondition(selectedField.value.outputName);
  if (!condition?.conditionSeqId) return;
  activeConditionId.value = condition.conditionSeqId;
  conditionModal.value.$el.present();
};

const updateActiveCondition = (patch: Record<string, any>) => {
  if (!activeCondition.value) return;
  graphStore.updateCondition(activeCondition.value.conditionSeqId, patch);
};

const removeActiveCondition = () => {
  if (!activeCondition.value?.conditionSeqId) return;
  graphStore.removeCondition(activeCondition.value.conditionSeqId);
  closeConditionModal();
};

const closeConditionModal = () => {
  conditionModal.value.$el.dismiss();
};

const toggleSelectedField = (fieldName: string, checked: boolean) => {
  selectedFields.value = checked
    ? [...new Set(selectedFields.value.concat(fieldName))]
    : selectedFields.value.filter((field) => field !== fieldName);
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
  await graphStore.saveGraph();
  showToast(translate("Data document graph saved."));
  if (isNew.value && graph.value?.dataDocumentId) {
    router.replace(`/data-documents/${graph.value.dataDocumentId}/graph`);
  }
};

const runPreview = async () => {
  await dataDocumentStore.runPreview(graph.value?.dataDocumentId as string, buildQuery());
};

const queueExport = async () => {
  try {
    await dataDocumentStore.queueExport(graph.value?.dataDocumentId as string);
    commonUtil.showToast(translate("Data document export queued."));
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

onIonViewWillEnter(async () => {
  if(isNew.value) {
    graphStore.startNewGraph();
  } else {
    await graphStore.fetchGraph(route.params.id as string);
  }
});
</script>

<style scoped>
.graph-builder {
  min-height: 100%;
}

.graph-metadata-list {
  display: grid;
  grid-template-columns: 1fr auto auto min-content;
}

.graph-workspace {
  display: flex;
  min-height: 620px;
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
