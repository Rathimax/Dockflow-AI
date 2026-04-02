/**
 * Simple in-memory IP-based rate limiter for AI requests.
 * Restricts users to 10 AI requests per day, resetting at midnight local time.
 */

const usageStore = {};

function rateLimitAI(req, res, next) {
  // Get IP address (trust proxy handles reverse proxies like Render)
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  
  // Current date string (e.g. "2026-03-27") to reset daily
  const today = new Date().toISOString().split('T')[0];

  // Initialize or reset if it's a new day
  if (!usageStore[ip] || usageStore[ip].date !== today) {
    usageStore[ip] = {
      count: 0,
      date: today
    };
  }

  // Check limit
  if (usageStore[ip].count >= 10) {
    return res.status(429).json({ 
      error: "You have reached your daily limit of 10 AI requests. Please try again tomorrow." 
    });
  }

  // Increment and proceed
  usageStore[ip].count++;
  console.log(`[RateLimit] AI Request allowed for ${ip}. Status: ${usageStore[ip].count}/10 today.`);
  
  next();
}

module.exports = { rateLimitAI };
