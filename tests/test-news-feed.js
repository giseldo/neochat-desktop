const assert = require('assert');
const newsPlugin = require('../electron/plugins/newsPlugin');

async function runTests() {
  console.log('--- Testing News & Discovery Feed System ---');

  let registeredHandlers = {};
  const mockCtx = {
    registerIpcHandler: (channel, handler) => {
      registeredHandlers[channel] = handler;
    },
    loadSettings: () => ({})
  };

  await newsPlugin.init(mockCtx);

  assert(typeof registeredHandlers['news:get-feed'] === 'function', 'news:get-feed handler must be registered');
  assert(typeof registeredHandlers['news:refresh'] === 'function', 'news:refresh handler must be registered');
  assert(typeof registeredHandlers['news:toggle-favorite'] === 'function', 'news:toggle-favorite handler must be registered');

  // Test get-feed returns items and lastUpdated timestamp
  const initialFeed = await registeredHandlers['news:get-feed']({}, { category: 'for-you' });
  assert(initialFeed && typeof initialFeed === 'object', 'Feed response must be an object');
  assert(Array.isArray(initialFeed.items), 'Feed response must contain items array');
  assert(initialFeed.items.length > 0, 'Feed should return items');
  assert(initialFeed.lastUpdated, 'Feed must return a lastUpdated timestamp string');
  assert(!isNaN(new Date(initialFeed.lastUpdated).getTime()), 'lastUpdated must be a valid ISO date string');

  console.log(`✓ Initial feed loaded with ${initialFeed.items.length} items. Timestamp: ${initialFeed.lastUpdated}`);

  // Test refresh handler
  const refreshedFeed = await registeredHandlers['news:refresh']({}, { category: 'ai' });
  assert(refreshedFeed && Array.isArray(refreshedFeed.items), 'Refresh must return items array');
  assert(refreshedFeed.lastUpdated, 'Refresh must return lastUpdated timestamp');
  console.log(`✓ Refreshed feed returned ${refreshedFeed.items.length} items. Timestamp: ${refreshedFeed.lastUpdated}`);

  // Test favorite toggling on current feed items
  const testId = refreshedFeed.items[0].id;
  const favResult = await registeredHandlers['news:toggle-favorite']({}, { articleId: testId });
  assert.strictEqual(favResult.isFavorite, true, 'Favorite should be toggled on');

  const favFeed = await registeredHandlers['news:get-feed']({}, { category: 'ai' });
  const found = favFeed.items.find(i => i.id === testId);
  assert(found, 'Favorited item should exist in feed');
  assert.strictEqual(found.isFavorite, true, 'Favorited item should have isFavorite true in feed');

  // Toggle back
  const unfavResult = await registeredHandlers['news:toggle-favorite']({}, { articleId: testId });
  assert.strictEqual(unfavResult.isFavorite, false, 'Favorite should be toggled off');

  console.log('✓ All News & Discovery Feed System tests passed!');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
