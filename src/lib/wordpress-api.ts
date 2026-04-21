/**
 * WordPress REST API client for creating posts
 */

interface postToWordPressParams {
  siteUrl: string;
  username: string;
  appPassword: string;
  title: string;
  content: string; // HTML content
  status?: 'publish' | 'draft';
}

/**
 * Publishes a post to WordPress using Application Passwords
 */
export async function postToWordPress({
  siteUrl,
  username,
  appPassword,
  title,
  content,
  status = 'publish'
}: postToWordPressParams) {
  // Normalize site URL
  const baseUrl = siteUrl.replace(/\/$/, '');
  const apiUrl = `${baseUrl}/wp-json/wp/v2/posts`;

  // Create Base64 auth string
  const authString = btoa(`${username}:${appPassword}`);

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: title,
      content: content,
      status: status,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`WordPressへの投稿に失敗しました: ${error.message || response.statusText}`);
  }

  return await response.json();
}
