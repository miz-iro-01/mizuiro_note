import { NextResponse } from 'next/server';

// 管理者メールアドレスのリスト
const ADMIN_EMAILS = ['oumaumauma32@gmail.com', 'sl0wmugi9@gmail.com'];

// Firebase設定
const FIREBASE_API_KEY = 'AIzaSyAUAldQXCk8DLJlL-ZtPkf4BD4X_VHqDIA';
const FIREBASE_PROJECT_ID = 'studio-5142474284-ef60d';

/**
 * Firebase Auth REST API でIDトークンからユーザー情報を取得
 */
async function verifyToken(idToken: string): Promise<{ email: string; uid: string } | null> {
  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const userInfo = data.users?.[0];
    if (!userInfo) return null;

    return { email: userInfo.email || '', uid: userInfo.localId || '' };
  } catch {
    return null;
  }
}

/**
 * Firestore REST API でドキュメントを書き込む（Admin SDK不要・ユーザートークンで認証）
 */
async function writeToFirestore(
  collectionId: string,
  documentId: string,
  data: Record<string, any>,
  idToken: string
) {
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collectionId}/${documentId}`;

  // Firestoreのフィールド形式に変換
  const fields: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      fields[key] = { integerValue: String(value) };
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else if (Array.isArray(value)) {
      fields[key] = {
        arrayValue: {
          values: value.map((v: any) => {
            if (typeof v === 'string') return { stringValue: v };
            return { stringValue: String(v) };
          }),
        },
      };
    }
  }

  // updatedAt タイムスタンプを追加
  fields['updatedAt'] = { timestampValue: new Date().toISOString() };

  const response = await fetch(`${firestoreUrl}?updateMask.fieldPaths=${Object.keys(fields).join('&updateMask.fieldPaths=')}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Firestore REST API Error:', errorText);
    throw new Error(`Firestore書き込みに失敗しました: ${response.status}`);
  }

  return response.json();
}

/**
 * 管理者設定を保存するAPIルート
 * Firebase Admin SDK を使わず、Firestore REST API + ユーザートークンで書き込む
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: '認証トークンがありません' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];

    // ユーザー検証
    const userInfo = await verifyToken(idToken);
    if (!userInfo) {
      return NextResponse.json({ error: '無効な認証トークンです' }, { status: 401 });
    }

    // 管理者チェック
    if (!userInfo.email || !ADMIN_EMAILS.includes(userInfo.email)) {
      return NextResponse.json({ error: `管理者権限がありません (${userInfo.email})` }, { status: 403 });
    }

    // リクエストボディ
    const body = await req.json();
    const { collection: collectionName, documentId, data } = body;

    if (!collectionName || !documentId || !data) {
      return NextResponse.json({ error: 'リクエストパラメータが不足しています' }, { status: 400 });
    }

    if (collectionName !== 'system') {
      return NextResponse.json({ error: 'system コレクションのみ更新可能です' }, { status: 403 });
    }

    // Firestore REST API で書き込み（ユーザーのIDトークンで認証するため、セキュリティルールが適用される）
    await writeToFirestore(collectionName, documentId, data, idToken);

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('Admin Save Settings Error:', err);
    return NextResponse.json({ error: err.message || '保存に失敗しました' }, { status: 500 });
  }
}
