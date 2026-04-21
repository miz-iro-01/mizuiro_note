/**
 * Threads API (Meta) client for publishing posts
 */

interface CreateThreadsPostParams {
  accessToken: string;
  text: string;
  imageUrl?: string;
  link?: string;
}

/**
 * Publishes a post to Threads
 */
export async function postToThreads({ 
  accessToken, 
  text, 
  imageUrl,
  link 
}: CreateThreadsPostParams) {
  // 1. Get current user ID
  const meResponse = await fetch('https://graph.threads.net/v1.0/me?fields=id,username', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!meResponse.ok) {
    const error = await meResponse.json();
    throw new Error(`Threadsユーザー情報の取得に失敗しました: ${error.message || meResponse.statusText}`);
  }

  const { id: userId } = await meResponse.json();

  // 2. Create a media container
  // Combine text and link for Threads if needed
  const fullText = link ? `${text}\n\n${link}` : text;
  
  const createMediaUrl = `https://graph.threads.net/v1.0/${userId}/threads`;
  const mediaResponse = await fetch(createMediaUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      media_type: imageUrl ? 'IMAGE' : 'TEXT_POST',
      text: fullText,
      image_url: imageUrl, // Required only if media_type is IMAGE
    }),
  });

  if (!mediaResponse.ok) {
    const error = await mediaResponse.json();
    throw new Error(`Threadsメディアコンテナの作成に失敗しました: ${error.message || mediaResponse.statusText}`);
  }

  const { id: creationId } = await mediaResponse.json();

  // 3. Publish the media container
  const publishUrl = `https://graph.threads.net/v1.0/${userId}/threads_publish`;
  const publishResponse = await fetch(publishUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      creation_id: creationId,
    }),
  });

  if (!publishResponse.ok) {
    const error = await publishResponse.json();
    throw new Error(`Threadsへの投稿公開に失敗しました: ${error.message || publishResponse.statusText}`);
  }

  return await publishResponse.json();
}
