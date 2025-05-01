async function retry(fn, options = {}) {
  const {
    retries = 3,
    delay = 1000,
    onRetry = (error, attempt) => console.warn(`Retry attempt ${attempt} due to:`, error.message)
  } = options;
  
  let lastError;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        onRetry(lastError, attempt);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === retries) {
        throw error;
      }
    }
  }
}

module.exports = retry;