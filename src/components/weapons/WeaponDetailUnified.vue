<template>
  <div class="space-y-6 text-text">
    <!-- Wishlists Applied (collapsible, at top) -->
    <div class="bg-surface-elevated/30 rounded-lg border border-border/50">
      <button
        @click="wishlistsExpanded = !wishlistsExpanded"
        class="flex items-center justify-between w-full p-3 text-left"
      >
        <div class="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 transition-transform"
            :class="{ 'rotate-90': wishlistsExpanded }"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
          <h4 class="font-bold text-sm text-text-muted uppercase tracking-wider">Wishlists Applied</h4>
        </div>
        <span v-if="!wishlistsExpanded && wishlistsAppliedRef" class="text-xs text-text-subtle truncate max-w-[50%]">
          {{ wishlistsAppliedRef.summaryText }}
        </span>
      </button>

      <div v-show="wishlistsExpanded" class="px-4 pb-4">
        <WishlistsApplied ref="wishlistsAppliedRef" :weapon-hash="weapon.weaponHash" />
      </div>
    </div>

    <!-- Mode Toggle -->
    <div class="flex items-center justify-center">
      <div class="flex items-center gap-1 bg-surface-overlay rounded-lg p-1">
        <button
          @click="viewMode = 'wishlist'"
          class="px-4 py-2 text-sm font-medium rounded-md transition-colors"
          :class="viewMode === 'wishlist'
            ? 'bg-blue-600 text-white'
            : 'text-text-muted hover:text-text hover:bg-surface-elevated'"
        >
          Wishlist Editor
        </button>
        <button
          @click="viewMode = 'coverage'"
          class="px-4 py-2 text-sm font-medium rounded-md transition-colors"
          :class="viewMode === 'coverage'
            ? 'bg-purple-600 text-white'
            : 'text-text-muted hover:text-text hover:bg-surface-elevated'"
        >
          Coverage Analysis
        </button>
      </div>
    </div>

    <!-- ==================== WISHLIST MODE ==================== -->
    <template v-if="viewMode === 'wishlist'">
      <!-- Saved Wishlist Rolls (collapsible) -->
      <div v-if="displayProfiles.length > 0" class="space-y-3">
      <button
        @click="savedRollsExpanded = !savedRollsExpanded"
        class="flex items-center gap-2 w-full text-left"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4 transition-transform"
          :class="{ 'rotate-90': savedRollsExpanded }"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
        <h4 class="font-bold text-sm text-text-muted uppercase tracking-wider">
          Saved Wishlist Rolls ({{ displayProfiles.length }})
        </h4>
      </button>

      <div v-show="savedRollsExpanded" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="profile in displayProfiles"
          :key="profile.id"
          class="group bg-surface-elevated border border-border hover:border-border-subtle rounded-lg p-3 transition-colors cursor-pointer relative"
          :class="{ 'ring-2 ring-blue-500/50 border-blue-500/50 bg-blue-900/10': isProfileActive(profile) }"
          @click="loadProfile(profile)"
        >
          <!-- Header row with actions -->
          <div class="flex justify-between items-start mb-2">
            <div class="flex items-center gap-1.5">
              <span class="text-xs text-text-subtle">
                {{ profile.item.perkHashes.length }} perks
              </span>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-2" @click.stop>
              <template v-if="profile.showDeleteConfirm">
                <span class="text-xs text-red-600 dark:text-red-400 font-bold">Sure?</span>
                <button
                  @click="deleteProfile(profile.id)"
                  class="text-xs px-2 py-0.5 bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-800 rounded"
                >
                  Yes
                </button>
                <button
                  @click="profile.showDeleteConfirm = false"
                  class="text-xs px-2 py-0.5 bg-surface-overlay hover:bg-surface-elevated text-text-muted rounded"
                >
                  Cancel
                </button>
              </template>
              <template v-else>
                <button
                  @click="profile.showDeleteConfirm = true"
                  class="p-1 text-text-subtle hover:text-red-600 dark:hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </template>
            </div>
          </div>

          <!-- DIM-style perk matrix -->
          <WishlistPerkMatrix
            :weapon-hash="weapon.weaponHash"
            :perk-hashes="profile.item.perkHashes"
          />

          <!-- Notes (if any) -->
          <p v-if="profile.item.notes" class="text-xs text-text-muted mt-2 line-clamp-2">
            {{ profile.item.notes }}
          </p>
        </div>
      </div>
    </div>

      <!-- Perk Matrix Section (Wishlist Mode - always editable) -->
      <div class="space-y-4">
        <!-- Header with controls -->
        <div class="flex items-center justify-between">
          <h4 class="font-bold text-lg">Perk Matrix</h4>
          <div class="flex items-center gap-4">
            <!-- Enhanced Perks toggle (wrapped to match Coverage mode toggle height) -->
            <div v-if="hasEnhanceablePerks" class="flex items-center gap-1 bg-surface-overlay rounded-lg p-1">
              <button
                @click="toggleEnhancedMode"
                class="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                :class="enhancedMode
                  ? 'bg-amber-600 text-white'
                  : 'text-text-muted hover:text-text hover:bg-surface-elevated'"
                :title="enhancedMode ? 'Show base perks' : 'Show enhanced perks'"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                <span>Enhanced Perks</span>
              </button>
            </div>

            <!-- Clear Selection -->
            <button
              v-if="hasSelection"
              @click="clearSelection"
              class="text-xs px-3 py-1.5 rounded bg-surface-elevated hover:bg-surface-overlay border border-border transition-colors text-text-muted hover:text-text"
            >
              Clear Perks
            </button>
          </div>
        </div>

      <!-- Matrix Grid -->
      <div class="bg-surface border border-border rounded-lg overflow-hidden">
        <!-- Column Headers -->
        <div
          class="grid gap-px bg-surface-elevated border-b border-border"
          :style="{ gridTemplateColumns: `repeat(${matrixColumns.length}, minmax(5rem, 1fr))` }"
        >
          <div
            v-for="col in matrixColumns"
            :key="col.columnIndex"
            class="p-2 text-xs uppercase font-bold text-center text-text-muted tracking-wider truncate"
          >
            {{ col.columnName }}
          </div>
        </div>

        <!-- Matrix Content -->
        <div class="flex gap-2 p-2">
          <div
            v-for="column in matrixColumns"
            :key="column.columnIndex"
            class="flex-1 flex flex-col gap-1"
          >
            <div
              v-for="perk in getAvailablePerks(column)"
              :key="perk.hash"
              class="relative px-2 py-1.5 rounded-lg border group transition-all duration-200 cursor-pointer"
              :class="getPerkRowClassesWishlist(perk, column)"
              @click="toggleSelection(perk, column)"
              @mouseenter="hoveredPerkHash = perk.hash"
              @mouseleave="hoveredPerkHash = null"
            >
              <!-- Content -->
              <div
                class="relative z-10 flex items-center gap-1.5"
                :title="getPerkTooltip(perk, column)"
              >
                <div class="relative flex-shrink-0 ml-0.5 w-8 h-8">
                  <!-- Perk icon with ring indicator -->
                  <div
                    class="w-8 h-8 rounded-full overflow-hidden bg-perk-background"
                    :class="getPerkIconClassesWishlist(perk, column)"
                  >
                    <img
                      v-if="getPerkIcon(perk, column)"
                      :src="`https://www.bungie.net${getPerkIcon(perk, column)}`"
                      class="w-full h-full object-cover"
                    />
                    <div v-else class="w-full h-full bg-surface-overlay"></div>
                  </div>

                  <!-- Enhanced indicator badge (upper-left) -->
                  <div
                    v-if="isEnhancedDisplay(perk, column)"
                    class="absolute -top-0.5 -left-0.5 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center shadow-lg"
                    title="Enhanced Perk"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  </div>

                  <!-- Wishlist thumbs-up indicator (upper-right) -->
                  <div
                    v-if="isWishlistPerk(perk.hash)"
                    class="absolute -top-0.5 -right-0.5 w-4 h-4 bg-green-600 rounded-full flex items-center justify-center shadow-lg"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                    </svg>
                  </div>
                </div>
                <span
                  class="text-xs font-medium truncate select-none leading-tight"
                  :class="perk.isOwned ? 'text-text' : 'text-text-subtle'"
                >
                  {{ isEnhancedDisplay(perk, column) ? perk.name.replace(/^Enhanced\s+/i, '') : perk.name }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Inline Save Form (when perks selected) -->
      <div v-if="hasSelection" class="bg-surface-elevated/80 rounded-lg border border-border p-4 animate-in fade-in slide-in-from-top-2 duration-200">
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">
              Notes (Optional)
            </label>
            <textarea
              v-model="profileNotesInput"
              placeholder="Add notes about this roll (e.g., PvP Roll, Best for add clear)..."
              rows="2"
              class="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-text-subtle resize-none"
            />
            <p class="text-xs text-text-subtle mt-1">
              {{ saveTargetText }}
            </p>
          </div>

          <div class="flex justify-end items-center gap-3">
            <p v-if="saveMessage" :class="['text-xs', saveMessage.type === 'error' ? 'text-red-600 dark:text-red-400' : 'text-text-muted']">{{ saveMessage.text }}</p>
            <button
              @click="clearSelection"
              class="px-4 py-2 rounded text-sm font-medium transition-colors bg-surface-overlay hover:bg-surface-elevated text-text border border-border"
            >
              Clear Selection
            </button>
            <button
              @click="handleSave"
              class="px-4 py-2 rounded text-sm font-medium transition-colors"
              :class="buttonClasses"
            >
              {{ buttonLabel }}
            </button>
          </div>
        </div>
      </div>
      </div>

      <!-- Instances List (Wishlist Mode) -->
    <div class="space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <h4 class="font-bold text-lg">In Your Inventory ({{ filteredAndSortedInstances.length }})</h4>
        <div class="flex items-center gap-2">
          <!-- Sort toggle -->
          <button
            @click="cycleSortOrder"
            class="px-2 py-1 text-xs font-medium rounded transition-colors"
            :class="sortOrder !== 'none' ? 'bg-surface-overlay text-text' : 'bg-surface-elevated text-text-muted hover:bg-surface-overlay'"
            title="Sort by tier"
          >
            {{ sortOrder === 'desc' ? '↓' : sortOrder === 'asc' ? '↑' : '−' }} Tier
          </button>
          <!-- Tier filter buttons -->
          <div class="flex gap-0.5 bg-surface-elevated rounded p-0.5">
            <button
              v-for="tier in [5, 4, 3, 2, 1]"
              :key="tier"
              @click="toggleTier(tier)"
              class="w-6 h-6 text-xs font-medium rounded transition-colors"
              :class="enabledTiers.has(tier) ? 'bg-surface-overlay text-text' : 'bg-surface-elevated text-text-subtle hover:text-text-muted'"
              :title="`Toggle Tier ${tier}`"
            >
              {{ tier }}
            </button>
            <button
              @click="toggleTier(null)"
              class="w-6 h-6 text-xs font-medium rounded transition-colors"
              :class="enabledTiers.has(null) ? 'bg-surface-overlay text-text' : 'bg-surface-elevated text-text-subtle hover:text-text-muted'"
              title="Toggle No Tier"
            >
              0
            </button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        <div
          v-for="instance in filteredAndSortedInstances"
          :key="instance.itemInstanceId"
          class="p-3 rounded-lg border transition-all duration-200 cursor-pointer overflow-hidden"
          :class="getInstanceClassesWishlist(instance.itemInstanceId)"
          @mouseenter="hoveredInstanceId = instance.itemInstanceId"
          @mouseleave="hoveredInstanceId = null"
        >
          <div class="flex items-center justify-between mb-2 gap-1">
            <div class="flex items-center gap-1.5">
              <!-- DIM selection checkbox -->
              <button
                @click.stop="toggleDIMSelection(instance.itemInstanceId)"
                class="w-4 h-4 rounded border flex items-center justify-center transition-colors"
                :class="selectedForDIM.has(instance.itemInstanceId)
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'border-border-subtle hover:border-text-muted'"
                title="Select for DIM export"
              >
                <svg v-if="selectedForDIM.has(instance.itemInstanceId)" xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <span class="font-bold text-xs font-mono" :title="instance.itemInstanceId">#{{ instance.itemInstanceId.slice(-4) }}</span>
            </div>
            <div class="flex items-center gap-1">
              <!-- Match badge (when perks selected) -->
              <span
                v-if="hasSelection && isMatch(instance.itemInstanceId)"
                class="text-xs font-bold px-1.5 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded uppercase tracking-wide"
              >
                Match
              </span>
              <span :class="getTierClass(instance.gearTier)" class="text-xs">{{ formatTier(instance.gearTier) }}</span>
            </div>
          </div>

          <!-- DIM-style Perk Grid for Instance -->
          <InstancePerkGrid
            :instance="instance"
            :perk-matrix="weapon.perkMatrix"
            :wishlist-perk-annotations="wishlistPerkAnnotations"
            :highlighted-perks="getHighlightedPerksForInstance()"
          />
        </div>
      </div>
    </div>
    </template>

    <!-- ==================== COVERAGE MODE ==================== -->
    <template v-else>
      <!-- Perk Matrix Section (Coverage Mode - read-only) -->
      <div class="space-y-4">
        <!-- Header with controls (matching Wishlist Mode layout) -->
        <div class="flex items-center justify-between">
          <h4 class="font-bold text-lg">Perk Matrix</h4>
          <div class="flex items-center gap-4">
            <!-- Hover hint text -->
            <p class="text-xs text-text-subtle">
              Hover over perks or instances to see relationship
            </p>
            <!-- Simple/Detailed toggle -->
            <div class="flex items-center gap-1 bg-surface-overlay rounded-lg p-1">
              <button
                @click="visualMode = 'simple'"
                class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                :class="visualMode === 'simple'
                  ? 'bg-green-600 text-white'
                  : 'text-text-muted hover:text-text hover:bg-surface-elevated'"
                title="Shows all owned perks across all rolls"
              >
                Simple
              </button>
              <button
                @click="visualMode = 'detailed'"
                class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                :class="visualMode === 'detailed'
                  ? 'bg-purple-600 text-white'
                  : 'text-text-muted hover:text-text hover:bg-surface-elevated'"
                title="Shows 1 colored bar for each roll that has that perk"
              >
                Detailed
              </button>
            </div>
            <!-- Enhanced Perks toggle (same as Wishlist Mode) -->
            <div v-if="hasEnhanceablePerks" class="flex items-center gap-1 bg-surface-overlay rounded-lg p-1">
              <button
                @click="toggleEnhancedMode"
                class="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                :class="enhancedMode
                  ? 'bg-amber-600 text-white'
                  : 'text-text-muted hover:text-text hover:bg-surface-elevated'"
                :title="enhancedMode ? 'Show base perks' : 'Show enhanced perks'"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                <span>Enhanced Perks</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Matrix Grid -->
        <div class="bg-surface border border-border rounded-lg overflow-hidden">
          <!-- Column Headers -->
          <div
            class="grid gap-px bg-surface-elevated border-b border-border"
            :style="{ gridTemplateColumns: `repeat(${matrixColumns.length}, minmax(5rem, 1fr))` }"
          >
            <div
              v-for="col in matrixColumns"
              :key="col.columnIndex"
              class="p-2 text-xs uppercase font-bold text-center text-text-muted tracking-wider truncate"
            >
              {{ col.columnName }}
            </div>
          </div>

          <!-- Matrix Content -->
          <div class="flex gap-2 p-2">
            <div
              v-for="column in matrixColumns"
              :key="column.columnIndex"
              class="flex-1 flex flex-col gap-1"
            >
              <div
                v-for="perk in getAvailablePerks(column)"
                :key="perk.hash"
                class="relative px-2 py-1.5 rounded-lg border group transition-all duration-200 cursor-default"
                :class="getPerkRowClassesCoverage(perk, column)"
                @mouseenter="hoveredPerkHash = perk.hash"
                @mouseleave="hoveredPerkHash = null"
              >
                <!-- Segmented Bars Background (detailed visualization) -->
                <div v-if="visualMode === 'detailed'" class="absolute inset-0 flex h-full w-full opacity-30 rounded-lg overflow-hidden">
                  <div
                    v-for="instanceId in getInstancesWithPerk(perk.hash, column.columnIndex)"
                    :key="instanceId"
                    class="h-full flex-grow"
                    :style="{ backgroundColor: getInstanceColor(instanceId) }"
                  ></div>
                </div>

                <!-- Hover Overlay for Detailed -->
                <div
                  v-if="visualMode === 'detailed' && hoveredInstanceId && doesInstanceHavePerk(hoveredInstanceId, perk.hash, column.columnIndex)"
                  class="absolute inset-0 bg-white/10 border-2 border-white/50 rounded-lg"
                ></div>

                <!-- Content -->
                <div
                  class="relative z-10 flex items-center gap-1.5"
                  :title="getPerkTooltip(perk, column)"
                >
                  <div class="relative flex-shrink-0 ml-0.5 w-8 h-8">
                    <!-- Perk icon with ring indicator -->
                    <div
                      class="w-8 h-8 rounded-full overflow-hidden bg-perk-background"
                      :class="getPerkIconClassesCoverage(perk)"
                    >
                      <img
                        v-if="perk.icon"
                        :src="`https://www.bungie.net${perk.icon}`"
                        class="w-full h-full object-cover"
                      />
                      <div v-else class="w-full h-full bg-surface-overlay"></div>
                    </div>

                    <!-- Enhanced indicator badge (upper-left) -->
                    <div
                      v-if="isEnhancedDisplay(perk, column)"
                      class="absolute -top-0.5 -left-0.5 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center shadow-lg"
                      title="Enhanced Perk"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                    </div>

                    <!-- Wishlist thumbs-up indicator (upper-right) -->
                    <div
                      v-if="isWishlistPerk(perk.hash)"
                      class="absolute -top-0.5 -right-0.5 w-4 h-4 bg-green-600 rounded-full flex items-center justify-center shadow-lg"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                      </svg>
                    </div>
                  </div>
                  <span
                    class="text-xs font-medium truncate select-none leading-tight"
                    :class="perk.isOwned ? 'text-text' : 'text-text-subtle'"
                  >
                    {{ isEnhancedDisplay(perk, column) ? perk.name.replace(/^Enhanced\s+/i, '') : perk.name }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Instances List (Coverage Mode) -->
      <div class="space-y-4">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <h4 class="font-bold text-lg">In Your Inventory ({{ filteredAndSortedInstances.length }})</h4>
          <div class="flex items-center gap-2">
            <!-- Sort toggle -->
            <button
              @click="cycleSortOrder"
              class="px-2 py-1 text-xs font-medium rounded transition-colors"
              :class="sortOrder !== 'none' ? 'bg-surface-overlay text-text' : 'bg-surface-elevated text-text-muted hover:bg-surface-overlay'"
              title="Sort by tier"
            >
              {{ sortOrder === 'desc' ? '↓' : sortOrder === 'asc' ? '↑' : '−' }} Tier
            </button>
            <!-- Tier filter buttons -->
            <div class="flex gap-0.5 bg-surface-elevated rounded p-0.5">
              <button
                v-for="tier in [5, 4, 3, 2, 1]"
                :key="tier"
                @click="toggleTier(tier)"
                class="w-6 h-6 text-xs font-medium rounded transition-colors"
                :class="enabledTiers.has(tier) ? 'bg-surface-overlay text-text' : 'bg-surface-elevated text-text-subtle hover:text-text-muted'"
                :title="`Toggle Tier ${tier}`"
              >
                {{ tier }}
              </button>
              <button
                @click="toggleTier(null)"
                class="w-6 h-6 text-xs font-medium rounded transition-colors"
                :class="enabledTiers.has(null) ? 'bg-surface-overlay text-text' : 'bg-surface-elevated text-text-subtle hover:text-text-muted'"
                title="Toggle No Tier"
              >
                0
              </button>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          <div
            v-for="instance in filteredAndSortedInstances"
            :key="instance.itemInstanceId"
            class="p-3 rounded-lg border transition-all duration-200 cursor-pointer overflow-hidden"
            :class="getInstanceClassesCoverage(instance.itemInstanceId)"
            :style="getInstanceStyleCoverage(instance.itemInstanceId)"
            @mouseenter="hoveredInstanceId = instance.itemInstanceId"
            @mouseleave="hoveredInstanceId = null"
          >
            <div class="flex items-center justify-between mb-2 gap-1">
              <div class="flex items-center gap-1.5">
                <!-- DIM selection checkbox -->
                <button
                  @click.stop="toggleDIMSelection(instance.itemInstanceId)"
                  class="w-4 h-4 rounded border flex items-center justify-center transition-colors"
                  :class="selectedForDIM.has(instance.itemInstanceId)
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'border-border-subtle hover:border-text-muted'"
                  title="Select for DIM export"
                >
                  <svg v-if="selectedForDIM.has(instance.itemInstanceId)" xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <span class="font-bold text-xs font-mono" :title="instance.itemInstanceId">#{{ instance.itemInstanceId.slice(-4) }}</span>
              </div>
              <div class="flex items-center gap-1">
                <span :class="getTierClass(instance.gearTier)" class="text-xs">{{ formatTier(instance.gearTier) }}</span>
              </div>
            </div>

            <!-- DIM-style Perk Grid for Instance -->
            <InstancePerkGrid
              :instance="instance"
              :perk-matrix="weapon.perkMatrix"
              :wishlist-perk-annotations="wishlistPerkAnnotations"
              :highlighted-perks="getHighlightedPerksForInstanceCoverage()"
            />
          </div>
        </div>
      </div>
    </template>

    <!-- Notes Section -->
    <div class="rounded-lg border border-border bg-surface/40 p-3">
      <h4 class="text-xs font-semibold uppercase tracking-wide text-text-muted">Notes</h4>
      <div class="mt-2 space-y-2 text-sm">
        <div>
          <p class="text-xs text-text-subtle">Intrinsic Trait</p>
          <div v-if="weapon.intrinsicPerks.length" class="mt-1 flex flex-wrap gap-2">
            <span
              v-for="perk in weapon.intrinsicPerks"
              :key="perk.hash"
              :title="perk.description || perk.name"
              class="inline-flex items-center gap-2 rounded border border-border bg-surface/60 px-2 py-1 text-xs text-text cursor-help"
            >
              <img
                v-if="perk.icon"
                :src="`https://www.bungie.net${perk.icon}`"
                :alt="perk.name"
                class="h-4 w-4 rounded bg-perk-background"
              />
              <span>{{ perk.name }}</span>
            </span>
          </div>
          <p v-else class="mt-1 text-xs text-text-subtle">None detected</p>
        </div>
        <div>
          <p class="text-xs text-text-subtle">Masterwork</p>
          <div v-if="weapon.masterworkPerks.length" class="mt-1 flex flex-wrap gap-2">
            <span
              v-for="perk in weapon.masterworkPerks"
              :key="perk.hash"
              :title="perk.description || perk.name"
              class="inline-flex items-center gap-2 rounded border border-border bg-surface/60 px-2 py-1 text-xs text-text cursor-help"
            >
              <img
                v-if="perk.icon"
                :src="`https://www.bungie.net${perk.icon}`"
                :alt="perk.name"
                class="h-4 w-4 rounded bg-perk-background"
              />
              <span>{{ perk.name }}</span>
            </span>
          </div>
          <p v-else class="mt-1 text-xs text-text-subtle">None detected</p>
        </div>
      </div>
    </div>

    <!-- Spacer for sticky footer -->
    <div v-if="selectedForDIM.size > 0" class="h-16"></div>

    <!-- Sticky Footer for DIM Export -->
    <Transition
      enter-active-class="transition-transform duration-200 ease-out"
      enter-from-class="translate-y-full"
      enter-to-class="translate-y-0"
      leave-active-class="transition-transform duration-150 ease-in"
      leave-from-class="translate-y-0"
      leave-to-class="translate-y-full"
    >
      <div
        v-if="selectedForDIM.size > 0"
        class="fixed bottom-0 left-0 right-0 bg-surface-elevated border-t border-border shadow-lg z-50"
      >
        <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <span class="text-sm font-medium text-text">
            {{ selectedForDIM.size }} {{ selectedForDIM.size === 1 ? 'item' : 'items' }} selected
          </span>
          <div class="flex items-center gap-2">
            <button
              @click="clearDIMSelection"
              class="px-4 py-2 rounded-lg font-medium text-sm transition-colors bg-surface-overlay hover:bg-surface text-text-muted hover:text-text border border-border"
            >
              Clear
            </button>
            <button
              @click="copySelectedToDIM"
              class="px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
              :class="justCopied
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'"
            >
              <svg v-if="justCopied" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {{ justCopied ? 'Copied!' : 'Copy to DIM' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { DedupedWeapon, PerkColumn } from '@/models/deduped-weapon'
import type { WeaponInstance } from '@/models/weapon-instance'
import type { Perk } from '@/models/perk'
import type { WishlistItem, Wishlist } from '@/models/wishlist'
import { useWishlistsStore } from '@/stores/wishlists'
import type { PerkColumnInfo } from '@/services/dim-wishlist-parser'
import { getWishlistPerkAnnotations, selectionToWishlistItem } from '@/services/dim-wishlist-parser'
import InstancePerkGrid from './InstancePerkGrid.vue'
import WishlistPerkMatrix from '@/components/wishlists/WishlistPerkMatrix.vue'
import WishlistsApplied from './WishlistsApplied.vue'

const props = defineProps<{
  weapon: DedupedWeapon
}>()

// Initialize wishlists store
const wishlistsStore = useWishlistsStore()

// Initialize store on mount
onMounted(async () => {
  if (!wishlistsStore.initialized) {
    await wishlistsStore.initialize(false)
  }
  loadProfilesFromStore()
})

// ============ MODE STATE ============
const viewMode = ref<'wishlist' | 'coverage'>('wishlist')
const savedRollsExpanded = ref(true)
const wishlistsExpanded = ref(false)

// Ref to WishlistsApplied component for accessing summaryText
const wishlistsAppliedRef = ref<InstanceType<typeof WishlistsApplied> | null>(null)

// ============ VIEW MODE STATE (Coverage) ============
const visualMode = ref<'simple' | 'detailed'>('simple')
const hoveredPerkHash = ref<number | null>(null)
const hoveredInstanceId = ref<string | null>(null)

// Instance sorting and filtering
const sortOrder = ref<'desc' | 'asc' | 'none'>('desc')
const enabledTiers = ref<Set<number | null>>(new Set([1, 2, 3, 4, 5, null]))

// DIM multi-select state
const selectedForDIM = ref<Set<string>>(new Set())
const justCopied = ref(false)

// ============ EDIT MODE STATE (GodRoll) ============
const selection = ref<Set<number>>(new Set())
const enhancedMode = ref(false)
const profileNotesInput = ref('')
const saveMessage = ref<{ text: string; type: 'error' | 'info' } | null>(null)

// Profile management
interface DisplayProfile {
  id: string
  item: WishlistItem
  showDeleteConfirm?: boolean
}
const displayProfiles = ref<DisplayProfile[]>([])
const currentProfileId = ref<string | null>(null)
const sourceWishlistId = ref<string | null>(null)

// ============ COMPUTED ============
const matrixColumns = computed(() => props.weapon.perkMatrix)
const hasSelection = computed(() => selection.value.size > 0)

// Convert perkMatrix to PerkColumnInfo format for store helpers
const perkColumnsForStore = computed<PerkColumnInfo[]>(() => {
  return matrixColumns.value.map(col => ({
    columnIndex: col.columnIndex,
    columnName: col.columnName,
    availablePerks: col.availablePerks.map(p => ({ hash: p.hash, name: p.name }))
  }))
})

// Build a map from any perk hash to all its variants (for matching)
const perkVariantsMap = computed(() => {
  const map = new Map<number, number[]>()
  for (const col of props.weapon.perkMatrix) {
    for (const perk of col.availablePerks) {
      const variants = perk.variantHashes || [perk.hash]
      for (const variantHash of variants) {
        map.set(variantHash, variants)
      }
      map.set(perk.hash, variants)
    }
  }
  return map
})

// Build a lookup map for perks (hash -> Perk)
const perkLookup = computed(() => {
  const map = new Map<number, Perk>()
  for (const col of matrixColumns.value) {
    for (const perk of col.availablePerks) {
      map.set(perk.hash, perk)
      if (perk.variantHashes) {
        for (const variantHash of perk.variantHashes) {
          map.set(variantHash, perk)
        }
      }
    }
  }
  return map
})

// Get wishlist perk annotations for this weapon (expanded to include all variant hashes)
const wishlistPerkAnnotations = computed(() => {
  const wishlistResults = wishlistsStore.getItemsForWeaponHash(props.weapon.weaponHash)
  const baseAnnotations = getWishlistPerkAnnotations(wishlistResults)

  const expandedAnnotations = new Map<number, string[]>()
  for (const [perkHash, wishlistNames] of baseAnnotations) {
    expandedAnnotations.set(perkHash, wishlistNames)
    const variants = perkVariantsMap.value.get(perkHash)
    if (variants) {
      for (const variantHash of variants) {
        const existing = expandedAnnotations.get(variantHash) || []
        for (const name of wishlistNames) {
          if (!existing.includes(name)) {
            existing.push(name)
          }
        }
        expandedAnnotations.set(variantHash, existing)
      }
    }
  }
  return expandedAnnotations
})

// Check if any perks have enhanced variants
const hasEnhanceablePerks = computed(() => {
  for (const col of matrixColumns.value) {
    if (col.availablePerks.some(p => p.hasEnhancedVariant)) {
      return true
    }
  }
  return false
})

// Helper: compare instance IDs numerically (IDs can be large, use BigInt)
const compareInstanceIds = (a: WeaponInstance, b: WeaponInstance): number => {
  const idA = BigInt(a.itemInstanceId)
  const idB = BigInt(b.itemInstanceId)
  return idA < idB ? -1 : idA > idB ? 1 : 0
}

// Filtered and sorted instances
const filteredAndSortedInstances = computed(() => {
  let instances = props.weapon.instances.filter(i => {
    const tier = i.gearTier || null
    return enabledTiers.value.has(tier)
  })

  // Default sort: by instance ID numerically
  instances = [...instances].sort(compareInstanceIds)

  if (sortOrder.value !== 'none') {
    instances = [...instances].sort((a, b) => {
      const tierA = a.gearTier ?? 0
      const tierB = b.gearTier ?? 0
      return sortOrder.value === 'desc' ? tierB - tierA : tierA - tierB
    })
  }

  // Wishlist mode: sort matches first when perks are selected
  if (viewMode.value === 'wishlist' && hasSelection.value) {
    instances = [...instances].sort((a, b) => {
      const aMatches = isMatchInstance(a) ? 0 : 1
      const bMatches = isMatchInstance(b) ? 0 : 1
      if (aMatches !== bMatches) return aMatches - bMatches
      // Within each group, sort by instance ID
      return compareInstanceIds(a, b)
    })
  }

  // Coverage mode: sort instances with hovered perk first
  if (viewMode.value === 'coverage' && hoveredPerkHash.value) {
    instances = [...instances].sort((a, b) => {
      const aHasPerk = instanceHasPerkAny(a.itemInstanceId, hoveredPerkHash.value!) ? 0 : 1
      const bHasPerk = instanceHasPerkAny(b.itemInstanceId, hoveredPerkHash.value!) ? 0 : 1
      if (aHasPerk !== bHasPerk) return aHasPerk - bHasPerk
      // Within each group, sort by instance ID
      return compareInstanceIds(a, b)
    })
  }

  return instances
})

// ============ MODE TOGGLE ============
// Kept for backwards compatibility with exposed methods
function enterEditMode() {
  viewMode.value = 'wishlist'
}

// ============ SELECTION LOGIC ============
const isPerkSelected = (perk: Perk): boolean => {
  if (selection.value.has(perk.hash)) return true
  if (perk.variantHashes) {
    for (const variantHash of perk.variantHashes) {
      if (selection.value.has(variantHash)) return true
    }
  }
  return false
}

const toggleSelection = (perk: Perk, _column: PerkColumn) => {
  const useEnhanced = enhancedMode.value && perk.hasEnhancedVariant
  const perkHash = useEnhanced
    ? (perk.enhancedHash ?? perk.hash)
    : (perk.baseHash ?? perk.hash)

  const isSelected = isPerkSelected(perk)

  if (isSelected) {
    const currentHash = perk.variantHashes?.find(h => selection.value.has(h)) ?? perk.hash
    selection.value.delete(currentHash)
    selection.value = new Set(selection.value)
  } else {
    selection.value.add(perkHash)
    selection.value = new Set(selection.value)
  }
}

const clearSelection = () => {
  selection.value = new Set()
  currentProfileId.value = null
  sourceWishlistId.value = null
  profileNotesInput.value = ''
  saveMessage.value = null
}

// ============ ENHANCED MODE ============
const isEnhancedDisplay = (perk: Perk, _column: PerkColumn): boolean => {
  return enhancedMode.value && !!perk.hasEnhancedVariant
}

const getPerkIcon = (perk: Perk, column: PerkColumn): string => {
  if (isEnhancedDisplay(perk, column) && perk.enhancedIcon) {
    return perk.enhancedIcon
  }
  return perk.icon
}

const toggleEnhancedMode = () => {
  const newMode = !enhancedMode.value

  if (selection.value.size > 0) {
    const newSelection = new Set<number>()
    for (const hash of selection.value) {
      const perk = perkLookup.value.get(hash)
      if (perk && perk.hasEnhancedVariant) {
        const targetHash = newMode
          ? (perk.enhancedHash ?? hash)
          : (perk.baseHash ?? hash)
        newSelection.add(targetHash)
      } else {
        newSelection.add(hash)
      }
    }
    selection.value = newSelection
  }

  enhancedMode.value = newMode
}

// ============ WISHLIST HELPERS ============
const isWishlistPerk = (perkHash: number): boolean => {
  return wishlistPerkAnnotations.value.has(perkHash)
}

const getWishlistTooltip = (perkHash: number): string => {
  const wishlists = wishlistPerkAnnotations.value.get(perkHash)
  if (!wishlists || wishlists.length === 0) return ''
  return `\n\nRecommended by: ${wishlists.join(', ')}`
}

const getPerkTooltip = (perk: Perk, column: PerkColumn): string => {
  // In wishlist mode with enhanced display, show enhanced description
  if (viewMode.value === 'wishlist' && isEnhancedDisplay(perk, column) && perk.enhancedDescription) {
    return perk.enhancedDescription
  }
  let tooltip = perk.description || perk.name
  // In coverage mode, add wishlist recommendations to tooltip
  if (viewMode.value === 'coverage') {
    tooltip += getWishlistTooltip(perk.hash)
  }
  return tooltip
}

// ============ PERK MATRIX HELPERS ============
const getAvailablePerks = (column: PerkColumn) => {
  return column.availablePerks.filter(perk => !perk.cannotCurrentlyRoll)
}

const doesInstanceHavePerk = (instId: string, perkHash: number, colIndex: number): boolean => {
  const instance = props.weapon.instances.find(i => i.itemInstanceId === instId)
  if (!instance) return false

  const variants = perkVariantsMap.value.get(perkHash) || [perkHash]
  const activePlugHash = instance.sockets.sockets[colIndex]?.plugHash
  if (activePlugHash && variants.includes(activePlugHash)) return true

  const reusables = instance.socketPlugsByIndex?.[colIndex]
  if (reusables && reusables.some(r => variants.includes(r))) return true

  return false
}

const getInstancesWithPerk = (perkHash: number, colIndex: number): string[] => {
  return props.weapon.instances
    .filter(inst => doesInstanceHavePerk(inst.itemInstanceId, perkHash, colIndex))
    .map(inst => inst.itemInstanceId)
}

// ============ INSTANCE HELPERS ============
const PALETTE = [
  '#EF4444', '#F97316', '#F59E0B', '#10B981', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E',
  '#84CC16', '#22C55E', '#14B8A6', '#0EA5E9', '#64748B'
]

const getInstanceColor = (instId: string) => {
  const idx = props.weapon.instances.findIndex(i => i.itemInstanceId === instId)
  if (idx === -1) return '#6B7280'
  return PALETTE[idx % PALETTE.length]
}

const isPerkHighlighted = (perkHash: number) => {
  if (hoveredPerkHash.value === perkHash) return true
  if (hoveredInstanceId.value) {
    for (const col of matrixColumns.value) {
      if (doesInstanceHavePerk(hoveredInstanceId.value, perkHash, col.columnIndex)) return true
    }
  }
  return false
}

const instanceHasPerk = (instId: string, perkHash: number): boolean => {
  for (const col of matrixColumns.value) {
    if (doesInstanceHavePerk(instId, perkHash, col.columnIndex)) return true
  }
  return false
}

// Get highlighted perks for wishlist mode instance perk grid
const getHighlightedPerksForInstance = (): Set<number> | undefined => {
  // In wishlist mode, highlight selected perks
  if (hasSelection.value) {
    return selection.value
  }
  return undefined
}

// ============ MATCHING LOGIC (Edit Mode) ============
const doesInstanceHavePerkForMatch = (instance: WeaponInstance, perkHash: number, colIndex: number): boolean => {
  if (instance.sockets.sockets[colIndex]?.plugHash === perkHash) return true
  const reusables = instance.socketPlugsByIndex?.[colIndex]
  if (reusables && reusables.includes(perkHash)) return true
  return false
}

// Helper for sorting: check if instance matches selection (takes instance object)
const isMatchInstance = (instance: WeaponInstance): boolean => {
  if (!hasSelection.value) return false

  for (const col of matrixColumns.value) {
    const colPerks = col.availablePerks.map(p => p.hash)
    const selectedInCol = colPerks.filter(h => selection.value.has(h))

    if (selectedInCol.length === 0) continue

    for (const h of selectedInCol) {
      if (!doesInstanceHavePerkForMatch(instance, h, col.columnIndex)) return false
    }
  }

  return true
}

// Helper for sorting: check if instance has a specific perk (for Coverage mode hover)
const instanceHasPerkAny = (instId: string, perkHash: number): boolean => {
  for (const col of matrixColumns.value) {
    if (doesInstanceHavePerk(instId, perkHash, col.columnIndex)) return true
  }
  return false
}

const isMatch = (instId: string) => {
  if (!hasSelection.value) return false

  const instance = props.weapon.instances.find(i => i.itemInstanceId === instId)
  if (!instance) return false

  for (const col of matrixColumns.value) {
    const colPerks = col.availablePerks.map(p => p.hash)
    const selectedInCol = colPerks.filter(h => selection.value.has(h))

    if (selectedInCol.length === 0) continue

    for (const h of selectedInCol) {
      if (!doesInstanceHavePerkForMatch(instance, h, col.columnIndex)) return false
    }
  }

  return true
}

// ============ STYLING - WISHLIST MODE ============
const getPerkRowClassesWishlist = (perk: Perk, _column: PerkColumn) => {
  const isSelected = isPerkSelected(perk)
  const isHovered = hoveredPerkHash.value === perk.hash

  // Selected state (highest priority)
  if (isSelected) {
    return 'bg-blue-900/40 border-blue-500/70 ring-1 ring-blue-500/50'
  }
  // Hovered state (light blue)
  if (isHovered) {
    return 'bg-surface-overlay border-blue-300 ring-1 ring-blue-300/50'
  }
  // Unowned
  if (!perk.isOwned) return 'bg-surface-elevated/30 border-border/50 hover:bg-surface-overlay/30'
  // Owned (default)
  return 'bg-surface-elevated border-border hover:bg-surface-overlay'
}

const getPerkIconClassesWishlist = (perk: Perk, _column: PerkColumn) => {
  const isSelected = isPerkSelected(perk)
  const isHovered = hoveredPerkHash.value === perk.hash

  // Selected state (highest priority)
  if (isSelected) return 'ring-2 ring-blue-400 ring-offset-1 ring-offset-surface'
  // Hovered state (light blue)
  if (isHovered) return 'ring-2 ring-blue-300 ring-offset-1 ring-offset-surface'
  // Owned
  if (perk.isOwned) return 'ring-1 ring-white/80 ring-offset-1 ring-offset-surface'
  // Unowned
  return 'ring-1 ring-border opacity-40'
}

const getInstanceClassesWishlist = (instId: string) => {
  const isSelected = selectedForDIM.value.has(instId)
  const selectedClass = isSelected ? 'ring-2 ring-blue-500' : ''

  if (!hasSelection.value) return `bg-surface-elevated border-border ${selectedClass}`
  return isMatch(instId)
    ? `bg-blue-900/50 border-blue-400 ring-2 ring-blue-400 ${selectedClass}`
    : `bg-surface/50 border-border/50 opacity-40 grayscale-[0.3] ${selectedClass}`
}

// ============ STYLING - COVERAGE MODE ============
// Uses same color language as Wishlist mode: white=owned, blue=hover/highlight
const getPerkRowClassesCoverage = (perk: Perk, _column: PerkColumn) => {
  if (hoveredPerkHash.value === perk.hash) return 'bg-surface-overlay border-blue-300 ring-1 ring-blue-300/50'
  if (hoveredInstanceId.value) {
    if (isPerkHighlighted(perk.hash)) return 'bg-surface-overlay/50 border-blue-300/50'
    return 'bg-surface-elevated border-border opacity-40'
  }
  if (!perk.isOwned) return 'bg-surface-elevated/30 border-border/50'
  return 'bg-surface-elevated border-border'
}

const getPerkIconClassesCoverage = (perk: Perk) => {
  if (hoveredPerkHash.value === perk.hash) {
    return 'ring-2 ring-blue-300 ring-offset-1 ring-offset-surface'
  }
  if (perk.isOwned) {
    return 'ring-1 ring-white/80 ring-offset-1 ring-offset-surface'
  }
  return 'ring-1 ring-border opacity-40'
}

const getInstanceClassesCoverage = (instId: string) => {
  const isSelected = selectedForDIM.value.has(instId)
  const selectedClass = isSelected ? 'ring-2 ring-blue-500' : ''
  const base = `bg-surface-elevated border-border ${selectedClass}`

  if (visualMode.value === 'simple') {
    if (hoveredInstanceId.value === instId) return `bg-surface-overlay border-blue-300 ring-1 ring-blue-300/50 ${selectedClass}`
    if (hoveredPerkHash.value) {
      if (instanceHasPerk(instId, hoveredPerkHash.value)) return `bg-surface-overlay/50 border-blue-300/50 ${selectedClass}`
      return `opacity-50 ${selectedClass}`
    }
    if (hoveredInstanceId.value && hoveredInstanceId.value !== instId) {
      return `opacity-50 ${selectedClass}`
    }
    return base
  }

  // Detailed mode
  if (hoveredInstanceId.value === instId) {
    return `ring-2 ring-white border-transparent ${isSelected ? 'ring-blue-500' : ''}`
  }
  if (hoveredPerkHash.value) {
    if (instanceHasPerk(instId, hoveredPerkHash.value)) return `bg-surface-overlay/50 border-blue-300/50 ${selectedClass}`
    return `opacity-40 grayscale-[0.5] ${selectedClass}`
  }
  if (hoveredInstanceId.value && hoveredInstanceId.value !== instId) {
    return `opacity-40 grayscale-[0.5] ${selectedClass}`
  }
  return base
}

const getInstanceStyleCoverage = (instId: string) => {
  if (visualMode.value === 'detailed') {
    const color = getInstanceColor(instId)
    return {
      borderLeftWidth: '4px',
      borderLeftColor: color
    }
  }
  return {}
}

// Get highlighted perks for coverage mode instance perk grid
const getHighlightedPerksForInstanceCoverage = (): Set<number> | undefined => {
  if (hoveredPerkHash.value) {
    const variants = perkVariantsMap.value.get(hoveredPerkHash.value) || [hoveredPerkHash.value]
    return new Set(variants)
  }
  return undefined
}

// ============ TIER HELPERS ============
function formatTier(tier: number | null | undefined): string {
  if (!tier) return 'No Tier'
  const stars = '★'.repeat(tier)
  return `Tier ${tier} ${stars}`
}

function getTierClass(tier: number | null | undefined): string {
  if (!tier) return 'text-text-subtle'
  return 'text-text-muted'
}

function cycleSortOrder() {
  const order: Record<string, 'desc' | 'asc' | 'none'> = { desc: 'asc', asc: 'none', none: 'desc' }
  sortOrder.value = order[sortOrder.value]
}

function toggleTier(tier: number | null) {
  if (enabledTiers.value.has(tier)) {
    enabledTiers.value.delete(tier)
  } else {
    enabledTiers.value.add(tier)
  }
  enabledTiers.value = new Set(enabledTiers.value)
}

// ============ DIM EXPORT ============
function toggleDIMSelection(instanceId: string) {
  if (selectedForDIM.value.has(instanceId)) {
    selectedForDIM.value.delete(instanceId)
  } else {
    selectedForDIM.value.add(instanceId)
  }
  selectedForDIM.value = new Set(selectedForDIM.value)
}

function clearDIMSelection() {
  selectedForDIM.value = new Set()
}

async function copySelectedToDIM() {
  if (selectedForDIM.value.size === 0) return

  const searchString = Array.from(selectedForDIM.value)
    .map(id => `id:${id}`)
    .join(' or ')

  try {
    await navigator.clipboard.writeText(searchString)
    justCopied.value = true
    setTimeout(() => {
      justCopied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy to clipboard:', err)
  }
}

// ============ PROFILE MANAGEMENT ============
const loadProfilesFromStore = async () => {
  if (!wishlistsStore.initialized) {
    await wishlistsStore.initialize(false)
  }

  const items = wishlistsStore.getUserItemsForWeapon(props.weapon.weaponHash)
  displayProfiles.value = items.map(item => ({
    id: item.id,
    item,
    showDeleteConfirm: false
  }))

  // Auto-expand if profiles exist
  savedRollsExpanded.value = displayProfiles.value.length > 0
}

const loadProfile = (profile: DisplayProfile) => {
  // Load the profile into selection (in Wishlist mode, selection is always active)
  viewMode.value = 'wishlist'

  selection.value = wishlistsStore.loadWishlistItemAsSelection(
    profile.item,
    perkColumnsForStore.value
  )
  currentProfileId.value = profile.id
  profileNotesInput.value = profile.item.notes || ''

  // Auto-detect enhanced mode
  const hasEnhancedHashes = profile.item.perkHashes.some(hash => {
    const perk = perkLookup.value.get(hash)
    return perk?.isEnhanced === true
  })
  enhancedMode.value = hasEnhancedHashes
}

const deleteProfile = (id: string) => {
  wishlistsStore.deleteGodRoll(id)
  displayProfiles.value = displayProfiles.value.filter(p => p.id !== id)
  if (currentProfileId.value === id) {
    clearSelection()
  }
}

const isProfileActive = (profile: DisplayProfile): boolean => {
  const profilePerkHashes = new Set(profile.item.perkHashes)
  if (selection.value.size !== profilePerkHashes.size) return false
  for (const hash of selection.value) {
    if (!profilePerkHashes.has(hash)) return false
  }
  return true
}

// ============ SAVE LOGIC ============
const handleSave = async () => {
  const trimmedNotes = profileNotesInput.value.trim()

  if (!hasSelection.value) {
    saveMessage.value = { text: 'Select at least one perk before saving', type: 'error' }
    return
  }

  saveMessage.value = null

  const tempItem = selectionToWishlistItem(
    selection.value,
    props.weapon.weaponHash,
    perkColumnsForStore.value
  )
  const perkHashes = tempItem.perkHashes

  // Check for no changes if updating
  if (currentProfileId.value) {
    const existingProfile = displayProfiles.value.find(p => p.id === currentProfileId.value)
    if (existingProfile) {
      const existingPerks = new Set(existingProfile.item.perkHashes)
      const newPerks = new Set(perkHashes)
      const perksMatch = existingPerks.size === newPerks.size &&
        [...existingPerks].every(h => newPerks.has(h))
      const notesMatch = (existingProfile.item.notes || '') === trimmedNotes

      if (perksMatch && notesMatch) {
        saveMessage.value = { text: 'No changes detected', type: 'info' }
        return
      }
    }
  }

  let savedItem: WishlistItem

  if (sourceWishlistId.value && currentProfileId.value) {
    const wishlist = wishlistsStore.getWishlistById(sourceWishlistId.value)

    if (wishlist?.sourceType === 'preset') {
      await wishlistsStore.updateItemInPreset(
        sourceWishlistId.value,
        currentProfileId.value,
        {
          perkHashes,
          notes: trimmedNotes || undefined
        }
      )
    } else {
      wishlistsStore.updateItemInWishlist(
        sourceWishlistId.value,
        currentProfileId.value,
        {
          perkHashes,
          notes: trimmedNotes || undefined
        }
      )
    }

    savedItem = {
      id: currentProfileId.value,
      weaponHash: props.weapon.weaponHash,
      perkHashes,
      notes: trimmedNotes || undefined
    }

    const idx = displayProfiles.value.findIndex(p => p.id === currentProfileId.value)
    if (idx !== -1) {
      displayProfiles.value[idx].item = savedItem
    }
  } else {
    savedItem = wishlistsStore.saveGodRollSelection(
      selection.value,
      props.weapon.weaponHash,
      perkColumnsForStore.value,
      {
        notes: trimmedNotes || undefined,
        existingItemId: currentProfileId.value || undefined
      }
    )

    if (currentProfileId.value) {
      const idx = displayProfiles.value.findIndex(p => p.id === currentProfileId.value)
      if (idx !== -1) {
        displayProfiles.value[idx].item = savedItem
      }
    } else {
      displayProfiles.value.push({
        id: savedItem.id,
        item: savedItem,
        showDeleteConfirm: false
      })
      currentProfileId.value = savedItem.id
    }
  }

  // Clear selection after saving
  clearSelection()
}

const buttonLabel = computed(() => {
  if (!currentProfileId.value) return 'Save to Wishlist'
  return 'Update Roll'
})

const saveTargetText = computed(() => {
  if (sourceWishlistId.value) {
    const wishlist = wishlistsStore.getWishlistById(sourceWishlistId.value)
    if (wishlist) {
      return `Saves to "${wishlist.name}" wishlist`
    }
  }
  return 'Saves to your personal wishlist in DIM-compatible format'
})

const buttonClasses = computed(() => {
  if (!currentProfileId.value) {
    return 'bg-green-700 hover:bg-green-600 text-white border border-green-600'
  }
  return 'bg-orange-600 hover:bg-orange-500 text-white border border-orange-500'
})

// Clear message when user types
watch(profileNotesInput, () => {
  if (saveMessage.value) saveMessage.value = null
})

// Reload profiles when weapon changes
watch(() => props.weapon.weaponHash, () => {
  loadProfilesFromStore()
  clearSelection()
  viewMode.value = 'wishlist'
})

// ============ PUBLIC METHODS ============
// Load a wishlist item into the Creator (preview only, doesn't save)
const loadWishlistItem = (item: WishlistItem) => {
  viewMode.value = 'wishlist'

  selection.value = wishlistsStore.loadWishlistItemAsSelection(
    item,
    perkColumnsForStore.value
  )
  currentProfileId.value = null
  profileNotesInput.value = item.notes || ''

  const hasEnhancedHashes = item.perkHashes.some(hash => {
    const perk = perkLookup.value.get(hash)
    return perk?.isEnhanced === true
  })
  enhancedMode.value = hasEnhancedHashes
}

// Edit an existing wishlist item in the Creator
const editWishlistItem = (item: WishlistItem, wishlist: Wishlist) => {
  viewMode.value = 'wishlist'

  selection.value = wishlistsStore.loadWishlistItemAsSelection(
    item,
    perkColumnsForStore.value
  )
  currentProfileId.value = item.id
  sourceWishlistId.value = wishlist.id
  profileNotesInput.value = item.notes || ''

  if (!displayProfiles.value.find(p => p.id === item.id)) {
    displayProfiles.value.push({
      id: item.id,
      item,
      showDeleteConfirm: false
    })
  }

  const hasEnhancedHashes = item.perkHashes.some(hash => {
    const perk = perkLookup.value.get(hash)
    return perk?.isEnhanced === true
  })
  enhancedMode.value = hasEnhancedHashes
}

// Expose methods for parent component access
defineExpose({
  loadWishlistItem,
  editWishlistItem,
  enterEditMode
})
</script>
