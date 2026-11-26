/** Never render provider JSON or infrastructure details as user-facing AI errors. */
export function userFacingAiError(message: string): string {
  if (/503|UNAVAILABLE|high demand|overloaded/i.test(message)) {
    return 'The AI service is temporarily busy. Your inputs are unchanged. Please try Generate again shortly.';
  }
  if (/429|RESOURCE_EXHAUSTED|rate.?limit|quota/i.test(message)) {
    return 'The AI service has reached its usage limit. Your inputs are unchanged. Wait before trying again, or contact your administrator.';
  }
  if (/timeout|timed out|Failed to fetch|network/i.test(message)) {
    return 'The AI service could not be reached. Check your connection and try again. Your inputs are unchanged.';
  }
  return 'The AI request could not be completed. Your inputs are unchanged. Please try again or contact your administrator.';
}
