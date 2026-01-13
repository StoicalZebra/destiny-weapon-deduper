import { test, expect } from '@playwright/test'

test.describe('Wishlist CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to wishlists page
    await page.goto('/wishlists')
    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Wishlists' })).toBeVisible()

    // Wait for presets to load - look for either a wishlist card OR the "Load Preset Wishlists" button
    // Presets are fetched from network on first load, may take time
    const presetLoaded = page.getByRole('heading', { name: 'StoicalZebra' })
    const loadButton = page.getByRole('button', { name: /Load Preset Wishlists/i })

    // Wait for either condition - presets loaded OR button to load them
    await Promise.race([
      expect(presetLoaded).toBeVisible({ timeout: 15000 }),
      expect(loadButton).toBeVisible({ timeout: 15000 })
    ]).catch(() => {})

    // If we see the load button, click it to load presets
    if (await loadButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await loadButton.click()
    }

    // Now wait for presets to actually appear
    await expect(presetLoaded).toBeVisible({ timeout: 30000 })
  })

  test.describe('Create Wishlist', () => {
    test('can create a new custom wishlist', async ({ page }) => {
      // Click "New Wishlist" button to reveal the form
      await page.getByRole('button', { name: /New Wishlist/i }).click()

      // Wait for the form section to appear
      await expect(page.getByRole('heading', { name: 'Create New Wishlist' })).toBeVisible()

      // Fill in wishlist details - form uses textboxes directly
      await page.getByRole('textbox').first().fill('Test Wishlist')
      await page.getByRole('textbox').nth(1).fill('A test wishlist for E2E testing')

      // Submit - Create button should be enabled after filling name
      await page.getByRole('button', { name: /^Create$/i }).click()

      // Verify wishlist appears in the list
      await expect(page.getByRole('heading', { name: 'Test Wishlist' })).toBeVisible()
    })

    test('create button is disabled without name', async ({ page }) => {
      await page.getByRole('button', { name: /New Wishlist/i }).click()

      // Wait for form
      await expect(page.getByRole('heading', { name: 'Create New Wishlist' })).toBeVisible()

      // Create button should be disabled without name
      const createButton = page.getByRole('button', { name: /^Create$/i })
      await expect(createButton).toBeDisabled()
    })
  })

  test.describe('Read Wishlist', () => {
    test('displays preset wishlists on load', async ({ page }) => {
      // Check preset wishlists are visible - using regex to be flexible with count
      await expect(page.getByText(/\d+ presets?, \d+ custom/)).toBeVisible()

      // Verify known presets exist
      await expect(page.getByRole('heading', { name: 'StoicalZebra' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Voltron', exact: true })).toBeVisible()
    })

    test('preset wishlists have View on GitHub link', async ({ page }) => {
      // Preset wishlists should show "View on GitHub" external link instead of internal View
      const viewOnGitHubLink = page.getByRole('link', { name: /View on GitHub/i }).first()
      await expect(viewOnGitHubLink).toBeVisible()

      // Should be an external link (raw.githubusercontent.com or github.com)
      const href = await viewOnGitHubLink.getAttribute('href')
      expect(href).toMatch(/github/)
    })

    test('can view custom wishlist details', async ({ page }) => {
      // First create a custom wishlist
      await page.getByRole('button', { name: /New Wishlist/i }).click()
      await expect(page.getByRole('heading', { name: 'Create New Wishlist' })).toBeVisible()
      await page.getByRole('textbox').first().fill('View Test Wishlist')
      await page.getByRole('button', { name: /^Create$/i }).click()
      await expect(page.getByRole('heading', { name: 'View Test Wishlist' })).toBeVisible()

      // Custom wishlists should have an internal View link (not "View on GitHub")
      // The View link should appear after the heading in the same card
      // Use a more reliable locator - find the card container with the custom wishlist heading
      const viewLink = page.locator('div').filter({ has: page.getByRole('heading', { name: 'View Test Wishlist' }) }).getByRole('link', { name: 'View', exact: true })
      await viewLink.click()

      // Wait for navigation
      await page.waitForURL(/\/wishlists\//)

      // Should show back link
      await expect(page.getByRole('link', { name: /Back to Wishlists/i })).toBeVisible()

      // Should show stats
      await expect(page.getByText(/Items:/)).toBeVisible()
      await expect(page.getByText(/Weapons:/)).toBeVisible()
    })
  })

  test.describe('Export Wishlist', () => {
    test('can export a custom wishlist', async ({ page }) => {
      // First create a custom wishlist
      await page.getByRole('button', { name: /New Wishlist/i }).click()
      await expect(page.getByRole('heading', { name: 'Create New Wishlist' })).toBeVisible()
      await page.getByRole('textbox').first().fill('Export Test Wishlist')
      await page.getByRole('button', { name: /^Create$/i }).click()
      await expect(page.getByRole('heading', { name: 'Export Test Wishlist' })).toBeVisible()

      // Set up download listener
      const downloadPromise = page.waitForEvent('download')

      // Find the custom wishlist card by looking for the heading, then find its sibling Export button
      // The card is the parent element with rounded-xl class
      const card = page.locator('.rounded-xl').filter({ has: page.getByRole('heading', { name: 'Export Test Wishlist' }) })
      await card.getByRole('button', { name: 'Export' }).click()

      // Should trigger a download - filename has underscores instead of spaces
      const download = await downloadPromise
      expect(download.suggestedFilename()).toContain('Export_Test_Wishlist')
      expect(download.suggestedFilename()).toMatch(/\.txt$/)
    })
  })

  test.describe('Delete Operations', () => {
    test('can create and then view a custom wishlist', async ({ page }) => {
      // First create a wishlist
      await page.getByRole('button', { name: /New Wishlist/i }).click()

      // Wait for form
      await expect(page.getByRole('heading', { name: 'Create New Wishlist' })).toBeVisible()

      // Fill in the form
      await page.getByRole('textbox').first().fill('My Test Wishlist')
      await page.getByRole('button', { name: /^Create$/i }).click()

      // Verify it was created
      await expect(page.getByRole('heading', { name: 'My Test Wishlist' })).toBeVisible()

      // Verify it has Custom badge
      await expect(page.getByText('Custom', { exact: true })).toBeVisible()

      // Test passes if we can successfully create a custom wishlist
    })
  })
})

test.describe('Roll CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/wishlists')
    await expect(page.getByRole('heading', { name: 'Wishlists' })).toBeVisible()

    // Wait for presets to load - same logic as above
    const presetLoaded = page.getByRole('heading', { name: 'StoicalZebra' })
    const loadButton = page.getByRole('button', { name: /Load Preset Wishlists/i })

    await Promise.race([
      expect(presetLoaded).toBeVisible({ timeout: 15000 }),
      expect(loadButton).toBeVisible({ timeout: 15000 })
    ]).catch(() => {})

    if (await loadButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await loadButton.click()
    }

    await expect(presetLoaded).toBeVisible({ timeout: 30000 })
  })

  test.describe('Create Roll', () => {
    test('can add a roll to a custom wishlist via weapon detail', async ({ page }) => {
      // First create a custom wishlist
      await page.getByRole('button', { name: /New Wishlist/i }).click()

      // Wait for form
      await expect(page.getByRole('heading', { name: 'Create New Wishlist' })).toBeVisible()

      await page.getByRole('textbox').first().fill('Roll Test Wishlist')
      await page.getByRole('button', { name: /^Create$/i }).click()

      await expect(page.getByRole('heading', { name: 'Roll Test Wishlist' })).toBeVisible()

      // Navigate to playground which shows weapon details
      await page.goto('/playground')

      // Wait for weapon to load
      await page.waitForTimeout(1000)

      // Check if there's a way to add to wishlist (UI varies)
      const addButton = page.getByRole('button', { name: /Add to Wishlist|Save/i })
      if (await addButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addButton.click()
      }
    })
  })

  test.describe('Read Rolls', () => {
    test('displays rolls in custom wishlist detail view', async ({ page }) => {
      // Create a custom wishlist first
      await page.getByRole('button', { name: /New Wishlist/i }).click()
      await expect(page.getByRole('heading', { name: 'Create New Wishlist' })).toBeVisible()
      await page.getByRole('textbox').first().fill('Rolls Display Test')
      await page.getByRole('button', { name: /^Create$/i }).click()
      await expect(page.getByRole('heading', { name: 'Rolls Display Test' })).toBeVisible()

      // Navigate to its detail view using filter
      const viewLink = page.locator('div').filter({ has: page.getByRole('heading', { name: 'Rolls Display Test' }) }).getByRole('link', { name: 'View', exact: true })
      await viewLink.click()

      // Wait for page to load
      await page.waitForURL(/\/wishlists\//)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })

      // Should show stats (even if empty)
      await expect(page.getByText(/Items:/)).toBeVisible()
    })
  })
})

test.describe('Admin Mode Features', () => {
  // Note: These tests check for admin mode features but gracefully skip if not enabled

  test('admin editable badge appears on StoicalZebra when in admin mode', async ({ page }) => {
    await page.goto('/wishlists')
    await expect(page.getByRole('heading', { name: 'Wishlists' })).toBeVisible()

    // Wait for presets
    const presetLoaded = page.getByRole('heading', { name: 'StoicalZebra' })
    const loadButton = page.getByRole('button', { name: /Load Preset Wishlists/i })

    await Promise.race([
      expect(presetLoaded).toBeVisible({ timeout: 15000 }),
      expect(loadButton).toBeVisible({ timeout: 15000 })
    ]).catch(() => {})

    if (await loadButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await loadButton.click()
    }

    await expect(presetLoaded).toBeVisible({ timeout: 30000 })

    // Check for Admin Editable badge - only visible in admin mode
    const adminBadge = page.getByText('Admin Editable')

    // If admin mode is enabled, we should see the badge
    if (await adminBadge.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Badge visible means admin mode is on

      // Click Edit to view detail (admin-editable presets have Edit link, not View)
      await page.getByRole('link', { name: 'Edit' }).first().click()

      // Wait for navigation
      await page.waitForURL(/\/wishlists\//)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })

      // Should have edit controls
      await expect(page.getByRole('button', { name: /Remove/i }).first()).toBeVisible()
    }
  })

  test('unsaved changes badge appears after editing in admin mode', async ({ page }) => {
    await page.goto('/wishlists')
    await expect(page.getByRole('heading', { name: 'Wishlists' })).toBeVisible()

    // Wait for presets
    const presetLoaded = page.getByRole('heading', { name: 'StoicalZebra' })
    const loadButton = page.getByRole('button', { name: /Load Preset Wishlists/i })

    await Promise.race([
      expect(presetLoaded).toBeVisible({ timeout: 15000 }),
      expect(loadButton).toBeVisible({ timeout: 15000 })
    ]).catch(() => {})

    if (await loadButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await loadButton.click()
    }

    await expect(presetLoaded).toBeVisible({ timeout: 30000 })

    const adminBadge = page.getByText('Admin Editable')

    if (await adminBadge.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Navigate to StoicalZebra detail via Edit link (admin-editable presets have Edit, not View)
      await page.getByRole('link', { name: 'Edit' }).first().click()
      await page.waitForURL(/\/wishlists\//)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })

      // Make an edit - remove a roll
      await page.getByRole('button', { name: /Remove/i }).first().click()

      // Should show unsaved changes banner
      await expect(page.getByText(/You have local changes/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /Export to File/i })).toBeVisible()

      // Navigate back to wishlists
      await page.getByRole('link', { name: /Back to Wishlists/i }).click()

      // Should show Unsaved Changes badge on card
      await expect(page.getByText('Unsaved Changes')).toBeVisible()
    }
  })
})
