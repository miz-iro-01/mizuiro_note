import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

/**
 * Blogger Email Posting API
 * 
 * Bloggerの「メールで投稿」機能を利用して、
 * Gmail経由でブログ記事を公開します。
 */
export async function POST(request: NextRequest) {
  try {
    const { to, title, content } = await request.json();

    if (!to || !title || !content) {
      return NextResponse.json(
        { error: '必要事項が不足しています（宛先、タイトル、内容）' },
        { status: 400 }
      );
    }

    if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
      return NextResponse.json(
        { error: 'サーバーにGmailの設定がありません。' },
        { status: 500 }
      );
    }

    // SMTP設定
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    // メールの送信
    // Bloggerの「メールで投稿」は、件名がそのまま記事タイトルになります。
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: to,
      subject: title,
      html: content,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Blogger email sent:', info.messageId);

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error('Blogger email error:', error);
    return NextResponse.json(
      { error: error.message || 'メールの送信中にエラーが発生しました。' },
      { status: 500 }
    );
  }
}
