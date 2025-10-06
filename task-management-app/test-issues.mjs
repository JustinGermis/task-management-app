import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen to console messages
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

  // Listen to page errors
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));

  // Listen to network requests
  page.on('requestfailed', request => {
    console.log('FAILED REQUEST:', request.url(), request.failure().errorText);
  });

  try {
    console.log('Navigating to login page...');
    await page.goto('https://task-management-k3dn6qbiw-stride-shift.vercel.app/auth/login');

    console.log('Filling in credentials...');
    await page.fill('input[type="email"]', 'justingermis@gmail.com');
    await page.fill('input[type="password"]', 'Flange');

    console.log('Clicking login button...');
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('Logged in successfully!');

    // Navigate to projects page
    console.log('\n=== Testing Project Deletion ===');
    await page.goto('https://task-management-k3dn6qbiw-stride-shift.vercel.app/projects');
    await page.waitForTimeout(2000);

    // Try to find and click the dropdown menu for the first project
    const moreButton = page.locator('button:has(svg)').first();
    if (await moreButton.count() > 0) {
      console.log('Clicking project menu...');
      await moreButton.click();
      await page.waitForTimeout(1000);

      // Look for delete option
      const deleteOption = page.locator('text=Delete');
      if (await deleteOption.count() > 0) {
        console.log('Found delete option, clicking...');

        // Listen for the confirm dialog
        page.on('dialog', async dialog => {
          console.log('Dialog appeared:', dialog.message());
          await dialog.accept();
        });

        await deleteOption.click();
        await page.waitForTimeout(2000);
        console.log('Delete clicked');
      } else {
        console.log('Delete option not found');
      }
    } else {
      console.log('No project menu buttons found');
    }

    // Navigate to a project to test drag and drop
    console.log('\n=== Testing Drag and Drop ===');
    await page.goto('https://task-management-k3dn6qbiw-stride-shift.vercel.app/projects');
    await page.waitForTimeout(2000);

    // Click on the first project
    const projectLink = page.locator('a[href*="/projects/"]').first();
    if (await projectLink.count() > 0) {
      const projectUrl = await projectLink.getAttribute('href');
      console.log('Navigating to project:', projectUrl);
      await projectLink.click();
      await page.waitForTimeout(3000);

      // Look for task cards
      const taskCards = page.locator('[draggable="true"]');
      const taskCount = await taskCards.count();
      console.log('Found', taskCount, 'draggable tasks');

      if (taskCount > 0) {
        console.log('Attempting to drag first task...');
        const firstTask = taskCards.first();
        const taskText = await firstTask.textContent();
        console.log('Task text:', taskText);

        // Find columns
        const columns = page.locator('[data-column-id]');
        const columnCount = await columns.count();
        console.log('Found', columnCount, 'columns');

        if (columnCount >= 2) {
          // Get the bounding boxes
          const taskBox = await firstTask.boundingBox();
          const targetColumn = columns.nth(1);
          const columnBox = await targetColumn.boundingBox();

          if (taskBox && columnBox) {
            console.log('Performing drag and drop...');
            await page.mouse.move(taskBox.x + taskBox.width / 2, taskBox.y + taskBox.height / 2);
            await page.mouse.down();
            await page.waitForTimeout(500);
            await page.mouse.move(columnBox.x + columnBox.width / 2, columnBox.y + 100, { steps: 10 });
            await page.waitForTimeout(500);
            await page.mouse.up();

            console.log('Drag completed, waiting for update...');
            await page.waitForTimeout(3000);

            console.log('Checking if task moved...');
            // Check if the task is now in the second column
            const taskStillInFirstColumn = await firstTask.isVisible().catch(() => false);
            console.log('Task still visible in original position:', taskStillInFirstColumn);
          }
        }
      }
    }

    console.log('\nTest completed. Press Ctrl+C to close browser.');
    await page.waitForTimeout(60000); // Keep browser open for manual inspection

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();
