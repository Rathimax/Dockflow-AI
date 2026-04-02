const fs = require("fs");

/**
 * Schedules a file to be deleted after 60 seconds.
 * @param {string} filePath - Absolute path to the file to delete.
 */
function scheduleCleanup(filePath) {
  setTimeout(() => {
    fs.unlink(filePath, (err) => {
      if (err) {
        // File may have already been deleted or never existed — that's fine
        if (err.code !== "ENOENT") {
          console.error(`[Cleanup] Failed to delete ${filePath}:`, err.message);
        }
      } else {
        console.log(`[Cleanup] Deleted: ${filePath}`);
      }
    });
  }, 60 * 1000); // 60 seconds
}

module.exports = { scheduleCleanup };
