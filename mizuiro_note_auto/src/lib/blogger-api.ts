'use server';

/**
 * Blogger API v3 integration
 */

const BLOGGER_API_BASE = 'https://www.googleapis.com/blogger/v3';

interface BloggerBlog {
  id: string;
  name: string;
  url: string;
}

interface PostToBloggerInput {
  accessToken: string;
  title: string;
  content: string;
  blogId?: string; // Optional, will fetch first blog if not provided
}

/**
 * Fetches the list of blogs for the authenticated user.
 */
export async function getBloggerBlogs(accessToken: string): Promise<BloggerBlog[]> {
  const response = await fetch(`${BLOGGER_API_BASE}/users/self/blogs`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Bloggerブログの取得に失敗しました。');
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Posts a new article to the specified (or first) Blogger blog.
 */
export async function postToBlogger(input: PostToBloggerInput) {
  let targetBlogId = input.blogId;

  if (!targetBlogId) {
    const blogs = await getBloggerBlogs(input.accessToken);
    if (blogs.length === 0) {
      throw new Error('Bloggerブログが見つかりませんでした。先にBloggerでブログを作成してください。');
    }
    targetBlogId = blogs[0].id;
  }

  const response = await fetch(`${BLOGGER_API_BASE}/blogs/${targetBlogId}/posts/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      kind: 'blogger#post',
      title: input.title,
      content: input.content, // HTML content is expected by Blogger
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Bloggerへの投稿に失敗しました。');
  }

  return await response.json();
}
