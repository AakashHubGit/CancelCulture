export async function fetchCoc(endpoint) {
  const apiKey = process.env.COC_API_KEY;
  if (!apiKey) {
    throw new Error('COC_API_KEY is not defined in environment variables. Please check your .env.local file.');
  }

  const url = `https://api.clashofclans.com/v1${endpoint}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    next: { revalidate: 60 } // Cache the response for 60 seconds
  });

  if (!res.ok) {
    // Attempt to read error message from body if possible
    let errorMsg = `CoC API returned ${res.status}: ${res.statusText}`;
    try {
      const errorBody = await res.json();
      if (errorBody.message) {
        errorMsg += ` - ${errorBody.message}`;
      }
    } catch (e) {
      // Ignore JSON parse errors for non-JSON responses
    }
    throw new Error(errorMsg);
  }

  return res.json();
}
