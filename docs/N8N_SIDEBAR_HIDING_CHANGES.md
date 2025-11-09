# n8n Custom Modifications

This document tracks all custom changes made to the n8n codebase. Each change is documented with file paths, specific modifications, and the purpose behind the changes.

---

## Table of Contents

- [1. Hide Left Sidebar](#1-hide-left-sidebar)

---

## 1. Hide Left Sidebar

**Date:** Initial implementation  
**Purpose:** Hide the n8n left sidebar and prevent users from showing it again through DOM manipulation.

### Overview

The n8n left sidebar has been hidden using multiple layers of protection:

1. CSS-level hiding with `!important` flags
2. Layout changes to remove sidebar from grid
3. JavaScript protection via MutationObserver and periodic checks

### Files Modified

#### 1.1. `packages/n8n-source/packages/frontend/editor-ui/src/App.vue`

**Changes:**

- Added `sidebarHidden` class to the sidebar container div
- Updated grid layout to remove sidebar from grid areas
- Added CSS rules to hide sidebar with `!important` flags

**Specific Changes:**

**Template (Line 154):**

```vue
<!-- Before -->
<div v-if="usersStore.currentUser" id="sidebar" :class="$style.sidebar"></div>
```

**Styles (Lines 207-212, 267-273):**

- Changed grid template areas from `'sidebar header'` and `'sidebar content'` to `'header header'` and `'content content'`
- Changed grid columns from `auto 1fr` to `1fr`
- Added `.sidebarHidden` class with multiple `!important` rules:
  - `display: none !important`
  - `visibility: hidden !important`
  - `width: 0 !important`
  - `height: 0 !important`
  - `overflow: hidden !important`

**Purpose:** Hides the sidebar container at the layout level and prevents it from taking up space in the grid.

---

#### 1.2. `packages/n8n-source/packages/frontend/editor-ui/src/app/components/MainSidebar.vue`

**Changes:**

- Modified `.sideMenu` CSS to be hidden by default
- Added JavaScript protection via MutationObserver
- Added periodic enforcement check (every 100ms)
- Added cleanup in `onBeforeUnmount`

**Specific Changes:**

**Styles (Lines 696-706):**

```scss
.sideMenu {
  position: relative;
  height: 100%;
  display: none !important;
  visibility: hidden !important;
  width: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
  // ... rest of styles
}
```

**JavaScript (Lines 320-386):**

- Added `enforceSidebarHidden()` function that:
  - Gets both `#side-menu` and `#sidebar` elements
  - Checks computed styles
  - Re-applies hidden styles if sidebar becomes visible
- Added MutationObserver that:
  - Watches document.body for changes
  - Monitors attributes (style, class)
  - Monitors childList changes
  - Calls `enforceSidebarHidden()` on any mutation
- Added setInterval backup:
  - Runs `enforceSidebarHidden()` every 100ms
  - Provides additional layer of protection

- Added cleanup in `onBeforeUnmount`:
  - Disconnects MutationObserver
  - Clears interval
  - Removes references from window object

**Purpose:** Hides the sidebar component itself and actively prevents any DOM manipulation attempts to show it.

---

#### 1.3. `packages/n8n-source/packages/frontend/editor-ui/src/n8n-theme.scss`

**Changes:**

- Added global CSS rules at the end of the file to hide sidebar elements

**Specific Changes (Lines 292-302):**

```scss
// Hide n8n left sidebar - prevent DOM manipulation
#sidebar,
#side-menu {
  display: none !important;
  visibility: hidden !important;
  width: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
```

**Purpose:** Provides a global CSS layer that targets sidebar elements by ID, ensuring they stay hidden even if other styles are overridden.

---

### Protection Layers

The implementation uses multiple layers of protection:

1. **CSS Module Styles** (App.vue, MainSidebar.vue)
   - Component-level hiding with scoped styles
   - Uses `!important` to override other styles

2. **Global CSS** (n8n-theme.scss)
   - Global rules that apply to all instances
   - Targets elements by ID for specificity

3. **Layout Changes** (App.vue)
   - Removes sidebar from grid layout
   - Prevents space allocation

4. **JavaScript Monitoring** (MainSidebar.vue)
   - MutationObserver watches for DOM changes
   - Periodic checks enforce hidden state
   - Re-applies styles if sidebar becomes visible

### How It Works

1. **On Mount:**
   - Sidebar is hidden via CSS
   - MutationObserver starts watching
   - Periodic check interval starts

2. **During Runtime:**
   - Any DOM mutation triggers `enforceSidebarHidden()`
   - Every 100ms, hidden state is verified and enforced
   - Computed styles are checked to ensure sidebar stays hidden

3. **On Unmount:**
   - MutationObserver is disconnected
   - Interval is cleared
   - Cleanup prevents memory leaks

### Testing

To verify the sidebar is hidden and protected:

1. **Visual Check:** Sidebar should not be visible in the UI
2. **DOM Check:** Inspect `#sidebar` and `#side-menu` - they should have `display: none`
3. **Manipulation Test:** Try to show sidebar via browser console:
   ```javascript
   document.getElementById('sidebar').style.display = 'block';
   ```
   The sidebar should remain hidden due to MutationObserver and periodic checks

### Notes

- The sidebar is still rendered in the DOM but hidden
- This approach maintains compatibility with the existing codebase
- Multiple `!important` flags ensure CSS rules take precedence
- MutationObserver may have a small performance impact but is necessary for security
- The 100ms interval provides a backup but may be adjusted if needed

---

## Template for New Changes

When adding new changes, use this format:

```markdown
## X. [Change Title]

**Date:** [Date of change]  
**Purpose:** [Brief description of why this change was made]

### Overview

[High-level description of the change]

### Files Modified

#### X.1. `[file path]`

**Changes:**

- [List of changes]

**Specific Changes:**

[Code snippets, line numbers, before/after examples]

**Purpose:** [Why this specific change was made]

### Testing

[How to verify the change works]

### Notes

[Any additional notes or considerations]
```
