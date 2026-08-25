const { desktopCapturer, screen } = require('electron');

/**
 * Capture full primary screen or get list of available screen/window sources
 */
async function getScreenSources() {
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;

    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: {
        width: Math.min(1920, width),
        height: Math.min(1080, height)
      },
      fetchWindowIcons: true
    });

    return sources.map(source => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL(),
      appIcon: source.appIcon ? source.appIcon.toDataURL() : null,
      isScreen: source.id.startsWith('screen:')
    }));
  } catch (error) {
    console.error('[ScreenCaptureService] Error getting sources:', error);
    throw error;
  }
}

/**
 * Capture primary screen directly to base64 data URL
 */
async function capturePrimaryScreen() {
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: width * (primaryDisplay.scaleFactor || 1),
        height: height * (primaryDisplay.scaleFactor || 1)
      }
    });

    if (sources.length > 0) {
      return {
        success: true,
        dataUrl: sources[0].thumbnail.toDataURL(),
        name: `screenshot-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`,
        width,
        height
      };
    }

    throw new Error('No screen source found');
  } catch (error) {
    console.error('[ScreenCaptureService] Error capturing primary screen:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  getScreenSources,
  capturePrimaryScreen
};
