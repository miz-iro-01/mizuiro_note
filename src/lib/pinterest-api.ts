/**
 * Pinterest API v5 client for creating Pins
 */

interface CreatePinParams {
  accessToken: string;
  title: string;
  description: string;
  link: string;
  imageUrl: string;
  boardId?: string; // Optional: if not provided, might need to fetch boards first
}

/**
 * Creates a Pin on Pinterest
 */
export async function postToPinterest({ 
  accessToken, 
  title, 
  description, 
  link, 
  imageUrl,
  boardId 
}: CreatePinParams) {
  // If no boardId is provided, we try to fetch the first available board
  let targetBoardId = boardId;
  
  if (!targetBoardId) {
    const boardsResponse = await fetch('https://api.pinterest.com/v5/boards', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!boardsResponse.ok) {
      const error = await boardsResponse.json();
      throw new Error(`Pinterestボードの取得に失敗しました: ${error.message || boardsResponse.statusText}`);
    }
    
    const boardsData = await boardsResponse.json();
    if (boardsData.items && boardsData.items.length > 0) {
      targetBoardId = boardsData.items[0].id;
    } else {
      throw new Error('Pinterestのボードが見つかりません。先にボードを作成してください。');
    }
  }

  const response = await fetch('https://api.pinterest.com/v5/pins', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: title.substring(0, 100),
      description: description.substring(0, 500),
      link: link,
      board_id: targetBoardId,
      media_source: {
        source_type: 'image_url',
        url: imageUrl,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Pinterestへの投稿に失敗しました: ${error.message || response.statusText}`);
  }

  return await response.json();
}
